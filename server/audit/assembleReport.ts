import type { WebsiteAuditData, WebsiteExtract } from "../../shared/auditTypes";
import { SCORING_VERSION } from "../../shared/auditTypes";
import { scoreWebsiteExtract } from "../../shared/auditScoring";
import { faviconUrlForHost, hostnameFromWebsite } from "../../shared/auditUtils";
import { interpretWebsiteAudit } from "./aiInterpret";
import { buildRuleBasedInsights, buildScoreSummary, businessTypeToIndustry } from "./ruleBasedInsights";

const SOCIAL_PLATFORMS = [
  "Facebook",
  "Instagram",
  "LinkedIn",
  "Twitter",
  "TikTok",
  "YouTube",
  "Pinterest",
] as const;

function dataConfidence(extract: WebsiteExtract): WebsiteAuditData["dataConfidence"] {
  if (extract.fetchStatus === 0) return "failed";
  if (extract.fetchStatus >= 200 && extract.fetchStatus < 400) return "scraped";
  return "partial";
}

export async function assembleWebsiteAudit(extract: WebsiteExtract): Promise<WebsiteAuditData> {
  const scored = scoreWebsiteExtract(extract);
  const ai = await interpretWebsiteAudit(extract, scored);
  const host = hostnameFromWebsite(extract.finalUrl || extract.url);
  const social = extract.socialLinks.value ?? {};
  const favicon =
    extract.faviconUrl.value ?? extract.logoUrl.value ?? faviconUrlForHost(host);

  const summary =
    ai.summary || buildScoreSummary(extract, scored.overallScore);

  const wa: WebsiteAuditData = {
    faviconUrl: favicon,
    websiteUrl: extract.finalUrl || extract.url,
    pageTitle: extract.pageTitle.value ?? "Not detected",
    metaTitle: extract.metaTitle.value ?? extract.pageTitle.value ?? "Not detected",
    heroHeadline: extract.heroHeadline.value,
    ctaButtons: (extract.ctaButtons.value ?? []).map((c) => c.text),
    services: extract.services.value ?? [],
    products: extract.products.value ?? [],
    businessType: extract.businessType.value ?? "unknown",
    socialLinks: SOCIAL_PLATFORMS.map((platform) => {
      const key = platform.toLowerCase() === "twitter" ? "twitter" : platform.toLowerCase();
      const url = social[key] ?? social[platform.toLowerCase()] ?? null;
      return {
        platform,
        url,
        detected: Boolean(url),
      };
    }),
    brandingColors: extract.brandingColors.value ?? [],
    footerInfo: {
      email: extract.contact.email.value,
      phone: extract.contact.phone.value,
      address: extract.contact.address.value,
    },
    technical: {
      https: extract.technical.https,
      sslValid: extract.technical.sslValid,
      mobileFriendly: extract.technical.hasViewportMeta ? "likely" : "unclear",
      pageSpeedEstimate: "Unknown",
      blogDetected: extract.blogDetected.value ?? false,
      imageOptimization: "unknown",
    },
    sections: {
      branding: scored.branding,
      performance: scored.performance,
      content: scored.content,
      seo: scored.seo,
      socialTrust: scored.socialTrust,
    },
    aiInsights: ai.insights.length > 0 ? ai.insights : buildRuleBasedInsights(extract, scored),
    scoreSummary: summary,
    dataConfidence: dataConfidence(extract),
    scoringVersion: SCORING_VERSION,
    extract,
  };

  return wa;
}

export function industryFromExtract(extract: WebsiteExtract): string {
  return businessTypeToIndustry(extract.businessType.value);
}

export function overallFromAudit(wa: WebsiteAuditData): number {
  const s = wa.sections;
  return Math.round(
    (s.branding.score + s.performance.score + s.content.score + s.seo.score + s.socialTrust.score) / 5
  );
}
