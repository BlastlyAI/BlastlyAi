import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  analytics,
  auditReports,
  campaigns,
  connectedApps,
  contentAssets,
  contentLibrary,
  creditTransactions,
  notifications,
  postPlatforms,
  posts,
  socialAccounts,
  socialSetupProgress,
  subscriptions,
  users,
  webhookEvents,
  workspaceMembers,
  workspaces,
  type InsertUser,
  type InsertSubscription,
  type InsertContentAsset,
  type InsertCreditTransaction,
  type SocialSetupProgress,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const f of textFields) {
    if (user[f] !== undefined) { values[f] = user[f] ?? null; updateSet[f] = user[f] ?? null; }
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Workspaces ───────────────────────────────────────────────────────────────
export async function getAllWorkspaces() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workspaces).orderBy(desc(workspaces.createdAt));
}

export async function getWorkspacesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const owned = await db.select().from(workspaces).where(eq(workspaces.ownerId, userId));
  const memberships = await db.select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers).where(eq(workspaceMembers.userId, userId));
  const memberIds = memberships.map((m) => m.workspaceId).filter((id) => !owned.find((w) => w.id === id));
  if (memberIds.length === 0) return owned;
  const memberWs = await Promise.all(memberIds.map((id) =>
    db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1).then((r) => r[0])
  ));
  return [...owned, ...memberWs.filter(Boolean)];
}

export async function getWorkspaceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
  return result[0];
}

export async function createWorkspace(data: { name: string; slug: string; ownerId: number; logoUrl?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.insert(workspaces).values(data);
}

export async function updateWorkspace(id: number, data: Partial<{ name: string; logoUrl: string; website: string; industry: string; description: string; primaryColor: string; secondaryColor: string; toneOfVoice: string; targetAudience: string; planTier: "free" | "fix_my_brand" | "managed_social" | "everything"; stripeCustomerId: string; stripeSubscriptionId: string; subscriptionStatus: "active" | "cancelled" | "past_due" | "trialing" | "none"; trialEndsAt: Date | null; ayrshareProfileKey: string; setupFeePaid: boolean; creditsBalance: number; selectedPlatforms: string[]; onboardingStep: number; onboardingComplete: boolean; googleReviewUrl: string; phone: string; address: string; tagline: string; geographicReach: string; locationCity: string; locationState: string; locationCountry: string; industries: string[]; otherIndustry: string; ageRanges: string[]; contactEmail: string; contactMobile: string }>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.update(workspaces).set(data).where(eq(workspaces.id, id));
}

// ─── Workspace Members ────────────────────────────────────────────────────────
export async function getMemberRole(workspaceId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  return result[0]?.role ?? null;
}

export async function getWorkspaceMembers(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: workspaceMembers.id,
    userId: workspaceMembers.userId,
    role: workspaceMembers.role,
    joinedAt: workspaceMembers.joinedAt,
    name: users.name,
    email: users.email,
  })
    .from(workspaceMembers)
    .leftJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId));
}

export async function addWorkspaceMember(data: { workspaceId: number; userId: number; role: "admin" | "editor" | "viewer"; invitedByUserId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.insert(workspaceMembers).values(data);
}

export async function updateMemberRole(id: number, role: "admin" | "editor" | "viewer") {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.update(workspaceMembers).set({ role }).where(eq(workspaceMembers.id, id));
}

export async function removeWorkspaceMember(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.delete(workspaceMembers).where(eq(workspaceMembers.id, id));
}

// ─── Social Accounts ──────────────────────────────────────────────────────────
export async function getSocialAccounts(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(socialAccounts).where(eq(socialAccounts.workspaceId, workspaceId));
}

export async function upsertSocialAccount(data: {
  workspaceId: number; userId: number;
  platform: "twitter" | "linkedin" | "facebook" | "instagram" | "tiktok" | "reddit" | "youtube" | "pinterest" | "bluesky";
  platformAccountId: string; platformUsername?: string; platformDisplayName?: string;
  platformAvatarUrl?: string; accessToken?: string; refreshToken?: string;
  tokenExpiresAt?: Date; scopes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return db.insert(socialAccounts).values({ ...data, isActive: true } as any).onDuplicateKeyUpdate({
    set: {
      platformUsername: data.platformUsername,
      platformDisplayName: data.platformDisplayName,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      tokenExpiresAt: data.tokenExpiresAt,
      scopes: data.scopes,
      isActive: true,
    },
  });
}

export async function disconnectSocialAccount(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.update(socialAccounts).set({ isActive: false }).where(eq(socialAccounts.id, id));
}

export async function deleteSocialAccount(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.delete(socialAccounts).where(eq(socialAccounts.id, id));
}

// ─── Campaigns ────────────────────────────────────────────────────────────────
export async function getCampaigns(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaigns).where(eq(campaigns.workspaceId, workspaceId)).orderBy(desc(campaigns.createdAt));
}

export async function getCampaignById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return result[0];
}

