/**
 * Snap to Post — tRPC router
 *
 * Public procedures (no auth required):
 *   snap.polishCaption   — AI-polish a raw voice caption for a given platform
 *   snap.savePendingSnap — Upload photo to S3 + save snap to DB, return sessionToken
 *   snap.getPendingSnap  — Retrieve a pending snap by sessionToken (for post-OAuth resume)
 *
 * Protected procedures (auth required):
 *   snap.publishPending  — Publish a pending snap using the user's connected social account
 */
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { getDb } from "../db";
import { pendingSnaps, socialAccounts } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { publishToLinkedIn, publishToPinterest, publishToBluesky } from "../routers/publish";

// ─── Rate limiter (5 polish requests per IP per hour) ─────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): void {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return;
  }
  if (entry.count >= 10) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "You've reached the demo limit for this hour. Sign up for unlimited posts!",
    });
  }
  entry.count++;
}

// ─── Platform style hints ─────────────────────────────────────────────────────
const PLATFORM_HINTS: Record<string, string> = {
  instagram: "Instagram — casual, visual, 1-3 short sentences, 5-10 relevant hashtags, emoji welcome",
  facebook:  "Facebook — friendly, conversational, 2-4 sentences, 3-5 hashtags, no excessive emoji",
  tiktok:    "TikTok — punchy, energetic, hook in first line, 5-8 trending hashtags, emoji encouraged",
  linkedin:  "LinkedIn — professional, insightful, 3-5 sentences, 3-5 industry hashtags, no emoji",
  x:         "X (Twitter) — concise, punchy, max 280 characters, 1-2 hashtags only",
  youtube:   "YouTube Community post — engaging, invites comments, 2-3 sentences, 3-5 hashtags",
  pinterest: "Pinterest — descriptive, keyword-rich, 2-3 sentences, 5-8 hashtags",
  bluesky:   "Bluesky — conversational, authentic, 1-3 sentences, 2-4 hashtags",
};

// ─── Publishable platforms (ones we have real API access to) ──────────────────
export const PUBLISHABLE_PLATFORMS = ["linkedin", "youtube", "pinterest", "bluesky"] as const;
export type PublishablePlatform = typeof PUBLISHABLE_PLATFORMS[number];

