/**
 * Supabase Auth — sole authentication layer for the Vercel SPA.
 */
import type { AuthError, AuthResponse, Session, SupabaseClient, User } from "@supabase/supabase-js";
import { requireSupabaseBrowserClient } from "./supabase";

const NOT_CONFIGURED = "Supabase is not configured for this deployment.";

export async function supabaseSignUp(
  email: string,
  password: string,
  options?: { data?: Record<string, unknown> },
  client?: SupabaseClient
): Promise<AuthResponse> {
  const supabase = client ?? requireSupabaseBrowserClient();
  return supabase.auth.signUp({
    email,
    password,
    options: { data: options?.data },
  });
}

export async function supabaseSignIn(
  email: string,
  password: string,
  client?: SupabaseClient
): Promise<AuthResponse> {
  const supabase = client ?? requireSupabaseBrowserClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function supabaseSignOut(
  client?: SupabaseClient
): Promise<{ error: AuthError | null }> {
  const supabase = client ?? requireSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function supabaseResetPasswordForEmail(
  email: string,
  redirectTo: string,
  client?: SupabaseClient
): Promise<{ error: AuthError | null }> {
  const supabase = client ?? requireSupabaseBrowserClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return { error };
}

export async function supabaseUpdatePassword(
  password: string,
  client?: SupabaseClient
): Promise<{ error: AuthError | null }> {
  const supabase = client ?? requireSupabaseBrowserClient();
  const { error } = await supabase.auth.updateUser({ password });
  return { error };
}

export async function supabaseGetSession(client?: SupabaseClient): Promise<Session | null> {
  const supabase = client ?? requireSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function supabaseGetUser(client?: SupabaseClient): Promise<User | null> {
  const supabase = client ?? requireSupabaseBrowserClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export function supabaseOnAuthStateChange(
  callback: (event: string, session: Session | null) => void,
  client?: SupabaseClient
): { unsubscribe: () => void } {
  const supabase = client ?? requireSupabaseBrowserClient();
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return { unsubscribe: () => data.subscription.unsubscribe() };
}

export { NOT_CONFIGURED };
