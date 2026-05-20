import { getSupabaseBrowserClient } from "./supabase";
import type { AppUser } from "@/types/appUser";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

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

/** Upsert public.users after signUp (trigger may also insert; this fills optional fields). */
export async function upsertUserProfile(
  authUser: SupabaseAuthUser,
  fields?: {
    displayName?: string;
    businessName?: string;
    industry?: string;
  }
): Promise<AppUser> {
  const supabase = getSupabaseBrowserClient();
  const payload = {
    id: authUser.id,
    email: authUser.email,
    display_name: fields?.displayName ?? authUser.user_metadata?.full_name ?? null,
    business_name: fields?.businessName ?? null,
    industry: fields?.industry ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("users")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw error;
  return mapProfile(authUser, data as UserProfileRow);
}

export async function fetchUserProfile(authUser: SupabaseAuthUser): Promise<AppUser> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return upsertUserProfile(authUser);
  }

  return mapProfile(authUser, data as UserProfileRow);
}

export async function completeWelcome(userId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("users")
    .update({ welcome_completed: true, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

export async function updateUserProfileFields(
  userId: string,
  fields: Partial<Pick<UserProfileRow, "display_name" | "business_name" | "industry">>
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("users")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}
