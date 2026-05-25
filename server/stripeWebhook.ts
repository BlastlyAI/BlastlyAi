import { Express, Request, Response } from "express";
import express from "express";
import Stripe from "stripe";
import { activatePaidPlan, syncSubscriptionFromStripe } from "./billing/planActivationService";
import { updateUserSubscriptionByStripeId } from "./billing/supabaseBillingStore";
import {
  upsertSubscription,
  updateSubscriptionByStripeId,
  updateWorkspace,
  getWorkspaceById,
} from "./db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-03-25.dahlia",
});

async function handleSupabaseUserCheckout(session: Stripe.Checkout.Session): Promise<boolean> {
  const userId = session.metadata?.supabase_user_id;
  const planTier = session.metadata?.plan_tier;
  const isPaidCheckout = planTier === "pro" || planTier === "everything";
  if (!userId || !isPaidCheckout || !session.subscription) return false;

  const sub = await stripe.subscriptions.retrieve(session.subscription as string);
  const status =
    sub.status === "trialing"
      ? "trialing"
      : sub.status === "active"
        ? "active"
        : sub.status === "past_due"
          ? "past_due"
          : "cancelled";
  const periodEnd = (sub as unknown as { trial_end?: number; current_period_end?: number }).trial_end
    ?? (sub as unknown as { current_period_end?: number }).current_period_end;

  await activatePaidPlan({
    userId,
    email: session.customer_email ?? null,
    subscriptionStatus: status,
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: session.subscription as string,
    trialEndsAt: periodEnd ? new Date(periodEnd * 1000) : null,
  });

  console.log(`[Webhook] Supabase user ${userId} upgraded to pro (${status})`);
  return true;
}

async function handleSupabaseSubscriptionEvent(
  sub: Stripe.Subscription,
  status: "active" | "trialing" | "past_due" | "cancelled"
): Promise<boolean> {
  const userId = sub.metadata?.supabase_user_id;
  if (!userId) return false;

  await syncSubscriptionFromStripe({
    stripeSubscriptionId: sub.id,
    subscriptionStatus: status,
    userId,
  });
  console.log(`[Webhook] Supabase subscription ${sub.id} → ${status}`);
  return true;
}

export function registerStripeWebhook(app: Express) {
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[Webhook] Signature verification failed:", message);
        return res.status(400).json({ error: `Webhook Error: ${message}` });
      }

      console.log(`[Webhook] Received event: ${event.type} (${event.id})`);

      if (event.id.startsWith("evt_test_")) {
        console.log("[Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
      }

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;

            if (session.metadata?.billing_model === "supabase_user") {
              await handleSupabaseUserCheckout(session);
              break;
            }

            const userId = parseInt(session.metadata?.user_id || "0");
            const workspaceId = parseInt(session.metadata?.workspace_id || "0");
            const planTier = session.metadata?.plan_tier as
              | "everything"
              | "fix_my_brand"
              | "managed_social"
              | undefined;

            if (workspaceId && planTier) {
              const workspace = await getWorkspaceById(workspaceId);
              if (workspace) {
                if (planTier === "everything" && session.subscription) {
                  const sub = await stripe.subscriptions.retrieve(session.subscription as string);
                  const periodEnd = (sub as unknown as { trial_end?: number; current_period_end?: number }).trial_end
                    ?? (sub as unknown as { current_period_end?: number }).current_period_end;
                  await updateWorkspace(workspaceId, {
                    planTier: "everything",
                    stripeCustomerId: session.customer as string,
                    stripeSubscriptionId: session.subscription as string,
                    subscriptionStatus: sub.status === "trialing" ? "trialing" : "active",
                    trialEndsAt: periodEnd ? new Date(periodEnd * 1000) : null,
                  });
                  console.log(`[Webhook] Workspace ${workspaceId} upgraded to everything`);
                } else if (planTier === "managed_social" && session.subscription) {
                  const sub = await stripe.subscriptions.retrieve(session.subscription as string);
                  const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
                  await updateWorkspace(workspaceId, {
                    planTier: "managed_social",
                    stripeCustomerId: session.customer as string,
                    stripeSubscriptionId: session.subscription as string,
                    subscriptionStatus: "active",
                    trialEndsAt: periodEnd ? new Date(periodEnd * 1000) : null,
                  });
                  console.log(`[Webhook] Workspace ${workspaceId} upgraded to managed_social`);
                } else if (planTier === "fix_my_brand") {
                  await updateWorkspace(workspaceId, {
                    planTier: "fix_my_brand",
                    stripeCustomerId: session.customer as string,
                    subscriptionStatus: "active",
                  });
                  console.log(`[Webhook] Workspace ${workspaceId} upgraded to fix_my_brand`);
                }
              }
              break;
            }

            const plan = (session.metadata?.plan || "free") as "free" | "starter" | "pro" | "agency";
            if (userId && session.subscription) {
              const sub = await stripe.subscriptions.retrieve(session.subscription as string);
              const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
              await upsertSubscription({
                userId,
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: session.subscription as string,
                plan,
                status: "active",
                currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
              });
              console.log(`[Webhook] Legacy subscription created for user ${userId}, plan: ${plan}`);
            }
            break;
          }

          case "customer.subscription.updated": {
            const sub = event.data.object as Stripe.Subscription;
            const status =
              sub.status === "active"
                ? "active"
                : sub.status === "trialing"
                  ? "trialing"
                  : sub.status === "past_due"
                    ? "past_due"
                    : "cancelled";

            if (await handleSupabaseSubscriptionEvent(sub, status)) break;

            const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
            await updateSubscriptionByStripeId(sub.id, {
              status,
              currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
            });
            console.log(`[Webhook] Subscription updated: ${sub.id}, status: ${status}`);
            break;
          }

          case "customer.subscription.deleted": {
            const sub = event.data.object as Stripe.Subscription;
            if (await handleSupabaseSubscriptionEvent(sub, "cancelled")) break;

            await updateSubscriptionByStripeId(sub.id, {
              status: "cancelled",
              plan: "free",
            });
            console.log(`[Webhook] Subscription cancelled: ${sub.id}`);
            break;
          }

          case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            const invoiceSub = (invoice as unknown as { subscription?: string }).subscription;
            if (invoiceSub) {
              try {
                await updateUserSubscriptionByStripeId(invoiceSub, { subscriptionStatus: "past_due" });
              } catch {
                /* legacy path */
              }
              await updateSubscriptionByStripeId(invoiceSub, { status: "past_due" });
              console.log(`[Webhook] Payment failed for subscription: ${invoiceSub}`);
            }
            break;
          }

          default:
            console.log(`[Webhook] Unhandled event type: ${event.type}`);
        }
      } catch (err) {
        console.error("[Webhook] Error processing event:", err);
        return res.status(500).json({ error: "Internal server error" });
      }

      return res.json({ received: true });
    }
  );
}
