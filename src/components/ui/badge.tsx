"use client";
import { cn } from "@/lib/utils";
import { Severity, StandardCategory } from "@/lib/types";
import { SEVERITY_CONFIG, STANDARDS } from "@/lib/constants";

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border", cfg.bg, cfg.color, cfg.border, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

interface StandardBadgeProps {
  standard: StandardCategory;
  className?: string;
}

export function StandardBadge({ standard, className }: StandardBadgeProps) {
  const cfg = STANDARDS[standard];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border", cfg.color, className)}>
      {cfg.label}
    </span>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "outline";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
      variant === "default" ? "bg-slate-700 text-slate-200" : "border border-slate-600 text-slate-400",
      className
    )}>
      {children}
    </span>
  );
}
