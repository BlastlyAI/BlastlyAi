import type {
  AuditCheck,
  AuditCheckStatus,
  AuditSection,
  ExtractField,
  WebsiteExtract,
} from "./auditTypes";
import { SCORING_VERSION } from "./auditTypes";

export { SCORING_VERSION };

function val<T>(field: ExtractField<T>): T | null {
  return field.value;
}

function has(field: ExtractField<unknown>): boolean {
  return field.value != null && field.value !== "" && field.value !== false;
}

function checkScore(checks: AuditCheck[]): number {
  const total = checks.reduce((s, c) => s + c.weight, 0);
  if (total === 0) return 0;
  const earned = checks.reduce((s, c) => {
    if (c.status === "pass") return s + c.weight;
    if (c.status === "warn") return s + c.weight * 0.5;
    return s;
  }, 0);
  return Math.round((earned / total) * 100);
}

function mk(
  id: string,
  label: string,
  status: AuditCheckStatus,
  detail: string,
  weight: number,
  evidence?: string
): AuditCheck {
  return { id, label, status, detail, weight, evidence };
}

export type ScoredSections = {
  branding: import("./auditTypes").AuditSection;
  performance: import("./auditTypes").AuditSection;
  content: import("./auditTypes").AuditSection;
  seo: import("./auditTypes").AuditSection;
  socialTrust: import("./auditTypes").AuditSection;
  overallScore: number;
};

export function scoreWebsiteExtract(extract: WebsiteExtract): ScoredSections {
  const brandingChecks = scoreBranding(extract);
  const performanceChecks = scorePerformance(extract);
  const contentChecks = scoreContent(extract);
  const seoChecks = scoreSeo(extract);
  const socialChecks = scoreSocialTrust(extract);

  const branding = { score: checkScore(brandingChecks), checks: brandingChecks };
  const performance = { score: checkScore(performanceChecks), checks: performanceChecks };
  const content = { score: checkScore(contentChecks), checks: contentChecks };
  const seo = { score: checkScore(seoChecks), checks: seoChecks };
  const socialTrust = { score: checkScore(socialChecks), checks: socialChecks };

  const overallScore = Math.round(
    branding.score * 0.2 +
      performance.score * 0.2 +
      content.score * 0.25 +
      seo.score * 0.2 +
      socialTrust.score * 0.15
  );

  return { branding, performance, content, seo, socialTrust, overallScore };
}

function scoreBranding(extract: WebsiteExtract): AuditCheck[] {
  const logo = val(extract.logoUrl) || val(extract.faviconUrl);
  const hero = val(extract.heroHeadline);
  const ctas = val(extract.ctaButtons) ?? [];
  const title = val(extract.pageTitle);

  return [
    mk(
      "logo_detected",
      "Logo detected",
      logo ? "pass" : "warn",
      logo ? "Logo or favicon found in page metadata." : "No logo or favicon detected.",
      25,
      extract.logoUrl.evidence ?? extract.faviconUrl.evidence
    ),
    mk(
      "clear_headline",
      "Clear headline",
      hero && hero.length >= 8 ? "pass" : hero ? "warn" : "fail",
      hero
        ? `Homepage headline: “${hero.slice(0, 80)}${hero.length > 80 ? "…" : ""}”`
        : "No primary headline (h1) detected on the homepage.",
      25,
      extract.heroHeadline.evidence
    ),
    mk(
      "cta_present",
      "Call-to-action buttons",
      ctas.length > 0 ? "pass" : "fail",
      ctas.length > 0
        ? `Detected ${ctas.length} CTA(s): ${ctas.slice(0, 3).map((c) => c.text).join(", ")}`
        : "No clear call-to-action buttons detected.",
      25,
      extract.ctaButtons.evidence
    ),
    mk(
      "brand_identity",
      "Brand identity in title",
      title && title.length >= 5 ? "pass" : "warn",
      title ? `Page title: “${title.slice(0, 70)}”` : "Page title not detected.",
      25,
      extract.pageTitle.evidence
    ),
  ];
}

function scorePerformance(extract: WebsiteExtract): AuditCheck[] {
  const https = extract.technical.https;
  const viewport = extract.technical.hasViewportMeta;

  return [
    mk(
      "https_ssl",
      "HTTPS / SSL",
      https ? "pass" : "fail",
      https ? "Site is served over HTTPS." : "HTTPS not confirmed — security and SEO may be affected.",
      35
    ),
    mk(
      "mobile_viewport",
      "Mobile viewport",
      viewport ? "pass" : "warn",
      viewport
        ? "Viewport meta tag detected for responsive layout."
        : "No viewport meta tag found — mobile layout may not be optimized.",
      35,
      "meta[name=viewport]"
    ),
    mk(
      "fetch_success",
      "Page reachable",
      extract.fetchStatus >= 200 && extract.fetchStatus < 400 ? "pass" : "fail",
      extract.fetchStatus >= 200 && extract.fetchStatus < 400
        ? `Homepage returned HTTP ${extract.fetchStatus}.`
        : `Homepage fetch failed or returned HTTP ${extract.fetchStatus}.`,
      30
    ),
  ];
}

