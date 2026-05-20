/**
 * SocialProvider — Aggregator Abstraction Layer
 *
 * This file is the ONLY place in the codebase that knows which aggregator
 * (Zernio, Ayrshare, or future providers) is being used. All other server
 * code imports from here, never directly from ayrshare.ts or zernio.ts.
 *
 * To switch providers:
 *   1. Set SOCIAL_PROVIDER env var to "zernio" | "ayrshare" (default: "zernio")
 *   2. Ensure the corresponding API key env var is set
 *   3. That's it — no other code changes needed
 *
 * Switching cost: ~2 days of backend work if migrating existing profiles.
 * Client reconnection: clients will need to re-authorise their social accounts
 * once when switching providers (unavoidable — tokens are provider-specific).
 */

// ─── Shared types ─────────────────────────────────────────────────────────────

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

export interface SocialProfile {
  profileKey: string;
  title: string;
  created: string;
}

export interface PostResult {
  status: "success" | "error";
  postIds: Partial<Record<Platform, string>>;
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

/**
 * The contract every provider must implement.
 * Adding a new provider = implement this interface + register below.
 */
export interface ISocialProvider {
  readonly providerName: string;
  readonly mockMode: boolean;

  /** Create a sub-profile for a client workspace */
  createProfile(workspaceId: number, brandName: string): Promise<SocialProfile>;

  /** Delete a client profile (e.g. on cancellation) */
  deleteProfile(profileKey: string): Promise<void>;

  /**
   * Generate a JWT/SSO URL that opens the provider's hosted social-linking page.
   * The client clicks a button in Blastly → new tab opens → they log into their
   * social accounts → tab closes → accounts are connected.
   */
  generateLinkingUrl(profileKey: string, redirectUrl?: string): Promise<string>;

  /** Publish a post to one or more platforms */
  publishPost(
    profileKey: string,
    platforms: Platform[],
    text: string,
    mediaUrls?: string[],
    scheduleAt?: string
  ): Promise<PostResult>;

  /** Get analytics for a profile */
  getAnalytics(profileKey: string): Promise<AnalyticsResult[]>;

  /** List which platforms are currently connected for a profile */
  getConnectedPlatforms(profileKey: string): Promise<Platform[]>;

  /** Delete a post */
  deletePost(profileKey: string, postIds: string[]): Promise<DeleteResult>;
}

// ─── Mock helpers (shared across providers) ───────────────────────────────────

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

// ─── Zernio Provider ──────────────────────────────────────────────────────────

const ZERNIO_BASE = "https://api.zernio.com/v1";

class ZernioProvider implements ISocialProvider {
  readonly providerName = "zernio";
  private apiKey: string | undefined;
  readonly mockMode: boolean;

