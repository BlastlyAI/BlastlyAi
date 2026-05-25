import { handleAuditAttach } from "../../server/routes/auditApiHandlers";
import { readAuthorizationHeader, resolveAuditAuth } from "../../server/lib/auditAuthRequest";

export default async function handler(
  req: {
    method?: string;
    body?: { shareToken?: string; workspaceId?: string | null };
    headers?: Record<string, string | string[] | undefined>;
  },
  res: { status: (n: number) => { json: (b: unknown) => void } }
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const auth = await resolveAuditAuth(readAuthorizationHeader(req.headers ?? {}));
    if (!auth.userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const result = await handleAuditAttach(req.body ?? {}, auth);
    res.status(200).json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Attach failed";
    const status = message === "Report not found" ? 404 : message.includes("Authentication") ? 401 : 500;
    res.status(status).json({ error: message });
  }
}
