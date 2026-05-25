import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function resolveSupabaseUrl(): string {
  return (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").trim();
}

export type SupabaseAuditStatus = {
  configured: boolean;
  url: string;
  keyType: "service_role" | "anon" | "none";
};

export function getSupabaseAuditStatus(): SupabaseAuditStatus {
  const url = resolveSupabaseUrl();
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return { configured: Boolean(url), url, keyType: "service_role" };
  }
  const anon =
    process.env.SUPABASE_ANON_KEY?.trim() || process.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (url && anon) {
    return { configured: true, url, keyType: "anon" };
  }
  return { configured: false, url, keyType: "none" };
}

/** Prefer service role; fall back to anon key (needs migration 00000000000004_audit_anon_insert.sql). */
export function getSupabaseForAudit(): SupabaseClient {
  const url = resolveSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (url && serviceKey) {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  const anonKey = (
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    ""
  ).trim();

  if (url && anonKey) {
    console.warn(
      "[Blastly] Using anon key for audit saves. Set SUPABASE_SERVICE_ROLE_KEY for production."
    );
    return createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  throw new Error(
    "Supabase not configured for audits. Set SUPABASE_URL (or VITE_SUPABASE_URL) and " +
      "SUPABASE_SERVICE_ROLE_KEY (recommended) or SUPABASE_ANON_KEY, then run audit migrations."
  );
}

export function isSupabaseAuditConfigured(): boolean {
  return getSupabaseAuditStatus().configured;
}
