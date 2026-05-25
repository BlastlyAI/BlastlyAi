import { TRPCClientError, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import type { AppRouter } from "../../../server/routers";
import { apiUrl } from "./apiOrigin";
import { withAuditParam } from "./auditSession";

/** Safe empty defaults for legacy dashboard tRPC calls when no Express API is configured. */
function stubQueryData(path: string, input: unknown): unknown {
  if (path === "audit.getReport") return null;
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

/** Onboarding / workspace stubs when MySQL tRPC is unavailable. */
function stubMutationData(path: string, input: unknown): unknown | undefined {
  if (path === "workspace.mergeDescription") {
    const i = (input ?? {}) as { auditSummary?: string; customerWords?: string };
    const parts = [i.auditSummary, i.customerWords].filter(Boolean);
    return { polished: parts.join(" ").trim() || i.auditSummary || "" };
  }
  if (path === "workspace.createBrand") {
    const i = (input ?? {}) as { name?: string; website?: string; industry?: string; description?: string };
    const name = i.name?.trim() || "My Workspace";
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48) || "my-workspace";
    return {
      id: 1,
      name,
      slug,
      ownerId: 0,
      website: i.website ?? null,
      industry: i.industry ?? null,
      description: i.description ?? null,
      logoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  if (path === "workspace.updateBrandProfile") {
    const i = (input ?? {}) as { id?: number; name?: string };
    return {
      id: i.id ?? 1,
      name: i.name ?? "My Workspace",
      slug: "my-workspace",
      ownerId: 0,
      updatedAt: new Date(),
    };
  }
  if (path === "workspace.startManagedOnboarding") {
    return { success: true };
  }
  if (path === "workspace.completeOnboarding") {
    return { success: true };
  }
  if (path === "wallet.createOnboardingCheckout") {
    return {
      checkoutUrl: withAuditParam(
        `${typeof window !== "undefined" ? window.location.origin : ""}/onboarding/managed?checkout=demo`
      ),
      sessionId: "demo_checkout_session",
    };
  }
  return undefined;
}

async function proxyAuditMutation(path: string, input: unknown): Promise<unknown> {
  if (path === "audit.runAudit") {
    const res = await fetch(apiUrl("/api/audit/run"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input ?? {}),
    });
    const data = await res.json();
    if (!res.ok) {
      const errMsg =
        typeof data === "object" && data && "error" in data
          ? String((data as { error: string }).error)
          : res.statusText;
      throw new Error(errMsg);
    }
    return data;
  }
  throw new Error("This feature is not available in Supabase-only mode yet.");
}

async function proxyAuditQuery(path: string, input: unknown): Promise<unknown> {
  if (path === "audit.getReport") {
    const token =
      input && typeof input === "object" && "shareToken" in input
        ? String((input as { shareToken: string }).shareToken)
        : "";
    const { loadAuditReportCache } = await import("@/lib/auditReportCache");
    const cached = token ? loadAuditReportCache(token) : null;
    if (cached) return cached;

    const res = await fetch(apiUrl(`/api/audit/report/${encodeURIComponent(token)}`));
    const data = await res.json();
    if (!res.ok) {
      const errMsg =
        typeof data === "object" && data && "error" in data
          ? String((data as { error: string }).error)
          : res.statusText;
      throw new Error(errMsg);
    }
    return data;
  }
  return stubQueryData(path, input);
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

        if (op.path.startsWith("audit.")) {
          void (async () => {
            try {
              const data =
                op.type === "mutation"
                  ? await proxyAuditMutation(op.path, op.input)
                  : await proxyAuditQuery(op.path, op.input);
              observer.next({ result: { type: "data", data } });
              observer.complete();
            } catch (e) {
              observer.error(
                TRPCClientError.from({
                  error: {
                    message: e instanceof Error ? e.message : "Audit request failed",
                    code: -32004,
                    data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
                  },
                })
              );
            }
          })();
          return;
        }

        if (op.type === "mutation") {
          const stubbed = stubMutationData(op.path, op.input);
          if (stubbed !== undefined) {
            observer.next({ result: { type: "data", data: stubbed } });
            observer.complete();
            return;
          }
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
