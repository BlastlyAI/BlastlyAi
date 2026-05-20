import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb, getSubscriptionByUserId } from "../db";
import { socialScans } from "../../drizzle/schema";
import { eq, desc, and, gte, count } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import * as cheerio from "cheerio";
import {
  SOCIAL_SCAN_CONFIDENCE_ITEMS,
  calculateOverallConfidence,
  generateConfidenceSummary,
  buildSocialProfileConfidence,
  CONFIDENCE_METHODOLOGY,
  type ScanConfidence,
} from "../../shared/confidence";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

// ─── Platform definitions ─────────────────────────────────────────────────────
const PLATFORMS = [
  { key: "facebook",  label: "Facebook",  domain: "facebook.com",  color: "#1877F2", icon: "facebook" },
  { key: "instagram", label: "Instagram", domain: "instagram.com", color: "#E1306C", icon: "instagram" },
  { key: "tiktok",    label: "TikTok",    domain: "tiktok.com",    color: "#000000", icon: "tiktok" },
  { key: "youtube",   label: "YouTube",   domain: "youtube.com",   color: "#FF0000", icon: "youtube" },
  { key: "linkedin",  label: "LinkedIn",  domain: "linkedin.com",  color: "#0A66C2", icon: "linkedin" },
  { key: "twitter",   label: "X (Twitter)", domain: "twitter.com", color: "#000000", icon: "twitter" },
  { key: "x",         label: "X (Twitter)", domain: "x.com",       color: "#000000", icon: "twitter" },
  { key: "pinterest", label: "Pinterest", domain: "pinterest.com", color: "#E60023", icon: "pinterest" },
  { key: "snapchat",  label: "Snapchat",  domain: "snapchat.com",  color: "#FFFC00", icon: "snapchat" },
  { key: "threads",   label: "Threads",   domain: "threads.net",   color: "#000000", icon: "threads" },
];

// ─── Fetch helpers ────────────────────────────────────────────────────────────
async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<{ html: string; status: number }> {
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
    });
    clearTimeout(timer);
    const html = await res.text();
    return { html, status: res.status };
  } catch {
    return { html: "", status: 0 };
  }
}

// ─── Social profile discovery from website HTML ───────────────────────────────
function discoverSocialProfiles(html: string, baseUrl: string): { platform: string; url: string; handle: string }[] {
  const $ = cheerio.load(html);
  const found: Map<string, { url: string; handle: string }> = new Map();

  // Collect all href values from the page
  const hrefs: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (href) hrefs.push(href);
  });

  // Also check meta tags and og tags
  $("meta").each((_, el) => {
    const content = $(el).attr("content") || "";
    if (content.startsWith("http")) hrefs.push(content);
  });

  // Check link tags
  $("link[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (href.startsWith("http")) hrefs.push(href);
  });

  // Check data attributes (some sites store social links in data attrs)
  $("[data-href], [data-url], [data-link]").each((_, el) => {
    const val = $(el).attr("data-href") || $(el).attr("data-url") || $(el).attr("data-link") || "";
    if (val.startsWith("http")) hrefs.push(val);
  });

  for (const href of hrefs) {
    try {
      const url = new URL(href);
      const hostname = url.hostname.replace(/^www\./, "");

      for (const platform of PLATFORMS) {
        if (hostname === platform.domain || hostname.endsWith("." + platform.domain)) {
          // Extract handle from path
          const pathParts = url.pathname.split("/").filter(Boolean);
          if (pathParts.length === 0) continue;

          // Skip generic/non-profile pages
          const skip = ["share", "sharer", "intent", "hashtag", "search", "explore", "login", "signup", "help", "about", "legal", "policy", "ads", "business", "developers"];
          if (skip.includes(pathParts[0].toLowerCase())) continue;

          const handle = pathParts[0].replace(/^@/, "");
          const platformKey = platform.key === "x" ? "twitter" : platform.key;

          if (!found.has(platformKey)) {
            found.set(platformKey, { url: href, handle });
          }
        }
      }
    } catch {
      // ignore invalid URLs
    }
  }

  return Array.from(found.entries()).map(([platform, data]) => ({
    platform,
    url: data.url,
    handle: data.handle,
  }));
}

