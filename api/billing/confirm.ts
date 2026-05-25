import { handleBillingConfirmSession } from "../../server/routes/billingApiHandlers";
import { readAuthorizationHeader, resolveAuditAuth } from "../../server/lib/auditAuthRequest";

export default async function handler(
  req: {
    method?: string;
    query?: { session_id?: string };
    headers?: Record<string, string | string[] | undefined>;
  },
  res: { status: (n: number) => { json: (b: unknown) => void } }
) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const auth = await resolveAuditAuth(readAuthorizationHeader(req.headers ?? {}));
    if (!auth.userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const sessionId = req.query?.session_id ?? "";
    const result = await handleBillingConfirmSession(sessionId, auth);
    res.status(200).json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Confirm failed";
    res.status(400).json({ error: message });
  }
}
