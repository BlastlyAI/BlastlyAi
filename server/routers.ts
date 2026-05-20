import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { workspaceRouter } from "./routers/workspace";
import { socialRouter } from "./routers/social";
import { campaignsRouter } from "./routers/campaigns";
import { postsRouter } from "./routers/posts";
import { aiRouter } from "./routers/ai";
import { analyticsRouter } from "./routers/analytics";
import { libraryRouter } from "./routers/library";
import { notificationsRouter } from "./routers/notifications";
import { adStudioRouter } from "./routers/adStudio";
import { agentsRouter } from "./routers/agents";
import { auditRouter } from "./routers/audit";
import { videoRouter } from "./routers/video";
import { onboardingRouter } from "./routers/onboarding";
import { stripeRouter } from "./routers/stripe";
import { seoRouter } from "./routers/seo";
import { socialScanRouter } from "./routers/socialScan";
import { competitorIntelRouter } from "./routers/competitorIntel";
import { shareReportRouter } from "./routers/shareReport";
import { tiktokRouter } from "./routers/tiktok";
import { redditRouter } from "./routers/reddit";
import { publishRouter } from "./routers/publish";
import { brandBriefRouter } from "./routers/brandBrief";
import { approvalRouter } from "./routers/approval";
import { quickCaptureRouter } from "./routers/quickCapture";
import { postQueueRouter } from "./routers/postQueue";
import { walletRouter } from "./routers/wallet";
import { preferencesRouter } from "./routers/preferences";
import { intelligenceRouter } from "./routers/intelligence";
import { channelsRouter } from "./routers/channels";
import { reviewRequestsRouter } from "./routers/reviewRequests";
import { contactsRouter } from "./routers/contacts";
import { appointmentsRouter } from "./routers/appointments";
import { scheduledPostsRouter } from "./routers/scheduledPosts";
import { businessHealthRouter } from "./routers/businessHealth";
import { quickChargeRouter } from "./routers/quickCharge";
import { snapRouter } from "./routers/snap";
import { intelligenceReportRouter } from "./routers/intelligenceReport";
import { customAuthRouter } from "./routers/customAuth";
import { monthlyStatsRouter } from "./routers/monthlyStats";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  workspace: workspaceRouter,
  social: socialRouter,
  campaigns: campaignsRouter,
  posts: postsRouter,
  ai: aiRouter,
  analytics: analyticsRouter,
  library: libraryRouter,
  notifications: notificationsRouter,
  adStudio: adStudioRouter,
  agents: agentsRouter,
  audit: auditRouter,
  video: videoRouter,
  onboarding: onboardingRouter,
  stripe: stripeRouter,
  seo: seoRouter,
  socialScan: socialScanRouter,
  competitorIntel: competitorIntelRouter,
  shareReport: shareReportRouter,
  tiktok: tiktokRouter,
  reddit: redditRouter,
  publish: publishRouter,
  brandBrief: brandBriefRouter,
  approval: approvalRouter,
  quickCapture: quickCaptureRouter,
  postQueue: postQueueRouter,
  wallet: walletRouter,
  preferences: preferencesRouter,
  intelligence: intelligenceRouter,
  channels: channelsRouter,
  reviewRequests: reviewRequestsRouter,
  contacts: contactsRouter,
  appointments: appointmentsRouter,
  scheduledPosts: scheduledPostsRouter,
  businessHealth: businessHealthRouter,
  quickCharge: quickChargeRouter,
  snap: snapRouter,
  intelligenceReport: intelligenceReportRouter,
  customAuth: customAuthRouter,
  monthlyStats: monthlyStatsRouter,
});

export type AppRouter = typeof appRouter;
