import type { WebsiteAuditData } from "./auditTypes";
import { faviconUrlForHost, hostnameFromWebsite, overallWebsiteScore } from "./auditUtils";

export type SuggestedPost = {
  id: string;
  platform: string;
  title: string;
  preview: string;
  scheduled: string;
  status: "ready" | "draft" | "suggested";
};

export type DashboardNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  type: "success" | "info" | "action";
};

export type DashboardAuditSnapshot = {
  auditShareToken: string;
  savedReportId: string | null;
  businessName: string;
  website: string;
  faviconUrl: string;
  industry: string;
  aiSummary: string;
  brandTone: string;
  services: string[];
  products: string[];
  recommendedPlatforms: string[];
  targetAudience: string;
  contactEmail: string;
  overallScore: number;
  brandingScore: number;
  seoScore: number;
  trustScore: number;
  contentScore: number;
  performanceScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  socialLinks: { platform: string; url: string | null; detected: boolean }[];
  suggestedPosts: SuggestedPost[];
  notifications: DashboardNotification[];
};

type AuditReportLike = {
  id?: string;
  shareToken: string;
  businessName: string;
  industry?: string | null;
  website?: string | null;
  description?: string | null;
  overallScore?: number | null;
  contentScore?: number | null;
  recommendedPlatforms?: string[] | null;
  targetAudience?: Record<string, unknown> | null;
  rawReport: Record<string, unknown>;
};

const PLATFORM_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  twitter: "Twitter / X",
  tiktok: "TikTok",
  youtube: "YouTube",
  gmb: "Google Business",
  pinterest: "Pinterest",
};

function waFromReport(report: AuditReportLike): WebsiteAuditData | undefined {
  return report.rawReport?.websiteAudit as WebsiteAuditData | undefined;
}

function checksByStatus(wa: WebsiteAuditData | undefined, status: "pass" | "fail" | "warn"): string[] {
  if (!wa) return [];
  const out: string[] = [];
  for (const section of Object.values(wa.sections)) {
    for (const c of section.checks) {
      if (c.status === status) out.push(`${c.label}: ${c.detail}`);
    }
  }
  return out.slice(0, 4);
}

function normalizePlatforms(raw: AuditReportLike, wa: WebsiteAuditData | undefined): string[] {
  const fromReport = raw.recommendedPlatforms ?? (raw.rawReport.recommendedPlatforms as string[] | undefined);
  if (fromReport?.length) return fromReport;
  const social = wa?.socialLinks.filter((s) => s.detected).map((s) => s.platform.toLowerCase()) ?? [];
  if (social.length) return social;
  const handles = raw.rawReport.detectedHandles as Record<string, string> | undefined;
  if (handles) return Object.keys(handles);
  return ["instagram", "facebook", "linkedin"];
}

function audienceLabel(raw: AuditReportLike): string {
  const ta = raw.targetAudience ?? (raw.rawReport.targetAudience as Record<string, unknown> | undefined);
  if (ta?.rationale && typeof ta.rationale === "string") return ta.rationale;
  const interests = ta?.interests;
  if (Array.isArray(interests) && interests.length) return interests.join(", ");
  return "Customers researching your services online";
}

const SCHEDULE_LABELS = ["Tomorrow · 9:00 AM", "Thu · 12:30 PM", "Fri · 8:00 AM"];
const POST_STATUS: SuggestedPost["status"][] = ["ready", "draft", "suggested"];

function ruleBasedSuggestedPosts(
  businessName: string,
  industry: string,
  services: string[],
  platforms: string[]
): SuggestedPost[] {
  const serviceHint = services[0] ?? industry;
  const platformNames = platforms.slice(0, 3).map((p) => PLATFORM_LABELS[p] ?? p);
  const templates = [
    {
      title: "Introduce your brand",
      preview: `${businessName} — share what makes your ${serviceHint.toLowerCase()} offering stand out.`,
    },
    {
      title: "Customer value post",
      preview: `Highlight a real benefit of working with ${businessName}. Keep it authentic to your website messaging.`,
    },
    {
      title: "Expert insight",
      preview: `Position ${businessName} as a trusted voice in ${industry.toLowerCase()} with a practical tip.`,
    },
  ];
  return templates.map((t, i) => ({
    id: `post-${i + 1}`,
    platform: platformNames[i] ?? "Instagram",
    title: t.title,
    preview: t.preview,
    scheduled: SCHEDULE_LABELS[i] ?? "Next week",
    status: POST_STATUS[i] ?? "suggested",
  }));
}

