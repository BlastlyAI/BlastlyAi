import { TRPCClientError, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import type { AppRouter } from "../../../server/routers";

/** Mark tRPC errors that come from static/offline mode (for logging + auth logout). */
export const STATIC_API_TRPC_ERROR_DATA = {
  code: "PRECONDITION_FAILED" as const,
  httpStatus: 503,
  staticApiMode: true as const,
};

export const STATIC_API_OFFLINE_MESSAGE =
  "The Blastly API is not configured for this deployment. Add VITE_API_ORIGIN in Vercel (your Express server URL, e.g. https://api.example.com). Until then, dashboard data and MySQL-backed auth are unavailable; Supabase sign-in still works when configured.";

export function isStaticApiTrpcError(error: unknown): boolean {
  return (
    error instanceof TRPCClientError &&
    Boolean((error.data as { staticApiMode?: boolean } | undefined)?.staticApiMode)
  );
}

function staticMutationError(path: string): TRPCClientError<AppRouter> {
  return TRPCClientError.from({
    error: {
      message: STATIC_API_OFFLINE_MESSAGE,
      code: -32004,
      data: { ...STATIC_API_TRPC_ERROR_DATA, path },
    },
  });
}

function workspaceIdFromInput(input: unknown): number {
  if (input && typeof input === "object" && "workspaceId" in input) {
    const n = Number((input as { workspaceId: number }).workspaceId);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * Minimal mock outputs so the SPA can render without JSON parse failures.
 * Prefer `null` / `[]` / zeroed shapes over throwing on unknown queries.
 */
function mockQueryData(path: string, input: unknown): unknown {
  if (path === "auth.me" || path === "customAuth.me") return null;
  if (path === "system.health") return { ok: true };

  const wsId = workspaceIdFromInput(input);

  if (path === "preferences.get") {
    return {
      workspaceId: wsId || 1,
      colorScheme: "bold" as const,
      homeMode: "dashboard" as const,
      ageGroup: "all_ages" as const,
      businessSector: "other" as const,
    };
  }

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

  if (path === "monthlyStats.getMyStats") {
    const inp = input as { workspaceId?: number; month?: string } | undefined;
    const wid = inp?.workspaceId ?? wsId;
    const month = inp?.month ?? "2026-01";
    return {
      workspaceId: wid,
      month,
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

  if (path === "onboarding.getState") {
    return { profile: null, connections: [], currentStep: 1, isComplete: false };
  }

  if (path === "contacts.previewCampaign") {
    return { totalCount: 0, previews: [] };
  }

  if (path.includes("unreadCount")) return 0;

  if (path.endsWith(".list") || path === "workspace.members") return [];

  const proc = path.split(".").pop() ?? "";
  if (proc.startsWith("list")) return [];

  if (path === "wallet.getWallet") return null;
  if (path === "workspace.getSetupProgress") return null;
  if (path === "shareReport.getSharedReport") return null;
  if (path === "intelligenceReport.getLatest") return null;
  if (path === "seo.getScans") return [];
  if (path === "socialScan.getSocialScans") return [];

  return null;
}

/** tRPC link used when the production SPA has no API origin (e.g. Vercel static only). */
export function createOfflineTrpcLink(): TRPCLink<AppRouter> {
  return () => {
    return ({ op }) => {
      return observable((observer) => {
        if (op.type === "subscription") {
          observer.error(
            TRPCClientError.from({
              error: {
                message: STATIC_API_OFFLINE_MESSAGE,
                code: -32004,
                data: { ...STATIC_API_TRPC_ERROR_DATA, path: op.path },
              },
            }),
          );
          return;
        }

        if (op.type === "mutation") {
          if (op.path === "auth.logout") {
            observer.next({ result: { type: "data", data: { success: true as const } } });
            observer.complete();
            return;
          }
          observer.error(staticMutationError(op.path));
          return;
        }

        const data = mockQueryData(op.path, op.input);
        observer.next({ result: { type: "data", data } });
        observer.complete();
      });
    };
  };
}
