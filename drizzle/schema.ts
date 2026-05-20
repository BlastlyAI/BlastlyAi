import {
  bigint,
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";

// --- Users -------------------------------------------------------------------
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  // Custom Blastly auth fields (email/password flow — not Manus OAuth)
  passwordHash: varchar("passwordHash", { length: 255 }),
  isEmailVerified: boolean("isEmailVerified").default(false).notNull(),
  welcomeCompleted: boolean("welcomeCompleted").default(false).notNull(),
  businessName: varchar("businessName", { length: 255 }),
  industrySlug: varchar("industrySlug", { length: 128 }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// --- Workspaces ---------------------------------------------------------------
export const workspaces = mysqlTable("workspaces", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  logoUrl: text("logoUrl"),
  ownerId: int("ownerId").notNull(),
  // Brand identity fields
  website: varchar("website", { length: 512 }),
  industry: varchar("industry", { length: 128 }),
  description: text("description"),
  primaryColor: varchar("primaryColor", { length: 32 }),
  secondaryColor: varchar("secondaryColor", { length: 32 }),
  toneOfVoice: varchar("toneOfVoice", { length: 64 }),
  targetAudience: text("targetAudience"),
  // Per-workspace subscription / billing
  planTier: mysqlEnum("planTier", ["free", "fix_my_brand", "managed_social", "everything"]).default("free").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["active", "cancelled", "past_due", "trialing", "none"]).default("none").notNull(),
  trialEndsAt: timestamp("trialEndsAt"),
  // Managed Social / Ayrshare fields
  ayrshareProfileKey: varchar("ayrshareProfileKey", { length: 255 }),
  setupFeePaid: boolean("setupFeePaid").default(false).notNull(),
  creditsBalance: int("creditsBalance").default(0).notNull(),
  selectedPlatforms: json("selectedPlatforms").$type<string[]>(),  // platforms client chose during onboarding
  onboardingStep: int("onboardingStep").default(0).notNull(),      // 0=not started, 1-5=wizard step
  onboardingComplete: boolean("onboardingComplete").default(false).notNull(),
  // Extended profile fields (pre-filled from audit)
  googleReviewUrl: varchar("googleReviewUrl", { length: 512 }),   // Google review link for review requests
  phone: varchar("phone", { length: 32 }),                        // Business phone number
  address: varchar("address", { length: 512 }),                   // Business address
  tagline: varchar("tagline", { length: 255 }),                   // Business tagline/slogan
  geographicReach: varchar("geographicReach", { length: 32 }),    // local|state|national|international
  locationCity: varchar("locationCity", { length: 128 }),
  locationState: varchar("locationState", { length: 128 }),
  locationCountry: varchar("locationCountry", { length: 128 }),
  // Multi-select industry tags + free-text "other"
  industries: json("industries").$type<string[]>(),              // multi-select industry tags
  otherIndustry: varchar("otherIndustry", { length: 255 }),     // free-text when "Other" is selected
  // Target audience age ranges (multi-select)
  ageRanges: json("ageRanges").$type<string[]>(),               // e.g. ["18-24","25-34"]
  // Contact details collected during onboarding
  contactEmail: varchar("contactEmail", { length: 320 }),       // business contact email
  contactMobile: varchar("contactMobile", { length: 32 }),      // business mobile number
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Workspace = typeof workspaces.$inferSelect;

// --- Workspace Members --------------------------------------------------------
export const workspaceMembers = mysqlTable("workspaceMembers", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["admin", "editor", "viewer"]).default("viewer").notNull(),
  invitedByUserId: int("invitedByUserId"),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkspaceMember = typeof workspaceMembers.$inferSelect;

// --- Social Accounts ----------------------------------------------------------
export const socialAccounts = mysqlTable("socialAccounts", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  userId: int("userId").notNull(),
  platform: mysqlEnum("platform", ["twitter", "linkedin", "facebook", "instagram", "tiktok", "reddit", "youtube", "pinterest", "bluesky"]).notNull(),
  platformAccountId: varchar("platformAccountId", { length: 255 }).notNull(),
  platformUsername: varchar("platformUsername", { length: 255 }),
  platformDisplayName: varchar("platformDisplayName", { length: 255 }),
  platformAvatarUrl: text("platformAvatarUrl"),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  scopes: text("scopes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SocialAccount = typeof socialAccounts.$inferSelect;

// --- Campaigns ----------------------------------------------------------------
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  promotedUrl: text("promotedUrl"),
  goal: mysqlEnum("goal", ["awareness", "traffic", "engagement", "conversions", "leads"]),
  status: mysqlEnum("status", ["draft", "active", "paused", "completed"]).default("draft").notNull(),
  utmSource: varchar("utmSource", { length: 255 }),
  utmMedium: varchar("utmMedium", { length: 255 }),
  utmCampaign: varchar("utmCampaign", { length: 255 }),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;

// --- Posts --------------------------------------------------------------------
export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  campaignId: int("campaignId"),
  title: varchar("title", { length: 500 }),
  bodyText: text("bodyText"),
  mediaUrls: json("mediaUrls"),
  hashtags: json("hashtags"),
  utmSource: varchar("utmSource", { length: 255 }),
  utmMedium: varchar("utmMedium", { length: 255 }),
  utmCampaign: varchar("utmCampaign", { length: 255 }),
  utmContent: varchar("utmContent", { length: 255 }),
  utmTerm: varchar("utmTerm", { length: 255 }),
  trackedUrl: text("trackedUrl"),
  status: mysqlEnum("status", ["draft", "scheduled", "published", "failed", "cancelled"]).default("draft").notNull(),
  // Two-tier approval workflow
  approvalStatus: mysqlEnum("approvalStatus", ["draft", "pending_agency", "pending_client", "approved", "rejected", "scheduled", "published"]).default("draft").notNull(),
  agencyNote: text("agencyNote"),        // note from agency when editing/rejecting
  clientNote: text("clientNote"),        // note from client when flagging
  previewToken: varchar("previewToken", { length: 64 }),  // unique token for client preview link
  approvedByUserId: int("approvedByUserId"),  // who approved
  approvedAt: timestamp("approvedAt"),
  scheduledAt: timestamp("scheduledAt"),
  publishedAt: timestamp("publishedAt"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Post = typeof posts.$inferSelect;

// --- Post Platforms -----------------------------------------------------------
export const postPlatforms = mysqlTable("postPlatforms", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  socialAccountId: int("socialAccountId").notNull(),
  platform: mysqlEnum("platform", ["twitter", "linkedin", "facebook", "instagram", "tiktok", "reddit", "youtube", "pinterest", "bluesky"]).notNull(),
  customText: text("customText"),
  customHashtags: json("customHashtags"),
  status: mysqlEnum("status", ["pending", "published", "failed"]).default("pending").notNull(),
  platformPostId: varchar("platformPostId", { length: 255 }),
  publishedAt: timestamp("publishedAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PostPlatform = typeof postPlatforms.$inferSelect;

// --- Analytics ----------------------------------------------------------------
export const analytics = mysqlTable("analytics", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  postId: int("postId"),
  postPlatformId: int("postPlatformId"),
  campaignId: int("campaignId"),
  platform: mysqlEnum("platform", ["twitter", "linkedin", "facebook", "instagram", "tiktok", "reddit", "youtube", "pinterest", "bluesky"]).notNull(),
  impressions: int("impressions").default(0),
  clicks: int("clicks").default(0),
  likes: int("likes").default(0),
  comments: int("comments").default(0),
  shares: int("shares").default(0),
  reach: int("reach").default(0),
  utmClicks: int("utmClicks").default(0),
  utmConversions: int("utmConversions").default(0),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Analytics = typeof analytics.$inferSelect;

// --- Content Library ----------------------------------------------------------
export const contentLibrary = mysqlTable("contentLibrary", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  type: mysqlEnum("type", ["template", "hashtag_set", "brand_asset"]).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  content: text("content"),
  tags: json("tags"),
  assetUrl: text("assetUrl"),
  assetMimeType: varchar("assetMimeType", { length: 100 }),
  platforms: json("platforms"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentLibraryItem = typeof contentLibrary.$inferSelect;

// --- Notifications ------------------------------------------------------------
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  linkUrl: text("linkUrl"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;

// -------------------------------------------------------------------------------
// --- AGENTIC AI TABLES --------------------------------------------------------
// -------------------------------------------------------------------------------

// --- Agent Runs (Autonomous Campaign Agent + all multi-step agents) -----------
export const agentRuns = mysqlTable("agentRuns", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  type: mysqlEnum("type", [
    "campaign_agent",
    "website_intelligence",
    "trend_scan",
    "campaign_factory",
    "roi_prediction",
  ]).notNull(),
  status: mysqlEnum("status", ["pending", "running", "awaiting_approval", "approved", "completed", "failed"]).default("pending").notNull(),
  inputData: json("inputData"),
  steps: json("steps"),       // Array of { stepName, status, output, timestamp }
  outputData: json("outputData"),
  errorMessage: text("errorMessage"),
  campaignId: int("campaignId"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentRun = typeof agentRuns.$inferSelect;

// --- Virality Scores ----------------------------------------------------------
export const viralityScores = mysqlTable("viralityScores", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  postId: int("postId"),
  contentHash: varchar("contentHash", { length: 64 }),  // hash of content for caching
  platform: mysqlEnum("platform", ["twitter", "linkedin", "facebook", "instagram", "tiktok", "reddit", "youtube", "pinterest", "bluesky"]).notNull(),
  score: int("score").notNull(),           // 0-100
  confidence: int("confidence").notNull(), // 0-100
  suggestions: json("suggestions"),        // Array of string suggestions
  algorithmFactors: json("algorithmFactors"), // Key factors affecting score
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ViralityScore = typeof viralityScores.$inferSelect;

// --- Website Analyses ---------------------------------------------------------
export const websiteAnalyses = mysqlTable("websiteAnalyses", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  url: text("url").notNull(),
  pageTitle: varchar("pageTitle", { length: 500 }),
  extractedData: json("extractedData"), // { features, benefits, usps, updates, targetAudience, tone }
  lastAnalyzedAt: timestamp("lastAnalyzedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WebsiteAnalysis = typeof websiteAnalyses.$inferSelect;

// --- Brand Profiles (Brand Personality Cloner) --------------------------------
export const brandProfiles = mysqlTable("brandProfiles", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  trainingContent: text("trainingContent"),  // Raw sample posts/copy
  styleProfile: json("styleProfile"),        // { tone, vocabulary, sentenceLength, emojiUsage, hashtagStyle, values }
  sampleOutputs: json("sampleOutputs"),      // Array of AI-generated samples in this voice
  isActive: boolean("isActive").default(false).notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BrandProfile = typeof brandProfiles.$inferSelect;

// --- Trend Reports ------------------------------------------------------------
export const trendReports = mysqlTable("trendReports", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  keywords: json("keywords"),       // Array of tracked keywords/topics
  industry: varchar("industry", { length: 255 }),
  insights: json("insights"),       // Array of { topic, opportunity, urgency, suggestedPost }
  trendingTopics: json("trendingTopics"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TrendReport = typeof trendReports.$inferSelect;

// --- Competitor Monitors ------------------------------------------------------
export const competitorMonitors = mysqlTable("competitorMonitors", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  handle: varchar("handle", { length: 255 }).notNull(),
  platform: mysqlEnum("platform", ["twitter", "linkedin", "facebook", "instagram", "tiktok", "reddit", "youtube", "pinterest", "bluesky"]).notNull(),
  displayName: varchar("displayName", { length: 255 }),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  lastCheckedAt: timestamp("lastCheckedAt"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CompetitorMonitor = typeof competitorMonitors.$inferSelect;

// --- Multi-Modal Campaigns (Campaign Factory) ---------------------------------
export const multimodalCampaigns = mysqlTable("multimodalCampaigns", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  sourceUrl: text("sourceUrl"),
  theme: text("theme"),
  brief: text("brief"),
  assets: json("assets"),  // { twitter: {...}, linkedin: {...}, instagram: {...}, facebook: {...} }
  // Each platform: { textPost, carousel, thread, imagePrompt, videoScript, voiceoverNotes }
  status: mysqlEnum("status", ["generating", "ready", "scheduled", "published"]).default("generating").notNull(),
  agentRunId: int("agentRunId"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MultimodalCampaign = typeof multimodalCampaigns.$inferSelect;

// --- ROI Predictions ----------------------------------------------------------
export const roiPredictions = mysqlTable("roiPredictions", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  campaignId: int("campaignId"),
  agentRunId: int("agentRunId"),
  predictedTraffic: int("predictedTraffic"),
  predictedConversions: int("predictedConversions"),
  predictedRevenue: int("predictedRevenue"),  // In cents
  confidence: int("confidence"),              // 0-100
  timeframedays: int("timeframeDays").default(30),
  modelInputs: json("modelInputs"),           // Historical data snapshot used for prediction
  actualTraffic: int("actualTraffic"),        // Filled in post-campaign
  actualConversions: int("actualConversions"),
  actualRevenue: int("actualRevenue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RoiPrediction = typeof roiPredictions.$inferSelect;

// --- Social Media Audit Reports -----------------------------------------------
export const auditReports = mysqlTable("auditReports", {
  id: int("id").autoincrement().primaryKey(),
  shareToken: varchar("shareToken", { length: 64 }).notNull().unique(),
  workspaceId: int("workspaceId"),            // null = anonymous public audit
  businessName: varchar("businessName", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 128 }),
  website: text("website"),
  handles: json("handles"),                   // { twitter, linkedin, facebook, instagram }
  description: text("description"),             // AI-extracted business description/tagline
  detectedHandles: json("detectedHandles"),      // All social handles detected: { facebook, instagram, tiktok, ... }
  geographicReach: varchar("geographicReach", { length: 32 }),  // local|state|national|international
  adSpend: int("adSpend"),                    // Monthly ad spend in cents
  overallScore: int("overallScore"),          // 0-100
  platformScores: json("platformScores"),     // { twitter: { score, grade, breakdown }, ... }
  contentScore: int("contentScore"),
  adQualityScore: int("adQualityScore"),
  engagementScore: int("engagementScore"),
  growthScore: int("growthScore"),
  cyberSecurityScore: int("cyberSecurityScore"),  // 0-100 cybersecurity rating
  findings: json("findings"),                 // Array of { category, severity, title, detail }
  recommendations: json("recommendations"),  // Array of { priority, title, detail, blastlyFeature }
  blastlyPitch: json("blastlyPitch"),     // { headline, features: [...], cta }
  rawReport: json("rawReport"),               // Full LLM output
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AuditReport = typeof auditReports.$inferSelect;


// --- Video Projects -----------------------------------------------------------
export const videoProjects = mysqlTable("video_projects", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  platform: mysqlEnum("platform", ["twitter", "linkedin", "facebook", "instagram", "tiktok", "youtube"]).notNull().default("tiktok"),
  format: mysqlEnum("format", ["short", "long", "reel", "story"]).notNull().default("short"),
  status: mysqlEnum("status", ["draft", "generating", "ready", "published"]).notNull().default("draft"),
  prompt: text("prompt"),
  script: text("script"),
  voiceoverUrl: varchar("voiceoverUrl", { length: 1024 }),
  videoUrl: varchar("videoUrl", { length: 1024 }),
  thumbnailUrl: varchar("thumbnailUrl", { length: 1024 }),
  durationSeconds: int("durationSeconds"),
  captions: json("captions"),
  hashtags: json("hashtags"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type VideoProject = typeof videoProjects.$inferSelect;

// -- Onboarding Wizard Tables -----------------------------------------------

export const businessProfiles = mysqlTable("business_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  businessName: varchar("businessName", { length: 255 }),
  industry: varchar("industry", { length: 100 }),
  goals: text("goals"),               // JSON array of goal strings
  targetAudience: text("targetAudience"),
  adBudgetRange: varchar("adBudgetRange", { length: 100 }),
  brandNameChecked: varchar("brandNameChecked", { length: 255 }),
  onboardingStep: int("onboardingStep").default(1).notNull(),
  onboardingComplete: int("onboardingComplete").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type InsertBusinessProfile = typeof businessProfiles.$inferInsert;

export const platformConnections = mysqlTable("platform_connections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  platform: varchar("platform", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["connected", "pending", "skipped", "disconnected"]).default("pending").notNull(),
  accountName: varchar("accountName", { length: 255 }),
  accountId: varchar("accountId", { length: 255 }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  connectedAt: timestamp("connectedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlatformConnection = typeof platformConnections.$inferSelect;
export type InsertPlatformConnection = typeof platformConnections.$inferInsert;

// --- Subscriptions ------------------------------------------------------------
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  plan: mysqlEnum("plan", ["free", "starter", "pro", "agency"]).default("free").notNull(),
  status: mysqlEnum("status", ["active", "cancelled", "past_due", "trialing"]).default("active").notNull(),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
// --- SEO Scans ----------------------------------------------------------------
export const seoScans = mysqlTable("seo_scans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  url: varchar("url", { length: 2048 }).notNull(),
  score: int("score").notNull().default(0),
  title: varchar("title", { length: 512 }),
  metaDescription: text("metaDescription"),
  h1Tags: json("h1Tags").$type<string[]>(),
  keywords: json("keywords").$type<{ keyword: string; count: number; density: number }[]>(),
  pageSpeedScore: int("pageSpeedScore"),
  httpsEnabled: boolean("httpsEnabled").default(false),
  wordCount: int("wordCount"),
  imagesWithoutAlt: int("imagesWithoutAlt"),
  internalLinks: int("internalLinks"),
  externalLinks: int("externalLinks"),
  recommendations: json("recommendations").$type<{ priority: "high" | "medium" | "low"; category: string; issue: string; fix: string }[]>(),
  rawHtml: text("rawHtml"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SeoScan = typeof seoScans.$inferSelect;
export type InsertSeoScan = typeof seoScans.$inferInsert;

// --- Social Presence Scans ----------------------------------------------------
export const socialScans = mysqlTable("social_scans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  websiteUrl: varchar("websiteUrl", { length: 2048 }).notNull(),
  websiteSeoScore: int("websiteSeoScore"),
  overallScore: int("overallScore").notNull().default(0),
  discoveredProfiles: json("discoveredProfiles").$type<{
    platform: string;
    url: string;
    handle: string;
    found: boolean;
  }[]>(),
  platformScores: json("platformScores").$type<{
    platform: string;
    found: boolean;
    url: string | null;
    handle: string | null;
    followers: number | null;
    following: number | null;
    posts: number | null;
    bio: string | null;
    lastPostDate: string | null;
    postingFrequency: string | null;
    engagementRate: number | null;
    score: number;
    grade: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  }[]>(),
  recommendations: json("recommendations").$type<{
    priority: "high" | "medium" | "low";
    platform: string;
    issue: string;
    fix: string;
  }[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SocialScan = typeof socialScans.$inferSelect;
export type InsertSocialScan = typeof socialScans.$inferInsert;

// --- Competitor Intelligence Scans --------------------------------------------
export const competitorScans = mysqlTable("competitor_scans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  websiteUrl: varchar("websiteUrl", { length: 2048 }).notNull(),
  brandName: varchar("brandName", { length: 255 }),
  industry: varchar("industry", { length: 255 }),
  overallGapScore: int("overallGapScore").notNull().default(0),
  userDigitalScore: int("userDigitalScore").notNull().default(0),
  competitors: json("competitors").$type<{
    rank: number;
    name: string;
    websiteUrl: string;
    industry: string;
    description: string;
    websiteSeoScore: number;
    socialPresenceScore: number;
    overallScore: number;
    grade: string;
    socialProfiles: {
      platform: string;
      found: boolean;
      url: string | null;
      followers: number | null;
      score: number;
    }[];
    services: string[];
    contentStrategy: string;
    uniqueStrengths: string[];
    weaknesses: string[];
    estimatedMonthlyTraffic: string;
    techStack: string[];
  }[]>(),
  improvementOpportunities: json("improvementOpportunities").$type<{
    category: "product" | "service" | "marketing" | "content" | "social" | "seo" | "tech";
    priority: "critical" | "high" | "medium" | "low";
    title: string;
    description: string;
    competitorsDoing: string[];
    estimatedImpact: string;
    timeToImplement: string;
    difficulty: "easy" | "medium" | "hard";
    canDoInBlastly: boolean;
    blastlyFeature: string | null;
    actionSteps: string[];
  }[]>(),
  quickWins: json("quickWins").$type<{
    action: string;
    description: string;
    timeframe: string;
    impact: string;
    canDoInBlastly: boolean;
  }[]>(),
  industryBenchmark: json("industryBenchmark").$type<{
    metric: string;
    yourScore: number;
    industryAverage: number;
    topCompetitorScore: number;
    gap: number;
  }[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CompetitorScan = typeof competitorScans.$inferSelect;
export type InsertCompetitorScan = typeof competitorScans.$inferInsert;

// --- Shared Reports (viral sharing) ---
export const sharedReports = mysqlTable("shared_reports", {
  id:          int("id").autoincrement().primaryKey(),
  shareToken:  varchar("shareToken", { length: 64 }).notNull().unique(),
  userId:      int("userId"),
  reportType:  varchar("reportType", { length: 32 }).notNull(),
  websiteUrl:  varchar("websiteUrl", { length: 512 }).notNull(),
  overallScore: int("overallScore"),
  scanData:    json("scanData").notNull(),
  expiresAt:   timestamp("expiresAt"),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
});
export type SharedReport = typeof sharedReports.$inferSelect;
export type InsertSharedReport = typeof sharedReports.$inferInsert;

// --- Connected Apps (universal webhook integration) ---------------------------
// Each record represents an external Manus app (e.g. Genius Jungle, Coach Nova)
// connected to a Blastly workspace. The webhookSecret is used to authenticate
// incoming POST requests from that app.
export const connectedApps = mysqlTable("connected_apps", {
  id:            int("id").autoincrement().primaryKey(),
  workspaceId:   int("workspaceId").notNull(),
  appSlug:       varchar("appSlug", { length: 64 }).notNull(),   // e.g. "genius-jungle"
  appName:       varchar("appName", { length: 128 }).notNull(),  // e.g. "Genius Jungle"
  webhookSecret: varchar("webhookSecret", { length: 64 }).notNull(),
  isActive:      boolean("isActive").default(true).notNull(),
  lastEventAt:   timestamp("lastEventAt"),
  createdAt:     timestamp("createdAt").defaultNow().notNull(),
});
export type ConnectedApp = typeof connectedApps.$inferSelect;
export type InsertConnectedApp = typeof connectedApps.$inferInsert;

// --- Webhook Events -----------------------------------------------------------
// Every inbound event from a connected app is logged here.
// status: "pending" → being processed, "done" → posts generated, "error" → failed
export const webhookEvents = mysqlTable("webhook_events", {
  id:             int("id").autoincrement().primaryKey(),
  connectedAppId: int("connectedAppId").notNull(),
  workspaceId:    int("workspaceId").notNull(),
  eventType:      varchar("eventType", { length: 64 }).notNull(),  // e.g. "course_completed"
  payload:        json("payload").notNull(),
  status:         mysqlEnum("status", ["pending", "done", "error"]).default("pending").notNull(),
  errorMessage:   text("errorMessage"),
  generatedPostIds: json("generatedPostIds"),  // array of post IDs created from this event
  processedAt:    timestamp("processedAt"),
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
});
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = typeof webhookEvents.$inferInsert;

// --- Content Assets (Content Studio) ----------------------------------------
// Stores photos/videos uploaded by clients in the Content Studio, along with
// voice transcriptions and AI-generated captions per platform.
export const contentAssets = mysqlTable("content_assets", {
  id:              int("id").autoincrement().primaryKey(),
  workspaceId:     int("workspaceId").notNull(),
  fileUrl:         text("fileUrl").notNull(),          // S3 URL of the uploaded photo/video
  fileKey:         varchar("fileKey", { length: 512 }).notNull(),
  mimeType:        varchar("mimeType", { length: 100 }),
  voiceNoteUrl:    text("voiceNoteUrl"),               // S3 URL of the voice recording
  voiceTranscript: text("voiceTranscript"),            // Whisper transcription text
  aiCaptions:      json("aiCaptions").$type<Record<string, string>>(),  // { facebook: "...", instagram: "..." }
  selectedPlatforms: json("selectedPlatforms").$type<string[]>(),
  status:          mysqlEnum("status", ["uploading", "transcribing", "captioning", "ready", "approved", "published", "failed"]).default("uploading").notNull(),
  publishedPostId: int("publishedPostId"),             // posts.id after approval
  scheduledAt:     timestamp("scheduledAt"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt:       timestamp("createdAt").defaultNow().notNull(),
  updatedAt:       timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ContentAsset = typeof contentAssets.$inferSelect;
export type InsertContentAsset = typeof contentAssets.$inferInsert;

// --- Credit Transactions -------------------------------------------------------
// Tracks credit purchases (type: "purchase") and deductions (type: "deduct") per workspace.
// 1 credit ≈ $0.50; 200 credits = $100 pack; 600 credits = $200 pack.
export const creditTransactions = mysqlTable("credit_transactions", {
  id:                    int("id").autoincrement().primaryKey(),
  workspaceId:           int("workspaceId").notNull(),
  amount:                int("amount").notNull(),           // positive = purchase, negative = deduction
  type:                  mysqlEnum("type", ["purchase", "deduct", "refund", "bonus"]).notNull(),
  description:           varchar("description", { length: 255 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  postId:                int("postId"),                     // which post consumed credits (deductions only)
  createdAt:             timestamp("createdAt").defaultNow().notNull(),
});
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = typeof creditTransactions.$inferInsert;

// --- App Health Checks -------------------------------------------------------
// Stores the result of each uptime check for every connected app.
// status: "up" → responded OK (<3s), "slow" → responded but >3s, "down" → no response or error
export const appHealthChecks = mysqlTable("app_health_checks", {
  id:             int("id").autoincrement().primaryKey(),
  connectedAppId: int("connectedAppId").notNull(),
  workspaceId:    int("workspaceId").notNull(),
  status:         mysqlEnum("status", ["up", "slow", "down"]).notNull(),
  responseTimeMs: int("responseTimeMs"),          // null if down
  statusCode:     int("statusCode"),              // HTTP status code, null if no response
  errorMessage:   text("errorMessage"),
  checkedAt:      timestamp("checkedAt").defaultNow().notNull(),
});
export type AppHealthCheck = typeof appHealthChecks.$inferSelect;
export type InsertAppHealthCheck = typeof appHealthChecks.$inferInsert;

// --- Brand Brief --------------------------------------------------------------
// One per workspace. Stores the facts, voice, and compliance rules the AI must
// follow when generating content for this business. Acts as the AI's instruction
// manual — nothing gets generated without reading this first.
export const brandBriefs = mysqlTable("brand_briefs", {
  id:                  int("id").autoincrement().primaryKey(),
  workspaceId:         int("workspaceId").notNull().unique(),
  // Identity anchors — facts the AI must never deviate from
  businessDescription: text("businessDescription"),   // owner's own words
  productsServices:    text("productsServices"),       // real product/service names + prices
  differentiators:     text("differentiators"),        // "family-owned since 1987", "100% organic"
  neverSay:            text("neverSay"),               // forbidden claims, competitor names
  targetAudience:      text("targetAudience"),
  // Brand voice
  tone:                mysqlEnum("tone", ["professional", "friendly", "bold", "nurturing", "humorous", "authoritative", "casual"]).default("friendly"),
  approvedPhrases:     text("approvedPhrases"),        // phrases the AI should use
  avoidPhrases:        text("avoidPhrases"),           // phrases to avoid
  // Visual identity
  brandColors:         json("brandColors").$type<string[]>(),  // hex codes
  logoUrl:             text("logoUrl"),
  // Compliance
  complianceRules:     text("complianceRules"),        // industry-specific rules
  noPriceClaims:       boolean("noPriceClaims").default(false),
  noTestimonials:      boolean("noTestimonials").default(false),
  noCompetitorMentions: boolean("noCompetitorMentions").default(true),
  createdAt:           timestamp("createdAt").defaultNow().notNull(),
  updatedAt:           timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BrandBrief = typeof brandBriefs.$inferSelect;
export type InsertBrandBrief = typeof brandBriefs.$inferInsert;

// --- Brand Photos -------------------------------------------------------------
// Client-owned approved photo library. AI picks from these when generating
// visual content — no random stock photos.
export const brandPhotos = mysqlTable("brand_photos", {
  id:          int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  fileUrl:     text("fileUrl").notNull(),     // S3 URL
  fileKey:     varchar("fileKey", { length: 512 }).notNull(),
  label:       varchar("label", { length: 255 }),   // e.g. "Storefront", "Team photo", "Product shot"
  isApproved:  boolean("isApproved").default(true).notNull(),
  uploadedByUserId: int("uploadedByUserId").notNull(),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
});
export type BrandPhoto = typeof brandPhotos.$inferSelect;
export type InsertBrandPhoto = typeof brandPhotos.$inferInsert;

// --- Quick Captures -----------------------------------------------------------
// Mobile-first content submissions: client snaps a photo/video, records a
// voice note, optionally adds text — AI generates platform-specific posts.
export const quickCaptures = mysqlTable("quick_captures", {
  id:              int("id").autoincrement().primaryKey(),
  workspaceId:     int("workspaceId").notNull(),
  submittedByUserId: int("submittedByUserId").notNull(),
  // Media
  mediaUrl:        text("mediaUrl"),
  mediaKey:        varchar("mediaKey", { length: 512 }),
  mediaType:       varchar("mediaType", { length: 20 }),  // "photo" | "video" | "none"
  // Voice note
  voiceUrl:        text("voiceUrl"),
  voiceKey:        varchar("voiceKey", { length: 512 }),
  voiceTranscript: text("voiceTranscript"),
  // Text note
  textNote:        text("textNote"),
  // AI output
  aiGeneratedPosts: json("aiGeneratedPosts").$type<Record<string, string>>(),
  // Workflow: pending_ai | ai_ready | agency_reviewing | approved | rejected | published
  status:          varchar("status", { length: 30 }).default("pending_ai").notNull(),
  agencyNote:      text("agencyNote"),
  createdAt:       timestamp("createdAt").defaultNow().notNull(),
  updatedAt:       timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type QuickCapture = typeof quickCaptures.$inferSelect;
export type InsertQuickCapture = typeof quickCaptures.$inferInsert;

// --- Content Reminder Settings ------------------------------------------------
export const reminderSettings = mysqlTable("reminder_settings", {
  id:           int("id").autoincrement().primaryKey(),
  workspaceId:  int("workspaceId").notNull().unique(),
  enabled:      boolean("enabled").default(true).notNull(),
  reminderDays: json("reminderDays").$type<number[]>(),  // e.g. [2, 5] = Tue, Fri
  reminderHour: int("reminderHour").default(9),
  lastSentAt:   timestamp("lastSentAt"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ReminderSettings = typeof reminderSettings.$inferSelect;
export type InsertReminderSettings = typeof reminderSettings.$inferInsert;

// --- Post Queue (Always-3 Backup System) -------------------------------------
// Priority: client posts with date → client posts no date → ai_backup posts
export const postQueue = mysqlTable("post_queue", {
  id:                  int("id").autoincrement().primaryKey(),
  workspaceId:         int("workspaceId").notNull(),
  // "client" = submitted by client, "ai_backup" = AI-generated safety net
  type:                varchar("type", { length: 20 }).default("client").notNull(),
  // Media
  mediaUrl:            text("mediaUrl"),
  mediaKey:            varchar("mediaKey", { length: 512 }),
  // Content
  caption:             text("caption"),
  hashtags:            text("hashtags"),
  platforms:           json("platforms").$type<string[]>(),
  // Scheduling
  scheduledDate:       timestamp("scheduledDate"),
  isUrgent:            boolean("isUrgent").default(false).notNull(),
  // Detected metadata from client note
  detectedEventName:   varchar("detectedEventName", { length: 255 }),
  detectedPersonName:  varchar("detectedPersonName", { length: 255 }),
  // Workflow: pending_review | approved | published | skipped
  status:              varchar("status", { length: 30 }).default("pending_review").notNull(),
  agencyNote:          text("agencyNote"),
  createdAt:           timestamp("createdAt").defaultNow().notNull(),
  updatedAt:           timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PostQueue = typeof postQueue.$inferSelect;
export type InsertPostQueue = typeof postQueue.$inferInsert;

// --- Ad Budget Wallet ---------------------------------------------------------
export const adWallet = mysqlTable("ad_wallet", {
  id:                       int("id").autoincrement().primaryKey(),
  workspaceId:              int("workspaceId").notNull().unique(),
  balanceCents:             int("balanceCents").default(0).notNull(),
  monthlyBudgetCents:       int("monthlyBudgetCents").default(10000).notNull(),
  spentThisMonthCents:      int("spentThisMonthCents").default(0).notNull(),
  autoTopUp:                boolean("autoTopUp").default(false).notNull(),
  autoTopUpThresholdCents:  int("autoTopUpThresholdCents").default(2000),
  autoTopUpAmountCents:     int("autoTopUpAmountCents").default(10000),
  stripeCustomerId:         varchar("stripeCustomerId", { length: 255 }),
  stripePaymentMethodId:    varchar("stripePaymentMethodId", { length: 255 }),
  nextResetDate:            timestamp("nextResetDate"),
  lowBalanceReminderSentAt: timestamp("lowBalanceReminderSentAt"),
  createdAt:                timestamp("createdAt").defaultNow().notNull(),
  updatedAt:                timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AdWallet = typeof adWallet.$inferSelect;
export type InsertAdWallet = typeof adWallet.$inferInsert;

// --- Wallet Transactions ------------------------------------------------------
export const walletTransactions = mysqlTable("wallet_transactions", {
  id:                    int("id").autoincrement().primaryKey(),
  workspaceId:           int("workspaceId").notNull(),
  type:                  varchar("type", { length: 20 }).notNull(),
  amountCents:           int("amountCents").notNull(),
  balanceAfterCents:     int("balanceAfterCents").notNull(),
  description:           varchar("description", { length: 512 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  createdAt:             timestamp("createdAt").defaultNow().notNull(),
});
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = typeof walletTransactions.$inferInsert;

// --- Social Setup Progress ----------------------------------------------------
// Tracks each workspace's progress through the 3-step social account setup guide.
// One row per workspace, upserted on every save.
export const socialSetupProgress = mysqlTable("social_setup_progress", {
  id:               int("id").autoincrement().primaryKey(),
  workspaceId:      int("workspaceId").notNull().unique(),
  // Which steps have been completed
  step1Done:        boolean("step1Done").default(false).notNull(),
  step2Done:        boolean("step2Done").default(false).notNull(),
  step3Done:        boolean("step3Done").default(false).notNull(),
  // Which step the client is currently on (1, 2, or 3)
  activeStep:       int("activeStep").default(1).notNull(),
  // JSON arrays of platform IDs the client has marked as done in steps 2 & 3
  completedSetups:  json("completedSetups").$type<string[]>().default([]),
  // Timestamp of last save — used to show "last updated" in admin view
  updatedAt:        timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SocialSetupProgress = typeof socialSetupProgress.$inferSelect;
export type InsertSocialSetupProgress = typeof socialSetupProgress.$inferInsert;

// --- Workspace Preferences ----------------------------------------------------
// Per-workspace UI preferences: colour scheme and home screen mode.
// colorScheme: "bold" (dark navy + electric blue), "soft" (light lavender + pink), "warm" (cream + terracotta)
// homeMode: "dashboard" (default clean grid) | "assistant" (AI character gatekeeper)
export const workspacePreferences = mysqlTable("workspace_preferences", {
  id:             int("id").autoincrement().primaryKey(),
  workspaceId:    int("workspaceId").notNull().unique(),
  colorScheme:    mysqlEnum("colorScheme", ["bold", "soft", "warm"]).default("bold").notNull(),
  homeMode:       mysqlEnum("homeMode", ["dashboard", "assistant"]).default("dashboard").notNull(),
  // Audience targeting — controls content tone and platform recommendations
  ageGroup:       mysqlEnum("ageGroup", ["children", "teens", "adults", "seniors", "all_ages"]).default("all_ages"),
  businessSector: mysqlEnum("businessSector", ["retail", "hospitality", "health", "beauty", "trades", "professional_services", "food_beverage", "education", "other"]).default("other"),
  // Aria AI assistant settings (premium plan only)
  ariaOpeningHours:  text("ariaOpeningHours"),                    // JSON: { mon: '9am-5pm', ... }
  ariaHandoffName:   varchar("ariaHandoffName", { length: 120 }),
  ariaHandoffMobile: varchar("ariaHandoffMobile", { length: 30 }),
  ariaActiveMode:    mysqlEnum("ariaActiveMode", ["always_on", "after_hours", "manual"]).default("always_on"),
  // Command Centre settings (premium plan only)
  briefingStartHour: int("briefingStartHour").default(8),         // 6-10 or custom
  alertMode:         mysqlEnum("alertMode", ["instant", "briefing_only", "both"]).default("both"),
  quietHoursStart:   int("quietHoursStart").default(21),          // 24h format, e.g. 21 = 9pm
  quietHoursEnd:     int("quietHoursEnd").default(7),             // 24h format, e.g. 7 = 7am
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
  updatedAt:      timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WorkspacePreferences = typeof workspacePreferences.$inferSelect;
export type InsertWorkspacePreferences = typeof workspacePreferences.$inferInsert;

// --- Extended Channel Connections (Onboarding) --------------------------------
// Stores all non-social channel connections: email, SMS, Google Business,
// calendar/booking systems, and payment systems.
export const channelConnections = mysqlTable("channel_connections", {
  id:              int("id").autoincrement().primaryKey(),
  workspaceId:     int("workspaceId").notNull(),
  channelType:     mysqlEnum("channelType", [
    "email_gmail", "email_outlook", "email_imap",
    "sms",
    "google_business",
    "calendar_google", "calendar_calendly", "calendar_acuity",
    "calendar_simplybook", "calendar_square",
    "payment_square", "payment_stripe", "payment_xero",
    "payment_myob", "payment_paypal", "payment_shopify"
  ]).notNull(),
  status:          mysqlEnum("status", ["connected", "pending", "skipped", "disconnected"]).default("pending").notNull(),
  accountName:     varchar("accountName", { length: 255 }),
  accountEmail:    varchar("accountEmail", { length: 255 }),
  phoneNumber:     varchar("phoneNumber", { length: 32 }),
  accessToken:     text("accessToken"),
  refreshToken:    text("refreshToken"),
  tokenExpiresAt:  timestamp("tokenExpiresAt"),
  metadata:        json("metadata").$type<Record<string, string>>(),
  connectedAt:     timestamp("connectedAt"),
  createdAt:       timestamp("createdAt").defaultNow().notNull(),
  updatedAt:       timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ChannelConnection = typeof channelConnections.$inferSelect;
export type InsertChannelConnection = typeof channelConnections.$inferInsert;

// --- Business AI Intelligence Feed -------------------------------------------
// Live action feed items surfaced to the business owner.
// Items stay in feed until actioned or dismissed.
// Priority: 1=appointment_upcoming, 2=lead/booking, 3=message_reply,
//           4=post_approval, 5=review_negative, 6=awareness
export const intelligenceFeedItems = mysqlTable("intelligence_feed_items", {
  id:              int("id").autoincrement().primaryKey(),
  workspaceId:     int("workspaceId").notNull(),
  priority:        int("priority").default(6).notNull(),
  itemType:        mysqlEnum("itemType", [
    "appointment_upcoming", "appointment_conflict",
    "lead_new", "booking_request",
    "message_dm", "message_sms", "message_email",
    "post_approval", "review_negative",
    "traction_post", "budget_low", "website_suggestion",
    "invoice_paid", "competitor_alert"
  ]).notNull(),
  channel:         varchar("channel", { length: 64 }),
  senderName:      varchar("senderName", { length: 255 }),
  senderAvatar:    varchar("senderAvatar", { length: 512 }),
  messageSnippet:  text("messageSnippet"),
  aiContextLine:   text("aiContextLine"),
  aiDraftReply:    text("aiDraftReply"),
  scheduledAt:     timestamp("scheduledAt"),
  metadata:        json("metadata").$type<Record<string, unknown>>(),
  status:          mysqlEnum("status", ["pending", "actioned", "dismissed"]).default("pending").notNull(),
  actionedAt:      timestamp("actionedAt"),
  createdAt:       timestamp("createdAt").defaultNow().notNull(),
  updatedAt:       timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type IntelligenceFeedItem = typeof intelligenceFeedItems.$inferSelect;
export type InsertIntelligenceFeedItem = typeof intelligenceFeedItems.$inferInsert;

// --- Google Review Requests --------------------------------------------------
// Automatically sent to customers after invoice paid, invoice sent, or job
// completed. Tracks status so we never double-send to the same customer.
export const reviewRequests = mysqlTable("review_requests", {
  id:               int("id").autoincrement().primaryKey(),
  workspaceId:      int("workspaceId").notNull(),
  customerName:     varchar("customerName", { length: 255 }),
  customerEmail:    varchar("customerEmail", { length: 255 }),
  customerPhone:    varchar("customerPhone", { length: 32 }),
  triggerType:      mysqlEnum("triggerType", [
    "invoice_paid", "invoice_sent", "job_completed", "manual"
  ]).notNull(),
  channel:          mysqlEnum("channel", ["sms", "email"]).notNull().default("sms"),
  googleReviewUrl:  varchar("googleReviewUrl", { length: 512 }),
  messageTemplate:  text("messageTemplate"),
  status:           mysqlEnum("status", ["pending", "sent", "clicked", "failed"]).default("pending").notNull(),
  sentAt:           timestamp("sentAt"),
  clickedAt:        timestamp("clickedAt"),
  externalRef:      varchar("externalRef", { length: 255 }),
  createdAt:        timestamp("createdAt").defaultNow().notNull(),
  updatedAt:        timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ReviewRequest = typeof reviewRequests.$inferSelect;
export type InsertReviewRequest = typeof reviewRequests.$inferInsert;

// --- Review Request Settings -------------------------------------------------
export const reviewSettings = mysqlTable("review_settings", {
  id:                    int("id").autoincrement().primaryKey(),
  workspaceId:           int("workspaceId").notNull().unique(),
  autoSendEnabled:       boolean("autoSendEnabled").default(true).notNull(),
  triggerOnInvoicePaid:  boolean("triggerOnInvoicePaid").default(true).notNull(),
  triggerOnInvoiceSent:  boolean("triggerOnInvoiceSent").default(false).notNull(),
  triggerOnJobCompleted: boolean("triggerOnJobCompleted").default(true).notNull(),
  preferredChannel:      mysqlEnum("preferredChannel", ["sms", "email"]).default("sms").notNull(),
  delayMinutes:          int("delayMinutes").default(60).notNull(),
  googleReviewUrl:       varchar("googleReviewUrl", { length: 512 }),
  smsTemplate:           text("smsTemplate"),
  emailSubject:          varchar("emailSubject", { length: 255 }),
  emailTemplate:         text("emailTemplate"),
  createdAt:             timestamp("createdAt").defaultNow().notNull(),
  updatedAt:             timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ReviewSettings = typeof reviewSettings.$inferSelect;
export type InsertReviewSettings = typeof reviewSettings.$inferInsert;

// --- Contacts (Customer Database) -------------------------------------------
// Owners load their customers here for SMS campaigns, review requests, etc.
export const contacts = mysqlTable("contacts", {
  id:           int("id").autoincrement().primaryKey(),
  workspaceId:  int("workspaceId").notNull(),
  firstName:    varchar("firstName", { length: 128 }).notNull(),
  lastName:     varchar("lastName", { length: 128 }),
  phone:        varchar("phone", { length: 32 }),
  email:        varchar("email", { length: 255 }),
  tags:         varchar("tags", { length: 512 }),   // comma-separated e.g. "vip,regular"
  notes:        text("notes"),
  source:       varchar("source", { length: 64 }),  // "manual","csv","booking","invoice"
  optedOut:     boolean("optedOut").default(false).notNull(),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

// --- SMS Campaigns -----------------------------------------------------------
// Bulk SMS/social campaigns sent to a segment of contacts.
export const smsCampaigns = mysqlTable("sms_campaigns", {
  id:               int("id").autoincrement().primaryKey(),
  workspaceId:      int("workspaceId").notNull(),
  name:             varchar("name", { length: 255 }).notNull(),
  messageTemplate:  text("messageTemplate").notNull(),
  mediaUrl:         varchar("mediaUrl", { length: 512 }),
  tagFilter:        varchar("tagFilter", { length: 512 }),
  deliveryChannel:  mysqlEnum("deliveryChannel", ["sms", "social", "both"]).default("sms").notNull(),
  status:           mysqlEnum("status", ["draft", "sending", "sent", "failed"]).default("draft").notNull(),
  totalRecipients:  int("totalRecipients").default(0).notNull(),
  sentCount:        int("sentCount").default(0).notNull(),
  failedCount:      int("failedCount").default(0).notNull(),
  scheduledAt:      timestamp("scheduledAt"),
  sentAt:           timestamp("sentAt"),
  createdAt:        timestamp("createdAt").defaultNow().notNull(),
  updatedAt:        timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SmsCampaign = typeof smsCampaigns.$inferSelect;
export type InsertSmsCampaign = typeof smsCampaigns.$inferInsert;

// --- SMS Campaign Recipients -------------------------------------------------
export const smsCampaignRecipients = mysqlTable("sms_campaign_recipients", {
  id:           int("id").autoincrement().primaryKey(),
  campaignId:   int("campaignId").notNull(),
  contactId:    int("contactId").notNull(),
  phone:        varchar("phone", { length: 32 }).notNull(),
  personalised: text("personalised"),
  status:       mysqlEnum("status", ["queued", "sent", "delivered", "failed", "opted_out"]).default("queued").notNull(),
  externalRef:  varchar("externalRef", { length: 255 }),
  sentAt:       timestamp("sentAt"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
});
export type SmsCampaignRecipient = typeof smsCampaignRecipients.$inferSelect;
export type InsertSmsCampaignRecipient = typeof smsCampaignRecipients.$inferInsert;

// -- Appointments / Jobs — full schema defined below in Appointment Services section --

// -- Scheduled Posts / Weekly Post Reminders ---------------------------
export const scheduledPosts = mysqlTable("scheduled_posts", {
  id:              int("id").primaryKey().autoincrement(),
  workspaceId:     int("workspaceId").notNull(),
  dueAt:           bigint("dueAt", { mode: "number" }).notNull(),
  status:          varchar("status", { length: 50 }).default("pending").notNull(),
  draftContent:    text("draftContent"),
  draftPlatforms:  varchar("draftPlatforms", { length: 255 }),
  approvedAt:      bigint("approvedAt", { mode: "number" }),
  approvedBy:      int("approvedBy"),
  reminderSentAt:  bigint("reminderSentAt", { mode: "number" }),
  ownerNotes:      text("ownerNotes"),
  createdAt:       bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt:       bigint("updatedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type ScheduledPost = typeof scheduledPosts.$inferSelect;
export type InsertScheduledPost = typeof scheduledPosts.$inferInsert;



// ── Business Health Snapshots (Day Zero + monthly check-ins) ─────────────────
export const businessSnapshots = mysqlTable("business_snapshots", {
  id:                  int("id").autoincrement().primaryKey(),
  userId:              int("userId").notNull(),
  snapshotType:        varchar("snapshotType", { length: 50 }).default("day_zero").notNull(),
  platformCount:       int("platformCount").default(0),
  hoursPerWeek:        int("hoursPerWeek").default(0),
  totalFollowers:      int("totalFollowers").default(0),
  avgPostReach:        int("avgPostReach").default(0),
  postsPerWeek:        int("postsPerWeek").default(0),
  leadsPerWeek:        int("leadsPerWeek").default(0),
  monthlyRevenue:      int("monthlyRevenue").default(0),
  blastlyHoursPerWeek: int("blastlyHoursPerWeek").default(0),
  blastlyLeadsPerWeek: int("blastlyLeadsPerWeek").default(0),
  blastlyPostReach:    int("blastlyPostReach").default(0),
  notes:               text("notes"),
  createdAt:           bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type BusinessSnapshot = typeof businessSnapshots.$inferSelect;
export type InsertBusinessSnapshot = typeof businessSnapshots.$inferInsert;


// ── Appointment Services (menu of services with durations) ────────────────────
export const appointmentServices = mysqlTable("appointment_services", {
  id:              int("id").autoincrement().primaryKey(),
  workspaceId:     int("workspaceId").notNull(),
  name:            varchar("name", { length: 128 }).notNull(),
  durationMinutes: int("durationMinutes").notNull().default(30),
  priceCents:      int("priceCents").notNull().default(0),
  description:     text("description"),
  color:           varchar("color", { length: 16 }).default("#6366f1"),
  isActive:        boolean("isActive").notNull().default(true),
  createdAt:       bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt:       bigint("updatedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type AppointmentService = typeof appointmentServices.$inferSelect;
export type InsertAppointmentService = typeof appointmentServices.$inferInsert;

// ── Appointments ──────────────────────────────────────────────────────────────
export const appointments = mysqlTable("appointments", {
  id:                  int("id").autoincrement().primaryKey(),
  workspaceId:         int("workspaceId").notNull(),
  contactId:           int("contactId"),           // nullable — may not be in contacts yet
  serviceId:           int("serviceId"),           // nullable — custom title allowed
  title:               varchar("title", { length: 256 }).notNull(),
  clientName:          varchar("clientName", { length: 128 }),
  clientPhone:         varchar("clientPhone", { length: 32 }),
  clientEmail:         varchar("clientEmail", { length: 256 }),
  startAt:             bigint("startAt", { mode: "number" }).notNull(),
  endAt:               bigint("endAt", { mode: "number" }).notNull(),
  notes:               text("notes"),
  status:              varchar("status", { length: 32 }).notNull().default("confirmed"), // confirmed | cancelled | completed | no_show
  paymentMethod:       varchar("paymentMethod", { length: 32 }),  // cash | qr | card | null
  amountCents:         int("amountCents"),
  loyaltyPointsEarned: int("loyaltyPointsEarned").default(0),
  loyaltyPointsRedeemed: int("loyaltyPointsRedeemed").default(0),
  confirmationSent:    boolean("confirmationSent").notNull().default(false),
  reminder24Sent:      boolean("reminder24Sent").notNull().default(false),
  reminder2Sent:       boolean("reminder2Sent").notNull().default(false),
  reviewSent:          boolean("reviewSent").notNull().default(false),
  bookingToken:        varchar("bookingToken", { length: 64 }),   // for reschedule link
  source:              varchar("source", { length: 32 }).default("manual"), // manual | portal | phone
  createdAt:           bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt:           bigint("updatedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

// ── Loyalty Settings (per workspace) ─────────────────────────────────────────
export const loyaltySettings = mysqlTable("loyalty_settings", {
  id:                int("id").autoincrement().primaryKey(),
  workspaceId:       int("workspaceId").notNull().unique(),
  isEnabled:         boolean("isEnabled").notNull().default(false),
  pointsPerDollar:   int("pointsPerDollar").notNull().default(2),   // e.g. 2 pts per $1 spent
  dollarsPerPoint:   int("dollarsPerPoint").notNull().default(10),   // e.g. 10 pts = $1
  smsFrequencyDays:  int("smsFrequencyDays").notNull().default(21),  // send balance SMS every N days
  createdAt:         bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt:         bigint("updatedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type LoyaltySettings = typeof loyaltySettings.$inferSelect;
export type InsertLoyaltySettings = typeof loyaltySettings.$inferInsert;

// ── Loyalty Balances (per contact per workspace) ──────────────────────────────
export const loyaltyBalances = mysqlTable("loyalty_balances", {
  id:             int("id").autoincrement().primaryKey(),
  workspaceId:    int("workspaceId").notNull(),
  contactId:      int("contactId").notNull(),
  pointsBalance:  int("pointsBalance").notNull().default(0),
  totalEarned:    int("totalEarned").notNull().default(0),
  totalRedeemed:  int("totalRedeemed").notNull().default(0),
  lastSmsSentAt:  bigint("lastSmsSentAt", { mode: "number" }),
  createdAt:      bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt:      bigint("updatedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type LoyaltyBalance = typeof loyaltyBalances.$inferSelect;
export type InsertLoyaltyBalance = typeof loyaltyBalances.$inferInsert;

// ── Booking Portal Settings (per workspace) ───────────────────────────────────
export const bookingPortalSettings = mysqlTable("booking_portal_settings", {
  id:              int("id").autoincrement().primaryKey(),
  workspaceId:     int("workspaceId").notNull().unique(),
  isEnabled:       boolean("isEnabled").notNull().default(false),
  slug:            varchar("slug", { length: 64 }).unique(),
  welcomeMessage:  text("welcomeMessage"),
  businessHours:   text("businessHours"),   // JSON: { mon: { open: "09:00", close: "17:00", enabled: true }, ... }
  bufferMinutes:   int("bufferMinutes").notNull().default(15),  // gap between appointments
  maxDaysAhead:    int("maxDaysAhead").notNull().default(30),
  createdAt:       bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt:       bigint("updatedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type BookingPortalSettings = typeof bookingPortalSettings.$inferSelect;
export type InsertBookingPortalSettings = typeof bookingPortalSettings.$inferInsert;

// ── Appointment Reminder Templates (per workspace) ────────────────────────────
export const appointmentReminderTemplates = mysqlTable("appointment_reminder_templates", {
  id:              int("id").autoincrement().primaryKey(),
  workspaceId:     int("workspaceId").notNull().unique(),
  confirmationSms: text("confirmationSms"),
  reminder24Sms:   text("reminder24Sms"),
  reminder2Sms:    text("reminder2Sms"),
  reviewSms:       text("reviewSms"),
  confirmationEmail: text("confirmationEmail"),
  createdAt:       bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt:       bigint("updatedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type AppointmentReminderTemplates = typeof appointmentReminderTemplates.$inferSelect;
export type InsertAppointmentReminderTemplates = typeof appointmentReminderTemplates.$inferInsert;


// ── Voucher Settings (per workspace) ─────────────────────────────────────────
// Owners configure default expiry and other gift voucher behaviour here.
export const voucherSettings = mysqlTable("voucher_settings", {
  id:                int("id").autoincrement().primaryKey(),
  workspaceId:       int("workspaceId").notNull().unique(),
  defaultExpiryDays: int("defaultExpiryDays").notNull().default(365),  // 0 = never expire
  minAmountCents:    int("minAmountCents").notNull().default(500),      // $5 minimum
  maxAmountCents:    int("maxAmountCents").notNull().default(50000),    // $500 maximum
  prefix:            varchar("prefix", { length: 8 }).notNull().default("GV"),
  createdAt:         bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt:         bigint("updatedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type VoucherSettings = typeof voucherSettings.$inferSelect;
export type InsertVoucherSettings = typeof voucherSettings.$inferInsert;

// ── Gift Vouchers ─────────────────────────────────────────────────────────────
export const giftVouchers = mysqlTable("gift_vouchers", {
  id:              int("id").autoincrement().primaryKey(),
  workspaceId:     int("workspaceId").notNull(),
  code:            varchar("code", { length: 32 }).notNull().unique(),
  amountCents:     int("amountCents").notNull(),
  balanceCents:    int("balanceCents").notNull(),
  issuedByUserId:  int("issuedByUserId").notNull(),
  note:            text("note"),
  expiresAt:       bigint("expiresAt", { mode: "number" }),  // null = never expires
  redeemedAt:      bigint("redeemedAt", { mode: "number" }),
  createdAt:       bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt:       bigint("updatedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GiftVoucher = typeof giftVouchers.$inferSelect;
export type InsertGiftVoucher = typeof giftVouchers.$inferInsert;

// ── Quick Charge Transactions ─────────────────────────────────────────────────
export const quickChargeTransactions = mysqlTable("quick_charge_transactions", {
  id:           int("id").autoincrement().primaryKey(),
  workspaceId:  int("workspaceId").notNull(),
  amountCents:  int("amountCents").notNull(),
  type:         varchar("type", { length: 32 }).notNull(),  // 'charge' | 'gift_voucher_sale' | 'gift_voucher_redemption' | 'loyalty_redemption'
  reference:    varchar("reference", { length: 128 }),       // Stripe session ID or voucher code
  contactId:    int("contactId"),
  note:         text("note"),
  createdAt:    bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type QuickChargeTransaction = typeof quickChargeTransactions.$inferSelect;
export type InsertQuickChargeTransaction = typeof quickChargeTransactions.$inferInsert;

// ── Pending Snaps (Snap to Post demo — pre-auth) ──────────────────────────────
// Stores a snap created during the free demo before the user has an account.
// The sessionToken is saved in localStorage and used to retrieve + publish the
// snap after the user completes OAuth / onboarding.
export const pendingSnaps = mysqlTable("pending_snaps", {
  id:            int("id").autoincrement().primaryKey(),
  sessionToken:  varchar("sessionToken", { length: 64 }).notNull().unique(),
  imageUrl:      text("imageUrl").notNull(),
  caption:       text("caption").notNull(),
  hashtags:      text("hashtags").notNull(),           // JSON array stored as text
  platform:      varchar("platform", { length: 32 }).notNull(),
  websiteUrl:    varchar("websiteUrl", { length: 512 }),
  published:     tinyint("published").notNull().default(0),
  publishedAt:   bigint("publishedAt", { mode: "number" }),
  expiresAt:     bigint("expiresAt", { mode: "number" }).notNull(),
  createdAt:     bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type PendingSnap = typeof pendingSnaps.$inferSelect;
export type InsertPendingSnap = typeof pendingSnaps.$inferInsert;

// ── Trial Feedback (Founding Member 30-day trial) ─────────────────────────────
export const trialFeedback = mysqlTable("trial_feedback", {
  id:               int("id").autoincrement().primaryKey(),
  userId:           int("userId").notNull(),
  workspaceId:      int("workspaceId"),
  weekNumber:       int("weekNumber").notNull(),
  submissionNumber: int("submissionNumber").notNull(),
  overallRating:    int("overallRating").notNull(),
  whatWorked:       text("whatWorked"),
  whatDidntWork:    text("whatDidntWork"),
  suggestions:      text("suggestions"),
  postCount:        int("postCount"),
  wouldRecommend:   tinyint("wouldRecommend"),
  createdAt:        bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type TrialFeedback = typeof trialFeedback.$inferSelect;
export type InsertTrialFeedback = typeof trialFeedback.$inferInsert;

// ── Client Intelligence Reports (Stage 1 of 7-stage pipeline) ────────────────
// Stores the full 9-section intelligence report as structured JSON.
// This is the foundation that feeds Stages 2-7.
// Section 3 (competitive_position) is INTERNAL ONLY — never shown to customer.
export const intelligenceReports = mysqlTable("intelligence_reports", {
  id:                    int("id").autoincrement().primaryKey(),
  workspaceId:           int("workspaceId").notNull(),
  userId:                int("userId").notNull(),
  websiteUrl:            varchar("websiteUrl", { length: 2048 }).notNull(),
  reportVersion:         varchar("reportVersion", { length: 10 }).default("1.0").notNull(),
  overallConfidenceScore: int("overallConfidenceScore").default(0).notNull(),
  // The full 9-section report stored as structured labelled JSON
  reportData:            json("reportData").notNull(),
  // Brand voice extracted from voice summary (separate for quick access)
  brandVoice:            json("brandVoice").$type<{
    exact_phrases: string[];
    differentiators: string[];
    natural_tone: string;
    problems_they_solve: string[];
  }>(),
  // Generation status — sections populate progressively
  status:                mysqlEnum("status", ["generating", "partial", "complete", "failed"]).default("generating").notNull(),
  sectionsCompleted:     json("sectionsCompleted").$type<string[]>().default([]),
  // Link back to the audit that triggered this report
  auditShareToken:       varchar("auditShareToken", { length: 64 }),
  // Stage 2 approval
  strategyApproved:      boolean("strategyApproved").default(false).notNull(),
  strategyApprovedAt:    bigint("strategyApprovedAt", { mode: "number" }),
  strategyApprovedBy:    int("strategyApprovedBy"),
  // Timestamps
  createdAt:             bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt:             bigint("updatedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type IntelligenceReport = typeof intelligenceReports.$inferSelect;
export type InsertIntelligenceReport = typeof intelligenceReports.$inferInsert;

// --- Custom Auth: Password Reset Tokens --------------------------------------
// Used by the Blastly-branded email/password auth flow (not Manus OAuth).
// Each row is a one-time token emailed to the user for password reset.
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id:        int("id").autoincrement().primaryKey(),
  userId:    int("userId").notNull(),
  token:     varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
  usedAt:    bigint("usedAt", { mode: "number" }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// --- Client Monthly Stats -------------------------------------------------------
// One row per workspace per calendar month.
// Unique constraint on (workspaceId, month) — always upserted, never duplicated.
// hours_saved is recalculated server-side on every upsert using the formula:
//   ROUND((blogsPublished×120 + socialPostsPublished×25 + callsHandled×8 + appointmentsBooked×10) / 60)
// activeFeatures controls which stat cards appear in the Command Centre widget.
export const clientMonthlyStats = mysqlTable("client_monthly_stats", {
  id:                    int("id").autoincrement().primaryKey(),
  workspaceId:           int("workspaceId").notNull(),
  // First day of the month, e.g. 2026-05-01 stored as YYYY-MM-DD string
  month:                 varchar("month", { length: 10 }).notNull(),  // "2026-05"
  // Activity counters — incremented by server hooks as events occur
  blogsPublished:        int("blogsPublished").default(0).notNull(),
  socialPostsPublished:  int("socialPostsPublished").default(0).notNull(),
  peopleReached:         int("peopleReached").default(0).notNull(),
  callsHandled:          int("callsHandled").default(0).notNull(),
  appointmentsBooked:    int("appointmentsBooked").default(0).notNull(),
  newEnquiries:          int("newEnquiries").default(0).notNull(),
  aiCitations:           int("aiCitations").default(0).notNull(),
  // Auto-calculated: ROUND((blogs×120 + posts×25 + calls×8 + appts×10) / 60)
  hoursSaved:            int("hoursSaved").default(0).notNull(),
  // JSON array of active feature keys — controls which cards appear in widget
  // e.g. ["blogs","social","ai_voice","appointments","mcp_engine"]
  activeFeatures:        json("activeFeatures").$type<string[]>().default([]),
  createdAt:             timestamp("createdAt").defaultNow().notNull(),
  updatedAt:             timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ClientMonthlyStat = typeof clientMonthlyStats.$inferSelect;
export type InsertClientMonthlyStat = typeof clientMonthlyStats.$inferInsert;
