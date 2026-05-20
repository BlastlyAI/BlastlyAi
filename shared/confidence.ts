/**
 * Blastly Scan Confidence Score System
 *
 * Every data point in a Blastly report is assigned a confidence level so users
 * understand exactly how reliable each insight is. This builds trust and enables
 * honest promotional claims.
 *
 * Confidence Levels:
 *   VERIFIED    — Data read directly from a live source (e.g. link found in HTML)
 *   HIGH        — Strong inference from multiple corroborating signals
 *   ESTIMATED   — Modelled from partial signals; directionally accurate
 *   APPROXIMATE — Industry-average benchmark; individual results may vary
 */

export type ConfidenceLevel = "verified" | "high" | "estimated" | "approximate";

export interface ConfidenceItem {
  /** The data point being rated */
  label: string;
  /** Confidence level for this data point */
  level: ConfidenceLevel;
  /** Short human-readable explanation of how this was determined */
  method: string;
  /** Optional: numeric confidence percentage (0–100) */
  pct?: number;
}

export interface ScanConfidence {
  /** Overall confidence score for the entire report (0–100) */
  overallPct: number;
  /** Human-readable summary of overall confidence */
  summary: string;
  /** Per-data-point breakdown */
  items: ConfidenceItem[];
  /** ISO timestamp when the scan was performed */
  scannedAt: string;
  /** Methodology note shown to users */
  methodology: string;
}

// ─── Confidence level metadata ────────────────────────────────────────────────

export const CONFIDENCE_META: Record<ConfidenceLevel, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  pct: number;
  description: string;
}> = {
  verified: {
    label: "Verified",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/15",
    borderColor: "border-emerald-500/30",
    pct: 98,
    description: "Read directly from a live source — highly reliable",
  },
  high: {
    label: "High Confidence",
    color: "text-blue-400",
    bgColor: "bg-blue-500/15",
    borderColor: "border-blue-500/30",
    pct: 85,
    description: "Strong inference from multiple corroborating signals",
  },
  estimated: {
    label: "Estimated",
    color: "text-amber-400",
    bgColor: "bg-amber-500/15",
    borderColor: "border-amber-500/30",
    pct: 70,
    description: "Modelled from partial signals — directionally accurate",
  },
  approximate: {
    label: "Approximate",
    color: "text-orange-400",
    bgColor: "bg-orange-500/15",
    borderColor: "border-orange-500/30",
    pct: 55,
    description: "Industry-average benchmark — individual results may vary",
  },
};

// ─── Confidence calculation helpers ──────────────────────────────────────────

/**
 * Calculate an overall confidence percentage from a list of confidence items.
 * Weights each item by its level's base percentage.
 */
export function calculateOverallConfidence(items: ConfidenceItem[]): number {
  if (!items || items.length === 0) return 0;
  const total = items.reduce((sum, item) => {
    const pct = item.pct ?? CONFIDENCE_META[item.level].pct;
    return sum + pct;
  }, 0);
  return Math.round(total / items.length);
}

/**
 * Generate a human-readable confidence summary from the overall percentage.
 */
export function generateConfidenceSummary(overallPct: number): string {
  if (overallPct >= 90) return "This report is highly reliable — most data points were verified directly from live sources.";
  if (overallPct >= 75) return "This report is reliable — the majority of data points are based on strong signals.";
  if (overallPct >= 60) return "This report is directionally accurate — some data points are estimated from partial signals.";
  return "This report contains estimates — treat insights as directional guidance rather than precise measurements.";
}

/**
 * Build confidence items for social profile discovery.
 * A profile found via a direct HTML link is VERIFIED; one inferred from page
 * content is HIGH; one not found is marked as such.
 */
export function buildSocialProfileConfidence(profiles: {
  platform: string;
  found: boolean;
  discoveryMethod?: "direct_link" | "meta_tag" | "inferred" | "not_found";
}[]): ConfidenceItem[] {
  return profiles.map(p => {
    if (!p.found) {
      return {
        label: `${p.platform} presence`,
        level: "verified" as ConfidenceLevel,
        method: "Confirmed absent — no link or reference found on website",
        pct: 95,
      };
    }
    switch (p.discoveryMethod) {
      case "direct_link":
        return {
          label: `${p.platform} profile`,
          level: "verified" as ConfidenceLevel,
          method: "Direct link found in website HTML",
          pct: 98,
        };
      case "meta_tag":
        return {
          label: `${p.platform} profile`,
          level: "high" as ConfidenceLevel,
          method: "Found in page meta tags or Open Graph data",
          pct: 90,
        };
      case "inferred":
        return {
          label: `${p.platform} profile`,
          level: "estimated" as ConfidenceLevel,
          method: "Inferred from page content and brand name matching",
          pct: 70,
        };
      default:
        return {
          label: `${p.platform} profile`,
          level: "high" as ConfidenceLevel,
          method: "Found via website analysis",
          pct: 85,
        };
    }
  });
}

