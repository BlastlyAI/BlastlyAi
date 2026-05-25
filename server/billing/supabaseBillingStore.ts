import { getSupabaseForAudit } from "../lib/supabaseAuditClient";
import { normalisePlanTier, isPaidPlanTier, type PlanTier } from "../stripe/products";
import type { AssistantSetupInput, SubscriptionStatus, UserBillingRecord } from "./types";

function isBillingSchemaError(message: string): boolean {
  return /assistant_name|plan_tier|subscription_status|stripe_|upgraded_at|PGRST204|schema cache|column.*does not exist/i.test(
    message
  );
}

function billingSchemaMissingMessage(): string {
  return (
    "Supabase billing columns missing on public.users. " +
    "Open Supabase Dashboard → SQL Editor → run supabase/migrations/SETUP_BILLING_STANDALONE.sql " +
    "(copy entire file, click Run), then retry."
  );
}

function mapRow(row: Record<string, unknown>): UserBillingRecord {
  return {
    userId: String(row.id),
    email: (row.email as string) ?? null,
    businessName: (row.business_name as string) ?? null,
    planTier: normalisePlanTier(row.plan_tier as string),
    subscriptionStatus: (row.subscription_status as SubscriptionStatus) ?? "none",
    stripeCustomerId: (row.stripe_customer_id as string) ?? null,
    stripeSubscriptionId: (row.stripe_subscription_id as string) ?? null,
    trialEndsAt: row.trial_ends_at ? String(row.trial_ends_at) : null,
    upgradedAt: row.upgraded_at ? String(row.upgraded_at) : null,
    assistantName: (row.assistant_name as string) ?? null,
    assistantTone: (row.assistant_tone as string) ?? null,
    assistantPersonality: (row.assistant_personality as string) ?? null,
  };
}

export function isPaidPlan(record: Pick<UserBillingRecord, "planTier" | "subscriptionStatus">): boolean {
  if (!isPaidPlanTier(record.planTier)) return false;
  return record.subscriptionStatus === "active" || record.subscriptionStatus === "trialing";
}

export async function getUserBilling(userId: string): Promise<UserBillingRecord | null> {
  const supabase = getSupabaseForAudit();
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, email, business_name, plan_tier, subscription_status, stripe_customer_id, stripe_subscription_id, trial_ends_at, upgraded_at, assistant_name, assistant_tone, assistant_personality"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isBillingSchemaError(error.message)) {
      return {
        userId,
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
      };
    }
    throw new Error(error.message);
  }
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function saveAssistantSetup(
  userId: string,
  input: AssistantSetupInput
): Promise<UserBillingRecord> {
  const supabase = getSupabaseForAudit();
  const { data, error } = await supabase
    .from("users")
    .update({
      assistant_name: input.assistantName.trim(),
      assistant_tone: input.assistantTone.trim(),
      assistant_personality: input.assistantPersonality.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select(
      "id, email, business_name, plan_tier, subscription_status, stripe_customer_id, stripe_subscription_id, trial_ends_at, upgraded_at, assistant_name, assistant_tone, assistant_personality"
    )
    .single();

  if (error) {
    if (isBillingSchemaError(error.message)) {
      throw new Error(billingSchemaMissingMessage());
    }
    throw new Error(error.message);
  }
  return mapRow(data as Record<string, unknown>);
}

export async function activateUserSubscription(input: {
  userId: string;
  planTier: PlanTier;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  trialEndsAt?: Date | null;
}): Promise<UserBillingRecord> {
  const supabase = getSupabaseForAudit();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("users")
    .update({
      plan_tier: input.planTier,
      subscription_status: input.subscriptionStatus,
      stripe_customer_id: input.stripeCustomerId,
      stripe_subscription_id: input.stripeSubscriptionId,
      trial_ends_at: input.trialEndsAt?.toISOString() ?? null,
      upgraded_at: now,
      updated_at: now,
    })
    .eq("id", input.userId)
    .select(
      "id, email, business_name, plan_tier, subscription_status, stripe_customer_id, stripe_subscription_id, trial_ends_at, upgraded_at, assistant_name, assistant_tone, assistant_personality"
    )
    .single();

  if (error) {
    if (isBillingSchemaError(error.message)) {
      throw new Error(billingSchemaMissingMessage());
    }
    throw new Error(error.message);
  }
  return mapRow(data as Record<string, unknown>);
}

export async function updateUserSubscriptionByStripeId(
  stripeSubscriptionId: string,
  patch: {
    subscriptionStatus?: SubscriptionStatus;
    planTier?: PlanTier;
  }
): Promise<void> {
  const supabase = getSupabaseForAudit();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.subscriptionStatus) update.subscription_status = patch.subscriptionStatus;
  if (patch.planTier) update.plan_tier = patch.planTier;

  const { error } = await supabase
    .from("users")
    .update(update)
    .eq("stripe_subscription_id", stripeSubscriptionId);

  if (error) throw new Error(error.message);
}

export async function insertUpgradeNotifications(userId: string, assistantName?: string | null): Promise<void> {
  const supabase = getSupabaseForAudit();
  const name = assistantName?.trim() || "Aria";
  const rows = [
    { user_id: userId, title: "Welcome to Blastly Pro", body: "Your Pro plan is active. Command Centre is unlocked." },
    { user_id: userId, title: "AI Assistant active", body: `${name} is now handling enquiries and drafting content for you.` },
    { user_id: userId, title: "Command Centre unlocked", body: "Open Command Centre for your morning briefing, alerts, and automations." },
  ];
  const { error } = await supabase.from("notifications").insert(rows);
  if (error) {
    console.warn("[billing] upgrade notifications insert failed:", error.message);
  }
}
