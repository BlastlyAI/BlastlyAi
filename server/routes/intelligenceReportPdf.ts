import { Router, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { getDb } from "../db";
import { intelligenceReports } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

const pdfRouter = Router();

// ── Helper: add a section title ──────────────────────────────────────────────
function sectionTitle(doc: PDFKit.PDFDocument, title: string, y?: number) {
  if (y !== undefined) doc.y = y;
  doc.moveDown(1);
  doc.fontSize(14).fillColor("#7c3aed").text(title, { underline: true });
  doc.moveDown(0.3);
  doc.fillColor("#1a1a2e");
}

// ── Helper: add a data row ───────────────────────────────────────────────────
function dataRow(doc: PDFKit.PDFDocument, label: string, value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return;
  const display = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  doc.fontSize(9).fillColor("#666").text(`${label}: `, { continued: true });
  doc.fillColor("#1a1a2e").text(display);
}

// ── Helper: add a tag list ───────────────────────────────────────────────────
function tagList(doc: PDFKit.PDFDocument, label: string, items: string[]) {
  if (!items || items.length === 0) return;
  doc.fontSize(9).fillColor("#666").text(`${label}: `, { continued: true });
  doc.fillColor("#1a1a2e").text(items.join(" · "));
}

// ── PDF Generation ───────────────────────────────────────────────────────────
pdfRouter.get("/api/intelligence-report/pdf/:workspaceId", async (req: Request, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (isNaN(workspaceId)) {
      return res.status(400).json({ error: "Invalid workspace ID" });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const [report] = await db.select()
      .from(intelligenceReports)
      .where(
        and(
          eq(intelligenceReports.workspaceId, workspaceId),
          eq(intelligenceReports.status, "complete")
        )
      )
      .orderBy(desc(intelligenceReports.createdAt))
      .limit(1);

    if (!report) {
      return res.status(404).json({ error: "No completed intelligence report found" });
    }

    const reportData = report.reportData as Record<string, unknown>;
    const sections = (reportData?.sections || {}) as Record<string, Record<string, unknown>>;
    const brandVoice = report.brandVoice as { exact_phrases?: string[]; differentiators?: string[]; natural_tone?: string; problems_they_solve?: string[] } | null;

    // Create PDF
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: "Client Intelligence Report",
        Author: "Blastly AI",
        Subject: `Intelligence Report for workspace ${workspaceId}`,
      },
    });

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="intelligence-report-${workspaceId}.pdf"`);
    doc.pipe(res);

    // ── Cover Page ─────────────────────────────────────────────────────────────
    doc.moveDown(4);
    doc.fontSize(28).fillColor("#7c3aed").text("Client Intelligence Report", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor("#666").text("Stage 1 of 7 — Foundation for Content Strategy", { align: "center" });
    doc.moveDown(2);
    doc.fontSize(10).fillColor("#999").text(`Generated: ${new Date(report.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}`, { align: "center" });
    doc.text(`Confidence Score: ${report.overallConfidenceScore}%`, { align: "center" });
    doc.text(`Report Version: ${report.reportVersion}`, { align: "center" });
    doc.moveDown(3);
    doc.fontSize(9).fillColor("#aaa").text("Powered by Blastly AI — blastly.ai", { align: "center" });

    // ── Section 1: Business Snapshot ───────────────────────────────────────────
    doc.addPage();
    const s1 = sections.business_snapshot || {};
    sectionTitle(doc, "1. Business Snapshot");
    dataRow(doc, "Business Name", s1.business_name as string);
    dataRow(doc, "Industry", s1.industry as string);
    dataRow(doc, "Description", s1.business_description as string);
    dataRow(doc, "Location", [s1.location_city, s1.location_state, s1.location_country].filter(Boolean).join(", "));
    dataRow(doc, "Geographic Reach", s1.geographic_reach as string);
    dataRow(doc, "Google Rating", s1.google_review_score ? `${s1.google_review_score} ★ (${s1.google_review_count} reviews)` : "Not found");
    tagList(doc, "Active Platforms", (s1.platforms_active as string[]) || []);
    tagList(doc, "Recommended Platforms", (s1.platforms_recommended as string[]) || []);

    // ── Section 2: Market Demand ──────────────────────────────────────────────
    sectionTitle(doc, "2. Market Demand");
    const s2 = sections.market_demand || {};
    const keywords = (s2.top_keywords as Array<{ keyword: string; estimated_monthly_searches: string; difficulty: string }>) || [];
    if (keywords.length > 0) {
      doc.fontSize(9).fillColor("#666").text("Top Keywords:");
      keywords.forEach(kw => {
        doc.fontSize(9).fillColor("#1a1a2e").text(`  • ${kw.keyword} — ${kw.estimated_monthly_searches}/mo (${kw.difficulty} difficulty)`);
      });
    }
    const questions = (s2.ai_engine_questions as Array<{ question: string; source: string }>) || [];
    if (questions.length > 0) {
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor("#666").text("Questions People Ask AI:");
      questions.forEach(q => {
        doc.fontSize(9).fillColor("#1a1a2e").text(`  • ${q.question} (${q.source})`);
      });
    }
    tagList(doc, "Peak Months", (s2.peak_seasonal_months as string[]) || []);

    // ── Section 3: Competitive Position (INTERNAL) ────────────────────────────
    const s3 = sections.competitive_position || (reportData as Record<string, unknown>)?.competitive_position as Record<string, unknown> || {};
    if (Object.keys(s3).length > 0) {
      sectionTitle(doc, "3. Competitive Position (INTERNAL — DO NOT SHARE WITH CLIENT)");
      doc.fontSize(9).fillColor("#dc2626").text("⚠️ This section is for internal strategy use only.");
      doc.fillColor("#1a1a2e");
      const competitors = (s3.top_3_competitors as Array<{ name: string; strengths: string[]; weaknesses: string[] }>) || [];
      competitors.forEach(comp => {
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor("#1a1a2e").text(`Competitor: ${comp.name}`);
        tagList(doc, "  Strengths", comp.strengths || []);
        tagList(doc, "  Weaknesses", comp.weaknesses || []);
      });
      dataRow(doc, "Market Gap", s3.market_gap_identified as string);
    }

    // ── Section 4: Reputation Summary ─────────────────────────────────────────
    if (doc.y > 650) doc.addPage();
    const s4 = sections.reputation_summary || {};
    sectionTitle(doc, "4. Reputation Summary");
    tagList(doc, "Strongest Proof Points", (s4.strongest_proof_points as string[]) || []);
    tagList(doc, "Top Praise Themes", (s4.top_praise_themes as string[]) || []);
    tagList(doc, "Top Complaint Themes", (s4.top_complaint_themes as string[]) || []);
    dataRow(doc, "Unanswered Negative Reviews", s4.unanswered_negative_reviews as number);
    const angles = (s4.recommended_testimonial_angles as string[]) || [];
    if (angles.length > 0) {
      doc.fontSize(9).fillColor("#666").text("Recommended Testimonial Angles:");
      angles.forEach(a => doc.fontSize(9).fillColor("#1a1a2e").text(`  • ${a}`));
    }

    // ── Section 5: Visibility Baseline ────────────────────────────────────────
    if (doc.y > 600) doc.addPage();
    const s5 = sections.visibility_baseline || {};
    sectionTitle(doc, "5. Visibility Baseline (Month 1)");
    dataRow(doc, "Month Label", s5.month_label as string);
    dataRow(doc, "Local Search Position", s5.local_search_position as string);
    dataRow(doc, "Local Pack Appearing", s5.local_pack_appearing as boolean);
    dataRow(doc, "NAP Consistency", s5.nap_consistency as string);
    dataRow(doc, "Website Health Score", `${s5.website_health_score}/100`);
    dataRow(doc, "Mobile Friendly", s5.website_mobile_friendly as boolean);
    dataRow(doc, "Page Speed", s5.website_page_speed as string);
    dataRow(doc, "Has Blog", s5.website_has_blog as boolean);
    dataRow(doc, "Has FAQs", s5.website_has_faqs as boolean);

    // ── Section 6: Opportunity Gaps ───────────────────────────────────────────
    if (doc.y > 600) doc.addPage();
    const s6 = sections.opportunity_gaps || {};
    sectionTitle(doc, "6. Opportunity Gaps");
    dataRow(doc, "Biggest Market Gap", s6.biggest_market_gap as string);
    dataRow(doc, "Recommended Primary Message", s6.recommended_primary_message as string);
    const contentGaps = (s6.content_gaps as Array<{ gap: string; impact: string }>) || [];
    if (contentGaps.length > 0) {
      doc.fontSize(9).fillColor("#666").text("Content Gaps:");
      contentGaps.forEach(g => doc.fontSize(9).fillColor("#1a1a2e").text(`  • ${g.gap} (${g.impact} impact)`));
    }

    // ── Section 7: Customer Journey ───────────────────────────────────────────
    if (doc.y > 600) doc.addPage();
    const s7 = sections.customer_journey || {};
    sectionTitle(doc, "7. Customer Journey");
    tagList(doc, "How Customers Find", (s7.how_customers_find as string[]) || []);
    const checks = (s7.what_they_check_before_deciding as string[]) || [];
    if (checks.length > 0) {
      doc.fontSize(9).fillColor("#666").text("What They Check Before Deciding:");
      checks.forEach(c => doc.fontSize(9).fillColor("#1a1a2e").text(`  • ${c}`));
    }
    tagList(doc, "Key Objections", (s7.key_objections_to_address as string[]) || []);
    dataRow(doc, "Decision Cycle Length", s7.decision_cycle_length as string);

    // ── Section 8: Quick Wins ─────────────────────────────────────────────────
    if (doc.y > 600) doc.addPage();
    const s8 = sections.quick_wins || {};
    sectionTitle(doc, "8. Quick Wins (First 7 Days)");
    const actions = (s8.actions as Array<{ action: string; estimated_impact: string; ease: string; timeframe: string }>) || [];
    actions.forEach((a, i) => {
      doc.fontSize(9).fillColor("#1a1a2e").text(`  ${i + 1}. ${a.action}`);
      doc.fontSize(8).fillColor("#666").text(`     Impact: ${a.estimated_impact} | Ease: ${a.ease} | Timeframe: ${a.timeframe}`);
    });

    // ── Section 9: Content Strategy Bridge ────────────────────────────────────
    if (doc.y > 600) doc.addPage();
    const s9 = sections.content_strategy_bridge || {};
    sectionTitle(doc, "9. Content Strategy Bridge");
    dataRow(doc, "Posting Frequency", s9.recommended_posting_frequency as string);
    tagList(doc, "Content Types", (s9.recommended_content_types as string[]) || []);
    tagList(doc, "Platforms to Prioritise", (s9.platforms_to_prioritise as string[]) || []);
    const calendar = (s9.seasonal_calendar_90_days as Array<{ month: string; theme: string; content_ideas: string[] }>) || [];
    if (calendar.length > 0) {
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor("#666").text("90-Day Content Calendar:");
      calendar.forEach(m => {
        doc.fontSize(9).fillColor("#1a1a2e").text(`  ${m.month} — ${m.theme}`);
        m.content_ideas.forEach(idea => doc.fontSize(8).fillColor("#666").text(`    • ${idea}`));
      });
    }

    // ── Brand Voice ───────────────────────────────────────────────────────────
    if (brandVoice) {
      if (doc.y > 600) doc.addPage();
      sectionTitle(doc, "Brand Voice Analysis");
      dataRow(doc, "Natural Tone", brandVoice.natural_tone);
      tagList(doc, "Differentiators", brandVoice.differentiators || []);
      tagList(doc, "Problems They Solve", brandVoice.problems_they_solve || []);
      if (brandVoice.exact_phrases && brandVoice.exact_phrases.length > 0) {
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor("#666").text("Their Exact Phrases:");
        brandVoice.exact_phrases.forEach(p => doc.fontSize(9).fillColor("#1a1a2e").text(`  "${p}"`));
      }
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.moveDown(2);
    doc.fontSize(8).fillColor("#aaa").text("— End of Client Intelligence Report —", { align: "center" });
    doc.text("Generated by Blastly AI · blastly.ai", { align: "center" });

    doc.end();
  } catch (err) {
    console.error("[PDF Export] Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  }
});

export default pdfRouter;
