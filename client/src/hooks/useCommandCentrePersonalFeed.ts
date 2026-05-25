import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/_core/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { useDashboardAudit } from "@/hooks/useDashboardAudit";
import { listNotifications } from "@/lib/supabaseNotifications";
import {
  buildAuditFeedItems,
  notificationsToFeedItems,
  type CommandCentreFeedItem,
} from "@/lib/commandCentreFromAudit";

/** Personalized Command Centre feed — audit + notifications when live feed is empty. */
export function useCommandCentrePersonalFeed(
  trpcItems: CommandCentreFeedItem[]
): {
  items: CommandCentreFeedItem[];
  hasPersonalData: boolean;
  fromAudit: boolean;
} {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { assistantName } = usePlanAccess();
  const dashboard = useDashboardAudit();
  const wsId = currentWorkspace?.id ?? 0;

  const notificationsQuery = useQuery({
    queryKey: ["command-centre-notifications", user?.id],
    queryFn: () => listNotifications(user!.id, 10),
    enabled: !!user?.id && trpcItems.length === 0,
    staleTime: 60_000,
  });

  return useMemo(() => {
    if (trpcItems.length > 0) {
      return { items: trpcItems, hasPersonalData: true, fromAudit: false };
    }

    const auditItems = buildAuditFeedItems(dashboard, wsId, assistantName);
    const notifItems = notificationsQuery.data
      ? notificationsToFeedItems(notificationsQuery.data, wsId)
      : [];

  const dashboardNotifs = dashboard.notifications.map((n, idx) => ({
      id: -9000 - idx,
      workspaceId: wsId,
      priority: 3,
      itemType: "message_email",
      channel: "audit",
      senderName: n.title,
      messageSnippet: n.body,
      aiContextLine: n.time,
      aiDraftReply: null,
      scheduledAt: null,
      metadata: { source: "dashboard_notification" },
      status: "open",
    })) as CommandCentreFeedItem[];

    const merged = [...notifItems, ...auditItems, ...dashboardNotifs];
    const deduped = merged.filter(
      (item, i, arr) => arr.findIndex((x) => x.messageSnippet === item.messageSnippet) === i
    );

    return {
      items: deduped,
      hasPersonalData: deduped.length > 0,
      fromAudit: auditItems.length > 0 || dashboard.fromAudit,
    };
  }, [
    trpcItems,
    dashboard,
    wsId,
    assistantName,
    notificationsQuery.data,
  ]);
}