// ─── Extract basic profile data from social page HTML ────────────────────────
function extractProfileData(html: string, platform: string): {
  bio: string | null;
  followers: number | null;
  following: number | null;
  posts: number | null;
  lastPostDate: string | null;
} {
  const $ = cheerio.load(html);
  let bio: string | null = null;
  let followers: number | null = null;
  let following: number | null = null;
  let posts: number | null = null;
  let lastPostDate: string | null = null;

  // Try og:description for bio
  const ogDesc = $('meta[property="og:description"]').attr("content");
  if (ogDesc) bio = ogDesc.slice(0, 300);

  // Try meta description
  if (!bio) {
    const metaDesc = $('meta[name="description"]').attr("content");
    if (metaDesc) bio = metaDesc.slice(0, 300);
  }

  // Try to find follower counts via common patterns in page text
  const bodyText = $("body").text();
  const followerPatterns = [
    /(\d[\d,\.]+)\s*(?:K|M|B)?\s*[Ff]ollowers/,
    /[Ff]ollowers[:\s]+(\d[\d,\.]+)/,
    /(\d[\d,\.]+)\s*(?:K|M|B)?\s*[Ss]ubscribers/,
    /(\d[\d,\.]+)\s*(?:K|M|B)?\s*[Ff]ans/,
  ];
  for (const pattern of followerPatterns) {
    const match = bodyText.match(pattern);
    if (match) {
      followers = parseFollowerCount(match[1]);
      break;
    }
  }

  // Try to find last post date from time elements
  const timeEl = $("time").first();
  if (timeEl.length) {
    lastPostDate = timeEl.attr("datetime") || timeEl.text() || null;
  }

  return { bio, followers, following, posts, lastPostDate };
}

function parseFollowerCount(str: string): number {
  const clean = str.replace(/,/g, "").trim();
  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  return Math.round(num);
}

