import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getMemberRole, getWorkspaceById } from "../db";
import { invokeLLM } from "../_core/llm";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { getDb } from "../db";
import { eq, desc } from "drizzle-orm";

// We'll store ad projects in memory-like fashion via a simple table approach
// using the contentLibrary table with type='brand_asset' and a special tag

export const adStudioRouter = router({
  generateAd: protectedProcedure.input(z.object({
    workspaceId: z.number(),
    businessName: z.string().min(1),
    businessDescription: z.string().min(1),
    targetAudience: z.string().optional(),
    industry: z.string().optional(),
    websiteUrl: z.string().optional(),
    goal: z.enum(["awareness", "traffic", "engagement", "conversions", "leads", "brand_awareness", "website_traffic", "lead_generation", "sales_conversion", "app_downloads", "event_promotion"]),
    tone: z.enum(["professional", "casual", "fun", "urgent", "inspirational"]),
    keyMessage: z.string().optional(),
    uploadedImageUrls: z.array(z.string()).optional(),
    platforms: z.array(z.enum(["twitter", "linkedin", "facebook", "instagram", "tiktok"])),
  })).mutation(async ({ ctx, input }) => {
    const ws = await getWorkspaceById(input.workspaceId);
    if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
    const role = await getMemberRole(input.workspaceId, ctx.user.id);
    if (ws.ownerId !== ctx.user.id && role !== "admin" && role !== "editor") throw new TRPCError({ code: "FORBIDDEN" });

    const platformSpecs = {
      twitter: { name: "Twitter/X", limit: 280, format: "Short punchy tweet with 1-2 hashtags" },
      linkedin: { name: "LinkedIn", limit: 700, format: "Professional post with value proposition" },
      facebook: { name: "Facebook", limit: 500, format: "Engaging post with clear CTA" },
      instagram: { name: "Instagram", limit: 300, format: "Visual-first caption with 5-10 hashtags" },
    };

    const imageContext = input.uploadedImageUrls?.length
      ? `\nThe advertiser has provided ${input.uploadedImageUrls.length} image(s) of their business/product. Reference these visuals in your image concept descriptions.`
      : "";

    const prompt = `You are a world-class advertising copywriter and creative director. Create a complete multi-platform advertising campaign.

BUSINESS INFO:
- Name: ${input.businessName}
- Description: ${input.businessDescription}
${input.industry ? `- Industry: ${input.industry}` : ""}
${input.targetAudience ? `- Target Audience: ${input.targetAudience}` : ""}
${input.websiteUrl ? `- Website: ${input.websiteUrl}` : ""}
${input.keyMessage ? `- Key Message: ${input.keyMessage}` : ""}
- Campaign Goal: ${input.goal}
- Tone: ${input.tone}
${imageContext}

PLATFORMS REQUESTED: ${input.platforms.join(", ")}

For each platform, create:
1. A compelling HEADLINE (max 60 chars)
2. Body COPY tailored to that platform's format and character limit
3. A strong CALL TO ACTION (max 30 chars)
4. 3-8 relevant HASHTAGS
5. An IMAGE CONCEPT description (what the ideal ad image/graphic should look like)

Return ONLY valid JSON in this exact structure:
{
  "campaignTheme": "...",
  "overarchingMessage": "...",
  "platforms": {
    "twitter": {
      "headline": "...",
      "copy": "...",
      "cta": "...",
      "hashtags": ["..."],
      "imageConcept": "..."
    }
  },
  "generalImageConcepts": ["...", "..."],
  "targetingRecommendations": "..."
}
Only include the platforms requested: ${input.platforms.join(", ")}.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are an expert advertising copywriter. Always respond with valid JSON only, no markdown." },
        { role: "user", content: prompt },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    const content = typeof raw === "string" ? raw : null;
    if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned no content" });

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); }
        catch { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse AI response" }); }
      } else {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse AI response" });
      }
    }

    return {
      ...parsed,
      businessName: input.businessName,
      uploadedImageUrls: input.uploadedImageUrls ?? [],
      goal: input.goal,
      tone: input.tone,
      platforms: input.platforms,
    };
  }),

  uploadImage: protectedProcedure.input(z.object({
    workspaceId: z.number(),
    fileName: z.string(),
    contentType: z.string(),
    base64: z.string(),
  })).mutation(async ({ ctx, input }) => {
    const ws = await getWorkspaceById(input.workspaceId);
    if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
    const role = await getMemberRole(input.workspaceId, ctx.user.id);
    if (ws.ownerId !== ctx.user.id && role !== "admin" && role !== "editor") throw new TRPCError({ code: "FORBIDDEN" });
    const buffer = Buffer.from(input.base64, "base64");
    const key = `${input.workspaceId}/ad-studio/${Date.now()}-${input.fileName}`;
    const { url } = await storagePut(key, buffer, input.contentType);
    return { url };
  }),

  saveProject: protectedProcedure.input(z.object({
    workspaceId: z.number(),
    name: z.string(),
    adData: z.any(),
  })).mutation(async ({ ctx, input }) => {
    const { createContentLibraryItem } = await import("../db");
    await createContentLibraryItem({
      workspaceId: input.workspaceId,
      type: "brand_asset",
      name: input.name,
      content: JSON.stringify(input.adData),
      tags: ["ad-studio"],
      createdByUserId: ctx.user.id,
    });
    return { success: true };
  }),

  instantAdDemo: publicProcedure.input(z.object({ shareToken: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { auditReports: auditTable } = await import("../../drizzle/schema");
      const reports = await db
        .select()
        .from(auditTable)
        .where(eq(auditTable.shareToken, input.shareToken))
        .limit(1);
      if (!reports.length) throw new TRPCError({ code: "NOT_FOUND", message: "Audit not found" });
      const report = reports[0];
      const raw = report.rawReport as Record<string, unknown> | null;
      const blastlyPitch = raw?.blastlyPitch as Record<string, unknown> | null;
      const competitivePos = raw?.competitivePosition as Record<string, unknown> | null;
      const differentiators = (competitivePos?.differentiators as string[]) ?? [];
      const summary = (raw?.summary as string) ?? "";
      const businessName = report.businessName;
      const industry = report.industry ?? "business";
      const website = report.website ?? "";
      const keyMessage = differentiators[0] ?? summary.split(".")[0] ?? "";

      // ── Platform recommendations: use audit AI result first, fall back to industry lookup ──
      const PLATFORM_RECS: Record<string, string[]> = {
        restaurant: ["facebook", "instagram", "google_business", "tiktok", "pinterest"],
        cafe: ["facebook", "instagram", "google_business", "tiktok", "pinterest"],
        food: ["facebook", "instagram", "google_business", "tiktok", "pinterest"],
        fitness: ["instagram", "tiktok", "youtube", "facebook", "pinterest"],
        gym: ["instagram", "tiktok", "youtube", "facebook", "pinterest"],
        health: ["instagram", "facebook", "youtube", "pinterest", "linkedin"],
        retail: ["instagram", "facebook", "pinterest", "tiktok", "google_business"],
        fashion: ["instagram", "pinterest", "tiktok", "facebook", "youtube"],
        beauty: ["instagram", "tiktok", "pinterest", "youtube", "facebook"],
        tech: ["linkedin", "twitter", "youtube", "facebook", "instagram"],
        saas: ["linkedin", "twitter", "youtube", "facebook", "instagram"],
        professional: ["linkedin", "facebook", "twitter", "youtube", "instagram"],
        legal: ["linkedin", "facebook", "twitter", "google_business", "youtube"],
        finance: ["linkedin", "facebook", "twitter", "youtube", "instagram"],
        real_estate: ["facebook", "instagram", "linkedin", "youtube", "google_business"],
        construction: ["facebook", "instagram", "linkedin", "youtube", "google_business"],
        trades: ["facebook", "instagram", "google_business", "youtube", "linkedin"],
        education: ["youtube", "instagram", "facebook", "linkedin", "tiktok"],
        hospitality: ["instagram", "facebook", "google_business", "tiktok", "pinterest"],
        travel: ["instagram", "facebook", "pinterest", "tiktok", "youtube"],
        automotive: ["facebook", "instagram", "youtube", "tiktok", "google_business"],
      };
      // Prefer the audit AI's own recommendation — it has seen the actual website
      const auditRecommended = (raw?.recommendedPlatforms as string[] | null);
      const industryKey = Object.keys(PLATFORM_RECS).find(k => industry.toLowerCase().includes(k)) ?? "retail";
      const fallbackRecs = PLATFORM_RECS[industryKey] ?? ["facebook", "instagram", "google_business", "linkedin", "twitter"];
      const recommendedPlatforms: string[] = (auditRecommended && auditRecommended.length > 0) ? auditRecommended : fallbackRecs;

      // Only write ad copy for the recommended platforms (max 5, mapped to supported keys)
      const SUPPORTED_AD_PLATFORMS = ["facebook", "instagram", "linkedin", "twitter", "tiktok", "youtube"];
      const adPlatforms = recommendedPlatforms.filter(p => SUPPORTED_AD_PLATFORMS.includes(p)).slice(0, 5);
      const platformInstructions = adPlatforms.map(p => {
        const specs: Record<string, string> = {
          facebook: '"facebook": { "headline": "<headline>", "copy": "<ad copy 2-3 sentences>", "cta": "<call to action>", "hashtags": ["<tag1>", "<tag2>"], "imageConcept": "<visual description>" }',
          instagram: '"instagram": { "headline": "<headline>", "copy": "<caption>", "cta": "<cta>", "hashtags": ["<tag1>", "<tag2>", "<tag3>"], "imageConcept": "<visual>" }',
          linkedin: '"linkedin": { "headline": "<headline>", "copy": "<professional copy>", "cta": "<cta>", "hashtags": ["<tag1>", "<tag2>"], "imageConcept": "<visual>" }',
          twitter: '"twitter": { "headline": "<headline>", "copy": "<tweet under 280 chars>", "cta": "<cta>", "hashtags": ["<tag1>"], "imageConcept": "<visual>" }',
          tiktok: '"tiktok": { "headline": "<headline>", "copy": "<short punchy caption>", "cta": "<cta>", "hashtags": ["<tag1>", "<tag2>", "<tag3>"], "imageConcept": "<15-30s video concept>" }',
          youtube: '"youtube": { "headline": "<video title>", "copy": "<video description 2-3 sentences>", "cta": "<cta>", "hashtags": ["<tag1>", "<tag2>"], "imageConcept": "<thumbnail concept>" }',
        };
        return specs[p] ?? null;
      }).filter(Boolean).join(",\n    ");

      const prompt = `You are a world-class advertising copywriter. Generate a multi-platform ad campaign for this business.

Business Name: ${businessName}
Industry: ${industry}
Website: ${website}
Key Differentiator: ${keyMessage}
Business Summary: ${summary}
Recommended Platforms: ${adPlatforms.join(", ")}

Write ad copy ONLY for these recommended platforms: ${adPlatforms.join(", ")}. Do not write copy for any other platform.
Return JSON with this exact structure:
{
  "campaignTheme": "<overarching campaign theme>",
  "overarchingMessage": "<the core message in one sentence>",
  "platforms": {
    ${platformInstructions}
  },
  "generalImageConcepts": ["<concept 1>", "<concept 2>"],
  "targetingRecommendations": "<who to target and why>"
}`;

      const llmResult = await invokeLLM({
        messages: [
          { role: "system" as const, content: "You are a world-class advertising copywriter. Always return valid JSON." },
          { role: "user" as const, content: prompt },
        ],
        response_format: { type: "json_object" },
      });
      const rawContent = llmResult.choices?.[0]?.message?.content ?? "{}";
      const content = typeof rawContent === "string" ? rawContent : "{}";
      const parsed = JSON.parse(content);

      // Generate a business-relevant AI image
      let imageUrl: string | null = null;
      try {
        const { generateImage } = await import("../_core/imageGeneration");
        const imagePrompt = `Professional marketing photo for ${businessName}, a ${industry} business. ${keyMessage}. Vibrant, high quality commercial photography, suitable for social media advertising, no text overlays.`;
        const imgResult = await generateImage({ prompt: imagePrompt });
        imageUrl = imgResult.url ?? null;
      } catch (imgErr) {
        console.warn("[InstantAdDemo] Image generation failed:", imgErr);
      }

      return { ...parsed, businessName, industry, website, recommendedPlatforms, imageUrl };
    }),

  getAdStudioPrefill: protectedProcedure.input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role && ws?.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return null;
      const { auditReports: auditTable } = await import("../../drizzle/schema");
      const reports = await db
        .select()
        .from(auditTable)
        .where(eq(auditTable.workspaceId, input.workspaceId))
        .orderBy(desc(auditTable.createdAt))
        .limit(1);
      if (!reports.length) return null;
      const report = reports[0];
      const raw = report.rawReport as Record<string, unknown> | null;
      // Extract useful pre-fill data from the audit
      const competitivePos = raw?.competitivePosition as Record<string, unknown> | null;
      const contentAnalysis = raw?.contentAnalysis as Record<string, unknown> | null;
      const blastlyPitch = raw?.blastlyPitch as Record<string, unknown> | null;
      const differentiators = (competitivePos?.differentiators as string[]) ?? [];
      const painPoints = (blastlyPitch?.painPoints as string[]) ?? [];
      const topContentTypes = (contentAnalysis?.topPerformingTypes as string[]) ?? [];
      return {
        businessName: report.businessName,
        industry: report.industry,
        website: report.website,
        handles: report.handles as Record<string, string> | null,
        summary: (raw?.summary as string) ?? null,
        differentiators,
        painPoints,
        topContentTypes,
        contentMix: (contentAnalysis?.contentMix as string) ?? null,
        overallScore: report.overallScore,
        platformScores: report.platformScores as Record<string, unknown> | null,
        // Infer audience from the raw report summary
        inferredAudience: painPoints.length > 0 ? painPoints[0] : null,
        roi: (blastlyPitch?.roi as string) ?? null,
      };
    }),

  listProjects: protectedProcedure.input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role && ws?.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const { getContentLibrary } = await import("../db");
      const items = await getContentLibrary(input.workspaceId, "brand_asset");
      return items.filter((item) => {
        const tags = Array.isArray(item.tags) ? item.tags : [];
        return tags.includes("ad-studio");
      });
    }),
});
