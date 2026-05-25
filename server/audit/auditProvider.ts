import { runWebsiteAudit } from "./runWebsiteAudit";
import type { RunAuditInput, RunAuditResponse } from "./types";
import type { AuditPersistPayload } from "./persist";

/** Unified audit pipeline: real extraction → scoring → AI interpretation. */
export async function runAuditPipeline(
  input: RunAuditInput
): Promise<RunAuditResponse & { persistPayload: AuditPersistPayload }> {
  return runWebsiteAudit(input);
}
