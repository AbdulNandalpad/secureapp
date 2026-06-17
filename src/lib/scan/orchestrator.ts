import { SupabaseClient } from "@supabase/supabase-js";
import { ScanConfig, ScanResult } from "@/lib/types";
import { EngineFinding } from "@/lib/scan/engine";
import { getEngine } from "@/lib/scan/registry";
import { summarize } from "@/lib/scan/score";
import { fingerprint, computeDelta } from "@/lib/scan/delta";
import {
  createScan,
  getPreviousFingerprints,
  insertFindings,
  completeScan,
  failScan,
  getScan,
  PersistFinding,
} from "@/lib/dal/scans";

export interface RunScanInput {
  targetUrl: string;
  engineId?: string;
  config: ScanConfig;
  authorized: boolean;
}

// Drives any registered engine identically: create the scan row, consume the
// engine's event stream, score, compute the "what changed?" delta vs the prior
// scan of the same target, persist, and return the assembled result.
//
// Engines with `needsWorker` (e.g. OWASP ZAP) will run asynchronously — this
// synchronous path suits in-process engines (the current stub). The interface
// stays the same; only this wrapper changes when the worker path lands.
export async function runScan(
  supabase: SupabaseClient,
  userId: string,
  input: RunScanInput
): Promise<ScanResult> {
  const engine = getEngine(input.engineId);
  const startedMs = Date.now();

  const scanId = await createScan(supabase, userId, {
    targetUrl: input.targetUrl,
    engineId: engine.id,
    config: input.config,
    authorized: input.authorized,
  });

  try {
    const collected: EngineFinding[] = [];
    for await (const event of engine.scan(input.config, { userId })) {
      if (event.type === "finding") collected.push(event.finding);
      // progress events are ignored in the synchronous path
    }

    const currentFps = collected.map((f) => fingerprint(f));
    const previousFps = await getPreviousFingerprints(
      supabase,
      userId,
      input.targetUrl,
      scanId
    );
    const { delta, statusByFingerprint } = computeDelta(currentFps, previousFps);

    const toPersist: PersistFinding[] = collected.map((f, i) => ({
      ...f,
      fingerprint: currentFps[i],
      deltaStatus: statusByFingerprint[currentFps[i]],
    }));

    const summary = summarize(collected);
    await insertFindings(supabase, userId, scanId, toPersist);
    await completeScan(supabase, userId, scanId, {
      summary,
      delta,
      pagesScanned: 1,
      requestsMade: collected.length,
      duration: Math.round((Date.now() - startedMs) / 1000),
    });

    const result = await getScan(supabase, userId, scanId);
    if (!result) throw new Error("scan vanished after completion");
    return result;
  } catch (err) {
    await failScan(
      supabase,
      userId,
      scanId,
      err instanceof Error ? err.message : "scan failed"
    );
    throw err;
  }
}
