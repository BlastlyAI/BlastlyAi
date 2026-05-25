/** PostgREST errors when DB schema is behind app migrations (run supabase/migrations/*.sql). */
export function isSupabaseSchemaMismatch(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  const msg = error.message ?? "";
  return (
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    /could not find the .* column/i.test(msg) ||
    /could not find the table/i.test(msg) ||
    /column.*does not exist/i.test(msg)
  );
}

export type SupabaseSchemaMode = "full" | "minimal" | "unknown";

const STORAGE_KEY = "blastly_supabase_schema";

export function getSupabaseSchemaMode(): SupabaseSchemaMode {
  if (typeof window === "undefined") return "unknown";
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored === "full" || stored === "minimal") return stored;
  return "unknown";
}

export function setSupabaseSchemaMode(mode: "full" | "minimal"): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY, mode);
  }
}

export function markSupabaseSchemaMinimal(error: { code?: string; message?: string } | null): void {
  if (isSupabaseSchemaMismatch(error)) {
    setSupabaseSchemaMode("minimal");
  }
}

export function isSupabaseSchemaMinimal(): boolean {
  return getSupabaseSchemaMode() === "minimal";
}