function scoreContent(extract: WebsiteExtract): AuditCheck[] {
  const services = val(extract.services) ?? [];
  const products = val(extract.products) ?? [];
  const blog = val(extract.blogDetected);
  const bt = val(extract.businessType);
  const hasOfferings =
    services.length > 0 ||
    products.length > 0 ||
    bt === "ecommerce" ||
    bt === "saas";

  return [
    mk(
      "offerings_described",
      "Services or products described",
      hasOfferings ? "pass" : "warn",
      products.length > 0
        ? `Products detected: ${products.slice(0, 5).join(", ")}`
        : services.length > 0
          ? `Services detected: ${services.slice(0, 5).join(", ")}`
          : bt === "ecommerce"
            ? "E-commerce signals detected but specific products were not extracted."
            : "No service or product descriptions clearly detected.",
      30,
      extract.products.evidence ?? extract.services.evidence
    ),
    mk(
      "blog_content",
      "Blog / articles",
      blog ? "pass" : "unknown",
      blog ? "Blog or news section detected." : "No blog or educational content section detected.",
      20,
      extract.blogDetected.evidence
    ),
    mk(
      "trust_content",
      "Trust-building content",
      (val(extract.trustSignals) ?? []).length > 0 ? "pass" : "unknown",
      (val(extract.trustSignals) ?? []).length > 0
        ? `Trust signals: ${(val(extract.trustSignals) ?? []).slice(0, 4).join(", ")}`
        : "No testimonials, reviews, or trust badges clearly detected.",
      25,
      extract.trustSignals.evidence
    ),
    mk(
      "primary_cta",
      "Strong CTA",
      (val(extract.ctaButtons) ?? []).length >= 1 ? "pass" : "fail",
      (val(extract.ctaButtons) ?? []).length >= 1
        ? "At least one call-to-action is present."
        : "No call-to-action detected above the fold or in main content.",
      25,
      extract.ctaButtons.evidence
    ),
  ];
}

function scoreSeo(extract: WebsiteExtract): AuditCheck[] {
  const title = val(extract.metaTitle) ?? val(extract.pageTitle);
  const desc = val(extract.metaDescription);
  const headings = val(extract.headings) ?? [];
  const h1s = headings.filter((h) => h.level === 1);
  const schema = val(extract.schemaOrg) ?? [];
  const canonical = val(extract.technical.canonicalUrl);

  return [
    mk(
      "meta_title",
      "Meta title",
      title && title.length >= 10 && title.length <= 70 ? "pass" : title ? "warn" : "fail",
      title
        ? `Title length ${title.length} chars: “${title.slice(0, 60)}${title.length > 60 ? "…" : ""}”`
        : "No page title detected.",
      20,
      extract.metaTitle.evidence ?? extract.pageTitle.evidence
    ),
    mk(
      "meta_description",
      "Meta description",
      desc && desc.length >= 50 ? "pass" : desc ? "warn" : "fail",
      desc
        ? `Description length ${desc.length} chars.`
        : "No meta description detected.",
      20,
      extract.metaDescription.evidence
    ),
    mk(
      "heading_structure",
      "Heading structure",
      h1s.length === 1 ? "pass" : h1s.length > 1 ? "warn" : "fail",
      h1s.length === 1
        ? "Single H1 found — good heading hierarchy."
        : h1s.length > 1
          ? `Multiple H1 tags (${h1s.length}) — may dilute SEO focus.`
          : "No H1 heading detected.",
      20,
      extract.headings.evidence
    ),
    mk(
      "structured_data",
      "Schema.org / structured data",
      schema.length > 0 ? "pass" : "unknown",
      schema.length > 0
        ? `${schema.length} structured data block(s) detected.`
        : "No JSON-LD schema.org data detected.",
      20,
      extract.schemaOrg.evidence
    ),
    mk(
      "canonical_url",
      "Canonical URL",
      canonical ? "pass" : "unknown",
      canonical ? `Canonical: ${canonical}` : "No canonical link tag detected.",
      20,
      extract.technical.canonicalUrl.evidence
    ),
  ];
}

function scoreSocialTrust(extract: WebsiteExtract): AuditCheck[] {
  const social = val(extract.socialLinks) ?? {};
  const socialCount = Object.keys(social).length;
  const email = val(extract.contact.email);
  const phone = val(extract.contact.phone);
  const trust = val(extract.trustSignals) ?? [];

  return [
    mk(
      "social_links",
      "Social links",
      socialCount >= 2 ? "pass" : socialCount === 1 ? "warn" : "fail",
      socialCount > 0
        ? `Detected: ${Object.keys(social).join(", ")}`
        : "No social profile links detected on the homepage.",
      25,
      extract.socialLinks.evidence
    ),
    mk(
      "reviews_testimonials",
      "Reviews / testimonials",
      trust.some((t) => /review|testimonial|rating|trust/i.test(t)) ? "pass" : "unknown",
      trust.some((t) => /review|testimonial|rating|trust/i.test(t))
        ? "Review or testimonial content detected."
        : "No review or testimonial section clearly detected.",
      25,
      extract.trustSignals.evidence
    ),
    mk(
      "contact_visibility",
      "Contact visibility",
      email || phone ? "pass" : "fail",
      email && phone
        ? `Email and phone detected.`
        : email
          ? `Email detected: ${email}`
          : phone
            ? `Phone detected: ${phone}`
            : "No contact email or phone detected on the homepage.",
      25,
      extract.contact.email.evidence ?? extract.contact.phone.evidence
    ),
    mk(
      "trust_signals",
      "Trust signals",
      trust.length >= 2 || (extract.technical.https && (email || phone))
        ? "pass"
        : trust.length === 1 || email || phone
          ? "warn"
          : "fail",
      trust.length > 0
        ? `${trust.length} trust signal(s) detected.`
        : "Limited trust signals detected beyond basic HTTPS.",
      25,
      extract.trustSignals.evidence
    ),
  ];
}