  constructor() {
    this.apiKey = process.env.ZERNIO_API_KEY;
    this.mockMode = !this.apiKey;
    if (this.mockMode) {
      console.log("[SocialProvider/Zernio] Running in MOCK MODE — set ZERNIO_API_KEY to go live");
    } else {
      console.log("[SocialProvider/Zernio] Live mode — Zernio API key detected");
    }
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  async createProfile(workspaceId: number, brandName: string): Promise<SocialProfile> {
    if (this.mockMode) {
      return {
        profileKey: mockProfileKey(workspaceId, brandName),
        title: brandName,
        created: new Date().toISOString(),
      };
    }
    // Zernio: POST /profiles
    const res = await fetch(`${ZERNIO_BASE}/profiles`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ name: brandName, metadata: { workspaceId } }),
    });
    const data = await res.json() as any;
    if (!res.ok) throw new Error(`Zernio createProfile error: ${data.message ?? res.status}`);
    return {
      profileKey: data.id ?? data.profileKey,
      title: data.name ?? brandName,
      created: data.createdAt ?? new Date().toISOString(),
    };
  }

  async deleteProfile(profileKey: string): Promise<void> {
    if (this.mockMode) {
      console.log(`[Zernio MOCK] deleteProfile: ${profileKey}`);
      return;
    }
    const res = await fetch(`${ZERNIO_BASE}/profiles/${profileKey}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!res.ok) {
      const data = await res.json() as any;
      throw new Error(`Zernio deleteProfile error: ${data.message ?? res.status}`);
    }
  }

  async generateLinkingUrl(profileKey: string, redirectUrl?: string): Promise<string> {
    if (this.mockMode) {
      // In mock mode return a placeholder URL so the UI can be built and tested
      return `https://mock-social-linking.blastly.ai/connect?profile=${profileKey}&redirect=${encodeURIComponent(redirectUrl ?? "")}`;
    }
    // Zernio: POST /profiles/{id}/linking-url
    const res = await fetch(`${ZERNIO_BASE}/profiles/${profileKey}/linking-url`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ redirectUrl }),
    });
    const data = await res.json() as any;
    if (!res.ok) throw new Error(`Zernio generateLinkingUrl error: ${data.message ?? res.status}`);
    return data.url ?? data.linkingUrl;
  }

  async publishPost(
    profileKey: string,
    platforms: Platform[],
    text: string,
    mediaUrls?: string[],
    scheduleAt?: string
  ): Promise<PostResult> {
    if (this.mockMode) {
      const postIds = Object.fromEntries(platforms.map((p) => [p, mockPostId(p)])) as Record<Platform, string>;
      console.log(`[Zernio MOCK] publishPost to ${platforms.join(", ")} — "${text.slice(0, 60)}..."`);
      return { status: "success", postIds, errors: {} };
    }
    const body: Record<string, unknown> = {
      profileId: profileKey,
      platforms,
      text,
    };
    if (mediaUrls?.length) body.mediaUrls = mediaUrls;
    if (scheduleAt) body.scheduledAt = scheduleAt;

    const res = await fetch(`${ZERNIO_BASE}/posts`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    const data = await res.json() as any;
    if (!res.ok) throw new Error(`Zernio publishPost error: ${data.message ?? res.status}`);

    const postIds: Partial<Record<Platform, string>> = {};
    const errors: Record<string, string> = {};
    for (const p of platforms) {
      const entry = data.results?.[p];
      if (entry?.id) postIds[p] = entry.id;
      else if (entry?.error) errors[p] = entry.error;
    }
    return { status: "success", postIds, errors, postUrl: data.postUrl };
  }

  async getAnalytics(profileKey: string): Promise<AnalyticsResult[]> {
    if (this.mockMode) return SUPPORTED_PLATFORMS.map(mockAnalytics);
    const res = await fetch(`${ZERNIO_BASE}/profiles/${profileKey}/analytics`, {
      headers: this.headers(),
    });
    const data = await res.json() as any;
    if (!res.ok) throw new Error(`Zernio getAnalytics error: ${data.message ?? res.status}`);
    return (data.analytics ?? []).map((entry: any) => ({
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

  async getConnectedPlatforms(profileKey: string): Promise<Platform[]> {
    if (this.mockMode) return [...SUPPORTED_PLATFORMS];
    const res = await fetch(`${ZERNIO_BASE}/profiles/${profileKey}/connections`, {
      headers: this.headers(),
    });
    const data = await res.json() as any;
    if (!res.ok) throw new Error(`Zernio getConnectedPlatforms error: ${data.message ?? res.status}`);
    return (data.connected ?? []) as Platform[];
  }

  async deletePost(profileKey: string, postIds: string[]): Promise<DeleteResult> {
    if (this.mockMode) {
      console.log(`[Zernio MOCK] deletePost: ${postIds.join(", ")} on profile ${profileKey}`);
      return { status: "success", deletedIds: postIds };
    }
    const res = await fetch(`${ZERNIO_BASE}/posts`, {
      method: "DELETE",
      headers: this.headers(),
      body: JSON.stringify({ profileId: profileKey, postIds }),
    });
    const data = await res.json() as any;
    if (!res.ok) throw new Error(`Zernio deletePost error: ${data.message ?? res.status}`);
    return { status: "success", deletedIds: postIds };
  }
}

// ─── Ayrshare Provider (fallback / future migration) ─────────────────────────

const AYRSHARE_BASE = "https://app.ayrshare.com/api";

class AyrshareProvider implements ISocialProvider {
  readonly providerName = "ayrshare";
  private apiKey: string | undefined;
  readonly mockMode: boolean;

  constructor() {
    this.apiKey = process.env.AYRSHARE_API_KEY;
    this.mockMode = !this.apiKey;
    if (this.mockMode) {
      console.log("[SocialProvider/Ayrshare] Running in MOCK MODE — set AYRSHARE_API_KEY to go live");
    } else {
      console.log("[SocialProvider/Ayrshare] Live mode — Ayrshare API key detected");
    }
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  async createProfile(workspaceId: number, brandName: string): Promise<SocialProfile> {
    if (this.mockMode) {
      return { profileKey: mockProfileKey(workspaceId, brandName), title: brandName, created: new Date().toISOString() };
    }
    const res = await fetch(`${AYRSHARE_BASE}/profiles/profile`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ title: brandName }),
    });
    const data = await res.json() as any;
    if (!res.ok) throw new Error(`Ayrshare createProfile error: ${data.message}`);
    return { profileKey: data.profileKey, title: data.title, created: data.created };
  }

  async deleteProfile(profileKey: string): Promise<void> {
    if (this.mockMode) { console.log(`[Ayrshare MOCK] deleteProfile: ${profileKey}`); return; }
    const res = await fetch(`${AYRSHARE_BASE}/profiles/profile`, {
      method: "DELETE",
      headers: this.headers(),
      body: JSON.stringify({ profileKey }),
    });
    if (!res.ok) { const data = await res.json() as any; throw new Error(`Ayrshare deleteProfile error: ${data.message}`); }
  }

  async generateLinkingUrl(profileKey: string, redirectUrl?: string): Promise<string> {
    if (this.mockMode) {
      return `https://mock-social-linking.blastly.ai/connect?profile=${profileKey}&provider=ayrshare`;
    }
    // Ayrshare: POST /profiles/generateJWT
    const res = await fetch(`${AYRSHARE_BASE}/profiles/generateJWT`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ profileKey, ...(redirectUrl ? { redirect: redirectUrl } : {}) }),
    });
    const data = await res.json() as any;
    if (!res.ok) throw new Error(`Ayrshare generateJWT error: ${data.message}`);
    return data.url;
  }

  async publishPost(profileKey: string, platforms: Platform[], text: string, mediaUrls?: string[], scheduleAt?: string): Promise<PostResult> {
    if (this.mockMode) {
      const postIds = Object.fromEntries(platforms.map((p) => [p, mockPostId(p)])) as Record<Platform, string>;
      return { status: "success", postIds, errors: {} };
    }
    const body: Record<string, unknown> = { post: text, platforms, profileKey };
    if (mediaUrls?.length) body.mediaUrls = mediaUrls;
    if (scheduleAt) body.scheduleDate = scheduleAt;
    const res = await fetch(`${AYRSHARE_BASE}/post`, { method: "POST", headers: this.headers(), body: JSON.stringify(body) });
    const data = await res.json() as any;
    if (!res.ok) throw new Error(`Ayrshare publishPost error: ${data.message}`);
    const postIds: Partial<Record<Platform, string>> = {};
    const errors: Record<string, string> = {};
    for (const p of platforms) {
      const entry = data.postIds?.[p];
      if (entry?.id) postIds[p] = entry.id;
      else if (entry?.error) errors[p] = entry.error;
    }
    return { status: "success", postIds, errors, postUrl: data.postUrl };
  }

  async getAnalytics(profileKey: string): Promise<AnalyticsResult[]> {
    if (this.mockMode) return SUPPORTED_PLATFORMS.map(mockAnalytics);
    const res = await fetch(`${AYRSHARE_BASE}/analytics/social?profileKey=${encodeURIComponent(profileKey)}`, { headers: this.headers() });
    const data = await res.json() as any;
    if (!res.ok) throw new Error(`Ayrshare getAnalytics error: ${data.message}`);
    return (data.analytics ?? []).map((entry: any) => ({
      platform: entry.platform as Platform, followers: Number(entry.followers ?? 0),
      likes: Number(entry.likes ?? 0), comments: Number(entry.comments ?? 0),
      shares: Number(entry.shares ?? 0), impressions: Number(entry.impressions ?? 0),
      reach: Number(entry.reach ?? 0), engagementRate: Number(entry.engagementRate ?? 0),
    }));
  }

  async getConnectedPlatforms(profileKey: string): Promise<Platform[]> {
    if (this.mockMode) return [...SUPPORTED_PLATFORMS];
    const res = await fetch(`${AYRSHARE_BASE}/user?profileKey=${encodeURIComponent(profileKey)}`, { headers: this.headers() });
    const data = await res.json() as any;
    if (!res.ok) throw new Error(`Ayrshare getConnectedPlatforms error: ${data.message}`);
    return (data.activeSocialAccounts ?? []) as Platform[];
  }

  async deletePost(profileKey: string, postIds: string[]): Promise<DeleteResult> {
    if (this.mockMode) return { status: "success", deletedIds: postIds };
    const res = await fetch(`${AYRSHARE_BASE}/post`, { method: "DELETE", headers: this.headers(), body: JSON.stringify({ id: postIds, profileKey }) });
    const data = await res.json() as any;
    if (!res.ok) throw new Error(`Ayrshare deletePost error: ${data.message}`);
    return { status: "success", deletedIds: postIds };
  }
}

// ─── Provider factory — single config point ───────────────────────────────────

function createProvider(): ISocialProvider {
  const providerName = (process.env.SOCIAL_PROVIDER ?? "zernio").toLowerCase();
  switch (providerName) {
    case "ayrshare":
      return new AyrshareProvider();
    case "zernio":
    default:
      return new ZernioProvider();
  }
}

/**
 * The singleton social provider instance.
 * Import this everywhere instead of ayrshare.ts.
 *
 * @example
 * import { socialProvider } from "../socialProvider";
 * const profile = await socialProvider.createProfile(workspaceId, brandName);
 */
export const socialProvider = createProvider();
