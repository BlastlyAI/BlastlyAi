import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { brandBriefs, brandPhotos } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return db;
}

export const brandBriefRouter = router({
  // ── Get brand brief for a workspace ─────────────────────────────────────────
  get: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(brandBriefs)
        .where(eq(brandBriefs.workspaceId, input.workspaceId))
        .limit(1);
      return rows[0] ?? null;
    }),

  // ── Save (upsert) brand brief ────────────────────────────────────────────────
  save: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      businessDescription: z.string().optional(),
      productsServices: z.string().optional(),
      differentiators: z.string().optional(),
      neverSay: z.string().optional(),
      targetAudience: z.string().optional(),
      tone: z.enum(["professional", "friendly", "bold", "nurturing", "humorous", "authoritative", "casual"]).optional(),
      approvedPhrases: z.string().optional(),
      avoidPhrases: z.string().optional(),
      brandColors: z.array(z.string()).optional(),
      logoUrl: z.string().optional(),
      complianceRules: z.string().optional(),
      noPriceClaims: z.boolean().optional(),
      noTestimonials: z.boolean().optional(),
      noCompetitorMentions: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { workspaceId, ...data } = input;

      const existing = await db.select({ id: brandBriefs.id })
        .from(brandBriefs)
        .where(eq(brandBriefs.workspaceId, workspaceId))
        .limit(1);

      if (existing.length > 0) {
        await db.update(brandBriefs)
          .set(data)
          .where(eq(brandBriefs.workspaceId, workspaceId));
      } else {
        await db.insert(brandBriefs).values({ workspaceId, ...data });
      }

      const rows = await db.select().from(brandBriefs)
        .where(eq(brandBriefs.workspaceId, workspaceId))
        .limit(1);
      return rows[0];
    }),

  // ── Upload a photo to the brand photo library ────────────────────────────────
  uploadPhoto: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      fileBase64: z.string(),   // base64 encoded image
      mimeType: z.string(),
      label: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const buffer = Buffer.from(input.fileBase64, "base64");
      const ext = input.mimeType.split("/")[1] ?? "jpg";
      const fileKey = `brand-photos/${input.workspaceId}/${nanoid(12)}.${ext}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);

      const [result] = await db.insert(brandPhotos).values({
        workspaceId: input.workspaceId,
        fileUrl: url,
        fileKey,
        label: input.label ?? null,
        isApproved: true,
        uploadedByUserId: ctx.user.id,
      });

      const rows = await db.select().from(brandPhotos)
        .where(eq(brandPhotos.id, (result as any).insertId))
        .limit(1);
      return rows[0];
    }),

  // ── List photos for a workspace ──────────────────────────────────────────────
  getPhotos: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(brandPhotos)
        .where(and(
          eq(brandPhotos.workspaceId, input.workspaceId),
          eq(brandPhotos.isApproved, true)
        ))
        .orderBy(brandPhotos.createdAt);
    }),

  // ── Delete a photo ───────────────────────────────────────────────────────────
  deletePhoto: protectedProcedure
    .input(z.object({ photoId: z.number(), workspaceId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(brandPhotos)
        .where(and(
          eq(brandPhotos.id, input.photoId),
          eq(brandPhotos.workspaceId, input.workspaceId)
        ));
      return { success: true };
    }),
});