export async function createCampaign(data: {
  workspaceId: number; name: string; description?: string; promotedUrl?: string;
  goal?: "awareness" | "traffic" | "engagement" | "conversions" | "leads";
  utmSource?: string; utmMedium?: string; utmCampaign?: string;
  startsAt?: Date; endsAt?: Date; createdByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.insert(campaigns).values(data);
}

export async function updateCampaign(id: number, data: Partial<{
  name: string; description: string; promotedUrl: string;
  goal: "awareness" | "traffic" | "engagement" | "conversions" | "leads";
  status: "draft" | "active" | "paused" | "completed";
  utmSource: string; utmMedium: string; utmCampaign: string;
  startsAt: Date; endsAt: Date;
}>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.update(campaigns).set(data).where(eq(campaigns.id, id));
}

export async function deleteCampaign(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.delete(campaigns).where(eq(campaigns.id, id));
}

// ─── Posts ────────────────────────────────────────────────────────────────────
export async function getPosts(workspaceId: number, filters?: { campaignId?: number; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(posts.workspaceId, workspaceId)];
  if (filters?.campaignId) conditions.push(eq(posts.campaignId, filters.campaignId));
  if (filters?.status) conditions.push(eq(posts.status, filters.status as "draft" | "scheduled" | "published" | "failed" | "cancelled"));
  return db.select().from(posts).where(and(...conditions)).orderBy(desc(posts.createdAt));
}

export async function getScheduledPosts(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(posts)
    .where(and(eq(posts.workspaceId, workspaceId), eq(posts.status, "scheduled")))
    .orderBy(posts.scheduledAt);
}

export async function getPostById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return result[0];
}

