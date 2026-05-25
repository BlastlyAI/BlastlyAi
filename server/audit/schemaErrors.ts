/** PostgREST errors when `public.audit_reports` migration has not been applied. */
export function isAuditSchemaError(message: string): boolean {
  return /audit_reports|schema cache|PGRST205/i.test(message);
}
