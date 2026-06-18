"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ScanForm } from "@/components/scanner/ScanForm";
import { ScanProgress } from "@/components/scanner/ScanProgress";
import { ResultsDashboard } from "@/components/scanner/ResultsDashboard";
import { ScanConfig, ScanResult, ScanStatus } from "@/lib/types";
import { Activity, Clock, Shield, ChevronRight, FileText, TrendingUp } from "lucide-react";
import { SEVERITY_CONFIG, GRADE_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { SeverityBadge } from "@/components/ui/badge";

type AppState = "form" | "scanning" | "results";

interface ScanListItem {
  id: string;
  targetUrl: string;
  engineId: string;
  status: string;
  summary: ScanResult["summary"] | null;
  delta: { new: number; persisting: number; fixed: number } | null;
  createdAt: string;
  completedAt: string | null;
}

interface LiveProgress {
  targetUrl: string;
  status: ScanStatus;
  progress: number;
  phase: string;
  elapsed: number;
  error: string | null;
}

const VIEW_HEADERS: Record<string, { title: string; subtitle: string }> = {
  scanner: { title: "New Scan", subtitle: "Configure and launch a security scan" },
  dashboard: { title: "Dashboard", subtitle: "Overview of your security posture" },
  history: { title: "Scan History", subtitle: "All previous scans and findings" },
  reports: { title: "Reports", subtitle: "Generated security reports" },
  alerts: { title: "Alerts", subtitle: "Real-time vulnerability notifications" },
  settings: { title: "Settings", subtitle: "Scanner and account configuration" },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Home() {
  const [activeView, setActiveView] = useState("scanner");
  const [appState, setAppState] = useState<AppState>("form");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [live, setLive] = useState<LiveProgress>({
    targetUrl: "",
    status: "scanning",
    progress: 0,
    phase: "",
    elapsed: 0,
    error: null,
  });

  const cancelRef = useRef(false);
  const startRef = useRef(0);

  // Smooth elapsed counter while a scan is running.
  useEffect(() => {
    if (appState !== "scanning" || live.status !== "scanning") return;
    const t = setInterval(
      () => setLive((l) => ({ ...l, elapsed: Math.floor((Date.now() - startRef.current) / 1000) })),
      1000
    );
    return () => clearInterval(t);
  }, [appState, live.status]);

  const handleStartScan = async (input: {
    config: ScanConfig;
    authorized: boolean;
    engineId: string;
  }) => {
    cancelRef.current = false;
    startRef.current = Date.now();
    setScanResult(null);
    setLive({
      targetUrl: input.config.targetUrl,
      status: "scanning",
      progress: 0,
      phase: "Starting…",
      elapsed: 0,
      error: null,
    });
    setAppState("scanning");

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl: input.config.targetUrl,
          engineId: input.engineId,
          authorized: input.authorized,
          config: input.config,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLive((l) => ({ ...l, status: "error", error: data.error ?? "Scan failed." }));
        return;
      }
      let scan = data.scan as ScanResult;

      while (scan.status === "scanning" && !cancelRef.current) {
        const pct = scan.progress?.total
          ? Math.round((scan.progress.current / scan.progress.total) * 100)
          : 0;
        setLive((l) => ({ ...l, status: "scanning", progress: pct, phase: scan.progress?.phase || l.phase }));
        await sleep(4000);
        if (cancelRef.current) return;
        const r2 = await fetch(`/api/scan/${scan.id}`);
        const d2 = await r2.json();
        if (!r2.ok) {
          setLive((l) => ({ ...l, status: "error", error: d2.error ?? "Polling failed." }));
          return;
        }
        scan = d2.scan as ScanResult;
      }

      if (cancelRef.current) return;
      if (scan.status === "complete") {
        setScanResult(scan);
        setAppState("results");
      } else {
        setLive((l) => ({ ...l, status: "error", error: `Scan ended with status: ${scan.status}.` }));
      }
    } catch {
      setLive((l) => ({ ...l, status: "error", error: "Network error — please try again." }));
    }
  };

  const handleRescan = () => {
    cancelRef.current = true;
    setAppState("form");
    setScanResult(null);
  };

  const openScan = useCallback(async (id: string) => {
    const res = await fetch(`/api/scan/${id}`);
    if (!res.ok) return;
    const { scan } = await res.json();
    setScanResult(scan);
    setAppState("results");
    setActiveView("scanner");
  }, []);

  const header = VIEW_HEADERS[activeView] ?? { title: activeView, subtitle: "" };

  const renderContent = () => {
    if (activeView === "scanner") {
      if (appState === "scanning") {
        return (
          <div>
            <ScanProgress
              targetUrl={live.targetUrl}
              status={live.status}
              progress={live.progress}
              phase={live.phase}
              elapsed={live.elapsed}
              error={live.error}
            />
            {live.status === "error" && (
              <div className="max-w-2xl mx-auto text-center">
                <button
                  onClick={handleRescan}
                  className="text-sm text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  ← Back to scan setup
                </button>
              </div>
            )}
          </div>
        );
      }
      if (appState === "results" && scanResult) {
        return <ResultsDashboard result={scanResult} onRescan={handleRescan} />;
      }
      return <ScanForm onStart={handleStartScan} />;
    }

    if (activeView === "dashboard") return <DashboardView onNavigate={setActiveView} onOpenScan={openScan} />;
    if (activeView === "history") return <HistoryView onSelect={openScan} />;

    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
          <Shield className="w-7 h-7 text-slate-500" />
        </div>
        <p className="text-slate-400 text-sm">This section is coming soon</p>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#080d16]">
      <Sidebar
        activeView={activeView}
        onNavigate={(v) => {
          setActiveView(v);
          if (v === "scanner") handleRescan();
        }}
      />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header title={header.title} subtitle={header.subtitle} />
        <main className="flex-1 p-6 overflow-auto">{renderContent()}</main>
      </div>
    </div>
  );
}

