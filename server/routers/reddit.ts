import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  upsertSocialAccount,
  getSocialAccounts,
  disconnectSocialAccount,
  getWorkspaceById,
  getMemberRole,
} from "../db";

// Helper: get social account by platform for a workspace
async function getSocialAccountByPlatform(workspaceId: number, platform: string) {
  const accounts = await getSocialAccounts(workspaceId);
  return accounts.find((a) => a.platform === platform) ?? null;
}

const REDDIT_ADS_BASE = "https://ads-api.reddit.com/api/v2.0";
const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";

async function getRedditAccessToken(clientId: string, clientSecret: string, username: string, password: string): Promise<string> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(REDDIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Blastly/1.0",
    },
    body: new URLSearchParams({
      grant_type: "password",
      username,
      password,
    }),
  });
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: `Reddit OAuth error: ${data.error ?? "unknown"}`,
    });
  }
  return data.access_token;
}

async function redditRequest(
  endpoint: string,
  accessToken: string,
  method: "GET" | "POST" | "PATCH" = "GET",
  body?: object
) {
  const url = `${REDDIT_ADS_BASE}${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": "Blastly/1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Reddit Ads API error ${res.status}: ${err}`,
    });
  }

  return res.json() as Promise<unknown>;
}

export const redditRouter = router({
  // Connect Reddit Ads account
  connect: protectedProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        clientId: z.string().min(1),
        clientSecret: z.string().min(1),
        username: z.string().min(1),
        password: z.string().min(1),
        adAccountId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN", message: "Not a workspace member" });

      // Verify credentials by getting an access token
      const accessToken = await getRedditAccessToken(
        input.clientId,
        input.clientSecret,
        input.username,
        input.password
      );

      // Try to fetch the ad account to verify adAccountId
      let accountName = `Reddit Ads (${input.username})`;
      try {
        const acctData = await redditRequest(
          `/accounts/${input.adAccountId}`,
          accessToken
        ) as { data?: { name?: string } };
        if (acctData?.data?.name) {
          accountName = acctData.data.name;
        }
      } catch {
        // Account fetch may fail in sandbox — credentials still valid
      }

      await upsertSocialAccount({
        userId: ctx.user.id,
        workspaceId: input.workspaceId,
        platform: "reddit",
        platformAccountId: input.adAccountId,
        platformUsername: input.username,
        platformDisplayName: accountName,
        accessToken: JSON.stringify({
          clientId: input.clientId,
          clientSecret: input.clientSecret,
          username: input.username,
          password: input.password,
          adAccountId: input.adAccountId,
        }),
      });

      return { success: true, accountName };
    }),

  // Get connection status
  getConnection: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN", message: "Not a workspace member" });
      const account = await getSocialAccountByPlatform(input.workspaceId, "reddit");
      if (!account) return null;
      const creds = JSON.parse(account.accessToken || "{}") as {
        username?: string;
        adAccountId?: string;
      };
      return {
        connected: true,
        displayName: account.platformDisplayName,
        username: creds.username,
        adAccountId: creds.adAccountId,
        isActive: account.isActive,
      };
    }),

  // Get campaigns
  getCampaigns: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN", message: "Not a workspace member" });
      const account = await getSocialAccountByPlatform(input.workspaceId, "reddit");
      if (!account?.accessToken) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Reddit not connected" });
      }
      const creds = JSON.parse(account.accessToken) as {
        clientId: string;
        clientSecret: string;
        username: string;
        password: string;
        adAccountId: string;
      };

      try {
        const accessToken = await getRedditAccessToken(
          creds.clientId,
          creds.clientSecret,
          creds.username,
          creds.password
        );
        const data = await redditRequest(
          `/accounts/${creds.adAccountId}/campaigns`,
          accessToken
        ) as { data?: unknown[] };
        return data?.data ?? [];
      } catch {
        return [];
      }
    }),

  // Create a Reddit Ads campaign
  createCampaign: protectedProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        campaignName: z.string().min(1),
        objective: z.enum([
          "TRAFFIC",
          "CONVERSIONS",
          "VIDEO_VIEWS",
          "BRAND_AWARENESS",
          "APP_INSTALLS",
        ]),
        totalBudget: z.number().min(5), // Reddit minimum $5
        startDate: z.string(), // ISO date string
        endDate: z.string().optional(),
        // Ad Group
        adGroupName: z.string().min(1),
        // Targeting
        subreddits: z.array(z.string()).optional(),
        interests: z.array(z.string()).optional(),
        ageRange: z
          .object({
            min: z.number().min(18).max(65),
            max: z.number().min(18).max(65),
          })
          .optional(),
        genders: z.array(z.enum(["MALE", "FEMALE", "UNKNOWN"])).optional(),
        locations: z.array(z.string()).optional(), // Country codes e.g. ["AU", "US"]
        // Ad creative
        adTitle: z.string().min(1).max(300),
        adText: z.string().min(1).max(10000),
        callToAction: z
          .enum([
            "LEARN_MORE",
            "SHOP_NOW",
            "SIGN_UP",
            "DOWNLOAD",
            "BOOK_NOW",
            "CONTACT_US",
            "APPLY_NOW",
            "GET_STARTED",
          ])
          .default("LEARN_MORE"),
        destinationUrl: z.string().url(),
        thumbnailUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN", message: "Not a workspace member" });
      const account = await getSocialAccountByPlatform(input.workspaceId, "reddit");
      if (!account?.accessToken) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Reddit not connected" });
      }
      const creds = JSON.parse(account.accessToken) as {
        clientId: string;
        clientSecret: string;
        username: string;
        password: string;
        adAccountId: string;
      };

      const accessToken = await getRedditAccessToken(
        creds.clientId,
        creds.clientSecret,
        creds.username,
        creds.password
      );

      // Step 1: Create campaign
      const campaignPayload: Record<string, unknown> = {
        account_id: creds.adAccountId,
        name: input.campaignName,
        objective: input.objective,
        total_budget_cents: Math.round(input.totalBudget * 100),
        start_date: input.startDate,
        ...(input.endDate && { end_date: input.endDate }),
        status: "ACTIVE",
      };

      const campaignData = await redditRequest(
        `/accounts/${creds.adAccountId}/campaigns`,
        accessToken,
        "POST",
        campaignPayload
      ) as { data?: { id: string } };

      const campaignId = campaignData?.data?.id;
      if (!campaignId) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create Reddit campaign" });
      }

      // Step 2: Create ad group
      const targeting: Record<string, unknown> = {};
      if (input.subreddits?.length) {
        targeting.communities = input.subreddits.map((s) => ({ name: s.replace(/^r\//, "") }));
      }
      if (input.interests?.length) {
        targeting.interests = input.interests.map((i) => ({ id: i }));
      }
      if (input.locations?.length) {
        targeting.geos = input.locations.map((l) => ({ code: l }));
      }
      if (input.genders?.length) {
        targeting.genders = input.genders;
      }
      if (input.ageRange) {
        targeting.age_ranges = [`${input.ageRange.min}-${input.ageRange.max}`];
      }

      const adGroupPayload: Record<string, unknown> = {
        account_id: creds.adAccountId,
        campaign_id: campaignId,
        name: input.adGroupName,
        goal_type: "CLICKS",
        bid_strategy: "AUTO_BID",
        start_date: input.startDate,
        ...(input.endDate && { end_date: input.endDate }),
        status: "ACTIVE",
        targeting,
      };

      const adGroupData = await redditRequest(
        `/accounts/${creds.adAccountId}/ad_groups`,
        accessToken,
        "POST",
        adGroupPayload
      ) as { data?: { id: string } };

      const adGroupId = adGroupData?.data?.id;

      // Step 3: Create ad
      const adPayload: Record<string, unknown> = {
        account_id: creds.adAccountId,
        ad_group_id: adGroupId,
        name: input.adTitle,
        post_type: "LINK",
        title: input.adTitle,
        text: input.adText,
        url: input.destinationUrl,
        call_to_action: input.callToAction,
        status: "ACTIVE",
      };

      if (input.thumbnailUrl) {
        adPayload.thumbnail_url = input.thumbnailUrl;
      }

      const adData = await redditRequest(
        `/accounts/${creds.adAccountId}/ads`,
        accessToken,
        "POST",
        adPayload
      ) as { data?: { id: string } };

      return {
        success: true,
        campaignId,
        adGroupId,
        adId: adData?.data?.id,
        message: `Reddit campaign "${input.campaignName}" created successfully`,
      };
    }),

  // Get analytics
  getAnalytics: protectedProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        startDate: z.string(),
        endDate: z.string(),
        campaignIds: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN", message: "Not a workspace member" });
      const account = await getSocialAccountByPlatform(input.workspaceId, "reddit");
      if (!account?.accessToken) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Reddit not connected" });
      }
      const creds = JSON.parse(account.accessToken) as {
        clientId: string;
        clientSecret: string;
        username: string;
        password: string;
        adAccountId: string;
      };

      try {
        const accessToken = await getRedditAccessToken(
          creds.clientId,
          creds.clientSecret,
          creds.username,
          creds.password
        );

        const params = new URLSearchParams({
          account_id: creds.adAccountId,
          start_date: input.startDate,
          end_date: input.endDate,
          breakdown: "CAMPAIGN",
          metrics: "impressions,clicks,spend,ctr,ecpc,conversions",
        });

        if (input.campaignIds?.length) {
          params.set("campaign_ids", input.campaignIds.join(","));
        }

        const data = await redditRequest(
          `/accounts/${creds.adAccountId}/reports?${params.toString()}`,
          accessToken
        ) as { data?: unknown[] };

        return data?.data ?? [];
      } catch {
        return [];
      }
    }),

  // Disconnect Reddit
  disconnect: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN", message: "Not a workspace member" });
      const account = await getSocialAccountByPlatform(input.workspaceId, "reddit");
      if (account) {
        await disconnectSocialAccount(account.id);
      }
      return { success: true };
    }),
});
