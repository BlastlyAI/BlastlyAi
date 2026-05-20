/**
 * Post Queue Router — Always-3 Backup System
 *
 * Priority order:
 *   1. Client posts with a specific scheduledDate  (highest priority)
 *   2. Client posts with no date (FIFO)
 *   3. AI-generated backup posts (only used when no client content is ready)
 *
 * The queue always tries to maintain 3 ai_backup posts per workspace.
 * When a backup post is used, a replacement is generated automatically.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { postQueue, workspaces } from "../../drizzle/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

const BACKUP_TARGET = 3; // always keep this many ai_backup posts ready

// ── Date intent detection ─────────────────────────────────────────────────────
async function detectDateIntent(note: string): Promise<{ scheduledDate: Date | null; isUrgent: boolean; detectedEventName: string | null; detectedPersonName: string | null }> {
  if (!note || note.trim().length < 3) {
    return { scheduledDate: null, isUrgent: false, detectedEventName: null, detectedPersonName: null };
  }
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You extract scheduling intent and metadata from social media post notes. Today's date is ${new Date().toISOString().split("T")[0]}.`,
        },
        {
          role: "user",
          content: `Extract from this note: "${note}"\n\nReturn JSON with:\n- scheduledDateISO: ISO date string if a specific date is mentioned, null otherwise\n- isUrgent: true if they say "post early", "urgent", "ASAP", "today", or "now"\n- detectedEventName: name of any event mentioned (e.g. "Melbourne Cup", "Grand Opening"), null if none\n- detectedPersonName: first name of any customer/person mentioned, null if none`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "date_intent",
          strict: true,
          schema: {
            type: "object",
            properties: {
              scheduledDateISO: { type: ["string", "null"] },
              isUrgent: { type: "boolean" },
              detectedEventName: { type: ["string", "null"] },
              detectedPersonName: { type: ["string", "null"] },
            },
            required: ["scheduledDateISO", "isUrgent", "detectedEventName", "detectedPersonName"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = response.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : null;
    return {
      scheduledDate: parsed?.scheduledDateISO ? new Date(parsed.scheduledDateISO) : null,
      isUrgent: parsed?.isUrgent ?? false,
      detectedEventName: parsed?.detectedEventName ?? null,
      detectedPersonName: parsed?.detectedPersonName ?? null,
    };
  } catch {
    return { scheduledDate: null, isUrgent: false, detectedEventName: null, detectedPersonName: null };
  }
}

// ── AI backup post generation ─────────────────────────────────────────────────
async function generateBackupPost(workspace: { name: string; industry: string | null; description: string | null; toneOfVoice: string | null; selectedPlatforms: string[] | null }): Promise<{ caption: string; hashtags: string }> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You generate engaging, professional social media posts for small businesses. Posts should be authentic, conversational, and appropriate for the business type.",
        },
        {
          role: "user",
          content: `Generate a social media post for:\nBusiness: ${workspace.name}\nIndustry: ${workspace.industry || "small business"}\nDescription: ${workspace.description || "a local business"}\nTone: ${workspace.toneOfVoice || "friendly and professional"}\n\nCreate a post that works well without a specific photo — e.g. a tip, a behind-the-scenes insight, a customer appreciation post, a seasonal message, or a business value statement.\n\nReturn JSON with:\n- caption: the post text (2-4 sentences, natural and engaging, no hashtags)\n- hashtags: 4-6 relevant hashtags as a space-separated string`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "backup_post",
          strict: true,
          schema: {
            type: "object",
            properties: {
              caption: { type: "string" },
              hashtags: { type: "string" },
            },
            required: ["caption", "hashtags"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = response.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : null;
    return {
      caption: parsed?.caption ?? "Excited to be serving our community! Thank you for your continued support.",
      hashtags: parsed?.hashtags ?? "#SmallBusiness #Community #ThankYou",
    };
  } catch {
    return {
      caption: "Grateful for every customer who walks through our door. You're the reason we do what we do!",
      hashtags: "#SmallBusiness #Community #Grateful",
    };
  }
}

// ── Replenish backup queue ────────────────────────────────────────────────────
async function replenishBackupQueue(workspaceId: number) {
  const db = await requireDb();
  // Count existing pending ai_backup posts
  const existing = await db
    .select({ count: sql<number>`count(*)` })
    .from(postQueue)
    .where(and(eq(postQueue.workspaceId, workspaceId), eq(postQueue.type, "ai_backup"), eq(postQueue.status, "pending_review")));
  const currentCount = Number(existing[0]?.count ?? 0);
  const needed = BACKUP_TARGET - currentCount;
  if (needed <= 0) return;

  // Get workspace brand info
  const ws = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  if (!ws[0]) return;

  // Generate needed backup posts
  for (let i = 0; i < needed; i++) {
    const post = await generateBackupPost({
      name: ws[0].name,
      industry: ws[0].industry ?? null,
      description: ws[0].description ?? null,
      toneOfVoice: ws[0].toneOfVoice ?? null,
      selectedPlatforms: ws[0].selectedPlatforms ?? null,
    });
    await db.insert(postQueue).values({
      workspaceId,
      type: "ai_backup",
      caption: post.caption,
      hashtags: post.hashtags,
      platforms: ws[0].selectedPlatforms ?? ["instagram", "facebook"],
      status: "pending_review",
    });
  }
}

// ── Router ────────────────────────────────────────────────────────────────────
export const postQueueRouter = router({
  // List queue for a workspace — sorted by priority
  list: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      // Verify membership
      const ws = await db.select().from(workspaces).where(eq(workspaces.id, input.workspaceId)).limit(1);
      if (!ws[0] || ws[0].ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const items = await db
        .select()
        .from(postQueue)
        .where(and(eq(postQueue.workspaceId, input.workspaceId), eq(postQueue.status, "pending_review")))
        .orderBy(
          // Priority: urgent first, then client with date, then client no date, then ai_backup
          desc(postQueue.isUrgent),
          asc(postQueue.scheduledDate),
          asc(postQueue.type),
          asc(postQueue.createdAt)
        );

      const clientPosts = items.filter((i: typeof items[0]) => i.type === "client");
      const backupPosts = items.filter((i: typeof items[0]) => i.type === "ai_backup");
      return { clientPosts, backupPosts, total: items.length };
    }),

  // Submit a client post to the queue (with date intent detection)
  submitClientPost: protectedProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        mediaUrl: z.string().optional(),
        mediaKey: z.string().optional(),
        caption: z.string().max(2000),
        hashtags: z.string().optional(),
        platforms: z.array(z.string()).optional(),
        rawNote: z.string().optional(), // the original voice/text note for date detection
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const ws = await db.select().from(workspaces).where(eq(workspaces.id, input.workspaceId)).limit(1);
      if (!ws[0] || ws[0].ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      // Detect date intent from the raw note
      const intent = input.rawNote ? await detectDateIntent(input.rawNote) : { scheduledDate: null, isUrgent: false, detectedEventName: null, detectedPersonName: null };

      // Add event hashtag if detected
      let hashtags = input.hashtags ?? "";
      if (intent.detectedEventName) {
        const eventTag = `#${intent.detectedEventName.replace(/\s+/g, "")}`;
        if (!hashtags.includes(eventTag)) hashtags = `${hashtags} ${eventTag}`.trim();
      }

      const [inserted] = await db.insert(postQueue).values({
        workspaceId: input.workspaceId,
        type: "client",
        mediaUrl: input.mediaUrl,
        mediaKey: input.mediaKey,
        caption: input.caption,
        hashtags,
        platforms: input.platforms ?? ws[0].selectedPlatforms ?? ["instagram", "facebook"],
        scheduledDate: intent.scheduledDate ?? undefined,
        isUrgent: intent.isUrgent,
        detectedEventName: intent.detectedEventName ?? undefined,
        detectedPersonName: intent.detectedPersonName ?? undefined,
        status: "pending_review",
      });

      return {
        id: (inserted as unknown as { insertId: number }).insertId,
        scheduledDate: intent.scheduledDate,
        isUrgent: intent.isUrgent,
        detectedEventName: intent.detectedEventName,
        detectedPersonName: intent.detectedPersonName,
        addedEventHashtag: !!intent.detectedEventName,
      };
    }),

  // Approve a queued post (agency action)
  approve: protectedProcedure
    .input(z.object({ queueItemId: z.number(), agencyNote: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await db.update(postQueue).set({ status: "approved", agencyNote: input.agencyNote, updatedAt: new Date() }).where(eq(postQueue.id, input.queueItemId));
      return { success: true };
    }),

  // Skip/reject a queued post and replenish backup if needed
  skip: protectedProcedure
    .input(z.object({ queueItemId: z.number(), workspaceId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await db.update(postQueue).set({ status: "skipped", updatedAt: new Date() }).where(eq(postQueue.id, input.queueItemId));
      // Replenish backup queue if an ai_backup was skipped
      const item = await db.select().from(postQueue).where(eq(postQueue.id, input.queueItemId)).limit(1);
      if (item[0]?.type === "ai_backup") {
        await replenishBackupQueue(input.workspaceId);
      }
      return { success: true };
    }),

  // Trigger backup queue replenishment (called after onboarding completes)
  replenishBackups: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const ws = await db.select().from(workspaces).where(eq(workspaces.id, input.workspaceId)).limit(1);
      if (!ws[0] || ws[0].ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await replenishBackupQueue(input.workspaceId);
      return { success: true };
    }),

  // Get queue stats (for dashboard widget)
  stats: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const ws = await db.select().from(workspaces).where(eq(workspaces.id, input.workspaceId)).limit(1);
      if (!ws[0] || ws[0].ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const counts = await db
        .select({ type: postQueue.type, count: sql<number>`count(*)` })
        .from(postQueue)
        .where(and(eq(postQueue.workspaceId, input.workspaceId), eq(postQueue.status, "pending_review")))
        .groupBy(postQueue.type);

      const clientCount = Number(counts.find((c: typeof counts[0]) => c.type === "client")?.count ?? 0);
      const backupCount = Number(counts.find((c: typeof counts[0]) => c.type === "ai_backup")?.count ?? 0);
      return { clientCount, backupCount, total: clientCount + backupCount, backupTarget: BACKUP_TARGET };
    }),
});
