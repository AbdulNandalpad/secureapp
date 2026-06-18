"use client";
import { Shield, CheckCircle, Loader2, Clock, AlertTriangle } from "lucide-react";
import { ScanStatus } from "@/lib/types";
import { SCAN_PHASES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ScanProgressProps {
  targetUrl: string;
  status: ScanStatus;
  progress: number; // 0–100
  phase: string;
  elapsed: number; // seconds
  error?: string | null;
}

// Presentational only — driven by real poll data from the page. The page calls
// POST /api/scan then polls GET /api/scan/:id, feeding status/progress/phase here.
export function ScanProgress({ targetUrl, status, progress, phase, elapsed, error }: ScanProgressProps) {
  const phaseIndex = Math.max(0, SCAN_PHASES.indexOf(phase));
  const isError = status === "error";

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      <div className="text-center">
        <div
          className={cn(
            "inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 border",
            isError
              ? "bg-red-500/10 border-red-500/20"
              : status === "complete"
                ? "bg-green-500/10 border-green-500/20"
                : "bg-cyan-500/10 border-cyan-500/20"
          )}
        >
          {isError ? (
            <AlertTriangle className="w-8 h-8 text-red-400" />
          ) : status === "complete" ? (
            <CheckCircle className="w-8 h-8 text-green-400" />
          ) : (
            <Shield className="w-8 h-8 text-cyan-400 animate-pulse" />
          )}
        </div>
        <h2 className="text-xl font-bold text-white">
          {isError ? "Scan Failed" : status === "complete" ? "Scan Complete" : "Scanning in Progress"}
        </h2>
        <p className="text-slate-400 text-sm mt-1 font-mono">{targetUrl}</p>
      </div>

      {isError ? (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 text-center">
          <p className="text-red-300 text-sm">{error ?? "The scan could not be completed."}</p>
        </div>
      ) : (
        <>
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">{phase || "Starting…"}</span>
              <span className="text-cyan-400 font-semibold">{Math.floor(progress)}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500 relative"
                style={{ width: `${Math.max(4, progress)}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
              </div>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-slate-500 text-xs pt-1">
              <Clock className="w-3 h-3" /> {elapsed}s elapsed
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Scan Phases</h3>
            <div className="space-y-2">
              {SCAN_PHASES.map((p, i) => (
                <div
                  key={p}
                  className={cn(
                    "flex items-center gap-3 py-1.5 px-3 rounded-lg transition-all",
                    i === phaseIndex && status !== "complete" ? "bg-cyan-500/5 border border-cyan-500/20" : ""
                  )}
                >
                  {i < phaseIndex || status === "complete" ? (
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                  ) : i === phaseIndex ? (
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
                  )}
                  <span
                    className={cn(
                      "text-sm",
                      i < phaseIndex || status === "complete"
                        ? "text-slate-400 line-through"
                        : i === phaseIndex
                          ? "text-cyan-400"
                          : "text-slate-600"
                    )}
                  >
                    {p}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
