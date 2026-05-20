import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, CheckCircle2, AlertTriangle, XCircle, Clock, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type HealthStatus = "up" | "slow" | "down";

function StatusBadge({ status }: { status: HealthStatus | null }) {
  if (!status) return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Not checked yet</Badge>;
  if (status === "up") return <Badge className="gap-1 bg-emerald-500/20 text-emerald-300 border-emerald-500/30"><CheckCircle2 className="w-3 h-3" />Online</Badge>;
  if (status === "slow") return <Badge className="gap-1 bg-amber-500/20 text-amber-300 border-amber-500/30"><AlertTriangle className="w-3 h-3" />Slow</Badge>;
  return <Badge className="gap-1 bg-red-500/20 text-red-300 border-red-500/30"><XCircle className="w-3 h-3" />Down</Badge>;
}

function UptimeBar({ checks }: { checks: Array<{ status: string; checkedAt: Date }> }) {
  if (checks.length === 0) return <div className="text-xs text-muted-foreground">No data yet</div>;
  const recent = [...checks].reverse().slice(0, 48);
  return (
    <div className="flex gap-0.5 items-center">
      {recent.map((c, i) => (
        <div
          key={i}
          title={`${c.status} at ${new Date(c.checkedAt).toLocaleTimeString()}`}
          className={`h-4 w-1.5 rounded-sm ${c.status === "up" ? "bg-emerald-500" : c.status === "slow" ? "bg-amber-500" : "bg-red-500"}`}
        />
      ))}
    </div>
  );
}

export default function AppHealth() {
  const { currentWorkspace } = useWorkspace();
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);

  const { data: healthStatus, isLoading, refetch } = trpc.workspace.getHealthStatus.useQuery(
    { workspaceId: currentWorkspace?.id ?? 0 },
    { enabled: !!currentWorkspace?.id, refetchInterval: 60_000 }
  );

  const { data: history } = trpc.workspace.getHealthHistory.useQuery(
    { connectedAppId: selectedAppId ?? 0, workspaceId: currentWorkspace?.id ?? 0, hours: 24 },
    { enabled: !!selectedAppId && !!currentWorkspace?.id }
  );

  const handleRefresh = async () => {
    await refetch();
    toast.success("Health status refreshed");
  };

  if (!currentWorkspace) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Select a workspace to view app health.
      </div>
    );
  }

  const overallStatus: HealthStatus | null = healthStatus && healthStatus.length > 0
    ? healthStatus.some(h => h.latestCheck?.status === "down") ? "down"
    : healthStatus.some(h => h.latestCheck?.status === "slow") ? "slow"
    : healthStatus.every(h => h.latestCheck?.status === "up") ? "up"
    : null
    : null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">App Health Monitor</h1>
            <p className="text-sm text-muted-foreground">Real-time uptime monitoring for all your connected apps</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Overall Status Banner */}
      {overallStatus && (
        <Card className={`border ${overallStatus === "up" ? "border-emerald-500/30 bg-emerald-500/5" : overallStatus === "slow" ? "border-amber-500/30 bg-amber-500/5" : "border-red-500/30 bg-red-500/5"}`}>
          <CardContent className="p-4 flex items-center gap-3">
            {overallStatus === "up" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {overallStatus === "slow" && <AlertTriangle className="w-5 h-5 text-amber-400" />}
            {overallStatus === "down" && <XCircle className="w-5 h-5 text-red-400" />}
            <div>
              <p className={`font-semibold ${overallStatus === "up" ? "text-emerald-300" : overallStatus === "slow" ? "text-amber-300" : "text-red-300"}`}>
                {overallStatus === "up" ? "All systems operational" : overallStatus === "slow" ? "Some apps are responding slowly" : "One or more apps are down"}
              </p>
              <p className="text-xs text-muted-foreground">Checked automatically every 5 minutes · You'll be notified immediately if anything goes down</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* App Status Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-32" />
            </Card>
          ))}
        </div>
      ) : healthStatus && healthStatus.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {healthStatus.map(({ app, latestCheck, uptimePct24h, healthUrl }) => (
            <Card
              key={app.id}
              className={`cursor-pointer transition-all hover:border-primary/40 ${selectedAppId === app.id ? "border-primary/60 bg-primary/5" : ""}`}
              onClick={() => setSelectedAppId(selectedAppId === app.id ? null : app.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">{app.appName}</CardTitle>
                  <StatusBadge status={latestCheck?.status as HealthStatus ?? null} />
                </div>
                <p className="text-xs text-muted-foreground font-mono">{app.appSlug}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Response time</span>
                  <span className={`font-mono font-medium ${latestCheck?.responseTimeMs && latestCheck.responseTimeMs > 3000 ? "text-amber-400" : "text-foreground"}`}>
                    {latestCheck?.responseTimeMs ? `${latestCheck.responseTimeMs}ms` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">24h uptime</span>
                  <span className={`font-semibold ${uptimePct24h === null ? "text-muted-foreground" : uptimePct24h >= 99 ? "text-emerald-400" : uptimePct24h >= 95 ? "text-amber-400" : "text-red-400"}`}>
                    {uptimePct24h !== null ? `${uptimePct24h}%` : "No data yet"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last checked</span>
                  <span className="text-xs">
                    {latestCheck ? new Date(latestCheck.checkedAt).toLocaleTimeString() : "Never"}
                  </span>
                </div>
                {healthUrl && (
                  <a
                    href={healthUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {healthUrl}
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
            <p className="text-muted-foreground">No connected apps to monitor yet.</p>
            <p className="text-sm text-muted-foreground">
              Go to <strong>Connected Apps</strong> to register Genius Jungle, Coach Nova, or any other app.
            </p>
          </CardContent>
        </Card>
      )}

      {/* History Panel */}
      {selectedAppId && history && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">24-Hour History — {healthStatus?.find(h => h.app.id === selectedAppId)?.app.appName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <UptimeBar checks={history as Array<{ status: string; checkedAt: Date }>} />
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {history.slice(0, 20).map((check, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    {check.status === "up" && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                    {check.status === "slow" && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                    {check.status === "down" && <XCircle className="w-3 h-3 text-red-400" />}
                    <span className="capitalize">{check.status}</span>
                    {check.errorMessage && <span className="text-muted-foreground">— {check.errorMessage}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    {check.responseTimeMs && <span>{check.responseTimeMs}ms</span>}
                    <span>{new Date(check.checkedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info box */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-4 flex gap-3">
          <Activity className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong className="text-foreground">How it works:</strong> Blastly checks each app every 5 minutes automatically.</p>
            <p>If any app goes <strong className="text-red-400">down</strong>, you'll receive an instant notification in your Manus inbox — before any customer notices.</p>
            <p>Apps currently monitored: <strong className="text-foreground">Genius Jungle</strong> · <strong className="text-foreground">Coach Nova (FitCoach AI)</strong> · <strong className="text-foreground">Blastly</strong></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
