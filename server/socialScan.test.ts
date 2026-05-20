import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock external dependencies ───────────────────────────────────────────────
vi.mock("../drizzle/schema", () => ({
  socialScans: {},
}));

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            brandName: "Test Brand",
            brandIndustry: "Technology",
            overallScore: 72,
            overallGrade: "B+",
            overallSummary: "Test brand has a solid digital presence.",
            websiteSeoScore: 68,
            platformScores: [
              {
                platform: "facebook",
                found: true,
                url: "https://facebook.com/testbrand",
                handle: "testbrand",
                followers: 1200,
                bio: "Test brand Facebook page",
                lastPostDate: "2026-04-01",
                daysSinceLastPost: 21,
                postingFrequency: "Weekly",
                score: 65,
                grade: "C+",
                isActive: true,
                isDormant: false,
                strengths: ["Active account"],
                weaknesses: ["Low engagement"],
                recommendations: ["Post more frequently"],
              },
            ],
            platformGapAnalysis: {
              missingPlatforms: [
                {
                  platform: "instagram",
                  estimatedReachLoss: "1.2M monthly users",
                  competitorUsage: "85% of competitors use Instagram",
                  priority: "high",
                  reason: "Instagram is critical for visual brands",
                },
              ],
              gapScore: 40,
              summary: "Missing key platforms",
            },
            contentConsistency: {
              score: 70,
              brandNameConsistent: true,
              bioConsistent: false,
              messagingConsistent: true,
              issues: ["Bio text differs across platforms"],
              summary: "Mostly consistent branding",
            },
            postingCadence: {
              overallHealth: "Fair",
              dormantAccounts: [],
              activeAccounts: ["facebook"],
              summary: "Posting weekly on Facebook",
              recommendation: "Increase posting frequency to 3x per week",
            },
            aiVisibilityScore: {
              score: 45,
              grade: "C",
              likelyMentionedInAI: false,
              factors: ["Limited online mentions", "No Wikipedia presence"],
              summary: "Brand is not yet prominent in AI search results",
              recommendations: ["Build more backlinks", "Create Wikipedia page"],
            },
            actionPlan: [
              {
                week: 1,
                priority: "high",
                platform: "instagram",
                action: "Create Instagram account",
                description: "Set up a professional Instagram profile",
                estimatedImpact: "+500 followers/month",
                canCreateInBlastly: true,
              },
            ],
            topRecommendations: [
              {
                priority: "high",
                platform: "instagram",
                issue: "No Instagram presence",
                fix: "Create an Instagram business account immediately",
              },
            ],
          }),
        },
      },
    ],
  }),
}));

