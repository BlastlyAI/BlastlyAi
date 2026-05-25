import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { runAuditPipeline } from "../audit/auditProvider";
import { saveAuditToSupabase } from "../audit/supabaseStore";
import { isSupabaseAuditConfigured } from "../lib/supabaseAuditClient";
import { getDb } from "../db";
import { auditReports } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

export const auditRouter = router({
  runAudit: publicProcedure
    .input(
      z.object({
        businessName: z.string().min(1),
        industry: z.string().optional(),
        website: z.string().optional(),
        handles: z
          .object({
            twitter: z.string().optional(),
            linkedin: z.string().optional(),
            facebook: z.string().optional(),
            instagram: z.string().optional(),
          })
          .optional(),
        adSpend: z.number().optional(),
        workspaceId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await runAuditPipeline({
        businessName: input.businessName,
        industry: input.industry,
        website: input.website,
        handles: input.handles,
        adSpend: input.adSpend,
        workspaceId: input.workspaceId != null ? String(input.workspaceId) : null,
      });

      if (isSupabaseAuditConfigured()) {
        const save = await saveAuditToSupabase(
          result.persistPayload,
          result.businessName
        );
        const { persistPayload: _p, ...response } = result;
        return { success: true, savedReportId: save.id, ...response };
      }

      const db = await requireDb();
      const p = result.persistPayload;
      await db.insert(auditReports).values({
        shareToken: p.shareToken,
        workspaceId: input.workspaceId ?? null,
        businessName: p.businessName,
        industry: p.industry,
        website: p.website,
        handles: p.handles as Record<string, string> | null,
        description: p.description,
        detectedHandles: p.detectedHandles as Record<string, string | null> | null,
        geographicReach: p.geographicReach,
        adSpend: p.adSpend,
        overallScore: p.overallScore,
        platformScores: p.platformScores,
        contentScore: p.contentScore,
        adQualityScore: p.adQualityScore,
        engagementScore: p.engagementScore,
        growthScore: p.growthScore,
        cyberSecurityScore: p.cyberSecurityScore,
        findings: p.findings,
        recommendations: p.recommendations,
        blastlyPitch: p.blastlyPitch,
        rawReport: p.rawReport,
      });

      const { persistPayload: _p, ...response } = result;
      return response;
    }),

  getReport: publicProcedure
    .input(z.object({ shareToken: z.string() }))
    .query(async ({ input }) => {
      if (isSupabaseAuditConfigured()) {
        const { getAuditByShareToken, toClientAuditRow } = await import("../audit/supabaseStore");
        const row = await getAuditByShareToken(input.shareToken);
        if (!row) throw new Error("Report not found");
        return toClientAuditRow(row);
      }

      const db = await requireDb();
      const rows = await db
        .select()
        .from(auditReports)
        .where(eq(auditReports.shareToken, input.shareToken))
        .limit(1);
      if (!rows.length) throw new Error("Report not found");
      const row = rows[0];
      const raw = row.rawReport as Record<string, unknown> | null;
      return {
        ...row,
        recommendedPlatforms: (raw?.recommendedPlatforms as string[] | null) ?? null,
        targetAudience: (raw?.targetAudience as Record<string, unknown> | null) ?? null,
      };
    }),

  listAudits: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(auditReports)
        .where(eq(auditReports.workspaceId, input.workspaceId))
        .orderBy(auditReports.createdAt)
        .limit(50);
    }),
});
