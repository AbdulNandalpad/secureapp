import { createHash } from "crypto";
import { EngineFinding } from "@/lib/scan/engine";

// A stable identity for a finding across scans: same vuln, same endpoint, same
// parameter => same fingerprint, even though each scan row has a different id.
// This is what powers the "what changed?" delta.
export function fingerprint(f: Pick<EngineFinding, "checkId" | "url" | "parameter">): string {
  let path = f.url ?? "";
  try {
    path = new URL(f.url ?? "").pathname;
  } catch {
    // non-URL value — fall back to the raw string
  }
  return createHash("sha1")
    .update(`${f.checkId ?? ""}|${path}|${f.parameter ?? ""}`)
    .digest("hex")
    .slice(0, 16);
}

export type DeltaStatus = "new" | "persisting" | "fixed";

export interface ScanDelta {
  new: number;
  persisting: number;
  fixed: number;
}

// Compares this scan's fingerprints against the previous scan of the same target.
// Returns the delta counts plus a per-fingerprint status for the current findings.
export function computeDelta(
  currentFingerprints: string[],
  previousFingerprints: string[]
): { delta: ScanDelta; statusByFingerprint: Record<string, DeltaStatus> } {
  const prev = new Set(previousFingerprints);
  const curr = new Set(currentFingerprints);

  const statusByFingerprint: Record<string, DeltaStatus> = {};
  let added = 0;
  let persisting = 0;

  for (const fp of curr) {
    if (prev.has(fp)) {
      statusByFingerprint[fp] = "persisting";
      persisting++;
    } else {
      statusByFingerprint[fp] = "new";
      added++;
    }
  }

  let fixed = 0;
  for (const fp of prev) {
    if (!curr.has(fp)) fixed++;
  }

  return { delta: { new: added, persisting, fixed }, statusByFingerprint };
}
