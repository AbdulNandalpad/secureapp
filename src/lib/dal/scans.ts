import { SupabaseClient } from "@supabase/supabase-js";
import { Finding, ScanConfig, ScanResult } from "@/lib/types";
import { EngineFinding } from "@/lib/scan/engine";
import { ScanDelta, DeltaStatus } from "@/lib/scan/delta";

// Data Access Layer — scans + findings.
// The ONLY place that touches the `scans`/`findings` tables. Every call uses a
// user-scoped Supabase client, so RLS guarantees a user only ever sees or writes
// their own rows. The AI tool layer and API routes call these; nothing queries
// these tables directly.

export interface ScanListItem {
  id: string;
  targetUrl: string;
  engineId: string;
  status: string;
  summary: ScanResult["summary"] | null;
  delta: ScanDelta | null;
  createdAt: string;
  completedAt: string | null;
}

export interface PersistFinding extends EngineFinding {
  fingerprint: string;
  deltaStatus: DeltaStatus;
}

function mapFinding(row: Record<string, unknown>): Finding {
  return {
    id: row.id as string,
    checkId: (row.check_id as string) ?? "",
    title: row.title as string,
    severity: row.severity as Finding["severity"],
    category: (row.category as string) ?? "",
    standards: (row.standards as Finding["standards"]) ?? [],
    url: (row.url as string) ?? "",
    parameter: (row.parameter as string) ?? undefined,
    evidence: (row.evidence as string) ?? undefined,
    description: (row.description as string) ?? "",
    impact: (row.impact as string) ?? "",
    remediation: (row.remediation as string) ?? "",
    codeExample: (row.code_example as string) ?? undefined,
    references: (row.refs as string[]) ?? [],
    cvss: (row.cvss as number) ?? undefined,
    cwe: (row.cwe as string) ?? undefined,
    deltaStatus: (row.delta_status as Finding["deltaStatus"]) ?? undefined,
  };
}

function mapScan(row: Record<string, unknown>, findings: Finding[]): ScanResult {
  const status = row.status === "running" ? "scanning" : (row.status as ScanResult["status"]);
  const engineState = (row.engine_state as Record<string, unknown> | null) ?? null;
  const liveProgress =
    status === "scanning" && engineState && engineState._progress
      ? (engineState._progress as ScanResult["progress"])
      : null;
  return {
    id: row.id as string,
    targetUrl: row.target_url as string,
    startedAt: row.started_at as string,
    completedAt: (row.completed_at as string) ?? undefined,
    status,
    engineId: row.engine_id as string,
    config: (row.config as ScanConfig) ?? ({ targetUrl: row.target_url } as ScanConfig),
    progress: liveProgress ?? {
      phase: status === "complete" ? "Complete" : "Scanning",
      current: status === "complete" ? 100 : 0,
      total: 100,
      currentUrl: "",
      checksCompleted: [],
      checksRunning: [],
    },
    findings,
    summary: (row.summary as ScanResult["summary"]) ?? {
      critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0, score: 100, grade: "A",
    },
    delta: (row.delta as ScanResult["delta"]) ?? undefined,
    pagesScanned: (row.pages_scanned as number) ?? 0,
    requestsMade: (row.requests_made as number) ?? 0,
    duration: (row.duration as number) ?? 0,
  };
}

// Lightweight row used by the orchestrator to advance async (worker) scans.
export interface ScanMeta {
  id: string;
  status: string;
  engineId: string;
  targetUrl: string;
  engineState: Record<string, unknown> | null;
  startedAt: string;
}

