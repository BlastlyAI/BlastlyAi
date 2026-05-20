import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { quickCaptures, reminderSettings, brandBriefs } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { storagePut } from "../storage";
import { transcribeAudio } from "../_core/voiceTranscription";
import { invokeLLM } from "../_core/llm";
import { notifyOwner } from "../_core/notification";
import { TRPCError } from "@trpc/server";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return db;
}

// ── AI post generation ────────────────────────────────────────────────────────

async function generatePostsFromCapture(opts: {
  workspaceId: number;
  voiceTranscript?: string;
  textNote?: string;
  mediaType?: string;
  mediaUrl?: string;
  platforms: string[];
}): Promise<Record<string, string>> {
  const db = await requireDb();
  const [brief] = await db
    .select()
    .from(brandBriefs)
    .where(eq(brandBriefs.workspaceId, opts.workspaceId))
    .limit(1);

  const brandContext = brief
    ? `Business: workspace ${brief.workspaceId}
Description: ${brief.businessDescription || ""}
Tone of voice: ${brief.tone || "friendly and professional"}
Key differentiators: ${brief.differentiators || ""}
Phrases to use: ${brief.approvedPhrases || ""}
Phrases to avoid: ${brief.avoidPhrases || ""}
No price claims: ${brief.noPriceClaims}
No fabricated testimonials: ${brief.noTestimonials}
No competitor mentions: ${brief.noCompetitorMentions}`
    : "No brand brief on file — use a friendly, professional tone.";

  const contentContext = [
    opts.voiceTranscript ? `Voice note from client: "${opts.voiceTranscript}"` : null,
    opts.textNote ? `Text note from client: "${opts.textNote}"` : null,
    opts.mediaType === "photo" ? "Client has attached a photo." : null,
    opts.mediaType === "video" ? "Client has attached a video." : null,
  ]
    .filter(Boolean)
    .join("\n");

  const platformList = opts.platforms.join(", ");

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are a professional social media manager writing posts on behalf of a small business. Always stay true to the brand brief. Never invent facts, prices, awards, or claims not mentioned by the client.",
      },
      {
        role: "user",
        content: `Create social media posts for: ${platformList}

BRAND BRIEF:
${brandContext}

CLIENT SUBMISSION:
${contentContext}

Return a JSON object where each key is a platform name (lowercase) and the value is the post caption. Tailor each caption to the platform's style. Only include platforms from: ${platformList}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "platform_posts",
        strict: false,
        schema: { type: "object", additionalProperties: { type: "string" } },
      },
    },
  });

  try {
    const content = response.choices?.[0]?.message?.content;
    return typeof content === "string" ? JSON.parse(content) : {};
  } catch {
    return { general: "Content captured — post coming soon!" };
  }
}

// ── Router ────────────────────────────────────────────────────────────────────

export const quickCaptureRouter = router({
  // Submit a new quick capture (client-side, mobile)
  submit: protectedProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        mediaBase64: z.string().optional(),
        mediaType: z.enum(["photo", "video", "none"]).default("none"),
        mediaFilename: z.string().optional(),
        mediaMimeType: z.string().optional(),
        voiceBase64: z.string().optional(),
        voiceFilename: z.string().optional(),
        textNote: z.string().max(2000).optional(),
        platforms: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let mediaUrl: string | undefined;
      let mediaKey: string | undefined;
      let voiceUrl: string | undefined;
      let voiceKey: string | undefined;
      let voiceTranscript: string | undefined;

      // Upload media if provided
      if (input.mediaBase64 && input.mediaType !== "none") {
        const buffer = Buffer.from(input.mediaBase64, "base64");
        const ext =
          input.mediaFilename?.split(".").pop() ||
          (input.mediaType === "video" ? "mp4" : "jpg");
        const key = `captures/${input.workspaceId}/${Date.now()}-media.${ext}`;
        const result = await storagePut(key, buffer, input.mediaMimeType || "image/jpeg");
        mediaUrl = result.url;
        mediaKey = key;
      }

      // Upload voice and transcribe if provided
      if (input.voiceBase64) {
        const buffer = Buffer.from(input.voiceBase64, "base64");
        const ext = input.voiceFilename?.split(".").pop() || "webm";
        const key = `captures/${input.workspaceId}/${Date.now()}-voice.${ext}`;
        const result = await storagePut(key, buffer, "audio/webm");
        voiceUrl = result.url;
        voiceKey = key;

        try {
          const transcription = await transcribeAudio({ audioUrl: voiceUrl, language: "en" });
          // transcribeAudio returns WhisperResponse | TranscriptionError
          if ("text" in transcription) {
            voiceTranscript = transcription.text;
          }
        } catch (err) {
          console.error("[QuickCapture] Voice transcription failed:", err);
        }
      }

      const db = await requireDb();
      const [inserted] = await db.insert(quickCaptures).values({
        workspaceId: input.workspaceId,
        submittedByUserId: ctx.user.id,
        mediaUrl,
        mediaKey,
        mediaType: input.mediaType,
        voiceUrl,
        voiceKey,
        voiceTranscript,
        textNote: input.textNote,
        status: "pending_ai",
      });

      const captureId = (inserted as any).insertId as number;

      // Fire-and-forget AI generation
      (async () => {
        try {
          const db2 = await requireDb();
          const aiPosts = await generatePostsFromCapture({
            workspaceId: input.workspaceId,
            voiceTranscript,
            textNote: input.textNote,
            mediaType: input.mediaType,
            mediaUrl,
            platforms: input.platforms,
          });
          await db2
            .update(quickCaptures)
            .set({ aiGeneratedPosts: aiPosts, status: "ai_ready" })
            .where(eq(quickCaptures.id, captureId));
          await notifyOwner({
            title: "New Quick Capture Ready for Review",
            content: `A client submitted new content for workspace ${input.workspaceId}. AI posts are ready — review in the Approval Queue.`,
          });
        } catch (err) {
          console.error("[QuickCapture] AI generation failed:", err);
          const db2 = await requireDb();
          await db2
            .update(quickCaptures)
            .set({ status: "ai_ready", aiGeneratedPosts: {} })
            .where(eq(quickCaptures.id, captureId));
        }
      })();

      return { success: true, captureId };
    }),

  // List ALL captures across all workspaces (operator/admin view)
  listAllPending: protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      if (input.status) {
        return db
          .select()
          .from(quickCaptures)
          .where(eq(quickCaptures.status, input.status))
          .orderBy(desc(quickCaptures.createdAt))
          .limit(200);
      }
      return db
        .select()
        .from(quickCaptures)
        .orderBy(desc(quickCaptures.createdAt))
        .limit(200);
    }),

  // List captures for a workspace (agency view)
  listForWorkspace: protectedProcedure
    .input(z.object({ workspaceId: z.number(), status: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const whereClause = input.status
        ? and(
            eq(quickCaptures.workspaceId, input.workspaceId),
            eq(quickCaptures.status, input.status)
          )
        : eq(quickCaptures.workspaceId, input.workspaceId);
      return db
        .select()
        .from(quickCaptures)
        .where(whereClause)
        .orderBy(desc(quickCaptures.createdAt))
        .limit(100);
    }),

  // Agency approves AI posts (optionally with edits)
  approve: protectedProcedure
    .input(
      z.object({
        captureId: z.number(),
        editedPosts: z.record(z.string(), z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [capture] = await db
        .select()
        .from(quickCaptures)
        .where(eq(quickCaptures.id, input.captureId))
        .limit(1);
      if (!capture) throw new TRPCError({ code: "NOT_FOUND", message: "Capture not found" });
      const finalPosts: Record<string, string> = (input.editedPosts as Record<string, string>) || (capture.aiGeneratedPosts as Record<string, string>) || {};
      await db
        .update(quickCaptures)
        .set({ status: "approved", aiGeneratedPosts: finalPosts })
        .where(eq(quickCaptures.id, input.captureId));
      return { success: true };
    }),

  // Agency rejects a capture with a note
  reject: protectedProcedure
    .input(z.object({ captureId: z.number(), note: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db
        .update(quickCaptures)
        .set({ status: "rejected", agencyNote: input.note })
        .where(eq(quickCaptures.id, input.captureId));
      return { success: true };
    }),

  // Get reminder settings for a workspace
  getReminderSettings: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [settings] = await db
        .select()
        .from(reminderSettings)
        .where(eq(reminderSettings.workspaceId, input.workspaceId))
        .limit(1);
      return (
        settings || {
          workspaceId: input.workspaceId,
          enabled: true,
          reminderDays: [2, 5],
          reminderHour: 9,
          lastSentAt: null,
        }
      );
    }),

  // Guest demo preview — no auth required, no DB writes
  guestPreview: publicProcedure
    .input(
      z.object({
        voiceTranscript: z.string().max(2000).optional(),
        textNote: z.string().max(2000).optional(),
        hasPhoto: z.boolean().default(false),
        industry: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const industryContext = input.industry ? `Industry: ${input.industry}` : "Industry: small business";
      const contentContext = [
        input.voiceTranscript ? `Voice note: "${input.voiceTranscript}"` : null,
        input.textNote ? `Text note: "${input.textNote}"` : null,
        input.hasPhoto ? "Client has attached a photo." : null,
      ]
        .filter(Boolean)
        .join("\n");

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are a professional social media manager. Write authentic, engaging social media posts based on the client's own words and photo. Keep it real — no invented facts. Be concise and platform-appropriate.",
          },
          {
            role: "user",
            content: `Create 3 social media post captions for a small business.\n${industryContext}\n\nCLIENT SUBMISSION:\n${contentContext || "No content provided — write a warm, engaging placeholder post."}\n\nReturn a JSON object with keys: instagram, facebook, linkedin. Each value is a ready-to-post caption (include relevant hashtags for instagram).`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "guest_preview_posts",
            strict: true,
            schema: {
              type: "object",
              properties: {
                instagram: { type: "string" },
                facebook: { type: "string" },
                linkedin: { type: "string" },
              },
              required: ["instagram", "facebook", "linkedin"],
              additionalProperties: false,
            },
          },
        },
      });

      try {
        const content = response.choices?.[0]?.message?.content;
        const posts = typeof content === "string" ? JSON.parse(content) : {};
        return { success: true, posts };
      } catch {
        return {
          success: true,
          posts: {
            instagram: "✨ Just captured this moment — can't wait to share more! #SmallBusiness #Authentic",
            facebook: "Something exciting is happening at our business. Stay tuned for more updates!",
            linkedin: "Proud of the work we do every day. Here's a glimpse behind the scenes.",
          },
        };
      }
    }),

  // Suggest a Pexels search term based on post topic + industry
  suggestStockSearch: publicProcedure
    .input(
      z.object({
        topic: z.string().max(500),
        industry: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You suggest short, specific Pexels photo search terms (2-4 words) that will return professional, relevant stock photos for a small business social media post.",
          },
          {
            role: "user",
            content: `Business industry: ${input.industry || "small business"}\nPost topic: "${input.topic}"\n\nReturn a JSON object with:\n- searchTerm: a 2-4 word Pexels search query (specific, visual, professional)\n- alternatives: array of 3 other search term options`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "stock_search",
            strict: true,
            schema: {
              type: "object",
              properties: {
                searchTerm: { type: "string" },
                alternatives: { type: "array", items: { type: "string" } },
              },
              required: ["searchTerm", "alternatives"],
              additionalProperties: false,
            },
          },
        },
      });
      try {
        const content = response.choices?.[0]?.message?.content;
        return typeof content === "string" ? JSON.parse(content) : { searchTerm: input.industry || "small business", alternatives: [] };
      } catch {
        return { searchTerm: input.industry || "small business", alternatives: [] };
      }
    }),

  // Search Pexels for stock photos (server-side, key never exposed)
  searchStockPhotos: publicProcedure
    .input(
      z.object({
        query: z.string().max(200),
        perPage: z.number().min(1).max(24).default(12),
      })
    )
    .mutation(async ({ input }) => {
      const apiKey = process.env.PEXELS_API_KEY;
      if (!apiKey) {
        // Return placeholder photos if no API key configured
        return {
          photos: Array.from({ length: 6 }, (_, i) => ({
            id: i + 1,
            url: `https://picsum.photos/seed/${input.query.replace(/\s/g, "-")}-${i}/400/300`,
            thumb: `https://picsum.photos/seed/${input.query.replace(/\s/g, "-")}-${i}/200/150`,
            photographer: "Stock Photo",
            alt: input.query,
          })),
        };
      }
      try {
        const res = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(input.query)}&per_page=${input.perPage}&orientation=landscape`,
          { headers: { Authorization: apiKey } }
        );
        if (!res.ok) throw new Error(`Pexels API error: ${res.status}`);
        const data = await res.json() as { photos: Array<{ id: number; src: { medium: string; small: string }; photographer: string; alt: string }> };
        return {
          photos: data.photos.map(p => ({
            id: p.id,
            url: p.src.medium,
            thumb: p.src.small,
            photographer: p.photographer,
            alt: p.alt || input.query,
          })),
        };
      } catch (err) {
        console.error("[StockPhoto] Pexels search failed:", err);
        return { photos: [] };
      }
    }),

  // Save reminder settings
  saveReminderSettings: protectedProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        enabled: z.boolean(),
        reminderDays: z.array(z.number().min(0).max(6)),
        reminderHour: z.number().min(0).max(23),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const existing = await db
        .select({ id: reminderSettings.id })
        .from(reminderSettings)
        .where(eq(reminderSettings.workspaceId, input.workspaceId))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(reminderSettings)
          .set({
            enabled: input.enabled,
            reminderDays: input.reminderDays,
            reminderHour: input.reminderHour,
          })
          .where(eq(reminderSettings.workspaceId, input.workspaceId));
      } else {
        await db.insert(reminderSettings).values({
          workspaceId: input.workspaceId,
          enabled: input.enabled,
          reminderDays: input.reminderDays,
          reminderHour: input.reminderHour,
        });
      }
      return { success: true };
    }),
});
