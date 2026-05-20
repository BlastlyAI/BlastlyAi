import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { sharedReports } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

export const shareReportRouter = router({
  // Create a shareable link for an authenticated user's scan result
  createShare: protectedProcedure
    .input(z.object({
      reportType: z.enum(["digital_presence", "seo", "competitor"]),
      websiteUrl: z.string(),
      overallScore: z.number().optional(),
      scanData: z.any(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const shareToken = crypto.randomBytes(24).toString("hex");

      await db.insert(sharedReports).values({
        shareToken,
        userId: ctx.user.id,
        reportType: input.reportType,
        websiteUrl: input.websiteUrl,
        overallScore: input.overallScore ?? null,
        scanData: input.scanData,
        expiresAt: null,
      });

      return { shareToken, shareUrl: `/report/${shareToken}` };
    }),

  // Create a share for a public (unauthenticated) scan — no userId stored
  createPublicShare: publicProcedure
    .input(z.object({
      reportType: z.enum(["digital_presence", "seo", "competitor"]),
      websiteUrl: z.string(),
      overallScore: z.number().optional(),
      scanData: z.any(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const shareToken = crypto.randomBytes(24).toString("hex");

      await db.insert(sharedReports).values({
        shareToken,
        userId: null,
        reportType: input.reportType,
        websiteUrl: input.websiteUrl,
        overallScore: input.overallScore ?? null,
        scanData: input.scanData,
        expiresAt: null,
      });

      return { shareToken, shareUrl: `/report/${shareToken}` };
    }),

  // Fetch a shared report by token (public — no auth required)
  getSharedReport: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [report] = await db
        .select()
        .from(sharedReports)
        .where(eq(sharedReports.shareToken, input.token))
        .limit(1);

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found or link has expired." });
      }

      if (report.expiresAt && new Date(report.expiresAt) < new Date()) {
        throw new TRPCError({ code: "NOT_FOUND", message: "This report link has expired." });
      }

      return report;
    }),
});
