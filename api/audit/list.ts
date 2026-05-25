import { handleAuditList } from "../../server/routes/auditApiHandlers";
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
  const workspaceId = req.query?.workspaceId;
  try {
    const auth = await resolveAuditAuth(readAuthorizationHeader(req.headers ?? {}));
    if (!auth.userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const result = await handleAuditList(workspaceId, auth);
    res.status(200).json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "List failed";
    const status = message.includes("Authentication") ? 401 : 500;
    res.status(status).json({ error: message });
  }
}
