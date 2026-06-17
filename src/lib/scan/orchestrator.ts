import { SupabaseClient } from "@supabase/supabase-js";
import { ScanConfig, ScanResult } from "@/lib/types";
import { EngineFinding, isAsyncEngine } from "@/lib/scan/engine";
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
  getScanMeta,
  setEngineState,
  PersistFinding,
} from "@/lib/dal/scans";

export interface RunScanInput {
  targetUrl: string;
  engineId?: string;
  config: ScanConfig;
  authorized: boolean;
}

// Score, compute the "what changed?" delta vs the prior scan of the same target,
// persist findings, and mark the scan complete. Shared by both engine paths.
async function finalize(
  supabase: SupabaseClient,
  userId: string,
  scanId: string,
  targetUrl: string,
  collected: EngineFinding[],
  startedMs: number
): Promise<void> {
  const currentFps = collected.map((f) => fingerprint(f));
  const previousFps = await getPreviousFingerprints(supabase, userId, targetUrl, scanId);
  const { delta, statusByFingerprint } = computeDelta(currentFps, previousFps);

  const toPersist: PersistFinding[] = collected.map((f, i) => ({
    ...f,
    fingerprint: currentFps[i],
    deltaStatus: statusByFingerprint[currentFps[i]],
  }));

  await insertFindings(supabase, userId, scanId, toPersist);
  await completeScan(supabase, userId, scanId, {
    summary: summarize(collected),
    delta,
    pagesScanned: 1,
    requestsMade: collected.length,
    duration: Math.round((Date.now() - startedMs) / 1000),
  });
}

// Start a scan. In-process engines (stub) run to completion synchronously.
// Worker engines (ZAP) are kicked off and left `running`; advanceScan() drives
// them on subsequent polls.
export async function startScan(
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
    if (isAsyncEngine(engine)) {
      const handle = await engine.start(input.config, { userId });
      await setEngineState(supabase, userId, scanId, handle);
    } else {
      const collected: EngineFinding[] = [];
      for await (const event of engine.scan(input.config, { userId })) {
        if (event.type === "finding") collected.push(event.finding);
      }
      await finalize(supabase, userId, scanId, input.targetUrl, collected, startedMs);
    }
    const result = await getScan(supabase, userId, scanId);
    if (!result) throw new Error("scan vanished after start");
    return result;
  } catch (err) {
    await failScan(supabase, userId, scanId, err instanceof Error ? err.message : "scan failed");
    throw err;
  }
}

// Advance a running worker-engine scan: poll the engine; when done, collect and
// finalize. No-op for sync engines (already complete) and finished scans.
// Called on each GET /api/scan/:id.
export async function advanceScan(
  supabase: SupabaseClient,
  userId: string,
  scanId: string
): Promise<ScanResult | null> {
  const meta = await getScanMeta(supabase, userId, scanId);
  if (!meta) return null;
  if (meta.status !== "running") return getScan(supabase, userId, scanId);

  const engine = getEngine(meta.engineId);
  if (!isAsyncEngine(engine)) return getScan(supabase, userId, scanId);

  try {
    const res = await engine.poll(meta.engineState ?? {}, { userId });
    if (res.status === "running") {
      await setEngineState(supabase, userId, scanId, res.handle);
    } else if (res.status === "error") {
      await failScan(supabase, userId, scanId, res.error ?? "engine error");
    } else {
      const collected = await engine.collect(res.handle, { userId });
      await finalize(
        supabase,
        userId,
        scanId,
        meta.targetUrl,
        collected,
        new Date(meta.startedAt).getTime()
      );
    }
  } catch (err) {
    await failScan(supabase, userId, scanId, err instanceof Error ? err.message : "advance failed");
  }

  return getScan(supabase, userId, scanId);
}
