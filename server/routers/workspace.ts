import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import { z } from "zod";
import {
  addWorkspaceMember, createWorkspace, getMemberRole, getWorkspaceById,
  getWorkspaceMembers, getWorkspacesByUser, removeWorkspaceMember,
  updateMemberRole, updateWorkspace, getUserByOpenId, getAllWorkspaces,
  createConnectedApp, listConnectedApps, deactivateConnectedApp, listWebhookEvents,
  deductCredits, addCredits, listCreditTransactions,
  getSetupProgress, saveSetupProgress, getAllSetupProgress,
  adminGetClientIntelligence, incrementMonthlyStat,
} from "../db";
import { socialProvider, SUPPORTED_PLATFORMS, type Platform } from "../socialProvider";
import { protectedProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 7);
}

const TONE_OPTIONS = ["professional", "friendly", "playful", "educational", "inspirational", "bold", "casual"] as const;
const INDUSTRY_OPTIONS = ["technology", "education", "health", "finance", "retail", "food", "travel", "entertainment", "real_estate", "other"] as const;

export const workspaceRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getWorkspacesByUser(ctx.user.id);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.id);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      const role = await getMemberRole(input.id, ctx.user.id);
      const isOwner = ws.ownerId === ctx.user.id;
      if (!role && !isOwner) throw new TRPCError({ code: "FORBIDDEN" });
      return { ...ws, myRole: isOwner ? "admin" : role };
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const slug = slugify(input.name);
      await createWorkspace({ name: input.name, slug, ownerId: ctx.user.id });
      const workspaces = await getWorkspacesByUser(ctx.user.id);
      return workspaces.find((w) => w.slug === slug) ?? workspaces[0];
    }),

  // Create a brand workspace with initial profile data in one step
  createBrand: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      website: z.string().optional(),
      industry: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const slug = slugify(input.name);
      await createWorkspace({ name: input.name, slug, ownerId: ctx.user.id });
      const workspaces = await getWorkspacesByUser(ctx.user.id);
      const ws = workspaces.find((w) => w.slug === slug) ?? workspaces[0];
      if (ws && (input.website || input.industry || input.description)) {
        await updateWorkspace(ws.id, {
          name: input.name,
          ...(input.website && { website: input.website }),
          ...(input.industry && { industry: input.industry }),
          ...(input.description && { description: input.description }),
        } as Parameters<typeof updateWorkspace>[1]);
      }
      return ws;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), logoUrl: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.id);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      if (ws.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...data } = input;
      await updateWorkspace(id, data);
      return getWorkspaceById(id);
    }),

  // Full brand profile update
  updateBrandProfile: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(100).optional(),
      website: z.string().optional(),
      industry: z.string().optional(),
      description: z.string().optional(),
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      toneOfVoice: z.string().optional(),
      targetAudience: z.string().optional(),
      logoBase64: z.string().optional(),  // base64 encoded image for upload
      logoFileName: z.string().optional(),
      // Extended profile fields (pre-filled from audit)
      googleReviewUrl: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      tagline: z.string().optional(),
      geographicReach: z.string().optional(),
      locationCity: z.string().optional(),
      locationState: z.string().optional(),
      locationCountry: z.string().optional(),
      // Multi-select industry + contact fields
      industries: z.array(z.string()).optional(),
      otherIndustry: z.string().optional(),
      ageRanges: z.array(z.string()).optional(),
      contactEmail: z.string().optional(),
      contactMobile: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.id);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      if (ws.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      let logoUrl = ws.logoUrl;
      if (input.logoBase64 && input.logoFileName) {
        const buffer = Buffer.from(input.logoBase64, "base64");
        const ext = input.logoFileName.split(".").pop() ?? "png";
        const key = `workspace-logos/${input.id}-${Date.now()}.${ext}`;
        const contentType = ext === "svg" ? "image/svg+xml" : ext === "jpg" ? "image/jpeg" : `image/${ext}`;
        const { url } = await storagePut(key, buffer, contentType);
        logoUrl = url;
      }

      const updateData: Record<string, unknown> = {};
      if (input.name) updateData.name = input.name;
      if (input.website !== undefined) updateData.website = input.website;
      if (input.industry !== undefined) updateData.industry = input.industry;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.primaryColor !== undefined) updateData.primaryColor = input.primaryColor;
      if (input.secondaryColor !== undefined) updateData.secondaryColor = input.secondaryColor;
      if (input.toneOfVoice !== undefined) updateData.toneOfVoice = input.toneOfVoice;
      if (input.targetAudience !== undefined) updateData.targetAudience = input.targetAudience;
      if (logoUrl !== ws.logoUrl) updateData.logoUrl = logoUrl;
      // Extended profile fields
      if (input.googleReviewUrl !== undefined) updateData.googleReviewUrl = input.googleReviewUrl;
      if (input.phone !== undefined) updateData.phone = input.phone;
      if (input.address !== undefined) updateData.address = input.address;
      if (input.tagline !== undefined) updateData.tagline = input.tagline;
      if (input.geographicReach !== undefined) updateData.geographicReach = input.geographicReach;
      if (input.locationCity !== undefined) updateData.locationCity = input.locationCity;
      if (input.locationState !== undefined) updateData.locationState = input.locationState;
      if (input.locationCountry !== undefined) updateData.locationCountry = input.locationCountry;
      // New fields
      if (input.industries !== undefined) updateData.industries = JSON.stringify(input.industries);
      if (input.otherIndustry !== undefined) updateData.otherIndustry = input.otherIndustry;
      if (input.ageRanges !== undefined) updateData.ageRanges = JSON.stringify(input.ageRanges);
      if (input.contactEmail !== undefined) updateData.contactEmail = input.contactEmail;
      if (input.contactMobile !== undefined) updateData.contactMobile = input.contactMobile;

      await updateWorkspace(input.id, updateData as Parameters<typeof updateWorkspace>[1]);
      return getWorkspaceById(input.id);
    }),

  members: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role && ws.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const members = await getWorkspaceMembers(input.workspaceId);
      return members;
    }),

  inviteMember: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      openId: z.string().optional(),
      email: z.string().email().optional(),
      role: z.enum(["admin", "editor", "viewer"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      const myRole = await getMemberRole(input.workspaceId, ctx.user.id);
      if (ws.ownerId !== ctx.user.id && myRole !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

      let targetUser = null;
      if (input.openId) targetUser = await getUserByOpenId(input.openId);
      if (!targetUser && input.email) {
        const { getDb } = await import("../db");
        const { users } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (db) {
          const result = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
          targetUser = result[0] ?? null;
        }
      }
      if (!targetUser) throw new TRPCError({ code: "NOT_FOUND", message: "User not found. They must sign in to Blastly first." });

      await addWorkspaceMember({
        workspaceId: input.workspaceId,
        userId: targetUser.id,
        role: input.role,
        invitedByUserId: ctx.user.id,
      });
      return { success: true };
    }),

  updateMemberRole: protectedProcedure
    .input(z.object({ memberId: z.number(), workspaceId: z.number(), role: z.enum(["admin", "editor", "viewer"]) }))
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      const myRole = await getMemberRole(input.workspaceId, ctx.user.id);
      if (ws.ownerId !== ctx.user.id && myRole !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await updateMemberRole(input.memberId, input.role);
      return { success: true };
    }),

  removeMember: protectedProcedure
    .input(z.object({ memberId: z.number(), workspaceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      const myRole = await getMemberRole(input.workspaceId, ctx.user.id);
      if (ws.ownerId !== ctx.user.id && myRole !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await removeWorkspaceMember(input.memberId);
      return { success: true };
    }),

  // ── Owner-only: list ALL workspaces across all users (admin dashboard) ──
  adminListAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return getAllWorkspaces();
  }),

  /** Admin-only: enriched client journey intelligence (platforms, onboarding steps, last active, churn risk). */
  adminClientIntelligence: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return adminGetClientIntelligence();
  }),

  // ── Connected Apps (universal webhook integration) ────────────────────────────────
  registerApp: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      appName: z.string().min(1).max(128),
      appSlug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
    }))
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      if (ws.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      // Generate a secure random webhook secret
      const secret = "blastly_" + Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, "0")).join("");
      await createConnectedApp({
        workspaceId: input.workspaceId,
        appSlug: input.appSlug,
        appName: input.appName,
        webhookSecret: secret,
      });
      return { webhookSecret: secret, webhookUrl: "/api/webhooks/app-events" };
    }),

  listApps: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      if (ws.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return listConnectedApps(input.workspaceId);
    }),

  revokeApp: protectedProcedure
    .input(z.object({ appId: z.number(), workspaceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      if (ws.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await deactivateConnectedApp(input.appId);
      return { success: true };
    }),

  listEvents: protectedProcedure
    .input(z.object({ workspaceId: z.number(), limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      if (ws.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return listWebhookEvents(input.workspaceId, input.limit ?? 20);
    }),

  // ── Ayrshare / Managed Social ─────────────────────────────────────────────

  /**
   * Publish a post via Ayrshare to one or more platforms.
   * Deducts 5 credits per platform posted to.
   */
  publishViaAyrshare: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      platforms: z.array(z.string()),
      text: z.string().min(1),
      mediaUrls: z.array(z.string()).optional(),
      scheduleAt: z.string().optional(),  // ISO datetime string
    }))
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      if (ws.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const platforms = input.platforms as Platform[];
      const creditsRequired = platforms.length * 5;

      // Deduct credits (throws if insufficient)
      await deductCredits(input.workspaceId, creditsRequired, `Post to ${platforms.join(", ")}`);

      // Publish via social provider (uses profileKey if set, otherwise workspace name)
      const profileKey = ws.ayrshareProfileKey ?? `workspace_${input.workspaceId}`;
      const result = await socialProvider.publishPost(
        profileKey,
        platforms,
        input.text,
        input.mediaUrls,
        input.scheduleAt,
      );

      // Increment monthly stats counter for social posts
      if (!input.scheduleAt) {
        incrementMonthlyStat(input.workspaceId, "socialPostsPublished").catch(() => {});
      }

      return { ...result, creditsUsed: creditsRequired };
    }),

  /**
   * Start the Managed Social onboarding wizard.
   * Creates an Ayrshare profile for the workspace and records the step.
   */
  startManagedOnboarding: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      brandName: z.string().min(1),
      selectedPlatforms: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      if (ws.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      // Create social provider profile if not already created
      let profileKey = ws.ayrshareProfileKey;
      if (!profileKey) {
        const profile = await socialProvider.createProfile(input.workspaceId, input.brandName);
        profileKey = profile.profileKey;
      }

      await updateWorkspace(input.workspaceId, {
        ayrshareProfileKey: profileKey,
        onboardingStep: 1,
        ...(input.selectedPlatforms && { selectedPlatforms: input.selectedPlatforms }),
      });

      return { profileKey, mockMode: socialProvider.mockMode };
    }),

  /**
   * Complete the onboarding wizard (called after payment succeeds).
   */
  completeOnboarding: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      selectedPlatforms: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      if (ws.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      await updateWorkspace(input.workspaceId, {
        selectedPlatforms: input.selectedPlatforms,
        onboardingStep: 5,
        onboardingComplete: true,
        planTier: "managed_social",
      });

      return { success: true };
    }),

  /**
   * Generate a social account linking URL for a workspace.
   * Opens the provider's hosted OAuth page in a new tab so the client can
   * connect their social accounts without any technical knowledge.
   */
  getLinkingUrl: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      redirectUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (ws.ownerId !== ctx.user.id && role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

      // Ensure a provider profile exists for this workspace
      let profileKey = ws.ayrshareProfileKey;
      if (!profileKey) {
        const profile = await socialProvider.createProfile(input.workspaceId, ws.name);
        profileKey = profile.profileKey;
        await updateWorkspace(input.workspaceId, { ayrshareProfileKey: profileKey });
      }

      const linkingUrl = await socialProvider.generateLinkingUrl(profileKey, input.redirectUrl);
      return { linkingUrl, profileKey, mockMode: socialProvider.mockMode, providerName: socialProvider.providerName };
    }),

  /**
   * Get all data needed to render the branded client portal.
   */
  getPortalData: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role && ws.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const analytics = await socialProvider.getAnalytics(ws.ayrshareProfileKey ?? `workspace_${ws.id}`);
      const connectedPlatforms = await socialProvider.getConnectedPlatforms(ws.ayrshareProfileKey ?? `workspace_${ws.id}`);
      const transactions = await listCreditTransactions(input.workspaceId, 10);

      return {
        workspace: ws,
        analytics,
        connectedPlatforms,
        recentTransactions: transactions,
        mockMode: socialProvider.mockMode,
      };
    }),

  /**
   * Get credit balance and transaction history for a workspace.
   */
  getCreditBalance: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      if (ws.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const transactions = await listCreditTransactions(input.workspaceId, 20);
      return { balance: ws.creditsBalance ?? 0, transactions };
    }),

  // --- Health Monitor --------------------------------------------------------
  getHealthStatus: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      if (ws.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const { getLatestHealthChecks } = await import("../healthMonitor");
      return getLatestHealthChecks(input.workspaceId);
    }),

  getHealthHistory: protectedProcedure
    .input(z.object({ connectedAppId: z.number(), workspaceId: z.number(), hours: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      if (ws.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const { getHealthHistory } = await import("../healthMonitor");
      return getHealthHistory(input.connectedAppId, input.hours ?? 24);
    }),

  /**
   * Get the 3-step social setup progress for a workspace.
   * Returns null if the client hasn't started yet (treated as all defaults).
   */
  getSetupProgress: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (ws.ownerId !== ctx.user.id && !role) throw new TRPCError({ code: "FORBIDDEN" });
      const progress = await getSetupProgress(input.workspaceId);
      return progress ?? {
        workspaceId: input.workspaceId,
        step1Done: false,
        step2Done: false,
        step3Done: false,
        activeStep: 1,
        completedSetups: [] as string[],
        updatedAt: new Date(),
      };
    }),

  /**
   * Save (upsert) the 3-step social setup progress for a workspace.
   * Called automatically by the UI on every state change.
   */
  saveSetupProgress: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      step1Done: z.boolean().optional(),
      step2Done: z.boolean().optional(),
      step3Done: z.boolean().optional(),
      activeStep: z.number().min(1).max(3).optional(),
      completedSetups: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (ws.ownerId !== ctx.user.id && !role) throw new TRPCError({ code: "FORBIDDEN" });
      const { workspaceId, ...data } = input;
      await saveSetupProgress(workspaceId, data);
      return { success: true };
    }),

  /**
   * Admin-only: aggregate setup progress stats across all workspaces.
   * Returns overall completion rate, per-step counts, and per-client breakdown.
   */
  adminGetSetupStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const [allWorkspaces, allProgress] = await Promise.all([
      getAllWorkspaces(),
      getAllSetupProgress(),
    ]);
    const progressMap = new Map(allProgress.map(p => [p.workspaceId, p]));
    const total = allWorkspaces.length;
    const step1Count = allProgress.filter(p => p.step1Done).length;
    const step2Count = allProgress.filter(p => p.step2Done).length;
    const step3Count = allProgress.filter(p => (p.activeStep ?? 1) >= 3).length;
    const fullyComplete = allProgress.filter(p => p.step1Done && p.step2Done && (p.activeStep ?? 1) >= 3).length;
    const notStarted = allWorkspaces.filter(w => !progressMap.has(w.id)).length;
    const clients = allWorkspaces.map(ws => {
      const p = progressMap.get(ws.id);
      const stepsReached = p
        ? [p.step1Done, p.step2Done, (p.activeStep ?? 1) >= 3].filter(Boolean).length
        : 0;
      return {
        workspaceId: ws.id,
        name: ws.name,
        website: ws.website ?? null,
        logoUrl: ws.logoUrl ?? null,
        planTier: ws.planTier ?? "free",
        step1Done: p?.step1Done ?? false,
        step2Done: p?.step2Done ?? false,
        step3Reached: (p?.activeStep ?? 1) >= 3,
        stepsReached,
        completedSetups: (p?.completedSetups as string[] | null) ?? [],
        lastUpdated: p?.updatedAt ?? null,
      };
    });
    return {
      total,
      notStarted,
      step1Count,
      step2Count,
      step3Count,
      fullyComplete,
      overallRate: total > 0 ? Math.round((fullyComplete / total) * 100) : 0,
      clients,
    };
  }),

  // ─── Generate Platform-Specific Bios from Brand Profile ──────────────────
  generatePlatformBios: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });

      // Build brand context from workspace fields
      const brandContext = [
        `Business name: ${ws.name}`,
        ws.industry ? `Industry: ${ws.industry}` : null,
        ws.description ? `Description: ${ws.description}` : null,
        ws.tagline ? `Tagline: ${ws.tagline}` : null,
        ws.website ? `Website: ${ws.website}` : null,
        ws.phone ? `Phone: ${ws.phone}` : null,
        ws.address ? `Address: ${ws.address}` : null,
        ws.locationCity ? `City: ${ws.locationCity}` : null,
        ws.locationState ? `State: ${ws.locationState}` : null,
        ws.locationCountry ? `Country: ${ws.locationCountry}` : null,
        ws.toneOfVoice ? `Tone of voice: ${ws.toneOfVoice}` : null,
        ws.targetAudience ? `Target audience: ${ws.targetAudience}` : null,
        ws.geographicReach ? `Geographic reach: ${ws.geographicReach}` : null,
      ].filter(Boolean).join("\n");

      if (!brandContext || brandContext.length < 20) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Please complete your Brand Profile first so we can generate your bios." });
      }

      const platformSpecs = [
        { id: "instagram", name: "Instagram", maxChars: 150, notes: "No links work in bio except the website field. Use emojis sparingly. Include location if local business." },
        { id: "facebook", name: "Facebook Page", maxChars: 255, notes: "Can include phone, address, website. Friendly and approachable tone." },
        { id: "tiktok", name: "TikTok", maxChars: 80, notes: "Very short. Punchy. Can include one emoji. No links in bio text." },
        { id: "linkedin", name: "LinkedIn Company Page", maxChars: 300, notes: "Professional tone. Include what you do, who you help, and your key differentiator." },
        { id: "google_business", name: "Google Business Profile", maxChars: 750, notes: "Include keywords naturally. Mention location, services, and what makes you different. No promotional language like 'best' or 'cheapest'." },
        { id: "youtube", name: "YouTube Channel", maxChars: 1000, notes: "Describe what content you post, who it's for, and how often you post. Include website." },
        { id: "twitter_x", name: "Twitter / X", maxChars: 160, notes: "Short, punchy, personality-driven. Can include hashtags or location." },
        { id: "pinterest", name: "Pinterest", maxChars: 160, notes: "Describe what you pin and who your boards are for. Keyword-rich." },
        { id: "bluesky", name: "Bluesky", maxChars: 300, notes: "Conversational and authentic. Similar to Twitter but slightly longer." },
      ];

      const prompt = `You are a professional social media copywriter. Using the brand information below, write optimised bios for each social media platform. Each bio must be within the character limit, match the platform's tone and conventions, and feel authentic — not like a generic template.\n\nBRAND INFORMATION:\n${brandContext}\n\nWrite bios for these platforms:\n${platformSpecs.map(p => `- ${p.name} (max ${p.maxChars} chars): ${p.notes}`).join("\n")}\n\nReturn a JSON object with platform IDs as keys and bio text as values. Example: {"instagram": "...", "facebook": "...", ...}\nOnly return the JSON object, nothing else.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a professional social media copywriter. Always return valid JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      let bios: Record<string, string> = {};
      try {
        const rawContent = response.choices?.[0]?.message?.content ?? "{}";
        const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
        bios = JSON.parse(content);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse bio response" });
      }

      // Also return the pre-filled fields for each platform
      const prefilledFields = {
        businessName: ws.name,
        website: ws.website ?? "",
        phone: ws.phone ?? "",
        address: ws.address ?? "",
        city: ws.locationCity ?? "",
        state: ws.locationState ?? "",
        country: ws.locationCountry ?? "",
        email: "", // user fills this
        logoUrl: ws.logoUrl ?? "",
        primaryColor: ws.primaryColor ?? "",
        industry: ws.industry ?? "",
        tagline: ws.tagline ?? "",
      };

      return { bios, prefilledFields };
    }),

  /**
   * Transcribe a voice recording and optionally AI-extract brand summary.
   * Accepts a base64-encoded audio blob (webm/mp3/wav) and returns the transcript.
   */
  transcribeBrandVoice: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      audioBase64: z.string(),
      mimeType: z.string().default("audio/webm"),
    }))
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      if (ws.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      // Upload audio to S3
      const { storagePut } = await import("../storage");
      const { transcribeAudio } = await import("../_core/voiceTranscription");
      const ext = input.mimeType.includes("mp3") ? "mp3" : input.mimeType.includes("wav") ? "wav" : "webm";
      const audioBuffer = Buffer.from(input.audioBase64, "base64");
      const key = `brand-voice/${input.workspaceId}/${Date.now()}.${ext}`;
      const { url: audioUrl } = await storagePut(key, audioBuffer, input.mimeType);

      // Transcribe
      const result = await transcribeAudio({
        audioUrl,
        language: "en",
        prompt: "Business description, brand voice, services, target audience",
      });
      if ("code" in result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (result as { code: string; details?: string }).details ?? "Transcription failed" });

      // AI-clean the transcript into a polished brand description
      const llmResult = await invokeLLM({
        messages: [
          { role: "system", content: "You are a brand copywriter. The user has spoken a rough description of their business. Clean and polish it into 2-3 concise, professional sentences suitable for a brand profile. Keep it factual and in first person (e.g. 'We are...'). Do not add information not mentioned. Return only the polished description, no preamble." },
          { role: "user", content: result.text },
        ],
      });
       const polished: string = (llmResult as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content ?? result.text;
      return { transcript: result.text, polished };
    }),

  /**
   * Silently merge the AI-generated audit summary with the customer's own words
   * into a single polished brand description. Called during onboarding step 1 save.
   */
  mergeDescription: protectedProcedure
    .input(z.object({
      auditSummary: z.string().optional(),
      customerWords: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { auditSummary, customerWords } = input;
      // If only one source, just return it (possibly lightly polished)
      if (!auditSummary && !customerWords) return { polished: "" };
      if (!customerWords) return { polished: auditSummary ?? "" };
      if (!auditSummary) {
        // Polish the customer's words alone
        const res = await invokeLLM({
          messages: [
            { role: "system", content: "You are a brand copywriter. Polish the following business description into 2-3 concise, professional sentences in first person (e.g. 'We are...'). Keep it factual. Return only the polished text, no preamble." },
            { role: "user", content: customerWords },
          ],
        });
        const text = (res as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content ?? customerWords;
        return { polished: text };
      }
      // Both sources — merge them
      const prompt = `Audit-generated summary:\n${auditSummary}\n\nBusiness owner's own words:\n${customerWords}`;
      const res = await invokeLLM({
        messages: [
          { role: "system", content: "You are a brand copywriter. You have been given two descriptions of the same business: one generated from a website audit, and one written by the business owner in their own words. Merge them into a single, polished 2-3 sentence brand description in first person (e.g. 'We are...'). Prioritise the owner's voice and personality while keeping the factual accuracy of the audit summary. Do not invent new information. Return only the final description, no preamble." },
          { role: "user", content: prompt },
        ],
      });
      const merged = (res as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content ?? `${auditSummary} ${customerWords}`;
      return { polished: merged };
    }),
});
