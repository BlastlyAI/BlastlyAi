import type { RunAuditInput, RunAuditResponse } from "./types";
import type { AuditPersistPayload } from "./persist";
import { runWebsiteAudit } from "./runWebsiteAudit";

export function isMakeAuditConfigured(): boolean {
  return Boolean(process.env.MAKE_WEBHOOK_URL?.trim());
}

export function shouldUseMakeAudit(): boolean {
  return false;
}

/** Make.com orchestration hook — intelligence runs in backend extractor. */
export async function runMakeAudit(
  input: RunAuditInput
): Promise<RunAuditResponse & { persistPayload: AuditPersistPayload }> {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL?.trim();
  if (webhookUrl) {
    void fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "blastly",
        website: input.website ?? input.businessName,
        businessName: input.businessName,
      }),
    }).catch((err) => console.warn("[audit] Make.com notify failed:", err));
  }
  return runWebsiteAudit(input);
}
