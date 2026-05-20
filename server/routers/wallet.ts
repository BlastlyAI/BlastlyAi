import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { adWallet, walletTransactions, workspaces } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" as any });

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

// Top-up amounts in AUD cents
const TOP_UP_AMOUNTS = [5000, 10000, 20000, 50000]; // $50, $100, $200, $500

async function getOrCreateWallet(workspaceId: number) {
  const db = await requireDb();
  const [existing] = await db.select().from(adWallet).where(eq(adWallet.workspaceId, workspaceId));
  if (existing) return existing;
  const nextReset = new Date();
  nextReset.setMonth(nextReset.getMonth() + 1, 1);
  nextReset.setHours(0, 0, 0, 0);
  await db.insert(adWallet).values({
    workspaceId,
    balanceCents: 0,
    monthlyBudgetCents: 10000,
    spentThisMonthCents: 0,
    autoTopUp: false,
    autoTopUpThresholdCents: 2000,
    autoTopUpAmountCents: 10000,
    nextResetDate: nextReset,
  });
  const [created] = await db.select().from(adWallet).where(eq(adWallet.workspaceId, workspaceId));
  return created;
}

async function assertWorkspaceOwner(workspaceId: number, userId: number) {
  const db = await requireDb();
  const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
  if (!ws || ws.ownerId !== userId) throw new TRPCError({ code: "FORBIDDEN" });
  return ws;
}

