import AppLayout from "@/components/AppLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, Calendar, Users, Megaphone, AlertCircle, Info, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  post_scheduled: { icon: Calendar, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  post_published: { icon: Check, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  post_failed: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
  campaign_milestone: { icon: Megaphone, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
  team_activity: { icon: Users, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  system: { icon: Info, color: "text-muted-foreground", bg: "bg-muted" },
};

export default function Notifications() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id ?? 0;
  const utils = trpc.useUtils();

  const { data: notifications = [], isLoading } = trpc.notifications.list.useQuery({ workspaceId: wsId }, { enabled: !!wsId });
  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => { utils.notifications.list.invalidate(); toast.success("All notifications marked as read"); },
    onError: (e) => toast.error(e.message),
  });

  const unreadCount = (notifications as any[]).filter((n: any) => !n.readAt).length;

  return (
    <AppLayout title="Notifications">
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Notifications</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => markAllReadMutation.mutate({ workspaceId: wsId })}>
              <CheckCheck className="w-3.5 h-3.5" />Mark all read
            </Button>
          )}
        </div>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
            ) : (notifications as any[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Bell className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">No notifications yet</h3>
                <p className="text-sm text-muted-foreground">You'll be notified about post statuses, campaign milestones, and team activity.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {(notifications as any[]).map((notif: any) => {
                  const config = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system;
                  const Icon = config.icon;
                  const isUnread = !notif.readAt;
                  return (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors ${isUnread ? "bg-primary/[0.02]" : ""}`}
                      onClick={() => { if (isUnread) markReadMutation.mutate({ id: notif.id }); }}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${config.bg}`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>{notif.title}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            {isUnread && <div className="w-2 h-2 rounded-full bg-primary" />}
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {format(new Date(notif.createdAt), "MMM d, h:mm a")}
                            </span>
                          </div>
                        </div>
                        {notif.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>}
                        {notif.type && (
                          <Badge variant="secondary" className="text-[9px] mt-1.5 capitalize">{notif.type.replace(/_/g, " ")}</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
