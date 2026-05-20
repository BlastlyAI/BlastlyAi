/**
 * AyrshareService
 *
 * Wraps the Ayrshare social media API (https://app.ayrshare.com/api/).
 * When AYRSHARE_API_KEY is not set the service runs in MOCK MODE, returning
 * realistic fake responses so the entire platform can be developed and tested
 * without paying for an Ayrshare subscription.
 *
 * Switch to live mode by setting the AYRSHARE_API_KEY environment variable.
 */

const AYRSHARE_BASE = "https://app.ayrshare.com/api";

export const SUPPORTED_PLATFORMS = [
  "facebook",
  "instagram",
  "tiktok",
  "twitter",
  "linkedin",
  "pinterest",
  "youtube",
  "bluesky",
  "reddit",
  "threads",
  "snapchat",
  "telegram",
  "gmb", // Google Business Profile
] as const;

export type Platform = (typeof SUPPORTED_PLATFORMS)[number];

// ─── Response shapes ─────────────────────────────────────────────────────────

export interface AyrshareProfile {
  profileKey: string;
  title: string;
  created: string;
}

export interface PostResult {
  status: "success" | "error";
  postIds: Record<Platform, string>;
  errors: Record<string, string>;
  postUrl?: string;
}

export interface AnalyticsResult {
  platform: Platform;
  followers: number;
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  reach: number;
  engagementRate: number;
}