export async function createPost(data: {
  workspaceId: number; campaignId?: number; title?: string; bodyText?: string;
  mediaUrls?: string[]; hashtags?: string[];
  utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string; utmTerm?: string;
  trackedUrl?: string; status?: "draft" | "scheduled" | "published" | "failed" | "cancelled";
  scheduledAt?: Date; createdByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.insert(posts).values(data);
}

export async function updatePost(id: number, data: Partial<{
  title: string; bodyText: string; mediaUrls: string[]; hashtags: string[];
  utmSource: string; utmMedium: string; utmCampaign: string; utmContent: string; utmTerm: string;
  trackedUrl: string; status: "draft" | "scheduled" | "published" | "failed" | "cancelled";
  scheduledAt: Date | null; campaignId: number | null;
}>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.update(posts).set(data).where(eq(posts.id, id));
}

export async function deletePost(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.delete(posts).where(eq(posts.id, id));
}

export async function getPostPlatforms(postId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(postPlatforms).where(eq(postPlatforms.postId, postId));
}

export async function upsertPostPlatform(data: {
  postId: number; socialAccountId: number;
  platform: "twitter" | "linkedin" | "facebook" | "instagram" | "tiktok";
  customText?: string; customHashtags?: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.insert(postPlatforms).values(data);
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export async function getAnalyticsByWorkspace(workspaceId: number, campaignId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(analytics.workspaceId, workspaceId)];
  if (campaignId) conditions.push(eq(analytics.campaignId, campaignId));
  return db.select().from(analytics).where(and(...conditions)).orderBy(desc(analytics.recordedAt)).limit(200);
}

export async function getAnalyticsSummary(workspaceId: number) {
  const db = await getDb();
  if (!db) return { totalImpressions: 0, totalClicks: 0, totalLikes: 0, totalShares: 0, totalUtmClicks: 0, totalUtmConversions: 0 };
  const result = await db.select({
    totalImpressions: sql<number>`SUM(impressions)`,
    totalClicks: sql<number>`SUM(clicks)`,
    totalLikes: sql<number>`SUM(likes)`,
    totalShares: sql<number>`SUM(shares)`,
    totalUtmClicks: sql<number>`SUM(utmClicks)`,
    totalUtmConversions: sql<number>`SUM(utmConversions)`,
  }).from(analytics).where(eq(analytics.workspaceId, workspaceId));
  return result[0] ?? { totalImpressions: 0, totalClicks: 0, totalLikes: 0, totalShares: 0, totalUtmClicks: 0, totalUtmConversions: 0 };
}

export async function insertAnalytics(data: {
  workspaceId: number; postId?: number; postPlatformId?: number; campaignId?: number;
  platform: "twitter" | "linkedin" | "facebook" | "instagram" | "tiktok";
  impressions?: number; clicks?: number; likes?: number; comments?: number;
  shares?: number; reach?: number; utmClicks?: number; utmConversions?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.insert(analytics).values(data);
}

// ─── Content Library ──────────────────────────────────────────────────────────
export async function getContentLibrary(workspaceId: number, type?: "template" | "hashtag_set" | "brand_asset") {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(contentLibrary.workspaceId, workspaceId)];
  if (type) conditions.push(eq(contentLibrary.type, type));
  return db.select().from(contentLibrary).where(and(...conditions)).orderBy(desc(contentLibrary.createdAt));
}

export async function createContentLibraryItem(data: {
  workspaceId: number; type: "template" | "hashtag_set" | "brand_asset";
  name: string; content?: string; tags?: string[]; assetUrl?: string;
  assetMimeType?: string; platforms?: string[]; createdByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.insert(contentLibrary).values(data);
}

export async function updateContentLibraryItem(id: number, data: Partial<{ name: string; content: string; tags: string[]; platforms: string[] }>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.update(contentLibrary).set(data).where(eq(contentLibrary.id, id));
}

export async function deleteContentLibraryItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.delete(contentLibrary).where(eq(contentLibrary.id, id));
}

// ─── Notifications ────────────────────────────────────────────────────────────
export async function getNotifications(userId: number, workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.workspaceId, workspaceId)))
    .orderBy(desc(notifications.createdAt)).limit(50);
}

export async function getUnreadNotificationCount(userId: number, workspaceId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`COUNT(*)` }).from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.workspaceId, workspaceId), eq(notifications.isRead, false)));
  return Number(result[0]?.count ?? 0);
}

export async function createNotification(data: {
  workspaceId: number; userId: number; type: string; title: string; message?: string; linkUrl?: string;
}) {
  const db = await getDb();
  if (!db) return;
  return db.insert(notifications).values(data);
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  return db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(userId: number, workspaceId: number) {
  const db = await getDb();
  if (!db) return;
  return db.update(notifications).set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.workspaceId, workspaceId)));
}

// ─── Subscriptions ────────────────────────────────────────────────────────────
export async function upsertSubscription(data: InsertSubscription): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(subscriptions)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        plan: data.plan,
        status: data.status,
        currentPeriodEnd: data.currentPeriodEnd,
      },
    });
}

export async function getSubscriptionByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateSubscriptionByStripeId(
  stripeSubscriptionId: string,
  data: Partial<InsertSubscription>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(subscriptions)
    .set(data)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
}

