/**
 * Supabase Auth helpers (hybrid layer).
 * Existing Blastly login stays on customAuth + MySQL; use these when you opt into Supabase Auth.
 */
import type { AuthError, AuthResponse, Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClientOrNull } from "./supabase";

function requireClient() {
  const c = getSupabaseBrowserClientOrNull();
  if (!c) {
    throw new Error("Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).");
  }
  return c;
}

export async function supabaseSignUp(
  email: string,
  password: string,
  options?: { data?: Record<string, unknown> }
): Promise<AuthResponse> {
  const supabase = requireClient();
  const res = await supabase.auth.signUp({
    email,
    password,
    options: { data: options?.data },
  });
  return res;
}

export async function supabaseSignIn(
  email: string,
  password: string
): Promise<AuthResponse> {
  const supabase = requireClient();
  const res = await supabase.auth.signInWithPassword({ email, password });
  return res;
}

export async function supabaseSignOut(): Promise<{ error: AuthError | null }> {
  const supabase = getSupabaseBrowserClientOrNull();
  if (!supabase) return { error: null };
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function supabaseGetSession(): Promise<Session | null> {
  const supabase = getSupabaseBrowserClientOrNull();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function supabaseGetUser(): Promise<User | null> {
  const supabase = getSupabaseBrowserClientOrNull();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export function supabaseOnAuthStateChange(
  callback: (event: string, session: Session | null) => void
): { unsubscribe: () => void } | null {
  const supabase = getSupabaseBrowserClientOrNull();
  if (!supabase) return null;
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return { unsubscribe: () => data.subscription.unsubscribe() };
}