function EmptyState({ onNavigate }: { onNavigate: (v: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
        <Shield className="w-7 h-7 text-slate-500" />
      </div>
      <p className="text-slate-400 text-sm mb-3">No scans yet</p>
      <button
        onClick={() => onNavigate("scanner")}
        className="text-sm text-cyan-400 hover:text-cyan-300 cursor-pointer"
      >
        Run your first scan →
      </button>
    </div>
  );
}

function DashboardView({
  onNavigate,
  onOpenScan,
}: {
  onNavigate: (v: string) => void;
  onOpenScan: (id: string) => void;
}) {
  const [list, setList] = useState<ScanListItem[] | null>(null);
  const [latest, setLatest] = useState<ScanResult | null>(null);

  useEffect(() => {
    fetch("/api/scan")
      .then((r) => (r.ok ? r.json() : { scans: [] }))
      .then(async (d) => {
        const scans: ScanListItem[] = d.scans ?? [];
        setList(scans);
        const firstComplete = scans.find((s) => s.status === "complete");
        if (firstComplete) {
          const r2 = await fetch(`/api/scan/${firstComplete.id}`);
          if (r2.ok) setLatest((await r2.json()).scan);
        }
      })
      .catch(() => setList([]));
  }, []);

  if (list === null) {
    return <p className="text-slate-500 text-sm">Loading…</p>;
  }
  if (!latest) {
    return <EmptyState onNavigate={onNavigate} />;
  }

  const grade = latest.summary.grade;
  const gradeCfg = GRADE_CONFIG[grade];

  return (
    <div className="space-y-6">
      {latest.delta && (
        <div className="flex items-center gap-5 bg-slate-800/50 border border-slate-700 rounded-2xl px-6 py-3.5 text-sm flex-wrap">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" /> Since last scan
          </span>
          <span className="text-red-400 font-semibold">▲ {latest.delta.new} new</span>
          <span className="text-green-400 font-semibold">▼ {latest.delta.fixed} fixed</span>
          <span className="text-slate-400">● {latest.delta.persisting} persisting</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cn("col-span-2 lg:col-span-1 rounded-2xl border p-6 flex items-center gap-5", gradeCfg.bg, "border-current/20")}>
          <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-black/20">
            <span className={cn("text-4xl font-black", gradeCfg.color)}>{grade}</span>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Security Grade</p>
            <p className={cn("text-lg font-bold", gradeCfg.color)}>{gradeCfg.label}</p>
            <p className="text-slate-400 text-sm">Score: {latest.summary.score}/100</p>
          </div>
        </div>
        {(["critical", "high", "medium", "low"] as const).map((sev) => {
          const cfg = SEVERITY_CONFIG[sev];
          return (
            <div key={sev} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
              <p className={cn("text-xs font-semibold uppercase tracking-wide", cfg.color)}>{cfg.label}</p>
              <p className={cn("text-3xl font-black mt-1", cfg.color)}>{latest.summary[sev]}</p>
              <p className="text-slate-500 text-xs mt-1">findings</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-white">Recent Findings</h3>
            <button onClick={() => onOpenScan(latest.id)} className="text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer">
              View all
            </button>
          </div>
          <div className="divide-y divide-slate-800">
            {latest.findings.slice(0, 5).map((f) => (
              <div key={f.id} className="flex items-center gap-3 px-6 py-3">
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", SEVERITY_CONFIG[f.severity].dot)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{f.title}</p>
                  <p className="text-xs text-slate-500 truncate">{f.url}</p>
                </div>
                <SeverityBadge severity={f.severity} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { icon: Shield, label: "Run New Scan", sub: "Start a full security assessment", action: () => onNavigate("scanner") },
              { icon: FileText, label: "Generate Report", sub: "Export findings as PDF/JSON/CSV", action: () => onOpenScan(latest.id) },
              { icon: Activity, label: "View All Findings", sub: `${latest.summary.total} total findings`, action: () => onOpenScan(latest.id) },
              { icon: Clock, label: "Scan History", sub: `${list.length} scans`, action: () => onNavigate("history") },
            ].map(({ icon: Icon, label, sub, action }) => (
              <button
                key={label}
                onClick={action}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-700/50 transition-colors text-left cursor-pointer group"
              >
                <Icon className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-slate-200 group-hover:text-white">{label}</p>
                  <p className="text-xs text-slate-500">{sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryView({ onSelect }: { onSelect: (id: string) => void }) {
  const [scans, setScans] = useState<ScanListItem[] | null>(null);

  useEffect(() => {
    fetch("/api/scan")
      .then((r) => (r.ok ? r.json() : { scans: [] }))
      .then((d) => setScans(d.scans ?? []))
      .catch(() => setScans([]));
  }, []);

  if (scans === null) return <p className="text-slate-500 text-sm">Loading…</p>;
  if (scans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
          <Clock className="w-7 h-7 text-slate-500" />
        </div>
        <p className="text-slate-400 text-sm">No scans yet — run one from the Scanner tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {scans.map((scan) => {
        const grade = scan.summary?.grade ?? "—";
        const gradeCfg = grade !== "—" ? GRADE_CONFIG[grade] : null;
        return (
          <button
            key={scan.id}
            onClick={() => onSelect(scan.id)}
            className="w-full flex items-center gap-5 bg-slate-800/50 border border-slate-700 hover:border-slate-600 rounded-2xl px-6 py-4 text-left transition-all cursor-pointer group"
          >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", gradeCfg?.bg ?? "bg-slate-700/50")}>
              <span className={cn("text-xl font-black", gradeCfg?.color ?? "text-slate-400")}>{grade}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm font-mono truncate">{scan.targetUrl}</p>
              <p className="text-slate-500 text-xs mt-0.5">
                {new Date(scan.createdAt).toLocaleString()} · {scan.engineId}
                {scan.summary ? ` · ${scan.summary.total} findings` : ""}
                {scan.status !== "complete" ? ` · ${scan.status}` : ""}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
          </button>
        );
      })}
    </div>
  );
}
