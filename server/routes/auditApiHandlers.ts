import { runAuditPipeline } from "../audit/auditProvider";
import { cacheAuditReport, getCachedAuditReport } from "../audit/reportCache";
import { getSupabaseAuditStatus } from "../lib/supabaseAuditClient";
import {
  attachAuditToUser,
  getAuditByShareToken,
  getLatestAuditForUser,
  listAuditsForUserOrWorkspace,
  resolveAuditWorkspaceId,
  saveAuditToSupabase,
  toClientAuditRow,
} from "../audit/supabaseStore";
import { isSupabaseAuditConfigured } from "../lib/supabaseAuditClient";
import type { AuditAuthContext } from "../lib/auditAuthRequest";
import { ensurePublicUser } from "../users/publicUserStore";
import type { RunAuditInput } from "../audit/types";
import { normalizeWebsiteUrl, hostnameFromWebsite } from "../../shared/auditUtils";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toUuidOrNull(value: unknown): string | null {
  if (value == null || value === "") return null;
  const s = String(value).trim();
  return UUID_RE.test(s) ? s : null;
}

export type AuditRunResponse = {
  success: true;
  shareToken: string;
  savedReportId: string;
  businessName: string;
  overallScore: number;
  report: ReturnType<typeof toClientAuditRow>;
  [key: string]: unknown;
};

function persistPayloadToRow(
  p: import("../audit/persist").AuditPersistPayload,
  savedReportId: string
) {
  return toClientAuditRow({
    id: savedReportId,
    shareToken: p.shareToken,
    workspaceId: p.workspaceId,
    userId: p.userId,
    createdBy: p.createdBy,
    businessName: p.businessName,
    industry: p.industry,
    website: p.website,
    handles: p.handles,
    description: p.description,
    detectedHandles: p.detectedHandles,
    geographicReach: p.geographicReach,
    adSpend: p.adSpend,
    overallScore: p.overallScore,
    platformScores: p.platformScores,
    contentScore: p.contentScore,
    adQualityScore: p.adQualityScore,
    engagementScore: p.engagementScore,
    growthScore: p.growthScore,
    cyberSecurityScore: p.cyberSecurityScore,
    findings: p.findings,
    recommendations: p.recommendations,
    blastlyPitch: p.blastlyPitch,
    rawReport: p.rawReport,
    createdAt: new Date().toISOString(),
    recommendedPlatforms: (p.rawReport.recommendedPlatforms as string[] | null) ?? null,
    targetAudience: (p.rawReport.targetAudience as Record<string, unknown> | null) ?? null,
  });
}

function normalizeRunAuditInput(body: RunAuditInput): RunAuditInput {
  const rawWebsite = (body.website ?? body.businessName ?? "").trim();
  if (!rawWebsite) {
    throw new Error('Website URL is required. Send { "website": "example.com" }.');
  }

  let website: string;
  try {
    website = normalizeWebsiteUrl(rawWebsite);
  } catch {
    throw new Error(`Invalid website URL: ${rawWebsite}`);
  }

  if (!/^https?:\/\/.+\..+/.test(website) && !/^https?:\/\/localhost/i.test(website)) {
    throw new Error(`Invalid website URL: ${rawWebsite}`);
  }

  const host = hostnameFromWebsite(website);
  return {
    ...body,
    website,
    businessName: (body.businessName ?? host).trim() || host,
  };
}

function getUserIdFromBody(body: RunAuditInput): string | null {
  return toUuidOrNull(body.userId);
}