// ── Connected Apps ────────────────────────────────────────────────────────────
export async function createConnectedApp(data: {
  workspaceId: number;
  appSlug: string;
  appName: string;
  webhookSecret: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(connectedApps).values(data);
  return result;
}

export async function getConnectedAppBySecret(secret: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(connectedApps)
    .where(eq(connectedApps.webhookSecret, secret))
    .limit(1);
  return rows[0] ?? null;
}

export async function listConnectedApps(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(connectedApps)
    .where(eq(connectedApps.workspaceId, workspaceId));
}

export async function deactivateConnectedApp(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(connectedApps)
    .set({ isActive: false })
    .where(eq(connectedApps.id, id));
}

export async function touchConnectedApp(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(connectedApps)
    .set({ lastEventAt: new Date() })
    .where(eq(connectedApps.id, id));
}

// ── Webhook Events ────────────────────────────────────────────────────────────
export async function createWebhookEvent(data: {
  connectedAppId: number;
  workspaceId: number;
  eventType: string;
  payload: unknown;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(webhookEvents).values({
    connectedAppId: data.connectedAppId,
    workspaceId: data.workspaceId,
    eventType: data.eventType,
    payload: data.payload as Record<string, unknown>,
    status: "pending",
  });
  return result;
}

export async function updateWebhookEvent(
  id: number,
  update: { status: "done" | "error"; errorMessage?: string; generatedPostIds?: number[] }
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(webhookEvents)
    .set({
      status: update.status,
      errorMessage: update.errorMessage ?? null,
      generatedPostIds: update.generatedPostIds ?? null,
      processedAt: new Date(),
    })
    .where(eq(webhookEvents.id, id));
}

export async function listWebhookEvents(workspaceId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.workspaceId, workspaceId))
    .orderBy(desc(webhookEvents.createdAt))
    .limit(limit);
}

// ─── Content Assets (Content Studio) ─────────────────────────────────────────
export async function createContentAsset(data: InsertContentAsset) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(contentAssets).values(data);
  return result;
}

export async function getContentAssetById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(contentAssets).where(eq(contentAssets.id, id)).limit(1);
  return rows[0];
}

export async function listContentAssets(workspaceId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentAssets)
    .where(eq(contentAssets.workspaceId, workspaceId))
    .orderBy(desc(contentAssets.createdAt))
    .limit(limit);
}

export async function updateContentAsset(id: number, data: Partial<{
  voiceNoteUrl: string; voiceTranscript: string; aiCaptions: Record<string, string>;
  selectedPlatforms: string[]; status: "uploading" | "transcribing" | "captioning" | "ready" | "approved" | "published" | "failed";
  publishedPostId: number; scheduledAt: Date;
}>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.update(contentAssets).set(data).where(eq(contentAssets.id, id));
}

// ─── Credit Transactions ──────────────────────────────────────────────────────
export async function createCreditTransaction(data: InsertCreditTransaction) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(creditTransactions).values(data);
  return result;
}

export async function listCreditTransactions(workspaceId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditTransactions)
    .where(eq(creditTransactions.workspaceId, workspaceId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit);
}

/**
 * Atomically deduct credits from a workspace balance.
 * Returns the new balance, or throws if insufficient credits.
 */
export async function deductCredits(workspaceId: number, amount: number, description: string, postId?: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Fetch current balance
  const ws = await getWorkspaceById(workspaceId);
  if (!ws) throw new Error("Workspace not found");
  const current = ws.creditsBalance ?? 0;
  if (current < amount) throw new Error(`Insufficient credits: ${current} available, ${amount} required`);
  const newBalance = current - amount;
  await db.update(workspaces).set({ creditsBalance: newBalance }).where(eq(workspaces.id, workspaceId));
  await db.insert(creditTransactions).values({
    workspaceId, amount: -amount, type: "deduct", description, postId: postId ?? null,
  });
  return newBalance;
}

/**
 * Add credits to a workspace balance (purchase or bonus).
 */
export async function addCredits(workspaceId: number, amount: number, type: "purchase" | "bonus", description: string, stripePaymentIntentId?: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const ws = await getWorkspaceById(workspaceId);
  if (!ws) throw new Error("Workspace not found");
  const newBalance = (ws.creditsBalance ?? 0) + amount;
  await db.update(workspaces).set({ creditsBalance: newBalance }).where(eq(workspaces.id, workspaceId));
  await db.insert(creditTransactions).values({
    workspaceId, amount, type, description, stripePaymentIntentId: stripePaymentIntentId ?? null,
  });
  return newBalance;
}

// ─── Social Setup Progress ────────────────────────────────────────────────────

/** Get the setup progress record for a workspace (returns null if not started). */
export async function getSetupProgress(workspaceId: number): Promise<SocialSetupProgress | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(socialSetupProgress).where(eq(socialSetupProgress.workspaceId, workspaceId)).limit(1);
  return rows[0] ?? null;
}

