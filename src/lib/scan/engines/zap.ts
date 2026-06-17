import {
  AsyncScanEngine,
  EngineFinding,
  EngineHandle,
  EnginePollResult,
} from "@/lib/scan/engine";
import { ScanConfig, ScanProgress, Severity, StandardCategory } from "@/lib/types";

// OWASP ZAP adapter. Drives a reachable ZAP daemon over its JSON API:
//   spider (crawl) → active scan (attack) → pull alerts → map to findings.
//
// Requires env: ZAP_API_URL (e.g. https://zap.example.com) and ZAP_API_KEY.
// The daemon must be publicly reachable from Vercel. Because active scans take
// minutes, this is an AsyncScanEngine: start() kicks it off, poll() advances the
// spider→ascan phases, collect() pulls the results once done.

interface ZapHandle extends EngineHandle {
  target: string;
  phase: "spider" | "ascan";
  spiderId?: string;
  ascanId?: string;
}

async function zap(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const base = process.env.ZAP_API_URL;
  const key = process.env.ZAP_API_KEY;
  if (!base || !key) {
    throw new Error("ZAP not configured — set ZAP_API_URL and ZAP_API_KEY.");
  }
  const url = new URL(`/JSON/${path}/`, base);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  // API key in the header, not the query string, to keep it out of logs.
  const res = await fetch(url, {
    headers: { "X-ZAP-API-Key": key },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`ZAP ${path} → HTTP ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

function progress(phase: string, pct: number, target: string): ScanProgress {
  return {
    phase,
    current: Number.isFinite(pct) ? pct : 0,
    total: 100,
    currentUrl: target,
    checksCompleted: [],
    checksRunning: [],
  };
}

const RISK_TO_SEVERITY: Record<string, Severity> = {
  High: "high",
  Medium: "medium",
  Low: "low",
  Informational: "info",
};

function mapAlert(a: Record<string, unknown>): EngineFinding {
  const risk = String(a.risk ?? "Informational");
  const cweid = String(a.cweid ?? "");
  const ref = String(a.reference ?? "");

  const standards: StandardCategory[] = [];
  if (cweid && cweid !== "-1" && cweid !== "0") standards.push("CWE");
  const tags = a.tags;
  if (tags && typeof tags === "object" && Object.keys(tags).some((k) => k.includes("OWASP"))) {
    standards.push("OWASP_TOP10");
  }

  return {
    checkId: String(a.pluginId ?? ""), // stable id → stable fingerprint across scans
    title: String(a.name ?? a.alert ?? "Finding"),
    severity: RISK_TO_SEVERITY[risk] ?? "info",
    category: String(a.name ?? "ZAP"),
    standards,
    url: String(a.url ?? ""),
    parameter: a.param ? String(a.param) : undefined,
    evidence: a.evidence ? String(a.evidence) : undefined,
    description: String(a.description ?? ""),
    impact: String(a.otherinfo ?? ""),
    remediation: String(a.solution ?? ""),
    references: ref ? ref.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean) : [],
    cwe: cweid && cweid !== "-1" && cweid !== "0" ? `CWE-${cweid}` : undefined,
  };
}

export const zapEngine: AsyncScanEngine = {
  id: "zap",
  name: "OWASP ZAP",
  capabilities: {
    mode: ["passive", "active"],
    standards: ["OWASP_TOP10", "OWASP_API", "CWE", "SANS_TOP25", "NIST", "PCI_DSS"],
    needsWorker: true,
  },

  async start(config: ScanConfig): Promise<EngineHandle> {
    const r = await zap("spider/action/scan", {
      url: config.targetUrl,
      recurse: "true",
      maxChildren: String(config.maxRequests ?? 0),
    });
    const handle: ZapHandle = {
      target: config.targetUrl,
      phase: "spider",
      spiderId: String(r.scan ?? "0"),
    };
    return handle;
  },

  async poll(handle: EngineHandle): Promise<EnginePollResult> {
    const h = handle as ZapHandle;

    if (h.phase === "spider") {
      const s = await zap("spider/view/status", { scanId: h.spiderId ?? "0" });
      const pct = Number(s.status ?? 0);
      if (pct < 100) {
        return { status: "running", handle: h, progress: progress("Spider & Crawling", pct, h.target) };
      }
      // Spider done → launch the active scan.
      const a = await zap("ascan/action/scan", { url: h.target, recurse: "true" });
      const next: ZapHandle = { ...h, phase: "ascan", ascanId: String(a.scan ?? "0") };
      return { status: "running", handle: next, progress: progress("Active Payload Testing", 0, h.target) };
    }

    if (h.phase === "ascan") {
      const s = await zap("ascan/view/status", { scanId: h.ascanId ?? "0" });
      const pct = Number(s.status ?? 0);
      if (pct < 100) {
        return { status: "running", handle: h, progress: progress("Active Payload Testing", pct, h.target) };
      }
      return { status: "done", handle: h };
    }

    return { status: "error", handle: h, error: `Unknown ZAP phase: ${h.phase}` };
  },

  async collect(handle: EngineHandle): Promise<EngineFinding[]> {
    const h = handle as ZapHandle;
    const r = await zap("core/view/alerts", { baseurl: h.target });
    const alerts = (r.alerts as Record<string, unknown>[]) ?? [];
    return alerts.map(mapAlert);
  },
};
