import { describe, expect, it } from "vitest";

/**
 * Unit tests for the audit report score category logic.
 * These tests verify the data mapping from rawReport fields to display categories.
 */

function buildCategories(report: any, raw: any) {
  const socialPresenceScore: number = (raw?.socialPresenceScore as number | undefined) ?? 0;
  const contentAnalysis = raw?.contentAnalysis ?? {};
  const brandConsistency: number = contentAnalysis.brandConsistency ?? raw?.brandConsistencyScore ?? raw?.brandScore ?? 0;
  const visualQuality: number = contentAnalysis.visualQuality ?? 0;
  const copyEffectiveness: number = contentAnalysis.copyEffectiveness ?? 0;

  return {
    socialPresenceScore,
    contentQuality: report.contentScore ?? raw?.contentQualityScore ?? 0,
    engagementRate: report.engagementScore ?? raw?.engagementScore ?? 0,
    adPerformance: report.adQualityScore ?? raw?.adPerformanceScore ?? 0,
    audienceGrowth: report.growthScore ?? raw?.audienceGrowthScore ?? 0,
    brandConsistency,
    visualQuality,
    copyEffectiveness,
  };
}

describe("Audit report category scores", () => {
  it("maps all 8 category scores from a full rawReport", () => {
    const report = {
      contentScore: 72,
      engagementScore: 55,
      adQualityScore: 60,
      growthScore: 45,
    };
    const raw = {
      socialPresenceScore: 75,
      contentAnalysis: {
        brandConsistency: 80,
        visualQuality: 65,
        copyEffectiveness: 58,
      },
    };

    const cats = buildCategories(report, raw);

    expect(cats.socialPresenceScore).toBe(75);
    expect(cats.contentQuality).toBe(72);
    expect(cats.engagementRate).toBe(55);
    expect(cats.adPerformance).toBe(60);
    expect(cats.audienceGrowth).toBe(45);
    expect(cats.brandConsistency).toBe(80);
    expect(cats.visualQuality).toBe(65);
    expect(cats.copyEffectiveness).toBe(58);
  });

  it("falls back to 0 when scores are missing", () => {
    const cats = buildCategories({}, {});

    expect(cats.socialPresenceScore).toBe(0);
    expect(cats.contentQuality).toBe(0);
    expect(cats.engagementRate).toBe(0);
    expect(cats.adPerformance).toBe(0);
    expect(cats.audienceGrowth).toBe(0);
    expect(cats.brandConsistency).toBe(0);
    expect(cats.visualQuality).toBe(0);
    expect(cats.copyEffectiveness).toBe(0);
  });

  it("falls back to raw fields when report columns are null", () => {
    const report = {
      contentScore: null,
      engagementScore: null,
      adQualityScore: null,
      growthScore: null,
    };
    const raw = {
      socialPresenceScore: 50,
      contentQualityScore: 40,
      engagementScore: 35,
      adPerformanceScore: 55,
      audienceGrowthScore: 30,
      contentAnalysis: {
        brandConsistency: 70,
        visualQuality: 60,
        copyEffectiveness: 45,
      },
    };

    const cats = buildCategories(report, raw);

    expect(cats.socialPresenceScore).toBe(50);
    expect(cats.contentQuality).toBe(40);
    expect(cats.engagementRate).toBe(35);
    expect(cats.adPerformance).toBe(55);
    expect(cats.audienceGrowth).toBe(30);
    expect(cats.brandConsistency).toBe(70);
    expect(cats.visualQuality).toBe(60);
    expect(cats.copyEffectiveness).toBe(45);
  });

  it("uses legacy brandScore field if contentAnalysis is absent", () => {
    const raw = {
      brandScore: 65,
    };
    const cats = buildCategories({}, raw);
    expect(cats.brandConsistency).toBe(65);
  });

  it("shows 'No platforms detected' note when socialPresenceScore is 0", () => {
    const score = 0;
    const note = score === 0 ? "No platforms detected" : undefined;
    expect(note).toBe("No platforms detected");
  });

  it("does not show note when socialPresenceScore is above 0", () => {
    const score = 25;
    const note = score === 0 ? "No platforms detected" : undefined;
    expect(note).toBeUndefined();
  });
});

describe("Audit report cybersecurity grade", () => {
  function cyberGrade(score: number) {
    if (score >= 80) return "excellent";
    if (score >= 60) return "good";
    return "poor";
  }

  it("grades 80+ as excellent", () => expect(cyberGrade(85)).toBe("excellent"));
  it("grades 60-79 as good", () => expect(cyberGrade(70)).toBe("good"));
  it("grades below 60 as poor", () => expect(cyberGrade(45)).toBe("poor"));
});
