import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { sql, eq, desc } from "drizzle-orm";
import { videoProjects } from "../../drizzle/schema";

const PLATFORM_VIDEO_SPECS = {
  tiktok: { maxDuration: 60, aspectRatio: "9:16", format: "vertical", captionStyle: "bold centered" },
  youtube: { maxDuration: 600, aspectRatio: "16:9", format: "horizontal", captionStyle: "subtitle bar" },
  instagram: { maxDuration: 90, aspectRatio: "9:16", format: "vertical", captionStyle: "bold centered" },
  facebook: { maxDuration: 240, aspectRatio: "16:9", format: "horizontal", captionStyle: "subtitle bar" },
  twitter: { maxDuration: 140, aspectRatio: "16:9", format: "horizontal", captionStyle: "subtitle bar" },
  linkedin: { maxDuration: 600, aspectRatio: "16:9", format: "horizontal", captionStyle: "subtitle bar" },
};

export const videoRouter = router({
  /** Generate a full video script + storyboard + hashtags from a prompt or URL */
  generateScript: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      platform: z.enum(["tiktok", "youtube", "instagram", "facebook", "twitter", "linkedin"]),
      format: z.enum(["short", "long", "reel", "story"]).default("short"),
      prompt: z.string().min(5).max(2000),
      tone: z.enum(["energetic", "professional", "casual", "inspirational", "humorous"]).default("energetic"),
      targetAudience: z.string().optional(),
      callToAction: z.string().optional(),
      brandName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const spec = PLATFORM_VIDEO_SPECS[input.platform];
      const isShort = input.format === "short" || input.format === "reel" || input.format === "story";
      const targetDuration = isShort ? 30 : 180;

      const systemPrompt = `You are an elite social media video producer and scriptwriter. You create viral, high-converting video scripts optimised for ${input.platform}.

Platform specs: ${spec.aspectRatio} aspect ratio, ${spec.format} format, max ${spec.maxDuration}s, caption style: ${spec.captionStyle}.
Target duration: ~${targetDuration} seconds.

Always produce scripts that:
1. Hook the viewer in the first 3 seconds
2. Deliver clear value in the middle
3. End with a strong CTA
4. Are optimised for the platform algorithm
5. Include natural voiceover pacing`;

      const userPrompt = `Create a complete ${input.platform} video script for:
Topic/Product: ${input.prompt}
Tone: ${input.tone}
${input.brandName ? `Brand: ${input.brandName}` : ""}
${input.targetAudience ? `Target audience: ${input.targetAudience}` : ""}
${input.callToAction ? `CTA: ${input.callToAction}` : ""}

Return a JSON object with this exact structure:
{
  "title": "Catchy video title",
  "hook": "First 3-second hook line (must stop the scroll)",
  "script": "Full voiceover script with [PAUSE] markers and [EMPHASIS] for key words",
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": 5,
      "visualDescription": "What appears on screen",
      "voiceover": "What is said",
      "textOverlay": "On-screen text if any",
      "transition": "cut/fade/zoom"
    }
  ],
  "captions": [
    { "startTime": 0, "endTime": 3, "text": "Caption text" }
  ],
  "hashtags": ["hashtag1", "hashtag2"],
  "estimatedDuration": 30,
  "thumbnailConcept": "Description of the ideal thumbnail",
  "platformTips": ["Tip 1 for maximising ${input.platform} reach", "Tip 2"],
  "voiceoverNotes": "Pacing, tone, and delivery notes for the voiceover"
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt + " Respond with raw JSON only — no markdown fences, no explanation, just the JSON object." },
          { role: "user", content: userPrompt },
        ],
      });

      let content = response.choices[0]?.message?.content as string | undefined;
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate script" });
      content = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

      let scriptData: any;
      try {
        scriptData = JSON.parse(content);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse script JSON" });
      }

      // Save to database
      const db = await getDb();
      if (db) {
        await db.insert(videoProjects).values({
          workspaceId: input.workspaceId,
          userId: ctx.user.id,
          title: scriptData.title,
          platform: input.platform,
          format: input.format,
          status: "draft",
          prompt: input.prompt,
          script: scriptData.script,
          hashtags: JSON.stringify(scriptData.hashtags),
          metadata: JSON.stringify({
            hook: scriptData.hook,
            scenes: scriptData.scenes,
            captions: scriptData.captions,
            estimatedDuration: scriptData.estimatedDuration,
            thumbnailConcept: scriptData.thumbnailConcept,
            platformTips: scriptData.platformTips,
            voiceoverNotes: scriptData.voiceoverNotes,
            tone: input.tone,
            targetAudience: input.targetAudience,
            callToAction: input.callToAction,
          }),
        });
      }

      return { success: true, script: scriptData };
    }),

  /** Generate platform-specific video variations from a single script */
  generateVariations: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      originalScript: z.string(),
      platforms: z.array(z.enum(["tiktok", "youtube", "instagram", "facebook", "twitter", "linkedin"])),
    }))
    .mutation(async ({ input }) => {
      const variationsPrompt = `You are a video content strategist. Adapt this script for multiple platforms.

Original script:
${input.originalScript}

Create platform-specific variations for: ${input.platforms.join(", ")}

Return JSON:
{
  "variations": [
    {
      "platform": "tiktok",
      "adaptedScript": "...",
      "keyChanges": ["Change 1", "Change 2"],
      "estimatedDuration": 30,
      "hashtags": ["tag1", "tag2"]
    }
  ]
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert social media video strategist." },
          { role: "user", content: variationsPrompt },
        ],
      });

      let content = response.choices[0]?.message?.content as string | undefined;
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate variations" });
      content = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      try {
        return JSON.parse(content);
      } catch {
        return { variations: [] };
      }
    }),

  /** List all video projects for a workspace */
  listProjects: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(videoProjects)
        .where(eq(videoProjects.workspaceId, input.workspaceId))
        .orderBy(desc(videoProjects.createdAt))
        .limit(50);
    }),

  /** Get a single video project */
  getProject: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "NOT_FOUND" });
      const results = await db.select().from(videoProjects).where(eq(videoProjects.id, input.id)).limit(1);
      if (!results[0]) throw new TRPCError({ code: "NOT_FOUND" });
      return results[0];
    }),

  /** Update video project status */
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "generating", "ready", "published"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(videoProjects).set({ status: input.status }).where(eq(videoProjects.id, input.id));
      return { success: true };
    }),

  /** AI-powered video performance prediction */
  predictPerformance: protectedProcedure
    .input(z.object({
      platform: z.enum(["tiktok", "youtube", "instagram", "facebook", "twitter", "linkedin"]),
      script: z.string(),
      hashtags: z.array(z.string()).optional(),
      format: z.enum(["short", "long", "reel", "story"]).default("short"),
    }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a social media algorithm expert. Predict video performance based on script quality, hook strength, and platform-specific factors.",
          },
          {
            role: "user",
            content: `Predict performance for this ${input.platform} ${input.format} video:

Script: ${input.script.slice(0, 500)}
Hashtags: ${input.hashtags?.join(", ") || "none"}

Return JSON:
{
  "overallScore": 85,
  "viralityScore": 72,
  "hookStrength": 90,
  "retentionScore": 78,
  "ctaEffectiveness": 82,
  "predictedViews": "10K-50K",
  "predictedEngagementRate": "8.5%",
  "strengths": ["Strong hook", "Clear CTA"],
  "improvements": ["Add trending sound", "Shorten to 30s"],
  "bestPostingTime": "6-8pm weekdays",
  "competitiveAnalysis": "Above average for this niche"
}`,
          },
        ],
      });

      let content = response.choices[0]?.message?.content as string | undefined;
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      content = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      try {
        return JSON.parse(content);
      } catch {
        return { overallScore: 0, error: "Could not parse prediction" };
      }
    }),
});
