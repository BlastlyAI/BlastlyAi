import AppLayout from "@/components/AppLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Globe, Trash2, RefreshCw, CheckCircle2, AlertCircle,
  ExternalLink, Info, Zap, Link2, ArrowRight, Users, Briefcase, Check,
} from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { apiUrl } from "@/lib/apiOrigin";

// ─── Platform definitions ──────────────────────────────────────────────────────

type PlatformId = "linkedin" | "youtube" | "pinterest" | "bluesky" | "twitter" | "facebook" | "instagram" | "tiktok" | "reddit";

interface PlatformConfig {
  id: PlatformId;
  name: string;
  color: string;
  bgClass: string;
  description: string;
  connectType: "oauth" | "app_password" | "signup";
  oauthPath?: string;
  signupUrl?: string;
  signupSteps?: string[];
  approvalNote?: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: "linkedin",
    name: "LinkedIn",
    color: "#0A66C2",
    bgClass: "bg-blue-700 text-white",
    description: "Post to your personal LinkedIn profile. Reach professionals and B2B audiences with thought leadership content.",
    connectType: "oauth",
    oauthPath: "/api/auth/linkedin/connect",
  },
  {
    id: "pinterest",
    name: "Pinterest",
    color: "#E60023",
    bgClass: "bg-red-600 text-white",
    description: "Create pins and reach visual discovery audiences. Great for products, recipes, and lifestyle content.",
    connectType: "oauth",
    oauthPath: "/api/auth/pinterest/connect",
  },
  {
    id: "youtube",
    name: "YouTube",
    color: "#FF0000",
    bgClass: "bg-red-600 text-white",
    description: "Connect your YouTube channel to post community updates and manage your video presence.",
    connectType: "oauth",
    oauthPath: "/api/auth/youtube/connect",
  },
  {
    id: "bluesky",
    name: "Bluesky",
    color: "#0085FF",
    bgClass: "bg-sky-500 text-white",
    description: "The open social network. Connect with an app password — no OAuth required, instant setup.",
    connectType: "app_password",
    signupUrl: "https://bsky.app",
    signupSteps: [
      "Go to bsky.app and click 'Sign up'",
      "Enter your email and choose a handle (e.g. @yourbusiness.bsky.social)",
      "Verify your email — you can post immediately",
    ],
  },
  {
    id: "facebook",
    name: "Facebook",
    color: "#1877F2",
    bgClass: "bg-blue-600 text-white",
    description: "Connect with broad audiences and run targeted ad campaigns.",
    connectType: "signup",
    signupUrl: "https://www.facebook.com/business",
    signupSteps: [
      "Go to facebook.com/business and click 'Create a Page'",
      "Choose a category and enter your business name",
      "Add your profile photo and cover image",
      "Once set up, click 'I've created my account' below to mark as connected",
    ],
    approvalNote: "Facebook requires Meta Business Verification for API access. We'll connect automatically once verification is complete.",
  },
  {
    id: "instagram",
    name: "Instagram",
    color: "#E4405F",
    bgClass: "bg-gradient-to-br from-purple-500 to-pink-500 text-white",
    description: "Visual storytelling for lifestyle, brand, and product content.",
    connectType: "signup",
    signupUrl: "https://www.instagram.com/accounts/emailsignup/",
    signupSteps: [
      "Go to instagram.com and click 'Sign up'",
      "Enter your email, name, username, and password",
      "Switch to a Professional/Business account in Settings",
      "Once set up, click 'I've created my account' below to mark as connected",
    ],
    approvalNote: "Instagram uses Meta's API which requires Business Verification for full posting access.",
  },
  {
    id: "tiktok",
    name: "TikTok",
    color: "#010101",
    bgClass: "bg-black text-white",
    description: "Short-form video content for viral reach and Gen Z audiences.",
    connectType: "signup",
    signupUrl: "https://www.tiktok.com/business/en",
    signupSteps: [
      "Go to tiktok.com/business and click 'Get started for free'",
      "Create your TikTok Business account",
      "Set up your profile with your business name and logo",
      "Once set up, click 'I've created my account' below to mark as connected",
    ],
    approvalNote: "TikTok Marketing API requires app approval (3–10 days). We'll activate posting once approved.",
  },
  {
    id: "twitter",
    name: "Twitter / X",
    color: "#000000",
    bgClass: "bg-black text-white",
    description: "Real-time conversations and short-form content.",
    connectType: "signup",
    signupUrl: "https://twitter.com/i/flow/signup",
    signupSteps: [
      "Go to twitter.com and click 'Sign up'",
      "Enter your name, email, and date of birth",
      "Choose a username and set a strong password",
      "Once set up, click 'I've created my account' below to mark as connected",
    ],
    approvalNote: "Twitter API requires a $100/month developer subscription for posting. We'll activate once your account is verified.",
  },
  {
    id: "reddit",
    name: "Reddit",
    color: "#FF4500",
    bgClass: "bg-orange-600 text-white",
    description: "Community-driven posts across niche subreddits.",
    connectType: "signup",
    signupUrl: "https://www.reddit.com/register/",
    signupSteps: [
      "Go to reddit.com and click 'Sign Up'",
      "Enter your email, username, and password",
      "Join relevant subreddits for your industry",
      "Once set up, click 'I've created my account' below to mark as connected",
    ],
  },
];

