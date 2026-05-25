import { requireSupabaseBrowserClient } from "./supabase";
import {
  isSupabaseSchemaMismatch,
  isSupabaseSchemaMinimal,
  markSupabaseSchemaMinimal,
  setSupabaseSchemaMode,
} from "./supabaseSchema";
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
export function profileFromAuthUser(
  authUser: SupabaseAuthUser,
  fields?: { displayName?: string; businessName?: string; industry?: string }
): AppUser {
  const base = mapProfile(authUser, null);
  if (!fields) return base;
  return {
    ...base,
    name: fields.displayName?.trim() || base.name,
    businessName: fields.businessName ?? base.businessName,
    industry: fields.industry ?? base.industry,
  };
}

const PROFILE_SYNC_TIMEOUT_MS = 4_000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/** Best-effort profile sync; never blocks signup for more than a few seconds. */
export async function syncUserProfileAfterAuth(
  authUser: SupabaseAuthUser,
  fields?: {
    displayName?: string;
    businessName?: string;
    industry?: string;
  },
  client?: SupabaseClient
): Promise<AppUser> {
  const fallback = profileFromAuthUser(authUser, fields);
  if (isSupabaseSchemaMinimal()) return fallback;
  return withTimeout(upsertUserProfile(authUser, fields, client), PROFILE_SYNC_TIMEOUT_MS, fallback);
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
  const fallback = profileFromAuthUser(authUser, fields);
  if (isSupabaseSchemaMinimal()) return fallback;

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

  const minimalPayload = {
    id: authUser.id,
    email: authUser.email,
    updated_at: new Date().toISOString(),
  };

  const now = new Date().toISOString();

  // Try smallest payload first — avoids errors when optional columns are missing.
  const payloads = [
    { id: authUser.id, email: authUser.email, plan_tier: "free", subscription_status: "none", updated_at: now },
    { id: authUser.id, email: authUser.email, updated_at: now },
    minimalPayload,
    base,
    fullPayload,
  ];

  for (const payload of payloads) {
    const { data, error } = await supabase
      .from("users")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();

    if (!error) {
      if (payload === fullPayload) setSupabaseSchemaMode("full");
      return mapProfile(authUser, data as UserProfileRow);
    }
    const msg = error.message ?? "";
    const tableMissing = error.code === "PGRST205" || /could not find the table.*users/i.test(msg);
    if (tableMissing) {
      markSupabaseSchemaMinimal(error);
      break;
    }
    // Column missing — try next smaller payload
    if (/column|PGRST204/i.test(msg)) {
      continue;
    }
    console.warn("[Blastly] public.users upsert failed:", msg);
    break;
  }

  return fallback;
}

export async function fetchUserProfile(
  authUser: SupabaseAuthUser,
  client?: SupabaseClient
): Promise<AppUser> {
  if (isSupabaseSchemaMinimal()) {
    return profileFromAuthUser(authUser);
  }

  const supabase = resolveClient(client);
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (error) {
    if (isSupabaseSchemaMismatch(error)) {
      markSupabaseSchemaMinimal(error);
    }
    console.warn("[Blastly] public.users select failed, using auth metadata:", error.message);
    return profileFromAuthUser(authUser);
  }

  if (data) {
    setSupabaseSchemaMode("full");
    return mapProfile(authUser, data as UserProfileRow);
  }

  return upsertUserProfile(authUser, undefined, supabase);
}

export async function completeWelcome(userId: string, client?: SupabaseClient): Promise<void> {
  if (isSupabaseSchemaMinimal()) return;

  const supabase = resolveClient(client);
  const { error } = await supabase
    .from("users")
    .update({ welcome_completed: true, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) {
    markSupabaseSchemaMinimal(error);
    console.warn("[Blastly] completeWelcome failed:", error.message);
  }
}

export async function updateUserProfileFields(
  userId: string,
  fields: Partial<Pick<UserProfileRow, "display_name" | "business_name" | "industry">>,
  client?: SupabaseClient
): Promise<void> {
  if (isSupabaseSchemaMinimal()) return;

  const supabase = resolveClient(client);
  const { error } = await supabase
    .from("users")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) {
    markSupabaseSchemaMinimal(error);
    throw error;
  }
}
