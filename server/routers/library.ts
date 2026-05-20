import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createContentLibraryItem, deleteContentLibraryItem, getContentLibrary, getMemberRole, getWorkspaceById, updateContentLibraryItem } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const libraryRouter = router({
  list: protectedProcedure.input(z.object({ workspaceId: z.number(), type: z.enum(["template","hashtag_set","brand_asset"]).optional() }))
    .query(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role && ws?.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return getContentLibrary(input.workspaceId, input.type);
    }),
  create: protectedProcedure.input(z.object({
    workspaceId: z.number(), type: z.enum(["template","hashtag_set","brand_asset"]),
    name: z.string().min(1).max(255), content: z.string().optional(),
    tags: z.array(z.string()).optional(), assetUrl: z.string().optional(),
    assetMimeType: z.string().optional(), platforms: z.array(z.string()).optional(),
  })).mutation(async ({ ctx, input }) => {
    const ws = await getWorkspaceById(input.workspaceId);
    if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
    const role = await getMemberRole(input.workspaceId, ctx.user.id);
    if (ws.ownerId !== ctx.user.id && role !== "admin" && role !== "editor") throw new TRPCError({ code: "FORBIDDEN" });
    await createContentLibraryItem({ ...input, createdByUserId: ctx.user.id });
    return { success: true };
  }),
  update: protectedProcedure.input(z.object({
    id: z.number(), workspaceId: z.number(), name: z.string().optional(),
    content: z.string().optional(), tags: z.array(z.string()).optional(), platforms: z.array(z.string()).optional(),
  })).mutation(async ({ ctx, input }) => {
    const ws = await getWorkspaceById(input.workspaceId);
    if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
    const role = await getMemberRole(input.workspaceId, ctx.user.id);
    if (ws.ownerId !== ctx.user.id && role !== "admin" && role !== "editor") throw new TRPCError({ code: "FORBIDDEN" });
    const { id, workspaceId, ...data } = input;
    await updateContentLibraryItem(id, data);
    return { success: true };
  }),
  delete: protectedProcedure.input(z.object({ id: z.number(), workspaceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (ws.ownerId !== ctx.user.id && role !== "admin" && role !== "editor") throw new TRPCError({ code: "FORBIDDEN" });
      await deleteContentLibraryItem(input.id);
      return { success: true };
    }),
  uploadAsset: protectedProcedure.input(z.object({ workspaceId: z.number(), fileName: z.string(), contentType: z.string(), base64: z.string() }))
    .mutation(async ({ input }) => {
      const { storagePut } = await import("../storage");
      const buffer = Buffer.from(input.base64, "base64");
      const key = `${input.workspaceId}/library/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(key, buffer, input.contentType);
      return { url };
    }),
});
