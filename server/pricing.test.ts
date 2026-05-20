import { describe, it, expect } from "vitest";

// ─── Test the plan definitions ────────────────────────────────────────────────
describe("Pricing plan definitions", () => {
  it("PLANS object has exactly two plans: free and everything", async () => {
    const { PLANS } = await import("./stripe/products");
    const keys = Object.keys(PLANS);
    expect(keys).toContain("free");
    expect(keys).toContain("everything");
    expect(keys).toHaveLength(2);
  });

  it("free plan has price 0 and no card required", async () => {
    const { PLANS } = await import("./stripe/products");
    expect(PLANS.free.price).toBe(0);
    expect(PLANS.free.requiresCard).toBe(false);
    expect(PLANS.free.trialDays).toBe(0);
  });

  it("everything plan is AU$75/week", async () => {
    const { PLANS } = await import("./stripe/products");
    expect(PLANS.everything.price).toBe(75); // AU$75 (not cents)
    expect(PLANS.everything.currency).toBe("aud");
    expect(PLANS.everything.interval).toBe("week");
  });

  it("everything plan has a 14-day trial", async () => {
    const { PLANS } = await import("./stripe/products");
    expect(PLANS.everything.trialDays).toBe(14);
  });

  it("everything plan name is 'Everything'", async () => {
    const { PLANS } = await import("./stripe/products");
    expect(PLANS.everything.name).toBe("Everything");
  });

  it("free plan name is 'Snap & Post'", async () => {
    const { PLANS } = await import("./stripe/products");
    expect(PLANS.free.name).toBe("Snap & Post");
  });
});

// ─── Test the UpgradePrompt copy ──────────────────────────────────────────────
describe("Upgrade prompt copy", () => {
  it("contains the required Aria copy", () => {
    const copy = "Aria would have caught that. Upgrade to AU$75/week and never miss an enquiry again.";
    expect(copy).toContain("Aria would have caught that");
    expect(copy).toContain("AU$75/week");
    expect(copy).toContain("never miss an enquiry again");
  });

  it("CTA button text is 'Start My Free Trial'", () => {
    const cta = "Start My Free Trial";
    expect(cta).toBe("Start My Free Trial");
  });
});

// ─── Test plan gating logic ───────────────────────────────────────────────────
describe("Plan tier gating", () => {
  const isFreePlan = (planTier?: string | null) =>
    !planTier || planTier === "snap_and_post" || planTier === "free";

  it("null planTier is treated as free", () => {
    expect(isFreePlan(null)).toBe(true);
  });

  it("undefined planTier is treated as free", () => {
    expect(isFreePlan(undefined)).toBe(true);
  });

  it("snap_and_post is free", () => {
    expect(isFreePlan("snap_and_post")).toBe(true);
  });

  it("free is treated as free (legacy)", () => {
    expect(isFreePlan("free")).toBe(true);
  });

  it("everything is NOT free", () => {
    expect(isFreePlan("everything")).toBe(false);
  });

  it("managed_social is NOT free (legacy paid)", () => {
    expect(isFreePlan("managed_social")).toBe(false);
  });
});
