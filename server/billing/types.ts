import type { PlanTier } from "../stripe/products";

export type SubscriptionStatus =
  | "none"
  | "active"
  | "trialing"
  | "past_due"
  | "cancelled";

export type UserBillingRecord = {
  userId: string;
  email: string | null;
  businessName: string | null;
  planTier: PlanTier;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  trialEndsAt: string | null;
  upgradedAt: string | null;
  assistantName: string | null;
  assistantTone: string | null;
  assistantPersonality: string | null;
};

export type AssistantSetupInput = {
  assistantName: string;
  assistantTone: string;
  assistantPersonality: string;
};
