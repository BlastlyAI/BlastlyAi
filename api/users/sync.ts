import { handleUserSync } from "../../server/routes/userApiHandlers";
import { readAuthorizationHeader, resolveAuditAuth } from "../../server/lib/auditAuthRequest";

export default async function handler(
  req: {
    method?: string;
    body?: { email?: string; displayName?: string; businessName?: string; website?: string };
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
    const result = await handleUserSync(auth, req.body ?? {});
    res.status(200).json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    res.status(500).json({ error: message });
  }
}
