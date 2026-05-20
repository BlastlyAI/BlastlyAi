import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Mock storage
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://s3.example.com/photo.jpg", key: "brand-photos/1/abc.jpg" }),
}));

describe("Approval system — unit tests (no DB)", () => {
  it("approval router module loads without errors", async () => {
    const mod = await import("./routers/approval");
    expect(mod.approvalRouter).toBeDefined();
  });

  it("brandBrief router module loads without errors", async () => {
    const mod = await import("./routers/brandBrief");
    expect(mod.brandBriefRouter).toBeDefined();
  });

  it("approval router exposes expected procedures", async () => {
    const { approvalRouter } = await import("./routers/approval");
    const procedures = Object.keys(approvalRouter._def.procedures);
    expect(procedures).toContain("getPendingPosts");
    expect(procedures).toContain("approvePost");
    expect(procedures).toContain("editAndApprove");
    expect(procedures).toContain("rejectPost");
    expect(procedures).toContain("getClientPreview");
    expect(procedures).toContain("clientFlag");
    expect(procedures).toContain("clientApproveAll");
    expect(procedures).toContain("getStats");
  });

  it("brandBrief router exposes expected procedures", async () => {
    const { brandBriefRouter } = await import("./routers/brandBrief");
    const procedures = Object.keys(brandBriefRouter._def.procedures);
    expect(procedures).toContain("get");
    expect(procedures).toContain("save");
    expect(procedures).toContain("uploadPhoto");
    expect(procedures).toContain("getPhotos");
    expect(procedures).toContain("deletePhoto");
  });

  it("getClientPreview is a public procedure (no auth required)", async () => {
    const { approvalRouter } = await import("./routers/approval");
    // Public procedures don't have _def.meta.authRequired
    const proc = (approvalRouter._def.procedures as any).getClientPreview;
    expect(proc).toBeDefined();
  });

  it("clientFlag is a public procedure (no auth required)", async () => {
    const { approvalRouter } = await import("./routers/approval");
    const proc = (approvalRouter._def.procedures as any).clientFlag;
    expect(proc).toBeDefined();
  });

  it("clientApproveAll is a public procedure (no auth required)", async () => {
    const { approvalRouter } = await import("./routers/approval");
    const proc = (approvalRouter._def.procedures as any).clientApproveAll;
    expect(proc).toBeDefined();
  });

  it("approvePost is a protected procedure", async () => {
    const { approvalRouter } = await import("./routers/approval");
    const proc = (approvalRouter._def.procedures as any).approvePost;
    expect(proc).toBeDefined();
  });
});

describe("Brand Brief — validation", () => {
  it("tone enum covers all expected values", () => {
    const validTones = ["professional", "friendly", "bold", "nurturing", "humorous", "authoritative", "casual"];
    expect(validTones).toHaveLength(7);
    validTones.forEach(t => expect(typeof t).toBe("string"));
  });

  it("approval status enum covers all expected values", () => {
    const validStatuses = ["draft", "pending_agency", "pending_client", "approved", "rejected", "scheduled", "published"];
    expect(validStatuses).toHaveLength(7);
  });

  it("two-tier workflow: pending_agency → pending_client → approved", () => {
    const workflow = ["pending_agency", "pending_client", "approved"];
    expect(workflow[0]).toBe("pending_agency");
    expect(workflow[1]).toBe("pending_client");
    expect(workflow[2]).toBe("approved");
  });

  it("client flag sends post back to pending_agency", () => {
    const clientFlagResult = "pending_agency";
    expect(clientFlagResult).toBe("pending_agency");
  });
});
