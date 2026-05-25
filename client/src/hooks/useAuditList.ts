import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { listAuditsApi, useSupabaseAuditApi } from "@/lib/auditApi";

export function useAuditList(workspaceSupabaseId: string | undefined, legacyWorkspaceId: number) {
  const useApi = useSupabaseAuditApi();
  const trpcQuery = trpc.audit.listAudits.useQuery(
    { workspaceId: legacyWorkspaceId },
    { enabled: !useApi && legacyWorkspaceId > 0 }
  );
  const apiQuery = useQuery({
    queryKey: ["audit-list", workspaceSupabaseId],
    queryFn: () => listAuditsApi(workspaceSupabaseId!),
    enabled: useApi && Boolean(workspaceSupabaseId),
  });

  if (useApi) {
    return { data: apiQuery.data ?? [], isLoading: apiQuery.isLoading };
  }
  return { data: trpcQuery.data ?? [], isLoading: trpcQuery.isLoading };
}
