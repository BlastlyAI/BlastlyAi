import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import { PLANS, normalisePlanTier } from "../stripe/products";
import { getSubscriptionByUserId, getWorkspaceById, updateWorkspace } from "../db";

// ── Legacy stubs (kept for backward-compat procedures below) ──────────────────
const CREDIT_PACKS: Record<string, { name: string; description: string; price: number; credits: number }> = {
  pack_100: { name: "100 Credits", description: "100 posting credits", price: 49, credits: 100 },
  pack_250: { name: "250 Credits", description: "250 posting credits", price: 99, credits: 250 },
};
type CreditPackId = keyof typeof CREDIT_PACKS;
const LEGACY_PLANS: Record<string, { name: string; monthlyPrice: number; annualPrice: number }> = {
  starter: { name: "Starter", monthlyPrice: 49, annualPrice: 39 },
  growth:  { name: "Growth",  monthlyPrice: 99, annualPrice: 79 },
  agency:  { name: "Agency",  monthlyPrice: 199, annualPrice: 159 },
};
type LegacyPlanKey = keyof typeof LEGACY_PLANS;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-03-25.dahlia",
});

export const stripeRouter = router({
  // ── Public: return the 3-tier funnel plans ──────────────────────────────────
  getPlans: publicProcedure.query(() => {
    return PLANS;
  }),

  // ── Per-workspace checkout: Everything plan (AU$75/week, 14-day trial) ────────
  createWorkspaceCheckout: protectedProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        planTier: z.enum(["everything", "fix_my_brand", "managed_social"]), // legacy values kept for compat
        origin: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const workspace = await getWorkspaceById(input.workspaceId);
      if (!workspace || workspace.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Workspace not found or not yours." });
      }

      // All paid tiers now map to the Everything plan (AU$75/week)
      const plan = PLANS.everything;

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ["card"],
        customer_email: ctx.user.email || undefined,
        allow_promotion_codes: true,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          workspace_id: input.workspaceId.toString(),
          plan_tier: "everything",
          customer_email: ctx.user.email || "",
          customer_name: ctx.user.name || "",
        },
        success_url: `${input.origin}/dashboard?plan_success=everything&workspace=${input.workspaceId}`,
        cancel_url: `${input.origin}/pricing?cancelled=1`,
        // Weekly subscription with 14-day free trial
        mode: "subscription",
        subscription_data: {
          trial_period_days: 14,
        },
        line_items: [
          {
            price_data: {
              currency: "aud",
              product_data: {
                name: `Blastly Everything — ${workspace.name}`,
                description: plan.description,
              },
              unit_amount: plan.price * 100, // AU$75 in cents
              recurring: { interval: "week" },
            },
            quantity: 1,
          },
        ],
      };

      const session = await stripe.checkout.sessions.create(sessionParams);
      return { url: session.url };
    }),

  // ── Get workspace plan status ───────────────────────────────────────────────
  getWorkspacePlan: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const workspace = await getWorkspaceById(input.workspaceId);
      if (!workspace || workspace.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return {
        planTier: workspace.planTier,
        subscriptionStatus: workspace.subscriptionStatus,
        trialEndsAt: workspace.trialEndsAt,
        stripeSubscriptionId: workspace.stripeSubscriptionId,
      };
    }),

  // ── Credit pack purchase ───────────────────────────────────────────────────
  purchaseCredits: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      packId: z.enum(["pack_100", "pack_250"]),
      origin: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await getWorkspaceById(input.workspaceId);
      if (!workspace || workspace.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Workspace not found or not yours." });
      }
      const pack = CREDIT_PACKS[input.packId as CreditPackId];
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: ctx.user.email || undefined,
        allow_promotion_codes: true,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          workspace_id: input.workspaceId.toString(),
          purchase_type: "credits",
          pack_id: input.packId,
          credits: pack.credits.toString(),
          customer_email: ctx.user.email || "",
        },
        line_items: [{
          price_data: {
            currency: "aud",
            product_data: {
              name: `Blastly ${pack.name} — ${workspace.name}`,
              description: pack.description,
            },
            unit_amount: pack.price * 100,
          },
          quantity: 1,
        }],
        success_url: `${input.origin}/dashboard/content-studio?credits_success=1&workspace=${input.workspaceId}`,
        cancel_url: `${input.origin}/dashboard/content-studio?cancelled=1`,
      });
      return { url: session.url };
    }),

  // ── Managed Social onboarding checkout (setup fee + first month + credits) ──
  createManagedOnboardingCheckout: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      origin: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await getWorkspaceById(input.workspaceId);
      if (!workspace || workspace.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Workspace not found or not yours." });
      }

      // Detect currency from workspace location
      const countryCurrencyMap: Record<string, string> = {
        "Australia": "aud", "United States": "usd", "United Kingdom": "gbp",
        "Canada": "cad", "New Zealand": "nzd", "Singapore": "sgd",
        "European Union": "eur", "Germany": "eur", "France": "eur",
        "Netherlands": "eur", "Spain": "eur", "Italy": "eur",
        "India": "inr", "Japan": "jpy", "South Africa": "zar",
      };
      const currency = workspace.locationCountry
        ? (countryCurrencyMap[workspace.locationCountry] ?? "aud")
        : "aud";
      const customerEmail = (workspace as any).contactEmail || ctx.user.email || undefined;

      // Bundle: A$297 setup fee + A$197/month subscription + A$100 starter credits
      // We create a subscription with a setup fee as an invoice item
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: customerEmail,
        allow_promotion_codes: true,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          workspace_id: input.workspaceId.toString(),
          plan_tier: "managed_social",
          purchase_type: "managed_onboarding",
          starter_credits: "200",
          customer_email: ctx.user.email || "",
          customer_name: ctx.user.name || "",
        },
        line_items: [
          {
            // Monthly subscription
            price_data: {
              currency,
              product_data: {
                name: `Blastly Managed Social — ${workspace.name}`,
                description: "Monthly social media management across 13 platforms",
              },
              unit_amount: 197 * 100,
              recurring: { interval: "month" },
            },
            quantity: 1,
          },
          {
            // One-off setup fee (billed once via subscription invoice)
            price_data: {
              currency,
              product_data: {
                name: `Setup Fee — ${workspace.name}`,
                description: "One-off account setup and platform creation fee",
              },
              unit_amount: 297 * 100,
              recurring: { interval: "month", interval_count: 1 },
            },
            quantity: 1,
          },
          {
            // Starter credit pack
            price_data: {
              currency,
              product_data: {
                name: "Starter Credits (200)",
                description: "200 posting credits to get you started",
              },
              unit_amount: 100 * 100,
              recurring: { interval: "month", interval_count: 1 },
            },
            quantity: 1,
          },
        ],
        success_url: `${input.origin}/onboarding/managed?step=5&workspace=${input.workspaceId}&payment_success=1`,
        cancel_url: `${input.origin}/onboarding/managed?step=4&workspace=${input.workspaceId}&cancelled=1`,
      });
      return { url: session.url };
    }),

  // ── Dynamic Managed Social checkout — ad spend slider ──────────────────────
  createDynamicManagedCheckout: protectedProcedure
    .input(
      z.object({
        workspaceId: z.number().optional(),
        managementFeeAud: z.number().min(197).max(3500), // management fee in AUD
        adSpendAud: z.number().min(250).max(10000),      // ad spend for metadata
        origin: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Setup fee: $197 one-time
      const setupFeeAud = 197;
      const workspaceName = ctx.user.name ? `${ctx.user.name}'s Business` : "Your Business";

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: ctx.user.email || undefined,
        allow_promotion_codes: true,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          workspace_id: input.workspaceId?.toString() || "",
          plan_tier: "managed_social",
          purchase_type: "dynamic_managed",
          management_fee_aud: input.managementFeeAud.toString(),
          ad_spend_aud: input.adSpendAud.toString(),
          customer_email: ctx.user.email || "",
          customer_name: ctx.user.name || "",
        },
        line_items: [
          {
            // Monthly management fee
            price_data: {
              currency: "aud",
              product_data: {
                name: `Blastly Managed Social — ${workspaceName}`,
                description: `Monthly social media management (ad spend: A$${input.adSpendAud}/mo)`,
              },
              unit_amount: input.managementFeeAud * 100,
              recurring: { interval: "month" },
            },
            quantity: 1,
          },
          {
            // One-time setup fee billed on first invoice
            price_data: {
              currency: "aud",
              product_data: {
                name: "One-Time Setup Fee",
                description: "Brand brief setup, account connections, and first content batch",
              },
              unit_amount: setupFeeAud * 100,
              recurring: { interval: "month", interval_count: 1 },
            },
            quantity: 1,
          },
        ],
        success_url: `${input.origin}/payment-success?plan=managed_social&ad_spend=${input.adSpendAud}&mgmt_fee=${input.managementFeeAud}`,
        cancel_url: `${input.origin}/pricing?cancelled=1`,
      });
      return { url: session.url, sessionId: session.id };
    }),

  // ── Legacy: user-level subscription checkout (kept for backward compat) ─────
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        planKey: z.enum(["starter", "growth", "agency"]),
        billing: z.enum(["monthly", "annual"]).default("monthly"),
        origin: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const plan = LEGACY_PLANS[input.planKey as LegacyPlanKey];
      const isAnnual = input.billing === "annual";
      const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
      const interval = isAnnual ? "year" : "month";

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: ctx.user.email || undefined,
        allow_promotion_codes: true,
        line_items: [
          {
            price_data: {
              currency: "aud",
              product_data: {
                name: `Blastly ${plan.name}${isAnnual ? " (Annual)" : ""}`,
              },
              unit_amount: price * 100,
              recurring: { interval },
            },
            quantity: 1,
          },
        ],
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          customer_email: ctx.user.email || "",
          customer_name: ctx.user.name || "",
          plan: input.planKey,
          billing: input.billing,
        },
        success_url: `${input.origin}/payment-success?plan=${input.planKey}&billing=${input.billing}`,
        cancel_url: `${input.origin}/pricing?cancelled=1`,
      });

      return { url: session.url };
    }),

  // ── Legacy: get user-level subscription ────────────────────────────────────
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const sub = await getSubscriptionByUserId(ctx.user.id);
    if (!sub) {
      return { plan: "free" as const, status: "active" as const, currentPeriodEnd: null, billing: null };
    }
    return { plan: sub.plan, status: sub.status, currentPeriodEnd: sub.currentPeriodEnd, billing: null };
  }),

  // ── Legacy: Stripe Customer Portal ─────────────────────────────────────────
  createPortalSession: protectedProcedure
    .input(z.object({ origin: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sub = await getSubscriptionByUserId(ctx.user.id);
      if (!sub?.stripeCustomerId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No active subscription found." });
      }
      const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${input.origin}/dashboard/billing`,
      });
      return { url: session.url };
    }),
});
