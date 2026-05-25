import { getSupabaseForAudit, getSupabaseAuditStatus } from "../lib/supabaseAuditClient";
import { probeSupabasePublicSchema } from "../lib/supabaseSchemaProbe";
import {
  getOrCreateDefaultWorkspace,
  verifyWorkspaceOwner as verifyWsOwner,
} from "../workspaces/supabaseWorkspaceStore";
import type { AuditPersistPayload } from "./persist";
import { sanitizeAuditPersistPayload } from "./sanitizePayload";
import { isAuditSchemaError } from "./schemaErrors";
import type { StoredAuditReport } from "./types";

export type AuditSaveResult = {
  saved: true;
  id: string;
  shareToken: string;
};

function formatSupabaseError(error: {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}): string {
  const parts = [error.message];
  if (error.code) parts.push(`code=${error.code}`);
  if (error.details) parts.push(`details=${error.details}`);
  if (error.hint) parts.push(`hint=${error.hint}`);
  return parts.join(" | ");
}

function schemaMissingMessage(): string {
  return (
    "Supabase table public.audit_reports not found. " +
    "Open Supabase Dashboard → SQL Editor → run supabase/migrations/SETUP_AUDIT_STANDALONE.sql " +
    "(copy entire file, click Run), then retry."
  );
}

function mapRow(row: Record<string, unknown>): StoredAuditReport {
  const raw = (row.raw_report as Record<string, unknown>) ?? {};
  return {
    id: String(row.id),
    shareToken: String(row.share_token),
    workspaceId: (row.workspace_id as string) ?? null,
    userId: (row.user_id as string) ?? null,
    createdBy: (row.created_by as string) ?? null,
    businessName: String(row.business_name),
    industry: (row.industry as string) ?? null,
    website: (row.website as string) ?? null,
    handles: row.handles ?? null,
    description: (row.description as string) ?? null,
    detectedHandles: row.detected_handles ?? null,
    geographicReach: (row.geographic_reach as string) ?? null,
    adSpend: (row.ad_spend as number) ?? null,
    overallScore: (row.overall_score as number) ?? null,
    platformScores: row.platform_scores ?? null,
    contentScore: (row.content_score as number) ?? null,
    adQualityScore: (row.ad_quality_score as number) ?? null,
    engagementScore: (row.engagement_score as number) ?? null,
    growthScore: (row.growth_score as number) ?? null,
    cyberSecurityScore: (row.cyber_security_score as number) ?? null,
    findings: row.findings ?? null,
    recommendations: row.recommendations ?? null,
    blastlyPitch: row.blastly_pitch ?? null,
    rawReport: raw,
    createdAt: String(row.created_at),
    recommendedPlatforms: (raw.recommendedPlatforms as string[] | null) ?? null,
    targetAudience: (raw.targetAudience as Record<string, unknown> | null) ?? null,
  };
}

async function insertOnce(
  row: Record<string, unknown>
): Promise<{ id: string; share_token: string }> {
  const shareToken = String(row.share_token ?? "").trim();
  if (!shareToken || shareToken.length < 8) {
    throw new Error("share_token is required and must be at least 8 characters");
  }

  const supabase = getSupabaseForAudit();
  const { data, error } = await supabase
    .from("audit_reports")
    .insert(row)
    .select("id, share_token")
    .single();

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
  if (!data?.id) {
    throw new Error("Supabase insert succeeded but no row id was returned");
  }
  return data as { id: string; share_token: string };
}

function isShareTokenConflict(message: string): boolean {
  return /23505|duplicate key|unique.*share_token/i.test(message);
}

async function insertWithShareTokenRetry(
  row: Record<string, unknown>
): Promise<{ id: string; share_token: string }> {
  try {
    return await insertOnce(row);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!isShareTokenConflict(msg)) throw err;

    const { nanoid } = await import("nanoid");
    const retried = { ...row, share_token: `audit-${nanoid(12)}` };
    console.warn("[audit/save] share_token conflict — retrying with new token");
    return insertOnce(retried);
  }
}