export const snapRouter = router({

  // ── AI caption polish ───────────────────────────────────────────────────────
  polishCaption: publicProcedure
    .input(z.object({
      rawCaption:       z.string().max(2000),
      platform:         z.string(),
      businessContext:  z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ip =
        (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        ctx.req.socket?.remoteAddress || "unknown";
      checkRateLimit(ip);

      const platformHint = PLATFORM_HINTS[input.platform] ?? PLATFORM_HINTS.linkedin;
      const businessLine = input.businessContext ? `\nBusiness context: ${input.businessContext}` : "";

      const systemPrompt = `You are an expert social media copywriter. Polish the user's raw spoken caption into a ready-to-post update for ${input.platform}.

Platform style: ${platformHint}${businessLine}

Rules:
- Keep the user's original meaning and authentic voice
- Fix grammar and spelling
- Make it engaging and platform-appropriate
- Return ONLY valid JSON with keys: caption (string), hashtags (string array, no # prefix), tip (one short posting tip)`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Raw caption: "${input.rawCaption}"\n\nPolish this for ${input.platform}.` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "polished_caption",
            strict: true,
            schema: {
              type: "object",
              properties: {
                caption:  { type: "string" },
                hashtags: { type: "array", items: { type: "string" } },
                tip:      { type: "string" },
              },
              required: ["caption", "hashtags", "tip"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = response.choices?.[0]?.message?.content;
      const raw = typeof rawContent === "string" ? rawContent : "{}";
      let parsed: { caption: string; hashtags: string[]; tip: string };
      try { parsed = JSON.parse(raw); }
      catch { parsed = { caption: input.rawCaption, hashtags: [], tip: "" }; }

      return {
        caption:  parsed.caption ?? input.rawCaption,
        hashtags: (parsed.hashtags ?? []).slice(0, 10),
        tip:      parsed.tip ?? "",
        platform: input.platform,
      };
    }),

  // ── Save pending snap (upload image to S3, store in DB) ────────────────────
  savePendingSnap: publicProcedure
    .input(z.object({
      imageBase64: z.string().max(5_000_000), // ~3.75MB raw image
      caption:     z.string().max(3000),
      hashtags:    z.array(z.string()).max(20),
      platform:    z.string().max(32),
      websiteUrl:  z.string().max(512).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Upload image to S3
      const base64Data = input.imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");
      const ext = input.imageBase64.startsWith("data:image/png") ? "png" : "jpg";
      const fileKey = `snap-demo/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
      const { url: imageUrl } = await storagePut(fileKey, imageBuffer, `image/${ext}`);

      // Generate a unique session token
      const sessionToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

      await db.insert(pendingSnaps).values({
        sessionToken,
        imageUrl,
        caption:    input.caption,
        hashtags:   JSON.stringify(input.hashtags),
        platform:   input.platform,
        websiteUrl: input.websiteUrl ?? null,
        published:  0,
        expiresAt,
        createdAt:  Date.now(),
      });

      return { sessionToken, imageUrl };
    }),

  // ── Get pending snap by sessionToken ───────────────────────────────────────
  getPendingSnap: publicProcedure
    .input(z.object({ sessionToken: z.string().length(64) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [snap] = await db.select().from(pendingSnaps)
        .where(eq(pendingSnaps.sessionToken, input.sessionToken))
        .limit(1);

      if (!snap) throw new TRPCError({ code: "NOT_FOUND", message: "Snap not found or expired" });
      if (snap.expiresAt < Date.now()) throw new TRPCError({ code: "NOT_FOUND", message: "Snap has expired" });

      return {
        ...snap,
        hashtags: JSON.parse(snap.hashtags) as string[],
      };
    }),

  // ── Publish pending snap (requires auth + connected social account) ─────────
  publishPending: protectedProcedure
    .input(z.object({
      sessionToken:    z.string().length(64),
      socialAccountId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Load the pending snap
      const [snap] = await db.select().from(pendingSnaps)
        .where(eq(pendingSnaps.sessionToken, input.sessionToken))
        .limit(1);
      if (!snap) throw new TRPCError({ code: "NOT_FOUND", message: "Snap not found" });
      if (snap.expiresAt < Date.now()) throw new TRPCError({ code: "NOT_FOUND", message: "Snap has expired" });
      if (snap.published) throw new TRPCError({ code: "CONFLICT", message: "Already published" });

      // Load the social account
      const [account] = await db.select().from(socialAccounts)
        .where(and(
          eq(socialAccounts.id, input.socialAccountId),
          eq(socialAccounts.userId, ctx.user.id),
        ))
        .limit(1);
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Social account not found" });
      if (!account.accessToken) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Account not connected — please reconnect" });

      const hashtags = JSON.parse(snap.hashtags) as string[];
      const fullText = `${snap.caption}\n\n${hashtags.map(h => `#${h}`).join(" ")}`.trim();

      let platformPostId: string;

      switch (account.platform) {
        case "linkedin": {
          const authorUrn = account.platformAccountId.startsWith("urn:")
            ? account.platformAccountId
            : `urn:li:person:${account.platformAccountId}`;
          const result = await publishToLinkedIn(account.accessToken, authorUrn, fullText, [snap.imageUrl]);
          platformPostId = result.platformPostId;
          break;
        }
        case "pinterest": {
          const result = await publishToPinterest(account.accessToken, "default", fullText, snap.imageUrl);
          platformPostId = result.platformPostId;
          break;
        }
        case "bluesky": {
          const result = await publishToBluesky(account.accessToken, account.platformAccountId, fullText);
          platformPostId = result.platformPostId;
          break;
        }
        case "youtube": {
          // YouTube Community posts don't support images via API — post text only
          const result = await publishToLinkedIn(account.accessToken, account.platformAccountId, fullText, []);
          platformPostId = result.platformPostId;
          break;
        }
        default:
          throw new TRPCError({ code: "BAD_REQUEST", message: `${account.platform} is not supported for Snap to Post yet` });
      }

      // Mark as published
      await db.update(pendingSnaps)
        .set({ published: 1, publishedAt: Date.now() })
        .where(eq(pendingSnaps.sessionToken, input.sessionToken));

      return {
        success: true,
        platformPostId,
        platform: account.platform,
        platformDisplayName: account.platformDisplayName ?? account.platformUsername ?? account.platform,
      };
    }),
});
