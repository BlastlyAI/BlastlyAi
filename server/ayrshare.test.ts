/**
 * Tests for AyrshareService — mock mode only (no API key required).
 * These tests verify the service behaves correctly when AYRSHARE_API_KEY is not set.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { AyrshareService, SUPPORTED_PLATFORMS } from "./ayrshare";

// Ensure no API key is set so we always test mock mode
vi.stubEnv("AYRSHARE_API_KEY", "");

describe("AyrshareService — mock mode", () => {
  let service: AyrshareService;

  beforeEach(() => {
    service = new AyrshareService();
  });

  it("should be in mock mode when AYRSHARE_API_KEY is not set", () => {
    expect(service.mockMode).toBe(true);
  });

  describe("createProfile", () => {
    it("returns a profile with a profileKey containing the workspaceId and brandName", async () => {
      const profile = await service.createProfile(42, "Genius Jungle");
      expect(profile.profileKey).toContain("42");
      expect(profile.profileKey).toContain("genius_jungle");
      expect(profile.title).toBe("Genius Jungle");
      expect(profile.created).toBeTruthy();
    });

    it("handles brand names with special characters", async () => {
      const profile = await service.createProfile(1, "My Brand & Co.");
      expect(profile.profileKey).toContain("1");
      expect(profile.title).toBe("My Brand & Co.");
    });
  });

  describe("publishPost", () => {
    it("returns success with mock post IDs for each platform", async () => {
      const result = await service.publishPost(
        "mock_profile_key",
        ["facebook", "instagram", "twitter"],
        "Hello world! This is a test post.",
      );
      expect(result.status).toBe("success");
      expect(result.errors).toEqual({});
      expect(result.postIds).toHaveProperty("facebook");
      expect(result.postIds).toHaveProperty("instagram");
      expect(result.postIds).toHaveProperty("twitter");
      expect(result.postIds.facebook).toMatch(/^mock_facebook_/);
      expect(result.postIds.instagram).toMatch(/^mock_instagram_/);
    });

    it("handles media URLs without error", async () => {
      const result = await service.publishPost(
        "mock_key",
        ["linkedin"],
        "Check out this photo!",
        ["https://example.com/photo.jpg"],
      );
      expect(result.status).toBe("success");
      expect(result.postIds).toHaveProperty("linkedin");
    });

    it("handles scheduled posts without error", async () => {
      const result = await service.publishPost(
        "mock_key",
        ["tiktok"],
        "Scheduled post content",
        undefined,
        new Date(Date.now() + 86400000).toISOString(),
      );
      expect(result.status).toBe("success");
    });

    it("returns unique post IDs for each platform", async () => {
      const result = await service.publishPost(
        "mock_key",
        ["facebook", "instagram"],
        "Test post",
      );
      expect(result.postIds.facebook).not.toBe(result.postIds.instagram);
    });
  });

  describe("getAnalytics", () => {
    it("returns analytics for all supported platforms", async () => {
      const analytics = await service.getAnalytics("mock_profile_key");
      expect(analytics.length).toBe(SUPPORTED_PLATFORMS.length);
    });

    it("each analytics entry has the required fields", async () => {
      const analytics = await service.getAnalytics("mock_profile_key");
      for (const entry of analytics) {
        expect(entry).toHaveProperty("platform");
        expect(entry).toHaveProperty("followers");
        expect(entry).toHaveProperty("likes");
        expect(entry).toHaveProperty("comments");
        expect(entry).toHaveProperty("shares");
        expect(entry).toHaveProperty("impressions");
        expect(entry).toHaveProperty("reach");
        expect(entry).toHaveProperty("engagementRate");
        expect(entry.followers).toBeGreaterThanOrEqual(500);
        expect(entry.engagementRate).toBeGreaterThan(0);
        expect(entry.engagementRate).toBeLessThan(10);
      }
    });

    it("includes all 13 supported platforms", async () => {
      const analytics = await service.getAnalytics("mock_key");
      const platforms = analytics.map((a) => a.platform);
      for (const p of SUPPORTED_PLATFORMS) {
        expect(platforms).toContain(p);
      }
    });
  });

  describe("deletePost", () => {
    it("returns success with the provided post IDs", async () => {
      const result = await service.deletePost("mock_key", ["post_abc", "post_def"]);
      expect(result.status).toBe("success");
      expect(result.deletedIds).toEqual(["post_abc", "post_def"]);
    });
  });

  describe("deleteProfile", () => {
    it("resolves without error", async () => {
      await expect(service.deleteProfile("mock_key")).resolves.toBeUndefined();
    });
  });

  describe("getConnectedPlatforms", () => {
    it("returns all 13 platforms in mock mode", async () => {
      const platforms = await service.getConnectedPlatforms("mock_key");
      expect(platforms.length).toBe(SUPPORTED_PLATFORMS.length);
      for (const p of SUPPORTED_PLATFORMS) {
        expect(platforms).toContain(p);
      }
    });
  });
});

describe("SUPPORTED_PLATFORMS", () => {
  it("includes all 13 required platforms", () => {
    const required = [
      "facebook", "instagram", "tiktok", "twitter", "linkedin",
      "pinterest", "youtube", "bluesky", "reddit", "threads",
      "snapchat", "telegram", "gmb",
    ];
    for (const p of required) {
      expect(SUPPORTED_PLATFORMS).toContain(p);
    }
  });

  it("has exactly 13 platforms", () => {
    expect(SUPPORTED_PLATFORMS.length).toBe(13);
  });
});