/** Upsert the setup progress for a workspace. */
export async function saveSetupProgress(
  workspaceId: number,
  data: {
    step1Done?: boolean;
    step2Done?: boolean;
    step3Done?: boolean;
    activeStep?: number;
    completedSetups?: string[];
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await getSetupProgress(workspaceId);
  if (existing) {
    await db.update(socialSetupProgress)
      .set({ ...data })
      .where(eq(socialSetupProgress.workspaceId, workspaceId));
  } else {
    await db.insert(socialSetupProgress).values({ workspaceId, ...data });
  }
}

/** Get setup progress for ALL workspaces — admin use only. */
export async function getAllSetupProgress(): Promise<SocialSetupProgress[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(socialSetupProgress);
}

/**
 * Admin-only: returns enriched per-workspace intelligence for the admin dashboard.
 * Joins workspaces, socialAccounts (connected platform count), users (lastSignedIn),
 * and socialSetupProgress in a single efficient pass.
 */
export async function adminGetClientIntelligence() {
  const db = await getDb();
  if (!db) return [];

  const [allWorkspaces, allProgress, allSocialAccounts, allUsers, postStats, failedPostStats, auditStats] = await Promise.all([
    db.select().from(workspaces).orderBy(desc(workspaces.createdAt)),
    db.select().from(socialSetupProgress),
    db.select({ workspaceId: socialAccounts.workspaceId, platform: socialAccounts.platform }).from(socialAccounts),
    db.select({ id: users.id, lastSignedIn: users.lastSignedIn }).from(users),
    // Total posts and published posts per workspace
    db.select({
      workspaceId: posts.workspaceId,
      total: sql<number>`count(*)`,
      published: sql<number>`sum(case when ${posts.status} = 'published' then 1 else 0 end)`,
    }).from(posts).groupBy(posts.workspaceId),
    // Failed post-platform attempts per workspace
    db.select({
      workspaceId: posts.workspaceId,
      failed: sql<number>`count(*)`,
    }).from(postPlatforms)
      .innerJoin(posts, eq(postPlatforms.postId, posts.id))
      .where(eq(postPlatforms.status, "failed"))
      .groupBy(posts.workspaceId),
    // Latest audit score per workspace
    db.select({
      workspaceId: auditReports.workspaceId,
      overallScore: auditReports.overallScore,
      createdAt: auditReports.createdAt,
    }).from(auditReports)
      .where(sql`${auditReports.workspaceId} is not null`)
      .orderBy(desc(auditReports.createdAt)),
  ]);

  const progressMap = new Map(allProgress.map(p => [p.workspaceId, p]));
  const userMap = new Map(allUsers.map(u => [u.id, u]));

  // Post stats maps
  const postStatsMap = new Map(postStats.map(p => [p.workspaceId, p]));
  const failedStatsMap = new Map(failedPostStats.map(p => [p.workspaceId, p]));

  // Latest audit score per workspace (first occurrence = most recent due to orderBy desc)
  const auditScoreMap = new Map<number, number>();
  for (const a of auditStats) {
    if (a.workspaceId !== null && !auditScoreMap.has(a.workspaceId)) {
      auditScoreMap.set(a.workspaceId, a.overallScore ?? 0);
    }
  }

  // Count active social accounts per workspace
  const platformCountMap = new Map<number, number>();
  for (const sa of allSocialAccounts) {
    platformCountMap.set(sa.workspaceId, (platformCountMap.get(sa.workspaceId) ?? 0) + 1);
  }

  return allWorkspaces.map(ws => {
    const p = progressMap.get(ws.id);
    const owner = userMap.get(ws.ownerId);
    const platformCount = platformCountMap.get(ws.id) ?? 0;
    const stepsCompleted = p
      ? [p.step1Done, p.step2Done, p.step3Done].filter(Boolean).length
      : 0;
    const lastActive = owner?.lastSignedIn ?? null;
    const daysSinceActive = lastActive
      ? Math.floor((Date.now() - new Date(lastActive).getTime()) / 86_400_000)
      : null;
    const churnRisk: "none" | "amber" | "red" =
      daysSinceActive === null ? "none"
      : daysSinceActive >= 14 ? "red"
      : daysSinceActive >= 7 ? "amber"
      : "none";

    const ps = postStatsMap.get(ws.id);
    const fs = failedStatsMap.get(ws.id);

    return {
      workspaceId: ws.id,
      name: ws.name,
      website: ws.website ?? null,
      logoUrl: ws.logoUrl ?? null,
      industry: ws.industry ?? null,
      planTier: (ws.planTier ?? "free") as "free" | "fix_my_brand" | "managed_social",
      subscriptionStatus: (ws.subscriptionStatus ?? "none") as "active" | "cancelled" | "past_due" | "trialing" | "none",
      createdAt: ws.createdAt,
      platformCount,
      stepsCompleted,
      step1Done: p?.step1Done ?? false,
      step2Done: p?.step2Done ?? false,
      step3Done: p?.step3Done ?? false,
      lastActive,
      daysSinceActive,
      churnRisk,
      // New per-client stats
      postsTotal: Number(ps?.total ?? 0),
      postsPublished: Number(ps?.published ?? 0),
      postsFailed: Number(fs?.failed ?? 0),
      auditScore: auditScoreMap.get(ws.id) ?? null,
    };
  });
}

// ─── Client Monthly Stats ─────────────────────────────────────────────────────

/** Returns the current month string in "YYYY-MM" format (UTC). */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Increment a single counter field for the current month's row.
 * Automatically recalculates hoursSaved after every upsert.
 * Uses INSERT … ON DUPLICATE KEY UPDATE so it's safe to call concurrently.
 */
export async function incrementMonthlyStat(
  workspaceId: number,
  field: "blogsPublished" | "socialPostsPublished" | "peopleReached" | "callsHandled" | "appointmentsBooked" | "newEnquiries" | "aiCitations",
  by = 1,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const month = currentMonth();

  // hoursSaved = ROUND((blogsPublished*120 + socialPostsPublished*25 + callsHandled*8 + appointmentsBooked*10) / 60)
  const hoursSavedExpr = `ROUND((blogsPublished * 120 + socialPostsPublished * 25 + callsHandled * 8 + appointmentsBooked * 10) / 60)`;

  await db.execute(
    sql.raw(`INSERT INTO client_monthly_stats
       (workspaceId, month, ${field}, hoursSaved)
     VALUES (${workspaceId}, '${month}', ${by}, 0)
     ON DUPLICATE KEY UPDATE
       ${field} = ${field} + ${by},
       hoursSaved = ${hoursSavedExpr},
       updatedAt = NOW()`),
  );
}

/**
 * Set the peopleReached counter to an absolute value (not incremental),
 * used when syncing from analytics totals.
 */
export async function setMonthlyPeopleReached(
  workspaceId: number,
  value: number,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const month = currentMonth();
  await db.execute(
    sql.raw(`INSERT INTO client_monthly_stats (workspaceId, month, peopleReached)
     VALUES (${workspaceId}, '${month}', ${value})
     ON DUPLICATE KEY UPDATE
       peopleReached = ${value},
       updatedAt = NOW()`),
  );
}

/**
 * Get the current month's stats row for a workspace.
 * Returns null if no row exists yet (i.e. no activity this month).
 */
export async function getMonthlyStats(workspaceId: number, month?: string) {
  const db = await getDb();
  if (!db) return null;
  const m = month ?? currentMonth();
  const result = await db.execute(
    sql.raw(`SELECT * FROM client_monthly_stats WHERE workspaceId = ${workspaceId} AND month = '${m}' LIMIT 1`),
  ) as any;
  const rows = Array.isArray(result) ? result[0] : result;
  return (Array.isArray(rows) ? rows[0] : null) ?? null;
}

/**
 * Update the activeFeatures JSON array for a workspace's current month row.
 * Creates the row if it doesn't exist.
 */
export async function setMonthlyActiveFeatures(
  workspaceId: number,
  features: string[],
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const month = currentMonth();
  const featuresJson = JSON.stringify(features).replace(/'/g, "''");
  await db.execute(
    sql.raw(`INSERT INTO client_monthly_stats (workspaceId, month, activeFeatures)
     VALUES (${workspaceId}, '${month}', '${featuresJson}')
     ON DUPLICATE KEY UPDATE
       activeFeatures = '${featuresJson}',
       updatedAt = NOW()`),
  );
}
