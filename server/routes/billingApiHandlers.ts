import Stripe from "stripe";
import { PLANS } from "../stripe/products";
import {
  getUserBilling,
  isPaidPlan,
  saveAssistantSetup,
} from "../billing/supabaseBillingStore";
import type { AssistantSetupInput } from "../billing/types";
import type { AuditAuthContext } from "../lib/auditAuthRequest";
import { ensurePublicUser } from "../users/publicUserStore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-03-25.dahlia",
});

export async function handleBillingGetPlan(auth: AuditAuthContext) {
  if (!auth.userId) throw new Error("Authentication required");
  await ensurePublicUser({ id: auth.userId });
  const billing = await getUserBilling(auth.userId);
  if (!billing) throw new Error("User profile not found");
  return {
    ...billing,
    isPaid: isPaidPlan(billing),
  };
}

export async function handleBillingSaveAssistant(
  body: AssistantSetupInput,
  auth: AuditAuthContext
) {
  if (!auth.userId) throw new Error("Authentication required");
  if (!body.assistantName?.trim()) throw new Error("Assistant name is required");
  if (!body.assistantTone?.trim()) throw new Error("Assistant tone is required");
  if (!body.assistantPersonality?.trim()) throw new Error("Assistant personality is required");

  await ensurePublicUser({ id: auth.userId });

  const record = await saveAssistantSetup(auth.userId, {
    assistantName: body.assistantName.trim().slice(0, 64),
    assistantTone: body.assistantTone.trim().slice(0, 64),
    assistantPersonality: body.assistantPersonality.trim().slice(0, 128),
  });
  return record;
}

export async function handleBillingCreateCheckout(
  body: { origin?: string },
  auth: AuditAuthContext
) {
  if (!auth.userId) throw new Error("Authentication required");
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY in .env");
  }

  await ensurePublicUser({ id: auth.userId });

  const billing = await getUserBilling(auth.userId);
  if (billing && isPaidPlan(billing)) {
    throw new Error("You already have an active Blastly Pro subscription");
  }

  await ensurePublicUser({ id: auth.userId, email: billing?.email ?? null });

  const origin = body.origin?.trim() || "http://localhost:3000";
  const plan = PLANS.everything;
  const businessLabel = billing?.businessName || billing?.email || "Your Business";

  const lineItem = plan.stripePriceId
    ? { price: plan.stripePriceId, quantity: 1 as const }
    : {
        price_data: {
          currency: "aud",
          product_data: {
            name: `Blastly Everything — ${businessLabel}`,
            description: plan.description,
          },
          unit_amount: plan.price * 100,
          recurring: { interval: "week" as const },
        },
        quantity: 1 as const,
      };

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "subscription",
    allow_promotion_codes: true,
    customer_email: billing?.email ?? undefined,
    client_reference_id: auth.userId,
    metadata: {
      supabase_user_id: auth.userId,
      plan_tier: "pro",
      billing_model: "supabase_user",
    },
    subscription_data: {
      trial_period_days: plan.trialDays,
      metadata: {
        supabase_user_id: auth.userId,
        plan_tier: "pro",
      },
    },
    line_items: [lineItem],
    success_url: `${origin}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/upgrade?cancelled=1`,
  });

  if (!session.url) throw new Error("Failed to create Stripe checkout session");
  return { url: session.url, sessionId: session.id };
}

export async function handleBillingConfirmSession(
  sessionId: string,
  auth: AuditAuthContext
) {
  if (!auth.userId) throw new Error("Authentication required");
  if (!sessionId?.trim()) throw new Error("session_id is required");

  await ensurePublicUser({ id: auth.userId });

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  if (session.metadata?.supabase_user_id !== auth.userId) {
    throw new Error("Checkout session does not belong to this account");
  }
  if (session.payment_status !== "paid" && session.status !== "complete") {
    return { confirmed: false, billing: await getUserBilling(auth.userId) };
  }

  const billing = await getUserBilling(auth.userId);
  return {
    confirmed: billing ? isPaidPlan(billing) : false,
    billing,
  };
}
