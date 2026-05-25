import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  getBillingPlanApi,
  isPaidBilling,
  loadCachedPlan,
  type UserBilling,
} from "@/lib/billingApi";

export type PlanAccess = {
  billing: UserBilling | null;
  isPaid: boolean;
  isLoading: boolean;
  isFree: boolean;
  assistantName: string;
  refetch: () => Promise<void>;
};

const DEFAULT_ASSISTANT = "Aria";

export function usePlanAccess(): PlanAccess {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  const cached = loadCachedPlan();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["billing-plan", user?.id],
    queryFn: getBillingPlanApi,
    enabled: isAuthenticated && !!user?.id,
    staleTime: 30_000,
    initialData: cached ?? undefined,
  });

  const billing = data ?? cached ?? null;
  const isPaid = isPaidBilling(billing);

  return {
    billing,
    isPaid,
    isLoading: isAuthenticated && isLoading && !billing,
    isFree: !isPaid,
    assistantName: billing?.assistantName?.trim() || DEFAULT_ASSISTANT,
    refetch: async () => {
      await queryClient.invalidateQueries({ queryKey: ["billing-plan", user?.id] });
      await refetch();
    },
  };
}

/** Default landing route after auth based on plan. */
export function getDefaultAppRoute(isPaid: boolean): string {
  return isPaid ? "/command-centre" : "/dashboard/home";
}
