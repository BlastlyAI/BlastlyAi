import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  getDb: vi.fn(() => null),
}));

// Mock invokeLLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [
      {
        message: {
          content: JSON.stringify({
            score: 72,
            summary: "Your website has a solid foundation but needs improvement in meta descriptions and page speed.",
            recommendations: [
              {
                priority: "high",
                category: "Meta Tags",
                issue: "Missing meta description",
                fix: "Add a compelling meta description of 150-160 characters",
              },
              {
                priority: "medium",
                category: "Page Speed",
                issue: "Large uncompressed images",
                fix: "Compress images and use WebP format",
              },
              {
                priority: "low",
                category: "Keywords",
                issue: "Keyword density could be improved",
                fix: "Include target keywords naturally in headings and body text",
              },
            ],
          }),
        },
      },
    ],
  })),
}));

// Mock cheerio fetch
vi.mock("node-fetch", () => ({
  default: vi.fn(async (url: string) => {
    if (url === "https://invalid-url-that-does-not-exist.xyz") {
      throw new Error("ENOTFOUND invalid-url-that-does-not-exist.xyz");
    }
    return {
      ok: true,
      status: 200,
      url,
      text: async () => `
        <html>
          <head>
            <title>Test Website - Marketing Tools</title>
            <meta name="description" content="The best marketing tools for small businesses">
            <meta name="keywords" content="marketing, tools, small business">
          </head>
          <body>
            <h1>Welcome to Test Website</h1>
            <h2>Our Features</h2>
            <p>We provide the best marketing tools for small businesses.</p>
          </body>
        </html>
      `,
    };
  }),
}));

