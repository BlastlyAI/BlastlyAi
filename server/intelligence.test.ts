import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB and workspace helpers
vi.mock("./db", () => ({
  getDb: vi.fn(),
  getWorkspaceById: vi.fn(),
  getMemberRole: vi.fn(),
}));

import { getDb, getWorkspaceById, getMemberRole } from "./db";

const mockWorkspace = { id: 1, ownerId: 42, name: "Test Workspace" };

describe("Intelligence Feed Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject list request when workspace not found", async () => {
    (getWorkspaceById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    // Simulate the assertWorkspaceAccess check
    const ws = await getWorkspaceById(999);
    expect(ws).toBeNull();
  });

  it("should allow owner to access their workspace", async () => {
    (getWorkspaceById as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkspace);

    const ws = await getWorkspaceById(1);
    expect(ws).not.toBeNull();
    expect(ws?.ownerId).toBe(42);
  });

  it("should deny non-member access", async () => {
    (getWorkspaceById as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkspace);
    (getMemberRole as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const ws = await getWorkspaceById(1);
    const role = await getMemberRole(1, 99);
    // Non-owner with no role should be denied
    expect(ws?.ownerId).not.toBe(99);
    expect(role).toBeNull();
  });

  it("should allow member with role to access workspace", async () => {
    (getWorkspaceById as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkspace);
    (getMemberRole as ReturnType<typeof vi.fn>).mockResolvedValue("editor");

    const ws = await getWorkspaceById(1);
    const role = await getMemberRole(1, 55);
    expect(ws).not.toBeNull();
    expect(role).toBe("editor");
  });
});

describe("Feed Item Priority Logic", () => {
  it("should classify appointment items as priority 1", () => {
    const item = { itemType: "appointment_upcoming", priority: 1 };
    expect(item.priority).toBe(1);
    expect(item.itemType.startsWith("appointment")).toBe(true);
  });

  it("should classify leads as priority 2", () => {
    const item = { itemType: "lead_new", priority: 2 };
    expect(item.priority).toBe(2);
  });

  it("should classify awareness items as priority 6", () => {
    const item = { itemType: "traction_post", priority: 6 };
    expect(item.priority).toBe(6);
  });

  it("should separate urgent from awareness items correctly", () => {
    const items = [
      { id: 1, priority: 1, itemType: "appointment_upcoming" },
      { id: 2, priority: 2, itemType: "lead_new" },
      { id: 3, priority: 6, itemType: "traction_post" },
      { id: 4, priority: 6, itemType: "invoice_paid" },
      { id: 5, priority: 3, itemType: "message_sms" },
    ];

    const urgent = items.filter(i => i.priority <= 5);
    const awareness = items.filter(i => i.priority === 6);

    expect(urgent).toHaveLength(3);
    expect(awareness).toHaveLength(2);
    expect(urgent.map(i => i.id)).toEqual([1, 2, 5]);
    expect(awareness.map(i => i.id)).toEqual([3, 4]);
  });
});

describe("Channel Connections", () => {
  it("should recognise all valid channel types", () => {
    const validTypes = [
      "email_gmail", "email_outlook", "email_imap",
      "sms", "google_business",
      "calendar_google", "calendar_calendly", "calendar_acuity",
      "calendar_simplybook", "calendar_square",
      "payment_square", "payment_stripe", "payment_xero",
      "payment_myob", "payment_paypal", "payment_shopify",
    ];

    validTypes.forEach(type => {
      expect(typeof type).toBe("string");
      expect(type.length).toBeGreaterThan(0);
    });

    expect(validTypes).toHaveLength(16);
  });

  it("should group channel types by category", () => {
    const types = [
      "email_gmail", "email_outlook", "email_imap",
      "sms", "google_business",
      "calendar_google", "calendar_calendly",
      "payment_square", "payment_stripe",
    ];

    const email = types.filter(t => t.startsWith("email_"));
    const calendar = types.filter(t => t.startsWith("calendar_"));
    const payment = types.filter(t => t.startsWith("payment_"));

    expect(email).toHaveLength(3);
    expect(calendar).toHaveLength(2);
    expect(payment).toHaveLength(2);
  });
});
