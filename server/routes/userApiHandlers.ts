import type { AuditAuthContext } from "../lib/auditAuthRequest";
import { ensurePublicUser } from "../users/publicUserStore";
import { getUserBilling } from "../billing/supabaseBillingStore";
import { getOrCreateDefaultWorkspace } from "../workspaces/supabaseWorkspaceStore";

export async function handleUserSync(auth: AuditAuthContext, body: { email?: string; displayName?: string; businessName?: string; website?: string }) {
  if (!auth.userId) throw new Error("Authentication required");

  await ensurePublicUser({
    id: auth.userId,
    email: body.email ?? null,
    displayName: body.displayName ?? null,
  });

  let workspace: Awaited<ReturnType<typeof getOrCreateDefaultWorkspace>> | null = null;
  try {
    workspace = await getOrCreateDefaultWorkspace(auth.userId, {
      businessName: body.businessName ?? null,
      website: body.website ?? null,
    });
  } catch (e) {
    console.warn("[users/sync] workspace ensure skipped:", e instanceof Error ? e.message : e);
  }

  const billing = await getUserBilling(auth.userId);
  return {
    synced: true,
    userId: auth.userId,
    billing,
    workspaceId: workspace?.id ?? null,
  };
}
