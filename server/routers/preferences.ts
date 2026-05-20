import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { workspacePreferences } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getWorkspaceById, getMemberRole } from "../db";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return db;
}

async function canAccessWorkspace(workspaceId: number, userId: number) {
  const ws = await getWorkspaceById(workspaceId);
  if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
  const role = await getMemberRole(workspaceId, userId);
  if (ws.ownerId !== userId && !role) throw new TRPCError({ code: "FORBIDDEN" });
  return ws;
}

export const preferencesRouter = router({
  // Get preferences for a workspace (creates defaults if none exist)
  get: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      await canAccessWorkspace(input.workspaceId, ctx.user.id);
      const db = await requireDb();
      const rows = await db
        .select()
        .from(workspacePreferences)
        .where(eq(workspacePreferences.workspaceId, input.workspaceId))
        .limit(1);
      if (rows[0]) return rows[0];
      // Return defaults without inserting — insert happens on first save
      return {
        workspaceId: input.workspaceId,
        colorScheme: "bold" as const,
        homeMode: "dashboard" as const,
        ageGroup: "all_ages" as const,
        businessSector: "other" as const,
      };
    }),

  // Save preferences for a workspace
  save: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      colorScheme: z.enum(["bold", "soft", "warm"]).optional(),
      homeMode: z.enum(["dashboard", "assistant"]).optional(),
      ageGroup: z.enum(["children", "teens", "adults", "seniors", "all_ages"]).optional(),
      businessSector: z.enum(["retail", "hospitality", "health", "beauty", "trades", "professional_services", "food_beverage", "education", "other"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await canAccessWorkspace(input.workspaceId, ctx.user.id);
      const db = await requireDb();
      const existing = await db
        .select({ id: workspacePreferences.id })
        .from(workspacePreferences)
        .where(eq(workspacePreferences.workspaceId, input.workspaceId))
        .limit(1);

      const updates: Record<string, unknown> = {};
      if (input.colorScheme !== undefined) updates.colorScheme = input.colorScheme;
      if (input.homeMode !== undefined) updates.homeMode = input.homeMode;
      if (input.ageGroup !== undefined) updates.ageGroup = input.ageGroup;
      if (input.businessSector !== undefined) updates.businessSector = input.businessSector;

      if (existing[0]) {
        await db
          .update(workspacePreferences)
          .set(updates)
          .where(eq(workspacePreferences.workspaceId, input.workspaceId));
      } else {
        await db.insert(workspacePreferences).values({
          workspaceId: input.workspaceId,
          colorScheme: input.colorScheme ?? "bold",
          homeMode: input.homeMode ?? "dashboard",
          ageGroup: input.ageGroup ?? "all_ages",
          businessSector: input.businessSector ?? "other",
        });
      }
      return { success: true };
    }),
});
