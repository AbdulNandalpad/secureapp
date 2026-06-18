import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listEngines } from "@/lib/scan/registry";

// GET /api/engines — registered scan engines (for the scan form selector).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  return NextResponse.json({ engines: listEngines() });
}
