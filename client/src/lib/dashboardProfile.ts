/** Persist personalized dashboard state from audit + onboarding. */
import type { AuditReportRow } from "./auditApi";
import {
  dashboardSnapshotFromAuditReport,
  type DashboardAuditSnapshot,
  type DashboardNotification,
  type SuggestedPost,
} from "@shared/dashboardFromAudit";

const PROFILE_KEY = "blastly_dashboard_profile";

export type DashboardProfile = DashboardAuditSnapshot & {
  onboardingComplete: boolean;
  completedAt: string;
};

export function saveDashboardProfile(
  profile: Partial<DashboardAuditSnapshot> & {
    businessName: string;
    website: string;
    industry: string;
    aiSummary: string;
    onboardingComplete?: boolean;
  }
): void {
  if (typeof window === "undefined") return;
  const existing = loadDashboardProfile();
  const payload: DashboardProfile = {
    ...(existing ?? emptySnapshot(profile.businessName)),
    ...profile,
    services: profile.services ?? existing?.services ?? [],
    products: profile.products ?? existing?.products ?? [],
    recommendedPlatforms: profile.recommendedPlatforms ?? existing?.recommendedPlatforms ?? [],
    strengths: profile.strengths ?? existing?.strengths ?? [],
    weaknesses: profile.weaknesses ?? existing?.weaknesses ?? [],
    recommendations: profile.recommendations ?? existing?.recommendations ?? [],
    socialLinks: profile.socialLinks ?? existing?.socialLinks ?? [],
    suggestedPosts: profile.suggestedPosts ?? existing?.suggestedPosts ?? [],
    notifications: profile.notifications ?? existing?.notifications ?? [],
    onboardingComplete: profile.onboardingComplete ?? existing?.onboardingComplete ?? true,
    completedAt: new Date().toISOString(),
    auditShareToken: profile.auditShareToken ?? existing?.auditShareToken ?? "",
    savedReportId: profile.savedReportId ?? existing?.savedReportId ?? null,
    faviconUrl: profile.faviconUrl ?? existing?.faviconUrl ?? "",
    brandTone: profile.brandTone ?? existing?.brandTone ?? "Professional",
    targetAudience: profile.targetAudience ?? existing?.targetAudience ?? "",
    contactEmail: profile.contactEmail ?? existing?.contactEmail ?? "",
    overallScore: profile.overallScore ?? existing?.overallScore ?? 0,
    brandingScore: profile.brandingScore ?? existing?.brandingScore ?? 0,
    seoScore: profile.seoScore ?? existing?.seoScore ?? 0,
    trustScore: profile.trustScore ?? existing?.trustScore ?? 0,
    contentScore: profile.contentScore ?? existing?.contentScore ?? 0,
    performanceScore: profile.performanceScore ?? existing?.performanceScore ?? 0,
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(payload));
}

/** Sync dashboard from a saved audit report (called after audit run or onboarding). */
export function syncDashboardFromAuditReport(
  report: AuditReportRow | Record<string, unknown>,
  options?: { onboardingComplete?: boolean; merge?: Partial<DashboardProfile> }
): DashboardProfile {
  const normalized =
    typeof report === "object" && report && "rawReport" in report
      ? {
        ...report,
        id: String((report as AuditReportRow).id ?? ""),
        shareToken: String((report as AuditReportRow).shareToken ?? ""),
      }
      : report;
  const snapshot = dashboardSnapshotFromAuditReport(normalized as Parameters<typeof dashboardSnapshotFromAuditReport>[0]);
  const payload: DashboardProfile = {
    ...snapshot,
    ...options?.merge,
    onboardingComplete: options?.onboardingComplete ?? loadDashboardProfile()?.onboardingComplete ?? false,
    completedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(payload));
  }
  return payload;
}

export function loadDashboardProfile(): DashboardProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DashboardProfile;
  } catch {
    return null;
  }
}

function emptySnapshot(businessName: string): DashboardAuditSnapshot {
  return {
    auditShareToken: "",
    savedReportId: null,
    businessName,
    website: "",
    faviconUrl: "",
    industry: "Other",
    aiSummary: "",
    brandTone: "Professional",
    services: [],
    products: [],
    recommendedPlatforms: [],
    targetAudience: "",
    contactEmail: "",
    overallScore: 0,
    brandingScore: 0,
    seoScore: 0,
    trustScore: 0,
    contentScore: 0,
    performanceScore: 0,
    strengths: [],
    weaknesses: [],
    recommendations: [],
    socialLinks: [],
    suggestedPosts: [],
    notifications: [],
  };
}

/** @deprecated Use audit-derived data via syncDashboardFromAuditReport */
export function buildDemoPosts(businessName: string, industry: string): SuggestedPost[] {
  return dashboardSnapshotFromAuditReport({
    shareToken: "demo",
    businessName,
    industry,
    rawReport: { services: [industry] },
  }).suggestedPosts;
}

/** @deprecated Use audit-derived notifications */
export function buildDemoNotifications(businessName: string): DashboardNotification[] {
  return dashboardSnapshotFromAuditReport({
    shareToken: "demo",
    businessName,
    rawReport: {},
  }).notifications;
}

export type { SuggestedPost, DashboardNotification, DashboardAuditSnapshot };
