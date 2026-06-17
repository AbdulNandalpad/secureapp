import { AnyEngine } from "@/lib/scan/engine";
import { stubEngine } from "@/lib/scan/engines/stub";
import { zapEngine } from "@/lib/scan/engines/zap";

// Engine registry. Register every available scan engine here; the orchestrator
// resolves an engine by id. To add Nuclei, a hosted API, an AI engine, etc:
// implement ScanEngine / AsyncScanEngine in src/lib/scan/engines/<name>.ts and
// register it below.
const ENGINES: Record<string, AnyEngine> = {
  [stubEngine.id]: stubEngine,
  [zapEngine.id]: zapEngine,
};

export const DEFAULT_ENGINE_ID = stubEngine.id;

export function getEngine(id?: string): AnyEngine {
  const engine = ENGINES[id ?? DEFAULT_ENGINE_ID];
  if (!engine) throw new Error(`Unknown scan engine: ${id}`);
  return engine;
}

export function listEngines(): Pick<AnyEngine, "id" | "name" | "capabilities">[] {
  return Object.values(ENGINES).map(({ id, name, capabilities }) => ({
    id,
    name,
    capabilities,
  }));
}
