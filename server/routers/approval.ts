import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { posts, workspaces } from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "../_core/notification";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return db;
}

export const approvalRouter = router({
  // ── Agency: get all posts pending agency review (across all workspaces) ──────
  getPendingPosts: protectedProcedure
    .input(z.object({
      status: z.enum(["pending_agency", "pending_client", "approved", "rejected", "all"]).default("pending_agency"),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const statusFilter = input.status === "all"
        ? ["pending_agency", "pending_client", "approved", "rejected"] as const
        : [input.status] as const;

      const rows = await db.select({
        id: posts.id,
        workspaceId: posts.workspaceId,
        title: posts.title,
        bodyText: posts.bodyText,
        mediaUrls: posts.mediaUrls,
        hashtags: posts.hashtags,
        approvalStatus: posts.approvalStatus,
        agencyNote: posts.agencyNote,
        clientNote: posts.clientNote,
        previewToken: posts.previewToken,
        scheduledAt: posts.scheduledAt,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
      })
        .from(posts)
        .where(inArray(posts.approvalStatus, statusFilter as any))
        .orderBy(posts.createdAt)
        .limit(input.limit);

      // Enrich with workspace names
      const workspaceIds = Array.from(new Set(rows.map(r => r.workspaceId)));
      const workspaceRows = workspaceIds.length > 0
        ? await db.select({ id: workspaces.id, name: workspaces.name })
            .from(workspaces)
            .where(inArray(workspaces.id, workspaceIds))
        : [];
      const wsMap = Object.fromEntries(workspaceRows.map(w => [w.id, w.name]));

      return rows.map(r => ({ ...r, workspaceName: wsMap[r.workspaceId] ?? "Unknown" }));
    }),

  // ── Agency: approve a post (moves to pending_client or approved) ─────────────
  approvePost: protectedProcedure
    .input(z.object({
      postId: z.number(),
      sendToClient: z.boolean().default(true),  // true = pending_client, false = approved/scheduled
      agencyNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const token = nanoid(24);
      const newStatus = input.sendToClient ? "pending_client" : "approved";

      await db.update(posts)
        .set({
          approvalStatus: newStatus,
          agencyNote: input.agencyNote ?? null,
          previewToken: token,
          approvedByUserId: input.sendToClient ? null : ctx.user.id,
          approvedAt: input.sendToClient ? null : new Date(),
        })
        .where(eq(posts.id, input.postId));

      return { success: true, previewToken: token, status: newStatus };
    }),

  // ── Agency: edit content and approve in one step ─────────────────────────────
  editAndApprove: protectedProcedure
    .input(z.object({
      postId: z.number(),
      bodyText: z.string(),
      title: z.string().optional(),
      hashtags: z.array(z.string()).optional(),
      sendToClient: z.boolean().default(true),
      agencyNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const token = nanoid(24);
      const newStatus = input.sendToClient ? "pending_client" : "approved";

      await db.update(posts)
        .set({
          bodyText: input.bodyText,
          title: input.title,
          hashtags: input.hashtags ?? null,
          approvalStatus: newStatus,
          agencyNote: input.agencyNote ?? null,
          previewToken: token,
          approvedByUserId: input.sendToClient ? null : ctx.user.id,
          approvedAt: input.sendToClient ? null : new Date(),
        })
        .where(eq(posts.id, input.postId));

      return { success: true, previewToken: token, status: newStatus };
    }),

  // ── Agency: reject a post (sends back to draft with note) ────────────────────
  rejectPost: protectedProcedure
    .input(z.object({
      postId: z.number(),
      agencyNote: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(posts)
        .set({
          approvalStatus: "rejected",
          agencyNote: input.agencyNote,
        })
        .where(eq(posts.id, input.postId));
      return { success: true };
    }),

  // ── Client: get preview posts by token (public — no login required) ──────────
  getClientPreview: publicProcedure
    .input(z.object({ previewToken: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select({
        id: posts.id,
        workspaceId: posts.workspaceId,
        title: posts.title,
        bodyText: posts.bodyText,
        mediaUrls: posts.mediaUrls,
        hashtags: posts.hashtags,
        approvalStatus: posts.approvalStatus,
        clientNote: posts.clientNote,
        scheduledAt: posts.scheduledAt,
        createdAt: posts.createdAt,
      })
        .from(posts)
        .where(eq(posts.previewToken, input.previewToken))
        .limit(1);

      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Preview not found" });

      // Get workspace name for context
      const ws = await db.select({ name: workspaces.name, id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.id, rows[0].workspaceId))
        .limit(1);

      // Get all pending_client posts for this workspace
      const allPending = await db.select({
        id: posts.id,
        title: posts.title,
        bodyText: posts.bodyText,
        mediaUrls: posts.mediaUrls,
        hashtags: posts.hashtags,
        approvalStatus: posts.approvalStatus,
        clientNote: posts.clientNote,
        scheduledAt: posts.scheduledAt,
        previewToken: posts.previewToken,
      })
        .from(posts)
        .where(and(
          eq(posts.workspaceId, rows[0].workspaceId),
          eq(posts.approvalStatus, "pending_client")
        ))
        .orderBy(posts.scheduledAt)
        .limit(20);

      return {
        workspaceName: ws[0]?.name ?? "Your Business",
        posts: allPending,
      };
    }),

  // ── Client: flag a post (public — no login required) ────────────────────────
  clientFlag: publicProcedure
    .input(z.object({
      previewToken: z.string(),
      postId: z.number(),
      note: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(posts)
        .set({
          clientNote: input.note,
          approvalStatus: "pending_agency",  // sends back to agency queue
        })
        .where(and(
          eq(posts.id, input.postId),
          eq(posts.previewToken, input.previewToken)
        ));

      // Notify the owner
      await notifyOwner({
        title: "Client flagged a post for review",
        content: `A client has flagged a post with the note: "${input.note}". Please review in the Approval Queue.`,
      });

      return { success: true };
    }),

  // ── Client: approve all pending posts (public — no login required) ───────────
  clientApproveAll: publicProcedure
    .input(z.object({ previewToken: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      // Find the workspace from the token
      const tokenPost = await db.select({ workspaceId: posts.workspaceId })
        .from(posts)
        .where(eq(posts.previewToken, input.previewToken))
        .limit(1);

      if (!tokenPost.length) throw new TRPCError({ code: "NOT_FOUND", message: "Preview not found" });

      await db.update(posts)
        .set({ approvalStatus: "approved", approvedAt: new Date() })
        .where(and(
          eq(posts.workspaceId, tokenPost[0].workspaceId),
          eq(posts.approvalStatus, "pending_client")
        ));

      return { success: true };
    }),

  // ── Get approval stats for dashboard ────────────────────────────────────────
  getStats: protectedProcedure
    .query(async () => {
      const db = await requireDb();
      const allPending = await db.select({ approvalStatus: posts.approvalStatus })
        .from(posts)
        .where(inArray(posts.approvalStatus, ["pending_agency", "pending_client"] as any));

      const pendingAgency = allPending.filter(p => p.approvalStatus === "pending_agency").length;
      const pendingClient = allPending.filter(p => p.approvalStatus === "pending_client").length;

      return { pendingAgency, pendingClient, total: pendingAgency + pendingClient };
    }),
});
