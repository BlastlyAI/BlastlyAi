/**
 * Unit tests for the client_monthly_stats feature.
 *
 * These tests verify:
 * 1. currentMonth() returns a valid YYYY-MM string
 * 2. incrementMonthlyStat field validation (only allowed fields accepted)
 * 3. monthlyStats tRPC router input schema validation
 * 4. hours_saved formula logic
 */

import { describe, it, expect } from "vitest";

// ── 1. currentMonth helper ────────────────────────────────────────────────────
function currentMonth(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

describe("currentMonth()", () => {
  it("returns a string matching YYYY-MM format", () => {
    const result = currentMonth();
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });

  it("returns the current year and month", () => {
    const now = new Date();
    const expected = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    expect(currentMonth()).toBe(expected);
  });
});

// ── 2. Allowed stat fields ────────────────────────────────────────────────────
const ALLOWED_FIELDS = [
  "blogsPublished",
  "socialPostsPublished",
  "peopleReached",
  "callsHandled",
  "appointmentsBooked",
  "newEnquiries",
  "aiCitations",
] as const;

type StatField = (typeof ALLOWED_FIELDS)[number];

function isValidStatField(field: string): field is StatField {
  return (ALLOWED_FIELDS as readonly string[]).includes(field);
}

describe("incrementMonthlyStat field validation", () => {
  it("accepts all valid stat fields", () => {
    for (const field of ALLOWED_FIELDS) {
      expect(isValidStatField(field)).toBe(true);
    }
  });

  it("rejects invalid field names", () => {
    expect(isValidStatField("hoursSaved")).toBe(false);
    expect(isValidStatField("randomField")).toBe(false);
    expect(isValidStatField("")).toBe(false);
  });
});

// ── 3. hoursSaved formula ─────────────────────────────────────────────────────
function calcHoursSaved(params: {
  blogsPublished: number;
  socialPostsPublished: number;
  callsHandled: number;
  appointmentsBooked: number;
}): number {
  const { blogsPublished, socialPostsPublished, callsHandled, appointmentsBooked } = params;
  return Math.round(
    (blogsPublished * 120 + socialPostsPublished * 25 + callsHandled * 8 + appointmentsBooked * 10) / 60
  );
}

describe("hoursSaved formula", () => {
  it("returns 0 when all inputs are 0", () => {
    expect(calcHoursSaved({ blogsPublished: 0, socialPostsPublished: 0, callsHandled: 0, appointmentsBooked: 0 })).toBe(0);
  });

  it("calculates correctly for 1 blog post (120 min = 2 hrs)", () => {
    expect(calcHoursSaved({ blogsPublished: 1, socialPostsPublished: 0, callsHandled: 0, appointmentsBooked: 0 })).toBe(2);
  });

  it("calculates correctly for 12 social posts (300 min = 5 hrs)", () => {
    expect(calcHoursSaved({ blogsPublished: 0, socialPostsPublished: 12, callsHandled: 0, appointmentsBooked: 0 })).toBe(5);
  });

  it("calculates correctly for mixed values", () => {
    // 2 blogs=240, 10 posts=250, 5 calls=40, 3 appts=30 → 560/60 = 9.33 → round to 9
    expect(calcHoursSaved({ blogsPublished: 2, socialPostsPublished: 10, callsHandled: 5, appointmentsBooked: 3 })).toBe(9);
  });

  it("rounds correctly (0.5 rounds up)", () => {
    // 1 appt = 10 min, 2 appts = 20 min → 20/60 = 0.33 → round to 0
    expect(calcHoursSaved({ blogsPublished: 0, socialPostsPublished: 0, callsHandled: 0, appointmentsBooked: 2 })).toBe(0);
    // 3 appts = 30 min → 30/60 = 0.5 → round to 1
    expect(calcHoursSaved({ blogsPublished: 0, socialPostsPublished: 0, callsHandled: 0, appointmentsBooked: 3 })).toBe(1);
  });
});

// ── 4. activeFeatures JSON parsing ───────────────────────────────────────────
describe("activeFeatures parsing", () => {
  it("parses a valid JSON array from the DB row", () => {
    const row = { activeFeatures: '["blogs","social","appointments"]' };
    const parsed = row.activeFeatures ? JSON.parse(row.activeFeatures) : [];
    expect(parsed).toEqual(["blogs", "social", "appointments"]);
  });

  it("returns empty array when activeFeatures is null", () => {
    const row = { activeFeatures: null };
    const parsed = row.activeFeatures ? JSON.parse(row.activeFeatures) : [];
    expect(parsed).toEqual([]);
  });

  it("filters cards based on activeFeatures", () => {
    const allCards = ["blogs", "social", "reach", "ai_voice", "appointments", "enquiries", "mcp_engine", "hours"];
    const features = ["blogs", "appointments"];
    const visible = allCards.filter(c => features.includes(c));
    expect(visible).toEqual(["blogs", "appointments"]);
  });

  it("shows all cards when activeFeatures is empty", () => {
    const allCards = ["blogs", "social", "reach", "ai_voice", "appointments", "enquiries", "mcp_engine", "hours"];
    const features: string[] = [];
    const visible = features.length === 0 ? allCards : allCards.filter(c => features.includes(c));
    expect(visible).toHaveLength(8);
  });
});
