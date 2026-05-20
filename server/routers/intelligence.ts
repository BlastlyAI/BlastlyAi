import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, getWorkspaceById, getMemberRole } from "../db";
import { intelligenceFeedItems } from "../../drizzle/schema";
import { eq, and, inArray, asc, desc } from "drizzle-orm";

async function assertWorkspaceAccess(workspaceId: number, userId: number) {
  const ws = await getWorkspaceById(workspaceId);
  if (!ws) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
  if (ws.ownerId !== userId) {
    const role = await getMemberRole(workspaceId, userId);
    if (!role) throw new TRPCError({ code: "FORBIDDEN" });
  }
  return ws;
}

export const intelligenceRouter = router({
  // List pending feed items for a workspace, sorted by priority then createdAt
  list: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceAccess(input.workspaceId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const items = await db
        .select()
        .from(intelligenceFeedItems)
        .where(
          and(
            eq(intelligenceFeedItems.workspaceId, input.workspaceId),
            eq(intelligenceFeedItems.status, "pending")
          )
        )
        .orderBy(asc(intelligenceFeedItems.priority), desc(intelligenceFeedItems.createdAt));

      return items;
    }),

  // Action an item (mark as actioned, optionally store reply text)
  action: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      itemId: z.number(),
      replyText: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertWorkspaceAccess(input.workspaceId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(intelligenceFeedItems)
        .set({
          status: "actioned",
          actionedAt: new Date(),
          // Store reply in metadata if provided
          ...(input.replyText ? { metadata: { replyText: input.replyText } as Record<string, unknown> } : {}),
        })
        .where(
          and(
            eq(intelligenceFeedItems.id, input.itemId),
            eq(intelligenceFeedItems.workspaceId, input.workspaceId)
          )
        );

      return { success: true };
    }),

  // Dismiss an awareness item
  dismiss: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      itemId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertWorkspaceAccess(input.workspaceId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(intelligenceFeedItems)
        .set({ status: "dismissed", actionedAt: new Date() })
        .where(
          and(
            eq(intelligenceFeedItems.id, input.itemId),
            eq(intelligenceFeedItems.workspaceId, input.workspaceId)
          )
        );

      return { success: true };
    }),

  // Seed demo items for a workspace (used in onboarding/demo mode)
  seedDemo: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await assertWorkspaceAccess(input.workspaceId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const now = new Date();
      const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const in4h = new Date(now.getTime() + 4 * 60 * 60 * 1000);

      const demoItems = [
        {
          workspaceId: input.workspaceId,
          priority: 1,
          itemType: "appointment_upcoming" as const,
          channel: "calendar",
          senderName: "Sarah Mitchell",
          messageSnippet: "Colour + Cut",
          aiContextLine: "Confirmed booking — arriving in 2 hours",
          scheduledAt: in2h,
          status: "pending" as const,
        },
        {
          workspaceId: input.workspaceId,
          priority: 1,
          itemType: "appointment_upcoming" as const,
          channel: "calendar",
          senderName: "Emma Thompson",
          messageSnippet: "Blow dry",
          aiContextLine: "Awaiting confirmation — booked in 4 hours",
          scheduledAt: in4h,
          status: "pending" as const,
        },
        {
          workspaceId: input.workspaceId,
          priority: 2,
          itemType: "lead_new" as const,
          channel: "instagram",
          senderName: "Mia R.",
          messageSnippet: "Hi! Do you have any appointments available this week? I'd love to come in for a cut and colour 😊",
          aiContextLine: "Booking intent — wants appointment this week",
          aiDraftReply: "Hi Mia! Yes we have availability Wednesday at 2pm and Thursday at 10am — does either work for you? 😊",
          status: "pending" as const,
        },
        {
          workspaceId: input.workspaceId,
          priority: 3,
          itemType: "message_sms" as const,
          channel: "sms",
          senderName: "James T.",
          messageSnippet: "Hey, quick question — do you stock the Olaplex range?",
          aiContextLine: "Product enquiry — Olaplex stock question",
          aiDraftReply: "Hi James! Yes we carry the full Olaplex range in-store. Happy to set some aside for you — just let me know which products you're after.",
          status: "pending" as const,
        },
        {
          workspaceId: input.workspaceId,
          priority: 5,
          itemType: "review_negative" as const,
          channel: "google",
          senderName: "Anonymous",
          messageSnippet: "Waited 20 minutes past my appointment time. Not impressed.",
          aiContextLine: "1-star Google review — needs a response",
          aiDraftReply: "Thank you for your feedback. We sincerely apologise for the wait — this isn't the experience we want for our clients. Please reach out directly so we can make it right.",
          status: "pending" as const,
        },
        {
          workspaceId: input.workspaceId,
          priority: 6,
          itemType: "traction_post" as const,
          channel: "instagram",
          senderName: null,
          messageSnippet: "Your post from last night has 47 likes and is still growing",
          aiContextLine: "High engagement — consider boosting this post",
          status: "pending" as const,
        },
        {
          workspaceId: input.workspaceId,
          priority: 6,
          itemType: "invoice_paid" as const,
          channel: "square",
          senderName: "Sarah Mitchell",
          messageSnippet: "Invoice #47 paid — $185.00",
          aiContextLine: "Payment received via Square",
          status: "pending" as const,
        },
        {
          workspaceId: input.workspaceId,
          priority: 6,
          itemType: "budget_low" as const,
          channel: "ads",
          senderName: null,
          messageSnippet: "Ad budget is running low — $12.40 remaining",
          aiContextLine: "At current spend rate, budget runs out in 3 days",
          status: "pending" as const,
        },
      ];

      await db.insert(intelligenceFeedItems).values(demoItems);
      return { success: true, count: demoItems.length };
    }),
});
