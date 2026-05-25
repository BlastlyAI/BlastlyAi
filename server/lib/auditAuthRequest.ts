import { createClient } from "@supabase/supabase-js";

function resolveSupabaseUrl(): string {
  return (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").trim();
}

function resolveAnonKey(): string {
  return (
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    ""
  ).trim();
}

export type AuditAuthContext = {
  userId: string | null;
};

/** Verify Supabase JWT from Authorization: Bearer header. */
export async function resolveAuditAuth(
  authorizationHeader?: string | string[]
): Promise<AuditAuthContext> {
  const raw = Array.isArray(authorizationHeader)
    ? authorizationHeader[0]
    : authorizationHeader;
  if (!raw?.startsWith("Bearer ")) {
    return { userId: null };
  }

  const token = raw.slice("Bearer ".length).trim();
  if (!token) return { userId: null };

  const url = resolveSupabaseUrl();
  const anonKey = resolveAnonKey();
  if (!url || !anonKey) {
    console.warn("[audit/auth] Cannot verify JWT — Supabase URL/anon key missing");
    return { userId: null };
  }

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user?.id) {
    return { userId: null };
  }

  return { userId: data.user.id };
}

export function readAuthorizationHeader(
  headers: Record<string, string | string[] | undefined>
): string | undefined {
  const value = headers.authorization ?? headers.Authorization;
  if (Array.isArray(value)) return value[0];
  return value;
}
