import { handleWorkspaceUpdateBrandProfile } from "../../server/routes/workspaceApiHandlers";
import { readAuthorizationHeader, resolveAuditAuth } from "../../server/lib/auditAuthRequest";

export default async function handler(
  req: {
    method?: string;
    query?: { workspaceId?: string };
    body?: Record<string, unknown>;
    headers?: Record<string, string | string[] | undefined>;
  },
  res: { status: (n: number) => { json: (b: unknown) => void } }
) {
  if (req.method !== "PATCH") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const auth = await resolveAuditAuth(readAuthorizationHeader(req.headers ?? {}));
    if (!auth.userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const workspaceId = req.query?.workspaceId ?? "";
    const workspace = await handleWorkspaceUpdateBrandProfile(
      auth,
      workspaceId,
      (req.body ?? {}) as Parameters<typeof handleWorkspaceUpdateBrandProfile>[2]
    );
    res.status(200).json({ workspace });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    res.status(/not found/i.test(message) ? 404 : 500).json({ error: message });
  }
}
