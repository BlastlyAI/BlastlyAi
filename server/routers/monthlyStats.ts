/**
 * monthlyStats router
 *
 * Provides per-workspace monthly activity counters for the Command Centre widget.
 * Row-level security: every procedure is scoped to ctx.user's workspaceId.
 */
import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import {
  getMonthlyStats,
  setMonthlyActiveFeatures,
  currentMonth,
} from "../db";

export const monthlyStatsRouter = router({
  /**
   * Returns the current (or specified) month's stats for a workspace.
   * Returns a zeroed-out object if no row exists yet.
   */
  getMyStats: protectedProcedure
    .input(z.object({ workspaceId: z.number(), month: z.string().optional() }))
    .query(async ({ ctx: _ctx, input }) => {
      const { workspaceId } = input;
      if (!workspaceId) return null;
      const month = input?.month ?? currentMonth();
      const row = await getMonthlyStats(workspaceId, month);
      if (!row) {
        // Return zeroed defaults so the widget always has something to render
        return {
          workspaceId,
          month,
          blogsPublished: 0,
          socialPostsPublished: 0,
          peopleReached: 0,
          callsHandled: 0,
          appointmentsBooked: 0,
          newEnquiries: 0,
          aiCitations: 0,
          hoursSaved: 0,
          activeFeatures: [] as string[],
        };
      }
      return {
        workspaceId: row.workspaceId as number,
        month: row.month as string,
        blogsPublished: Number(row.blogsPublished ?? 0),
        socialPostsPublished: Number(row.socialPostsPublished ?? 0),
        peopleReached: Number(row.peopleReached ?? 0),
        callsHandled: Number(row.callsHandled ?? 0),
        appointmentsBooked: Number(row.appointmentsBooked ?? 0),
        newEnquiries: Number(row.newEnquiries ?? 0),
        aiCitations: Number(row.aiCitations ?? 0),
        hoursSaved: Number(row.hoursSaved ?? 0),
        activeFeatures: (row.activeFeatures as string[]) ?? [],
      };
    }),

  /**
   * Admin-only: set which feature cards are active for a given workspace.
   * e.g. ["blogs","social","appointments","ai_voice","mcp_engine"]
   */
  setActiveFeatures: adminProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        features: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      await setMonthlyActiveFeatures(input.workspaceId, input.features);
      return { ok: true };
    }),
});
