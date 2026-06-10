"use client";
import { useState } from "react";
import { Download, RefreshCw, Filter, ChevronRight, TrendingUp, AlertTriangle, Shield, CheckCircle, ExternalLink } from "lucide-react";
import { ScanResult, Finding, Severity, StandardCategory } from "@/lib/types";
import { SeverityBadge, StandardBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FindingDetail } from "./FindingDetail";
import { SEVERITY_CONFIG, STANDARDS, GRADE_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ResultsDashboardProps {
  result: ScanResult;
  onRescan: () => void;
}

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

export function ResultsDashboard({ result, onRescan }: ResultsDashboardProps) {
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<Severity | "all">("all");
  const [filterStandard, setFilterStandard] = useState<StandardCategory | "all">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const grade = result.summary.grade;
  const gradeCfg = GRADE_CONFIG[grade];

  const categories = Array.from(new Set(result.findings.map(f => f.category)));

  const filtered = result.findings.filter(f => {
    if (filterSeverity !== "all" && f.severity !== filterSeverity) return false;
    if (filterStandard !== "all" && !f.standards.includes(filterStandard)) return false;
    if (filterCategory !== "all" && f.category !== filterCategory) return false;
    return true;
  }).sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Score */}
        <div className="col-span-2 lg:col-span-1 bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex items-center gap-5">
          <div className={cn("w-20 h-20 rounded-2xl flex flex-col items-center justify-center border", gradeCfg.bg, "border-current")}>
            <span className={cn("text-4xl font-black", gradeCfg.color)}>{grade}</span>
          </div>
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wide">Security Grade</p>
            <p className={cn("text-lg font-bold mt-0.5", gradeCfg.color)}>{gradeCfg.label}</p>
            <p className="text-slate-400 text-sm">Score: {result.summary.score}/100</p>
          </div>
        </div>

        {/* Severity counts */}
        {SEVERITY_ORDER.filter(s => s !== "info").map(sev => {
          const cfg = SEVERITY_CONFIG[sev];
          const count = result.summary[sev as keyof typeof result.summary] as number;
          return (
            <button
              key={sev}
              onClick={() => setFilterSeverity(filterSeverity === sev ? "all" : sev)}
              className={cn(
                "bg-slate-800/50 border rounded-2xl p-5 text-left transition-all cursor-pointer hover:border-slate-600",
                filterSeverity === sev ? `${cfg.bg} ${cfg.border}` : "border-slate-700"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn("text-xs font-semibold uppercase tracking-wide", cfg.color)}>{cfg.label}</span>
                <div className={cn("w-2 h-2 rounded-full", cfg.dot)} />
              </div>
              <p className={cn("text-3xl font-black", cfg.color)}>{count}</p>
              <p className="text-slate-500 text-xs mt-1">
                {count === 1 ? "finding" : "findings"}
              </p>
            </button>
          );
        })}
      </div>

      {/* Scan meta */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pages Scanned",    value: result.pagesScanned,   unit: "pages" },
          { label: "Requests Made",    value: result.requestsMade,   unit: "requests" },
          { label: "Duration",         value: `${Math.floor(result.duration / 60)}m ${result.duration % 60}s`, unit: "" },
        ].map(({ label, value, unit }) => (
          <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl px-5 py-4">
            <p className="text-slate-500 text-xs">{label}</p>
            <p className="text-white font-bold text-xl mt-1">{value} <span className="text-slate-500 text-sm font-normal">{unit}</span></p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="primary" size="sm">
          <Download className="w-4 h-4" /> Export PDF Report
        </Button>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4" /> Export JSON
        </Button>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
        <Button variant="ghost" size="sm" onClick={onRescan}>
          <RefreshCw className="w-4 h-4" /> Rescan
        </Button>
      </div>

      {/* Findings */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
        {/* Filters */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-400">{filtered.length} of {result.findings.length} findings</span>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Severity filter */}
            <select
              value={filterSeverity}
              onChange={e => setFilterSeverity(e.target.value as Severity | "all")}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
            >
              <option value="all">All Severities</option>
              {SEVERITY_ORDER.map(s => (
                <option key={s} value={s}>{SEVERITY_CONFIG[s].label}</option>
              ))}
            </select>

            {/* Standard filter */}
            <select
              value={filterStandard}
              onChange={e => setFilterStandard(e.target.value as StandardCategory | "all")}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
            >
              <option value="all">All Standards</option>
              {(Object.entries(STANDARDS) as [StandardCategory, typeof STANDARDS[StandardCategory]][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            {/* Category filter */}
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Finding rows */}
        <div className="divide-y divide-slate-800">
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No findings match the current filters</p>
            </div>
          ) : (
            filtered.map(finding => {
              const cfg = SEVERITY_CONFIG[finding.severity];
              return (
                <button
                  key={finding.id}
                  onClick={() => setSelectedFinding(finding)}
                  className="w-full flex items-start gap-4 px-6 py-4 hover:bg-slate-700/30 transition-colors text-left group cursor-pointer"
                >
                  <div className={cn("mt-1 w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <SeverityBadge severity={finding.severity} />
                      <span className="text-xs text-slate-500">{finding.category}</span>
                      {finding.cvss && <span className="text-xs text-slate-500 font-mono">CVSS {finding.cvss}</span>}
                    </div>
                    <p className="text-white text-sm font-medium group-hover:text-cyan-400 transition-colors">{finding.title}</p>
                    <p className="text-slate-500 text-xs mt-1 font-mono truncate">{finding.url}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {finding.standards.slice(0, 3).map(s => <StandardBadge key={s} standard={s} />)}
                      {finding.standards.length > 3 && (
                        <Badge variant="outline">+{finding.standards.length - 3}</Badge>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0 mt-1" />
                </button>
              );
            })
          )}
        </div>
      </div>

      <FindingDetail finding={selectedFinding} onClose={() => setSelectedFinding(null)} />
    </div>
  );
}