// ─── AI Analysis Engine ───────────────────────────────────────────────────────
async function analyseWithAI(params: {
  websiteUrl: string;
  websiteHtml: string;
  discoveredProfiles: { platform: string; url: string; handle: string; profileData: ReturnType<typeof extractProfileData> }[];
}) {
  const profileSummary = params.discoveredProfiles.map(p => ({
    platform: p.platform,
    url: p.url,
    handle: p.handle,
    bio: p.profileData.bio,
    followers: p.profileData.followers,
    lastPostDate: p.profileData.lastPostDate,
  }));

  const allPlatformKeys = ["facebook", "instagram", "tiktok", "youtube", "linkedin", "twitter", "pinterest"];
  const foundPlatformKeys = profileSummary.map(p => p.platform);
  const missingPlatforms = allPlatformKeys.filter(p => !foundPlatformKeys.includes(p));

  const prompt = `You are a world-class digital marketing analyst. Analyse this brand's complete digital presence and return a comprehensive JSON report.

Website URL: ${params.websiteUrl}

Discovered Social Profiles:
${JSON.stringify(profileSummary, null, 2)}

Missing Platforms: ${missingPlatforms.join(", ")}

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "brandName": "extracted brand name from website URL or bio",
  "brandIndustry": "detected industry/niche",
  "overallScore": 0-100,
  "overallGrade": "A+|A|B+|B|C+|C|D|F",
  "overallSummary": "2-3 sentence executive summary of their digital presence",
  "websiteSeoScore": 0-100,
  "platformScores": [
    {
      "platform": "facebook|instagram|tiktok|youtube|linkedin|twitter|pinterest",
      "found": true|false,
      "url": "url or null",
      "handle": "handle or null",
      "followers": number or null,
      "following": number or null,
      "posts": number or null,
      "bio": "bio text or null",
      "lastPostDate": "date string or null",
      "daysSinceLastPost": number or null,
      "postingFrequency": "Daily|Several times/week|Weekly|Monthly|Rarely|Unknown|Not found",
      "engagementRate": number or null,
      "score": 0-100,
      "grade": "A+|A|B+|B|C+|C|D|F",
      "isActive": true|false,
      "isDormant": true|false,
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1", "weakness 2"],
      "recommendations": ["specific actionable recommendation 1", "specific actionable recommendation 2", "specific actionable recommendation 3"]
    }
  ],
  "platformGapAnalysis": {
    "missingPlatforms": [
      {
        "platform": "platform name",
        "estimatedReachLoss": "e.g. 2.3M monthly users in their niche",
        "competitorUsage": "e.g. 78% of competitors in this industry use this platform",
        "priority": "high|medium|low",
        "reason": "why this platform matters for their industry"
      }
    ],
    "gapScore": 0-100,
    "summary": "1-2 sentence summary of platform gaps"
  },
  "contentConsistency": {
    "score": 0-100,
    "brandNameConsistent": true|false,
    "bioConsistent": true|false,
    "messagingConsistent": true|false,
    "issues": ["issue 1", "issue 2"],
    "summary": "1-2 sentence consistency summary"
  },
  "postingCadence": {
    "overallHealth": "Excellent|Good|Fair|Poor|Critical",
    "dormantAccounts": ["platform names with no recent posts"],
    "activeAccounts": ["platform names posting regularly"],
    "summary": "1-2 sentence cadence summary",
    "recommendation": "specific cadence recommendation"
  },
  "aiVisibilityScore": {
    "score": 0-100,
    "grade": "A+|A|B+|B|C+|C|D|F",
    "likelyMentionedInAI": true|false,
    "factors": ["factor 1", "factor 2", "factor 3"],
    "summary": "2-3 sentence explanation of their AI search visibility",
    "recommendations": ["recommendation 1", "recommendation 2"]
  },
  "actionPlan": [
    {
      "week": 1,
      "priority": "high|medium|low",
      "platform": "platform name or 'All Platforms' or 'Website'",
      "action": "specific action title",
      "description": "detailed description of what to do",
      "estimatedImpact": "e.g. +15% engagement, +500 followers/month",
      "canCreateInBlastly": true|false
    }
  ],
  "topRecommendations": [
    {
      "priority": "high|medium|low",
      "platform": "platform or 'All'",
      "issue": "issue description",
      "fix": "specific fix"
    }
  ]
}

Make the analysis specific, actionable, and insightful. Base scores on real signals: profile found or not, follower count, bio quality, posting recency. For missing platforms, assume score of 0. Be honest about weaknesses.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a digital marketing analyst. Return only valid JSON, no markdown fences." },
      { role: "user", content: prompt },
    ],
  });

  const rawContent = response.choices[0]?.message?.content || "{}";
  const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
  // Strip markdown fences if present
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned);
}

// ─── Competitor comparison AI analysis ───────────────────────────────────────
async function comparePresencesWithAI(params: {
  yourUrl: string;
  yourProfiles: { platform: string; url: string; handle: string; profileData: ReturnType<typeof extractProfileData> }[];
  competitorUrl: string;
  competitorProfiles: { platform: string; url: string; handle: string; profileData: ReturnType<typeof extractProfileData> }[];
}) {
  const prompt = `You are a competitive digital marketing analyst. Compare these two brands' digital presence and return a JSON report.

YOUR BRAND: ${params.yourUrl}
Your Social Profiles: ${JSON.stringify(params.yourProfiles.map(p => ({ platform: p.platform, handle: p.handle, followers: p.profileData.followers, bio: p.profileData.bio })))}

COMPETITOR: ${params.competitorUrl}
Competitor Social Profiles: ${JSON.stringify(params.competitorProfiles.map(p => ({ platform: p.platform, handle: p.handle, followers: p.profileData.followers, bio: p.profileData.bio })))}

Return ONLY valid JSON (no markdown):
{
  "yourScore": 0-100,
  "competitorScore": 0-100,
  "yourGrade": "A+|A|B+|B|C+|C|D|F",
  "competitorGrade": "A+|A|B+|B|C+|C|D|F",
  "platformComparison": [
    {
      "platform": "platform name",
      "yourFollowers": number or null,
      "competitorFollowers": number or null,
      "yourFound": true|false,
      "competitorFound": true|false,
      "yourScore": 0-100,
      "competitorScore": 0-100,
      "winner": "you|competitor|tie",
      "gap": "description of the gap e.g. They have 3x more followers"
    }
  ],
  "yourAdvantages": ["advantage 1", "advantage 2"],
  "competitorAdvantages": ["their advantage 1", "their advantage 2"],
  "quickWins": ["specific action you can take to close the gap 1", "quick win 2", "quick win 3"],
  "summary": "2-3 sentence competitive summary"
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a competitive analyst. Return only valid JSON." },
      { role: "user", content: prompt },
    ],
  });

  const rawContent2 = response.choices[0]?.message?.content || "{}";
  const content = typeof rawContent2 === "string" ? rawContent2 : JSON.stringify(rawContent2);
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned);
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const socialScanRouter = router({
  scanSocialPresence: protectedProcedure
    .input(z.object({
      websiteUrl: z.string().url("Please enter a valid website URL"),
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
          .from(socialScans)
          .where(and(eq(socialScans.userId, ctx.user.id), gte(socialScans.createdAt, monthStart)));
        if (scanCount >= 3) {
          throw new TRPCError({ code: "FORBIDDEN", message: "FREE_LIMIT_REACHED" });
        }
      }
      // 1. Fetch the website HTML
      const { html: websiteHtml } = await fetchWithTimeout(input.websiteUrl);

      // 2. Discover social profiles from the website
      const discovered = discoverSocialProfiles(websiteHtml, input.websiteUrl);

      // 3. Fetch each discovered social profile page (in parallel, max 6)
      const profilesWithData = await Promise.all(
        discovered.slice(0, 8).map(async (profile) => {
          const { html } = await fetchWithTimeout(profile.url, 6000);
          const profileData = extractProfileData(html, profile.platform);
          return { ...profile, profileData };
        })
      );

      // 4. Run AI analysis
      const aiReport = await analyseWithAI({
        websiteUrl: input.websiteUrl,
        websiteHtml: websiteHtml.slice(0, 5000), // limit for AI context
        discoveredProfiles: profilesWithData,
      });

      // 5. Save to DB
      const db = await requireDb();
      await db.insert(socialScans).values({
        userId: ctx.user.id,
        websiteUrl: input.websiteUrl,
        websiteSeoScore: aiReport.websiteSeoScore ?? null,
        overallScore: aiReport.overallScore ?? 0,
        discoveredProfiles: discovered.map(p => ({ ...p, found: true })),
        platformScores: aiReport.platformScores ?? [],
        recommendations: aiReport.topRecommendations ?? [],
      });

      // 6. Build confidence score
      const profileConfidenceItems = buildSocialProfileConfidence(
        discovered.map(p => ({ platform: p.platform, found: true, discoveryMethod: "direct_link" as const }))
      );
      const allConfidenceItems = [...SOCIAL_SCAN_CONFIDENCE_ITEMS, ...profileConfidenceItems];
      const overallPct = calculateOverallConfidence(allConfidenceItems);
      const scanConfidence: ScanConfidence = {
        overallPct,
        summary: generateConfidenceSummary(overallPct),
        items: allConfidenceItems,
        scannedAt: new Date().toISOString(),
        methodology: CONFIDENCE_METHODOLOGY,
      };
      // 7. Return full report
      return {
        websiteUrl: input.websiteUrl,
        brandName: aiReport.brandName ?? "",
        brandIndustry: aiReport.brandIndustry ?? "",
        overallScore: aiReport.overallScore ?? 0,
        overallGrade: aiReport.overallGrade ?? "C",
        overallSummary: aiReport.overallSummary ?? "",
        websiteSeoScore: aiReport.websiteSeoScore ?? 0,
        discoveredProfiles: discovered.map(p => ({ ...p, found: true })),
        platformScores: aiReport.platformScores ?? [],
        platformGapAnalysis: aiReport.platformGapAnalysis ?? { missingPlatforms: [], gapScore: 0, summary: "" },
        contentConsistency: aiReport.contentConsistency ?? { score: 0, issues: [], summary: "" },
        postingCadence: aiReport.postingCadence ?? { overallHealth: "Unknown", dormantAccounts: [], activeAccounts: [], summary: "", recommendation: "" },
        aiVisibilityScore: aiReport.aiVisibilityScore ?? { score: 0, grade: "F", likelyMentionedInAI: false, factors: [], summary: "", recommendations: [] },
        actionPlan: aiReport.actionPlan ?? [],
        topRecommendations: aiReport.topRecommendations ?? [],
        scanConfidence,
      };
    }),

  comparePresences: protectedProcedure
    .input(z.object({
      yourUrl: z.string().url("Please enter a valid URL for your website"),
      competitorUrl: z.string().url("Please enter a valid URL for the competitor website"),
    }))
    .mutation(async ({ input }) => {
      // Fetch both websites in parallel
      const [{ html: yourHtml }, { html: competitorHtml }] = await Promise.all([
        fetchWithTimeout(input.yourUrl),
        fetchWithTimeout(input.competitorUrl),
      ]);

      // Discover social profiles for both
      const [yourDiscovered, competitorDiscovered] = await Promise.all([
        Promise.resolve(discoverSocialProfiles(yourHtml, input.yourUrl)),
        Promise.resolve(discoverSocialProfiles(competitorHtml, input.competitorUrl)),
      ]);

      // Fetch profile pages for both (in parallel)
      const [yourProfiles, competitorProfiles] = await Promise.all([
        Promise.all(yourDiscovered.slice(0, 6).map(async (p) => {
          const { html } = await fetchWithTimeout(p.url, 5000);
          return { ...p, profileData: extractProfileData(html, p.platform) };
        })),
        Promise.all(competitorDiscovered.slice(0, 6).map(async (p) => {
          const { html } = await fetchWithTimeout(p.url, 5000);
          return { ...p, profileData: extractProfileData(html, p.platform) };
        })),
      ]);

      // AI comparison
      const comparison = await comparePresencesWithAI({
        yourUrl: input.yourUrl,
        yourProfiles,
        competitorUrl: input.competitorUrl,
        competitorProfiles,
      });

      return {
        yourUrl: input.yourUrl,
        competitorUrl: input.competitorUrl,
        yourDiscoveredCount: yourDiscovered.length,
        competitorDiscoveredCount: competitorDiscovered.length,
        yourScore: comparison.yourScore ?? 0,
        competitorScore: comparison.competitorScore ?? 0,
        yourGrade: comparison.yourGrade ?? "C",
        competitorGrade: comparison.competitorGrade ?? "C",
        platformComparison: comparison.platformComparison ?? [],
        yourAdvantages: comparison.yourAdvantages ?? [],
        competitorAdvantages: comparison.competitorAdvantages ?? [],
        quickWins: comparison.quickWins ?? [],
        summary: comparison.summary ?? "",
        yourProfiles: yourDiscovered,
        competitorProfiles: competitorDiscovered,
      };
    }),

  // ─── Public scan — no auth required, no DB save ─────────────────────────
  publicScanPresence: publicProcedure
    .input(z.object({
      websiteUrl: z.string().url("Please enter a valid website URL"),
    }))
    .mutation(async ({ input }) => {
      // 1. Fetch website HTML
      const { html: websiteHtml } = await fetchWithTimeout(input.websiteUrl);
      if (!websiteHtml) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Could not reach that website. Please check the URL and try again.",
        });
      }
      // 2. Discover social profiles
      const discovered = discoverSocialProfiles(websiteHtml, input.websiteUrl);
      // 3. Fetch each discovered social profile page (max 8, in parallel)
      const profilesWithData = await Promise.all(
        discovered.slice(0, 8).map(async (profile) => {
          const { html } = await fetchWithTimeout(profile.url, 6000);
          const profileData = extractProfileData(html, profile.platform);
          return { ...profile, profileData };
        })
      );
      // 4. Run AI analysis
      const aiReport = await analyseWithAI({
        websiteUrl: input.websiteUrl,
        websiteHtml: websiteHtml.slice(0, 5000),
        discoveredProfiles: profilesWithData,
      });
      // 5. Build confidence score
      const profileConfidenceItems = buildSocialProfileConfidence(
        discovered.map(p => ({ platform: p.platform, found: true, discoveryMethod: "direct_link" as const }))
      );
      const allConfidenceItems = [...SOCIAL_SCAN_CONFIDENCE_ITEMS, ...profileConfidenceItems];
      const overallPct = calculateOverallConfidence(allConfidenceItems);
      const scanConfidence: ScanConfidence = {
        overallPct,
        summary: generateConfidenceSummary(overallPct),
        items: allConfidenceItems,
        scannedAt: new Date().toISOString(),
        methodology: CONFIDENCE_METHODOLOGY,
      };
      // 6. Return full report (not saved to DB — user must sign up to save)
      return {
        websiteUrl: input.websiteUrl,
        brandName: aiReport.brandName ?? "",
        brandIndustry: aiReport.brandIndustry ?? "",
        overallScore: aiReport.overallScore ?? 0,
        overallGrade: aiReport.overallGrade ?? "C",
        overallSummary: aiReport.overallSummary ?? "",
        websiteSeoScore: aiReport.websiteSeoScore ?? 0,
        discoveredProfiles: discovered.map(p => ({ ...p, found: true })),
        platformScores: aiReport.platformScores ?? [],
        platformGapAnalysis: aiReport.platformGapAnalysis ?? { missingPlatforms: [], gapScore: 0, summary: "" },
        contentConsistency: aiReport.contentConsistency ?? { score: 0, issues: [], summary: "" },
        postingCadence: aiReport.postingCadence ?? { overallHealth: "Unknown", dormantAccounts: [], activeAccounts: [], summary: "", recommendation: "" },
        aiVisibilityScore: aiReport.aiVisibilityScore ?? { score: 0, grade: "F", likelyMentionedInAI: false, factors: [], summary: "", recommendations: [] },
        actionPlan: aiReport.actionPlan ?? [],
        topRecommendations: aiReport.topRecommendations ?? [],
        scanConfidence,
        isSaved: false,
      };
    }),

  getSocialScans: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return db
      .select()
      .from(socialScans)
      .where(eq(socialScans.userId, ctx.user.id))
      .orderBy(desc(socialScans.createdAt))
      .limit(20);
  }),
});
