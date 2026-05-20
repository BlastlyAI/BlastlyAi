import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getSubscriptionByUserId } from "../db";
import { competitorScans } from "../../drizzle/schema";
import { eq, desc, and, gte, count } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import * as cheerio from "cheerio";
import {
  COMPETITOR_CONFIDENCE_ITEMS,
  calculateOverallConfidence,
  generateConfidenceSummary,
  CONFIDENCE_METHODOLOGY,
  type ScanConfidence,
} from "../../shared/confidence";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

// ─── Fetch helpers ─────────────────────────────────────────────────────────────
async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<{ html: string; status: number; finalUrl: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BlastlyBot/1.0; +https://blastly.io)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
    });
    clearTimeout(timer);
    const html = await res.text();
    return { html, status: res.status, finalUrl: res.url };
  } catch {
    return { html: "", status: 0, finalUrl: url };
  }
}

// ─── Extract text content from HTML ──────────────────────────────────────────
function extractPageText(html: string): string {
  if (!html) return "";
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  return text.slice(0, 4000); // Limit to avoid token overflow
}

// ─── Extract meta info from HTML ─────────────────────────────────────────────
function extractMetaInfo(html: string, url: string): {
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
  socialLinks: string[];
} {
  if (!html) return { title: "", description: "", keywords: "", ogImage: "", socialLinks: [] };
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") || "";
  const description = $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") || "";
  const keywords = $('meta[name="keywords"]').attr("content") || "";
  const ogImage = $('meta[property="og:image"]').attr("content") || "";

  const socialDomains = ["facebook.com", "instagram.com", "tiktok.com", "youtube.com",
    "linkedin.com", "twitter.com", "x.com", "pinterest.com"];
  const socialLinks: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (socialDomains.some(d => href.includes(d))) {
      socialLinks.push(href);
    }
  });

  return { title, description, keywords, ogImage, socialLinks: Array.from(new Set(socialLinks)) };
}

// ─── Normalise URL ────────────────────────────────────────────────────────────
function normaliseUrl(url: string): string {
  let u = url.trim();
  if (!u.startsWith("http")) u = "https://" + u;
  try {
    const parsed = new URL(u);
    return parsed.origin;
  } catch {
    return u;
  }
}

// ─── Parse AI JSON response ───────────────────────────────────────────────────
function parseAiJson(content: string | object): unknown {
  const raw = typeof content === "string" ? content : JSON.stringify(content);
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned);
}

