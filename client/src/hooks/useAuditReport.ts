import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { getAuditReportApi, useSupabaseAuditApi } from "@/lib/auditApi";
import { loadAuditReportCache } from "@/lib/auditReportCache";

export function useAuditReport(shareToken: string, enabled = true) {
  const hasCache = !!loadAuditReportCache(shareToken);
  const useApi = (useSupabaseAuditApi() || shareToken.startsWith("audit-")) && !!shareToken;

  const cacheQuery = useQuery({
    queryKey: ["audit-report-cache", shareToken],
    queryFn: () => {
      const cached = loadAuditReportCache(shareToken);
      if (!cached) throw new Error("Report not found");
      return Promise.resolve(cached);
    },
    enabled: enabled && !!shareToken && hasCache && !useApi,
    retry: false,
  });

  const trpcQuery = trpc.audit.getReport.useQuery(
    { shareToken },
    { enabled: enabled && !!shareToken && !useApi && !hasCache }
  );

  const apiQuery = useQuery({
    queryKey: ["audit-report", shareToken],
    queryFn: () => getAuditReportApi(shareToken),
    enabled: enabled && !!shareToken && useApi,
  });

  if (useApi) {
    return {
      data: apiQuery.data,
      isLoading: apiQuery.isLoading,
      error: apiQuery.error,
    };
  }

  if (hasCache) {
    return {
      data: cacheQuery.data,
      isLoading: cacheQuery.isLoading,
      error: cacheQuery.error,
    };
  }

  return {
    data: trpcQuery.data,
    isLoading: trpcQuery.isLoading,
    error: trpcQuery.error,
  };
}
