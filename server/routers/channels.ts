import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, getWorkspaceById, getMemberRole } from "../db";
import { channelConnections } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

const CHANNEL_TYPES = [
  "email_gmail", "email_outlook", "email_imap",
  "sms",
  "google_business",
  "calendar_google", "calendar_calendly", "calendar_acuity",
  "calendar_simplybook", "calendar_square",
  "payment_square", "payment_stripe", "payment_xero",
  "payment_myob", "payment_paypal", "payment_shopify",
] as const;

async function assertWorkspaceAccess(workspaceId: number, userId: number) {
  const ws = await getWorkspaceById(workspaceId);
  if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
  if (ws.ownerId !== userId) {
    const role = await getMemberRole(workspaceId, userId);
    if (!role) throw new TRPCError({ code: "FORBIDDEN" });
  }
}

export const channelsRouter = router({
  // Get all channel connections for a workspace
  list: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceAccess(input.workspaceId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const connections = await db
        .select()
        .from(channelConnections)
        .where(eq(channelConnections.workspaceId, input.workspaceId))
        .orderBy(channelConnections.channelType);

      return connections;
    }),

  // Save or update a channel connection (upsert by workspaceId + channelType)
  save: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      channelType: z.enum(CHANNEL_TYPES),
      status: z.enum(["connected", "pending", "skipped", "disconnected"]),
      accountName: z.string().optional(),
      accountEmail: z.string().optional(),
      phoneNumber: z.string().optional(),
      metadata: z.record(z.string(), z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertWorkspaceAccess(input.workspaceId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check if row exists
      const existing = await db
        .select()
        .from(channelConnections)
        .where(
          and(
            eq(channelConnections.workspaceId, input.workspaceId),
            eq(channelConnections.channelType, input.channelType)
          )
        )
        .limit(1);

      const updateData = {
        status: input.status,
        accountName: input.accountName,
        accountEmail: input.accountEmail,
        phoneNumber: input.phoneNumber,
        metadata: input.metadata as Record<string, string> | undefined,
        connectedAt: input.status === "connected" ? new Date() : undefined,
      };

      if (existing.length > 0) {
        await db
          .update(channelConnections)
          .set(updateData)
          .where(
            and(
              eq(channelConnections.workspaceId, input.workspaceId),
              eq(channelConnections.channelType, input.channelType)
            )
          );
      } else {
        await db.insert(channelConnections).values([{
          workspaceId: input.workspaceId,
          channelType: input.channelType,
          ...updateData,
        }]);
      }

      return { success: true };
    }),
});
