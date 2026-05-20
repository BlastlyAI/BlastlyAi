import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createCampaign, deleteCampaign, getAnalyticsByWorkspace, getCampaignById, getCampaigns, getMemberRole, getPosts, getWorkspaceById, updateCampaign } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const canEdit = async (workspaceId: number, userId: number, ws: { ownerId: number } | undefined) => {
  if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
  const role = await getMemberRole(workspaceId, userId);
  if (ws.ownerId !== userId && role !== "admin" && role !== "editor") throw new TRPCError({ code: "FORBIDDEN" });
};

export const campaignsRouter = router({
  list: protectedProcedure.input(z.object({ workspaceId: z.number() })).query(async ({ ctx, input }) => {
    const ws = await getWorkspaceById(input.workspaceId);
    const role = await getMemberRole(input.workspaceId, ctx.user.id);
    if (!role && ws?.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
    return getCampaigns(input.workspaceId);
  }),

  get: protectedProcedure.input(z.object({ id: z.number(), workspaceId: z.number() })).query(async ({ ctx, input }) => {
    const ws = await getWorkspaceById(input.workspaceId);
    const role = await getMemberRole(input.workspaceId, ctx.user.id);
    if (!role && ws?.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
    const campaign = await getCampaignById(input.id);
    if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
    const [campaignPosts, analyticsData] = await Promise.all([
      getPosts(input.workspaceId, { campaignId: input.id }),
      getAnalyticsByWorkspace(input.workspaceId, input.id),
    ]);
    return { ...campaign, posts: campaignPosts, analytics: analyticsData };
  }),

  create: protectedProcedure.input(z.object({
    workspaceId: z.number(), name: z.string().min(1).max(255),
    description: z.string().optional(), promotedUrl: z.string().optional(),
    goal: z.enum(["awareness", "traffic", "engagement", "conversions", "leads"]).optional(),
    utmSource: z.string().optional(), utmMedium: z.string().optional(), utmCampaign: z.string().optional(),
    startsAt: z.date().optional(), endsAt: z.date().optional(),
  })).mutation(async ({ ctx, input }) => {
    const ws = await getWorkspaceById(input.workspaceId);
    await canEdit(input.workspaceId, ctx.user.id, ws ?? undefined);
    await createCampaign({ ...input, createdByUserId: ctx.user.id });
    const list = await getCampaigns(input.workspaceId);
    return list[0];
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(), workspaceId: z.number(), name: z.string().optional(),
    description: z.string().optional(), promotedUrl: z.string().optional(),
    goal: z.enum(["awareness", "traffic", "engagement", "conversions", "leads"]).optional(),
    status: z.enum(["draft", "active", "paused", "completed"]).optional(),
    utmSource: z.string().optional(), utmMedium: z.string().optional(), utmCampaign: z.string().optional(),
    startsAt: z.date().optional(), endsAt: z.date().optional(),
  })).mutation(async ({ ctx, input }) => {
    const ws = await getWorkspaceById(input.workspaceId);
    await canEdit(input.workspaceId, ctx.user.id, ws ?? undefined);
    const { id, workspaceId, ...data } = input;
    await updateCampaign(id, data);
    return getCampaignById(id);
  }),

  delete: protectedProcedure.input(z.object({ id: z.number(), workspaceId: z.number() })).mutation(async ({ ctx, input }) => {
    const ws = await getWorkspaceById(input.workspaceId);
    if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
    const role = await getMemberRole(input.workspaceId, ctx.user.id);
    if (ws.ownerId !== ctx.user.id && role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    await deleteCampaign(input.id);
    return { success: true };
  }),
});
