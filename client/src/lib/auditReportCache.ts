import type { AuditReportRow } from "./auditApi";

const CACHE_PREFIX = "blastly_audit_report_";

export function saveAuditReportCache(report: AuditReportRow): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${CACHE_PREFIX}${report.shareToken}`, JSON.stringify(report));
}

export function loadAuditReportCache(shareToken: string): AuditReportRow | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(`${CACHE_PREFIX}${shareToken}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuditReportRow;
  } catch {
    return null;
  }
}
