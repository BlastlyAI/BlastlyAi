import { handleAuditRun } from "../../server/routes/auditApiHandlers";
import type { RunAuditInput } from "../../server/audit/types";
import { readAuthorizationHeader, resolveAuditAuth } from "../../server/lib/auditAuthRequest";

export const config = { maxDuration: 60 };

export default async function handler(
  req: {
    method?: string;
    body?: RunAuditInput;
    headers?: Record<string, string | string[] | undefined>;
  },
  res: { status: (n: number) => { json: (b: unknown) => void } }
) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }
  try {
    const auth = await resolveAuditAuth(readAuthorizationHeader(req.headers ?? {}));
    const result = await handleAuditRun(req.body ?? ({} as RunAuditInput), auth);
    res.status(200).json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Audit failed";
    console.error("[api/audit/run]", message);
    res.status(500).json({ success: false, error: message });
  }
}
