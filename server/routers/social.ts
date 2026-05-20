import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { deleteSocialAccount, disconnectSocialAccount, getMemberRole, getSocialAccounts, getWorkspaceById, upsertSocialAccount } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const PLATFORM_CONFIGS = {
  twitter:   { name: "Twitter / X", color: "#000000", charLimit: 280,   scopes: ["tweet.read", "tweet.write", "users.read"] },
  linkedin:  { name: "LinkedIn",    color: "#0A66C2", charLimit: 3000,  scopes: ["r_liteprofile", "w_member_social"] },
  facebook:  { name: "Facebook",    color: "#1877F2", charLimit: 63206, scopes: ["pages_manage_posts"] },
  instagram: { name: "Instagram",   color: "#E4405F", charLimit: 2200,  scopes: ["instagram_content_publish"] },
  tiktok:    { name: "TikTok",      color: "#010101", charLimit: 2200,  scopes: ["video.upload", "video.list"] },
  reddit:    { name: "Reddit",      color: "#FF4500", charLimit: 40000, scopes: ["submit", "read", "identity"] },
  youtube:   { name: "YouTube",     color: "#FF0000", charLimit: 5000,  scopes: ["youtube.upload", "youtube.readonly"] },
  pinterest: { name: "Pinterest",   color: "#E60023", charLimit: 500,   scopes: ["boards:read", "pins:write", "user_accounts:read"] },
  bluesky:   { name: "Bluesky",     color: "#0085FF", charLimit: 300,   scopes: ["atproto"] },
} as const;

export type SocialPlatform = keyof typeof PLATFORM_CONFIGS;

const PLATFORM_ENUM = z.enum([
  "twitter", "linkedin", "facebook", "instagram", "tiktok", "reddit",
  "youtube", "pinterest", "bluesky",
]);

export const socialRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      const ws = await getWorkspaceById(input.workspaceId);
      if (!role && ws?.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const accounts = await getSocialAccounts(input.workspaceId);
      return accounts.map((a) => ({
        ...a,
        config: PLATFORM_CONFIGS[a.platform as SocialPlatform] ?? null,
        accessToken: undefined,
        refreshToken: undefined,
      }));
    }),

  platformConfigs: protectedProcedure.query(() => PLATFORM_CONFIGS),

  connect: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      platform: PLATFORM_ENUM,
      platformAccountId: z.string(),
      platformUsername: z.string().optional(),
      platformDisplayName: z.string().optional(),
      platformAvatarUrl: z.string().optional(),
      accessToken: z.string().optional(),
      refreshToken: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (ws.ownerId !== ctx.user.id && role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await upsertSocialAccount({
        ...input,
        userId: ctx.user.id,
        scopes: PLATFORM_CONFIGS[input.platform].scopes.join(","),
      });
      return { success: true };
    }),

  disconnect: protectedProcedure
    .input(z.object({ id: z.number(), workspaceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (ws.ownerId !== ctx.user.id && role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await disconnectSocialAccount(input.id);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number(), workspaceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (ws.ownerId !== ctx.user.id && role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await deleteSocialAccount(input.id);
      return { success: true };
    }),
});
