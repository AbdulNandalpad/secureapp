import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { runAgent } from "@/lib/ai/agent";

// POST /api/ai — the AI entry point. Auth-gated: every request runs as the
// signed-in user, and the agent reaches the database only via the DAL-backed
// tool layer, so RLS applies to everything it does.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { messages?: Anthropic.MessageParam[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: "Body must include a non-empty `messages` array" },
      { status: 400 }
    );
  }

  try {
    const reply = await runAgent({
      messages: body.messages,
      supabase,
      userId: user.id,
    });
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("AI agent error:", err);
    return NextResponse.json(
      { error: "The assistant failed to respond." },
      { status: 500 }
    );
  }
}
