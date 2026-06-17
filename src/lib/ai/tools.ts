import Anthropic from "@anthropic-ai/sdk";
import { SupabaseClient } from "@supabase/supabase-js";
import { getMyProfile, updateMyProfile } from "@/lib/dal/profiles";
import { listScans, getLatestScan, getScan } from "@/lib/dal/scans";

// AI tool layer — the AI's interface to the database.
//
// SecureApp is AI-native: the agent accesses every table through these typed
// tools, and each tool's handler calls the DAL (src/lib/dal/*), which runs
// under the authenticated user's Supabase client so RLS is always enforced.
//
// To expose a new table to the AI: add its DAL functions in src/lib/dal/,
// then register read/write tools for it here. Do NOT let the agent (or any
// caller) touch Supabase outside this DAL → tools path.

export interface ToolContext {
  supabase: SupabaseClient;
  userId: string;
}

// Tool schemas advertised to Claude. Descriptions are prescriptive about WHEN
// to call each tool — recent Opus models reach for tools conservatively.
export const TOOL_DEFS: Anthropic.Tool[] = [
  {
    name: "get_my_profile",
    description:
      "Get the signed-in user's profile (id, email, full name, join date). " +
      "Call this whenever the user asks about their own account or details.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "update_my_profile",
    description:
      "Update the signed-in user's profile. Call this when the user asks to " +
      "change their display/full name.",
    input_schema: {
      type: "object",
      properties: {
        full_name: { type: "string", description: "The new full name." },
      },
      required: ["full_name"],
      additionalProperties: false,
    },
  },
  {
    name: "list_scans",
    description:
      "List the user's recent security scans (target, status, grade, severity " +
      "counts, and the new/fixed delta). Call this when the user asks about their " +
      "scan history or wants an overview across scans.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_latest_scan",
    description:
      "Get the user's most recent completed scan in full: summary (grade, " +
      "severity counts), the delta vs the previous scan (what changed), and all " +
      "findings (each with CVSS, CWE, impact, and remediation). Call this to " +
      "answer what's urgent, what changed, why it matters, or what to do next.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_scan",
    description:
      "Get one specific scan by id, with its full findings. Use after list_scans " +
      "when the user asks about a particular scan.",
    input_schema: {
      type: "object",
      properties: {
        scan_id: { type: "string", description: "The scan's id." },
      },
      required: ["scan_id"],
      additionalProperties: false,
    },
  },
];

// Maps a tool name + input to its DAL call. Returns a JSON-serializable result.
// Throws are caught by the agent and returned to Claude as an error tool_result.
export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<unknown> {
  switch (name) {
    case "get_my_profile":
      return await getMyProfile(ctx.supabase, ctx.userId);

    case "update_my_profile":
      return await updateMyProfile(ctx.supabase, ctx.userId, {
        full_name: String(input.full_name ?? ""),
      });

    case "list_scans":
      return await listScans(ctx.supabase, ctx.userId);

    case "get_latest_scan":
      return await getLatestScan(ctx.supabase, ctx.userId);

    case "get_scan":
      return await getScan(ctx.supabase, ctx.userId, String(input.scan_id ?? ""));

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
