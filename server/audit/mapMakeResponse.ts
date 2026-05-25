import { normalizePlatformIds } from "./platformNormalize";
import type { RunAuditInput, RunAuditResponse } from "./types";
import type { AuditPersistPayload } from "./persist";

type MakeAuditPayload = {
  business_name?: string;
  businessName?: string;
  industry?: string;
  services?: string[];
  target_audience?: string;
  targetAudience?: string | Record<string, unknown>;
  brand_tone?: string;
  brandTone?: string;
  recommended_platforms?: string[];
  recommendedPlatforms?: string[];
  ai_summary?: string;
  aiSummary?: string;
  summary?: string;
  marketing_opportunities?: string[];
  marketingOpportunities?: string[];
  email?: string;
  phone?: string;
  [key: string]: unknown;
};

function pickString(obj: MakeAuditPayload, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function pickArray(obj: MakeAuditPayload, ...keys: string[]): string[] {
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v)) return v.map(String).filter(Boolean);
  }
  return [];
}

export function mapMakeResponseToAudit(
  raw: unknown,
  input: RunAuditInput,
  shareToken: string
): RunAuditResponse & { persistPayload: AuditPersistPayload } {
  const data = (raw ?? {}) as MakeAuditPayload;
  const nested =
    typeof data.body === "object" && data.body ? (data.body as MakeAuditPayload) : data;

  const businessName =
    pickString(nested, "business_name", "businessName") ??
    input.businessName.replace(/^https?:\/\//, "").split("/")[0] ??
    "Your Business";
  const industry = pickString(nested, "industry") ?? input.industry ?? "Other";
  const services = pickArray(nested, "services");
  const aiSummary =
    pickString(nested, "ai_summary", "aiSummary", "summary") ??
    `${businessName} — AI analysis from your website.`;
  const brandTone = pickString(nested, "brand_tone", "brandTone") ?? "Professional";
  const targetAudienceRaw = nested.target_audience ?? nested.targetAudience;
  const marketingOpportunities = pickArray(
    nested,
    "marketing_opportunities",
    "marketingOpportunities"
  );

  const recommendedRaw = pickArray(
    nested,
    "recommended_platforms",
    "recommendedPlatforms"
  );
  const recommendedPlatforms = normalizePlatformIds(
    recommendedRaw.length > 0 ? recommendedRaw : ["facebook", "instagram", "linkedin"]
  );

  const targetAudience =
    typeof targetAudienceRaw === "object" && targetAudienceRaw
      ? (targetAudienceRaw as Record<string, unknown>)
      : {
          rationale: typeof targetAudienceRaw === "string" ? targetAudienceRaw : null,
          ageRanges: ["35-44", "45-54"],
          genderSkew: "balanced",
          interests: services.slice(0, 4),
        };

  const rawReport: Record<string, unknown> = {
    businessName,
    industry,
    services,
    brandTone,
    brand_tone: brandTone,
    businessDescription: aiSummary,
    summary: aiSummary,
    ai_summary: aiSummary,
    recommendedPlatforms,
    targetAudience,
    marketingOpportunities,
    dataConfidence: "real",
    source: "make.com",
    email: pickString(nested, "email", "contactEmail", "footerEmail"),
    phone: pickString(nested, "phone", "contactMobile"),
    platformScores: Object.fromEntries(
      recommendedPlatforms.slice(0, 4).map((p) => [p, { score: 65, grade: "C" }])
    ),
  };

  const persistPayload: AuditPersistPayload = {
    shareToken,
    workspaceId: input.workspaceId ?? null,
    userId: input.userId ?? null,
    createdBy: input.userId ?? null,
    businessName,
    industry,
    website: input.website ?? input.businessName,
    handles: input.handles ?? null,
    description: aiSummary,
    detectedHandles: null,
    geographicReach: "local",
    adSpend: input.adSpend ?? null,
    overallScore: 68,
    platformScores: rawReport.platformScores,
    contentScore: 62,
    adQualityScore: 58,
    engagementScore: 60,
    growthScore: 55,
    cyberSecurityScore: 72,
    findings: marketingOpportunities.map((title, i) => ({
      category: "Opportunity",
      severity: "opportunity",
      title,
      detail: title,
      impact: i === 0 ? "High" : "Medium",
    })),
    recommendations: [],
    blastlyPitch: {
      headline: `${businessName}, grow with Blastly`,
      painPoints: ["Inconsistent posting", "No unified strategy"],
      cta: "Start your free trial",
    },
    rawReport,
  };

  return {
    shareToken,
    businessName,
    industry,
    businessDescription: aiSummary,
    tagline: brandTone,
    detectedHandles: null,
    geographicReach: "local",
    locationCity: null,
    locationState: null,
    locationCountry: null,
    phone: rawReport.phone as string | null,
    address: null,
    googleReviewUrl: null,
    recommendedPlatforms,
    overallScore: persistPayload.overallScore,
    contentScore: persistPayload.contentScore,
    adQualityScore: persistPayload.adQualityScore,
    engagementScore: persistPayload.engagementScore,
    growthScore: persistPayload.growthScore,
    socialPresenceScore: 55,
    confirmedPlatformCount: recommendedPlatforms.length,
    dataConfidence: "real",
    persistPayload,
  };
}
