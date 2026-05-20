import { requireSupabaseBrowserClient } from "./supabase";
import type { AppUser } from "@/types/appUser";
import type { SupabaseClient, User as SupabaseAuthUser } from "@supabase/supabase-js";

export type UserProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  business_name: string | null;
  industry: string | null;
  welcome_completed: boolean;
  created_at: string;
  updated_at: string;
};

function resolveClient(client?: SupabaseClient): SupabaseClient {
  return client ?? requireSupabaseBrowserClient();
}

function mapProfile(authUser: SupabaseAuthUser, row: UserProfileRow | null): AppUser {
  const meta = authUser.user_metadata ?? {};
  const name =
    row?.display_name?.trim() ||
    (typeof meta.full_name === "string" ? meta.full_name : "") ||
    authUser.email?.split("@")[0] ||
    "User";

  return {
    id: authUser.id,
    email: row?.email ?? authUser.email ?? "",
    name,
    businessName: row?.business_name ?? null,
    industry: row?.industry ?? null,
    welcomeCompleted: row?.welcome_completed ?? false,
    role: "user",
    createdAt: row?.created_at ?? authUser.created_at ?? new Date().toISOString(),
  };
}

/** Profile from Auth only — used when public.users row missing or RLS blocks upsert. */
export function profileFromAuthUser(authUser: SupabaseAuthUser): AppUser {
  return mapProfile(authUser, null);
}

export async function upsertUserProfile(
  authUser: SupabaseAuthUser,
  fields?: {
    displayName?: string;
    businessName?: string;
    industry?: string;
  },
  client?: SupabaseClient
): Promise<AppUser> {
  const supabase = resolveClient(client);
  const base = {
    id: authUser.id,
    email: authUser.email,
    display_name: fields?.displayName ?? authUser.user_metadata?.full_name ?? null,
    updated_at: new Date().toISOString(),
  };

  const fullPayload = {
    ...base,
    business_name: fields?.businessName ?? null,
    industry: fields?.industry ?? null,
  };

  let { data, error } = await supabase
    .from("users")
    .upsert(fullPayload, { onConflict: "id" })
    .select("*")
    .single();

  if (error && /column|does not exist/i.test(error.message)) {
    ({ data, error } = await supabase
      .from("users")
      .upsert(base, { onConflict: "id" })
      .select("*")
      .single());
  }

  if (error) {
    console.warn(
      "[Blastly] public.users upsert failed (run supabase/migrations/00000000000002_users_insert_policy.sql):",
      error.message
    );
    return profileFromAuthUser(authUser);
  }
  return mapProfile(authUser, data as UserProfileRow);
}

export async function fetchUserProfile(
  authUser: SupabaseAuthUser,
  client?: SupabaseClient
): Promise<AppUser> {
  const supabase = resolveClient(client);
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (error) {
    console.warn("[Blastly] public.users select failed, using auth metadata:", error.message);
    return profileFromAuthUser(authUser);
  }

  if (data) {
    return mapProfile(authUser, data as UserProfileRow);
  }

  return upsertUserProfile(authUser, undefined, supabase);
}

export async function completeWelcome(userId: string, client?: SupabaseClient): Promise<void> {
  const supabase = resolveClient(client);
  const { error } = await supabase
    .from("users")
    .update({ welcome_completed: true, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) {
    console.warn("[Blastly] completeWelcome failed:", error.message);
  }
}

export async function updateUserProfileFields(
  userId: string,
  fields: Partial<Pick<UserProfileRow, "display_name" | "business_name" | "industry">>,
  client?: SupabaseClient
): Promise<void> {
  const supabase = resolveClient(client);
  const { error } = await supabase
    .from("users")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}
