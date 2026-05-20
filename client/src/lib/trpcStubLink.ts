import { TRPCClientError, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import type { AppRouter } from "../../../server/routers";

/** Safe empty defaults for legacy dashboard tRPC calls when no Express API is configured. */
function stubQueryData(path: string, input: unknown): unknown {
  if (path.endsWith(".list") || path === "workspace.members") return [];
  const proc = path.split(".").pop() ?? "";
  if (proc.startsWith("list")) return [];
  if (path.includes("unreadCount")) return 0;
  if (path === "postQueue.stats") {
    return { clientCount: 0, backupCount: 0, total: 0, backupTarget: 3 };
  }
  if (path === "approval.getStats") {
    return { pendingAgency: 0, pendingClient: 0, total: 0 };
  }
  if (path === "analytics.summary") {
    return {
      totalImpressions: 0,
      totalClicks: 0,
      totalLikes: 0,
      totalShares: 0,
      totalUtmClicks: 0,
      totalUtmConversions: 0,
    };
  }
  if (path === "preferences.get") {
    const wsId =
      input && typeof input === "object" && "workspaceId" in input
        ? Number((input as { workspaceId: number }).workspaceId)
        : 1;
    return {
      workspaceId: wsId,
      colorScheme: "bold" as const,
      homeMode: "dashboard" as const,
      ageGroup: "all_ages" as const,
      businessSector: "other" as const,
    };
  }
  if (path === "onboarding.getState") {
    return { profile: null, connections: [], currentStep: 1, isComplete: false };
  }
  if (path === "monthlyStats.getMyStats") {
    return {
      workspaceId: 0,
      month: "2026-01",
      blogsPublished: 0,
      socialPostsPublished: 0,
      peopleReached: 0,
      callsHandled: 0,
      appointmentsBooked: 0,
      newEnquiries: 0,
      aiCitations: 0,
      hoursSaved: 0,
      activeFeatures: [] as string[],
    };
  }
  return null;
}

/** Local tRPC link — no HTTP; keeps legacy dashboard pages from crashing without Express. */
export function createStubTrpcLink(): TRPCLink<AppRouter> {
  return () => {
    return ({ op }) => {
      return observable((observer) => {
        if (op.type === "subscription") {
          observer.complete();
          return;
        }
        if (op.type === "mutation") {
          observer.error(
            TRPCClientError.from({
              error: {
                message: "This feature is not available in Supabase-only mode yet.",
                code: -32004,
                data: { code: "NOT_IMPLEMENTED", httpStatus: 501 },
              },
            })
          );
          return;
        }
        observer.next({ result: { type: "data", data: stubQueryData(op.path, op.input) } });
        observer.complete();
      });
    };
  };
}
