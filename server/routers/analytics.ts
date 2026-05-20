import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getAnalyticsByWorkspace, getAnalyticsSummary, getMemberRole, getWorkspaceById, insertAnalytics, getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { sql, eq, desc } from "drizzle-orm";
import { analytics, posts, campaigns } from "../../drizzle/schema";

export const analyticsRouter = router({
  list: protectedProcedure.input(z.object({ workspaceId: z.number(), campaignId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role && ws?.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return getAnalyticsByWorkspace(input.workspaceId, input.campaignId);
    }),

  summary: protectedProcedure.input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role && ws?.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return getAnalyticsSummary(input.workspaceId);
    }),

  byPlatform: protectedProcedure.input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role && ws?.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      return db.select({
        platform: analytics.platform,
        totalImpressions: sql<number>`SUM(${analytics.impressions})`,
        totalClicks: sql<number>`SUM(${analytics.clicks})`,
        totalLikes: sql<number>`SUM(${analytics.likes})`,
        totalShares: sql<number>`SUM(${analytics.shares})`,
        totalEngagements: sql<number>`SUM(${analytics.likes} + ${analytics.comments} + ${analytics.shares})`,
      }).from(analytics)
        .where(eq(analytics.workspaceId, input.workspaceId))
        .groupBy(analytics.platform);
    }),

  byCampaign: protectedProcedure.input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role && ws?.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      return db.select({
        campaignId: analytics.campaignId,
        campaignName: campaigns.name,
        totalImpressions: sql<number>`SUM(${analytics.impressions})`,
        totalClicks: sql<number>`SUM(${analytics.clicks})`,
        totalConversions: sql<number>`SUM(${analytics.utmConversions})`,
      }).from(analytics)
        .leftJoin(campaigns, eq(analytics.campaignId, campaigns.id))
        .where(eq(analytics.workspaceId, input.workspaceId))
        .groupBy(analytics.campaignId, campaigns.name);
    }),

  topPosts: protectedProcedure.input(z.object({ workspaceId: z.number(), limit: z.number().default(5) }))
    .query(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role && ws?.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      return db.select({
        id: analytics.postId,
        platform: analytics.platform,
        impressions: sql<number>`SUM(${analytics.impressions})`,
        clicks: sql<number>`SUM(${analytics.clicks})`,
        engagements: sql<number>`SUM(${analytics.likes} + ${analytics.comments} + ${analytics.shares})`,
        title: posts.title,
        bodyText: posts.bodyText,
      }).from(analytics)
        .leftJoin(posts, eq(analytics.postId, posts.id))
        .where(eq(analytics.workspaceId, input.workspaceId))
        .groupBy(analytics.postId, analytics.platform, posts.title, posts.bodyText)
        .orderBy(desc(sql`SUM(${analytics.impressions})`))
        .limit(input.limit);
    }),

  seedDemo: protectedProcedure.input(z.object({ workspaceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      if (ws.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const platforms = ["twitter", "linkedin", "facebook", "instagram", "tiktok"] as const;
      for (const platform of platforms) {
        for (let i = 0; i < 5; i++) {
          await insertAnalytics({
            workspaceId: input.workspaceId, platform,
            impressions: Math.floor(Math.random() * 5000) + 500,
            clicks: Math.floor(Math.random() * 500) + 50,
            likes: Math.floor(Math.random() * 300) + 20,
            comments: Math.floor(Math.random() * 50) + 5,
            shares: Math.floor(Math.random() * 100) + 10,
            reach: Math.floor(Math.random() * 3000) + 300,
            utmClicks: Math.floor(Math.random() * 200) + 20,
            utmConversions: Math.floor(Math.random() * 30) + 2,
          });
        }
      }
      return { success: true };
    }),
});
