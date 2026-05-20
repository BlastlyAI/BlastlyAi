import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createNotification, getMemberRole, getNotifications, getUnreadNotificationCount, getWorkspaceById, markAllNotificationsRead, markNotificationRead } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const notificationsRouter = router({
  list: protectedProcedure.input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role && ws?.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return getNotifications(ctx.user.id, input.workspaceId);
    }),
  unreadCount: protectedProcedure.input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role && ws?.ownerId !== ctx.user.id) return 0;
      return getUnreadNotificationCount(ctx.user.id, input.workspaceId);
    }),
  markRead: protectedProcedure.input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => { await markNotificationRead(input.id); return { success: true }; }),
  markAllRead: protectedProcedure.input(z.object({ workspaceId: z.number() }))
    .mutation(async ({ ctx, input }) => { await markAllNotificationsRead(ctx.user.id, input.workspaceId); return { success: true }; }),
  create: protectedProcedure.input(z.object({
    workspaceId: z.number(), userId: z.number(), type: z.string(),
    title: z.string(), message: z.string().optional(), linkUrl: z.string().optional(),
  })).mutation(async ({ input }) => { await createNotification(input); return { success: true }; }),
});
