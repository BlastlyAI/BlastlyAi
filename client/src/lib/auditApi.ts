import { apiUrl, getApiOrigin } from "@/lib/apiOrigin";
import { saveAuditReportCache, loadAuditReportCache } from "@/lib/auditReportCache";
import { saveLastAuditToken } from "@/lib/auditSession";
import { syncDashboardFromAuditReport } from "@/lib/dashboardProfile";
import { supabaseGetSession } from "@/lib/supabaseAuth";

export type RunAuditInput = {
  businessName: string;
  industry?: string;
  website?: string;
  handles?: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };
  adSpend?: number;
  workspaceId?: string | null;
};

export type RunAuditResult = {
  success?: boolean;
  shareToken: string;
  savedReportId?: string;
  businessName: string;
  overallScore: number;
  report?: AuditReportRow;
  [key: string]: unknown;
};

export type AuditReportRow = {
  id: string;
  shareToken: string;
  workspaceId?: string | null;
  userId?: string | null;
  createdBy?: string | null;
  businessName: string;
  industry: string | null;
  website: string | null;
  handles: unknown;
  description: string | null;
  detectedHandles: unknown;
  geographicReach: string | null;
  overallScore: number | null;
  platformScores: unknown;
  contentScore: number | null;
  adQualityScore: number | null;
  engagementScore: number | null;
  growthScore: number | null;
  rawReport: Record<string, unknown>;
  createdAt: string;
  recommendedPlatforms?: string[] | null;
  targetAudience?: Record<string, unknown> | null;
  [key: string]: unknown;
};

/** Normalize DB/tRPC rows to client AuditReportRow shape. */
export function normalizeAuditReportRow(row: Record<string, unknown>): AuditReportRow {
  const createdAt = row.createdAt;
  return {
    ...row,
    id: String(row.id ?? ""),
    createdAt:
      createdAt instanceof Date
        ? createdAt.toISOString()
        : typeof createdAt === "string"
          ? createdAt
          : new Date().toISOString(),
  } as AuditReportRow;
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "error" in data && data.error
        ? String(data.error)
        : res.statusText
    );
  }
  return data;
}

async function auditAuthHeaders(): Promise<HeadersInit> {
  const session = await supabaseGetSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

/** True when the SPA should use `/api/audit/*` (same-origin or Vercel functions). */
export function useSupabaseAuditApi(): boolean {
  return !getApiOrigin();
}

function isAuditSchemaErrorMessage(msg: string): boolean {
  return /audit_reports|schema cache|PGRST205/i.test(msg);
}

function persistAuditToken(result: RunAuditResult): RunAuditResult {
  if (result.shareToken) saveLastAuditToken(result.shareToken);
  if (result.report) {
    saveAuditReportCache(result.report);
    syncDashboardFromAuditReport(result.report, { onboardingComplete: false });
  }
  return result;
}

export async function runAuditApi(input: RunAuditInput): Promise<RunAuditResult> {
  const headers = await auditAuthHeaders();
  const res = await fetch(apiUrl("/api/audit/run"), {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as RunAuditResult & { error?: string; report?: AuditReportRow };
  if (!res.ok) {
    const errMsg =
      typeof data === "object" && data?.error ? String(data.error) : res.statusText;
    throw new Error(errMsg);
  }
  return persistAuditToken(data);
}

export async function getAuditReportApi(shareToken: string): Promise<AuditReportRow> {
  const cached = loadAuditReportCache(shareToken);
  if (cached) return cached;

  const res = await fetch(apiUrl(`/api/audit/report/${encodeURIComponent(shareToken)}`));
  const data = (await res.json()) as AuditReportRow & { error?: string };
  if (!res.ok) {
    const errMsg =
      typeof data === "object" && data?.error ? String(data.error) : res.statusText;
    if (isAuditSchemaErrorMessage(errMsg) || res.status === 404) {
      throw new Error(errMsg);
    }
    throw new Error(errMsg);
  }
  saveAuditReportCache(data);
  return data;
}

export async function listAuditsApi(workspaceId: string): Promise<AuditReportRow[]> {
  const headers = await auditAuthHeaders();
  const res = await fetch(
    apiUrl(`/api/audit/list?workspaceId=${encodeURIComponent(workspaceId)}`),
    { headers }
  );
  return parseJson(res);
}

export async function getLatestAuditApi(
  workspaceId?: string | null
): Promise<AuditReportRow | null> {
  const headers = await auditAuthHeaders();
  const qs = workspaceId
    ? `?workspaceId=${encodeURIComponent(workspaceId)}`
    : "";
  const res = await fetch(apiUrl(`/api/audit/latest${qs}`), { headers });
  if (res.status === 401) return null;
  const data = (await res.json()) as AuditReportRow | null & { error?: string };
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "error" in data && data.error
        ? String(data.error)
        : res.statusText
    );
  }
  if (data && typeof data === "object" && "shareToken" in data && data.shareToken) {
    saveAuditReportCache(data);
    syncDashboardFromAuditReport(data);
  }
  return data;
}

export async function attachAuditApi(
  shareToken: string,
  workspaceId?: string | null
): Promise<AuditReportRow> {
  const headers = await auditAuthHeaders();
  const res = await fetch(apiUrl("/api/audit/attach"), {
    method: "POST",
    headers,
    body: JSON.stringify({ shareToken, workspaceId: workspaceId ?? null }),
  });
  const data = (await res.json()) as AuditReportRow & { error?: string };
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data?.error ? String(data.error) : res.statusText
    );
  }
  saveAuditReportCache(data);
  syncDashboardFromAuditReport(data);
  return data;
}