export const walletRouter = router({
  // Get wallet state for a workspace
  getWallet: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceOwner(input.workspaceId, ctx.user.id);
      const db = await requireDb();
      const wallet = await getOrCreateWallet(input.workspaceId);
      return {
        balanceCents: wallet.balanceCents,
        balanceAud: (wallet.balanceCents / 100).toFixed(2),
        monthlyBudgetCents: wallet.monthlyBudgetCents,
        monthlyBudgetAud: (wallet.monthlyBudgetCents / 100).toFixed(2),
        spentThisMonthCents: wallet.spentThisMonthCents,
        spentThisMonthAud: (wallet.spentThisMonthCents / 100).toFixed(2),
        percentUsed: wallet.monthlyBudgetCents > 0
          ? Math.round((wallet.spentThisMonthCents / wallet.monthlyBudgetCents) * 100)
          : 0,
        percentRemaining: wallet.monthlyBudgetCents > 0
          ? Math.round((wallet.balanceCents / wallet.monthlyBudgetCents) * 100)
          : 0,
        isLowBalance: wallet.balanceCents < wallet.monthlyBudgetCents * 0.2,
        isCriticalBalance: wallet.balanceCents < wallet.monthlyBudgetCents * 0.05,
        autoTopUp: wallet.autoTopUp,
        autoTopUpThresholdAud: ((wallet.autoTopUpThresholdCents ?? 2000) / 100).toFixed(2),
        autoTopUpAmountAud: ((wallet.autoTopUpAmountCents ?? 10000) / 100).toFixed(2),
        nextResetDate: wallet.nextResetDate,
        topUpAmounts: TOP_UP_AMOUNTS.map(c => ({ cents: c, aud: (c / 100).toFixed(0) })),
      };
    }),

  // Update monthly budget target
  setMonthlyBudget: protectedProcedure
    .input(z.object({ workspaceId: z.number(), budgetAud: z.number().min(10).max(10000) }))
    .mutation(async ({ ctx, input }) => {
      await assertWorkspaceOwner(input.workspaceId, ctx.user.id);
      const db = await requireDb();
      const budgetCents = Math.round(input.budgetAud * 100);
      await getOrCreateWallet(input.workspaceId);
      await db.update(adWallet)
        .set({ monthlyBudgetCents: budgetCents })
        .where(eq(adWallet.workspaceId, input.workspaceId));
      return { success: true };
    }),

  // Create Stripe checkout session for top-up
  createTopUpCheckout: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      amountCents: z.number().refine(v => TOP_UP_AMOUNTS.includes(v), "Invalid top-up amount"),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertWorkspaceOwner(input.workspaceId, ctx.user.id);
      const origin = (ctx.req.headers.origin as string) || "https://blastly.ai";
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "aud",
            product_data: {
              name: `Blastly Ad Budget Top-Up — $${(input.amountCents / 100).toFixed(0)} AUD`,
              description: "Credits added to your Blastly ad wallet",
            },
            unit_amount: input.amountCents,
          },
          quantity: 1,
        }],
        customer_email: ctx.user.email ?? undefined,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          type: "wallet_topup",
          workspaceId: input.workspaceId.toString(),
          userId: ctx.user.id.toString(),
          amountCents: input.amountCents.toString(),
        },
        allow_promotion_codes: true,
        success_url: `${origin}/dashboard/billing?wallet_topup=success&amount=${input.amountCents}`,
        cancel_url: `${origin}/dashboard/billing?wallet_topup=cancelled`,
      });
      return { checkoutUrl: session.url };
    }),

  // Get transaction history
  getTransactions: protectedProcedure
    .input(z.object({ workspaceId: z.number(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceOwner(input.workspaceId, ctx.user.id);
      const db = await requireDb();
      const txns = await db.select()
        .from(walletTransactions)
        .where(eq(walletTransactions.workspaceId, input.workspaceId))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(input.limit);
      return txns.map((t: typeof txns[0]) => ({
        ...t,
        amountAud: (t.amountCents / 100).toFixed(2),
        balanceAfterAud: (t.balanceAfterCents / 100).toFixed(2),
      }));
    }),

  // Create Stripe checkout for onboarding monthly budget (first payment)
  createOnboardingCheckout: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      monthlyBudgetAud: z.number().min(300).max(1000),
      selectedPlatforms: z.array(z.string()),
      currency: z.string().length(3).optional(), // ISO 4217 e.g. "aud", "usd", "gbp"
      contactEmail: z.string().email().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertWorkspaceOwner(input.workspaceId, ctx.user.id);
      const origin = (ctx.req.headers.origin as string) || "https://blastly.ai";
      const currency = (input.currency ?? "aud").toLowerCase();
      const amountCents = Math.round(input.monthlyBudgetAud * 100);
      const customerEmail = input.contactEmail || ctx.user.email || undefined;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency,
            product_data: {
              name: `Blastly Managed Social — First Month`,
              description: `Monthly budget ${currency.toUpperCase()} $${input.monthlyBudgetAud} · ${input.selectedPlatforms.join(", ")}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        }],
        customer_email: customerEmail,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          type: "onboarding_budget",
          workspaceId: input.workspaceId.toString(),
          userId: ctx.user.id.toString(),
          monthlyBudgetAud: input.monthlyBudgetAud.toString(),
          selectedPlatforms: input.selectedPlatforms.join(","),
        },
        allow_promotion_codes: true,
        success_url: `${origin}/dashboard?onboarding=complete&workspace=${input.workspaceId}`,
        cancel_url: `${origin}/onboarding?step=2&workspace=${input.workspaceId}`,
      });
      return { checkoutUrl: session.url! };
    }),

  // Update auto top-up settings
  setAutoTopUp: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      enabled: z.boolean(),
      thresholdAud: z.number().min(5).max(500).optional(),
      amountAud: z.number().min(10).max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertWorkspaceOwner(input.workspaceId, ctx.user.id);
      const db = await requireDb();
      await getOrCreateWallet(input.workspaceId);
      await db.update(adWallet)
        .set({
          autoTopUp: input.enabled,
          ...(input.thresholdAud !== undefined && { autoTopUpThresholdCents: Math.round(input.thresholdAud * 100) }),
          ...(input.amountAud !== undefined && { autoTopUpAmountCents: Math.round(input.amountAud * 100) }),
        })
        .where(eq(adWallet.workspaceId, input.workspaceId));
      return { success: true };
    }),
});