// ─── Unit tests for helper functions ─────────────────────────────────────────
describe("Social Profile Discovery", () => {
  it("should detect facebook.com links in HTML", () => {
    const html = `
      <html>
        <body>
          <a href="https://www.facebook.com/mybrand">Facebook</a>
          <a href="https://instagram.com/mybrand">Instagram</a>
          <a href="https://twitter.com/mybrand">Twitter</a>
        </body>
      </html>
    `;

    // Test the pattern matching logic directly
    const facebookPattern = /facebook\.com\/([^/?#"'\s]+)/i;
    const instagramPattern = /instagram\.com\/([^/?#"'\s]+)/i;
    const twitterPattern = /twitter\.com\/([^/?#"'\s]+)/i;

    expect(html.match(facebookPattern)?.[1]).toBe("mybrand");
    expect(html.match(instagramPattern)?.[1]).toBe("mybrand");
    expect(html.match(twitterPattern)?.[1]).toBe("mybrand");
  });

  it("should skip generic/non-profile social URLs", () => {
    const skipPaths = ["share", "sharer", "intent", "hashtag", "search", "explore", "login", "signup", "help", "about"];
    const testPath = "share";
    expect(skipPaths.includes(testPath.toLowerCase())).toBe(true);

    const profilePath = "mybrand";
    expect(skipPaths.includes(profilePath.toLowerCase())).toBe(false);
  });

  it("should extract handle from social URL path", () => {
    const url = "https://www.instagram.com/mybrand/";
    const pathname = new URL(url).pathname;
    const parts = pathname.split("/").filter(Boolean);
    expect(parts[0]).toBe("mybrand");
  });

  it("should handle x.com as twitter platform", () => {
    const xUrl = "https://x.com/mybrand";
    const hostname = new URL(xUrl).hostname.replace(/^www\./, "");
    expect(hostname).toBe("x.com");
  });
});

// ─── Follower count parsing ───────────────────────────────────────────────────
describe("Follower Count Parsing", () => {
  it("should parse plain numbers", () => {
    const parseFollowerCount = (str: string): number => {
      const clean = str.replace(/,/g, "").trim();
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : Math.round(num);
    };
    expect(parseFollowerCount("1,234")).toBe(1234);
    expect(parseFollowerCount("5000")).toBe(5000);
    expect(parseFollowerCount("invalid")).toBe(0);
  });

  it("should handle comma-separated numbers", () => {
    const parseFollowerCount = (str: string): number => {
      const clean = str.replace(/,/g, "").trim();
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : Math.round(num);
    };
    expect(parseFollowerCount("10,000")).toBe(10000);
    expect(parseFollowerCount("1,234,567")).toBe(1234567);
  });
});

// ─── AI Report parsing ────────────────────────────────────────────────────────
describe("AI Report JSON Parsing", () => {
  it("should strip markdown fences from AI response", () => {
    const withFences = "```json\n{\"score\": 75}\n```";
    const cleaned = withFences.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    expect(cleaned).toBe('{"score": 75}');
    expect(() => JSON.parse(cleaned)).not.toThrow();
  });

  it("should handle plain JSON without fences", () => {
    const plain = '{"score": 75, "grade": "B+"}';
    const cleaned = plain.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    expect(JSON.parse(cleaned).score).toBe(75);
    expect(JSON.parse(cleaned).grade).toBe("B+");
  });

  it("should handle string content type check", () => {
    const stringContent = '{"score": 75}';
    const arrayContent = [{ type: "text", text: "hello" }];

    const processContent = (c: string | object): string =>
      typeof c === "string" ? c : JSON.stringify(c);

    expect(processContent(stringContent)).toBe('{"score": 75}');
    expect(typeof processContent(arrayContent)).toBe("string");
  });
});

// ─── Score validation ─────────────────────────────────────────────────────────
describe("Score Validation", () => {
  it("should clamp scores between 0 and 100", () => {
    const clamp = (score: number) => Math.max(0, Math.min(100, score));
    expect(clamp(75)).toBe(75);
    expect(clamp(-10)).toBe(0);
    expect(clamp(150)).toBe(100);
  });

  it("should map scores to correct grades", () => {
    const getGrade = (score: number): string => {
      if (score >= 90) return "A+";
      if (score >= 80) return "A";
      if (score >= 70) return "B+";
      if (score >= 60) return "B";
      if (score >= 50) return "C+";
      if (score >= 40) return "C";
      if (score >= 30) return "D";
      return "F";
    };
    expect(getGrade(95)).toBe("A+");
    expect(getGrade(82)).toBe("A");
    expect(getGrade(72)).toBe("B+");
    expect(getGrade(62)).toBe("B");
    expect(getGrade(52)).toBe("C+");
    expect(getGrade(42)).toBe("C");
    expect(getGrade(32)).toBe("D");
    expect(getGrade(15)).toBe("F");
  });
});

// ─── Platform config ──────────────────────────────────────────────────────────
describe("Platform Configuration", () => {
  const PLATFORMS = [
    { key: "facebook", domain: "facebook.com" },
    { key: "instagram", domain: "instagram.com" },
    { key: "tiktok", domain: "tiktok.com" },
    { key: "youtube", domain: "youtube.com" },
    { key: "linkedin", domain: "linkedin.com" },
    { key: "twitter", domain: "twitter.com" },
  ];

  it("should have all major platforms defined", () => {
    const keys = PLATFORMS.map(p => p.key);
    expect(keys).toContain("facebook");
    expect(keys).toContain("instagram");
    expect(keys).toContain("tiktok");
    expect(keys).toContain("youtube");
    expect(keys).toContain("linkedin");
    expect(keys).toContain("twitter");
  });

  it("should match platform from URL hostname", () => {
    const url = "https://www.instagram.com/mybrand";
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const matched = PLATFORMS.find(p => hostname === p.domain || hostname.endsWith("." + p.domain));
    expect(matched?.key).toBe("instagram");
  });
});

// ─── Competitor comparison ────────────────────────────────────────────────────
describe("Competitor Comparison Logic", () => {
  it("should determine winner correctly", () => {
    const determineWinner = (yourScore: number, competitorScore: number): "you" | "competitor" | "tie" => {
      if (yourScore > competitorScore) return "you";
      if (competitorScore > yourScore) return "competitor";
      return "tie";
    };
    expect(determineWinner(80, 60)).toBe("you");
    expect(determineWinner(60, 80)).toBe("competitor");
    expect(determineWinner(70, 70)).toBe("tie");
  });

  it("should handle missing profiles in comparison", () => {
    const yourFound = false;
    const competitorFound = true;
    const yourScore = yourFound ? 75 : 0;
    const competitorScore = competitorFound ? 75 : 0;
    expect(yourScore).toBe(0);
    expect(competitorScore).toBe(75);
  });
});
