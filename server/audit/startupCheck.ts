import { getSupabaseAuditStatus, getSupabaseForAudit } from "../lib/supabaseAuditClient";
import { isAuditSchemaError } from "../audit/schemaErrors";

let checked = false;

/** Log once at startup if audit_reports table is missing in Supabase. */
export async function warnIfAuditTableMissing(): Promise<void> {
  if (checked) return;
  checked = true;

  const status = getSupabaseAuditStatus();
  if (!status.configured) {
    console.warn(
      "[audit] Supabase not configured — audit reports will not persist. " +
        "Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env"
    );
    return;
  }

  try {
    const supabase = getSupabaseForAudit();
    const { error } = await supabase.from("audit_reports").select("id").limit(1);
    if (error && isAuditSchemaError(error.message)) {
      console.error(
        "\n[audit] ⚠️  TABLE MISSING: public.audit_reports does not exist in Supabase.\n" +
          "    Fix: Supabase Dashboard → SQL Editor → paste and run:\n" +
          "    supabase/migrations/SETUP_AUDIT_STANDALONE.sql\n" +
          `    Project: ${status.url}\n`
      );
    }
  } catch (e) {
    console.warn("[audit] Could not verify audit_reports table:", e);
  }
}
