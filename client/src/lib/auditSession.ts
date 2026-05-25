const LAST_AUDIT_TOKEN_KEY = "blastly_last_audit_token";

/** Remember the latest audit so onboarding can autofill even without ?audit= in the URL. */
export function saveLastAuditToken(shareToken: string): void {
  if (!shareToken || typeof window === "undefined") return;
  sessionStorage.setItem(LAST_AUDIT_TOKEN_KEY, shareToken);
}

export function getLastAuditToken(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(LAST_AUDIT_TOKEN_KEY) ?? "";
}

/** Prefer explicit ?audit= token; fall back to last completed audit in this session. */
export function resolveAuditToken(search?: string): string {
  const params = new URLSearchParams(search ?? (typeof window !== "undefined" ? window.location.search : ""));
  return params.get("audit")?.trim() || getLastAuditToken();
}

/** Append audit token to onboarding/checkout URLs when we have one. */
export function withAuditParam(path: string, shareToken?: string): string {
  const token = shareToken || getLastAuditToken();
  if (!token) return path;
  const sep = path.includes("?") ? "&" : "?";
  if (path.includes("audit=")) return path;
  return `${path}${sep}audit=${encodeURIComponent(token)}`;
}
