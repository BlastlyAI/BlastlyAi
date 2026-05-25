import { getSupabaseForAudit } from "./supabaseAuditClient";

export type SupabasePublicSchema = {
  /** public.workspaces exists (migration 00000000000001 applied). */
  hasWorkspaces: boolean;
  /** public.audit_reports exists. */
  hasAuditReports: boolean;
  /** No organizations/teams tables in current Blastly Supabase migrations. */
  hasOrganizations: false;
  hasTeams: false;
};

let cached: SupabasePublicSchema | null = null;
let cacheAt = 0;
const CACHE_MS = 60_000;

function isMissingTableError(message: string): boolean {
  return /PGRST205|schema cache|does not exist|relation.*does not exist/i.test(message);
}

async function tableExists(table: string): Promise<boolean> {
  const supabase = getSupabaseForAudit();
  const { error } = await supabase.from(table).select("id").limit(1);
  if (!error) return true;
  if (isMissingTableError(error.message)) return false;
  // RLS or empty table still means table exists
  if (/permission denied|42501/i.test(error.message)) return true;
  console.warn(`[schema/probe] ${table}:`, error.message);
  return false;
}

/** Detect which public tables exist in the connected Supabase project. */
export async function probeSupabasePublicSchema(
  forceRefresh = false
): Promise<SupabasePublicSchema> {
  const now = Date.now();
  if (!forceRefresh && cached && now - cacheAt < CACHE_MS) {
    return cached;
  }

  const [hasWorkspaces, hasAuditReports] = await Promise.all([
    tableExists("workspaces"),
    tableExists("audit_reports"),
  ]);

  cached = {
    hasWorkspaces,
    hasAuditReports,
    hasOrganizations: false,
    hasTeams: false,
  };
  cacheAt = now;

  console.info("[schema/probe] Supabase public schema:", cached);
  return cached;
}

export function clearSupabaseSchemaCache(): void {
  cached = null;
  cacheAt = 0;
}
