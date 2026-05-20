import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { scheduledPosts } from "../../drizzle/schema";
import { eq, and, gte } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";

function getNextWeeklyDueDates(): number[] {
  const now = new Date();
  const result: number[] = [];
  const targetDays = [1, 3, 5];
  const d = new Date(now);
  d.setHours(9, 0, 0, 0);
  let checked = 0;
  while (result.length < 3 && checked < 14) {
    if (targetDays.includes(d.getDay()) && d.getTime() > now.getTime()) {
      result.push(d.getTime());
    }
    d.setTime(d.getTime() + 86400000);
    checked++;
  }
  return result;
}

export const scheduledPostsRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const now = Date.now();
      return db.select().from(scheduledPosts).where(
        and(
          eq(scheduledPosts.workspaceId, input.workspaceId),
          gte(scheduledPosts.dueAt, now - 86400000 * 2)
        )
      ).orderBy(scheduledPosts.dueAt);
    }),

  ensureWeeklySlots: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const now = Date.now();
      const upcoming = await db.select().from(scheduledPosts).where(
        and(
          eq(scheduledPosts.workspaceId, input.workspaceId),
          gte(scheduledPosts.dueAt, now)
        )
      );
      const existingDueDates = new Set(upcoming.map((p: { dueAt: number }) => p.dueAt));
      const needed = getNextWeeklyDueDates().filter(d => !existingDueDates.has(d));
      for (const dueAt of needed) {
        await db.insert(scheduledPosts).values({
          workspaceId: input.workspaceId,
          dueAt,
          status: "pending",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      return { created: needed.length };
    }),

  generateDraft: protectedProcedure
    .input(z.object({
      postId: z.number(),
      businessName: z.string().optional(),
      industry: z.string().optional(),
      tone: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [post] = await db.select().from(scheduledPosts).where(eq(scheduledPosts.id, input.postId));
      if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });

      await db.update(scheduledPosts).set({ status: "ai_drafting", updatedAt: Date.now() }).where(eq(scheduledPosts.id, input.postId));

      const dueDate = new Date(post.dueAt).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
      const businessContext = input.businessName
        ? `Business: ${input.businessName}${input.industry ? `, Industry: ${input.industry}` : ""}`
        : "a local small business";

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a social media expert for local small businesses. Write short, engaging posts under 150 words with 2-3 hashtags. Sound human, not corporate." },
          { role: "user", content: `Write a social media post for ${businessContext} due on ${dueDate}. Tone: ${input.tone ?? "friendly and professional"}.` },
        ],
      });

      const rawContent = response.choices?.[0]?.message?.content;
      const draftContent = typeof rawContent === "string"
        ? rawContent
        : "Great week ahead! We're here and ready to help. Book your appointment today. 📅 #LocalBusiness #BookNow";

      await db.update(scheduledPosts).set({
        status: "awaiting_approval",
        draftContent,
        draftPlatforms: "google,tiktok,instagram",
        updatedAt: Date.now(),
      }).where(eq(scheduledPosts.id, input.postId));

      return { draftContent };
    }),

  approve: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(scheduledPosts).set({
        status: "approved",
        approvedAt: Date.now(),
        approvedBy: ctx.user.id,
        updatedAt: Date.now(),
      }).where(eq(scheduledPosts.id, input.postId));
      return { success: true };
    }),

  skip: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(scheduledPosts).set({ status: "skipped", updatedAt: Date.now() }).where(eq(scheduledPosts.id, input.postId));
      return { success: true };
    }),

  updateContent: protectedProcedure
    .input(z.object({ postId: z.number(), content: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(scheduledPosts).set({
        draftContent: input.content,
        status: "awaiting_approval",
        updatedAt: Date.now(),
      }).where(eq(scheduledPosts.id, input.postId));
      return { success: true };
    }),
});
