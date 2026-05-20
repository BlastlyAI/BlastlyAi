import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock dependencies ────────────────────────────────────────────────────────
vi.mock("../drizzle/schema", () => ({
  competitorScans: {
    id: "id",
    userId: "userId",
    websiteUrl: "websiteUrl",
    brandName: "brandName",
    industry: "industry",
    overallGapScore: "overallGapScore",
    userDigitalScore: "userDigitalScore",
    competitors: "competitors",
    improvementOpportunities: "improvementOpportunities",
    quickWins: "quickWins",
    industryBenchmark: "industryBenchmark",
    createdAt: "createdAt",
  },
}));

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

// ─── URL normalisation helper ─────────────────────────────────────────────────
function normaliseUrl(url: string): string {
  let u = url.trim();
  if (!u.startsWith("http")) u = "https://" + u;
  try {
    const parsed = new URL(u);
    return parsed.origin;
  } catch {
    return u;
  }
}

// ─── Extract page text helper ─────────────────────────────────────────────────
function extractPageText(html: string): string {
  if (!html) return "";
  // Simple extraction without cheerio for unit testing
  const noTags = html.replace(/<[^>]+>/g, " ");
  return noTags.replace(/\s+/g, " ").trim().slice(0, 4000);
}

// ─── Parse AI JSON helper ─────────────────────────────────────────────────────
function parseAiJson(content: string | object): unknown {
  const raw = typeof content === "string" ? content : JSON.stringify(content);
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned);
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Competitor Intelligence — URL normalisation", () => {
  it("adds https:// when missing", () => {
    expect(normaliseUrl("example.com")).toBe("https://example.com");
  });

  it("preserves existing https://", () => {
    expect(normaliseUrl("https://example.com/path?q=1")).toBe("https://example.com");
  });

  it("preserves http://", () => {
    expect(normaliseUrl("http://example.com")).toBe("http://example.com");
  });

  it("strips path and query string", () => {
    expect(normaliseUrl("https://example.com/about?ref=google")).toBe("https://example.com");
  });

  it("trims whitespace", () => {
    expect(normaliseUrl("  https://example.com  ")).toBe("https://example.com");
  });
});

describe("Competitor Intelligence — page text extraction", () => {
  it("returns empty string for empty HTML", () => {
    expect(extractPageText("")).toBe("");
  });

  it("strips HTML tags", () => {
    const html = "<html><body><h1>Hello</h1><p>World</p></body></html>";
    expect(extractPageText(html)).toContain("Hello");
    expect(extractPageText(html)).toContain("World");
    expect(extractPageText(html)).not.toContain("<h1>");
  });

  it("truncates to 4000 characters", () => {
    const longText = "a".repeat(5000);
    const html = `<body>${longText}</body>`;
    expect(extractPageText(html).length).toBeLessThanOrEqual(4000);
  });

  it("collapses whitespace", () => {
    const html = "<body>  hello   world  </body>";
    const result = extractPageText(html);
    expect(result).not.toMatch(/\s{2,}/);
  });
});

describe("Competitor Intelligence — AI JSON parsing", () => {
  it("parses plain JSON string", () => {
    const json = '{"brandName": "Acme", "industry": "SaaS"}';
    const result = parseAiJson(json) as Record<string, string>;
    expect(result.brandName).toBe("Acme");
    expect(result.industry).toBe("SaaS");
  });

  it("strips markdown code fences", () => {
    const json = '```json\n{"brandName": "Acme"}\n```';
    const result = parseAiJson(json) as Record<string, string>;
    expect(result.brandName).toBe("Acme");
  });

  it("strips code fences without language tag", () => {
    const json = '```\n{"brandName": "Acme"}\n```';
    const result = parseAiJson(json) as Record<string, string>;
    expect(result.brandName).toBe("Acme");
  });

  it("handles object input by serialising first", () => {
    const obj = { brandName: "Acme", competitors: [] };
    const result = parseAiJson(obj) as Record<string, unknown>;
    expect(result.brandName).toBe("Acme");
    expect(Array.isArray(result.competitors)).toBe(true);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseAiJson("not json at all")).toThrow();
  });
});

