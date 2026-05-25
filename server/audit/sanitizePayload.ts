import type { AuditPersistPayload } from "./persist";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function toJson(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === "object" && !Array.isArray(value) && Object.keys(value as object).length === 0) {
    return null;
  }
  return value;
}

function toUuidOrNull(value: unknown): string | null {
  if (value == null || value === "") return null;
  const s = String(value).trim();
  return UUID_RE.test(s) ? s : null;
}

function toText(value: unknown, fallback: string): string {
  const s = value == null ? "" : String(value).trim();
  return s.length > 0 ? s : fallback;
}

/** Map persist payload → Supabase row with safe types for Postgres columns. */
export function sanitizeAuditPersistPayload(
  payload: AuditPersistPayload,
  businessNameFallback: string
): Record<string, unknown> {
  return {
    share_token: toText(payload.shareToken, ""),
    workspace_id: toUuidOrNull(payload.workspaceId),
    user_id: toUuidOrNull(payload.userId),
    created_by: toUuidOrNull(payload.createdBy ?? payload.userId),
    business_name: toText(payload.businessName, businessNameFallback),
    industry: payload.industry ?? null,
    website: payload.website ?? null,
    handles: toJson(payload.handles),
    description: payload.description ?? null,
    detected_handles: toJson(payload.detectedHandles),
    geographic_reach: payload.geographicReach ?? null,
    ad_spend: toInt(payload.adSpend),
    overall_score: toInt(payload.overallScore),
    platform_scores: toJson(payload.platformScores) ?? {},
    content_score: toInt(payload.contentScore),
    ad_quality_score: toInt(payload.adQualityScore),
    engagement_score: toInt(payload.engagementScore),
    growth_score: toInt(payload.growthScore),
    cyber_security_score: toInt(payload.cyberSecurityScore),
    findings: toJson(payload.findings) ?? [],
    recommendations: toJson(payload.recommendations) ?? [],
    blastly_pitch: toJson(payload.blastlyPitch),
    raw_report: payload.rawReport ?? {},
  };
}