// ─── Main router ──────────────────────────────────────────────────────────────
export const competitorIntelRouter = router({

  // ── Scan 5 nearest competitors ─────────────────────────────────────────────
  scanCompetitors: protectedProcedure
    .input(z.object({
      websiteUrl: z.string().url("Please enter a valid URL"),
    }))
    .mutation(async ({ input, ctx }) => {
      // Free tier: max 3 scans per calendar month
      const sub = await getSubscriptionByUserId(ctx.user.id);
      const isPaid = sub && sub.status === "active" && sub.plan !== "free";
      if (!isPaid) {
        const db = await requireDb();
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const [{ value: scanCount }] = await db
          .select({ value: count() })
          .from(competitorScans)
          .where(and(eq(competitorScans.userId, ctx.user.id), gte(competitorScans.createdAt, monthStart)));
        if (scanCount >= 3) {
          throw new TRPCError({ code: "FORBIDDEN", message: "FREE_LIMIT_REACHED" });
        }
      }
      const userId = ctx.user.id;
      const websiteUrl = normaliseUrl(input.websiteUrl);

      // Step 1: Fetch user's own website
      const { html: userHtml } = await fetchWithTimeout(websiteUrl);
      const userMeta = extractMetaInfo(userHtml, websiteUrl);
      const userPageText = extractPageText(userHtml);

      // Step 2: Ask AI to identify business + 5 nearest competitors
      let discoveryResult: {
        brandName: string;
        industry: string;
        businessDescription: string;
        location: string;
        targetAudience: string;
        mainServices: string[];
        competitors: {
          rank: number;
          name: string;
          websiteUrl: string;
          reason: string;
          estimatedSimilarity: number;
        }[];
      };

      try {
        const discoveryResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a business intelligence analyst. Analyse a website and identify the business details and its 5 nearest competitors. Return ONLY valid JSON, no markdown.`,
            },
            {
              role: "user",
              content: `Analyse this website and identify the business and its 5 nearest competitors.

Website URL: ${websiteUrl}
Page Title: ${userMeta.title}
Meta Description: ${userMeta.description}
Keywords: ${userMeta.keywords}
Page Content (excerpt): ${userPageText}

Return JSON in this exact format:
{
  "brandName": "string",
  "industry": "string (e.g. 'Digital Marketing Agency', 'E-commerce Fashion', 'Restaurant')",
  "businessDescription": "string (2-3 sentences about what this business does)",
  "location": "string (city/country if detectable, else 'Global')",
  "targetAudience": "string",
  "mainServices": ["service1", "service2", "service3"],
  "competitors": [
    {
      "rank": 1,
      "name": "Competitor Name",
      "websiteUrl": "https://competitor.com",
      "reason": "Why this is a direct competitor",
      "estimatedSimilarity": 85
    }
  ]
}

Rules:
- Identify REAL competitors with actual websites that exist
- Competitors should be in the same industry and target similar customers
- Order by most direct competition first
- Use real, well-known competitor websites`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "competitor_discovery",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  brandName: { type: "string" },
                  industry: { type: "string" },
                  businessDescription: { type: "string" },
                  location: { type: "string" },
                  targetAudience: { type: "string" },
                  mainServices: { type: "array", items: { type: "string" } },
                  competitors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        rank: { type: "integer" },
                        name: { type: "string" },
                        websiteUrl: { type: "string" },
                        reason: { type: "string" },
                        estimatedSimilarity: { type: "integer" },
                      },
                      required: ["rank", "name", "websiteUrl", "reason", "estimatedSimilarity"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["brandName", "industry", "businessDescription", "location", "targetAudience", "mainServices", "competitors"],
                additionalProperties: false,
              },
            },
          },
        });
        const rawContent = discoveryResponse.choices[0]?.message?.content ?? "{}";
        discoveryResult = parseAiJson(rawContent) as typeof discoveryResult;
      } catch (e) {
        throw new Error("Failed to identify competitors. Please try again.");
      }

      // Step 3: Fetch each competitor's website
      const competitorData: {
        rank: number;
        name: string;
        websiteUrl: string;
        html: string;
        meta: ReturnType<typeof extractMetaInfo>;
        pageText: string;
      }[] = [];

      const competitorFetches = (discoveryResult.competitors || []).slice(0, 5).map(async (comp) => {
        const url = normaliseUrl(comp.websiteUrl);
        const { html } = await fetchWithTimeout(url, 8000);
        return {
          rank: comp.rank,
          name: comp.name,
          websiteUrl: url,
          html,
          meta: extractMetaInfo(html, url),
          pageText: extractPageText(html),
        };
      });

      const fetched = await Promise.allSettled(competitorFetches);
      fetched.forEach((result) => {
        if (result.status === "fulfilled") competitorData.push(result.value);
      });

      // Step 4: AI deep analysis — score each competitor + generate improvement opportunities
      let analysisResult: {
        userDigitalScore: number;
        overallGapScore: number;
        competitors: {
          rank: number;
          name: string;
          websiteUrl: string;
          industry: string;
          description: string;
          websiteSeoScore: number;
          socialPresenceScore: number;
          overallScore: number;
          grade: string;
          socialProfiles: { platform: string; found: boolean; url: string | null; followers: number | null; score: number }[];
          services: string[];
          contentStrategy: string;
          uniqueStrengths: string[];
          weaknesses: string[];
          estimatedMonthlyTraffic: string;
          techStack: string[];
        }[];
        improvementOpportunities: {
          category: string;
          priority: string;
          title: string;
          description: string;
          competitorsDoing: string[];
          estimatedImpact: string;
          timeToImplement: string;
          difficulty: string;
          canDoInBlastly: boolean;
          blastlyFeature: string | null;
          actionSteps: string[];
        }[];
        quickWins: {
          action: string;
          description: string;
          timeframe: string;
          impact: string;
          canDoInBlastly: boolean;
        }[];
        industryBenchmark: {
          metric: string;
          yourScore: number;
          industryAverage: number;
          topCompetitorScore: number;
          gap: number;
        }[];
      };

      const competitorSummaries = competitorData.map(c => `
Competitor ${c.rank}: ${c.name}
URL: ${c.websiteUrl}
Title: ${c.meta.title}
Description: ${c.meta.description}
Social Links Found: ${c.meta.socialLinks.join(", ") || "None detected"}
Page Content: ${c.pageText.slice(0, 800)}
---`).join("\n");

      try {
        const analysisResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a world-class business intelligence and digital marketing strategist. Analyse a business against its competitors and generate actionable improvement opportunities. Be specific, data-driven, and brutally honest. Return ONLY valid JSON.`,
            },
            {
              role: "user",
              content: `Analyse this business against its 5 competitors and generate a comprehensive intelligence report.

YOUR BUSINESS:
Brand: ${discoveryResult.brandName}
Industry: ${discoveryResult.industry}
URL: ${websiteUrl}
Description: ${discoveryResult.businessDescription}
Services: ${discoveryResult.mainServices.join(", ")}
Social Links: ${userMeta.socialLinks.join(", ") || "None detected"}
Page Content: ${userPageText.slice(0, 800)}

COMPETITORS:
${competitorSummaries}

Generate a comprehensive competitor intelligence report. For each competitor, score their digital presence. Then identify specific business improvement opportunities — these should be CONCRETE add-ons, new services, product features, marketing strategies, or operational improvements that the competitors are doing that this business is NOT doing yet.

Return JSON in this exact format:
{
  "userDigitalScore": 0-100,
  "overallGapScore": 0-100 (how far behind the top competitor),
  "competitors": [
    {
      "rank": 1,
      "name": "string",
      "websiteUrl": "string",
      "industry": "string",
      "description": "string",
      "websiteSeoScore": 0-100,
      "socialPresenceScore": 0-100,
      "overallScore": 0-100,
      "grade": "A+/A/B+/B/C+/C/D/F",
      "socialProfiles": [{"platform": "string", "found": true/false, "url": "string or null", "followers": number or null, "score": 0-100}],
      "services": ["service1"],
      "contentStrategy": "string",
      "uniqueStrengths": ["strength1"],
      "weaknesses": ["weakness1"],
      "estimatedMonthlyTraffic": "string e.g. '50K-100K'",
      "techStack": ["tech1"]
    }
  ],
  "improvementOpportunities": [
    {
      "category": "product|service|marketing|content|social|seo|tech",
      "priority": "critical|high|medium|low",
      "title": "string (short, punchy title)",
      "description": "string (2-3 sentences explaining the opportunity)",
      "competitorsDoing": ["Competitor Name"],
      "estimatedImpact": "string e.g. '+25% leads per month'",
      "timeToImplement": "string e.g. '1-2 weeks'",
      "difficulty": "easy|medium|hard",
      "canDoInBlastly": true/false,
      "blastlyFeature": "string or null (which Blastly feature helps)",
      "actionSteps": ["step1", "step2", "step3"]
    }
  ],
  "quickWins": [
    {
      "action": "string",
      "description": "string",
      "timeframe": "string e.g. 'This week'",
      "impact": "string",
      "canDoInBlastly": true/false
    }
  ],
  "industryBenchmark": [
    {
      "metric": "string e.g. 'Social Media Presence'",
      "yourScore": 0-100,
      "industryAverage": 0-100,
      "topCompetitorScore": 0-100,
      "gap": number (difference between you and top competitor)
    }
  ]
}

Rules:
- Improvement opportunities must be SPECIFIC and ACTIONABLE (not generic advice like "post more")
- Focus on things competitors are doing that this business is NOT
- Include at least 8-12 improvement opportunities across different categories
- Quick wins should be achievable within 1-2 weeks
- Industry benchmark should cover: Social Media, SEO, Content Marketing, Paid Ads, Email Marketing, Customer Reviews, Website UX, Mobile Optimisation
- Be honest about gaps — this is meant to help the business improve`,
            },
          ],
        });

        const rawContent = analysisResponse.choices[0]?.message?.content ?? "{}";
        analysisResult = parseAiJson(rawContent) as typeof analysisResult;
      } catch (e) {
        throw new Error("Failed to analyse competitors. Please try again.");
      }

      // Step 5: Save to database
      const db = await requireDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.insert(competitorScans).values({
        userId,
        websiteUrl,
        brandName: discoveryResult.brandName,
        industry: discoveryResult.industry,
        overallGapScore: Math.max(0, Math.min(100, analysisResult.overallGapScore ?? 0)),
        userDigitalScore: Math.max(0, Math.min(100, analysisResult.userDigitalScore ?? 0)),
        competitors: (analysisResult.competitors ?? []) as any,
        improvementOpportunities: (analysisResult.improvementOpportunities ?? []) as any,
        quickWins: (analysisResult.quickWins ?? []) as any,
        industryBenchmark: (analysisResult.industryBenchmark ?? []) as any,
      });

      // Build confidence score
      const overallPct = calculateOverallConfidence(COMPETITOR_CONFIDENCE_ITEMS);
      const scanConfidence: ScanConfidence = {
        overallPct,
        summary: generateConfidenceSummary(overallPct),
        items: COMPETITOR_CONFIDENCE_ITEMS,
        scannedAt: new Date().toISOString(),
        methodology: CONFIDENCE_METHODOLOGY,
      };
      return {
        brandName: discoveryResult.brandName,
        industry: discoveryResult.industry,
        businessDescription: discoveryResult.businessDescription,
        userDigitalScore: analysisResult.userDigitalScore ?? 0,
        overallGapScore: analysisResult.overallGapScore ?? 0,
        competitors: analysisResult.competitors ?? [],
        improvementOpportunities: analysisResult.improvementOpportunities ?? [],
        quickWins: analysisResult.quickWins ?? [],
        industryBenchmark: analysisResult.industryBenchmark ?? [],
        scanConfidence,
      };
    }),

  // ── Get scan history ───────────────────────────────────────────────────────
  getScans: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    if (!db) return [];
    const scans = await db
      .select({
        id: competitorScans.id,
        websiteUrl: competitorScans.websiteUrl,
        brandName: competitorScans.brandName,
        industry: competitorScans.industry,
        overallGapScore: competitorScans.overallGapScore,
        userDigitalScore: competitorScans.userDigitalScore,
        createdAt: competitorScans.createdAt,
      })
      .from(competitorScans)
      .where(eq(competitorScans.userId, ctx.user.id))
      .orderBy(desc(competitorScans.createdAt))
      .limit(10);
    return scans;
  }),

  // ── Get a specific scan by ID ──────────────────────────────────────────────
  getScanById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      if (!db) return null;
      const [scan] = await db
        .select()
        .from(competitorScans)
        .where(eq(competitorScans.id, input.id))
        .limit(1);
      if (!scan || scan.userId !== ctx.user.id) return null;
      return scan;
    }),
});
