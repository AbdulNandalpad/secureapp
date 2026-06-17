import Anthropic from "@anthropic-ai/sdk";
import { SupabaseClient } from "@supabase/supabase-js";
import { TOOL_DEFS, executeTool, ToolContext } from "@/lib/ai/tools";

const MODEL = "claude-opus-4-8";
const MAX_TOKENS = 8000;
const MAX_TURNS = 8; // safety cap on the tool-use loop

const SYSTEM_PROMPT = `You are the assistant inside SecureApp, a web security scanner.
You help the signed-in user with their account and (later) their scans and findings.
You can ONLY access data through the provided tools — never claim to read or change
data you did not retrieve via a tool. Be concise and direct.`;

export interface RunAgentArgs {
  messages: Anthropic.MessageParam[];
  supabase: SupabaseClient;
  userId: string;
}

// Manual agentic loop: call Claude, run any requested tools through the DAL
// (auth/RLS enforced there), feed results back, repeat until end_turn.
export async function runAgent({
  messages,
  supabase,
  userId,
}: RunAgentArgs): Promise<string> {
  const client = new Anthropic();
  const ctx: ToolContext = { supabase, userId };
  const convo: Anthropic.MessageParam[] = [...messages];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: SYSTEM_PROMPT,
      tools: TOOL_DEFS,
      messages: convo,
    });

    if (response.stop_reason !== "tool_use") {
      return response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
    }

    convo.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      try {
        const result = await executeTool(
          block.name,
          block.input as Record<string, unknown>,
          ctx
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result ?? null),
        });
      } catch (err) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          is_error: true,
          content: err instanceof Error ? err.message : "tool execution failed",
        });
      }
    }

    convo.push({ role: "user", content: toolResults });
  }

  return "I wasn't able to finish that request — too many steps. Please try rephrasing.";
}