function mapSuggestedPosts(
  raw: AuditReportLike,
  businessName: string,
  industry: string,
  services: string[],
  platforms: string[]
): SuggestedPost[] {
  const fromPipeline = raw.rawReport.suggestedPosts as
    | Array<{ platform?: string; title?: string; caption?: string; preview?: string }>
    | undefined;
  if (fromPipeline?.length) {
    return fromPipeline.slice(0, 3).map((p, i) => ({
      id: `post-${i + 1}`,
      platform: p.platform ?? PLATFORM_LABELS[platforms[i]] ?? platforms[i] ?? "Instagram",
      title: p.title ?? "Suggested post",
      preview: p.caption ?? p.preview ?? "",
      scheduled: SCHEDULE_LABELS[i] ?? "Next week",
      status: POST_STATUS[i] ?? "suggested",
    }));
  }
  return ruleBasedSuggestedPosts(businessName, industry, services, platforms);
}

export function buildNotificationsFromAudit(
  businessName: string,
  snapshot: Pick<DashboardAuditSnapshot, "weaknesses" | "suggestedPosts" | "overallScore">
): DashboardNotification[] {
  const items: DashboardNotification[] = [
    {
      id: "n-audit",
      title: "Your audit completed",
      body: `${businessName} website analyzed — overall score ${snapshot.overallScore}/100.`,
      time: "Just now",
      type: "success",
    },
    {
      id: "n-posts",
      title: `${snapshot.suggestedPosts.length} social posts generated`,
      body: "AI drafted starter posts from your website content — review and schedule anytime.",
      time: "1 min ago",
      type: "info",
    },
  ];
  if (snapshot.weaknesses.length > 0) {
    items.push({
      id: "n-optimize",
      title: "Website optimization opportunities detected",
      body: snapshot.weaknesses[0],
      time: "2 min ago",
      type: "action",
    });
  }
  return items;
}

/** Build a dashboard-ready snapshot from a saved audit report row. */
export function dashboardSnapshotFromAuditReport(report: AuditReportLike): DashboardAuditSnapshot {
  const wa = waFromReport(report);
  const website = wa?.websiteUrl ?? report.website ?? "";
  const host = website ? hostnameFromWebsite(website) : "";
  const businessName = report.businessName || wa?.pageTitle || host || "Your Business";
  const industry = report.industry ?? (report.rawReport.industry as string) ?? "Other";
  const services = wa?.services?.length ? wa.services : ((report.rawReport.services as string[]) ?? []);
  const products = wa?.products?.length ? wa.products : ((report.rawReport.products as string[]) ?? []);
  const platforms = normalizePlatforms(report, wa);
  const overall = report.overallScore ?? (wa ? overallWebsiteScore(wa) : 0);
  const aiSummary =
    wa?.scoreSummary ??
    report.description ??
    (report.rawReport.summary as string) ??
    (report.rawReport.businessDescription as string) ??
    `${businessName} website audit complete.`;

  const brandingScore = wa?.sections.branding.score ?? 0;
  const seoScore = wa?.sections.seo.score ?? 0;
  const trustScore = wa?.sections.socialTrust.score ?? 0;
  const contentScore = wa?.sections.content.score ?? report.contentScore ?? 0;
  const performanceScore = wa?.sections.performance.score ?? 0;

  const strengths = checksByStatus(wa, "pass");
  const weaknesses = [...checksByStatus(wa, "fail"), ...checksByStatus(wa, "warn")].slice(0, 4);
  const recommendations =
    (wa?.aiInsights?.length ? wa.aiInsights : (report.rawReport.findings as { detail?: string }[] | undefined)?.map((f) => f.detail ?? ""))?.filter(Boolean).slice(0, 5) ?? [];

  const email =
    wa?.footerInfo.email ??
    (report.rawReport.email as string) ??
    (report.rawReport.contactEmail as string) ??
    "";

  const suggestedPosts = mapSuggestedPosts(report, businessName, industry, services, platforms);

  const snapshot: DashboardAuditSnapshot = {
    auditShareToken: report.shareToken,
    savedReportId: report.id ?? null,
    businessName,
    website,
    faviconUrl: wa?.faviconUrl ?? (host ? faviconUrlForHost(host) : ""),
    industry,
    aiSummary,
    brandTone: (report.rawReport.brandTone as string) ?? "Professional",
    services: services.length ? services : products.length ? products : ["Services from your website"],
    products,
    recommendedPlatforms: platforms,
    targetAudience: audienceLabel(report),
    contactEmail: email,
    overallScore: overall,
    brandingScore,
    seoScore,
    trustScore,
    contentScore,
    performanceScore,
    strengths,
    weaknesses,
    recommendations,
    socialLinks: wa?.socialLinks ?? [],
    suggestedPosts,
    notifications: [],
  };

  snapshot.notifications = buildNotificationsFromAudit(businessName, snapshot);
  return snapshot;
}

export { PLATFORM_LABELS };
