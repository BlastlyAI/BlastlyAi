import { handleAuditLatest } from "../../server/routes/auditApiHandlers";
import { readAuthorizationHeader, resolveAuditAuth } from "../../server/lib/auditAuthRequest";

export default async function handler(
  req: {
    method?: string;
    query?: { workspaceId?: string };
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
    const workspaceId = req.query?.workspaceId ?? null;
    const result = await handleAuditLatest(workspaceId, auth);
    res.status(200).json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Latest audit failed";
    res.status(500).json({ error: message });
  }
}
