import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import { getDb, getWorkspaceById, getMemberRole } from "../db";
import { intelligenceReports, auditReports } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { fetchPageText } from "../agents/fetcher";

type LLMResponse = { choices: Array<{ message: { content: string } }> };

async function llmJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const res = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt + "\n\nRespond with raw JSON only — no markdown fences, no explanation, just the JSON object." },
      { role: "user", content: userPrompt },
    ],
  }) as LLMResponse;
  let raw: string = res.choices[0]?.message?.content ?? "{}";
  if (typeof raw === "string") {
    raw = raw.trim();
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error("[IntelligenceReport] Failed to parse LLM JSON:", raw.slice(0, 500));
    return {} as T;
  }
}

async function assertWorkspaceAccess(workspaceId: number, userId: number) {
  const ws = await getWorkspaceById(workspaceId);
  if (!ws) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
  if (ws.ownerId !== userId) {
    const role = await getMemberRole(workspaceId, userId);
    if (!role) throw new TRPCError({ code: "FORBIDDEN" });
  }
  return ws;
}

// ─── The master prompt that generates all 9 sections ─────────────────────────
function buildIntelligencePrompt(context: {
  websiteUrl: string;
  pageContent: string;
  pageTitle: string;
  businessName: string;
  industry: string;
  description: string;
  location: string;
  socialProfiles: Record<string, string | null>;
  existingAuditData: Record<string, unknown> | null;
  voiceSummary: string | null;
}): string {
  return `
You are an elite business intelligence analyst specialising in local business marketing.
Produce a comprehensive Client Intelligence Report for this business.

BUSINESS CONTEXT:
- URL: ${context.websiteUrl}
- Business Name: ${context.businessName}
- Industry: ${context.industry}
- Description: ${context.description}
- Location: ${context.location}
- Social Profiles: ${JSON.stringify(context.socialProfiles)}
${context.voiceSummary ? `- Owner Voice Summary: "${context.voiceSummary}"` : ""}

WEBSITE CONTENT (scraped):
Title: ${context.pageTitle}
Content: ${context.pageContent}

${context.existingAuditData ? `EXISTING AUDIT DATA:\n${JSON.stringify(context.existingAuditData, null, 2).slice(0, 3000)}` : ""}

PRODUCE a JSON object with this EXACT structure. Every field must have a clear data label.
Use your knowledge of the industry, location, and business type to provide realistic, actionable intelligence.
For data you cannot confirm, provide your best estimate and set confidence_score lower (60-75).
For data you can infer from the website content, set confidence_score higher (80-95).

{
  "report_version": "1.0",
  "generated_at": "<ISO timestamp>",
  "website_url": "${context.websiteUrl}",
  "overall_confidence_score": <0-100 average of all section scores>,
  "sections": {
    "business_snapshot": {
      "label": "business_snapshot",
      "business_name": "<string>",
      "location_city": "<string or null>",
      "location_state": "<string or null>",
      "location_country": "<string or null>",
      "industry": "<string>",
      "business_description": "<1-2 sentences>",
      "tagline": "<string or null>",
      "geographic_reach": "<local|state|national|international>",
      "platforms_active": ["<platform names currently active>"],
      "platforms_recommended": ["<platform names recommended>"],
      "google_review_score": <number or null>,
      "google_review_count": <number or null>,
      "top_competitor_review_score": <number or null>,
      "confidence_score": <0-100>
    },
    "market_demand": {
      "label": "market_demand",
      "top_keywords": [
        {"keyword": "<string>", "estimated_monthly_searches": "<e.g. 1,200>", "difficulty": "<low|medium|high>"}
      ],
      "ai_engine_questions": [
        {"question": "<string>", "source": "<e.g. Google SGE, ChatGPT, Perplexity>"}
      ],
      "customer_frustrations": [
        {"frustration": "<string>", "source": "<e.g. Reddit, Google Reviews, Forum>"}
      ],
      "peak_seasonal_months": ["<month names>"],
      "seasonal_notes": "<string>",
      "confidence_score": <0-100>
    },
    "competitive_position": {
      "label": "competitive_position",
      "internal_only": true,
      "competitors": [
        {
          "name": "<competitor business name>",
          "website_url": "<string or null>",
          "google_rating": <number or null>,
          "google_review_count": <number or null>,
          "social_activity_level": "<dormant|low|moderate|active|very_active>",
          "platforms_active": ["<platform names>"],
          "visible_gaps": ["<weakness we can exploit>"],
          "estimated_monthly_traffic": "<string or null>"
        }
      ],
      "client_vs_competitors": {
        "reviews_position": "<leading|competitive|behind>",
        "visibility_position": "<leading|competitive|behind>",
        "social_activity_position": "<leading|competitive|behind>"
      },
      "biggest_opportunity": "<string>",
      "confidence_score": <0-100>
    },
    "reputation_summary": {
      "label": "reputation_summary",
      "strongest_proof_points": ["<string>"],
      "reputation_issues": ["<string>"],
      "unanswered_negative_reviews": <number>,
      "recommended_testimonial_angles": ["<string>"],
      "review_sources_checked": ["<e.g. Google, Facebook, Trustpilot>"],
      "top_praise_themes": ["<string>"],
      "top_complaint_themes": ["<string>"],
      "confidence_score": <0-100>
    },
    "visibility_baseline": {
      "label": "visibility_baseline",
      "month_label": "Month 1 Baseline",
      "local_search_position": "<e.g. Position 4 in local pack>",
      "local_pack_appearing": <true|false>,
      "nap_consistency": "<pass|fail|partial>",
      "nap_issues": ["<string>"],
      "website_health_score": <0-100>,
      "website_mobile_friendly": <true|false>,
      "website_page_speed": "<fast|moderate|slow>",
      "website_indexed": <true|false>,
      "website_has_blog": <true|false>,
      "website_has_faqs": <true|false>,
      "duplicate_listings_found": <number>,
      "confidence_score": <0-100>
    },
    "opportunity_gaps": {
      "label": "opportunity_gaps",
      "content_gaps": [
        {"gap": "<string>", "impact": "<high|medium|low>"}
      ],
      "keyword_opportunities": [
        {"keyword": "<string>", "current_position": "<string or null>", "opportunity": "<string>"}
      ],
      "biggest_market_gap": "<string>",
      "recommended_primary_message": "<the core message for all content>",
      "confidence_score": <0-100>
    },
    "customer_journey": {
      "label": "customer_journey",
      "how_customers_find": ["<discovery channel>"],
      "what_they_check_before_deciding": ["<string>"],
      "key_objections_to_address": ["<string>"],
      "decision_cycle_length": "<e.g. 1-3 days, 2-4 weeks>",
      "confidence_score": <0-100>
    },
    "quick_wins": {
      "label": "quick_wins",
      "actions": [
        {
          "action": "<specific actionable step>",
          "estimated_impact": "<string>",
          "ease": "<easy|medium|hard>",
          "timeframe": "<e.g. This week, 2-3 days>"
        }
      ],
      "confidence_score": <0-100>
    },
    "content_strategy_bridge": {
      "label": "content_strategy_bridge",
      "recommended_content_types": ["<string>"],
      "recommended_posting_frequency": "<string>",
      "platforms_to_prioritise": ["<platform names>"],
      "aeo_content_angles": [
        {"question": "<string>", "why_this_business_should_answer": "<string>"}
      ],
      "seasonal_calendar_90_days": [
        {"month": "<string>", "theme": "<string>", "content_ideas": ["<string>"]}
      ],
      "confidence_score": <0-100>
    }
  },
  "brand_voice": ${context.voiceSummary ? `{
    "exact_phrases": ["<their own words for what they do best>"],
    "differentiators": ["<unique selling points they mention>"],
    "natural_tone": "<e.g. warm and casual, professional and direct>",
    "problems_they_solve": ["<in their own words>"]
  }` : "null"}
}

IMPORTANT RULES:
1. Provide 5 items for top_keywords, 3 for ai_engine_questions, 3 for customer_frustrations
2. Provide exactly 3 competitors in competitive_position
3. Provide exactly 3 actions in quick_wins, ordered by ease
4. Provide 3 months in seasonal_calendar_90_days starting from the current month
5. All data must be realistic and specific to this business type and location
6. Competitors section is INTERNAL ONLY — never shown to customer
7. Set confidence_score per section: 90+ if from website data, 70-85 if inferred from industry knowledge
`;
}

