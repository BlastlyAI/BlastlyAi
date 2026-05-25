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

/** Extract a message from Supabase/PostgREST or other thrown values. */
export function getSupabaseErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

/** User-friendly message for Supabase Auth API errors (e.g. 429 rate limit). */
export function formatSupabaseAuthError(error: {
  message?: string;
  status?: number;
  code?: string;
}): string {
  const msg = error.message ?? "Something went wrong";
  if (
    error.code === "over_email_send_rate_limit" ||
    /email rate limit|over_email_send/i.test(msg)
  ) {
    return (
      "Supabase email limit reached (too many signup/reset emails). " +
      "Wait about 1 hour, or in Supabase turn off Confirm email for testing, then try again."
    );
  }
  if (
    error.status === 429 ||
    /after \d+ seconds/i.test(msg) ||
    /rate limit|too many requests/i.test(msg)
  ) {
    const wait = msg.match(/after (\d+) seconds/i)?.[1];
    return wait
      ? `Too many attempts. Please wait ${wait} seconds, then try again.`
      : "Too many signup attempts. Please wait a minute and try again.";
  }
  if (/already registered|already been registered|user already exists/i.test(msg)) {
    return "This email is already registered. Try logging in instead.";
  }
  if (error.code === "invalid_credentials" || /invalid login credentials/i.test(msg)) {
    return "Wrong email or password. Use Forgot password, or sign up with a new email.";
  }
  return msg;
}