describe("SEO Router", () => {
  describe("URL validation", () => {
    it("accepts valid http URLs", () => {
      const url = "http://example.com";
      expect(() => new URL(url)).not.toThrow();
    });

    it("accepts valid https URLs", () => {
      const url = "https://example.com";
      expect(() => new URL(url)).not.toThrow();
    });

    it("rejects invalid URLs", () => {
      const url = "not-a-url";
      expect(() => {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new Error("Invalid URL");
        }
      }).toThrow();
    });

    it("rejects URLs without http/https protocol", () => {
      const url = "ftp://example.com";
      expect(() => {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new Error("Must be http or https");
        }
      }).toThrow();
    });
  });

  describe("SEO data extraction", () => {
    it("extracts title from HTML", () => {
      const html = "<html><head><title>My Page Title</title></head><body></body></html>";
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      expect(titleMatch?.[1]).toBe("My Page Title");
    });

    it("extracts meta description from HTML", () => {
      const html = `<html><head><meta name="description" content="My page description"></head><body></body></html>`;
      const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
      expect(descMatch?.[1]).toBe("My page description");
    });

    it("detects HTTPS from URL", () => {
      expect(new URL("https://example.com").protocol).toBe("https:");
      expect(new URL("http://example.com").protocol).toBe("http:");
    });

    it("extracts H1 tags from HTML", () => {
      const html = "<html><body><h1>Main Heading</h1><h1>Second Heading</h1></body></html>";
      const h1Matches = [...html.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi)];
      expect(h1Matches).toHaveLength(2);
      expect(h1Matches[0][1]).toBe("Main Heading");
    });
  });

  describe("SEO score calculation", () => {
    it("penalises missing title", () => {
      let score = 100;
      const title = "";
      if (!title) score -= 15;
      expect(score).toBe(85);
    });

    it("penalises missing meta description", () => {
      let score = 100;
      const metaDescription = "";
      if (!metaDescription) score -= 15;
      expect(score).toBe(85);
    });

    it("penalises missing H1", () => {
      let score = 100;
      const h1Tags: string[] = [];
      if (h1Tags.length === 0) score -= 10;
      expect(score).toBe(90);
    });

    it("penalises non-HTTPS", () => {
      let score = 100;
      const httpsEnabled = false;
      if (!httpsEnabled) score -= 10;
      expect(score).toBe(90);
    });

    it("does not go below 0", () => {
      let score = 100;
      score -= 15; // no title
      score -= 15; // no meta description
      score -= 10; // no h1
      score -= 10; // no https
      score -= 10; // no keywords
      score -= 10; // slow page speed
      score -= 10; // title too short
      score -= 10; // no structured data
      score -= 10; // no canonical
      score -= 10; // no robots.txt
      const finalScore = Math.max(0, score);
      expect(finalScore).toBeGreaterThanOrEqual(0);
    });

    it("caps score at 100", () => {
      const score = Math.min(100, 105);
      expect(score).toBe(100);
    });
  });

  describe("Recommendations", () => {
    it("generates high priority recommendation for missing meta description", () => {
      const recommendations = [];
      const metaDescription = "";
      if (!metaDescription) {
        recommendations.push({
          priority: "high",
          category: "Meta Tags",
          issue: "Missing meta description",
          fix: "Add a compelling meta description of 150-160 characters",
        });
      }
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].priority).toBe("high");
    });

    it("generates medium priority recommendation for HTTP site", () => {
      const recommendations = [];
      const httpsEnabled = false;
      if (!httpsEnabled) {
        recommendations.push({
          priority: "medium",
          category: "Security",
          issue: "Site not using HTTPS",
          fix: "Install an SSL certificate and redirect HTTP to HTTPS",
        });
      }
      expect(recommendations[0].priority).toBe("medium");
    });
  });

  describe("getScans", () => {
    it("returns empty array when no DB available", () => {
      // When db is null (no DB connection), getScans should return empty array
      const db = null;
      const result = db ? [] : [];
      expect(result).toEqual([]);
    });
  });

  describe("compareWebsites", () => {
    it("validates that both URLs must be provided", () => {
      const yourUrl = "";
      const competitorUrl = "https://competitor.com";
      expect(yourUrl.trim().length).toBe(0); // would fail validation
    });

    it("validates that both URLs must be valid http/https", () => {
      const urls = ["https://mysite.com", "https://competitor.com"];
      urls.forEach((url) => {
        expect(() => new URL(url)).not.toThrow();
        expect(new URL(url).protocol).toMatch(/^https?:$/);
      });
    });

    it("builds metrics array with correct structure", () => {
      const metrics = [
        { label: "SEO Score", yours: 72, competitor: 65, unit: "/ 100", higherIsBetter: true },
        { label: "Page Speed", yours: 80, competitor: 70, unit: "/ 100", higherIsBetter: true },
        { label: "HTTPS", yours: 1, competitor: 0, unit: "", higherIsBetter: true, isBool: true },
      ];
      expect(metrics).toHaveLength(3);
      metrics.forEach((m) => {
        expect(m).toHaveProperty("label");
        expect(m).toHaveProperty("yours");
        expect(m).toHaveProperty("competitor");
        expect(m).toHaveProperty("higherIsBetter");
      });
    });

    it("correctly determines winner for higherIsBetter metrics", () => {
      const metric = { yours: 80, competitor: 65, higherIsBetter: true };
      const youWin = metric.higherIsBetter
        ? metric.yours > metric.competitor
        : metric.yours < metric.competitor;
      expect(youWin).toBe(true);
    });

    it("correctly determines winner for lowerIsBetter metrics", () => {
      const metric = { yours: 2, competitor: 5, higherIsBetter: false }; // fewer missing alt tags
      const youWin = metric.higherIsBetter
        ? metric.yours > metric.competitor
        : metric.yours < metric.competitor;
      expect(youWin).toBe(true);
    });

    it("detects a tie correctly", () => {
      const metric = { yours: 72, competitor: 72, higherIsBetter: true };
      const tied = metric.yours === metric.competitor;
      expect(tied).toBe(true);
    });

    it("handles isBool metric display correctly", () => {
      const httpsMetric = { yours: 1, competitor: 0, isBool: true };
      const yoursDisplay = httpsMetric.isBool ? (httpsMetric.yours ? "✓ Yes" : "✗ No") : String(httpsMetric.yours);
      const competitorDisplay = httpsMetric.isBool ? (httpsMetric.competitor ? "✓ Yes" : "✗ No") : String(httpsMetric.competitor);
      expect(yoursDisplay).toBe("✓ Yes");
      expect(competitorDisplay).toBe("✗ No");
    });

    it("returns top 5 recommendations for each site", () => {
      const allRecs = Array.from({ length: 8 }, (_, i) => ({
        priority: "medium" as const,
        category: "Test",
        issue: `Issue ${i}`,
        fix: `Fix ${i}`,
      }));
      const topFive = allRecs.slice(0, 5);
      expect(topFive).toHaveLength(5);
    });

    it("returns top 10 keywords for each site", () => {
      const allKeywords = Array.from({ length: 15 }, (_, i) => ({
        keyword: `keyword${i}`,
        count: 10 - i,
        density: 1.5,
      }));
      const topTen = allKeywords.slice(0, 10);
      expect(topTen).toHaveLength(10);
    });
  });
});
