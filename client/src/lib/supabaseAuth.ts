/**
 * Supabase Auth — sole authentication layer for the Vercel SPA.
 */
import type { AuthError, AuthResponse, Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./supabase";

export async function supabaseSignUp(
  email: string,
  password: string,
  options?: { data?: Record<string, unknown> }
): Promise<AuthResponse> {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signUp({
    email,
    password,
    options: { data: options?.data },
  });
}

export async function supabaseSignIn(
  email: string,
  password: string
): Promise<AuthResponse> {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function supabaseSignOut(): Promise<{ error: AuthError | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function supabaseResetPasswordForEmail(
  email: string,
  redirectTo: string
): Promise<{ error: AuthError | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return { error };
}

export async function supabaseUpdatePassword(password: string): Promise<{ error: AuthError | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.updateUser({ password });
  return { error };
}

export async function supabaseGetSession(): Promise<Session | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function supabaseGetUser(): Promise<User | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export function supabaseOnAuthStateChange(
  callback: (event: string, session: Session | null) => void
): { unsubscribe: () => void } {
  const supabase = getSupabaseBrowserClient();
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return { unsubscribe: () => data.subscription.unsubscribe() };
}
