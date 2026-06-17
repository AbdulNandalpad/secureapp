import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getScan } from "@/lib/dal/scans";

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

  const scan = await getScan(supabase, user.id, id);
  if (!scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

  return NextResponse.json({ scan });
}
