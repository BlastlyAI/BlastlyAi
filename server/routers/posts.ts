import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createNotification, createPost, deletePost, getMemberRole, getPostById, getPostPlatforms, getPosts, getScheduledPosts, getWorkspaceById, updatePost, upsertPostPlatform } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const postsRouter = router({
  list: protectedProcedure.input(z.object({ workspaceId: z.number(), campaignId: z.number().optional(), status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role && ws?.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return getPosts(input.workspaceId, { campaignId: input.campaignId, status: input.status });
    }),

  scheduled: protectedProcedure.input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role && ws?.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return getScheduledPosts(input.workspaceId);
    }),

  get: protectedProcedure.input(z.object({ id: z.number(), workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role && ws?.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const post = await getPostById(input.id);
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      const platforms = await getPostPlatforms(input.id);
      return { ...post, platforms };
    }),

  create: protectedProcedure.input(z.object({
    workspaceId: z.number(), campaignId: z.number().optional(), title: z.string().optional(),
    bodyText: z.string().optional(), mediaUrls: z.array(z.string()).optional(), hashtags: z.array(z.string()).optional(),
    utmSource: z.string().optional(), utmMedium: z.string().optional(), utmCampaign: z.string().optional(),
    utmContent: z.string().optional(), utmTerm: z.string().optional(), trackedUrl: z.string().optional(),
    status: z.enum(["draft", "scheduled", "published", "failed", "cancelled"]).optional(),
    scheduledAt: z.date().optional(),
    platforms: z.array(z.object({
      socialAccountId: z.number(),
      platform: z.enum(["twitter", "linkedin", "facebook", "instagram", "tiktok"]),
      customText: z.string().optional(), customHashtags: z.array(z.string()).optional(),
    })).optional(),
  })).mutation(async ({ ctx, input }) => {
    const ws = await getWorkspaceById(input.workspaceId);
    if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
    const role = await getMemberRole(input.workspaceId, ctx.user.id);
    if (ws.ownerId !== ctx.user.id && role !== "admin" && role !== "editor") throw new TRPCError({ code: "FORBIDDEN" });
    const { platforms, ...postData } = input;
    const result = await createPost({ ...postData, createdByUserId: ctx.user.id });
    const insertId = (result as unknown as { insertId: number }).insertId;
    if (platforms && insertId) {
      for (const p of platforms) await upsertPostPlatform({ postId: insertId, ...p });
    }
    if (input.status === "scheduled" && insertId) {
      await createNotification({ workspaceId: input.workspaceId, userId: ctx.user.id, type: "post_scheduled", title: "Post scheduled", message: `Scheduled for ${input.scheduledAt?.toLocaleString() ?? "later"}.`, linkUrl: `/dashboard/compose?postId=${insertId}` });
    }
    return { id: insertId };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(), workspaceId: z.number(), title: z.string().optional(), bodyText: z.string().optional(),
    mediaUrls: z.array(z.string()).optional(), hashtags: z.array(z.string()).optional(),
    utmSource: z.string().optional(), utmMedium: z.string().optional(), utmCampaign: z.string().optional(),
    utmContent: z.string().optional(), utmTerm: z.string().optional(), trackedUrl: z.string().optional(),
    status: z.enum(["draft", "scheduled", "published", "failed", "cancelled"]).optional(),
    scheduledAt: z.date().nullable().optional(), campaignId: z.number().nullable().optional(),
    platforms: z.array(z.object({
      socialAccountId: z.number(),
      platform: z.enum(["twitter", "linkedin", "facebook", "instagram", "tiktok"]),
      customText: z.string().optional(), customHashtags: z.array(z.string()).optional(),
    })).optional(),
  })).mutation(async ({ ctx, input }) => {
    const ws = await getWorkspaceById(input.workspaceId);
    if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
    const role = await getMemberRole(input.workspaceId, ctx.user.id);
    if (ws.ownerId !== ctx.user.id && role !== "admin" && role !== "editor") throw new TRPCError({ code: "FORBIDDEN" });
    const { id, workspaceId, platforms, ...data } = input;
    await updatePost(id, data);
    if (platforms) for (const p of platforms) await upsertPostPlatform({ postId: id, ...p });
    return getPostById(id);
  }),

  delete: protectedProcedure.input(z.object({ id: z.number(), workspaceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (ws.ownerId !== ctx.user.id && role !== "admin" && role !== "editor") throw new TRPCError({ code: "FORBIDDEN" });
      await deletePost(input.id);
      return { success: true };
    }),

  uploadMedia: protectedProcedure.input(z.object({ workspaceId: z.number(), fileName: z.string(), contentType: z.string(), base64: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { storagePut } = await import("../storage");
      const buffer = Buffer.from(input.base64, "base64");
      const key = `${input.workspaceId}/media/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(key, buffer, input.contentType);
      return { url };
    }),
});
