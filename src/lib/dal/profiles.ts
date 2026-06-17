import { SupabaseClient } from "@supabase/supabase-js";

// Data Access Layer — profiles.
// This is the ONLY place that touches the `profiles` table. Every read/write
// goes through a user-scoped Supabase server client, so RLS enforces that a
// user can only ever see or change their own row. The AI tool layer
// (src/lib/ai/tools.ts) calls these functions; it never queries Supabase directly.

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

export async function getMyProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(`getMyProfile failed: ${error.message}`);
  return data;
}

export async function updateMyProfile(
  supabase: SupabaseClient,
  userId: string,
  patch: { full_name?: string }
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: patch.full_name })
    .eq("id", userId)
    .select("id, email, full_name, created_at")
    .single();

  if (error) throw new Error(`updateMyProfile failed: ${error.message}`);
  return data;
}
