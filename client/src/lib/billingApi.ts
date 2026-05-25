import { apiUrl } from "@/lib/apiOrigin";
import { supabaseGetSession } from "@/lib/supabaseAuth";
import {
  loadAssistantConfigDraft,
  saveAssistantConfigDraft,
} from "@/lib/assistantConfigSession";

export type UserBilling = {
  userId: string;
  email: string | null;
  businessName: string | null;
  planTier: "free" | "pro" | "everything";
  subscriptionStatus: "none" | "active" | "trialing" | "past_due" | "cancelled";
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  trialEndsAt: string | null;
  upgradedAt: string | null;
  assistantName: string | null;
  assistantTone: string | null;
  assistantPersonality: string | null;
  isPaid: boolean;
};

export type AssistantSetupInput = {
  assistantName: string;
  assistantTone: string;
  assistantPersonality: string;
};

const PLAN_CACHE_KEY = "blastly_plan_cache";

function mergeAssistantDraft(billing: UserBilling): UserBilling {
  const draft = loadAssistantConfigDraft();
  if (!draft) return billing;
  return {
    ...billing,
    assistantName: billing.assistantName ?? draft.assistantName,
    assistantTone: billing.assistantTone ?? draft.assistantTone,
    assistantPersonality: billing.assistantPersonality ?? draft.assistantPersonality,
  };
}

function isBillingSchemaErrorMessage(msg: string): boolean {
  return /assistant_name|plan_tier|SETUP_BILLING|PGRST204|schema cache/i.test(msg);
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await supabaseGetSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return headers;
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "error" in data && data.error
        ? String(data.error)
        : res.statusText
    );
  }
  return data;
}

export function cachePlan(billing: UserBilling): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLAN_CACHE_KEY, JSON.stringify({ billing, at: Date.now() }));
}

export function loadCachedPlan(): UserBilling | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PLAN_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { billing: UserBilling };
    return parsed.billing ?? null;
  } catch {
    return null;
  }
}

export function clearPlanCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PLAN_CACHE_KEY);
}

export async function getBillingPlanApi(): Promise<UserBilling> {
  try {
    const res = await fetch(apiUrl("/api/billing/plan"), { headers: await authHeaders() });
    const data = mergeAssistantDraft(await parseJson<UserBilling>(res));
    cachePlan(data);
    return data;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isBillingSchemaErrorMessage(msg)) {
      return mergeAssistantDraft({
        userId: "",
        email: null,
        businessName: null,
        planTier: "free",
        subscriptionStatus: "none",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        trialEndsAt: null,
        upgradedAt: null,
        assistantName: null,
        assistantTone: null,
        assistantPersonality: null,
        isPaid: false,
      });
    }
    throw e;
  }
}

export async function saveAssistantSetupApi(input: AssistantSetupInput): Promise<UserBilling> {
  saveAssistantConfigDraft(input);
  try {
    const res = await fetch(apiUrl("/api/billing/assistant"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(input),
    });
    const data = await parseJson<UserBilling>(res);
    cachePlan(mergeAssistantDraft(data));
    return data;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isBillingSchemaErrorMessage(msg)) {
      console.warn("[billing] Supabase columns missing — assistant saved locally until migration runs.");
      const local = mergeAssistantDraft({
        userId: "",
        email: null,
        businessName: null,
        planTier: "free",
        subscriptionStatus: "none",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        trialEndsAt: null,
        upgradedAt: null,
        assistantName: input.assistantName,
        assistantTone: input.assistantTone,
        assistantPersonality: input.assistantPersonality,
        isPaid: false,
      });
      cachePlan(local);
      return local;
    }
    throw e;
  }
}

export async function createUpgradeCheckoutApi(): Promise<{ url: string; sessionId: string }> {
  const res = await fetch(apiUrl("/api/billing/checkout"), {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ origin: window.location.origin }),
  });
  return parseJson(res);
}

export async function confirmBillingSessionApi(sessionId: string): Promise<{
  confirmed: boolean;
  billing: UserBilling | null;
}> {
  const res = await fetch(
    apiUrl(`/api/billing/confirm?session_id=${encodeURIComponent(sessionId)}`),
    { headers: await authHeaders() }
  );
  const data = await parseJson<{ confirmed: boolean; billing: UserBilling | null }>(res);
  if (data.billing) cachePlan(data.billing);
  return data;
}

export function isPaidBilling(billing: Pick<UserBilling, "planTier" | "subscriptionStatus" | "isPaid"> | null): boolean {
  if (!billing) return false;
  if (billing.isPaid) return true;
  const paidTier = billing.planTier === "pro" || billing.planTier === "everything";
  return paidTier && (billing.subscriptionStatus === "active" || billing.subscriptionStatus === "trialing");
}
