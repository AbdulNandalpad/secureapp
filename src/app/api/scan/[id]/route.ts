import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { advanceScan } from "@/lib/scan/orchestrator";

// GET /api/scan/:id — one scan with its findings (auth-gated, own rows only).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // advanceScan drives worker-engine (ZAP) scans forward on each poll, then
  // returns the current state; it's a no-op for finished / sync-engine scans.
  const scan = await advanceScan(supabase, user.id, id);
  if (!scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

  return NextResponse.json({ scan });
}
