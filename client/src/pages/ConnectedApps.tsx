import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Copy, Plus, Plug, Trash2, Zap, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { getPublicApiBaseUrl } from "@/lib/apiOrigin";

// ── Pre-built app presets for quick registration ──────────────────────────────
const APP_PRESETS = [
  { name: "Genius Jungle", slug: "genius-jungle", description: "Kids coding & app-building courses (ages 7–16)" },
  { name: "Coach Nova", slug: "coach-nova", description: "AI-powered coaching platform" },
];

// ── Status badge helper ───────────────────────────────────────────────────────
function EventStatusBadge({ status }: { status: string }) {
  if (status === "done") return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Done</Badge>;
  if (status === "error") return <Badge className="bg-red-500/20 text-red-300 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
  return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
}

export default function ConnectedApps() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id ?? 0;

  // ── State ─────────────────────────────────────────────────────────────────
  const [showRegister, setShowRegister] = useState(false);
  const [appName, setAppName] = useState("");
  const [appSlug, setAppSlug] = useState("");
  const [newSecret, setNewSecret] = useState<{ secret: string; url: string } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<number | null>(null);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: apps = [], refetch: refetchApps } = trpc.workspace.listApps.useQuery(
    { workspaceId },
    { enabled: workspaceId > 0 }
  );
  const { data: events = [] } = trpc.workspace.listEvents.useQuery(
    { workspaceId, limit: 10 },
    { enabled: workspaceId > 0 }
  );

  // ── Mutations ─────────────────────────────────────────────────────────────
  const registerApp = trpc.workspace.registerApp.useMutation({
    onSuccess: (data) => {
      setNewSecret({ secret: data.webhookSecret, url: data.webhookUrl });
      setShowRegister(false);
      setAppName("");
      setAppSlug("");
      void refetchApps();
    },
    onError: (err) => toast.error(err.message),
  });

  const revokeApp = trpc.workspace.revokeApp.useMutation({
    onSuccess: () => {
      toast.success("App disconnected");
      setRevokeTarget(null);
      void refetchApps();
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  function applyPreset(preset: typeof APP_PRESETS[0]) {
    setAppName(preset.name);
    setAppSlug(preset.slug);
  }

  function copyToClipboard(text: string, label: string) {
    void navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
  }

  function handleRegister() {
    if (!appName.trim() || !appSlug.trim()) return;
    registerApp.mutate({ workspaceId, appName: appName.trim(), appSlug: appSlug.trim() });
  }

  const baseUrl = getPublicApiBaseUrl();

  if (!currentWorkspace) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Select a workspace to manage connected apps.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Plug className="w-6 h-6 text-primary" />
            Connected Apps
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect your other Manus apps to Blastly. When something worth marketing happens in those apps, Blastly automatically generates social posts for <strong>{currentWorkspace.name}</strong>.
          </p>
        </div>
        <Button onClick={() => setShowRegister(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Connect App
        </Button>
      </div>

      {/* How it works */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            How it works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. Connect an app below to get a unique webhook URL and secret key.</p>
          <p>2. In your other Manus app, add one line of code that fires when something happens (course completed, new signup, purchase, etc.).</p>
          <p>3. Blastly receives the event, uses AI to generate 3 branded social posts, and saves them as drafts for your review.</p>
          <p className="font-medium text-foreground">The code snippet to add to any Manus app:</p>
          <pre className="bg-background/50 rounded p-3 text-xs overflow-x-auto border border-border">
{`// Paste this function into your Manus app
async function notifyBlastly(event, data) {
  await fetch("${baseUrl}/api/webhooks/app-events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Blastly-Key": "YOUR_WEBHOOK_SECRET"  // ← replace with your key
    },
    body: JSON.stringify({ event, ...data })
  });
}

// Call it when something happens, e.g.:
notifyBlastly("course_completed", { student_name: "Sarah", course: "Build Your First App" });
notifyBlastly("new_signup", { user_name: "James" });
notifyBlastly("purchase_made", { product: "Premium Plan", amount: "$97" });`}
          </pre>
        </CardContent>
      </Card>

      {/* Connected Apps List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Your Connected Apps</h2>
        {apps.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Plug className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No apps connected yet</p>
              <p className="text-sm mt-1">Click "Connect App" to link Genius Jungle, Coach Nova, or any other app.</p>
            </CardContent>
          </Card>
        ) : (
          apps.map((app) => (
            <Card key={app.id} className={app.isActive ? "" : "opacity-50"}>
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {app.appName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {app.appName}
                      {app.isActive ? (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Revoked</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Slug: <code className="bg-muted px-1 rounded">{app.appSlug}</code>
                      {app.lastEventAt && (
                        <span className="ml-3">Last event: {new Date(app.lastEventAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {app.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRevokeTarget(app.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Revoke
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Recent Events */}
      {events.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Recent Events</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {events.map((ev) => (
                  <div key={ev.id} className="px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <div className="text-sm font-medium">{ev.eventType}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(ev.createdAt).toLocaleString()}
                          {Array.isArray(ev.generatedPostIds) && ev.generatedPostIds.length > 0 && (
                            <span className="ml-2 text-emerald-400">→ {ev.generatedPostIds.length} posts generated</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <EventStatusBadge status={ev.status} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Register App Dialog */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect an App</DialogTitle>
            <DialogDescription>
              Choose one of your existing apps or enter a custom name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Presets */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Quick connect</Label>
              <div className="grid grid-cols-1 gap-2">
                {APP_PRESETS.map((preset) => (
                  <button
                    key={preset.slug}
                    onClick={() => applyPreset(preset)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      appSlug === preset.slug
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className="font-medium text-sm">{preset.name}</div>
                    <div className="text-xs text-muted-foreground">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or enter manually</span></div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label>App Name</Label>
                <Input
                  value={appName}
                  onChange={(e) => {
                    setAppName(e.target.value);
                    if (!appSlug || APP_PRESETS.some(p => p.slug === appSlug)) {
                      setAppSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                    }
                  }}
                  placeholder="e.g. My Awesome App"
                />
              </div>
              <div className="space-y-1">
                <Label>App Slug <span className="text-muted-foreground text-xs">(lowercase, hyphens only)</span></Label>
                <Input
                  value={appSlug}
                  onChange={(e) => setAppSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="e.g. my-awesome-app"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegister(false)}>Cancel</Button>
            <Button
              onClick={handleRegister}
              disabled={!appName.trim() || !appSlug.trim() || registerApp.isPending}
            >
              {registerApp.isPending ? "Connecting..." : "Connect App"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Secret Key Dialog */}
      <Dialog open={!!newSecret} onOpenChange={() => setNewSecret(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              App Connected!
            </DialogTitle>
            <DialogDescription>
              Copy these details and add them to your other Manus app. <strong>The secret key is only shown once.</strong>
            </DialogDescription>
          </DialogHeader>
          {newSecret && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                <div className="flex gap-2">
                  <Input readOnly value={`${baseUrl}${newSecret.url}`} className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(`${baseUrl}${newSecret.url}`, "URL")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Secret Key (X-Blastly-Key header)</Label>
                <div className="flex gap-2">
                  <Input readOnly value={newSecret.secret} className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(newSecret.secret, "Secret key")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-300">
                Save this secret key now — it cannot be retrieved again. If you lose it, revoke the app and create a new one.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setNewSecret(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation */}
      <AlertDialog open={revokeTarget !== null} onOpenChange={() => setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke app access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately invalidate the webhook secret. The app will no longer be able to send events to Blastly. This cannot be undone — you would need to reconnect the app with a new key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => revokeTarget && revokeApp.mutate({ appId: revokeTarget, workspaceId })}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