export interface DeleteResult {
  status: "success" | "error";
  deletedIds: string[];
}

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function mockProfileKey(workspaceId: number, brandName: string): string {
  return `mock_${workspaceId}_${brandName.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;
}

function mockPostId(platform: Platform): string {
  return `mock_${platform}_${Math.random().toString(36).slice(2, 10)}`;
}

function mockAnalytics(platform: Platform): AnalyticsResult {
  const base = Math.floor(Math.random() * 5000) + 500;
  return {
    platform,
    followers: base,
    likes: Math.floor(base * 0.08),
    comments: Math.floor(base * 0.02),
    shares: Math.floor(base * 0.01),
    impressions: Math.floor(base * 3.5),
    reach: Math.floor(base * 2.1),
    engagementRate: parseFloat((Math.random() * 4 + 1).toFixed(2)),
  };
}

// ─── Service class ────────────────────────────────────────────────────────────

export class AyrshareService {
  private apiKey: string | undefined;
  public readonly mockMode: boolean;

  constructor() {
    this.apiKey = process.env.AYRSHARE_API_KEY;
    this.mockMode = !this.apiKey;
    if (this.mockMode) {
      console.log("[Ayrshare] Running in MOCK MODE — no API key set");
    }
  }

  // ── Profile management ───────────────────────────────────────────────────

  /**
   * Create a new Ayrshare profile for a client workspace.
   * In live mode this provisions a new sub-profile on the Ayrshare account.
   */
  async createProfile(
    workspaceId: number,
    brandName: string
  ): Promise<AyrshareProfile> {
    if (this.mockMode) {
      return {
        profileKey: mockProfileKey(workspaceId, brandName),
        title: brandName,
        created: new Date().toISOString(),
      };
    }

    const res = await fetch(`${AYRSHARE_BASE}/profiles/profile`, {
      method: "POST",
      headers: this._headers(),
      body: JSON.stringify({ title: brandName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Ayrshare createProfile error: ${data.message}`);
    return {
      profileKey: data.profileKey,
      title: data.title,
      created: data.created,
    };
  }

  /**
   * Delete an Ayrshare profile (e.g., when a client cancels).
   */
  async deleteProfile(profileKey: string): Promise<void> {
    if (this.mockMode) {
      console.log(`[Ayrshare MOCK] deleteProfile: ${profileKey}`);
      return;
    }
    const res = await fetch(`${AYRSHARE_BASE}/profiles/profile`, {
      method: "DELETE",
      headers: this._headers(),
      body: JSON.stringify({ profileKey }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(`Ayrshare deleteProfile error: ${data.message}`);
    }
  }

  // ── Publishing ───────────────────────────────────────────────────────────

  /**
   * Publish a post to one or more platforms.
   * @param profileKey  Ayrshare profile key for the client workspace
   * @param platforms   Array of platform slugs to post to
   * @param text        Post caption / body text
   * @param mediaUrls   Optional array of image/video URLs
   * @param scheduleAt  Optional ISO datetime to schedule the post
   */
  async publishPost(
    profileKey: string,
    platforms: Platform[],
    text: string,
    mediaUrls?: string[],
    scheduleAt?: string
  ): Promise<PostResult> {
    if (this.mockMode) {
      const postIds = Object.fromEntries(
        platforms.map((p) => [p, mockPostId(p)])
      ) as Record<Platform, string>;
      console.log(
        `[Ayrshare MOCK] publishPost to ${platforms.join(", ")} — "${text.slice(0, 60)}..."`
      );
      return { status: "success", postIds, errors: {} };
    }

    const body: Record<string, unknown> = {
      post: text,
      platforms,
      profileKey,
    };
    if (mediaUrls?.length) body.mediaUrls = mediaUrls;
    if (scheduleAt) body.scheduleDate = scheduleAt;

    const res = await fetch(`${AYRSHARE_BASE}/post`, {
      method: "POST",
      headers: this._headers(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Ayrshare publishPost error: ${data.message}`);

    // Normalise the per-platform response
    const postIds: Partial<Record<Platform, string>> = {};
    const errors: Record<string, string> = {};
    for (const p of platforms) {
      const entry = data.postIds?.[p];
      if (entry?.id) postIds[p as Platform] = entry.id;
      else if (entry?.error) errors[p] = entry.error;
    }
    return {
      status: "success",
      postIds: postIds as Record<Platform, string>,
      errors,
      postUrl: data.postUrl,
    };
  }

  // ── Analytics ────────────────────────────────────────────────────────────

  /**
   * Fetch engagement analytics for a profile across all connected platforms.
   */
  async getAnalytics(profileKey: string): Promise<AnalyticsResult[]> {
    if (this.mockMode) {
      return SUPPORTED_PLATFORMS.map(mockAnalytics);
    }

    const res = await fetch(
      `${AYRSHARE_BASE}/analytics/social?profileKey=${encodeURIComponent(profileKey)}`,
      { headers: this._headers() }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(`Ayrshare getAnalytics error: ${data.message}`);

    // Map Ayrshare analytics response to our shape
    return (data.analytics ?? []).map((entry: Record<string, unknown>) => ({
      platform: entry.platform as Platform,
      followers: Number(entry.followers ?? 0),
      likes: Number(entry.likes ?? 0),
      comments: Number(entry.comments ?? 0),
      shares: Number(entry.shares ?? 0),
      impressions: Number(entry.impressions ?? 0),
      reach: Number(entry.reach ?? 0),
      engagementRate: Number(entry.engagementRate ?? 0),
    }));
  }

  // ── Post management ──────────────────────────────────────────────────────

  /**
   * Delete one or more posts from platforms.
   */
  async deletePost(
    profileKey: string,
    postIds: string[]
  ): Promise<DeleteResult> {
    if (this.mockMode) {
      console.log(
        `[Ayrshare MOCK] deletePost: ${postIds.join(", ")} on profile ${profileKey}`
      );
      return { status: "success", deletedIds: postIds };
    }

    const res = await fetch(`${AYRSHARE_BASE}/post`, {
      method: "DELETE",
      headers: this._headers(),
      body: JSON.stringify({ id: postIds, profileKey }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Ayrshare deletePost error: ${data.message}`);
    return { status: "success", deletedIds: postIds };
  }

  // ── Connected platforms ──────────────────────────────────────────────────

  /**
   * List which platforms are connected for a given profile.
   */
  async getConnectedPlatforms(profileKey: string): Promise<Platform[]> {
    if (this.mockMode) {
      // In mock mode, pretend all platforms are connected
      return [...SUPPORTED_PLATFORMS];
    }

    const res = await fetch(
      `${AYRSHARE_BASE}/user?profileKey=${encodeURIComponent(profileKey)}`,
      { headers: this._headers() }
    );
    const data = await res.json();
    if (!res.ok)
      throw new Error(`Ayrshare getConnectedPlatforms error: ${data.message}`);
    return (data.activeSocialAccounts ?? []) as Platform[];
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private _headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }
}

// Singleton instance — import this throughout the server
export const ayrshare = new AyrshareService();