export async function handleAuditRun(
  body: RunAuditInput,
  auth: AuditAuthContext = { userId: null }
): Promise<AuditRunResponse> {
  const userId = auth.userId ?? getUserIdFromBody(body);
  if (userId) {
    await ensurePublicUser({ id: userId });
  }
  const workspaceId = await resolveAuditWorkspaceId(
    userId,
    userId ? toUuidOrNull(body.workspaceId) : null,
    {
      businessName: body.businessName ?? null,
      website: body.website ?? null,
    }
  );

  console.info("[audit/run] Incoming payload:", {
    website: body.website,
    businessName: body.businessName,
    workspaceId,
    userId: userId ?? null,
  });

  const input = normalizeRunAuditInput({
    ...body,
    userId,
    workspaceId,
  });
  const supabaseStatus = getSupabaseAuditStatus();
  console.info("[audit/run] Supabase status:", supabaseStatus);

  if (!isSupabaseAuditConfigured()) {
    throw new Error(
      "Supabase audit storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY " +
        "(or SUPABASE_ANON_KEY) in .env, then run supabase/migrations/RUN_AUDIT_MIGRATIONS_ONLY.sql."
    );
  }

  const result = await runAuditPipeline(input);
  console.info("[audit/run] Report generated:", {
    shareToken: result.shareToken,
    businessName: result.businessName,
    overallScore: result.overallScore,
  });

  const businessNameFallback =
    result.businessName || hostnameFromWebsite(input.website ?? "") || "Unknown business";

  const saveResult = await saveAuditToSupabase(result.persistPayload, businessNameFallback);

  const saved = await getAuditByShareToken(saveResult.shareToken);
  if (!saved) {
    throw new Error(
      `Audit saved (id=${saveResult.id}) but could not be read back from Supabase. Check RLS policies.`
    );
  }

  const row = persistPayloadToRow(result.persistPayload, saveResult.id);
  cacheAuditReport(saveResult.shareToken, row as Record<string, unknown>);

  const { persistPayload: _p, shareToken: _st, ...rest } = result;

  return {
    success: true,
    shareToken: saveResult.shareToken,
    savedReportId: saveResult.id,
    ...rest,
    report: toClientAuditRow(saved),
  };
}

export async function handleAuditGetReport(shareToken: string) {
  if (!shareToken?.trim()) {
    throw new Error("shareToken is required");
  }

  if (isSupabaseAuditConfigured()) {
    try {
      const row = await getAuditByShareToken(shareToken);
      if (row) return toClientAuditRow(row);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[audit/report] Supabase fetch failed:", msg);
      throw e;
    }
  }

  const cached = getCachedAuditReport(shareToken);
  if (cached) return cached;

  throw new Error("Report not found");
}

export async function handleAuditList(workspaceId: string | undefined, auth: AuditAuthContext) {
  if (!auth.userId) {
    throw new Error("Authentication required");
  }
  await ensurePublicUser({ id: auth.userId });
  if (!isSupabaseAuditConfigured()) {
    throw new Error("Audit API not configured");
  }
  const id = workspaceId ? toUuidOrNull(workspaceId) : null;
  const rows = await listAuditsForUserOrWorkspace(auth.userId, id);
  return rows.map(toClientAuditRow);
}

export async function handleAuditLatest(
  workspaceId: string | null,
  auth: AuditAuthContext
) {
  if (!auth.userId) {
    throw new Error("Authentication required");
  }
  await ensurePublicUser({ id: auth.userId });
  if (!isSupabaseAuditConfigured()) {
    throw new Error("Audit API not configured");
  }
  const wsId = workspaceId ? toUuidOrNull(workspaceId) : null;
  const row = await getLatestAuditForUser(auth.userId, wsId);
  if (!row) return null;
  return toClientAuditRow(row);
}

export async function handleAuditAttach(
  body: { shareToken?: string; workspaceId?: string | null },
  auth: AuditAuthContext
) {
  if (!auth.userId) {
    throw new Error("Authentication required");
  }
  await ensurePublicUser({ id: auth.userId });
  const shareToken = body.shareToken?.trim();
  if (!shareToken) {
    throw new Error("shareToken is required");
  }
  const workspaceId = body.workspaceId ? toUuidOrNull(body.workspaceId) : null;
  const resolvedWorkspaceId = await resolveAuditWorkspaceId(auth.userId, workspaceId);
  const row = await attachAuditToUser(shareToken, auth.userId, resolvedWorkspaceId);
  return toClientAuditRow(row);
}
