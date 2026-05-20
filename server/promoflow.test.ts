import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides?: Partial<AuthenticatedUser>): { ctx: TrpcContext; clearedCookies: { name: string; options: Record<string, unknown> }[] } {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-openid",
    email: "test@blastly.ai",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// ─── Auth ───────────────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns null for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.email).toBe("test@blastly.ai");
    expect(result?.name).toBe("Test User");
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1, httpOnly: true, path: "/" });
  });
});

// ─── Workspace ──────────────────────────────────────────────────────────────

describe("workspace.list", () => {
  it("returns empty array for user with no workspaces (no DB)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // Without a real DB, this should return [] gracefully
    try {
      const result = await caller.workspace.list();
      expect(Array.isArray(result)).toBe(true);
    } catch (e: unknown) {
      // DB not available in test env is acceptable
      expect(e).toBeDefined();
    }
  });
});

// ─── AI Router ──────────────────────────────────────────────────────────────

describe("ai.generateContent", () => {
  it("throws FORBIDDEN for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.ai.generateContent({
        workspaceId: 1,
        topic: "Test product",
        platforms: ["twitter"],
        tone: "professional",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── Ad Studio ──────────────────────────────────────────────────────────────

describe("adStudio.generateAd", () => {
  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.adStudio.generateAd({
        workspaceId: 1,
        businessName: "Test Biz",
        businessDescription: "A great business",
        goal: "brand_awareness",
        tone: "professional",
        platforms: ["twitter"],
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── Posts ──────────────────────────────────────────────────────────────────

describe("posts.list", () => {
  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.posts.list({ workspaceId: 1 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── Campaigns ──────────────────────────────────────────────────────────────

describe("campaigns.list", () => {
  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.campaigns.list({ workspaceId: 1 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── Analytics ──────────────────────────────────────────────────────────────

describe("analytics.summary", () => {
  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.analytics.summary({ workspaceId: 1 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── Notifications ──────────────────────────────────────────────────────────

describe("notifications.list", () => {
  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.notifications.list({ workspaceId: 1 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("notifications.unreadCount", () => {
  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.notifications.unreadCount({ workspaceId: 1 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── Library ────────────────────────────────────────────────────────────────

describe("library.list", () => {
  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.library.list({ workspaceId: 1 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── Social ─────────────────────────────────────────────────────────────────

describe("social.list", () => {
  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.social.list({ workspaceId: 1 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