export async function getScanMeta(
  supabase: SupabaseClient,
  userId: string,
  scanId: string
): Promise<ScanMeta | null> {
  const { data, error } = await supabase
    .from("scans")
    .select("id, status, engine_id, target_url, engine_state, started_at")
    .eq("user_id", userId)
    .eq("id", scanId)
    .maybeSingle();
  if (error) throw new Error(`getScanMeta failed: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id as string,
    status: data.status as string,
    engineId: data.engine_id as string,
    targetUrl: data.target_url as string,
    engineState: (data.engine_state as Record<string, unknown>) ?? null,
    startedAt: data.started_at as string,
  };
}

export async function setEngineState(
  supabase: SupabaseClient,
  userId: string,
  scanId: string,
  state: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from("scans")
    .update({ engine_state: state })
    .eq("id", scanId)
    .eq("user_id", userId);
  if (error) throw new Error(`setEngineState failed: ${error.message}`);
}

export async function createScan(
  supabase: SupabaseClient,
  userId: string,
  input: { targetUrl: string; engineId: string; config: ScanConfig; authorized: boolean }
): Promise<string> {
  const { data, error } = await supabase
    .from("scans")
    .insert({
      user_id: userId,
      target_url: input.targetUrl,
      engine_id: input.engineId,
      config: input.config,
      authorized: input.authorized,
      status: "running",
    })
    .select("id")
    .single();
  if (error) throw new Error(`createScan failed: ${error.message}`);
  return data.id as string;
}

// Fingerprints from the most recent COMPLETED prior scan of the same target.
export async function getPreviousFingerprints(
  supabase: SupabaseClient,
  userId: string,
  targetUrl: string,
  excludeScanId: string
): Promise<string[]> {
  const { data: prior, error: e1 } = await supabase
    .from("scans")
    .select("id")
    .eq("user_id", userId)
    .eq("target_url", targetUrl)
    .eq("status", "complete")
    .neq("id", excludeScanId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (e1) throw new Error(`getPreviousFingerprints failed: ${e1.message}`);
  if (!prior) return [];

  const { data, error } = await supabase
    .from("findings")
    .select("fingerprint")
    .eq("scan_id", prior.id);
  if (error) throw new Error(`getPreviousFingerprints findings failed: ${error.message}`);
  return (data ?? []).map((r) => r.fingerprint as string);
}

export async function insertFindings(
  supabase: SupabaseClient,
  userId: string,
  scanId: string,
  findings: PersistFinding[]
): Promise<void> {
  if (findings.length === 0) return;
  const rows = findings.map((f) => ({
    scan_id: scanId,
    user_id: userId,
    fingerprint: f.fingerprint,
    delta_status: f.deltaStatus,
    check_id: f.checkId,
    title: f.title,
    severity: f.severity,
    category: f.category,
    standards: f.standards,
    url: f.url,
    parameter: f.parameter ?? null,
    evidence: f.evidence ?? null,
    description: f.description,
    impact: f.impact,
    remediation: f.remediation,
    code_example: f.codeExample ?? null,
    refs: f.references,
    cvss: f.cvss ?? null,
    cwe: f.cwe ?? null,
  }));
  const { error } = await supabase.from("findings").insert(rows);
  if (error) throw new Error(`insertFindings failed: ${error.message}`);
}

export async function completeScan(
  supabase: SupabaseClient,
  userId: string,
  scanId: string,
  patch: {
    summary: ScanResult["summary"];
    delta: ScanDelta;
    pagesScanned: number;
    requestsMade: number;
    duration: number;
  }
): Promise<void> {
  const { error } = await supabase
    .from("scans")
    .update({
      status: "complete",
      summary: patch.summary,
      delta: patch.delta,
      pages_scanned: patch.pagesScanned,
      requests_made: patch.requestsMade,
      duration: patch.duration,
      completed_at: new Date().toISOString(),
    })
    .eq("id", scanId)
    .eq("user_id", userId);
  if (error) throw new Error(`completeScan failed: ${error.message}`);
}

export async function failScan(
  supabase: SupabaseClient,
  userId: string,
  scanId: string,
  message: string
): Promise<void> {
  await supabase
    .from("scans")
    .update({ status: "error", error: message, completed_at: new Date().toISOString() })
    .eq("id", scanId)
    .eq("user_id", userId);
}

export async function listScans(
  supabase: SupabaseClient,
  userId: string,
  limit = 25
): Promise<ScanListItem[]> {
  const { data, error } = await supabase
    .from("scans")
    .select("id, target_url, engine_id, status, summary, delta, created_at, completed_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listScans failed: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    targetUrl: r.target_url as string,
    engineId: r.engine_id as string,
    status: r.status as string,
    summary: (r.summary as ScanResult["summary"]) ?? null,
    delta: (r.delta as ScanDelta) ?? null,
    createdAt: r.created_at as string,
    completedAt: (r.completed_at as string) ?? null,
  }));
}

export async function getScan(
  supabase: SupabaseClient,
  userId: string,
  scanId: string
): Promise<ScanResult | null> {
  const { data: scan, error } = await supabase
    .from("scans")
    .select("*")
    .eq("user_id", userId)
    .eq("id", scanId)
    .maybeSingle();
  if (error) throw new Error(`getScan failed: ${error.message}`);
  if (!scan) return null;

  const { data: findings, error: fErr } = await supabase
    .from("findings")
    .select("*")
    .eq("scan_id", scanId)
    .order("cvss", { ascending: false, nullsFirst: false });
  if (fErr) throw new Error(`getScan findings failed: ${fErr.message}`);

  return mapScan(scan, (findings ?? []).map(mapFinding));
}

export async function getLatestScan(
  supabase: SupabaseClient,
  userId: string
): Promise<ScanResult | null> {
  const { data: scan, error } = await supabase
    .from("scans")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLatestScan failed: ${error.message}`);
  if (!scan) return null;

  const { data: findings } = await supabase
    .from("findings")
    .select("*")
    .eq("scan_id", scan.id)
    .order("cvss", { ascending: false, nullsFirst: false });

  return mapScan(scan, (findings ?? []).map(mapFinding));
}