// Platform icon component
function PlatformIcon({ platform, className = "" }: { platform: PlatformConfig; className?: string }) {
  const icons: Record<string, string> = {
    linkedin: "in",
    pinterest: "P",
    youtube: "▶",
    bluesky: "🦋",
    facebook: "f",
    instagram: "ig",
    tiktok: "tt",
    twitter: "𝕏",
    reddit: "r/",
  };
  return (
    <div className={`rounded-xl flex items-center justify-center font-bold ${platform.bgClass} ${className}`}>
      {icons[platform.id] ?? platform.name[0]}
    </div>
  );
}

// ─── Age Group options ─────────────────────────────────────────────────────────
const AGE_GROUPS = [
  { value: "children", label: "Children", sub: "Under 13" },
  { value: "teens", label: "Teens", sub: "13–17" },
  { value: "adults", label: "Adults", sub: "18–54" },
  { value: "seniors", label: "Seniors", sub: "55+" },
  { value: "all_ages", label: "All Ages", sub: "Everyone" },
] as const;

// ─── Business Sector options ───────────────────────────────────────────────────
const BUSINESS_SECTORS = [
  { value: "retail", label: "Retail" },
  { value: "hospitality", label: "Hospitality" },
  { value: "health", label: "Health & Wellness" },
  { value: "beauty", label: "Beauty & Grooming" },
  { value: "trades", label: "Trades & Construction" },
  { value: "professional_services", label: "Professional Services" },
  { value: "food_beverage", label: "Food & Beverage" },
  { value: "education", label: "Education" },
  { value: "other", label: "Other" },
] as const;

type AgeGroup = typeof AGE_GROUPS[number]["value"];
type BusinessSector = typeof BUSINESS_SECTORS[number]["value"];

