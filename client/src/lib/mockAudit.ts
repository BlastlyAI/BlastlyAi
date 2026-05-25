import type { AuditReportRow, RunAuditInput, RunAuditResult } from "./auditApi";
import { saveAuditReportCache, loadAuditReportCache } from "./auditReportCache";

/** Always use real /api/audit/run — no client-side fake generation. */
export function isAuditMockMode(): boolean {
  return false;
}

export async function runMockAudit(_input: RunAuditInput): Promise<RunAuditResult> {
  throw new Error("Client-side mock audits are disabled. Use runAuditApi instead.");
}

export function getMockAuditReport(shareToken: string): AuditReportRow {
  const cached = loadAuditReportCache(shareToken);
  if (cached) return cached;
  throw new Error("Report not found");
}

export function saveMockAuditReport(report: AuditReportRow): void {
  saveAuditReportCache(report);
}
