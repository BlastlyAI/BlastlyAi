import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getSubscriptionByUserId } from "../db";
import { seoScans } from "../../drizzle/schema";
import { eq, desc, and, gte, count } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import * as cheerio from "cheerio";
import {
  SEO_CONFIDENCE_ITEMS,
  calculateOverallConfidence,
  generateConfidenceSummary,
  CONFIDENCE_METHODOLOGY,
  type ScanConfidence,
} from "../../shared/confidence";


// ─── Helpers ─────────────────────────────────────────────────────────────────
async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}


async function fetchPage(url: string): Promise<{ html: string; status: number; responseTime: number }> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BlastlySEOBot/1.0; +https://blastly.io)",
      },
    });
    const html = await res.text();
    clearTimeout(timeout);
    return { html, status: res.status, responseTime: Date.now() - start };
  } catch {
    clearTimeout(timeout);
    throw new Error("Failed to fetch URL — check the address and try again.");
  }
}

function extractSeoData(html: string, url: string) {
  const $ = cheerio.load(html);

  const title = $("title").first().text().trim() || null;
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() || null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const h1Tags = $("h1")
    .map((_: number, el: any) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .slice(0, 5);

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const words = bodyText.split(/\s+/).filter((w) => w.length > 3);
  const wordCount = words.length;

  // Simple keyword frequency (exclude stop words)
  const stopWords = new Set([
    "this", "that", "with", "from", "have", "will", "your", "they", "been",
    "more", "also", "into", "than", "then", "when", "what", "which", "there",
    "their", "about", "would", "could", "should", "these", "those", "some",
  ]);
  const freq: Record<string, number> = {};
  for (const w of words) {
    const lower = w.toLowerCase().replace(/[^a-z]/g, "");
    if (lower.length > 3 && !stopWords.has(lower)) {
      freq[lower] = (freq[lower] || 0) + 1;
    }
  }
  const keywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([keyword, count]) => ({
      keyword,
      count,
      density: wordCount > 0 ? parseFloat(((count / wordCount) * 100).toFixed(2)) : 0,
    }));

  const images = $("img");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imagesWithoutAlt = images.filter((_: number, el: any) => !$(el).attr("alt")).length;

  const allLinks = $("a[href]");
  let internalLinks = 0;
  let externalLinks = 0;
  try {
    const base = new URL(url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allLinks.each((_: number, el: any) => {
      const href = $(el).attr("href") || "";
      try {
        const linkUrl = new URL(href, url);
        if (linkUrl.hostname === base.hostname) internalLinks++;
        else externalLinks++;
      } catch {
        // relative or invalid
        internalLinks++;
      }
    });
  } catch {
    internalLinks = allLinks.length;
  }

  const httpsEnabled = url.startsWith("https://");

  return {
    title,
    metaDescription,
    h1Tags,
    keywords,
    wordCount,
    imagesWithoutAlt,
    internalLinks,
    externalLinks,
    httpsEnabled,
  };
}

async function generateAiAnalysis(
  url: string,
  data: ReturnType<typeof extractSeoData>,
  responseTime: number
): Promise<{ score: number; pageSpeedScore: number; recommendations: { priority: "high" | "medium" | "low"; category: string; issue: string; fix: string }[] }> {
  const prompt = `You are an expert SEO analyst. Analyse the following website data and return a JSON object with:
1. "score": overall SEO health score 0-100
2. "pageSpeedScore": estimated page speed score 0-100 based on response time (${responseTime}ms)
3. "recommendations": array of up to 10 actionable recommendations, each with:
   - "priority": "high" | "medium" | "low"
   - "category": one of "Title & Meta", "Content", "Technical", "Links", "Performance", "Security", "Mobile"
   - "issue": what is wrong (1 sentence)
   - "fix": how to fix it (1-2 sentences, specific and actionable)

Website data:
URL: ${url}
HTTPS: ${data.httpsEnabled}
Title: ${data.title || "MISSING"}
Meta Description: ${data.metaDescription || "MISSING"}
H1 Tags: ${data.h1Tags.length > 0 ? data.h1Tags.join(", ") : "NONE"}
Word Count: ${data.wordCount}
Images Without Alt Text: ${data.imagesWithoutAlt}
Internal Links: ${data.internalLinks}
External Links: ${data.externalLinks}
Response Time: ${responseTime}ms
Top Keywords: ${data.keywords.slice(0, 5).map((k) => `${k.keyword}(${k.count})`).join(", ")}

Return ONLY valid JSON, no markdown.`;

  const response = await invokeLLM({
    messages: [
      { role: "system" as const, content: "You are an SEO expert that returns structured JSON analysis." },
      { role: "user" as const, content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "seo_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            score: { type: "integer" },
            pageSpeedScore: { type: "integer" },
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                  category: { type: "string" },
                  issue: { type: "string" },
                  fix: { type: "string" },
                },
                required: ["priority", "category", "issue", "fix"],
                additionalProperties: false,
              },
            },
          },
          required: ["score", "pageSpeedScore", "recommendations"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI analysis failed");
  const contentStr = typeof content === "string" ? content : JSON.stringify(content);
  return JSON.parse(contentStr);
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const seoRouter = router({
  scanWebsite: protectedProcedure
    .input(z.object({ url: z.string().url("Please enter a valid URL including https://") }))
    .mutation(async ({ input, ctx }) => {
      // Free tier: max 3 scans per calendar month across all scan types
      const sub = await getSubscriptionByUserId(ctx.user.id);
      const isPaid = sub && sub.status === "active" && sub.plan !== "free";
      if (!isPaid) {
        const db = await requireDb();
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const [{ value: scanCount }] = await db
          .select({ value: count() })
          .from(seoScans)
          .where(and(eq(seoScans.userId, ctx.user.id), gte(seoScans.createdAt, monthStart)));
        if (scanCount >= 3) {
          throw new TRPCError({ code: "FORBIDDEN", message: "FREE_LIMIT_REACHED" });
        }
      }
      const { html, responseTime } = await fetchPage(input.url);
      const seoData = extractSeoData(html, input.url);
      const aiAnalysis = await generateAiAnalysis(input.url, seoData, responseTime);

      const db = await requireDb();
      await db
        .insert(seoScans)
        .values({
          userId: ctx.user.id,
          url: input.url,
          score: aiAnalysis.score,
          title: seoData.title,
          metaDescription: seoData.metaDescription,
          h1Tags: seoData.h1Tags,
          keywords: seoData.keywords,
          pageSpeedScore: aiAnalysis.pageSpeedScore,
          httpsEnabled: seoData.httpsEnabled,
          wordCount: seoData.wordCount,
          imagesWithoutAlt: seoData.imagesWithoutAlt,
          internalLinks: seoData.internalLinks,
          externalLinks: seoData.externalLinks,
          recommendations: aiAnalysis.recommendations,
        });

      const scan = await db
        .select()
        .from(seoScans)
        .where(eq(seoScans.userId, ctx.user.id))
        .orderBy(desc(seoScans.createdAt))
        .limit(1);

      // Build confidence score
      const seoOverallPct = calculateOverallConfidence(SEO_CONFIDENCE_ITEMS);
      const scanConfidence: ScanConfidence = {
        overallPct: seoOverallPct,
        summary: generateConfidenceSummary(seoOverallPct),
        items: SEO_CONFIDENCE_ITEMS,
        scannedAt: new Date().toISOString(),
        methodology: CONFIDENCE_METHODOLOGY,
      };

      return { ...scan[0], scanConfidence };
    }),

  getScans: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return db
      .select()
      .from(seoScans)
      .where(eq(seoScans.userId, ctx.user.id))
      .orderBy(desc(seoScans.createdAt))
      .limit(50);
  }),

  getScan: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const [scan] = await db
        .select()
        .from(seoScans)
        .where(eq(seoScans.id, input.id));
      if (!scan || scan.userId !== ctx.user.id) throw new Error("Scan not found");
      return scan;
    }),

  compareWebsites: protectedProcedure
    .input(z.object({
      yourUrl: z.string().url("Please enter a valid URL for your website"),
      competitorUrl: z.string().url("Please enter a valid URL for the competitor website"),
    }))
    .mutation(async ({ input }) => {
      // Fetch both pages in parallel
      const [yourPage, competitorPage] = await Promise.all([
        fetchPage(input.yourUrl),
        fetchPage(input.competitorUrl),
      ]);

      const yourData = extractSeoData(yourPage.html, input.yourUrl);
      const competitorData = extractSeoData(competitorPage.html, input.competitorUrl);

      // Generate AI analysis for both in parallel
      const [yourAnalysis, competitorAnalysis] = await Promise.all([
        generateAiAnalysis(input.yourUrl, yourData, yourPage.responseTime),
        generateAiAnalysis(input.competitorUrl, competitorData, competitorPage.responseTime),
      ]);

      // Build comparison metrics
      const metrics = [
        {
          label: "SEO Score",
          yours: yourAnalysis.score,
          competitor: competitorAnalysis.score,
          unit: "/ 100",
          higherIsBetter: true,
        },
        {
          label: "Page Speed",
          yours: yourAnalysis.pageSpeedScore,
          competitor: competitorAnalysis.pageSpeedScore,
          unit: "/ 100",
          higherIsBetter: true,
        },
        {
          label: "Word Count",
          yours: yourData.wordCount,
          competitor: competitorData.wordCount,
          unit: "words",
          higherIsBetter: true,
        },
        {
          label: "Keywords Found",
          yours: yourData.keywords.length,
          competitor: competitorData.keywords.length,
          unit: "",
          higherIsBetter: true,
        },
        {
          label: "Internal Links",
          yours: yourData.internalLinks,
          competitor: competitorData.internalLinks,
          unit: "",
          higherIsBetter: true,
        },
        {
          label: "External Links",
          yours: yourData.externalLinks,
          competitor: competitorData.externalLinks,
          unit: "",
          higherIsBetter: true,
        },
        {
          label: "Images Missing Alt",
          yours: yourData.imagesWithoutAlt,
          competitor: competitorData.imagesWithoutAlt,
          unit: "",
          higherIsBetter: false,
        },
        {
          label: "HTTPS",
          yours: yourData.httpsEnabled ? 1 : 0,
          competitor: competitorData.httpsEnabled ? 1 : 0,
          unit: "",
          higherIsBetter: true,
          isBool: true,
        },
      ];

      return {
        yours: {
          url: input.yourUrl,
          title: yourData.title,
          score: yourAnalysis.score,
          pageSpeedScore: yourAnalysis.pageSpeedScore,
          httpsEnabled: yourData.httpsEnabled,
          wordCount: yourData.wordCount,
          keywords: yourData.keywords.slice(0, 10),
          h1Tags: yourData.h1Tags,
          recommendations: yourAnalysis.recommendations.slice(0, 5),
        },
        competitor: {
          url: input.competitorUrl,
          title: competitorData.title,
          score: competitorAnalysis.score,
          pageSpeedScore: competitorAnalysis.pageSpeedScore,
          httpsEnabled: competitorData.httpsEnabled,
          wordCount: competitorData.wordCount,
          keywords: competitorData.keywords.slice(0, 10),
          h1Tags: competitorData.h1Tags,
          recommendations: competitorAnalysis.recommendations.slice(0, 5),
        },
        metrics,
      };
    }),
});
