/** Audit LLM + mock flags (server-side). */
export function isAuditMockMode(): boolean {
  const v = process.env.AUDIT_MOCK ?? process.env.VITE_AUDIT_MOCK ?? "";
  return v === "true" || v === "1";
}

export function isAuditLlmEnabled(): boolean {
  if (isAuditMockMode()) return false;
  if (process.env.SKIP_AUDIT_LLM === "true") return false;
  return Boolean(process.env.BUILT_IN_FORGE_API_KEY?.trim());
}

export const AUDIT_LLM_TIMEOUT_MS = Number(process.env.AUDIT_LLM_TIMEOUT_MS ?? 25_000);
export const AUDIT_LLM_MAX_TOKENS = Number(process.env.AUDIT_LLM_MAX_TOKENS ?? 2048);
