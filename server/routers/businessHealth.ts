import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { businessSnapshots } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const businessHealthRouter = router({
  // Save a Day Zero or monthly snapshot
  saveSnapshot: protectedProcedure
    .input(z.object({
      snapshotType:   z.enum(["day_zero", "monthly"]).default("day_zero"),
      platformCount:  z.number().min(0).max(50).default(0),
      hoursPerWeek:   z.number().min(0).max(168).default(0),
      totalFollowers: z.number().min(0).default(0),
      avgPostReach:   z.number().min(0).default(0),
      postsPerWeek:   z.number().min(0).max(50).default(0),
      leadsPerWeek:   z.number().min(0).default(0),
      monthlyRevenue: z.number().min(0).default(0),
      blastlyHoursPerWeek: z.number().min(0).default(0),
      blastlyLeadsPerWeek: z.number().min(0).default(0),
      blastlyPostReach:    z.number().min(0).default(0),
      notes:          z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.insert(businessSnapshots).values({
        userId:              ctx.user.id,
        snapshotType:        input.snapshotType,
        platformCount:       input.platformCount,
        hoursPerWeek:        input.hoursPerWeek,
        totalFollowers:      input.totalFollowers,
        avgPostReach:        input.avgPostReach,
        postsPerWeek:        input.postsPerWeek,
        leadsPerWeek:        input.leadsPerWeek,
        monthlyRevenue:      input.monthlyRevenue,
        blastlyHoursPerWeek: input.blastlyHoursPerWeek,
        blastlyLeadsPerWeek: input.blastlyLeadsPerWeek,
        blastlyPostReach:    input.blastlyPostReach,
        notes:               input.notes ?? null,
        createdAt:           Date.now(),
      });
      return { success: true };
    }),

  // Get all snapshots for the current user (ordered oldest first for charting)
  listSnapshots: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(businessSnapshots)
        .where(eq(businessSnapshots.userId, ctx.user.id))
        .orderBy(businessSnapshots.createdAt);
      return rows;
    }),

  // Get the Day Zero snapshot (first one saved)
  getDayZero: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select()
        .from(businessSnapshots)
        .where(eq(businessSnapshots.userId, ctx.user.id))
        .orderBy(businessSnapshots.createdAt)
        .limit(1);
      return rows[0] ?? null;
    }),

  // Get the latest snapshot
  getLatest: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select()
        .from(businessSnapshots)
        .where(eq(businessSnapshots.userId, ctx.user.id))
        .orderBy(desc(businessSnapshots.createdAt))
        .limit(1);
      return rows[0] ?? null;
    }),
});
