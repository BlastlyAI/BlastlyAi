import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseEnvConfig,
  isSupabaseConfigured,
  logSupabaseEnvDiagnostics,
  type SupabaseEnvConfig,
} from "./supabaseEnv";

let browserClient: SupabaseClient | null = null;
let clientConfig: SupabaseEnvConfig | null = null;

export { isSupabaseConfigured, logSupabaseEnvDiagnostics };
export type { SupabaseEnvConfig };

/**
 * Returns the browser client only when env vars were present at build time.
 * Never throws — returns null if misconfigured.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  const config = getSupabaseEnvConfig();
  if (!config) return null;

  if (browserClient && clientConfig?.url === config.url && clientConfig?.anonKey === config.anonKey) {
    return browserClient;
  }

  clientConfig = config;
  browserClient = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}

/** Use only after confirming configuration (e.g. inside SupabaseAuthProviderInner). */
export function requireSupabaseBrowserClient(): SupabaseClient {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error(
      "Supabase client is not available. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel, then redeploy."
    );
  }
  return client;
}

export function resetSupabaseBrowserClientForTests(): void {
  browserClient = null;
  clientConfig = null;
}
