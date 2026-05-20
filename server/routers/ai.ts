import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getMemberRole, getWorkspaceById } from "../db";
import { invokeLLM } from "../_core/llm";
import { generateImage } from "../_core/imageGeneration";
import { protectedProcedure, router } from "../_core/trpc";

const PLATFORM_LIMITS = { twitter: 280, linkedin: 3000, facebook: 63206, instagram: 2200, tiktok: 2200 };

export const aiRouter = router({
  generateContent: protectedProcedure.input(z.object({
    workspaceId: z.number(),
    url: z.string().optional(), productDescription: z.string().optional(),
    targetAudience: z.string().optional(),
    tone: z.enum(["professional", "casual", "fun", "urgent", "educational"]).default("professional"),
    platforms: z.array(z.enum(["twitter", "linkedin", "facebook", "instagram", "tiktok"])),
    keywords: z.array(z.string()).optional(), campaignGoal: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const ws = await getWorkspaceById(input.workspaceId);
    if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
    const role = await getMemberRole(input.workspaceId, ctx.user.id);
    if (ws.ownerId !== ctx.user.id && role !== "admin" && role !== "editor") throw new TRPCError({ code: "FORBIDDEN" });

    const platformSpecs = input.platforms.map((p) => `- ${p}: max ${PLATFORM_LIMITS[p]} characters`).join("\n");
    const prompt = `You are an expert social media content creator. Generate high-converting promotional content.
${input.url ? `URL/Product: ${input.url}` : ""}
${input.productDescription ? `Description: ${input.productDescription}` : ""}
${input.targetAudience ? `Target Audience: ${input.targetAudience}` : ""}
Tone: ${input.tone}
${input.keywords?.length ? `Keywords: ${input.keywords.join(", ")}` : ""}
${input.campaignGoal ? `Campaign Goal: ${input.campaignGoal}` : ""}
Platforms: ${platformSpecs}

Return JSON with structure: { "platforms": { "twitter": { "caption": "...", "hashtags": [...], "callToAction": "..." }, ... }, "suggestions": [...], "imageConcepts": [...] }
Only include requested platforms. Keep captions within character limits.`;

    const response = await invokeLLM({ messages: [
      { role: "system", content: "You are a social media expert. Respond with valid JSON only." },
      { role: "user", content: prompt },
    ]});
    const raw = response.choices[0]?.message?.content;
    const content = typeof raw === "string" ? raw : null;
    if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned no content" });
    try {
      return JSON.parse(content);
    } catch {
      // Try to extract JSON from response
      const match = content.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse AI response" });
    }
  }),

  // ── AI Image Generation for posts ─────────────────────────────────────────
  generatePostImage: protectedProcedure.input(z.object({
    workspaceId: z.number(),
    postText: z.string(),
    platform: z.enum(["twitter", "linkedin", "facebook", "instagram", "tiktok", "pinterest", "youtube"]).optional(),
    brandContext: z.object({
      name: z.string().optional(),
      industry: z.string().optional(),
      primaryColor: z.string().optional(),
      toneOfVoice: z.string().optional(),
      targetAudience: z.string().optional(),
    }).optional(),
  })).mutation(async ({ ctx, input }) => {
    const ws = await getWorkspaceById(input.workspaceId);
    if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
    const role = await getMemberRole(input.workspaceId, ctx.user.id);
    if (ws.ownerId !== ctx.user.id && role !== "admin" && role !== "editor") throw new TRPCError({ code: "FORBIDDEN" });

    const brand = input.brandContext;
    const colorHint = brand?.primaryColor ? `, with ${brand.primaryColor} as the primary accent color` : "";
    const audienceHint = brand?.targetAudience ? ` targeting ${brand.targetAudience}` : "";
    const toneHint = brand?.toneOfVoice ? `, ${brand.toneOfVoice} tone` : "";
    const industryHint = brand?.industry ? ` in the ${brand.industry} industry` : "";
    const platformHint = input.platform ? ` optimised for ${input.platform}` : "";
    const brandName = brand?.name ?? ws.name;

    const imagePrompt = `Create a professional social media marketing image for ${brandName}${industryHint}. \
The post is about: "${input.postText.slice(0, 300)}". \
Style: clean, modern, high-quality marketing visual${colorHint}${toneHint}${audienceHint}${platformHint}. \
No text overlay. Photorealistic or stylised illustration. Suitable for social media.`;

    const { url } = await generateImage({ prompt: imagePrompt });
    return { url, prompt: imagePrompt };
  }),

  improveCaption: protectedProcedure.input(z.object({
    workspaceId: z.number(), caption: z.string(),
    platform: z.enum(["twitter", "linkedin", "facebook", "instagram", "tiktok"]),
    improvement: z.enum(["more_engaging", "shorter", "add_hashtags", "more_professional", "add_cta"]),
  })).mutation(async ({ ctx, input }) => {
    const ws = await getWorkspaceById(input.workspaceId);
    if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
    const improvementMap = {
      more_engaging: "Make it more engaging and attention-grabbing",
      shorter: `Shorten to fit within ${PLATFORM_LIMITS[input.platform]} characters`,
      add_hashtags: "Add 3-5 relevant trending hashtags",
      more_professional: "Make it more professional and authoritative",
      add_cta: "Add a compelling call-to-action at the end",
    };
    const response = await invokeLLM({ messages: [
      { role: "system", content: "You are a social media expert. Return only the improved caption text." },
      { role: "user", content: `Improve this ${input.platform} caption: "${input.caption}"\nImprovement: ${improvementMap[input.improvement]}\nMax: ${PLATFORM_LIMITS[input.platform]} chars` },
    ]});
    const raw = response.choices[0]?.message?.content;
    return { improved: typeof raw === "string" ? raw : input.caption };
  }),
});
