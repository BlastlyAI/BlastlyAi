import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getWorkspaceById, getMemberRole } from "../db";
import {
  voucherSettings,
  giftVouchers,
  quickChargeTransactions,
  loyaltyBalances,
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" as any });

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

async function assertAccess(workspaceId: number, userId: number) {
  const ws = await getWorkspaceById(workspaceId);
  if (!ws) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
  if (ws.ownerId !== userId) {
    const role = await getMemberRole(workspaceId, userId);
    if (!role) throw new TRPCError({ code: "FORBIDDEN" });
  }
}

async function assertOwner(workspaceId: number, userId: number) {
  const ws = await getWorkspaceById(workspaceId);
  if (!ws) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
  if (ws.ownerId !== userId)
    throw new TRPCError({ code: "FORBIDDEN", message: "Only workspace owners can change settings" });
}

async function getOrCreateVoucherSettings(workspaceId: number) {
  const db = await requireDb();
  const [existing] = await db
    .select()
    .from(voucherSettings)
    .where(eq(voucherSettings.workspaceId, workspaceId));
  if (existing) return existing;
  const now = Date.now();
  await db.insert(voucherSettings).values({
    workspaceId,
    defaultExpiryDays: 365,
    minAmountCents: 500,
    maxAmountCents: 50000,
    prefix: "GV",
    createdAt: now,
    updatedAt: now,
  });
  const [created] = await db
    .select()
    .from(voucherSettings)
    .where(eq(voucherSettings.workspaceId, workspaceId));
  return created;
}

function generateVoucherCode(prefix: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${prefix}-${seg(4)}-${seg(4)}`;
}

export const quickChargeRouter = router({
  getVoucherSettings: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertAccess(input.workspaceId, ctx.user.id);
      const settings = await getOrCreateVoucherSettings(input.workspaceId);
      return {
        ...settings,
        minAmountAud: (settings.minAmountCents / 100).toFixed(2),
        maxAmountAud: (settings.maxAmountCents / 100).toFixed(2),
        presets: [
          { label: "3 months", days: 90 },
          { label: "6 months", days: 180 },
          { label: "1 year", days: 365 },
          { label: "2 years", days: 730 },
          { label: "Never expire", days: 0 },
        ],
      };
    }),

  saveVoucherSettings: protectedProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        defaultExpiryDays: z.number().int().min(0).max(3650),
        minAmountCents: z.number().int().min(100).max(100000),
        maxAmountCents: z.number().int().min(100).max(500000),
        prefix: z.string().min(1).max(8).regex(/^[A-Z0-9]+$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwner(input.workspaceId, ctx.user.id);
      if (input.minAmountCents >= input.maxAmountCents)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Min amount must be less than max amount" });
      const db = await requireDb();
      await getOrCreateVoucherSettings(input.workspaceId);
      await db
        .update(voucherSettings)
        .set({
          defaultExpiryDays: input.defaultExpiryDays,
          minAmountCents: input.minAmountCents,
          maxAmountCents: input.maxAmountCents,
          prefix: input.prefix,
          updatedAt: Date.now(),
        })
        .where(eq(voucherSettings.workspaceId, input.workspaceId));
      return { success: true };
    }),

  generateQR: protectedProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        amountCents: z.number().int().min(50),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertAccess(input.workspaceId, ctx.user.id);
      const origin = (ctx.req.headers.origin as string) || "https://blastly.ai";
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "aud",
              product_data: {
                name: `Quick Charge — $${(input.amountCents / 100).toFixed(2)} AUD`,
                description: input.note || "In-person payment via Blastly Quick Charge",
              },
              unit_amount: input.amountCents,
            },
            quantity: 1,
          },
        ],
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          type: "quick_charge",
          workspaceId: input.workspaceId.toString(),
          userId: ctx.user.id.toString(),
          amountCents: input.amountCents.toString(),
        },
        allow_promotion_codes: false,
        success_url: `${origin}/dashboard/command-centre?charge=success&amount=${input.amountCents}`,
        cancel_url: `${origin}/dashboard/command-centre?charge=cancelled`,
      });
      const db = await requireDb();
      await db.insert(quickChargeTransactions).values({
        workspaceId: input.workspaceId,
        amountCents: input.amountCents,
        type: "charge",
        reference: session.id,
        note: input.note || null,
        createdAt: Date.now(),
      });
      return { checkoutUrl: session.url!, sessionId: session.id };
    }),

  issueGiftVoucher: protectedProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        amountCents: z.number().int().min(100),
        note: z.string().optional(),
        customExpiryDays: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertAccess(input.workspaceId, ctx.user.id);
      const settings = await getOrCreateVoucherSettings(input.workspaceId);
      if (input.amountCents < settings.minAmountCents)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Minimum voucher amount is $${(settings.minAmountCents / 100).toFixed(2)}`,
        });
      if (input.amountCents > settings.maxAmountCents)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Maximum voucher amount is $${(settings.maxAmountCents / 100).toFixed(2)}`,
        });
      const expiryDays =
        input.customExpiryDays !== undefined ? input.customExpiryDays : settings.defaultExpiryDays;
      const expiresAt = expiryDays > 0 ? Date.now() + expiryDays * 86_400_000 : null;
      const db = await requireDb();
      let code: string = "";
      let attempts = 0;
      do {
        code = generateVoucherCode(settings.prefix);
        const [existing] = await db
          .select()
          .from(giftVouchers)
          .where(eq(giftVouchers.code, code));
        if (!existing) break;
        attempts++;
      } while (attempts < 10);
      const now = Date.now();
      await db.insert(giftVouchers).values({
        workspaceId: input.workspaceId,
        code,
        amountCents: input.amountCents,
        balanceCents: input.amountCents,
        issuedByUserId: ctx.user.id,
        note: input.note || null,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      });
      await db.insert(quickChargeTransactions).values({
        workspaceId: input.workspaceId,
        amountCents: input.amountCents,
        type: "gift_voucher_sale",
        reference: code,
        note: input.note || null,
        createdAt: now,
      });
      return {
        code,
        amountCents: input.amountCents,
        amountAud: (input.amountCents / 100).toFixed(2),
        expiresAt,
        expiresAtFormatted: expiresAt
          ? new Date(expiresAt).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "Never",
        expiryDays,
      };
    }),

  lookupVoucher: protectedProcedure
    .input(z.object({ workspaceId: z.number(), code: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertAccess(input.workspaceId, ctx.user.id);
      const db = await requireDb();
      const [voucher] = await db
        .select()
        .from(giftVouchers)
        .where(
          and(
            eq(giftVouchers.workspaceId, input.workspaceId),
            eq(giftVouchers.code, input.code.toUpperCase())
          )
        );
      if (!voucher) return { found: false as const };
      const now = Date.now();
      const isExpired = voucher.expiresAt !== null && voucher.expiresAt < now;
      const isFullyRedeemed = voucher.balanceCents <= 0;
      return {
        found: true as const,
        code: voucher.code,
        amountCents: voucher.amountCents,
        balanceCents: voucher.balanceCents,
        balanceAud: (voucher.balanceCents / 100).toFixed(2),
        isExpired,
        isFullyRedeemed,
        isValid: !isExpired && !isFullyRedeemed,
        expiresAt: voucher.expiresAt,
        expiresAtFormatted: voucher.expiresAt
          ? new Date(voucher.expiresAt).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "Never",
        note: voucher.note,
      };
    }),

  redeemGiftVoucher: protectedProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        code: z.string(),
        redeemCents: z.number().int().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertAccess(input.workspaceId, ctx.user.id);
      const db = await requireDb();
      const [voucher] = await db
        .select()
        .from(giftVouchers)
        .where(
          and(
            eq(giftVouchers.workspaceId, input.workspaceId),
            eq(giftVouchers.code, input.code.toUpperCase())
          )
        );
      if (!voucher) throw new TRPCError({ code: "NOT_FOUND", message: "Voucher not found" });
      if (voucher.expiresAt !== null && voucher.expiresAt < Date.now())
        throw new TRPCError({ code: "BAD_REQUEST", message: "Voucher has expired" });
      if (voucher.balanceCents <= 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Voucher has no remaining balance" });
      const actualRedeem = Math.min(input.redeemCents, voucher.balanceCents);
      const newBalance = voucher.balanceCents - actualRedeem;
      const now = Date.now();
      await db
        .update(giftVouchers)
        .set({
          balanceCents: newBalance,
          redeemedAt: newBalance === 0 ? now : voucher.redeemedAt,
          updatedAt: now,
        })
        .where(eq(giftVouchers.id, voucher.id));
      await db.insert(quickChargeTransactions).values({
        workspaceId: input.workspaceId,
        amountCents: actualRedeem,
        type: "gift_voucher_redemption",
        reference: voucher.code,
        createdAt: now,
      });
      return {
        success: true,
        redeemedCents: actualRedeem,
        redeemedAud: (actualRedeem / 100).toFixed(2),
        remainingCents: newBalance,
        remainingAud: (newBalance / 100).toFixed(2),
      };
    }),

  getLoyaltyBalance: protectedProcedure
    .input(z.object({ workspaceId: z.number(), contactId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertAccess(input.workspaceId, ctx.user.id);
      const db = await requireDb();
      const [bal] = await db
        .select()
        .from(loyaltyBalances)
        .where(
          and(
            eq(loyaltyBalances.workspaceId, input.workspaceId),
            eq(loyaltyBalances.contactId, input.contactId)
          )
        );
      return {
        pointsBalance: bal?.pointsBalance ?? 0,
        totalEarned: bal?.totalEarned ?? 0,
        totalRedeemed: bal?.totalRedeemed ?? 0,
      };
    }),

  redeemLoyalty: protectedProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        contactId: z.number(),
        pointsToRedeem: z.number().int().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertAccess(input.workspaceId, ctx.user.id);
      const db = await requireDb();
      const [bal] = await db
        .select()
        .from(loyaltyBalances)
        .where(
          and(
            eq(loyaltyBalances.workspaceId, input.workspaceId),
            eq(loyaltyBalances.contactId, input.contactId)
          )
        );
      if (!bal || bal.pointsBalance < input.pointsToRedeem)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient loyalty points" });
      const now = Date.now();
      await db
        .update(loyaltyBalances)
        .set({
          pointsBalance: bal.pointsBalance - input.pointsToRedeem,
          totalRedeemed: bal.totalRedeemed + input.pointsToRedeem,
          updatedAt: now,
        })
        .where(eq(loyaltyBalances.id, bal.id));
      await db.insert(quickChargeTransactions).values({
        workspaceId: input.workspaceId,
        amountCents: 0,
        type: "loyalty_redemption",
        reference: `contact:${input.contactId}`,
        note: `Redeemed ${input.pointsToRedeem} pts`,
        contactId: input.contactId,
        createdAt: now,
      });
      return {
        success: true,
        pointsRedeemed: input.pointsToRedeem,
        newBalance: bal.pointsBalance - input.pointsToRedeem,
      };
    }),

  getTransactions: protectedProcedure
    .input(z.object({ workspaceId: z.number(), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      await assertAccess(input.workspaceId, ctx.user.id);
      const db = await requireDb();
      const txns = await db
        .select()
        .from(quickChargeTransactions)
        .where(eq(quickChargeTransactions.workspaceId, input.workspaceId))
        .orderBy(desc(quickChargeTransactions.createdAt))
        .limit(input.limit);
      return txns.map((t) => ({
        ...t,
        amountAud: (t.amountCents / 100).toFixed(2),
      }));
    }),
});
