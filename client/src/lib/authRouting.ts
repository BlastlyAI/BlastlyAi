import { loadDashboardProfile } from "@/lib/dashboardProfile";
import { loadOnboardingDraft } from "@/lib/onboardingSession";
import { isPaidBilling, loadCachedPlan } from "@/lib/billingApi";

/** Safe return path from ?return= query (same-origin relative paths only). */
export function getAuthReturnPath(): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("return");
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

/** Where to send the user after login, signup, or welcome. */
export function getPostAuthRoute(options: {
  welcomeCompleted: boolean;
  returnPath?: string | null;
  isPremiumSignup?: boolean;
}): string {
  const { welcomeCompleted, returnPath, isPremiumSignup } = options;

  if (!welcomeCompleted) {
    if (isPremiumSignup) return "/onboarding/managed?plan=everything";
    return "/welcome";
  }

  const safeReturn = returnPath ?? getAuthReturnPath();
  if (safeReturn) return safeReturn;

  const cachedPlan = loadCachedPlan();
  if (cachedPlan && isPaidBilling(cachedPlan)) {
    return "/command-centre";
  }

  if (loadDashboardProfile()?.onboardingComplete || loadOnboardingDraft()) {
    return "/dashboard/home";
  }

  return "/dashboard/home";
}
