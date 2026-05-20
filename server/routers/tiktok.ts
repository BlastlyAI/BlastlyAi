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

// TikTok Marketing API v1.3 base URL
const TIKTOK_API_BASE = "https://business-api.tiktok.com/open_api/v1.3";

async function tiktokRequest(
  endpoint: string,
  accessToken: string,
  method: "GET" | "POST" = "GET",
  body?: object
) {
  const url = `${TIKTOK_API_BASE}${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as { code: number; message: string; data: unknown };
  if (data.code !== 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `TikTok API error: ${data.message} (code ${data.code})`,
    });
  }
  return data.data;
}

export const tiktokRouter = router({
  // Connect TikTok Ads account by saving credentials
  connect: protectedProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        appId: z.string().min(1),
        appSecret: z.string().min(1),
        accessToken: z.string().min(1),
        advertiserId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN", message: "Not a workspace member" });

      // Verify credentials by fetching advertiser info
      let advertiserName = "TikTok Ads Account";
      try {
        const adData = await tiktokRequest(
          `/advertiser/info/?advertiser_ids=["${input.advertiserId}"]`,
          input.accessToken
        ) as { list: { advertiser_name: string }[] };
        if (adData?.list?.[0]) {
          advertiserName = adData.list[0].advertiser_name;
        }
      } catch {
        // Credentials may still be valid even if this call fails in sandbox
      }

      await upsertSocialAccount({
        userId: ctx.user.id,
        workspaceId: input.workspaceId,
        platform: "tiktok",
        platformAccountId: input.advertiserId,
        platformUsername: input.advertiserId,
        platformDisplayName: advertiserName,
        accessToken: JSON.stringify({
          appId: input.appId,
          appSecret: input.appSecret,
          accessToken: input.accessToken,
          advertiserId: input.advertiserId,
        }),
      });

      return { success: true, advertiserName };
    }),

  // Get connection status
  getConnection: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN", message: "Not a workspace member" });
      const account = await getSocialAccountByPlatform(input.workspaceId, "tiktok");
      if (!account) return null;
      const creds = JSON.parse(account.accessToken || "{}") as {
        advertiserId?: string;
      };
      return {
        connected: true,
        displayName: account.platformDisplayName,
        advertiserId: creds.advertiserId,
        isActive: account.isActive,
      };
    }),

  // Get campaigns from TikTok Ads
  getCampaigns: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN", message: "Not a workspace member" });
      const account = await getSocialAccountByPlatform(input.workspaceId, "tiktok");
      if (!account?.accessToken) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "TikTok not connected" });
      }
      const creds = JSON.parse(account.accessToken) as {
        accessToken: string;
        advertiserId: string;
      };

      try {
        const data = await tiktokRequest(
          `/campaign/get/?advertiser_id=${creds.advertiserId}&fields=["campaign_id","campaign_name","status","budget","create_time","objective_type"]`,
          creds.accessToken
        ) as { list: unknown[] };
        return data?.list ?? [];
      } catch {
        return [];
      }
    }),

  // Create a campaign on TikTok Ads
  createCampaign: protectedProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        campaignName: z.string().min(1),
        objective: z.enum([
          "TRAFFIC",
          "CONVERSIONS",
          "APP_INSTALL",
          "VIDEO_VIEWS",
          "REACH",
          "LEAD_GENERATION",
        ]),
        budget: z.number().min(50), // TikTok minimum daily budget $50
        budgetMode: z.enum(["BUDGET_MODE_DAY", "BUDGET_MODE_TOTAL"]).default("BUDGET_MODE_DAY"),
        // Ad Group settings
        adGroupName: z.string().min(1),
        startTime: z.string(), // Unix timestamp as string
        endTime: z.string().optional(),
        // Targeting
        ageGroups: z
          .array(
            z.enum([
              "AGE_13_17",
              "AGE_18_24",
              "AGE_25_34",
              "AGE_35_44",
              "AGE_45_54",
              "AGE_55_100",
            ])
          )
          .optional(),
        genders: z.array(z.enum(["GENDER_MALE", "GENDER_FEMALE"])).optional(),
        locations: z.array(z.string()).optional(), // Location IDs
        // Ad creative
        adName: z.string().min(1),
        adText: z.string().min(1),
        callToAction: z
          .enum([
            "LEARN_MORE",
            "SHOP_NOW",
            "SIGN_UP",
            "DOWNLOAD",
            "BOOK_NOW",
            "CONTACT_US",
            "APPLY_NOW",
          ])
          .default("LEARN_MORE"),
        landingPageUrl: z.string().url(),
        videoUrl: z.string().url().optional(),
        imageUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN", message: "Not a workspace member" });
      const account = await getSocialAccountByPlatform(input.workspaceId, "tiktok");
      if (!account?.accessToken) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "TikTok not connected" });
      }
      const creds = JSON.parse(account.accessToken) as {
        accessToken: string;
        advertiserId: string;
      };

      // Step 1: Create campaign
      const campaignPayload = {
        advertiser_id: creds.advertiserId,
        campaign_name: input.campaignName,
        objective_type: input.objective,
        budget_mode: input.budgetMode,
        budget: input.budget,
      };

      const campaignData = await tiktokRequest(
        "/campaign/create/",
        creds.accessToken,
        "POST",
        campaignPayload
      ) as { campaign_id: string };

      const campaignId = campaignData.campaign_id;

      // Step 2: Create ad group
      const adGroupPayload: Record<string, unknown> = {
        advertiser_id: creds.advertiserId,
        campaign_id: campaignId,
        adgroup_name: input.adGroupName,
        placement_type: "PLACEMENT_TYPE_AUTOMATIC",
        budget_mode: input.budgetMode,
        budget: input.budget,
        schedule_type: "SCHEDULE_START_END",
        schedule_start_time: input.startTime,
        ...(input.endTime && { schedule_end_time: input.endTime }),
        optimization_goal: "CLICK",
        bid_type: "BID_TYPE_NO_BID",
        billing_event: "CPC",
        targeting_expansion: { expansion_enabled: true },
      };

      if (input.ageGroups?.length) {
        adGroupPayload.age = input.ageGroups;
      }
      if (input.genders?.length) {
        adGroupPayload.gender = input.genders;
      }
      if (input.locations?.length) {
        adGroupPayload.location_ids = input.locations;
      }

      const adGroupData = await tiktokRequest(
        "/adgroup/create/",
        creds.accessToken,
        "POST",
        adGroupPayload
      ) as { adgroup_id: string };

      const adGroupId = adGroupData.adgroup_id;

      // Step 3: Create ad
      const adPayload: Record<string, unknown> = {
        advertiser_id: creds.advertiserId,
        adgroup_id: adGroupId,
        ad_name: input.adName,
        ad_format: input.videoUrl ? "SINGLE_VIDEO" : "SINGLE_IMAGE",
        ad_text: input.adText,
        call_to_action: input.callToAction,
        landing_page_url: input.landingPageUrl,
      };

      if (input.videoUrl) {
        adPayload.video_id = input.videoUrl;
      }
      if (input.imageUrl) {
        adPayload.image_ids = [input.imageUrl];
      }

      const adData = await tiktokRequest(
        "/ad/create/",
        creds.accessToken,
        "POST",
        adPayload
      ) as { ad_id: string };

      return {
        success: true,
        campaignId,
        adGroupId,
        adId: adData.ad_id,
        message: `TikTok campaign "${input.campaignName}" created successfully`,
      };
    }),

  // Get campaign analytics
  getAnalytics: protectedProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        startDate: z.string(), // YYYY-MM-DD
        endDate: z.string(),
        campaignIds: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN", message: "Not a workspace member" });
      const account = await getSocialAccountByPlatform(input.workspaceId, "tiktok");
      if (!account?.accessToken) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "TikTok not connected" });
      }
      const creds = JSON.parse(account.accessToken) as {
        accessToken: string;
        advertiserId: string;
      };

      try {
        const params = new URLSearchParams({
          advertiser_id: creds.advertiserId,
          start_date: input.startDate,
          end_date: input.endDate,
          metrics: JSON.stringify(["spend", "impressions", "clicks", "ctr", "cpc", "conversions", "conversion_rate"]),
          data_level: "AUCTION_CAMPAIGN",
          dimensions: JSON.stringify(["campaign_id", "stat_time_day"]),
          report_type: "BASIC",
        });

        if (input.campaignIds?.length) {
          params.set("filters", JSON.stringify([{ filter_value: input.campaignIds, field_name: "campaign_id", filter_type: "IN" }]));
        }

        const data = await tiktokRequest(
          `/report/integrated/get/?${params.toString()}`,
          creds.accessToken
        ) as { list: unknown[] };

        return data?.list ?? [];
      } catch {
        return [];
      }
    }),

  // Disconnect TikTok
  disconnect: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN", message: "Not a workspace member" });
      const account = await getSocialAccountByPlatform(input.workspaceId, "tiktok");
      if (account) {
        await disconnectSocialAccount(account.id);
      }
      return { success: true };
    }),
});
