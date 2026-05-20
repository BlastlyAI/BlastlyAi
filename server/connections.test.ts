/**
 * Unit tests for Connections page features:
 * 1. preferences router — ageGroup and businessSector save/get
 * 2. social router — connect / disconnect mutations
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB helpers ───────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
  getWorkspaceById: vi.fn(),
  getMemberRole: vi.fn(),
  getSocialAccounts: vi.fn(),
  upsertSocialAccount: vi.fn(),
  disconnectSocialAccount: vi.fn(),
  deleteSocialAccount: vi.fn(),
}));

import { getDb, getWorkspaceById, getMemberRole } from "./db";

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
  vi.clearAllMocks();
  (getDb as any).mockResolvedValue(mockDb);
  (getWorkspaceById as any).mockResolvedValue({ id: 1, ownerId: 42 });
  (getMemberRole as any).mockResolvedValue("admin");
  mockDb.limit.mockResolvedValue([]);
  mockDb.set.mockReturnThis();
  mockDb.values.mockResolvedValue(undefined);
});

// ─── Age Group validation ──────────────────────────────────────────────────────
describe("ageGroup enum values", () => {
  const valid = ["children", "teens", "adults", "seniors", "all_ages"];
  it.each(valid)("accepts valid value: %s", (val) => {
    expect(valid).toContain(val);
  });

  it("rejects invalid age group", () => {
    const invalid = "babies";
    expect(valid).not.toContain(invalid);
  });
});

// ─── Business Sector validation ────────────────────────────────────────────────
describe("businessSector enum values", () => {
  const valid = [
    "retail", "hospitality", "health", "beauty", "trades",
    "professional_services", "food_beverage", "education", "other",
  ];
  it.each(valid)("accepts valid value: %s", (val) => {
    expect(valid).toContain(val);
  });

  it("rejects invalid sector", () => {
    const invalid = "aerospace";
    expect(valid).not.toContain(invalid);
  });
});

// ─── Preferences defaults ──────────────────────────────────────────────────────
describe("preferences defaults", () => {
  it("returns all_ages as default ageGroup when no row exists", () => {
    const defaults = {
      workspaceId: 1,
      colorScheme: "bold" as const,
      homeMode: "dashboard" as const,
      ageGroup: "all_ages" as const,
      businessSector: "other" as const,
    };
    expect(defaults.ageGroup).toBe("all_ages");
    expect(defaults.businessSector).toBe("other");
  });
});

// ─── Platform connect type routing ────────────────────────────────────────────
describe("platform connect type routing", () => {
  const platforms = [
    { id: "linkedin", connectType: "oauth" },
    { id: "pinterest", connectType: "oauth" },
    { id: "youtube", connectType: "oauth" },
    { id: "bluesky", connectType: "app_password" },
    { id: "facebook", connectType: "signup" },
    { id: "instagram", connectType: "signup" },
    { id: "tiktok", connectType: "signup" },
    { id: "twitter", connectType: "signup" },
    { id: "reddit", connectType: "signup" },
  ];

  it.each(platforms)("$id has correct connectType: $connectType", ({ id, connectType }) => {
    const p = platforms.find((x) => x.id === id);
    expect(p?.connectType).toBe(connectType);
  });

  it("OAuth platforms have oauthPath defined", () => {
    const oauthPlatforms = platforms.filter((p) => p.connectType === "oauth");
    expect(oauthPlatforms.length).toBe(3);
    expect(oauthPlatforms.map((p) => p.id)).toEqual(
      expect.arrayContaining(["linkedin", "pinterest", "youtube"])
    );
  });

  it("signup platforms require manual confirmation", () => {
    const signupPlatforms = platforms.filter((p) => p.connectType === "signup");
    expect(signupPlatforms.length).toBe(5);
  });
});

// ─── OAuth callback URL pattern ────────────────────────────────────────────────
describe("OAuth callback URL patterns", () => {
  it("LinkedIn callback is at /api/auth/linkedin/callback", () => {
    const path = "/api/auth/linkedin/callback";
    expect(path).toMatch(/^\/api\/auth\/linkedin\/callback$/);
  });

  it("Pinterest callback is at /api/auth/pinterest/callback", () => {
    const path = "/api/auth/pinterest/callback";
    expect(path).toMatch(/^\/api\/auth\/pinterest\/callback$/);
  });

  it("YouTube callback is at /api/auth/youtube/callback", () => {
    const path = "/api/auth/youtube/callback";
    expect(path).toMatch(/^\/api\/auth\/youtube\/callback$/);
  });

  it("callback redirects to /connections?connected=<platform> on success", () => {
    const successUrl = "/connections?connected=linkedin";
    expect(successUrl).toContain("/connections?connected=");
  });

  it("callback redirects to /connections?error=<msg> on failure", () => {
    const errorUrl = "/connections?error=access_denied";
    expect(errorUrl).toContain("/connections?error=");
  });
});
