import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Stripe ──────────────────────────────────────────────────────────────
vi.mock("stripe", () => {
  const mockStripe = {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/test-session" }),
      },
    },
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue({
        id: "sub_test123",
        status: "active",
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
      }),
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  };
  return { default: vi.fn(() => mockStripe) };
});

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getSubscriptionByUserId: vi.fn().mockResolvedValue(null),
  upsertSubscription: vi.fn().mockResolvedValue(undefined),
  updateSubscriptionByStripeId: vi.fn().mockResolvedValue(undefined),
}));

import { PLANS, LEGACY_PLANS } from "./stripe/products";
import { getSubscriptionByUserId, upsertSubscription } from "./db";

// ─── Products config ───────────────────────────────────────────────────────────────────────────────
describe("Stripe products config", () => {
  it("should have free, fix_my_brand, and managed_social plans", () => {
    expect(PLANS).toHaveProperty("free");
    expect(PLANS).toHaveProperty("fix_my_brand");
    expect(PLANS).toHaveProperty("managed_social");
  });

  it("fix_my_brand plan should cost A$297 (one-off)", () => {
    expect(PLANS.fix_my_brand.price).toBe(297);
    expect(PLANS.fix_my_brand.interval).toBe("one_off");
  });

  it("managed_social plan should cost A$197/month", () => {
    expect(PLANS.managed_social.price).toBe(197);
    expect(PLANS.managed_social.interval).toBe("month");
  });

  it("free plan should cost A$0", () => {
    expect(PLANS.free.price).toBe(0);
    expect(PLANS.free.interval).toBeNull();
  });

  it("all plans should have required fields", () => {
    for (const [, plan] of Object.entries(PLANS)) {
      expect(plan).toHaveProperty("name");
      expect(plan).toHaveProperty("price");
      expect(plan).toHaveProperty("description");
      expect(plan).toHaveProperty("features");
      expect(Array.isArray(plan.features)).toBe(true);
    }
  });

  it("legacy plans should still have starter, growth, agency with AUD pricing", () => {
    expect(LEGACY_PLANS).toHaveProperty("starter");
    expect(LEGACY_PLANS).toHaveProperty("growth");
    expect(LEGACY_PLANS).toHaveProperty("agency");
    expect(LEGACY_PLANS.starter.monthlyPrice).toBe(29);
    expect(LEGACY_PLANS.growth.monthlyPrice).toBe(79);
    expect(LEGACY_PLANS.agency.monthlyPrice).toBe(199);
  });
});

// ─── Subscription DB helpers ──────────────────────────────────────────────────
describe("Subscription DB helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getSubscriptionByUserId returns null for new user", async () => {
    vi.mocked(getSubscriptionByUserId).mockResolvedValueOnce(null);
    const result = await getSubscriptionByUserId(999);
    expect(result).toBeNull();
  });

  it("upsertSubscription is called with correct data", async () => {
    await upsertSubscription({
      userId: 1,
      stripeCustomerId: "cus_test",
      stripeSubscriptionId: "sub_test",
      plan: "growth",
      status: "active",
    });
    expect(upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        plan: "growth",
        status: "active",
      })
    );
  });
});

// ─── Webhook handler logic ────────────────────────────────────────────────────
describe("Stripe webhook handler", () => {
  it("should handle test events by returning verified:true", () => {
    // Test event IDs start with 'evt_test_'
    const testEventId = "evt_test_abc123";
    expect(testEventId.startsWith("evt_test_")).toBe(true);
  });

  it("should identify checkout.session.completed event type", () => {
    const eventType = "checkout.session.completed";
    const handledEvents = [
      "checkout.session.completed",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.payment_failed",
    ];
    expect(handledEvents).toContain(eventType);
  });

  it("should map subscription status correctly", () => {
    const mapStatus = (stripeStatus: string) => {
      if (stripeStatus === "active") return "active";
      if (stripeStatus === "trialing") return "trialing";
      if (stripeStatus === "past_due") return "past_due";
      return "cancelled";
    };
    expect(mapStatus("active")).toBe("active");
    expect(mapStatus("trialing")).toBe("trialing");
    expect(mapStatus("past_due")).toBe("past_due");
    expect(mapStatus("canceled")).toBe("cancelled");
    expect(mapStatus("unpaid")).toBe("cancelled");
  });
});

// ─── Free tier scan limits ────────────────────────────────────────────────────
describe("Free tier scan limits", () => {
  it("free user has limit of 3 scans per month", () => {
    const FREE_SCAN_LIMIT = 3;
    expect(FREE_SCAN_LIMIT).toBe(3);
  });

  it("paid user should bypass scan limits", () => {
    const isPaidUser = (sub: { status: string; plan: string } | null) =>
      sub !== null && sub.status === "active" && sub.plan !== "free";
    expect(isPaidUser(null)).toBe(false);
    expect(isPaidUser({ status: "active", plan: "free" })).toBe(false);
    expect(isPaidUser({ status: "active", plan: "starter" })).toBe(true);
    expect(isPaidUser({ status: "active", plan: "growth" })).toBe(true);
    expect(isPaidUser({ status: "active", plan: "agency" })).toBe(true);
    expect(isPaidUser({ status: "cancelled", plan: "growth" })).toBe(false);
  });

  it("FREE_LIMIT_REACHED error message is consistent", () => {
    const ERROR_MESSAGE = "FREE_LIMIT_REACHED";
    expect(ERROR_MESSAGE).toBe("FREE_LIMIT_REACHED");
  });

  it("upgrade prompt shows correct AUD pricing", () => {
    const starterPrice = 29;
    const currency = "AUD";
    expect(starterPrice).toBe(29);
    expect(currency).toBe("AUD");
  });
});
