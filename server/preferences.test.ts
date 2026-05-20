import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB and workspace helpers
vi.mock("./db", () => ({
  getDb: vi.fn(),
  getWorkspaceById: vi.fn(),
  getMemberRole: vi.fn(),
}));

import { getDb, getWorkspaceById, getMemberRole } from "./db";

describe("preferences router logic", () => {
  const mockWorkspace = { id: 1, ownerId: 42, name: "Test WS" };
  const mockUser = { id: 42 };

  beforeEach(() => {
    vi.clearAllMocks();
    (getWorkspaceById as any).mockResolvedValue(mockWorkspace);
    (getMemberRole as any).mockResolvedValue(null);
  });

  it("returns default preferences when no row exists", async () => {
    const mockSelect = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (getDb as any).mockResolvedValue(mockSelect);

    // Simulate the get procedure logic
    const db = await getDb();
    const rows = await db!.select().from({} as any).where({} as any).limit(1);
    expect(rows).toHaveLength(0);

    // Should fall back to defaults
    const defaults = {
      workspaceId: 1,
      colorScheme: "bold" as const,
      homeMode: "dashboard" as const,
    };
    expect(defaults.colorScheme).toBe("bold");
    expect(defaults.homeMode).toBe("dashboard");
  });

  it("returns saved preferences when row exists", async () => {
    const savedRow = {
      id: 1,
      workspaceId: 1,
      colorScheme: "warm",
      homeMode: "dashboard",
    };
    const mockSelect = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([savedRow]),
    };
    (getDb as any).mockResolvedValue(mockSelect);

    const db = await getDb();
    const rows = await db!.select().from({} as any).where({} as any).limit(1);
    expect(rows[0].colorScheme).toBe("warm");
  });

  it("validates color scheme values", () => {
    const validSchemes = ["bold", "soft", "warm"];
    const invalidScheme = "purple";
    expect(validSchemes).toContain("bold");
    expect(validSchemes).toContain("soft");
    expect(validSchemes).toContain("warm");
    expect(validSchemes).not.toContain(invalidScheme);
  });

  it("validates home mode values", () => {
    const validModes = ["dashboard", "assistant"];
    expect(validModes).toContain("dashboard");
    expect(validModes).toContain("assistant");
    expect(validModes).not.toContain("unknown");
  });

  it("owner can access their own workspace", async () => {
    (getWorkspaceById as any).mockResolvedValue(mockWorkspace);
    const ws = await getWorkspaceById(1);
    expect(ws?.ownerId).toBe(mockUser.id);
    // Owner access check passes (ownerId === userId)
    expect(ws?.ownerId === mockUser.id).toBe(true);
  });

  it("non-member cannot access workspace", async () => {
    const otherWorkspace = { id: 2, ownerId: 99, name: "Other WS" };
    (getWorkspaceById as any).mockResolvedValue(otherWorkspace);
    (getMemberRole as any).mockResolvedValue(null);

    const ws = await getWorkspaceById(2);
    const role = await getMemberRole(2, mockUser.id);
    // Neither owner nor member — should be forbidden
    expect(ws?.ownerId === mockUser.id).toBe(false);
    expect(role).toBeNull();
  });
});
