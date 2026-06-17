import { EngineFinding } from "@/lib/scan/engine";
import { ScanResult, Severity } from "@/lib/types";

type Summary = ScanResult["summary"];

// Penalty per finding by severity. Score starts at 100 and is reduced from there.
const PENALTY: Record<Severity, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 0,
};

function gradeFor(score: number): Summary["grade"] {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

// Rolls a finding list into the dashboard summary: per-severity counts, a 0–100
// security score, and an A–F grade. This is the "what's urgent?" backbone.
export function summarize(findings: Pick<EngineFinding, "severity">[]): Summary {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  let penalty = 0;
  for (const f of findings) {
    counts[f.severity]++;
    penalty += PENALTY[f.severity];
  }
  const score = Math.max(0, 100 - penalty);
  return {
    ...counts,
    total: findings.length,
    score,
    grade: gradeFor(score),
  };
}
