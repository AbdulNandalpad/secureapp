"use client";
import { X, ExternalLink, Copy, Code, Shield } from "lucide-react";
import { Finding } from "@/lib/types";
import { SeverityBadge, StandardBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SEVERITY_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface FindingDetailProps {
  finding: Finding | null;
  onClose: () => void;
}

export function FindingDetail({ finding, onClose }: FindingDetailProps) {
  if (!finding) return null;
  const cfg = SEVERITY_CONFIG[finding.severity];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-end p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in slide-in-from-right-4 duration-200">
        {/* Header */}
        <div className={cn("px-6 py-5 border-b border-slate-700 flex items-start gap-4", cfg.bg)}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <SeverityBadge severity={finding.severity} />
              {finding.cvss && (
                <span className="text-xs text-slate-400 font-mono">CVSS {finding.cvss}</span>
              )}
              {finding.cwe && (
                <span className="text-xs text-slate-400 font-mono">{finding.cwe}</span>
              )}
            </div>
            <h2 className="text-white font-bold text-lg leading-tight">{finding.title}</h2>
            <p className="text-slate-400 text-sm mt-1 font-mono truncate">{finding.url}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer mt-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Standards */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Standards</h3>
            <div className="flex flex-wrap gap-1.5">
              {finding.standards.map(s => <StandardBadge key={s} standard={s} />)}
            </div>
          </div>

          {/* Evidence */}
          {finding.evidence && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Evidence</h3>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-mono text-amber-400 break-all">{finding.evidence}</p>
                  <button
                    onClick={() => copyToClipboard(finding.evidence!)}
                    className="text-slate-500 hover:text-slate-300 cursor-pointer shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{finding.description}</p>
          </div>

          {/* Impact */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Impact</h3>
            <div className={cn("border rounded-xl p-4", cfg.bg, cfg.border)}>
              <p className={cn("text-sm leading-relaxed", cfg.color)}>{finding.impact}</p>
            </div>
          </div>

          {/* Remediation */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Remediation</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{finding.remediation}</p>
          </div>

          {/* Code Example */}
          {finding.codeExample && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Code className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Code Fix</h3>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
                  <span className="text-xs text-slate-500">Example</span>
                  <button
                    onClick={() => copyToClipboard(finding.codeExample!)}
                    className="text-slate-500 hover:text-slate-300 cursor-pointer flex items-center gap-1 text-xs"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                </div>
                <pre className="p-4 text-xs text-green-400 overflow-x-auto leading-relaxed">
                  {finding.codeExample}
                </pre>
              </div>
            </div>
          )}

          {/* References */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">References</h3>
            <div className="space-y-1.5">
              {finding.references.map(ref => (
                <div key={ref} className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-sm text-cyan-400 hover:text-cyan-300 font-mono text-xs break-all">{ref}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
          <Button variant="primary" className="flex-1">
            <Shield className="w-4 h-4" /> Mark Resolved
          </Button>
        </div>
      </div>
    </div>
  );
}
