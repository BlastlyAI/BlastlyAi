import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/** True when both Vite env vars are set (safe to call getSupabaseBrowserClient). */
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url?.trim() && key?.trim());
}

/**
 * Browser Supabase client (publishable key only).
 * Session is persisted in localStorage by @supabase/supabase-js.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (never commit secrets)."
    );
  }
  if (!browserClient) {
    browserClient = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
  }
  return browserClient;
}

/** Returns client when configured; otherwise null (no throw — for optional hybrid UI). */
export function getSupabaseBrowserClientOrNull(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  return getSupabaseBrowserClient();
}