/**
 * Standard confidence items for SEO metrics.
 */
export const SEO_CONFIDENCE_ITEMS: ConfidenceItem[] = [
  { label: "Page title & meta description", level: "verified", method: "Read directly from HTML <head>", pct: 99 },
  { label: "Heading structure (H1–H6)", level: "verified", method: "Read directly from HTML structure", pct: 99 },
  { label: "Internal link count", level: "verified", method: "Counted from live HTML", pct: 98 },
  { label: "Image alt text coverage", level: "verified", method: "Checked all <img> tags in HTML", pct: 98 },
  { label: "Schema markup detection", level: "verified", method: "Scanned for JSON-LD and microdata", pct: 97 },
  { label: "Mobile responsiveness", level: "high", method: "Checked viewport meta tag and CSS signals", pct: 88 },
  { label: "Page load speed estimate", level: "estimated", method: "Estimated from page size and resource count", pct: 72 },
  { label: "Backlink profile", level: "approximate", method: "Industry benchmark — requires Ahrefs/Moz for precision", pct: 50 },
  { label: "Domain authority", level: "approximate", method: "Estimated from age, content volume, and link signals", pct: 55 },
  { label: "Keyword rankings", level: "approximate", method: "Inferred from content — requires Search Console for precision", pct: 52 },
];

/**
 * Standard confidence items for competitor analysis.
 */
export const COMPETITOR_CONFIDENCE_ITEMS: ConfidenceItem[] = [
  { label: "Competitor identification", level: "high", method: "AI cross-referenced industry, services, and target audience", pct: 87 },
  { label: "Competitor website SEO", level: "high", method: "Scanned competitor HTML directly", pct: 88 },
  { label: "Competitor social profiles", level: "high", method: "Discovered via competitor website links", pct: 85 },
  { label: "Competitor services list", level: "high", method: "Extracted from competitor website content", pct: 82 },
  { label: "Competitor strengths/weaknesses", level: "estimated", method: "AI analysis of website content and social signals", pct: 73 },
  { label: "Estimated monthly traffic", level: "approximate", method: "Industry benchmark model — use SimilarWeb for precision", pct: 50 },
  { label: "Competitor follower counts", level: "approximate", method: "Estimated from engagement signals — APIs blocked", pct: 48 },
  { label: "Business improvement opportunities", level: "high", method: "AI comparison of your presence vs competitors", pct: 83 },
  { label: "Industry benchmark scores", level: "estimated", method: "Modelled from industry averages and competitor data", pct: 68 },
];

/**
 * Standard confidence items for digital presence / social scan.
 */
export const SOCIAL_SCAN_CONFIDENCE_ITEMS: ConfidenceItem[] = [
  { label: "Social profile discovery", level: "verified", method: "Direct links found in website HTML", pct: 95 },
  { label: "Platform presence detection", level: "verified", method: "Binary check — profile exists or does not", pct: 97 },
  { label: "Bio / description content", level: "high", method: "Read from publicly accessible profile page", pct: 85 },
  { label: "Brand name consistency", level: "high", method: "Compared handles and names across platforms", pct: 88 },
  { label: "Posting cadence", level: "high", method: "Checked last post date from public profile", pct: 84 },
  { label: "Follower counts", level: "approximate", method: "Social platforms block scraping — estimated from signals", pct: 50 },
  { label: "Engagement rate", level: "approximate", method: "Requires authenticated API — estimated from public signals", pct: 48 },
  { label: "AI Visibility Score", level: "estimated", method: "Tested brand name in AI search patterns", pct: 70 },
  { label: "Platform health scores", level: "estimated", method: "AI scoring based on profile completeness and activity signals", pct: 72 },
  { label: "30-day action plan", level: "high", method: "AI recommendations based on verified gap analysis", pct: 82 },
];

export const CONFIDENCE_METHODOLOGY = `Blastly uses a four-tier confidence system for every data point in your report:

• Verified (95–99%) — Data read directly from a live source, such as links found in your website HTML or meta tags. Highly reliable.

• High Confidence (80–90%) — Strong inference from multiple corroborating signals, such as AI cross-referencing your industry, services, and competitor websites.

• Estimated (65–75%) — Modelled from partial signals. Directionally accurate but may not reflect exact figures. Useful for strategic decisions.

• Approximate (45–60%) — Based on industry benchmarks or models. Individual results may vary. For precise figures, we recommend specialist tools like Ahrefs (backlinks), SimilarWeb (traffic), or native platform analytics (engagement).

We display these confidence levels transparently so you can make informed decisions about which insights to act on immediately and which to validate further.`;
