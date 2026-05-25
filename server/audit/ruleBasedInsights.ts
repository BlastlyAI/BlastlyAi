import type { WebsiteExtract } from "../../shared/auditTypes";
import type { ScoredSections } from "../../shared/auditScoring";

/** Rule-based insights from extracted evidence — no hallucination. */
export function buildRuleBasedInsights(
  extract: WebsiteExtract,
  scored: ScoredSections
): string[] {
  const insights: string[] = [];
  const name = extract.businessName.value ?? "This website";
  const bt = extract.businessType.value ?? "unknown";

  if (extract.heroHeadline.value) {
    insights.push(
      `Homepage headline detected: “${extract.heroHeadline.value.slice(0, 100)}”${extract.heroHeadline.value.length > 100 ? "…" : ""}.`
    );
  } else {
    insights.push("No clear primary headline (H1) was detected on the homepage.");
  }

  if (bt !== "unknown") {
    insights.push(`Business type signals point to ${bt.replace("_", " ")} based on page structure and content.`);
  }

  const ctas = extract.ctaButtons.value ?? [];
  if (ctas.length === 0) {
    insights.push("No prominent call-to-action buttons were detected — adding a clear primary action could improve conversions.");
  } else if (ctas.length === 1) {
    insights.push(`One primary CTA detected (“${ctas[0].text}”) — consider whether a secondary action would help visitors self-qualify.`);
  }

  if (extract.blogDetected.value) {
    insights.push("A blog or resources section was detected — expanding educational content could support long-term SEO.");
  } else {
    insights.push("No blog or educational content section was detected on the homepage.");
  }

  const social = extract.socialLinks.value ?? {};
  const socialCount = Object.keys(social).length;
  if (socialCount === 0) {
    insights.push("No social profile links were found in the page — adding them can improve cross-channel trust.");
  } else {
    insights.push(
      `Social links detected (${Object.keys(social).join(", ")}) — posting consistency could not be verified from the website alone.`
    );
  }

  const weakSections = (
    [
      ["Branding", scored.branding.score],
      ["Performance", scored.performance.score],
      ["Content", scored.content.score],
      ["SEO", scored.seo.score],
      ["Social & trust", scored.socialTrust.score],
    ] as const
  ).filter(([, s]) => s < 60);

  if (weakSections.length > 0) {
    insights.push(
      `${name}'s lowest-scoring areas: ${weakSections.map(([l]) => l).join(", ")} — see checklist details for specific fixes.`
    );
  }

  return insights.slice(0, 6);
}

export function buildScoreSummary(
  extract: WebsiteExtract,
  overallScore: number
): string {
  const name = extract.businessName.value ?? "Your website";
  if (extract.fetchStatus === 0) {
    return `We could not reach ${extract.url} to analyze the homepage. Scores reflect limited signals only.`;
  }
  if (overallScore >= 75) {
    return `${name} has a solid website foundation with clear structure, but specific checklist items below highlight areas to sharpen.`;
  }
  if (overallScore >= 55) {
    return `${name}'s website has a workable foundation but needs improvements in content clarity, trust signals, and conversion paths.`;
  }
  return `${name}'s website has notable gaps in structure, trust, or discoverability based on detected homepage signals.`;
}

export function businessTypeToIndustry(bt: string | null): string {
  switch (bt) {
    case "ecommerce":
      return "Retail & E-commerce";
    case "saas":
      return "Technology";
    case "local_service":
      return "Professional Services";
    case "agency":
      return "Marketing";
    case "media":
      return "Entertainment";
    case "nonprofit":
      return "Non-profit";
    case "corporate":
      return "Professional Services";
    default:
      return "Other";
  }
}
