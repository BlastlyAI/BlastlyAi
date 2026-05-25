import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  dashboardSnapshotFromAuditReport,
  type DashboardAuditSnapshot,
} from "@shared/dashboardFromAudit";
import { loadDashboardProfile, type DashboardProfile } from "@/lib/dashboardProfile";
import { resolveAuditToken } from "@/lib/auditSession";
import { useAuditReport } from "@/hooks/useAuditReport";
import { getLatestAuditApi, useSupabaseAuditApi } from "@/lib/auditApi";
import { useAuth } from "@/_core/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { attachGuestAuditAfterAuth } from "@/lib/attachGuestAudit";

export type DashboardData = DashboardAuditSnapshot & {
  onboardingComplete: boolean;
  isLoading: boolean;
  fromAudit: boolean;
};

function mergeProfileWithAudit(
  profile: DashboardProfile | null,
  audit: unknown
): DashboardData | null {
  if (audit && typeof audit === "object" && "shareToken" in audit) {
    const row = audit as Record<string, unknown>;
    const snapshot = dashboardSnapshotFromAuditReport({
      ...row,
      id: String(row.id ?? ""),
      shareToken: String(row.shareToken ?? ""),
      businessName: String(row.businessName ?? "Your Business"),
      rawReport: (row.rawReport as Record<string, unknown>) ?? {},
    });
    return {
      ...snapshot,
      onboardingComplete: profile?.onboardingComplete ?? false,
      isLoading: false,
      fromAudit: true,
      ...(profile?.onboardingComplete
        ? {
            brandTone: profile.brandTone || snapshot.brandTone,
            targetAudience: profile.targetAudience || snapshot.targetAudience,
            contactEmail: profile.contactEmail || snapshot.contactEmail,
            recommendedPlatforms:
              profile.recommendedPlatforms.length > 0
                ? profile.recommendedPlatforms
                : snapshot.recommendedPlatforms,
          }
        : {}),
    };
  }
  if (profile?.auditShareToken || profile?.businessName) {
    return {
      ...profile,
      isLoading: false,
      fromAudit: Boolean(profile.auditShareToken),
    };
  }
  return null;
}

/** Load dashboard data from authenticated user's latest audit + local profile. */
export function useDashboardAudit(): DashboardData {
  const { user, isAuthenticated } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const profile = loadDashboardProfile();
  const useApi = useSupabaseAuditApi();

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    void attachGuestAuditAfterAuth(currentWorkspace?.supabaseId ?? null);
  }, [isAuthenticated, user?.id, currentWorkspace?.supabaseId]);

  const latestQuery = useQuery({
    queryKey: ["audit-latest", user?.id, currentWorkspace?.supabaseId],
    queryFn: () => getLatestAuditApi(currentWorkspace?.supabaseId ?? null),
    enabled: useApi && isAuthenticated && !!user?.id,
    staleTime: 30_000,
  });

  const auditToken =
    (latestQuery.data?.shareToken as string | undefined) ||
    profile?.auditShareToken ||
    resolveAuditToken();

  const { data: auditReport, isLoading: reportLoading } = useAuditReport(
    auditToken,
    !!auditToken
  );

  const resolvedAudit = latestQuery.data ?? auditReport;

  const merged = useMemo(
    () => mergeProfileWithAudit(profile, resolvedAudit),
    [profile, resolvedAudit]
  );

  const isLoading =
    (isAuthenticated && latestQuery.isLoading) || (!!auditToken && reportLoading);

  if (merged) {
    return { ...merged, isLoading };
  }

  if (isLoading && auditToken) {
    return {
      ...dashboardSnapshotFromAuditReport({
        shareToken: auditToken,
        businessName: "Your Business",
        rawReport: {},
      }),
      onboardingComplete: false,
      isLoading: true,
      fromAudit: false,
    };
  }

  return {
    ...dashboardSnapshotFromAuditReport({
      shareToken: "",
      businessName: profile?.businessName ?? "Your Business",
      industry: profile?.industry,
      rawReport: {},
    }),
    onboardingComplete: profile?.onboardingComplete ?? false,
    isLoading: false,
    fromAudit: false,
  };
}
