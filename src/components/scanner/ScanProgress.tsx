"use client";
import { useEffect, useState } from "react";
import { Shield, CheckCircle, Loader2, Clock, Globe } from "lucide-react";
import { ScanConfig, ScanProgress as ScanProgressType, ScanResult, ScanStatus } from "@/lib/types";
import { SCAN_PHASES, VULNERABILITY_CHECKS } from "@/lib/constants";
import { MOCK_FINDINGS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface ScanProgressProps {
  config: ScanConfig;
  onComplete: (result: ScanResult) => void;
}

export function ScanProgress({ config, onComplete }: ScanProgressProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [requests, setRequests] = useState(0);
  const [pages, setPages] = useState(0);
  const [status, setStatus] = useState<ScanStatus>("scanning");
  const [log, setLog] = useState<string[]>([]);

  const totalDuration = config.scanDepth === "surface" ? 12000 : config.scanDepth === "standard" ? 18000 : 25000;
  const phaseMs = totalDuration / SCAN_PHASES.length;

  useEffect(() => {
    const startTime = Date.now();

    const tick = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / totalDuration) * 100, 100);
      const phase = Math.min(Math.floor(elapsed / phaseMs), SCAN_PHASES.length - 1);

      setProgress(pct);
      setPhaseIndex(phase);
      setElapsed(Math.floor(elapsed / 1000));
      setRequests(Math.floor(pct * 8.5));
      setPages(Math.floor(pct * 0.47));

      setLog(prev => {
        const msgs = [
          `[${new Date().toLocaleTimeString()}] Scanning ${config.targetUrl}${Math.random() > 0.7 ? "/api/v1/" + Math.random().toString(36).slice(2, 8) : ""}`,
          `[${new Date().toLocaleTimeString()}] Testing ${["XSS payloads", "SQL injection", "SSRF vectors", "Auth bypass", "Header analysis", "TLS config"][Math.floor(Math.random() * 6)]}`,
          `[${new Date().toLocaleTimeString()}] Discovered endpoint: /api/${Math.random().toString(36).slice(2, 8)}`,
        ];
        if (prev.length > 8) return [...prev.slice(-7), msgs[Math.floor(Math.random() * msgs.length)]];
        return [...prev, msgs[Math.floor(Math.random() * msgs.length)]];
      });

      if (elapsed >= totalDuration) {
        clearInterval(tick);
        setStatus("complete");
        const result: ScanResult = {
          id: `scan_${Date.now()}`,
          targetUrl: config.targetUrl,
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          status: "complete",
          config,
          progress: { phase: "Complete", current: 9, total: 9, currentUrl: "", checksCompleted: [], checksRunning: [] },
          findings: MOCK_FINDINGS,
          summary: { critical: 3, high: 3, medium: 2, low: 1, info: 0, total: 9, score: 34, grade: "F" },
          pagesScanned: Math.floor(pct * 0.47),
          requestsMade: Math.floor(pct * 8.5),
          duration: Math.floor(elapsed / 1000),
        };
        setTimeout(() => onComplete(result), 800);
      }
    }, 250);

    return () => clearInterval(tick);
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      {/* Header */}
      <div className="text-center">
        <div className={cn(
          "inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 border",
          status === "complete"
            ? "bg-green-500/10 border-green-500/20"
            : "bg-cyan-500/10 border-cyan-500/20"
        )}>
          {status === "complete"
            ? <CheckCircle className="w-8 h-8 text-green-400" />
            : <Shield className="w-8 h-8 text-cyan-400 animate-pulse" />
          }
        </div>
        <h2 className="text-xl font-bold text-white">
          {status === "complete" ? "Scan Complete" : "Scanning in Progress"}
        </h2>
        <p className="text-slate-400 text-sm mt-1 font-mono">{config.targetUrl}</p>
      </div>

      {/* Progress bar */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">{SCAN_PHASES[phaseIndex]}</span>
          <span className="text-cyan-400 font-semibold">{Math.floor(progress)}%</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-300 relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          {[
            { icon: Clock,   label: "Elapsed",   value: `${elapsed}s` },
            { icon: Globe,   label: "Pages",      value: pages.toString() },
            { icon: Shield,  label: "Requests",   value: requests.toString() },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-slate-500 text-xs mb-1">
                <Icon className="w-3 h-3" /> {label}
              </div>
              <p className="text-white font-semibold text-lg font-mono">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Phase checklist */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Scan Phases</h3>
        <div className="space-y-2">
          {SCAN_PHASES.map((phase, i) => (
            <div key={phase} className={cn("flex items-center gap-3 py-1.5 px-3 rounded-lg transition-all",
              i === phaseIndex && status !== "complete" ? "bg-cyan-500/5 border border-cyan-500/20" : ""
            )}>
              {i < phaseIndex || status === "complete"
                ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                : i === phaseIndex
                  ? <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                  : <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
              }
              <span className={cn("text-sm",
                i < phaseIndex || status === "complete" ? "text-slate-400 line-through" :
                i === phaseIndex ? "text-cyan-400" : "text-slate-600"
              )}>
                {phase}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Live log */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 font-mono">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-slate-500 text-xs ml-2">scan.log</span>
        </div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {log.map((line, i) => (
            <p key={i} className="text-xs text-green-400/80">{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
