import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { businessProfiles, platformConnections } from "../../drizzle/schema";

const PLATFORMS = [
  "facebook", "instagram", "tiktok", "youtube",
  "linkedin", "twitter", "pinterest", "snapchat",
  "google_ads", "whatsapp",
] as const;

export const onboardingRouter = router({
  // ── Get current onboarding state ──────────────────────────────────────
  getState: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const [profile] = await db
      .select()
      .from(businessProfiles)
      .where(eq(businessProfiles.userId, ctx.user.id))
      .limit(1);

    const connections = await db
      .select()
      .from(platformConnections)
      .where(eq(platformConnections.userId, ctx.user.id));

    return {
      profile: profile ?? null,
      connections,
      currentStep: profile?.onboardingStep ?? 1,
      isComplete: (profile?.onboardingComplete ?? 0) === 1,
    };
  }),

  // ── Step 1: Save business profile ─────────────────────────────────────
  saveProfile: protectedProcedure
    .input(z.object({
      businessName: z.string().min(1).max(255),
      industry: z.string().max(100),
      goals: z.array(z.string()).max(10),
      targetAudience: z.string().max(1000).optional(),
      adBudgetRange: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const values = {
        userId: ctx.user.id,
        businessName: input.businessName,
        industry: input.industry,
        goals: JSON.stringify(input.goals),
        targetAudience: input.targetAudience ?? null,
        adBudgetRange: input.adBudgetRange ?? null,
        onboardingStep: 2,
      };

      await db
        .insert(businessProfiles)
        .values(values)
        .onDuplicateKeyUpdate({ set: { ...values, updatedAt: new Date() } });

      return { success: true };
    }),

  // ── Step 2: Save brand name checked ───────────────────────────────────
  saveBrandCheck: protectedProcedure
    .input(z.object({ brandName: z.string().max(255) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      await db
        .insert(businessProfiles)
        .values({
          userId: ctx.user.id,
          businessName: input.brandName,
          onboardingStep: 3,
          brandNameChecked: input.brandName,
        })
        .onDuplicateKeyUpdate({
          set: {
            brandNameChecked: input.brandName,
            onboardingStep: 3,
            updatedAt: new Date(),
          },
        });

      return { success: true };
    }),

  // ── Step 3: Save platform connection status ────────────────────────────
  savePlatformConnection: protectedProcedure
    .input(z.object({
      platform: z.enum(PLATFORMS),
      status: z.enum(["connected", "pending", "skipped", "disconnected"]),
      accountName: z.string().max(255).optional(),
      accountId: z.string().max(255).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const values = {
        userId: ctx.user.id,
        platform: input.platform,
        status: input.status,
        accountName: input.accountName ?? null,
        accountId: input.accountId ?? null,
        connectedAt: input.status === "connected" ? new Date() : null,
      };

      await db
        .insert(platformConnections)
        .values(values)
        .onDuplicateKeyUpdate({ set: { ...values, updatedAt: new Date() } });

      return { success: true };
    }),

  // ── Complete onboarding ────────────────────────────────────────────────
  complete: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    await db
      .insert(businessProfiles)
      .values({ userId: ctx.user.id, onboardingComplete: 1, onboardingStep: 4 })
      .onDuplicateKeyUpdate({
        set: { onboardingComplete: 1, onboardingStep: 4, updatedAt: new Date() },
      });

    return { success: true };
  }),

  // ── Get platform connections ───────────────────────────────────────────
  getConnections: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(platformConnections)
      .where(eq(platformConnections.userId, ctx.user.id));
  }),

  // ── Skip a platform ───────────────────────────────────────────────────
  skipPlatform: protectedProcedure
    .input(z.object({ platform: z.enum(PLATFORMS) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      await db
        .insert(platformConnections)
        .values({ userId: ctx.user.id, platform: input.platform, status: "skipped" })
        .onDuplicateKeyUpdate({ set: { status: "skipped", updatedAt: new Date() } });

      return { success: true };
    }),
});