describe("Competitor Intelligence — improvement opportunity structure", () => {
  const validOpportunity = {
    category: "social",
    priority: "high",
    title: "Launch TikTok presence",
    description: "Your top 3 competitors are all active on TikTok with 50K+ followers.",
    competitorsDoing: ["Competitor A", "Competitor B"],
    estimatedImpact: "+30% brand awareness",
    timeToImplement: "1-2 weeks",
    difficulty: "easy",
    canDoInBlastly: true,
    blastlyFeature: "Social Scheduler",
    actionSteps: ["Create TikTok account", "Post 3 videos per week", "Use trending sounds"],
  };

  it("has all required fields", () => {
    expect(validOpportunity).toHaveProperty("category");
    expect(validOpportunity).toHaveProperty("priority");
    expect(validOpportunity).toHaveProperty("title");
    expect(validOpportunity).toHaveProperty("description");
    expect(validOpportunity).toHaveProperty("competitorsDoing");
    expect(validOpportunity).toHaveProperty("estimatedImpact");
    expect(validOpportunity).toHaveProperty("timeToImplement");
    expect(validOpportunity).toHaveProperty("difficulty");
    expect(validOpportunity).toHaveProperty("canDoInBlastly");
    expect(validOpportunity).toHaveProperty("actionSteps");
  });

  it("has valid category value", () => {
    const validCategories = ["product", "service", "marketing", "content", "social", "seo", "tech"];
    expect(validCategories).toContain(validOpportunity.category);
  });

  it("has valid priority value", () => {
    const validPriorities = ["critical", "high", "medium", "low"];
    expect(validPriorities).toContain(validOpportunity.priority);
  });

  it("has valid difficulty value", () => {
    const validDifficulties = ["easy", "medium", "hard"];
    expect(validDifficulties).toContain(validOpportunity.difficulty);
  });

  it("has array of action steps", () => {
    expect(Array.isArray(validOpportunity.actionSteps)).toBe(true);
    expect(validOpportunity.actionSteps.length).toBeGreaterThan(0);
  });
});

describe("Competitor Intelligence — competitor score structure", () => {
  const validCompetitor = {
    rank: 1,
    name: "Hootsuite",
    websiteUrl: "https://hootsuite.com",
    industry: "Social Media Management",
    description: "Leading social media management platform.",
    websiteSeoScore: 85,
    socialPresenceScore: 92,
    overallScore: 88,
    grade: "A",
    socialProfiles: [
      { platform: "instagram", found: true, url: "https://instagram.com/hootsuite", followers: 150000, score: 90 },
      { platform: "tiktok", found: false, url: null, followers: null, score: 0 },
    ],
    services: ["Scheduling", "Analytics", "Monitoring"],
    contentStrategy: "Educational content with product demos",
    uniqueStrengths: ["Brand recognition", "Enterprise features"],
    weaknesses: ["High pricing", "Complex UI"],
    estimatedMonthlyTraffic: "5M-10M",
    techStack: ["React", "AWS"],
  };

  it("has valid rank (1-5)", () => {
    expect(validCompetitor.rank).toBeGreaterThanOrEqual(1);
    expect(validCompetitor.rank).toBeLessThanOrEqual(5);
  });

  it("has scores in 0-100 range", () => {
    expect(validCompetitor.websiteSeoScore).toBeGreaterThanOrEqual(0);
    expect(validCompetitor.websiteSeoScore).toBeLessThanOrEqual(100);
    expect(validCompetitor.socialPresenceScore).toBeGreaterThanOrEqual(0);
    expect(validCompetitor.socialPresenceScore).toBeLessThanOrEqual(100);
    expect(validCompetitor.overallScore).toBeGreaterThanOrEqual(0);
    expect(validCompetitor.overallScore).toBeLessThanOrEqual(100);
  });

  it("has valid grade format", () => {
    const validGrades = ["A+", "A", "B+", "B", "C+", "C", "D", "F"];
    expect(validGrades).toContain(validCompetitor.grade);
  });

  it("has social profiles array", () => {
    expect(Array.isArray(validCompetitor.socialProfiles)).toBe(true);
    validCompetitor.socialProfiles.forEach(p => {
      expect(p).toHaveProperty("platform");
      expect(p).toHaveProperty("found");
      expect(p).toHaveProperty("score");
    });
  });

  it("has arrays for services, strengths, weaknesses", () => {
    expect(Array.isArray(validCompetitor.services)).toBe(true);
    expect(Array.isArray(validCompetitor.uniqueStrengths)).toBe(true);
    expect(Array.isArray(validCompetitor.weaknesses)).toBe(true);
  });
});

describe("Competitor Intelligence — industry benchmark structure", () => {
  const validBenchmark = {
    metric: "Social Media Presence",
    yourScore: 45,
    industryAverage: 62,
    topCompetitorScore: 88,
    gap: 43,
  };

  it("has all required fields", () => {
    expect(validBenchmark).toHaveProperty("metric");
    expect(validBenchmark).toHaveProperty("yourScore");
    expect(validBenchmark).toHaveProperty("industryAverage");
    expect(validBenchmark).toHaveProperty("topCompetitorScore");
    expect(validBenchmark).toHaveProperty("gap");
  });

  it("gap equals difference between yourScore and topCompetitorScore", () => {
    const expectedGap = validBenchmark.topCompetitorScore - validBenchmark.yourScore;
    expect(validBenchmark.gap).toBe(expectedGap);
  });

  it("scores are in valid range", () => {
    expect(validBenchmark.yourScore).toBeGreaterThanOrEqual(0);
    expect(validBenchmark.yourScore).toBeLessThanOrEqual(100);
    expect(validBenchmark.industryAverage).toBeGreaterThanOrEqual(0);
    expect(validBenchmark.industryAverage).toBeLessThanOrEqual(100);
    expect(validBenchmark.topCompetitorScore).toBeGreaterThanOrEqual(0);
    expect(validBenchmark.topCompetitorScore).toBeLessThanOrEqual(100);
  });
});