// ─── Brand Voice extraction prompt ───────────────────────────────────────────
function buildBrandVoicePrompt(voiceSummary: string): string {
  return `
Analyse this voice summary from a business owner describing their business.
Extract the following into a structured JSON object:

VOICE SUMMARY:
"${voiceSummary}"

Return JSON:
{
  "exact_phrases": ["<their exact words for what they do best — keep their phrasing>"],
  "differentiators": ["<unique selling points or things that make them different>"],
  "natural_tone": "<describe their communication style, e.g. warm and casual, professional and direct, enthusiastic and energetic>",
  "problems_they_solve": ["<problems they describe solving, in their own words>"]
}

RULES:
- Keep their exact phrasing where possible — do not rewrite in marketing speak
- Extract 3-5 items per array
- The tone description should be 3-5 words
`;
}

export const intelligenceReportRouter = router({
  // ── Generate a full intelligence report for a workspace ─────────────────────
  generate: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      websiteUrl: z.string().min(1),
      voiceSummary: z.string().optional(),
      auditShareToken: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertWorkspaceAccess(input.workspaceId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Fetch existing audit data if available
      let existingAuditData: Record<string, unknown> | null = null;
      if (input.auditShareToken) {
        const [audit] = await db.select().from(auditReports)
          .where(eq(auditReports.shareToken, input.auditShareToken))
          .limit(1);
        if (audit?.rawReport) {
          existingAuditData = audit.rawReport as Record<string, unknown>;
        }
      }

      // Scrape the website for fresh content
      let pageContent = "";
      let pageTitle = "";
      const urlToFetch = input.websiteUrl.startsWith("http") ? input.websiteUrl : `https://${input.websiteUrl}`;
      try {
        const fetched = await fetchPageText(urlToFetch);
        pageContent = fetched.text.slice(0, 5000);
        pageTitle = fetched.title;
      } catch (e) {
        console.error("[IntelligenceReport] Failed to fetch page:", e);
      }

      // Extract context from existing audit data
      const businessName = (existingAuditData?.businessName as string) || input.websiteUrl.replace(/^https?:\/\//, "").split("/")[0];
      const industry = (existingAuditData?.industry as string) || "Unknown";
      const description = (existingAuditData?.businessDescription as string) || "";
      const locationCity = (existingAuditData?.locationCity as string) || "";
      const locationState = (existingAuditData?.locationState as string) || "";
      const locationCountry = (existingAuditData?.locationCountry as string) || "Australia";
      const location = [locationCity, locationState, locationCountry].filter(Boolean).join(", ");
      const socialProfiles = (existingAuditData?.detectedHandles as Record<string, string | null>) || {};

      // Create the report record in "generating" status
      const [inserted] = await db.insert(intelligenceReports).values({
        workspaceId: input.workspaceId,
        userId: ctx.user.id,
        websiteUrl: input.websiteUrl,
        reportVersion: "1.0",
        overallConfidenceScore: 0,
        reportData: {},
        status: "generating",
        sectionsCompleted: [],
        auditShareToken: input.auditShareToken || null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const reportId = (inserted as unknown as { insertId: number }).insertId;

      // Generate the full report via LLM
      const prompt = buildIntelligencePrompt({
        websiteUrl: input.websiteUrl,
        pageContent,
        pageTitle,
        businessName,
        industry,
        description,
        location,
        socialProfiles,
        existingAuditData,
        voiceSummary: input.voiceSummary || null,
      });

      try {
        const reportData = await llmJson<Record<string, unknown>>(
          "You are an elite business intelligence analyst. Produce accurate, actionable intelligence reports for local businesses.",
          prompt
        );

        // Extract brand voice separately if voice summary provided
        let brandVoice = null;
        if (input.voiceSummary) {
          brandVoice = await llmJson<{
            exact_phrases: string[];
            differentiators: string[];
            natural_tone: string;
            problems_they_solve: string[];
          }>(
            "You are a brand voice analyst. Extract communication patterns from business owner speech.",
            buildBrandVoicePrompt(input.voiceSummary)
          );
        }

        // Calculate overall confidence score
        const sections = (reportData.sections || {}) as Record<string, { confidence_score?: number }>;
        const scores = Object.values(sections)
          .map(s => s?.confidence_score || 0)
          .filter(s => s > 0);
        const overallConfidence = scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 70;

        // Update the report with full data
        await db.update(intelligenceReports)
          .set({
            reportData,
            brandVoice: brandVoice || (reportData as Record<string, unknown>).brand_voice as typeof brandVoice || null,
            overallConfidenceScore: overallConfidence,
            status: "complete",
            sectionsCompleted: [
              "business_snapshot", "market_demand", "competitive_position",
              "reputation_summary", "visibility_baseline", "opportunity_gaps",
              "customer_journey", "quick_wins", "content_strategy_bridge"
            ],
            updatedAt: Date.now(),
          })
          .where(eq(intelligenceReports.id, reportId));

        return {
          id: reportId,
          status: "complete" as const,
          overallConfidenceScore: overallConfidence,
          reportData,
          brandVoice,
        };
      } catch (error) {
        // Mark as failed
        await db.update(intelligenceReports)
          .set({ status: "failed", updatedAt: Date.now() })
          .where(eq(intelligenceReports.id, reportId));

        console.error("[IntelligenceReport] Generation failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Intelligence report generation failed. Please try again.",
        });
      }
    }),

  // ── Get the latest report for a workspace ───────────────────────────────────
  getLatest: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceAccess(input.workspaceId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [report] = await db.select()
        .from(intelligenceReports)
        .where(eq(intelligenceReports.workspaceId, input.workspaceId))
        .orderBy(desc(intelligenceReports.createdAt))
        .limit(1);

      if (!report) return null;

      // Strip competitive_position from response (INTERNAL ONLY — never shown to customer)
      const reportData = report.reportData as Record<string, unknown>;
      const sections = (reportData?.sections || {}) as Record<string, unknown>;
      const { competitive_position, ...customerSections } = sections;

      return {
        ...report,
        reportData: {
          ...reportData,
          sections: customerSections,
        },
        // Include competitive data in a separate field for internal use only
        _internalCompetitiveData: competitive_position,
      };
    }),

  // ── Get full report including competitive data (admin/internal only) ────────
  getFullReport: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceAccess(input.workspaceId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [report] = await db.select()
        .from(intelligenceReports)
        .where(eq(intelligenceReports.workspaceId, input.workspaceId))
        .orderBy(desc(intelligenceReports.createdAt))
        .limit(1);

      return report || null;
    }),

  // ── Export report as structured JSON for Stage 3 API handoff ────────────────
  exportForStage3: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceAccess(input.workspaceId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [report] = await db.select()
        .from(intelligenceReports)
        .where(
          and(
            eq(intelligenceReports.workspaceId, input.workspaceId),
            eq(intelligenceReports.status, "complete")
          )
        )
        .orderBy(desc(intelligenceReports.createdAt))
        .limit(1);

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No completed intelligence report found" });
      }

      // Return the full structured report including competitive data
      // This is the payload that gets sent to Claude in Stage 3
      return {
        report_id: report.id,
        report_version: report.reportVersion,
        generated_at: new Date(report.createdAt).toISOString(),
        website_url: report.websiteUrl,
        overall_confidence_score: report.overallConfidenceScore,
        report_data: report.reportData,
        brand_voice: report.brandVoice,
        strategy_approved: report.strategyApproved,
        strategy_approved_at: report.strategyApprovedAt ? new Date(report.strategyApprovedAt).toISOString() : null,
      };
    }),

  // ── Approve strategy (triggers Stage 3 readiness) ──────────────────────────
  approveStrategy: protectedProcedure
    .input(z.object({ workspaceId: z.number(), reportId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await assertWorkspaceAccess(input.workspaceId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.update(intelligenceReports)
        .set({
          strategyApproved: true,
          strategyApprovedAt: Date.now(),
          strategyApprovedBy: ctx.user.id,
          updatedAt: Date.now(),
        })
        .where(
          and(
            eq(intelligenceReports.id, input.reportId),
            eq(intelligenceReports.workspaceId, input.workspaceId)
          )
        );

      return { success: true, message: "Strategy approved. Ready for Stage 3 content generation." };
    }),

  // ── Extract brand voice from voice summary ─────────────────────────────────
  extractBrandVoice: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      voiceSummary: z.string().min(10),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertWorkspaceAccess(input.workspaceId, ctx.user.id);

      const brandVoice = await llmJson<{
        exact_phrases: string[];
        differentiators: string[];
        natural_tone: string;
        problems_they_solve: string[];
      }>(
        "You are a brand voice analyst. Extract communication patterns from business owner speech.",
        buildBrandVoicePrompt(input.voiceSummary)
      );

      // Update the latest report with brand voice
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [report] = await db.select()
        .from(intelligenceReports)
        .where(eq(intelligenceReports.workspaceId, input.workspaceId))
        .orderBy(desc(intelligenceReports.createdAt))
        .limit(1);

      if (report) {
        await db.update(intelligenceReports)
          .set({ brandVoice, updatedAt: Date.now() })
          .where(eq(intelligenceReports.id, report.id));
      }

      return brandVoice;
    }),
});
