import { nanoid } from "nanoid";
import type { RunAuditInput, RunAuditResponse } from "./types";
import type { AuditPersistPayload } from "./persist";
import { extractWebsite } from "./extractor";
import { assembleWebsiteAudit, industryFromExtract, overallFromAudit } from "./assembleReport";
import { generateSuggestedPosts } from "./suggestedPosts";
import { normalizeWebsiteUrl, hostnameFromWebsite } from "../../shared/auditUtils";

export async function runWebsiteAudit(
  input: RunAuditInput
): Promise<RunAuditResponse & { persistPayload: AuditPersistPayload; reportRow?: Record<string, unknown> }> {
  const website = normalizeWebsiteUrl(input.website ?? input.businessName ?? "");
  if (!website) {
    throw new Error("Website URL is required");
  }

  const shareToken = `audit-${nanoid(12)}`;
  console.info("[audit/pipeline] extract start:", website);
  const extract = await extractWebsite(website);
  console.info("[audit/pipeline] extract done:", {
    fetchStatus: extract.fetchStatus,
    businessName: extract.businessName.value,
  });
  const wa = await assembleWebsiteAudit(extract);
  console.info("[audit/pipeline] assemble done");
  const overall = overallFromAudit(wa);
  const businessName =
    extract.businessName.value ??
    input.businessName ??
    hostnameFromWebsite(website);
  const industry = industryFromExtract(extract);
  const social = extract.socialLinks.value ?? {};
  const detectedHandles = Object.fromEntries(
    Object.entries(social).map(([k, v]) => [k, v])
  );
  const recommendedPlatforms = Object.keys(social).slice(0, 5);
  const suggestedPosts = await generateSuggestedPosts(extract, businessName);
  console.info("[audit/pipeline] posts done");

  const findings = wa.aiInsights.map((detail, i) => ({
    category: ["Branding", "Content", "SEO", "Performance", "Social"][i % 5],
    severity: wa.sections.branding.score < 60 && i === 0 ? "warning" : "opportunity",
    title: detail.split(".")[0].slice(0, 80),
    detail,
    impact: i === 0 ? "High" : "Medium",
  }));

  const rawReport: Record<string, unknown> = {
    businessName,
    industry,
    website: wa.websiteUrl,
    businessDescription: wa.scoreSummary,
    tagline: wa.heroHeadline,
    summary: wa.scoreSummary,
    dataConfidence: wa.dataConfidence,
    source: "website_extractor",
    websiteAudit: wa,
    services: wa.services,
    products: wa.products,
    businessType: wa.businessType,
    brandTone: "Professional",
    brand_tone: "Professional",
    recommendedPlatforms,
    targetAudience: {
      ageRanges: [],
      genderSkew: "balanced",
      interests: [...wa.services, ...wa.products].slice(0, 4),
      rationale: "Derived only from detected page content — no demographic inference.",
    },
    detectedHandles,
    email: wa.footerInfo.email,
    phone: wa.footerInfo.phone,
    contactEmail: wa.footerInfo.email,
    footerEmail: wa.footerInfo.email,
    findings,
    recommendations: wa.aiInsights.slice(0, 5),
    suggestedPosts,
    cyberSecurity: {
      score: wa.technical.https ? 75 : 40,
      grade: wa.technical.https ? "C" : "F",
      httpsEnabled: wa.technical.https,
      sslValid: wa.technical.sslValid,
      privacyPolicyPresent: null,
      cookieConsentPresent: null,
      summary: wa.technical.https
        ? "HTTPS is enabled based on the fetched URL."
        : "HTTPS was not confirmed for this URL.",
    },
    overallScore: overall,
    contentScore: wa.sections.content.score,
    platformScores: {},
    scoringVersion: wa.scoringVersion,
  };

  const persistPayload: AuditPersistPayload = {
    shareToken,
    workspaceId: input.workspaceId ?? null,
    userId: input.userId ?? null,
    createdBy: input.userId ?? null,
    businessName,
    industry,
    website: wa.websiteUrl,
    handles: input.handles ?? null,
    description: wa.scoreSummary,
    detectedHandles: Object.keys(detectedHandles).length ? detectedHandles : null,
    geographicReach: null,
    adSpend: input.adSpend ?? null,
    overallScore: overall,
    platformScores: {},
    contentScore: wa.sections.content.score,
    adQualityScore: 0,
    engagementScore: 0,
    growthScore: 0,
    cyberSecurityScore: wa.technical.https ? 75 : 40,
    findings,
    recommendations: wa.aiInsights.slice(0, 5),
    blastlyPitch: null,
    rawReport,
  };

  return {
    shareToken,
    businessName,
    industry,
    businessDescription: wa.scoreSummary,
    tagline: wa.heroHeadline,
    detectedHandles: Object.keys(detectedHandles).length ? detectedHandles : null,
    geographicReach: null,
    locationCity: null,
    locationState: null,
    locationCountry: null,
    phone: wa.footerInfo.phone,
    address: wa.footerInfo.address,
    googleReviewUrl: null,
    recommendedPlatforms,
    overallScore: overall,
    contentScore: wa.sections.content.score,
    adQualityScore: 0,
    engagementScore: 0,
    growthScore: 0,
    socialPresenceScore: wa.sections.socialTrust.score,
    confirmedPlatformCount: Object.keys(social).length,
    dataConfidence: wa.dataConfidence === "scraped" ? "real" : "inferred",
    persistPayload,
  };
}
