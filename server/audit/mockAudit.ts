import type { RunAuditInput, RunAuditResponse } from "./types";
import type { AuditPersistPayload } from "./persist";
import { runWebsiteAudit } from "./runWebsiteAudit";

/** @deprecated Use runWebsiteAudit — kept for import compatibility. */
export function isServerAuditMock(): boolean {
  return false;
}

/** Real website audit engine (extraction + scoring). */
export async function runMockAuditEngine(
  input: RunAuditInput
): Promise<RunAuditResponse & { persistPayload: AuditPersistPayload }> {
  return runWebsiteAudit(input);
}
