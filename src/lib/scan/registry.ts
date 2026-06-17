import { ScanEngine } from "@/lib/scan/engine";
import { stubEngine } from "@/lib/scan/engines/stub";

// Engine registry. Register every available scan engine here; the orchestrator
// resolves an engine by id. To add OWASP ZAP (or Nuclei, an API, an AI engine):
// implement ScanEngine in src/lib/scan/engines/<name>.ts and register it below.
const ENGINES: Record<string, ScanEngine> = {
  [stubEngine.id]: stubEngine,
};

export const DEFAULT_ENGINE_ID = stubEngine.id;

export function getEngine(id?: string): ScanEngine {
  const engine = ENGINES[id ?? DEFAULT_ENGINE_ID];
  if (!engine) throw new Error(`Unknown scan engine: ${id}`);
  return engine;
}

export function listEngines(): Pick<ScanEngine, "id" | "name" | "capabilities">[] {
  return Object.values(ENGINES).map(({ id, name, capabilities }) => ({
    id,
    name,
    capabilities,
  }));
}
