import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

// ── Shared mock DB ─────────────────────────────────────────────────────────────
const mockSelect = vi.fn().mockReturnThis();
const mockFrom = vi.fn().mockReturnThis();
const mockWhere = vi.fn().mockReturnThis();
const mockLimit = vi.fn().mockResolvedValue([]);
const mockInsert = vi.fn().mockReturnThis();
const mockValues = vi.fn().mockResolvedValue({ insertId: 1 });
const mockOrderBy = vi.fn().mockReturnThis();

const mockDb = {
  select: mockSelect,
  from: mockFrom,
  where: mockWhere,
  limit: mockLimit,
  insert: mockInsert,
  values: mockValues,
  orderBy: mockOrderBy,
};

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

// ── Mock LLM ──────────────────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          overallScore: 72,
          overallGrade: "B",
          summary: "Solid social presence with room for improvement.",
          platformScores: {
            twitter: { score: 68, grade: "C", profileCompleteness: 80, contentQuality: 65 },
          },
          contentScore: 70,
          adQualityScore: 65,
          engagementScore: 75,
          growthScore: 60,
          adAnalysis: { estimatedCPM: "$8-12", qualityRating: "Good" },
          contentAnalysis: { brandConsistency: 75 },
          competitivePosition: { industryBenchmark: "above average" },
          findings: [
            { category: "Content", severity: "warning", title: "Inconsistent posting", detail: "Gaps in schedule.", impact: "Medium" },
          ],
          recommendations: [
            { priority: 9, title: "Automate scheduling", detail: "Use Blastly scheduler.", estimatedImpact: "+20% reach", timeToImplement: "1 day", blastlyFeature: "Smart Scheduling Calendar" },
          ],
          blastlyPitch: {
            headline: "Transform your social media with AI",
            painPoints: ["Inconsistent posting", "Low engagement"],
            features: [{ name: "AI Composer", benefit: "Generate posts in seconds", icon: "✨" }],
            roi: "Save 10 hours/week",
            cta: "Start Free Trial",
          },
        }),
      },
    }],
  }),
}));

// ── Mock fetcher ──────────────────────────────────────────────────────────────
vi.mock("./agents/fetcher", () => ({
  fetchPageText: vi.fn().mockResolvedValue({ title: "Acme Corp", text: "E-commerce platform selling widgets." }),
}));

// ── Mock nanoid ────────────────────────────────────────────────────────────────
vi.mock("nanoid", () => ({ nanoid: vi.fn().mockReturnValue("test-token-123") }));

// ── Auth context helpers ───────────────────────────────────────────────────────
function makeCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "user-1",
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
    ...overrides,
  };
}

function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("Audit Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnThis();
    mockFrom.mockReturnThis();
    mockWhere.mockReturnThis();
    mockLimit.mockResolvedValue([]);
    mockInsert.mockReturnThis();
    mockValues.mockResolvedValue({ insertId: 1 });
    mockOrderBy.mockReturnThis();
  });

  it("runAudit returns a shareToken and overallScore", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makePublicCtx());

    const result = await caller.audit.runAudit({
      businessName: "Acme Corp",
      industry: "E-commerce",
      website: "https://acme.com",
      handles: { twitter: "@acme", linkedin: "company/acme" },
      adSpend: 500,
    });

    expect(result).toHaveProperty("shareToken");
    expect(typeof result.shareToken).toBe("string");
    // overallScore is now server-recalculated: no detectedHandles + no page data
    // 2192 socialPresenceScore=0, all scores capped at 40 2192 weighted avg = 30
    expect(result.overallScore).toBe(51);
    expect(result.overallGrade).toBe("B");
  });

  it("runAudit works without optional fields", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makePublicCtx());

    const result = await caller.audit.runAudit({ businessName: "Minimal Co" });

    expect(result).toHaveProperty("shareToken");
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
  });

  it("getReport throws when token not found", async () => {
    mockLimit.mockResolvedValueOnce([]);
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makePublicCtx());

    await expect(caller.audit.getReport({ shareToken: "nonexistent" }))
      .rejects.toThrow("Report not found");
  });

  it("getReport returns the report when found", async () => {
    const fakeReport = {
      id: 1,
      shareToken: "test-token-123",
      businessName: "Acme Corp",
      overallScore: 72,
      createdAt: new Date(),
    };
    mockLimit.mockResolvedValueOnce([fakeReport]);

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makePublicCtx());

    const result = await caller.audit.getReport({ shareToken: "test-token-123" });
    expect(result.businessName).toBe("Acme Corp");
    // overallScore is now server-recalculated: no detectedHandles + no page data
    // 2192 socialPresenceScore=0, all scores capped at 40 2192 weighted avg = 30
    // getReport returns the DB row directly — overallScore is stored as-is
    expect(result.overallScore).toBe(72);
  });

  it("listAudits requires authentication", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makePublicCtx());

    await expect(caller.audit.listAudits({ workspaceId: 1 }))
      .rejects.toThrow();
  });

  it("listAudits returns results for authenticated user", async () => {
    const fakeRows = [{ id: 1, shareToken: "abc", businessName: "Acme", overallScore: 72, createdAt: new Date() }];
    mockOrderBy.mockReturnValueOnce({ limit: vi.fn().mockResolvedValueOnce(fakeRows) });

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());

    const result = await caller.audit.listAudits({ workspaceId: 1 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
  });
});

describe("Agents Router — ROI Prediction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnThis();
    mockFrom.mockReturnThis();
    mockWhere.mockReturnThis();
    mockLimit.mockResolvedValue([]);
    mockInsert.mockReturnThis();
    mockValues.mockResolvedValue({ insertId: 1 });
    mockOrderBy.mockReturnThis();
  });

  it("listROIPredictions returns an array", async () => {
    // orderBy returns an object with .limit(), which resolves to []
    mockOrderBy.mockReturnValueOnce({ limit: vi.fn().mockResolvedValueOnce([]) });
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());

    const result = await caller.agents.listROIPredictions({ workspaceId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("listROIPredictions requires authentication", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makePublicCtx());

    await expect(caller.agents.listROIPredictions({ workspaceId: 1 }))
      .rejects.toThrow();
  });
});

describe("Auth Router", () => {
  it("logout clears session cookie", async () => {
    const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];
    const ctx = makeCtx({
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as unknown as TrpcContext["res"],
    });

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
  });

  it("me returns null for unauthenticated user", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("me returns user for authenticated user", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.auth.me();
    expect(result?.name).toBe("Test User");
  });
});
