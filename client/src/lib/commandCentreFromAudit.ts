import type { DashboardAuditSnapshot } from "@shared/dashboardFromAudit";
import type { NotificationRow } from "@/lib/supabaseNotifications";

/** Minimal feed item shape used by CommandCentreBI. */
export type CommandCentreFeedItem = {
  id: number;
  workspaceId: number;
  priority: number;
  itemType: string;
  channel: string | null;
  senderName: string | null;
  messageSnippet: string | null;
  aiContextLine: string | null;
  aiDraftReply: string | null;
  scheduledAt: Date | null;
  metadata: Record<string, unknown> | null;
  status: string;
};

function hashId(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return -Math.abs(h || 1);
}

/** Build personalized feed items from audit + onboarding when live feed is empty. */
export function buildAuditFeedItems(
  dashboard: DashboardAuditSnapshot & { onboardingComplete?: boolean },
  workspaceId: number,
  assistantName: string
): CommandCentreFeedItem[] {
  const items: CommandCentreFeedItem[] = [];

  if (dashboard.overallScore > 0) {
    items.push({
      id: hashId("audit-score"),
      workspaceId,
      priority: 3,
      itemType: "traction_post",
      channel: "audit",
      senderName: "Audit complete",
      messageSnippet: `${dashboard.businessName} scored ${dashboard.overallScore}/100 on your website audit.`,
      aiContextLine: dashboard.weaknesses[0]
        ? `Top gap: ${dashboard.weaknesses[0]}`
        : "Review recommendations in your dashboard.",
      aiDraftReply: null,
      scheduledAt: null,
      metadata: { source: "audit", shareToken: dashboard.auditShareToken },
      status: "open",
    });
  }

  dashboard.recommendations.slice(0, 3).forEach((rec, idx) => {
    items.push({
      id: hashId(`rec-${idx}-${rec}`),
      workspaceId,
      priority: 4,
      itemType: "traction_post",
      channel: "recommendation",
      senderName: "Growth recommendation",
      messageSnippet: rec.slice(0, 120),
      aiContextLine: `${assistantName} can help implement this from your audit.`,
      aiDraftReply: null,
      scheduledAt: null,
      metadata: { source: "audit_recommendation", index: idx },
      status: "open",
    });
  });

  dashboard.suggestedPosts.slice(0, 3).forEach((post, idx) => {
    items.push({
      id: hashId(`post-${idx}-${post.id}`),
      workspaceId,
      priority: idx === 0 ? 2 : 4,
      itemType: idx === 0 ? "post_approval" : "traction_post",
      channel: post.platform.toLowerCase(),
      senderName: `${post.platform} post draft`,
      messageSnippet: post.preview.slice(0, 100),
      aiContextLine: post.title,
      aiDraftReply: post.preview,
      scheduledAt: new Date(post.scheduled),
      metadata: { source: "suggested_post", postId: post.id, platform: post.platform },
      status: "awaiting_approval",
    });
  });

  if (dashboard.services.length > 0) {
    items.push({
      id: hashId("services"),
      workspaceId,
      priority: 4,
      itemType: "traction_post",
      channel: "website",
      senderName: "Detected services",
      messageSnippet: dashboard.services.slice(0, 4).join(" · "),
      aiContextLine: "Use these in your next content batch.",
      aiDraftReply: null,
      scheduledAt: null,
      metadata: { source: "audit_services", services: dashboard.services },
      status: "open",
    });
  }

  return items;
}

export function notificationsToFeedItems(
  rows: NotificationRow[],
  workspaceId: number
): CommandCentreFeedItem[] {
  return rows.slice(0, 8).map((n, idx) => ({
    id: hashId(`notif-${n.id}`),
    workspaceId,
    priority: idx === 0 ? 1 : 3,
    itemType: /welcome|unlocked|pro/i.test(n.title) ? "lead_new" : "message_email",
    channel: "notification",
    senderName: n.title,
    messageSnippet: n.body.slice(0, 120),
    aiContextLine: new Date(n.created_at).toLocaleString("en-AU"),
    aiDraftReply: null,
    scheduledAt: new Date(n.created_at),
    metadata: { source: "notification", notificationId: n.id },
    status: n.read_at ? "read" : "open",
  }));
}
