import { attachAuditApi } from "@/lib/auditApi";
import { getLastAuditToken } from "@/lib/auditSession";
import { loadDashboardProfile, syncDashboardFromAuditReport } from "@/lib/dashboardProfile";
import { supabaseGetSession } from "@/lib/supabaseAuth";

let attachInFlight: Promise<void> | null = null;

/** Link a guest-session audit to the authenticated account after signup/login. */
export async function attachGuestAuditAfterAuth(
  workspaceId?: string | null
): Promise<void> {
  if (attachInFlight) {
    await attachInFlight;
    return;
  }

  attachInFlight = (async () => {
    const session = await supabaseGetSession();
    if (!session?.access_token) return;

    const shareToken = getLastAuditToken();
    if (!shareToken) return;

    try {
      const report = await attachAuditApi(shareToken, workspaceId ?? null);
      syncDashboardFromAuditReport(report, {
        onboardingComplete: loadDashboardProfile()?.onboardingComplete ?? false,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/already linked|not found/i.test(msg)) {
        console.warn("[audit] attach guest audit failed:", msg);
      }
    }
  })();

  try {
    await attachInFlight;
  } finally {
    attachInFlight = null;
  }
}
