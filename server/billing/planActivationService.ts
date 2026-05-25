import { ensurePublicUser } from "../users/publicUserStore";
import { updateWorkspacePlanForOwner } from "../workspaces/supabaseWorkspaceStore";
import {
  activateUserSubscription,
  insertUpgradeNotifications,
  updateUserSubscriptionByStripeId,
} from "./supabaseBillingStore";
import type { SubscriptionStatus } from "./types";
import { isPaidPlanTier, type PlanTier } from "../stripe/products";

export const PAID_PLAN_TIER: PlanTier = "pro";

export type ActivatePaidPlanInput = {
  userId: string;
  email?: string | null;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  trialEndsAt?: Date | null;
};

/** Full paid activation: user profile + all owned workspaces + welcome notifications. */
export async function activatePaidPlan(input: ActivatePaidPlanInput) {
  await ensurePublicUser({ id: input.userId, email: input.email ?? null });

  const billing = await activateUserSubscription({
    userId: input.userId,
    planTier: PAID_PLAN_TIER,
    subscriptionStatus: input.subscriptionStatus,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    trialEndsAt: input.trialEndsAt ?? null,
  });

  await updateWorkspacePlanForOwner(input.userId, PAID_PLAN_TIER);
  await insertUpgradeNotifications(input.userId, billing.assistantName);

  return billing;
}

export async function syncSubscriptionFromStripe(input: {
  stripeSubscriptionId: string;
  subscriptionStatus: SubscriptionStatus;
  userId?: string | null;
}) {
  const planTier: PlanTier =
    input.subscriptionStatus === "cancelled" ? "free" : PAID_PLAN_TIER;

  await updateUserSubscriptionByStripeId(input.stripeSubscriptionId, {
    subscriptionStatus: input.subscriptionStatus,
    planTier,
  });

  if (input.userId) {
    await updateWorkspacePlanForOwner(input.userId, planTier);
  }
}

export function isPaidActivation(
  record: { planTier: PlanTier; subscriptionStatus: SubscriptionStatus }
): boolean {
  if (!isPaidPlanTier(record.planTier)) return false;
  return record.subscriptionStatus === "active" || record.subscriptionStatus === "trialing";
}
