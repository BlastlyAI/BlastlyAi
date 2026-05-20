import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock the database ──────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue({ insertId: 1 }),
      }),
    }),
  }),
}));

// ── Test context ───────────────────────────────────────────────────────────
function createCtx(): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "test-user-42",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe("onboarding.saveProfile", () => {
  it("saves a valid business profile and returns success", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.onboarding.saveProfile({
      businessName: "Acme Marketing",
      industry: "E-commerce / Retail",
      goals: ["Grow brand awareness", "Generate leads"],
      targetAudience: "Small business owners aged 30–50",
      adBudgetRange: "$500 – $2,000/month",
    });

    expect(result).toEqual({ success: true });
  });

  it("rejects an empty business name", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.onboarding.saveProfile({
        businessName: "",
        industry: "E-commerce / Retail",
        goals: ["Grow brand awareness"],
      })
    ).rejects.toThrow();
  });
});

describe("onboarding.saveBrandCheck", () => {
  it("saves a brand name and returns success", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.onboarding.saveBrandCheck({ brandName: "ViralLabsAI" });
    expect(result).toEqual({ success: true });
  });
});

describe("onboarding.savePlatformConnection", () => {
  it("saves a connected platform status", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.onboarding.savePlatformConnection({
      platform: "instagram",
      status: "connected",
      accountName: "test_account",
    });

    expect(result).toEqual({ success: true });
  });

  it("saves a skipped platform status", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.onboarding.savePlatformConnection({
      platform: "snapchat",
      status: "skipped",
    });

    expect(result).toEqual({ success: true });
  });

  it("rejects an invalid platform", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.onboarding.savePlatformConnection({
        platform: "myspace" as any,
        status: "connected",
      })
    ).rejects.toThrow();
  });
});

describe("onboarding.skipPlatform", () => {
  it("skips a platform and returns success", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.onboarding.skipPlatform({ platform: "pinterest" });
    expect(result).toEqual({ success: true });
  });
});

describe("onboarding.complete", () => {
  it("marks onboarding as complete and returns success", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.onboarding.complete();
    expect(result).toEqual({ success: true });
  });
});

describe("onboarding.getConnections", () => {
  it("returns an array of connections", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    // getConnections calls .select().from().where() — no .limit()
    // The mock's .where() returns { limit: fn } but the actual call resolves the .where() directly.
    // Re-mock db for this specific case.
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValueOnce({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onDuplicateKeyUpdate: vi.fn().mockResolvedValue({ insertId: 1 }),
        }),
      }),
    } as any);

    const result = await caller.onboarding.getConnections();
    expect(Array.isArray(result)).toBe(true);
  });
});
