import { Finding, ScanConfig, ScanProgress, StandardCategory } from "@/lib/types";

// A finding as produced by an engine — no DB id yet (the orchestrator assigns one).
export type EngineFinding = Omit<Finding, "id">;

export type ScanEvent =
  | { type: "progress"; progress: ScanProgress }
  | { type: "finding"; finding: EngineFinding }
  | { type: "done" };

export interface EngineCapabilities {
  mode: ("passive" | "active")[];
  standards: StandardCategory[];
  // true => cannot run inside a Vercel function; needs an external host/worker
  // (e.g. OWASP ZAP). The orchestrator runs such engines asynchronously.
  needsWorker: boolean;
}

export interface ScanContext {
  userId: string;
  signal?: AbortSignal;
}

// The pluggable contract. Any scanner — a built-in prober, OWASP ZAP, Nuclei,
// a hosted API, or an AI-driven analyzer — implements this and registers itself
// in registry.ts. The orchestrator drives every engine identically by consuming
// the event stream; swapping engines is a config choice, not a rewrite.
export interface ScanEngine {
  id: string;
  name: string;
  capabilities: EngineCapabilities;
  scan(config: ScanConfig, ctx: ScanContext): AsyncIterable<ScanEvent>;
}
