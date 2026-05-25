import { getSupabaseForAudit } from "../lib/supabaseAuditClient";

export type PublicUserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  plan_tier: string;
  subscription_status: string;
  created_at: string;
};

/** Ensure a public.users profile row exists (service role — bypasses RLS). */
export async function ensurePublicUser(input: {
  id: string;
  email?: string | null;
  displayName?: string | null;
  createdAt?: string | null;
}): Promise<PublicUserRow> {
  const supabase = getSupabaseForAudit();

  const { data: existing, error: readError } = await supabase
    .from("users")
    .select("id, email, display_name, plan_tier, subscription_status, created_at")
    .eq("id", input.id)
    .maybeSingle();

  if (readError && !/does not exist|PGRST205/i.test(readError.message)) {
    throw new Error(readError.message);
  }

  const now = new Date().toISOString();

  if (existing) {
    const patch: Record<string, unknown> = { updated_at: now };
    if (input.email) patch.email = input.email;
    if (input.displayName && !existing.display_name) {
      patch.display_name = input.displayName;
    }

    if (Object.keys(patch).length > 1) {
      const { data, error } = await supabase
        .from("users")
        .update(patch)
        .eq("id", input.id)
        .select("id, email, display_name, plan_tier, subscription_status, created_at")
        .single();
      if (error) throw new Error(error.message);
      return data as PublicUserRow;
    }
    return existing as PublicUserRow;
  }

  const insertRow: Record<string, unknown> = {
    id: input.id,
    email: input.email ?? null,
    display_name: input.displayName ?? null,
    plan_tier: "free",
    subscription_status: "none",
    created_at: input.createdAt ?? now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("users")
    .insert(insertRow)
    .select("id, email, display_name, plan_tier, subscription_status, created_at")
    .single();

  if (error) {
    if (/duplicate key|23505/i.test(error.message)) {
      const { data: retry } = await supabase
        .from("users")
        .select("id, email, display_name, plan_tier, subscription_status, created_at")
        .eq("id", input.id)
        .single();
      if (retry) return retry as PublicUserRow;
    }
    throw new Error(error.message);
  }

  return data as PublicUserRow;
}

/** Backfill all auth.users into public.users (service role). */
export async function backfillPublicUsersFromAuth(): Promise<{ synced: number }> {
  const supabase = getSupabaseForAudit();

  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });

  if (authError) {
    throw new Error(`auth.admin.listUsers failed: ${authError.message}`);
  }

  let synced = 0;
  for (const u of authUsers.users) {
    await ensurePublicUser({
      id: u.id,
      email: u.email ?? null,
      displayName:
        (typeof u.user_metadata?.full_name === "string" ? u.user_metadata.full_name : null) ??
        u.email?.split("@")[0] ??
        null,
      createdAt: u.created_at,
    });
    synced++;
  }

  return { synced };
}
