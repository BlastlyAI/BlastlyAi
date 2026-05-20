import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { auditReports } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { fetchPageText } from "../agents/fetcher";
import { callDataApi } from "../_core/dataApi";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

type LLMResponse = { choices: Array<{ message: { content: string } }> };

async function llmJson<T>(prompt: string, systemPrompt: string): Promise<T> {
  const res = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt + " Respond with raw JSON only — no markdown fences, no explanation, just the JSON object." },
      { role: "user", content: prompt },
    ],
  }) as LLMResponse;
  let raw: string = res.choices[0]?.message?.content ?? "{}";
  if (typeof raw === "string") {
    raw = raw.trim();
    // Strip markdown code fences: ```json ... ``` or ``` ... ```
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  try {
    return JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) as T;
  } catch (e) {
    console.error("[audit] Failed to parse LLM JSON:", String(raw).slice(0, 500));
    return {} as T;
  }
}

export const auditRouter = router({
  // ── Run a full audit (public — no login required) ──────────────────────────
  runAudit: publicProcedure
    .input(z.object({
      businessName: z.string().min(1),
      industry: z.string().optional(),
      website: z.string().optional(),
      handles: z.object({
        twitter: z.string().optional(),
        linkedin: z.string().optional(),
        facebook: z.string().optional(),
        instagram: z.string().optional(),
      }).optional(),
      adSpend: z.number().optional(),   // Monthly in USD
      workspaceId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const platformList = Object.entries(input.handles ?? {})
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");

      // Determine if the input is a URL or a business name
      const inputUrl = input.website ?? input.businessName;
      const isUrl = inputUrl.startsWith("http") || inputUrl.startsWith("www.") || (inputUrl.includes(".") && !inputUrl.includes(" "));

      // If a URL was provided, fetch the page to extract real business context
      let fetchedTitle = "";
      let fetchedContext = "";
      let scrapedSocialLinks: Record<string, string | null> = {};
      if (isUrl) {
        try {
          const urlToFetch = inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`;
          const fetched = await fetchPageText(urlToFetch);
          fetchedTitle = fetched.title;
          fetchedContext = fetched.text.slice(0, 3000);
          scrapedSocialLinks = fetched.socialLinks ?? {};
        } catch {
          // If fetching fails, continue with LLM-only analysis
        }
      }

      // Track whether we have real page data or are relying on LLM inference
      const hasRealPageData = !!fetchedContext;

      // ── SimilarWeb keyword intelligence (parallel, 10s timeout) ──────────────
      let swKeywords: Array<{ keyword: string; clicks: number; traffic_share: number; primary_intent?: string }> = [];
      let swLandingPages: Array<{ url: string; clicks: number; traffic_share: number; top_keyword?: string }> = [];
      if (isUrl) {
        try {
          const domain = (inputUrl.startsWith("http") ? new URL(inputUrl).hostname : inputUrl.split("/")[0]).replace(/^www\./, "");
          const timeout = (ms: number) => new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));
          const [kwResult, lpResult] = await Promise.allSettled([
            Promise.race([callDataApi("Similarweb/website_analysis_keywords", { query: { domain, country: "ww", web_source: "total", traffic_source: "organic", branded_type: "all", granularity: "monthly", limit: "20", offset: "0" } }), timeout(10000)]),
            Promise.race([callDataApi("Similarweb/keywords_landing_pages", { query: { domain, country: "ww", web_source: "total", traffic_source: "organic", granularity: "monthly", limit: "10" } }), timeout(10000)]),
          ]);
          if (kwResult.status === "fulfilled" && kwResult.value) {
            const data = kwResult.value as { keywords?: Array<{ keyword: string; clicks: number; traffic_share: number; primary_intent?: string }> };
            swKeywords = (data.keywords ?? []).slice(0, 20);
          }
          if (lpResult.status === "fulfilled" && lpResult.value) {
            const data = lpResult.value as { landing_pages?: Array<{ url: string; clicks: number; traffic_share: number; top_keyword?: string }> };
            swLandingPages = (data.landing_pages ?? []).slice(0, 10);
          }
        } catch {
          // SimilarWeb data unavailable — continue without it
        }
      }
      const hasSWData = swKeywords.length > 0 || swLandingPages.length > 0;

      const prompt = `
You are a senior social media marketing analyst. Conduct a comprehensive audit.

${isUrl ? `The user has provided this URL: ${inputUrl}` : `Business: ${input.businessName}`}
${fetchedTitle ? `\nPage Title: ${fetchedTitle}` : ""}
${fetchedContext ? `\nPage Content (extracted from website):\n${fetchedContext}\n` : ""}
${Object.values(scrapedSocialLinks).some(Boolean) ? `\nSOCIAL LINKS CONFIRMED FROM PAGE HTML (use these exactly in detectedHandles — do not override):\n${Object.entries(scrapedSocialLinks).filter(([,v]) => v).map(([k,v]) => `  ${k}: ${v}`).join("\n")}\n` : ""}
${!fetchedContext && isUrl ? `\nIMPORTANT: No page content could be fetched for this URL. Base your analysis on your general knowledge of this brand/domain. Set "dataConfidence": "inferred" in your response to indicate scores are estimates only.` : ""}

Industry: ${input.industry ?? "Infer from the page content or URL"}
Website: ${input.website ?? (isUrl ? inputUrl : "Not provided")}
Social Handles: ${platformList || "Infer from the page content, URL, or your knowledge of this brand"}
Monthly Ad Spend: ${input.adSpend ? `$${input.adSpend}` : "Not provided"}
${hasSWData ? `
── REAL SEARCH INTELLIGENCE FROM SIMILARWEB ──
This is live data, not estimates. Use it to make the audit genuinely data-driven.

${swKeywords.length > 0 ? `TOP ORGANIC KEYWORDS DRIVING TRAFFIC TO THIS DOMAIN:
${swKeywords.map((k, i) => `  ${i+1}. "${k.keyword}" — ${(k.traffic_share * 100).toFixed(2)}% traffic share, ${k.clicks?.toLocaleString() ?? "n/a"} clicks, intent: ${k.primary_intent ?? "unknown"}`).join("\n")}` : ""}

${swLandingPages.length > 0 ? `TOP LANDING PAGES BY ORGANIC TRAFFIC:
${swLandingPages.map((p, i) => `  ${i+1}. ${p.url} — ${(p.traffic_share * 100).toFixed(2)}% traffic share, top keyword: "${p.top_keyword ?? "unknown"}"`).join("\n")}` : ""}

Use this data to:
- Identify which keywords they rank for vs. what they SHOULD rank for
- Spot keyword gaps vs. industry competitors
- Assess SEO strength based on real traffic distribution
- Make specific keyword recommendations in the findings/recommendations sections
` : ""}
IMPORTANT: Include TikTok in your platform analysis if the brand has a TikTok presence. Supported platforms: twitter, linkedin, facebook, instagram, tiktok.

Produce a detailed audit report as JSON with this exact structure:
{
  "businessName": "<extracted or inferred business name>",
  "industry": "<extracted or inferred industry category>",
  "businessDescription": "<1-2 sentence description of what this business does, extracted from website content>",
  "tagline": "<the business tagline or value proposition if found, otherwise null>",
  "geographicReach": "<local|state|national|international — infer from service area mentions, address, shipping info, or domain TLD. A hairdresser or plumber = local. A state-wide franchise = state. An online store shipping Australia-wide = national. A brand with .com or global shipping = international>",
  "locationCity": "<city or suburb if detectable from the website, otherwise null>",
  "locationState": "<state/territory if detectable, otherwise null>",
  "locationCountry": "<country if detectable, otherwise null>",
  "phone": "<business phone number if found on the website, otherwise null>",
  "address": "<full business address if found on the website, otherwise null>",
  "googleReviewUrl": "<Google Maps or Google Business review URL if found on the website, otherwise null>",
  "detectedHandles": {
    "facebook": "<handle/URL if found, otherwise null>",
    "instagram": "<handle/URL if found, otherwise null>",
    "twitter": "<handle/URL if found, otherwise null>",
    "linkedin": "<handle/URL if found, otherwise null>",
    "tiktok": "<handle/URL if found, otherwise null>",
    "youtube": "<handle/URL if found, otherwise null>",
    "pinterest": "<handle/URL if found, otherwise null>"
  },
  "socialPresenceScore": <0-100 — CRITICAL: this must reflect actual detected social media presence. Score 0 if no social handles are detected or confirmed. Score 25 if 1 platform. Score 50 if 2 platforms. Score 75 if 3-4 platforms. Score 100 if 5+ platforms. DO NOT infer or assume social presence — only score what is explicitly found>,
  "overallScore": <0-100>,
  "overallGrade": <"A"|"B"|"C"|"D"|"F">,
  "summary": "<2-3 sentence executive summary>",
  "platformScores": {
    "<platform>": {
      "score": <0-100>,
      "grade": <"A"|"B"|"C"|"D"|"F">,
      "profileCompleteness": <0-100>,
      "contentQuality": <0-100>,
      "engagementRate": "<estimated %>",
      "postingFrequency": "<e.g. 3x/week>",
      "audienceGrowth": "<estimated trend>",
      "strengths": ["<strength 1>", "<strength 2>"],
      "weaknesses": ["<weakness 1>", "<weakness 2>"]
    }
  },
  "contentScore": <0-100>,
  "adQualityScore": <0-100>,
  "engagementScore": <0-100>,
  "growthScore": <0-100>,
  "adAnalysis": {
    "estimatedCPM": "<e.g. $8-12>",
    "estimatedCPC": "<e.g. $0.50-1.20>",
    "estimatedCPA": "<e.g. $15-40>",
    "qualityRating": "<Poor|Fair|Good|Excellent>",
    "creativeFatigue": "<Low|Medium|High>",
    "audienceTargeting": "<Poor|Fair|Good|Excellent>",
    "adSpendEfficiency": "<e.g. 65%>",
    "recommendations": ["<ad rec 1>", "<ad rec 2>", "<ad rec 3>"]
  },
  "contentAnalysis": {
    "brandConsistency": <0-100>,
    "visualQuality": <0-100>,
    "copyEffectiveness": <0-100>,
    "hashtagStrategy": "<Poor|Fair|Good|Excellent>",
    "ctaClarity": "<Poor|Fair|Good|Excellent>",
    "contentMix": "<e.g. 60% promotional, 30% educational, 10% entertainment>",
    "topPerformingTypes": ["<type 1>", "<type 2>"]
  },
  "competitivePosition": {
    "industryBenchmark": "<above/at/below average>",
    "estimatedMarketShare": "<e.g. Small — early stage>",
    "differentiators": ["<differentiator 1>", "<differentiator 2>"],
    "gaps": ["<gap 1>", "<gap 2>", "<gap 3>"]
  },
  "findings": [
    {
      "category": "<Profile|Content|Ads|Engagement|Growth|Strategy>",
      "severity": "<critical|warning|opportunity>",
      "title": "<short title>",
      "detail": "<2-3 sentence explanation>",
      "impact": "<High|Medium|Low>"
    }
  ],
  "recommendations": [
    {
      "priority": <1-10>,
      "title": "<short title>",
      "detail": "<actionable recommendation>",
      "estimatedImpact": "<e.g. +15% engagement>",
      "timeToImplement": "<e.g. 1 week>",
      "blastlyFeature": "<which Blastly feature solves this>"
    }
  ],
  "cyberSecurity": {
    "score": <0-100>,
    "grade": <"A"|"B"|"C"|"D"|"F">,
    "httpsEnabled": <true|false>,
    "sslValid": <true|false>,
    "privacyPolicyPresent": <true|false>,
    "cookieConsentPresent": <true|false>,
    "twoFactorRecommended": <true|false>,
    "socialAccountsSecured": <"Good"|"Fair"|"Poor">,
    "dataExposureRisk": <"Low"|"Medium"|"High">,
    "findings": [
      {
        "severity": <"critical"|"warning"|"info">,
        "title": "<short title>",
        "detail": "<1-2 sentence explanation>",
        "fix": "<actionable fix recommendation>"
      }
    ],
    "summary": "<2-3 sentence cybersecurity summary for this business>"
  },
  "dataConfidence": "<\"real\" if page content was available, \"inferred\" if scores are based on LLM knowledge only>",
  "blastlyPitch": {
    "headline": "<personalized headline for this business>",
    "painPoints": ["<pain point 1>", "<pain point 2>", "<pain point 3>"],
    "features": [
      {
        "name": "<Blastly feature name>",
        "benefit": "<specific benefit for this business>",
        "icon": "<emoji>"
      }
    ],
    "roi": "<estimated ROI statement e.g. Save 10 hours/week and increase engagement by 40%>",
    "cta": "<personalized CTA>"
  },
  "recommendedPlatforms": ["<platform_id_1>", "<platform_id_2>", "<platform_id_3>"],
  "targetAudience": {
    "ageRanges": ["<ONLY list age ranges when clearly evident from the website content or business type (e.g. a children's toy store = 13-17 or younger parents, a retirement village = 65+). If there is ANY uncertainty, return an EMPTY ARRAY [] — do NOT guess. Valid values: 13-17, 18-24, 25-34, 35-44, 45-54, 55-64, 65+>"],
    "genderSkew": "<male-skewed|female-skewed|balanced — only if clearly evident from the business type or content, otherwise return balanced>",
    "interests": ["<interest 1>", "<interest 2>", "<interest 3>", "<interest 4>"],
    "locationRadiusKm": <number — e.g. 10 for local, 50 for regional, 500 for national, null for international>,
    "incomeLevel": "<budget|mid-range|premium|luxury>",
    "rationale": "<1-2 sentences explaining why this audience profile fits this business>"
  }
}

For recommendedPlatforms: choose the 3-5 platforms this specific business SHOULD be actively posting on, based on their industry, audience, and content type. Use only these exact IDs: facebook, instagram, linkedin, twitter, tiktok, youtube, pinterest, google_business. Do NOT include platforms just because the business already has them — only include platforms where their target audience is genuinely active and where their content type performs well. For example: a hair salon → instagram, facebook, tiktok, pinterest. A B2B tech company → linkedin, twitter, youtube. A local tradie → facebook, google_business, instagram.

Base your analysis on industry benchmarks for ${input.industry ?? "general business"}.
Be specific, data-driven, and actionable. The report should feel like it was written by a $500/hour consultant.

For the cyberSecurity section: assess based on the website URL and any available information. Check for HTTPS, infer SSL validity from the URL, assess whether a business of this type and size would typically have a privacy policy and cookie consent. Rate social account security based on the number of platforms and their typical security practices. Score 0-100 where 90+ = excellent, 70-89 = good, 50-69 = fair, below 50 = poor/at risk.
`;

      const result = await llmJson<any>(prompt,
        "You are an expert social media marketing analyst. Return only valid JSON matching the exact schema provided."
      );

      // ── Merge scraped social links with LLM-detected handles ─────────────────
      // Scraped links (from href attributes) always win over LLM inference.
      // This ensures CSS icon-only links (no anchor text) are captured correctly.
      const mergedHandles: Record<string, string | null> = {
        ...(result.detectedHandles ?? {}),
      };
      for (const [platform, url] of Object.entries(scrapedSocialLinks)) {
        if (url) mergedHandles[platform] = url; // scraped data overrides LLM
      }
      const detectedHandles = mergedHandles;
      const confirmedPlatforms = Object.values(detectedHandles).filter(Boolean).length;
      const socialPresenceScore =
        confirmedPlatforms === 0 ? 0 :
        confirmedPlatforms === 1 ? 25 :
        confirmedPlatforms === 2 ? 50 :
        confirmedPlatforms <= 4 ? 75 : 100;

      // If no real page data AND no detected platforms, cap all LLM scores at 40
      // to prevent fake-confident scores for unknown brands.
      const isBlindInference = !hasRealPageData && confirmedPlatforms === 0;
      const capScore = (s: number) => isBlindInference ? Math.min(s, 40) : s;

      const cappedContent    = capScore(result.contentScore    ?? 0);
      const cappedAdQuality  = capScore(result.adQualityScore  ?? 0);
      const cappedEngagement = capScore(result.engagementScore ?? 0);
      const cappedGrowth     = capScore(result.growthScore     ?? 0);

      // Recalculate overall score as weighted average including social presence
      // Weights: social presence 25%, content 20%, engagement 20%, growth 20%, ads 15%
      const recalcOverall = Math.round(
        socialPresenceScore * 0.25 +
        cappedContent       * 0.20 +
        cappedEngagement    * 0.20 +
        cappedGrowth        * 0.20 +
        cappedAdQuality     * 0.15
      );

      const shareToken = nanoid(16);

      // Extract a clean business name from the URL if that's what was provided
      const storedBusinessName = isUrl
        ? (result.businessName ?? inputUrl.replace(/^https?:\/\//, "").split("/")[0])
        : input.businessName;

      await db.insert(auditReports).values({
        shareToken,
        workspaceId: input.workspaceId ?? null,
        businessName: storedBusinessName,
        industry: result.industry ?? input.industry ?? null,
        website: input.website ?? null,
        handles: input.handles ?? null,
        description: result.businessDescription ?? null,
        detectedHandles: Object.keys(detectedHandles).length > 0 ? detectedHandles : null,
        geographicReach: result.geographicReach ?? null,
        adSpend: input.adSpend ? Math.round(input.adSpend * 100) : null,
        overallScore: recalcOverall,
        platformScores: result.platformScores ?? null,
        contentScore: cappedContent,
        adQualityScore: cappedAdQuality,
        engagementScore: cappedEngagement,
        growthScore: cappedGrowth,
        cyberSecurityScore: result.cyberSecurity?.score ?? null,
        findings: result.findings ?? null,
        recommendations: result.recommendations ?? null,
        blastlyPitch: result.blastlyPitch ?? null,
        rawReport: {
          ...result,
          // Merge server-calculated scores so AuditReportPage can read them from rawReport
          socialPresenceScore,
          confirmedPlatformCount: confirmedPlatforms,
          overallScore: recalcOverall,
          contentScore: cappedContent,
          adQualityScore: cappedAdQuality,
          engagementScore: cappedEngagement,
          growthScore: cappedGrowth,
        },
      });

      return {
        shareToken,
        ...result,
        // Override LLM values with server-calculated scores
        overallScore: recalcOverall,
        contentScore: cappedContent,
        adQualityScore: cappedAdQuality,
        engagementScore: cappedEngagement,
        growthScore: cappedGrowth,
        socialPresenceScore,
        confirmedPlatformCount: confirmedPlatforms,
        dataConfidence: (result.dataConfidence ?? (hasRealPageData ? "real" : "inferred")) as "real" | "inferred",
        // Ensure these are always present in the response for onboarding pre-fill
        businessName: storedBusinessName,
        industry: result.industry ?? input.industry ?? null,
        businessDescription: result.businessDescription ?? null,
        tagline: result.tagline ?? null,
        detectedHandles: Object.keys(detectedHandles).length > 0 ? detectedHandles : null,
        geographicReach: result.geographicReach ?? null,
        locationCity: result.locationCity ?? null,
        locationState: result.locationState ?? null,
        locationCountry: result.locationCountry ?? null,
        phone: result.phone ?? null,
        address: result.address ?? null,
        googleReviewUrl: result.googleReviewUrl ?? null,
        recommendedPlatforms: (result.recommendedPlatforms as string[] | null) ?? null,
      };
    }),

  // ── Get a report by share token (public) ───────────────────────────────────
  getReport: publicProcedure
    .input(z.object({ shareToken: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(auditReports)
        .where(eq(auditReports.shareToken, input.shareToken))
        .limit(1);
      if (!rows.length) throw new Error("Report not found");
      const row = rows[0];
      // Expose recommendedPlatforms from rawReport so ManagedOnboarding can use it
      const raw = row.rawReport as Record<string, unknown> | null;
      const recommendedPlatforms = (raw?.recommendedPlatforms as string[] | null) ?? null;
      const targetAudience = (raw?.targetAudience as Record<string, unknown> | null) ?? null;
      return { ...row, recommendedPlatforms, targetAudience };
    }),

  // ── List audits for a workspace (protected) ────────────────────────────────
  listAudits: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(auditReports)
        .where(eq(auditReports.workspaceId, input.workspaceId))
        .orderBy(auditReports.createdAt)
        .limit(50);
    }),
});
