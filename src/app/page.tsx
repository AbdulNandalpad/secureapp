"use client";
import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ScanForm } from "@/components/scanner/ScanForm";
import { ScanProgress } from "@/components/scanner/ScanProgress";
import { ResultsDashboard } from "@/components/scanner/ResultsDashboard";
import { ScanConfig, ScanResult } from "@/lib/types";
import { MOCK_SCAN_RESULT } from "@/lib/mock-data";
import { Activity, Clock, Shield, AlertTriangle, ChevronRight, FileText } from "lucide-react";
import { SEVERITY_CONFIG, GRADE_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { SeverityBadge } from "@/components/ui/badge";

type AppState = "form" | "scanning" | "results";

const VIEW_HEADERS: Record<string, { title: string; subtitle: string }> = {
  scanner:   { title: "New Scan",       subtitle: "Configure and launch a security scan" },
  dashboard: { title: "Dashboard",      subtitle: "Overview of your security posture" },
  history:   { title: "Scan History",   subtitle: "All previous scans and findings" },
  reports:   { title: "Reports",        subtitle: "Generated security reports" },
  alerts:    { title: "Alerts",         subtitle: "Real-time vulnerability notifications" },
  settings:  { title: "Settings",       subtitle: "Scanner and account configuration" },
};

export default function Home() {
  const [activeView, setActiveView] = useState("scanner");
  const [appState, setAppState] = useState<AppState>("form");
  const [scanConfig, setScanConfig] = useState<ScanConfig | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const handleStartScan = (config: ScanConfig) => {
    setScanConfig(config);
    setAppState("scanning");
  };

  const handleScanComplete = (result: ScanResult) => {
    setScanResult(result);
    setAppState("results");
    setActiveView("scanner");
  };

  const handleRescan = () => {
    setAppState("form");
    setScanResult(null);
    setScanConfig(null);
  };

  const header = VIEW_HEADERS[activeView] ?? { title: activeView, subtitle: "" };

  const renderContent = () => {
    if (activeView === "scanner") {
      if (appState === "scanning" && scanConfig) {
        return <ScanProgress config={scanConfig} onComplete={handleScanComplete} />;
      }
      if (appState === "results" && scanResult) {
        return <ResultsDashboard result={scanResult} onRescan={handleRescan} />;
      }
      return <ScanForm onStart={handleStartScan} />;
    }

    if (activeView === "dashboard") return <DashboardView onNavigate={setActiveView} />;
    if (activeView === "history") return <HistoryView onSelect={() => { setScanResult(MOCK_SCAN_RESULT); setAppState("results"); setActiveView("scanner"); }} />;

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
      <Sidebar activeView={activeView} onNavigate={(v) => { setActiveView(v); if (v === "scanner") handleRescan(); }} />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header title={header.title} subtitle={header.subtitle} />
        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

function DashboardView({ onNavigate }: { onNavigate: (v: string) => void }) {
  const r = MOCK_SCAN_RESULT;
  const grade = r.summary.grade;
  const gradeCfg = GRADE_CONFIG[grade];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cn("col-span-2 lg:col-span-1 rounded-2xl border p-6 flex items-center gap-5", gradeCfg.bg, "border-current/20")}>
          <div className={cn("w-16 h-16 rounded-xl flex items-center justify-center bg-black/20")}>
            <span className={cn("text-4xl font-black", gradeCfg.color)}>{grade}</span>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Security Grade</p>
            <p className={cn("text-lg font-bold", gradeCfg.color)}>{gradeCfg.label}</p>
            <p className="text-slate-400 text-sm">Score: {r.summary.score}/100</p>
          </div>
        </div>
        {(["critical", "high", "medium", "low"] as const).map(sev => {
          const cfg = SEVERITY_CONFIG[sev];
          return (
            <div key={sev} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
              <p className={cn("text-xs font-semibold uppercase tracking-wide", cfg.color)}>{cfg.label}</p>
              <p className={cn("text-3xl font-black mt-1", cfg.color)}>{r.summary[sev]}</p>
              <p className="text-slate-500 text-xs mt-1">findings</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent findings */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-white">Recent Findings</h3>
            <button onClick={() => onNavigate("scanner")} className="text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer">View all</button>
          </div>
          <div className="divide-y divide-slate-800">
            {r.findings.slice(0, 5).map(f => (
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

        {/* Quick actions */}
        <div className="space-y-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { icon: Shield,        label: "Run New Scan",       sub: "Start a full security assessment",  action: () => onNavigate("scanner") },
                { icon: FileText,      label: "Generate Report",    sub: "Export findings as PDF/JSON/CSV",    action: () => onNavigate("reports") },
                { icon: Activity,      label: "View All Findings",  sub: `${r.summary.total} total findings`,  action: () => onNavigate("scanner") },
                { icon: Clock,         label: "Scan History",       sub: "3 previous scans",                  action: () => onNavigate("history") },
              ].map(({ icon: Icon, label, sub, action }) => (
                <button key={label} onClick={action} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-700/50 transition-colors text-left cursor-pointer group">
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
    </div>
  );
}

function HistoryView({ onSelect }: { onSelect: () => void }) {
  const scans = [
    { id: "scan_001", url: "https://example.com", date: "2026-06-10", grade: "F" as const, findings: 9, duration: "6m 0s" },
    { id: "scan_002", url: "https://demo.app", date: "2026-06-08", grade: "C" as const, findings: 4, duration: "4m 12s" },
    { id: "scan_003", url: "https://test.io", date: "2026-06-05", grade: "B" as const, findings: 2, duration: "7m 30s" },
  ];
  return (
    <div className="space-y-3">
      {scans.map(scan => {
        const gradeCfg = GRADE_CONFIG[scan.grade];
        return (
          <button key={scan.id} onClick={onSelect} className="w-full flex items-center gap-5 bg-slate-800/50 border border-slate-700 hover:border-slate-600 rounded-2xl px-6 py-4 text-left transition-all cursor-pointer group">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", gradeCfg.bg)}>
              <span className={cn("text-xl font-black", gradeCfg.color)}>{scan.grade}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm font-mono">{scan.url}</p>
              <p className="text-slate-500 text-xs mt-0.5">{scan.date} · {scan.duration} · {scan.findings} findings</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
          </button>
        );
      })}
    </div>
  );
}