/** Verify workspace ownership when public.workspaces exists; otherwise user-only mode. */
export async function verifyWorkspaceOwner(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  return verifyWsOwner(userId, workspaceId);
}

/** Resolve workspace_id for saves — auto-creates default workspace when absent. */
export async function resolveAuditWorkspaceId(
  userId: string | null,
  workspaceId: string | null,
  hints?: { businessName?: string | null; website?: string | null }
): Promise<string | null> {
  if (!userId) return null;
  const schema = await probeSupabasePublicSchema();
  if (!schema.hasWorkspaces) return null;

  if (workspaceId) {
    const ok = await verifyWorkspaceOwner(userId, workspaceId);
    if (ok) return workspaceId;
  }

  const ws = await getOrCreateDefaultWorkspace(userId, {
    businessName: hints?.businessName,
    website: hints?.website,
  });
  return ws.id;
}

/** Persist audit report to Supabase. Retries once on transient failures. */
export async function saveAuditToSupabase(
  payload: AuditPersistPayload,
  businessNameFallback: string
): Promise<AuditSaveResult> {
  const status = getSupabaseAuditStatus();
  console.info("[audit/save] Supabase config:", {
    url: status.url ? `${status.url.slice(0, 30)}…` : null,
    keyType: status.keyType,
    configured: status.configured,
  });

  const row = sanitizeAuditPersistPayload(payload, businessNameFallback);
  const schema = await probeSupabasePublicSchema();
  if (!schema.hasWorkspaces) {
    row.workspace_id = null;
  }
  console.info("[audit/save] Insert payload:", {
    share_token: row.share_token,
    business_name: row.business_name,
    website: row.website,
    overall_score: row.overall_score,
    workspace_id: row.workspace_id,
  });

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const inserted = await insertWithShareTokenRetry(row);
      console.info("[audit/save] Insert success:", {
        id: inserted.id,
        shareToken: inserted.share_token,
        attempt,
      });
      return {
        saved: true,
        id: String(inserted.id),
        shareToken: String(inserted.share_token),
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message;
      console.error(`[audit/save] Insert failed (attempt ${attempt}/2):`, msg);

      if (isAuditSchemaError(msg)) {
        throw new Error(schemaMissingMessage());
      }

      const transient = /timeout|ECONNRESET|ETIMEDOUT|502|503|504|fetch failed/i.test(msg);
      if (!transient || attempt === 2) {
        throw new Error(`Failed to save audit report to Supabase: ${msg}`);
      }
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  throw lastError ?? new Error("Failed to save audit report to Supabase");
}

export async function getAuditByShareToken(shareToken: string): Promise<StoredAuditReport | null> {
  const supabase = getSupabaseForAudit();
  const { data, error } = await supabase
    .from("audit_reports")
    .select("*")
    .eq("share_token", shareToken)
    .maybeSingle();

  if (error) {
    if (isAuditSchemaError(error.message)) {
      throw new Error(schemaMissingMessage());
    }
    throw new Error(formatSupabaseError(error));
  }
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function listAuditsForWorkspace(workspaceId: string): Promise<StoredAuditReport[]> {
  const supabase = getSupabaseForAudit();
  const { data, error } = await supabase
    .from("audit_reports")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (isAuditSchemaError(error.message)) {
      throw new Error(schemaMissingMessage());
    }
    throw new Error(formatSupabaseError(error));
  }
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

/** List all audits owned by a user (user-based ownership mode). */
export async function listAuditsForUser(userId: string): Promise<StoredAuditReport[]> {
  const supabase = getSupabaseForAudit();
  const { data, error } = await supabase
    .from("audit_reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (isAuditSchemaError(error.message)) {
      throw new Error(schemaMissingMessage());
    }
    throw new Error(formatSupabaseError(error));
  }
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

/** List audits — workspace-scoped when workspaces exist, otherwise user-scoped. */
export async function listAuditsForUserOrWorkspace(
  userId: string,
  workspaceId?: string | null
): Promise<StoredAuditReport[]> {
  const schema = await probeSupabasePublicSchema();
  if (!schema.hasWorkspaces || !workspaceId) {
    return listAuditsForUser(userId);
  }
  return listAuditsForWorkspaceOwned(workspaceId, userId);
}

/** List audits for a workspace — only rows owned by the authenticated user. */
export async function listAuditsForWorkspaceOwned(
  workspaceId: string,
  userId: string
): Promise<StoredAuditReport[]> {
  const owned = await verifyWorkspaceOwner(userId, workspaceId);
  if (!owned) {
    throw new Error("Workspace not found");
  }

  const supabase = getSupabaseForAudit();
  const { data, error } = await supabase
    .from("audit_reports")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (isAuditSchemaError(error.message)) {
      throw new Error(schemaMissingMessage());
    }
    throw new Error(formatSupabaseError(error));
  }
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

/** Latest audit for authenticated user, optionally scoped to workspace. */
export async function getLatestAuditForUser(
  userId: string,
  workspaceId?: string | null
): Promise<StoredAuditReport | null> {
  const supabase = getSupabaseForAudit();
  const schema = await probeSupabasePublicSchema();

  if (schema.hasWorkspaces && workspaceId) {
    const owned = await verifyWorkspaceOwner(userId, workspaceId);
    if (!owned) {
      throw new Error("Workspace not found");
    }

    const { data: scoped, error: scopedError } = await supabase
      .from("audit_reports")
      .select("*")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (scopedError) {
      if (isAuditSchemaError(scopedError.message)) {
        throw new Error(schemaMissingMessage());
      }
      throw new Error(formatSupabaseError(scopedError));
    }
    if (scoped) return mapRow(scoped as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from("audit_reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isAuditSchemaError(error.message)) {
      throw new Error(schemaMissingMessage());
    }
    throw new Error(formatSupabaseError(error));
  }
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

/** Attach a guest audit (user_id null) to the authenticated account. */
export async function attachAuditToUser(
  shareToken: string,
  userId: string,
  workspaceId: string | null
): Promise<StoredAuditReport> {
  const existing = await getAuditByShareToken(shareToken);
  if (!existing) {
    throw new Error("Report not found");
  }
  if (existing.userId && existing.userId !== userId) {
    throw new Error("This audit is already linked to another account");
  }

  let resolvedWorkspaceId = workspaceId;
  const schema = await probeSupabasePublicSchema();
  if (!schema.hasWorkspaces) {
    resolvedWorkspaceId = null;
  } else {
    resolvedWorkspaceId = await resolveAuditWorkspaceId(userId, resolvedWorkspaceId, {
      businessName: existing.businessName,
      website: existing.website,
    });
  }

  const supabase = getSupabaseForAudit();
  const { data, error } = await supabase
    .from("audit_reports")
    .update({
      user_id: userId,
      created_by: userId,
      workspace_id: resolvedWorkspaceId,
    })
    .eq("share_token", shareToken)
    .select("*")
    .single();

  if (error) {
    if (isAuditSchemaError(error.message)) {
      throw new Error(schemaMissingMessage());
    }
    throw new Error(formatSupabaseError(error));
  }
  return mapRow(data as Record<string, unknown>);
}

/** Shape expected by existing React audit pages (camelCase + legacy fields). */
export function toClientAuditRow(row: StoredAuditReport) {
  return {
    id: row.id,
    shareToken: row.shareToken,
    workspaceId: row.workspaceId,
    userId: row.userId,
    createdBy: row.createdBy,
    businessName: row.businessName,
    industry: row.industry,
    website: row.website,
    handles: row.handles,
    description: row.description,
    detectedHandles: row.detectedHandles,
    geographicReach: row.geographicReach,
    adSpend: row.adSpend,
    overallScore: row.overallScore,
    platformScores: row.platformScores,
    contentScore: row.contentScore,
    adQualityScore: row.adQualityScore,
    engagementScore: row.engagementScore,
    growthScore: row.growthScore,
    cyberSecurityScore: row.cyberSecurityScore,
    findings: row.findings,
    recommendations: row.recommendations,
    blastlyPitch: row.blastlyPitch,
    rawReport: row.rawReport,
    createdAt: row.createdAt,
    recommendedPlatforms: row.recommendedPlatforms,
    targetAudience: row.targetAudience,
  };
}
