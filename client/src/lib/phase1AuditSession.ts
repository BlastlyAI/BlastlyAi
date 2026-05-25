const PHASE1_AUDIT_URL_KEY = "blastly_phase1_audit_url";

export function savePhase1AuditUrl(websiteUrl: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PHASE1_AUDIT_URL_KEY, websiteUrl);
}

export function loadPhase1AuditUrl(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(PHASE1_AUDIT_URL_KEY);
}

export function clearPhase1AuditUrl(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PHASE1_AUDIT_URL_KEY);
}
