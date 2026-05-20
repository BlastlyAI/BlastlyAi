import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  agentRuns, viralityScores, websiteAnalyses, brandProfiles,
  trendReports, competitorMonitors, multimodalCampaigns, roiPredictions,
  posts, analytics, campaigns,
} from "../../drizzle/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { llmJson, llmText, updateAgentRun, appendStep, getOptimalPostingTime, type AgentStep } from "../agents/runner";
import { fetchPageText } from "../agents/fetcher";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const agentsRouter = router({

  // ── 1. Autonomous Campaign Agent ──────────────────────────────────────────

  runCampaignAgent: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      url: z.string().url(),
      goal: z.enum(["awareness", "traffic", "engagement", "conversions", "leads"]),
      platforms: z.array(z.enum(["twitter", "linkedin", "facebook", "instagram", "tiktok"])),
      requireApproval: z.boolean().default(true),
      brandProfileId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      // Create the run record
      const [result] = await db.insert(agentRuns).values({
        workspaceId: input.workspaceId,
        createdByUserId: ctx.user.id,
        type: "campaign_agent",
        status: "running",
        inputData: input,
        steps: [],
        startedAt: new Date(),
      });
      const runId = (result as any).insertId as number;

      let steps: AgentStep[] = [];

      try {
        // Step 1: Fetch and analyse the URL
        steps = await appendStep(runId, { stepName: "Fetching website content", status: "running", timestamp: new Date().toISOString() }, steps);
        const page = await fetchPageText(input.url);
        steps = await appendStep(runId, { stepName: "Fetching website content", status: "completed", output: { title: page.title }, timestamp: new Date().toISOString() }, []);

        // Step 2: Extract features & benefits
        steps = await appendStep(runId, { stepName: "Extracting features & benefits", status: "running", timestamp: new Date().toISOString() }, steps);
        const extraction = await llmJson<{
          productName: string; tagline: string; features: string[]; benefits: string[];
          targetAudience: string; tone: string; uniqueSellingPoints: string[];
        }>(
          "You are a marketing intelligence AI. Extract structured product/service information from webpage content.",
          `URL: ${input.url}\nTitle: ${page.title}\nContent: ${page.text}\n\nReturn JSON with: productName, tagline, features (array), benefits (array), targetAudience, tone, uniqueSellingPoints (array).`
        );
        steps = await appendStep(runId, { stepName: "Extracting features & benefits", status: "completed", output: extraction, timestamp: new Date().toISOString() }, steps);

        // Step 3: Get brand voice if profile provided
        let brandVoiceContext = "";
        if (input.brandProfileId) {
          const [profile] = await db.select().from(brandProfiles)
            .where(and(eq(brandProfiles.id, input.brandProfileId), eq(brandProfiles.workspaceId, input.workspaceId)));
          if (profile?.styleProfile) {
            brandVoiceContext = `\n\nBrand voice profile: ${JSON.stringify(profile.styleProfile)}. Match this voice exactly.`;
          }
        }

        // Step 4: Generate campaign brief
        steps = await appendStep(runId, { stepName: "Generating campaign brief", status: "running", timestamp: new Date().toISOString() }, steps);
        const brief = await llmJson<{
          campaignName: string; theme: string; keyMessage: string;
          callToAction: string; hashtags: string[];
        }>(
          "You are a senior marketing strategist. Create a concise campaign brief.",
          `Product: ${JSON.stringify(extraction)}\nGoal: ${input.goal}\nPlatforms: ${input.platforms.join(", ")}${brandVoiceContext}\n\nReturn JSON: campaignName, theme, keyMessage, callToAction, hashtags (array of 5-8).`
        );
        steps = await appendStep(runId, { stepName: "Generating campaign brief", status: "completed", output: brief, timestamp: new Date().toISOString() }, steps);

        // Step 5: Generate platform-specific posts
        steps = await appendStep(runId, { stepName: "Generating platform posts", status: "running", timestamp: new Date().toISOString() }, steps);
        const platformPosts: Record<string, { text: string; hashtags: string[]; scheduledAt: string }> = {};
        for (const platform of input.platforms) {
          const charLimits: Record<string, number> = { twitter: 280, linkedin: 3000, facebook: 2000, instagram: 2200 };
          const post = await llmJson<{ text: string; hashtags: string[] }>(
            `You are a ${platform} content expert. Write platform-native posts.`,
            `Campaign: ${JSON.stringify(brief)}\nProduct: ${JSON.stringify(extraction)}\nGoal: ${input.goal}${brandVoiceContext}\n\nWrite a ${platform} post (max ${charLimits[platform]} chars). Return JSON: text, hashtags (array).`
          );
          platformPosts[platform] = {
            ...post,
            scheduledAt: getOptimalPostingTime(platform, Object.keys(platformPosts).length).toISOString(),
          };
        }
        steps = await appendStep(runId, { stepName: "Generating platform posts", status: "completed", output: { platforms: Object.keys(platformPosts) }, timestamp: new Date().toISOString() }, steps);

        // Step 6: Score virality for each post
        steps = await appendStep(runId, { stepName: "Scoring virality", status: "running", timestamp: new Date().toISOString() }, steps);
        const viralityResults: Record<string, { score: number; confidence: number; suggestions: string[] }> = {};
        for (const [platform, post] of Object.entries(platformPosts)) {
          const scores = await llmJson<{ score: number; confidence: number; suggestions: string[]; factors: string[] }>(
            "You are a social media algorithm expert. Score content virality potential.",
            `Platform: ${platform}\nPost: ${post.text}\nHashtags: ${post.hashtags.join(", ")}\nGoal: ${input.goal}\n\nReturn JSON: score (0-100), confidence (0-100), suggestions (array of 3 improvements), factors (array of key algorithm factors).`
          );
          viralityResults[platform] = { score: scores.score, confidence: scores.confidence, suggestions: scores.suggestions };
          await db.insert(viralityScores).values({
            workspaceId: input.workspaceId,
            platform: platform as any,
            score: scores.score,
            confidence: scores.confidence,
            suggestions: scores.suggestions,
            algorithmFactors: scores.factors,
          });
        }
        steps = await appendStep(runId, { stepName: "Scoring virality", status: "completed", output: viralityResults, timestamp: new Date().toISOString() }, steps);

        // Compile final output
        const outputData = {
          extraction,
          brief,
          platformPosts,
          viralityScores: viralityResults,
          requiresApproval: input.requireApproval,
        };

        await updateAgentRun(runId, {
          status: input.requireApproval ? "awaiting_approval" : "completed",
          steps,
          outputData,
          completedAt: new Date(),
        });

        return { runId, status: input.requireApproval ? "awaiting_approval" : "completed", outputData };

      } catch (err: any) {
        await updateAgentRun(runId, {
          status: "failed",
          steps,
          errorMessage: err.message,
          completedAt: new Date(),
        });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  approveAgentRun: protectedProcedure
    .input(z.object({ runId: z.number(), workspaceId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await updateAgentRun(input.runId, { status: "approved" });
      return { success: true };
    }),

  getAgentRun: protectedProcedure
    .input(z.object({ runId: z.number(), workspaceId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [run] = await db.select().from(agentRuns)
        .where(and(eq(agentRuns.id, input.runId), eq(agentRuns.workspaceId, input.workspaceId)));
      return run ?? null;
    }),

  listAgentRuns: protectedProcedure
    .input(z.object({ workspaceId: z.number(), type: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [eq(agentRuns.workspaceId, input.workspaceId)];
      if (input.type) conditions.push(eq(agentRuns.type, input.type as any));
      return db.select().from(agentRuns).where(and(...conditions)).orderBy(desc(agentRuns.createdAt)).limit(20);
    }),

  // ── 2. Virality Predictor ─────────────────────────────────────────────────

  predictVirality: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      content: z.string(),
      hashtags: z.array(z.string()).optional(),
      platforms: z.array(z.enum(["twitter", "linkedin", "facebook", "instagram", "tiktok"])),
      postId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const results: Array<{ platform: string; score: number; confidence: number; suggestions: string[]; factors: string[] }> = [];

      for (const platform of input.platforms) {
        const scored = await llmJson<{ score: number; confidence: number; suggestions: string[]; factors: string[] }>(
          `You are a ${platform} algorithm expert with deep knowledge of 2025-2026 engagement patterns. Score content virality.`,
          `Platform: ${platform}\nContent: ${input.content}\nHashtags: ${(input.hashtags ?? []).join(", ")}\n\nAnalyze based on: hook strength, emotional resonance, shareability, hashtag relevance, optimal length, call-to-action clarity, trending alignment.\n\nReturn JSON: score (0-100), confidence (0-100), suggestions (array of exactly 3 specific improvements), factors (array of 4 key factors affecting this score).`
        );

        await db.insert(viralityScores).values({
          workspaceId: input.workspaceId,
          postId: input.postId,
          platform: platform as any,
          score: scored.score,
          confidence: scored.confidence,
          suggestions: scored.suggestions,
          algorithmFactors: scored.factors,
        });

        results.push({ platform, ...scored });
      }

      return results;
    }),

  // ── 3. Website Intelligence Engine ───────────────────────────────────────

  analyzeWebsite: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      url: z.string().url(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const page = await fetchPageText(input.url);

      const extracted = await llmJson<{
        productName: string;
        tagline: string;
        features: string[];
        benefits: string[];
        targetAudience: string;
        tone: string;
        uniqueSellingPoints: string[];
        recentUpdates: string[];
        pricingInfo: string;
        callToActions: string[];
        contentOpportunities: string[];
      }>(
        "You are a marketing intelligence AI. Deeply analyze a webpage and extract all marketing-relevant information.",
        `URL: ${input.url}\nTitle: ${page.title}\nContent: ${page.text}\n\nExtract: productName, tagline, features (array), benefits (array), targetAudience, tone, uniqueSellingPoints (array), recentUpdates (array of any news/updates found), pricingInfo (string), callToActions (array), contentOpportunities (array of 5 content ideas for social media).`
      );

      // Upsert analysis
      const existing = await db.select().from(websiteAnalyses)
        .where(and(eq(websiteAnalyses.workspaceId, input.workspaceId), eq(websiteAnalyses.url, input.url)))
        .limit(1);

      if (existing.length > 0) {
        await db.update(websiteAnalyses)
          .set({ extractedData: extracted, pageTitle: page.title, lastAnalyzedAt: new Date() })
          .where(eq(websiteAnalyses.id, existing[0].id));
        return { id: existing[0].id, url: input.url, pageTitle: page.title, extractedData: extracted };
      } else {
        const [res] = await db.insert(websiteAnalyses).values({
          workspaceId: input.workspaceId,
          url: input.url,
          pageTitle: page.title,
          extractedData: extracted,
        });
        return { id: (res as any).insertId, url: input.url, pageTitle: page.title, extractedData: extracted };
      }
    }),

  listWebsiteAnalyses: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(websiteAnalyses)
        .where(eq(websiteAnalyses.workspaceId, input.workspaceId))
        .orderBy(desc(websiteAnalyses.lastAnalyzedAt))
        .limit(20);
    }),

  // ── 4. Brand Personality Cloner ───────────────────────────────────────────

  trainBrandVoice: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      name: z.string(),
      trainingContent: z.string().min(50),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      const styleProfile = await llmJson<{
        tone: string; vocabulary: string; sentenceLength: string;
        emojiUsage: string; hashtagStyle: string; values: string[];
        writingPatterns: string[]; avoidPatterns: string[];
        brandPersonality: string; examplePhrases: string[];
      }>(
        "You are a brand voice analyst. Analyze writing samples and extract a detailed brand voice profile.",
        `Writing samples:\n${input.trainingContent}\n\nAnalyze and return JSON: tone, vocabulary (formal/casual/technical), sentenceLength (short/medium/long/mixed), emojiUsage (none/minimal/moderate/heavy), hashtagStyle (descriptive/trending/branded/mixed), values (array of brand values), writingPatterns (array of recurring patterns), avoidPatterns (array of things to avoid), brandPersonality (one paragraph), examplePhrases (array of 5 characteristic phrases).`
      );

      // Generate sample outputs in this voice
      const sampleOutputs = await llmJson<string[]>(
        "You are a brand voice writer. Generate sample posts that perfectly match the given brand voice profile.",
        `Brand voice: ${JSON.stringify(styleProfile)}\n\nGenerate 3 sample social media posts (one for Twitter, one for LinkedIn, one for Instagram) that perfectly match this brand voice. Return as JSON array of strings.`
      );

      const [res] = await db.insert(brandProfiles).values({
        workspaceId: input.workspaceId,
        name: input.name,
        trainingContent: input.trainingContent,
        styleProfile,
        sampleOutputs,
        createdByUserId: ctx.user.id,
      });

      return { id: (res as any).insertId, name: input.name, styleProfile, sampleOutputs };
    }),

  applyBrandVoice: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      brandProfileId: z.number(),
      content: z.string(),
      platform: z.enum(["twitter", "linkedin", "facebook", "instagram", "tiktok"]),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [profile] = await db.select().from(brandProfiles)
        .where(and(eq(brandProfiles.id, input.brandProfileId), eq(brandProfiles.workspaceId, input.workspaceId)));
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Brand profile not found" });

      const rewritten = await llmText(
        `You are a brand voice writer. Rewrite content to perfectly match the given brand voice profile while preserving the core message.`,
        `Brand voice: ${JSON.stringify(profile.styleProfile)}\nPlatform: ${input.platform}\nOriginal content: ${input.content}\n\nRewrite this content in the brand voice. Return only the rewritten text, no explanations.`
      );

      return { rewritten, profileName: profile.name };
    }),

  listBrandProfiles: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(brandProfiles)
        .where(eq(brandProfiles.workspaceId, input.workspaceId))
        .orderBy(desc(brandProfiles.createdAt));
    }),

  activateBrandProfile: protectedProcedure
    .input(z.object({ workspaceId: z.number(), profileId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      // Deactivate all, then activate selected
      await db.update(brandProfiles).set({ isActive: false })
        .where(eq(brandProfiles.workspaceId, input.workspaceId));
      await db.update(brandProfiles).set({ isActive: true })
        .where(and(eq(brandProfiles.id, input.profileId), eq(brandProfiles.workspaceId, input.workspaceId)));
      return { success: true };
    }),

  // ── 5. Competitor & Trend Agent ───────────────────────────────────────────

  runTrendScan: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      keywords: z.array(z.string()),
      industry: z.string(),
      platforms: z.array(z.enum(["twitter", "linkedin", "facebook", "instagram", "tiktok"])),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const scanResult = await llmJson<{
        trendingTopics: Array<{ topic: string; momentum: string; relevance: number }>;
        insights: Array<{
          topic: string; opportunity: string; urgency: "high" | "medium" | "low";
          suggestedPost: string; platform: string; hashtags: string[];
        }>;
        competitorGaps: string[];
        recommendedActions: string[];
      }>(
        `You are a social media trend analyst with real-time awareness of ${new Date().getFullYear()} trends. Analyze trends for the given industry and keywords.`,
        `Industry: ${input.industry}\nKeywords: ${input.keywords.join(", ")}\nPlatforms: ${input.platforms.join(", ")}\n\nIdentify: trending topics with momentum, content opportunities with urgency ratings, competitor content gaps, and recommended actions. For each insight, provide a ready-to-use suggested post.\n\nReturn JSON: trendingTopics (array of {topic, momentum, relevance 0-100}), insights (array of {topic, opportunity, urgency, suggestedPost, platform, hashtags}), competitorGaps (array), recommendedActions (array).`
      );

      const [res] = await db.insert(trendReports).values({
        workspaceId: input.workspaceId,
        keywords: input.keywords,
        industry: input.industry,
        insights: scanResult.insights,
        trendingTopics: scanResult.trendingTopics,
      });

      return { id: (res as any).insertId, ...scanResult };
    }),

  addCompetitorMonitor: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      handle: z.string(),
      platform: z.enum(["twitter", "linkedin", "facebook", "instagram", "tiktok"]),
      displayName: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [res] = await db.insert(competitorMonitors).values({
        workspaceId: input.workspaceId,
        handle: input.handle,
        platform: input.platform as any,
        displayName: input.displayName,
        notes: input.notes,
        createdByUserId: ctx.user.id,
      });
      return { id: (res as any).insertId };
    }),

  listCompetitorMonitors: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(competitorMonitors)
        .where(eq(competitorMonitors.workspaceId, input.workspaceId))
        .orderBy(desc(competitorMonitors.createdAt));
    }),

  removeCompetitorMonitor: protectedProcedure
    .input(z.object({ workspaceId: z.number(), monitorId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { eq: eqFn } = await import("drizzle-orm");
      await db.delete(competitorMonitors)
        .where(and(eq(competitorMonitors.id, input.monitorId), eq(competitorMonitors.workspaceId, input.workspaceId)));
      return { success: true };
    }),

  listTrendReports: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(trendReports)
        .where(eq(trendReports.workspaceId, input.workspaceId))
        .orderBy(desc(trendReports.generatedAt))
        .limit(10);
    }),

  generateCounterContent: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      competitorHandle: z.string(),
      platform: z.enum(["twitter", "linkedin", "facebook", "instagram", "tiktok"]),
      gapDescription: z.string(),
      brandProfileId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      let brandVoiceContext = "";
      if (input.brandProfileId) {
        const [profile] = await db.select().from(brandProfiles)
          .where(and(eq(brandProfiles.id, input.brandProfileId), eq(brandProfiles.workspaceId, input.workspaceId)));
        if (profile?.styleProfile) brandVoiceContext = `\nBrand voice: ${JSON.stringify(profile.styleProfile)}`;
      }

      const content = await llmJson<{
        posts: Array<{ text: string; hashtags: string[]; angle: string }>;
        strategy: string;
      }>(
        `You are a competitive social media strategist. Generate content that fills gaps left by competitors.`,
        `Platform: ${input.platform}\nCompetitor: ${input.competitorHandle}\nContent gap: ${input.gapDescription}${brandVoiceContext}\n\nGenerate 3 posts that fill this gap and position our brand favorably. Return JSON: posts (array of {text, hashtags, angle}), strategy (explanation of approach).`
      );

      return content;
    }),

  // ── 6. Multi-Modal Campaign Factory ──────────────────────────────────────

  runCampaignFactory: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      sourceUrl: z.string().url(),
      platforms: z.array(z.enum(["twitter", "linkedin", "facebook", "instagram", "tiktok"])),
      campaignGoal: z.string(),
      brandProfileId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      // Create agent run
      const [runRes] = await db.insert(agentRuns).values({
        workspaceId: input.workspaceId,
        createdByUserId: ctx.user.id,
        type: "campaign_factory",
        status: "running",
        inputData: input,
        steps: [],
        startedAt: new Date(),
      });
      const runId = (runRes as any).insertId as number;

      try {
        // Fetch page
        const page = await fetchPageText(input.sourceUrl);

        // Get brand voice
        let brandVoiceContext = "";
        if (input.brandProfileId) {
          const [profile] = await db.select().from(brandProfiles)
            .where(and(eq(brandProfiles.id, input.brandProfileId), eq(brandProfiles.workspaceId, input.workspaceId)));
          if (profile?.styleProfile) brandVoiceContext = `\nBrand voice: ${JSON.stringify(profile.styleProfile)}`;
        }

        // Generate unified theme
        const theme = await llmJson<{ campaignName: string; theme: string; keyMessage: string; hashtags: string[] }>(
          "You are a creative director. Generate a unified campaign theme.",
          `URL: ${input.sourceUrl}\nTitle: ${page.title}\nContent: ${page.text.slice(0, 3000)}\nGoal: ${input.campaignGoal}${brandVoiceContext}\n\nReturn JSON: campaignName, theme, keyMessage, hashtags (array of 6).`
        );

        // Generate all asset types per platform
        const assets: Record<string, unknown> = {};
        for (const platform of input.platforms) {
          const platformAssets = await llmJson<{
            textPost: { text: string; hashtags: string[] };
            carousel: { slides: Array<{ headline: string; body: string }> };
            thread: { posts: string[] };
            imagePrompt: string;
            videoScript: { hook: string; body: string; cta: string; duration: string };
            voiceoverNotes: string;
          }>(
            `You are a ${platform} multi-modal content creator. Generate all content formats for a campaign.`,
            `Campaign theme: ${JSON.stringify(theme)}\nPlatform: ${platform}\nGoal: ${input.campaignGoal}${brandVoiceContext}\n\nGenerate: textPost ({text, hashtags}), carousel ({slides: [{headline, body}] x5}), thread ({posts: array of 5 connected posts}), imagePrompt (detailed Midjourney/DALL-E prompt), videoScript ({hook, body, cta, duration}), voiceoverNotes (tone/pacing guidance).\n\nReturn as JSON.`
          );
          assets[platform] = platformAssets;
        }

        // Save to multimodal campaigns
        const [campRes] = await db.insert(multimodalCampaigns).values({
          workspaceId: input.workspaceId,
          sourceUrl: input.sourceUrl,
          theme: theme.theme,
          brief: theme.keyMessage,
          assets,
          status: "ready",
          agentRunId: runId,
          createdByUserId: ctx.user.id,
        });
        const campaignId = (campRes as any).insertId as number;

        await updateAgentRun(runId, {
          status: "completed",
          outputData: { theme, assets, campaignId },
          completedAt: new Date(),
        });

        return { runId, campaignId, theme, assets };

      } catch (err: any) {
        await updateAgentRun(runId, { status: "failed", errorMessage: err.message, completedAt: new Date() });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  listMultimodalCampaigns: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(multimodalCampaigns)
        .where(eq(multimodalCampaigns.workspaceId, input.workspaceId))
        .orderBy(desc(multimodalCampaigns.createdAt))
        .limit(20);
    }),

  getMultimodalCampaign: protectedProcedure
    .input(z.object({ workspaceId: z.number(), campaignId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [campaign] = await db.select().from(multimodalCampaigns)
        .where(and(eq(multimodalCampaigns.id, input.campaignId), eq(multimodalCampaigns.workspaceId, input.workspaceId)));
      return campaign ?? null;
    }),

  // ── 7. Cross-Channel ROI Brain ────────────────────────────────────────────

  predictROI: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      campaignId: z.number().optional(),
      campaignName: z.string(),
      goal: z.enum(["awareness", "traffic", "engagement", "conversions", "leads"]),
      platforms: z.array(z.string()),
      postCount: z.number(),
      timeframeDays: z.number().default(30),
      averageOrderValue: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // Gather historical analytics for context
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const historicalData = await db.select().from(analytics)
        .where(and(eq(analytics.workspaceId, input.workspaceId), gte(analytics.recordedAt, thirtyDaysAgo)))
        .limit(100);

      const avgImpressions = historicalData.length > 0
        ? historicalData.reduce((s, r) => s + (r.impressions ?? 0), 0) / historicalData.length
        : 500;
      const avgClicks = historicalData.length > 0
        ? historicalData.reduce((s, r) => s + (r.clicks ?? 0), 0) / historicalData.length
        : 25;

      const prediction = await llmJson<{
        predictedTraffic: number;
        predictedConversions: number;
        predictedRevenue: number;
        confidence: number;
        reasoning: string;
        breakdown: Record<string, { traffic: number; conversions: number; revenue: number }>;
        recommendations: string[];
        riskFactors: string[];
      }>(
        "You are a marketing ROI analyst. Predict campaign performance based on historical data and industry benchmarks.",
        `Campaign: ${input.campaignName}\nGoal: ${input.goal}\nPlatforms: ${input.platforms.join(", ")}\nPost count: ${input.postCount}\nTimeframe: ${input.timeframeDays} days\nHistorical avg impressions/post: ${Math.round(avgImpressions)}\nHistorical avg clicks/post: ${Math.round(avgClicks)}\nAverage order value: $${input.averageOrderValue ?? 50}\n\nPredict: predictedTraffic (total visits), predictedConversions (total), predictedRevenue (USD), confidence (0-100), reasoning, breakdown (per platform), recommendations (array of 3), riskFactors (array of 3).\n\nReturn JSON.`
      );

      const [res] = await db.insert(roiPredictions).values({
        workspaceId: input.workspaceId,
        campaignId: input.campaignId,
        predictedTraffic: prediction.predictedTraffic,
        predictedConversions: prediction.predictedConversions,
        predictedRevenue: Math.round((prediction.predictedRevenue ?? 0) * 100), // store in cents
        confidence: prediction.confidence,
        timeframedays: input.timeframeDays,
        modelInputs: { historicalAvgImpressions: avgImpressions, historicalAvgClicks: avgClicks, input },
      });

      return { id: (res as any).insertId, ...prediction };
    }),

  listROIPredictions: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(roiPredictions)
        .where(eq(roiPredictions.workspaceId, input.workspaceId))
        .orderBy(desc(roiPredictions.createdAt))
        .limit(20);
    }),

  updateROIActuals: protectedProcedure
    .input(z.object({
      predictionId: z.number(),
      workspaceId: z.number(),
      actualTraffic: z.number().optional(),
      actualConversions: z.number().optional(),
      actualRevenue: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const set: Record<string, unknown> = {};
      if (input.actualTraffic !== undefined) set.actualTraffic = input.actualTraffic;
      if (input.actualConversions !== undefined) set.actualConversions = input.actualConversions;
      if (input.actualRevenue !== undefined) set.actualRevenue = Math.round(input.actualRevenue * 100);
      await db.update(roiPredictions).set(set)
        .where(and(eq(roiPredictions.id, input.predictionId), eq(roiPredictions.workspaceId, input.workspaceId)));
      return { success: true };
    }),
});