export default function Connections() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id ?? 0;
  const utils = trpc.useUtils();
  const [location, navigate] = useLocation();

  const { data: accounts = [], isLoading } = trpc.social.list.useQuery(
    { workspaceId: wsId },
    { enabled: !!wsId }
  );

  const { data: prefs } = trpc.preferences.get.useQuery(
    { workspaceId: wsId },
    { enabled: !!wsId }
  );

  const savePrefs = trpc.preferences.save.useMutation({
    onSuccess: () => {
      utils.preferences.get.invalidate();
      toast.success("Audience settings saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const connectMutation = trpc.social.connect.useMutation({
    onSuccess: () => {
      utils.social.list.invalidate();
      setConnectModal(null);
      toast.success("Platform marked as connected!");
    },
    onError: (e) => toast.error(e.message),
  });

  const disconnectMutation = trpc.social.disconnect.useMutation({
    onSuccess: () => { utils.social.list.invalidate(); toast.success("Platform disconnected"); },
    onError: (e) => toast.error(e.message),
  });

  const connectBlueskyMutation = trpc.publish.connectBluesky.useMutation({
    onSuccess: (data) => {
      utils.social.list.invalidate();
      setConnectModal(null);
      setBlueskyForm({ handle: "", appPassword: "" });
      toast.success(`Connected @${data.handle} on Bluesky`);
    },
    onError: (e) => toast.error(e.message),
  });

  // Modal state
  const [connectModal, setConnectModal] = useState<PlatformConfig | null>(null);
  const [blueskyForm, setBlueskyForm] = useState({ handle: "", appPassword: "" });
  const [signupConfirmed, setSignupConfirmed] = useState(false);

  // Audience state (local, saved on change)
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("all_ages");
  const [businessSector, setBusinessSector] = useState<BusinessSector>("other");

  // Sync prefs from server
  useEffect(() => {
    if (prefs?.ageGroup) setAgeGroup(prefs.ageGroup as AgeGroup);
    if (prefs?.businessSector) setBusinessSector(prefs.businessSector as BusinessSector);
  }, [prefs?.ageGroup, prefs?.businessSector]);

  // Handle OAuth callback success/error messages
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("error");
    if (connected) {
      toast.success(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully!`);
      window.history.replaceState({}, "", "/dashboard/connections");
      utils.social.list.invalidate();
    }
    if (error) {
      toast.error(`Connection failed: ${error.replace(/_/g, " ")}`);
      window.history.replaceState({}, "", "/dashboard/connections");
    }
  }, [location]);

  const connectedPlatformIds = new Set((accounts as any[]).map((a: any) => a.platform));

  function handleConnect(platform: PlatformConfig) {
    setSignupConfirmed(false);
    setConnectModal(platform);
  }

  function handleOAuthRedirect(platform: PlatformConfig) {
    if (!wsId || !platform.oauthPath) return;
    window.location.href = `${apiUrl(platform.oauthPath)}?workspaceId=${wsId}`;
  }

  function handleMarkConnected(platform: PlatformConfig) {
    connectMutation.mutate({
      workspaceId: wsId,
      platform: platform.id,
      platformAccountId: `manual-${platform.id}-${wsId}`,
      platformUsername: platform.name.toLowerCase().replace(/\s+/g, ""),
      platformDisplayName: platform.name,
    });
  }

  function handleSaveAgeGroup(val: AgeGroup) {
    setAgeGroup(val);
    savePrefs.mutate({ workspaceId: wsId, ageGroup: val });
  }

  function handleSaveBusinessSector(val: BusinessSector) {
    setBusinessSector(val);
    savePrefs.mutate({ workspaceId: wsId, businessSector: val });
  }

  const liveCount = PLATFORMS.length;
  const connectedCount = (accounts as any[]).length;

  return (
    <AppLayout title="Connections">
      <div className="p-6 space-y-8 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">Social Connections</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              Connect your existing accounts or sign up for new ones — then start posting from Blastly.
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{connectedCount}/{liveCount}</div>
            <div className="text-xs text-muted-foreground">platforms connected</div>
          </div>
        </div>

        {/* ── Audience Targeting ─────────────────────────────────────────────── */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Audience Targeting
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tell us who your customers are so we can tailor content tone and platform recommendations.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Age Group */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Age Group</Label>
              <div className="flex flex-wrap gap-2">
                {AGE_GROUPS.map((ag) => (
                  <button
                    key={ag.value}
                    onClick={() => handleSaveAgeGroup(ag.value)}
                    className={`flex flex-col items-center px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      ageGroup === ag.value
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-foreground border-border/60 hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    <span>{ag.label}</span>
                    <span className={`text-[10px] mt-0.5 ${ageGroup === ag.value ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {ag.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Business Sector */}
            <div>
              <Label className="text-sm font-medium mb-2 block flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                Business Sector
              </Label>
              <div className="flex flex-wrap gap-2">
                {BUSINESS_SECTORS.map((bs) => (
                  <button
                    key={bs.value}
                    onClick={() => handleSaveBusinessSector(bs.value)}
                    className={`px-3.5 py-2 rounded-xl border text-sm font-medium transition-all ${
                      businessSector === bs.value
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-foreground border-border/60 hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    {bs.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Platform Grid ──────────────────────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-emerald-500" />
            All Platforms — Connect or Sign Up
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Already have an account? Click <strong>Connect</strong> to link it. New to a platform? Click <strong>Sign Up</strong> — we'll walk you through it.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLATFORMS.map((platform) => {
              const isConnected = connectedPlatformIds.has(platform.id);
              return (
                <Card
                  key={platform.id}
                  className={`border-border/60 shadow-sm transition-all hover:shadow-md ${isConnected ? "ring-1 ring-emerald-500/40 bg-emerald-500/5" : ""}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <PlatformIcon platform={platform} className="w-10 h-10 text-sm" />
                      {isConnected ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[10px] gap-1">
                          <CheckCircle2 className="w-3 h-3" />Connected
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Not connected</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{platform.name}</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">{platform.description}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={isConnected ? "outline" : "default"}
                        className="flex-1 gap-1.5 text-xs"
                        onClick={() => handleConnect(platform)}
                      >
                        {isConnected ? (
                          <><RefreshCw className="w-3 h-3" />Reconnect</>
                        ) : platform.connectType === "oauth" ? (
                          <><Link2 className="w-3 h-3" />Connect</>
                        ) : (
                          <><ExternalLink className="w-3 h-3" />Connect / Sign Up</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ── Connected accounts list ────────────────────────────────────────── */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Connected Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
              </div>
            ) : (accounts as any[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Globe className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="font-medium mb-1">No accounts connected yet</p>
                <p className="text-sm text-muted-foreground">Click any platform above to connect your account.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {(accounts as any[]).map((account: any) => {
                  const platformConfig = PLATFORMS.find((p) => p.id === account.platform);
                  return (
                    <div key={account.id} className="flex items-center gap-4 py-4">
                      {platformConfig ? (
                        <PlatformIcon platform={platformConfig} className="w-10 h-10 text-sm shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                          {account.platform[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{account.platformDisplayName ?? account.platformUsername}</p>
                          <Badge variant="secondary" className="text-[10px] capitalize">{account.platform}</Badge>
                          {account.isActive ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[10px] gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />Active
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 text-[10px] gap-1">
                              <AlertCircle className="w-2.5 h-2.5" />Inactive
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          @{account.platformUsername} · Connected {format(new Date(account.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {platformConfig?.connectType === "oauth" && (
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Reconnect"
                            onClick={() => handleConnect(platformConfig)}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Disconnect"
                          onClick={() => disconnectMutation.mutate({ id: account.id, workspaceId: wsId })}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Connect / Sign Up Modal ─────────────────────────────────────────── */}
      <Dialog open={!!connectModal} onOpenChange={(open) => { if (!open) { setConnectModal(null); setSignupConfirmed(false); } }}>
        {connectModal && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <PlatformIcon platform={connectModal} className="w-8 h-8 text-sm shrink-0" />
                {connectedPlatformIds.has(connectModal.id) ? `Reconnect ${connectModal.name}` : `Connect ${connectModal.name}`}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {connectModal.connectType === "oauth"
                  ? "You'll be redirected to log in with your existing account. We'll bring you straight back once connected."
                  : connectModal.connectType === "app_password"
                  ? "Enter your Bluesky handle and app password to connect instantly."
                  : "Follow the steps below to create your account, then confirm here."}
              </DialogDescription>
            </DialogHeader>

            {/* OAuth flow */}
            {connectModal.connectType === "oauth" && (
              <div className="space-y-4 py-2">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                  <p className="font-medium mb-1">What happens next:</p>
                  <ol className="text-xs space-y-1 text-muted-foreground list-decimal list-inside">
                    <li>You'll be taken to {connectModal.name}'s login page</li>
                    <li>Log in with your existing {connectModal.name} account</li>
                    <li>Approve Blastly's access permissions</li>
                    <li>You'll be returned here — fully connected</li>
                  </ol>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConnectModal(null)}>Cancel</Button>
                  <Button
                    className="gap-2"
                    onClick={() => handleOAuthRedirect(connectModal)}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Log in to {connectModal.name}
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* Bluesky app-password flow */}
            {connectModal.connectType === "app_password" && (
              <div className="space-y-4 py-2">
                {!connectedPlatformIds.has("bluesky") && (
                  <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-sm text-sky-700 dark:text-sky-300">
                    <p className="font-medium mb-1">Don't have a Bluesky account yet?</p>
                    <a
                      href="https://bsky.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />Sign up at bsky.app (free, 2 minutes)
                    </a>
                  </div>
                )}
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
                  <p className="font-medium mb-1">How to get your App Password</p>
                  <ol className="text-xs space-y-1 text-muted-foreground list-decimal list-inside">
                    <li>Open Bluesky → Settings → Privacy and Security</li>
                    <li>Click <strong>App Passwords</strong> → Add App Password</li>
                    <li>Name it "Blastly" and copy the generated password</li>
                  </ol>
                  <a
                    href="https://bsky.app/settings/app-passwords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    <ExternalLink className="w-3 h-3" />Open Bluesky App Passwords
                  </a>
                </div>
                <div className="space-y-1.5">
                  <Label>Bluesky Handle *</Label>
                  <Input
                    placeholder="yourname.bsky.social"
                    value={blueskyForm.handle}
                    onChange={(e) => setBlueskyForm(f => ({ ...f, handle: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>App Password *</Label>
                  <Input
                    type="password"
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    value={blueskyForm.appPassword}
                    onChange={(e) => setBlueskyForm(f => ({ ...f, appPassword: e.target.value }))}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConnectModal(null)}>Cancel</Button>
                  <Button
                    disabled={!blueskyForm.handle || !blueskyForm.appPassword || connectBlueskyMutation.isPending}
                    onClick={() => connectBlueskyMutation.mutate({
                      workspaceId: wsId,
                      handle: blueskyForm.handle,
                      appPassword: blueskyForm.appPassword,
                    })}
                  >
                    {connectBlueskyMutation.isPending ? "Connecting…" : "Connect Bluesky"}
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* Signup flow for coming-soon platforms */}
            {connectModal.connectType === "signup" && (
              <div className="space-y-4 py-2">
                {connectModal.approvalNote && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">{connectModal.approvalNote}</p>
                  </div>
                )}
                {connectModal.signupSteps && (
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                    <p className="text-sm font-medium mb-2">Steps to create your account:</p>
                    <ol className="space-y-1.5">
                      {connectModal.signupSteps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                <div className="flex gap-2">
                  {connectModal.signupUrl && (
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => window.open(connectModal.signupUrl, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open {connectModal.name}
                    </Button>
                  )}
                </div>
                {/* Confirmation checkbox */}
                <button
                  onClick={() => setSignupConfirmed(!signupConfirmed)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    signupConfirmed
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-border/60 bg-card hover:border-primary/40"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                    signupConfirmed ? "bg-emerald-500 border-emerald-500" : "border-border"
                  }`}>
                    {signupConfirmed && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm">I've created my {connectModal.name} account and I'm ready to connect</span>
                </button>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConnectModal(null)}>Cancel</Button>
                  <Button
                    disabled={!signupConfirmed || connectMutation.isPending}
                    className="gap-2"
                    onClick={() => handleMarkConnected(connectModal)}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {connectMutation.isPending ? "Saving…" : "Mark as Connected"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </AppLayout>
  );
}
