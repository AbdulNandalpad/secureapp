"use client";
import { useState } from "react";
import { Shield, Globe, ChevronDown, ChevronUp, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScanConfig, StandardCategory } from "@/lib/types";
import { STANDARDS, VULNERABILITY_CHECKS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ScanFormProps {
  onStart: (config: ScanConfig) => void;
}

const DEFAULT_CONFIG: ScanConfig = {
  targetUrl: "",
  scanDepth: "standard",
  selectedStandards: ["OWASP_TOP10", "OWASP_API", "CWE", "SANS_TOP25", "NIST", "PCI_DSS", "GDPR"],
  includeAuthenticated: false,
  crawlSubdomains: false,
  maxRequests: 1000,
  timeout: 30,
  userAgent: "SecureApp Scanner/1.0",
};

export function ScanForm({ onStart }: ScanFormProps) {
  const [config, setConfig] = useState<ScanConfig>(DEFAULT_CONFIG);
  const [advanced, setAdvanced] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [urlError, setUrlError] = useState("");

  const toggleStandard = (s: StandardCategory) => {
    setConfig(c => ({
      ...c,
      selectedStandards: c.selectedStandards.includes(s)
        ? c.selectedStandards.filter(x => x !== s)
        : [...c.selectedStandards, s],
    }));
  };

  const validateUrl = (url: string) => {
    try {
      const u = new URL(url);
      if (!["http:", "https:"].includes(u.protocol)) {
        setUrlError("Only HTTP and HTTPS URLs are supported");
        return false;
      }
      setUrlError("");
      return true;
    } catch {
      setUrlError("Please enter a valid URL (e.g. https://example.com)");
      return false;
    }
  };

  const handleStart = () => {
    if (!validateUrl(config.targetUrl)) return;
    if (!authorized) return;
    onStart(config);
  };

  const activeChecks = VULNERABILITY_CHECKS.filter(c =>
    c.standards.some(s => config.selectedStandards.includes(s))
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Hero */}
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl mb-4">
          <Shield className="w-8 h-8 text-cyan-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Security Vulnerability Scanner</h2>
        <p className="text-slate-400 max-w-lg mx-auto text-sm">
          Comprehensive scanning across OWASP Top 10, SANS Top 25, CWE, NIST, PCI-DSS, GDPR, and ISO 27001 standards.
        </p>
      </div>

      {/* URL Input */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-4">
        <label className="block text-sm font-semibold text-slate-200">Target URL</label>
        <div className="relative">
          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="url"
            value={config.targetUrl}
            onChange={e => {
              setConfig(c => ({ ...c, targetUrl: e.target.value }));
              if (urlError) validateUrl(e.target.value);
            }}
            onBlur={e => e.target.value && validateUrl(e.target.value)}
            placeholder="https://your-application.com"
            className={cn(
              "w-full bg-slate-900 border text-white placeholder-slate-500 rounded-xl pl-12 pr-4 py-4 text-base",
              "focus:outline-none focus:ring-2 transition-all",
              urlError
                ? "border-red-500/50 focus:ring-red-500/20"
                : "border-slate-600 focus:border-cyan-500/50 focus:ring-cyan-500/20"
            )}
          />
        </div>
        {urlError && (
          <p className="flex items-center gap-1.5 text-red-400 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" /> {urlError}
          </p>
        )}

        {/* Scan Depth */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">Scan Depth</label>
          <div className="grid grid-cols-3 gap-3">
            {(["surface", "standard", "deep"] as const).map(depth => (
              <button
                key={depth}
                onClick={() => setConfig(c => ({ ...c, scanDepth: depth }))}
                className={cn(
                  "p-3 rounded-xl border text-sm font-medium transition-all cursor-pointer",
                  config.scanDepth === depth
                    ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                    : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                )}
              >
                <p className="capitalize font-semibold">{depth}</p>
                <p className="text-xs mt-0.5 font-normal opacity-70">
                  {depth === "surface" ? "~2 min" : depth === "standard" ? "~7 min" : "~20 min"}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Standards */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Security Standards</h3>
            <p className="text-xs text-slate-500 mt-0.5">{config.selectedStandards.length} of {Object.keys(STANDARDS).length} selected · {activeChecks.length} checks enabled</p>
          </div>
          <button
            onClick={() => setConfig(c => ({
              ...c,
              selectedStandards: c.selectedStandards.length === Object.keys(STANDARDS).length
                ? []
                : Object.keys(STANDARDS) as StandardCategory[]
            }))}
            className="text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer"
          >
            {config.selectedStandards.length === Object.keys(STANDARDS).length ? "Deselect all" : "Select all"}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.entries(STANDARDS) as [StandardCategory, typeof STANDARDS[StandardCategory]][]).map(([key, cfg]) => {
            const selected = config.selectedStandards.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleStandard(key)}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer",
                  selected
                    ? "bg-slate-700/50 border-slate-600"
                    : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                )}
              >
                <div className={cn(
                  "mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                  selected ? "bg-cyan-500 border-cyan-500" : "border-slate-600"
                )}>
                  {selected && <CheckCircle className="w-3 h-3 text-black" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{cfg.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{cfg.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Options */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
        <button
          onClick={() => setAdvanced(!advanced)}
          className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <span>Advanced Options</span>
          {advanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {advanced && (
          <div className="px-6 pb-6 space-y-4 border-t border-slate-700">
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Max Requests</label>
                <input
                  type="number"
                  value={config.maxRequests}
                  onChange={e => setConfig(c => ({ ...c, maxRequests: +e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Timeout (seconds)</label>
                <input
                  type="number"
                  value={config.timeout}
                  onChange={e => setConfig(c => ({ ...c, timeout: +e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">User-Agent</label>
              <input
                type="text"
                value={config.userAgent}
                onChange={e => setConfig(c => ({ ...c, userAgent: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div className="space-y-3">
              {[
                { key: "crawlSubdomains" as const, label: "Crawl Subdomains", desc: "Extend scan to discovered subdomains" },
                { key: "includeAuthenticated" as const, label: "Authenticated Scan", desc: "Provide credentials to scan authenticated pages" },
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer">
                  <div
                    onClick={() => setConfig(c => ({ ...c, [key]: !c[key] }))}
                    className={cn(
                      "mt-0.5 w-9 h-5 rounded-full border-2 relative transition-all cursor-pointer shrink-0",
                      config[key] ? "bg-cyan-500 border-cyan-500" : "bg-slate-700 border-slate-600"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                      config[key] ? "left-4" : "left-0.5"
                    )} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-300">{label}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Authorization */}
      <div className={cn(
        "rounded-2xl border p-5 transition-colors",
        authorized ? "bg-green-500/5 border-green-500/20" : "bg-amber-500/5 border-amber-500/20"
      )}>
        <label className="flex items-start gap-3 cursor-pointer">
          <div
            onClick={() => setAuthorized(!authorized)}
            className={cn(
              "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer",
              authorized ? "bg-green-500 border-green-500" : "border-amber-500/50"
            )}
          >
            {authorized && <CheckCircle className="w-3.5 h-3.5 text-black" />}
          </div>
          <div>
            <p className={cn("text-sm font-semibold", authorized ? "text-green-400" : "text-amber-400")}>
              Authorization Declaration
            </p>
            <p className="text-xs text-slate-400 mt-1">
              I confirm that I have explicit written authorization to perform security testing on the target URL.
              Unauthorized scanning is illegal and may violate computer crime laws. By checking this, I accept
              full legal responsibility for this scan.
            </p>
          </div>
        </label>
      </div>

      {/* CTA */}
      <Button
        size="lg"
        onClick={handleStart}
        disabled={!config.targetUrl || !authorized || config.selectedStandards.length === 0}
        className="w-full text-base py-4 rounded-xl"
      >
        <Shield className="w-5 h-5" />
        Start Security Scan
        {activeChecks.length > 0 && (
          <span className="ml-1 text-xs opacity-70">({activeChecks.length} checks)</span>
        )}
      </Button>

      {!authorized && config.targetUrl && (
        <p className="text-center text-xs text-amber-400 flex items-center justify-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          You must confirm authorization before scanning
        </p>
      )}
    </div>
  );
}
