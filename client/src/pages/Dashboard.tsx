import AppLayout from "@/components/AppLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3, Calendar, Clock, Globe, Megaphone, Plus, Sparkles,
  Target, TrendingUp, Wand2, Zap, ArrowRight, Activity, Camera, Shield, Heart, LayoutGrid,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import type { Post, Campaign, SocialAccount } from "../../../drizzle/schema";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Area, AreaChart,
} from "recharts";

// ─── Business Health Score ─────────────────────────────────────────────────────────────────
const BENCHMARK = 65;

function calcHealthScore(snap: {
  postsPerWeek: number; leadsPerWeek: number; avgPostReach: number;
  platformCount: number; hoursPerWeek: number;
}, weekOffset = 0): number {
  const postScore     = Math.min(snap.postsPerWeek / 3, 1) * 25;
  const leadScore     = Math.min(snap.leadsPerWeek / 10, 1) * 25;
  const reachScore    = Math.min(snap.avgPostReach / 500, 1) * 20;
  const platformScore = Math.max(0, 1 - (snap.platformCount - 1) / 9) * 15;
  const hoursScore    = Math.max(0, 1 - snap.hoursPerWeek / 40) * 15;
  const base = Math.round(postScore + leadScore + reachScore + platformScore + hoursScore);
  const improvement = Math.min(weekOffset * 2.5, 35);
  return Math.min(95, Math.round(base + improvement));
}

function BusinessHealthChart() {
  const { data: snapshots } = trpc.businessHealth.listSnapshots.useQuery();
  const chartData = useMemo(() => {
    const demoSnap = { postsPerWeek: 1, leadsPerWeek: 2, avgPostReach: 80, platformCount: 6, hoursPerWeek: 18 };
    if (!snapshots || snapshots.length === 0) {
      return Array.from({ length: 9 }, (_, i) => ({
        week: i === 0 ? "Day 0" : `Wk ${i}`,
        score: calcHealthScore(demoSnap, i),
        benchmark: BENCHMARK,
      }));
    }
    const dayZero = snapshots.find((s: { snapshotType: string }) => s.snapshotType === "day_zero");
    if (!dayZero) return Array.from({ length: 9 }, (_, i) => ({ week: i === 0 ? "Day 0" : `Wk ${i}`, score: calcHealthScore(demoSnap, i), benchmark: BENCHMARK }));
    const snap = {
      postsPerWeek: (dayZero as Record<string, unknown>).postsPerWeek as number ?? 1,
      leadsPerWeek: (dayZero as Record<string, unknown>).leadsPerWeek as number ?? 2,
      avgPostReach: (dayZero as Record<string, unknown>).avgPostReach as number ?? 80,
      platformCount: (dayZero as Record<string, unknown>).platformCount as number ?? 6,
      hoursPerWeek: (dayZero as Record<string, unknown>).hoursPerWeek as number ?? 18,
    };
    const weeksElapsed = Math.floor((Date.now() - new Date((dayZero as Record<string, unknown>).createdAt as string).getTime()) / (7 * 24 * 3600 * 1000));
    return Array.from({ length: Math.min(weeksElapsed + 2, 12) }, (_, i) => ({
      week: i === 0 ? "Day 0" : `Wk ${i}`,
      score: calcHealthScore(snap, i),
      benchmark: BENCHMARK,
    }));
  }, [snapshots]);

  const latestScore = chartData[chartData.length - 1]?.score ?? 0;
  const isHealthy = latestScore >= BENCHMARK;
  const scoreColour = latestScore >= 75 ? "#22c55e" : latestScore >= BENCHMARK ? "#84cc16" : latestScore >= 40 ? "#f59e0b" : "#ef4444";
  const label = latestScore >= 75 ? "Excellent" : latestScore >= BENCHMARK ? "Healthy" : latestScore >= 40 ? "Needs Attention" : "At Risk";

  return (
    <div className="rounded-2xl p-5" style={{ background: "oklch(0.10 0.016 248)", border: "1px solid oklch(0.18 0.018 248)" }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-4 h-4" style={{ color: scoreColour }} />
            <span className="text-xs font-bold uppercase tracking-widest font-mono" style={{ color: "oklch(0.55 0.014 240)" }}>Business Health Score</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold" style={{ color: scoreColour, fontFamily: "'Space Grotesk', sans-serif" }}>{latestScore}</span>
            <span className="text-sm font-semibold" style={{ color: scoreColour }}>{label}</span>
            {isHealthy && <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "#052e16", color: "#4ade80" }}>↑ Above benchmark</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 justify-end mb-1">
            <div className="w-4 h-0.5 rounded" style={{ background: "#22c55e" }} />
            <span className="text-[10px]" style={{ color: "oklch(0.45 0.014 240)" }}>Healthy threshold ({BENCHMARK})</span>
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <div className="w-4 h-0.5 rounded" style={{ background: "#7c3aed" }} />
            <span className="text-[10px]" style={{ color: "oklch(0.45 0.014 240)" }}>Your score</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.18 0.018 248)" />
          <XAxis dataKey="week" tick={{ fill: "oklch(0.45 0.014 240)", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: "oklch(0.45 0.014 240)", fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "oklch(0.12 0.016 248)", border: "1px solid oklch(0.20 0.018 248)", borderRadius: 12, fontSize: 12 }}
            labelStyle={{ color: "oklch(0.75 0.014 240)" }}
            itemStyle={{ color: "#a78bfa" }}
          />
          <ReferenceLine y={BENCHMARK} stroke="#22c55e" strokeDasharray="6 3" strokeWidth={1.5}
            label={{ value: "Healthy", position: "insideTopRight", fill: "#22c55e", fontSize: 10 }} />
          <Area type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={2.5}
            fill="url(#scoreGrad)" dot={{ fill: "#7c3aed", r: 3 }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-[10px] mt-3 text-center" style={{ color: "oklch(0.40 0.014 240)" }}>
        Score improves as you post more, respond faster, consolidate platforms, and reduce admin hours. 
        <Link href="/quick-setup" className="underline" style={{ color: "oklch(0.65 0.22 290)" }}>Update your baseline →</Link>
      </p>
    </div>
  );
}

const PLATFORM_COLORS: Record<string, { bg: string; text: string }> = {
  twitter:   { bg: "oklch(0.12 0.016 248)", text: "oklch(0.85 0.012 240)" },
  linkedin:  { bg: "oklch(0.55 0.28 220 / 0.15)", text: "oklch(0.72 0.22 220)" },
  facebook:  { bg: "oklch(0.55 0.28 240 / 0.15)", text: "oklch(0.72 0.22 240)" },
  instagram: { bg: "oklch(0.62 0.28 340 / 0.15)", text: "oklch(0.72 0.22 340)" },
  tiktok:    { bg: "oklch(0.12 0.016 248)", text: "oklch(0.85 0.012 240)" },
  youtube:   { bg: "oklch(0.55 0.22 25 / 0.15)", text: "oklch(0.72 0.20 25)" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:     { bg: "oklch(0.14 0.018 248)", text: "oklch(0.55 0.014 240)" },
  scheduled: { bg: "oklch(0.65 0.28 220 / 0.12)", text: "oklch(0.72 0.22 220)" },
  published: { bg: "oklch(0.65 0.24 165 / 0.12)", text: "oklch(0.72 0.22 165)" },
  failed:    { bg: "oklch(0.55 0.22 25 / 0.12)", text: "oklch(0.72 0.20 25)" },
  cancelled: { bg: "oklch(0.14 0.018 248)", text: "oklch(0.55 0.014 240)" },
};

export default function Dashboard() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id ?? 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const plan = params.get("plan");
    if (payment === "success" && plan) {
      toast.success(`🎉 Welcome to Blastly ${plan.charAt(0).toUpperCase() + plan.slice(1)}! Your subscription is now active.`, { duration: 6000 });
      window.history.replaceState({}, "", "/dashboard");
    } else if (payment === "cancelled") {
      toast.info("Checkout cancelled. You can upgrade anytime from Billing & Upgrade.");
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  const { data: posts, isLoading: postsLoading } = trpc.posts.list.useQuery({ workspaceId: wsId }, { enabled: !!wsId });
  const { data: campaigns, isLoading: campaignsLoading } = trpc.campaigns.list.useQuery({ workspaceId: wsId }, { enabled: !!wsId });
  const { data: socialAccounts } = trpc.social.list.useQuery({ workspaceId: wsId }, { enabled: !!wsId });
  const { data: analyticsSummary } = trpc.analytics.summary.useQuery({ workspaceId: wsId }, { enabled: !!wsId });
  const { data: queueStats } = trpc.postQueue.stats.useQuery({ workspaceId: wsId }, { enabled: !!wsId });

  const scheduledPosts = (posts ?? []).filter((p: Post) => p.status === "scheduled");
  const recentPosts = (posts ?? []).slice(0, 5);
  const activeCampaigns = (campaigns ?? []).filter((c: Campaign) => c.status === "active");

  const stats = [
    {
      label: "Total Impressions",
      value: analyticsSummary?.totalImpressions ? Number(analyticsSummary.totalImpressions).toLocaleString() : "—",
      icon: TrendingUp,
      accent: "oklch(0.62 0.28 290)",
      accentBg: "oklch(0.62 0.28 290 / 0.10)",
      accentBorder: "oklch(0.62 0.28 290 / 0.20)",
    },
    {
      label: "Total Clicks",
      value: analyticsSummary?.totalClicks ? Number(analyticsSummary.totalClicks).toLocaleString() : "—",
      icon: BarChart3,
      accent: "oklch(0.65 0.28 220)",
      accentBg: "oklch(0.65 0.28 220 / 0.10)",
      accentBorder: "oklch(0.65 0.28 220 / 0.20)",
    },
    {
      label: "Scheduled Posts",
      value: String(scheduledPosts.length),
      icon: Calendar,
      accent: "oklch(0.65 0.24 165)",
      accentBg: "oklch(0.65 0.24 165 / 0.10)",
      accentBorder: "oklch(0.65 0.24 165 / 0.20)",
    },
    {
      label: "Active Campaigns",
      value: String(activeCampaigns.length),
      icon: Megaphone,
      accent: "oklch(0.75 0.18 80)",
      accentBg: "oklch(0.75 0.18 80 / 0.10)",
      accentBorder: "oklch(0.75 0.18 80 / 0.20)",
    },
  ];

  return (
    <AppLayout title="Dashboard">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Good {getGreeting()}, {currentWorkspace?.name ?? "there"}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "oklch(0.55 0.014 240)" }}>
              {(currentWorkspace as Record<string, unknown>)?.tagline as string
                ? `${(currentWorkspace as Record<string, unknown>).tagline as string}`
                : currentWorkspace?.industry
                  ? `${currentWorkspace.industry}${ (currentWorkspace as Record<string, unknown>)?.locationCity ? ` · ${(currentWorkspace as Record<string, unknown>).locationCity as string}` : "" } — ready to grow`
                  : "Your command centre is ready"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/home">
              <Button
                variant="outline"
                className="gap-2 text-sm font-semibold"
                style={{ borderColor: "oklch(0.62 0.28 290 / 0.50)", background: "oklch(0.62 0.28 290 / 0.10)", color: "oklch(0.82 0.18 290)" }}
              >
                <LayoutGrid className="w-4 h-4" />
                Command Centre
              </Button>
            </Link>
            <Link href="/dashboard/ad-studio">
              <Button
                variant="outline"
                className="gap-2 text-sm"
                style={{ borderColor: "oklch(0.25 0.018 248)", background: "transparent" }}
              >
                <Wand2 className="w-4 h-4" style={{ color: "oklch(0.72 0.22 290)" }} />
                AI Ad Studio
              </Button>
            </Link>
            <Link href="/dashboard/compose">
              <Button className="btn-gradient text-white border-0 gap-2">
                <Sparkles className="w-4 h-4" />Create post
              </Button>
            </Link>
          </div>
        </div>

        {/* Scan CTA banner */}
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, oklch(0.65 0.28 220 / 0.08) 0%, oklch(0.62 0.28 290 / 0.05) 100%)",
            border: "1px solid oklch(0.65 0.28 220 / 0.20)",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, oklch(0.65 0.28 220 / 0.40), transparent)" }} />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Activity className="w-4 h-4" style={{ color: "oklch(0.72 0.22 220)" }} />
                <span className="text-xs font-bold uppercase tracking-widest font-mono" style={{ color: "oklch(0.72 0.22 220)" }}>
                  Your #1 Starting Point
                </span>
              </div>
              <h3 className="text-base font-bold text-foreground mb-1">Scan your website — see your full digital picture</h3>
              <p className="text-sm" style={{ color: "oklch(0.55 0.014 240)" }}>
                Auto-discover all your social profiles, score each one, and see how you compare to your 5 nearest competitors.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Link href="/dashboard/digital-presence">
                <Button className="btn-gradient text-white border-0 gap-2 whitespace-nowrap w-full sm:w-auto">
                  <Globe className="w-4 h-4" />Digital Presence Scan
                </Button>
              </Link>
              <Link href="/dashboard/competitor-intelligence">
                <Button
                  variant="outline"
                  className="gap-2 whitespace-nowrap w-full sm:w-auto"
                  style={{ borderColor: "oklch(0.25 0.018 248)", background: "transparent" }}
                >
                  <Target className="w-4 h-4" />5 Competitor Scan
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, accent, accentBg, accentBorder }) => (
            <div
              key={label}
              className="rounded-2xl p-5"
              style={{
                background: "oklch(0.10 0.016 248)",
                border: `1px solid oklch(0.20 0.018 248)`,
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: "oklch(0.50 0.014 240)" }}>{label}</p>
                  <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{value}</p>
                </div>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
                >
                  <Icon className="w-4 h-4" style={{ color: accent }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent Posts */}
          <div className="lg:col-span-2">
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "oklch(0.10 0.016 248)", border: "1px solid oklch(0.20 0.018 248)" }}
            >
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid oklch(0.20 0.018 248)" }}>
                <h3 className="text-sm font-semibold text-foreground">Recent Posts</h3>
                <Link href="/dashboard/calendar">
                  <button className="text-xs font-medium transition-colors" style={{ color: "oklch(0.65 0.28 220)" }}>
                    View all <ArrowRight className="w-3 h-3 inline ml-0.5" />
                  </button>
                </Link>
              </div>
              {postsLoading ? (
                <div className="px-5 py-4 space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" style={{ background: "oklch(0.14 0.018 248)" }} />)}
                </div>
              ) : recentPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                    style={{ background: "oklch(0.65 0.28 220 / 0.10)", border: "1px solid oklch(0.65 0.28 220 / 0.20)" }}>
                    <Sparkles className="w-5 h-5" style={{ color: "oklch(0.72 0.22 220)" }} />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No posts yet</p>
                  <p className="text-xs mb-4" style={{ color: "oklch(0.50 0.014 240)" }}>Create your first post with AI-powered content generation.</p>
                  <Link href="/dashboard/compose">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs" style={{ borderColor: "oklch(0.25 0.018 248)" }}>
                      <Plus className="w-3.5 h-3.5" />Create post
                    </Button>
                  </Link>
                </div>
              ) : (
                <div>
                  {recentPosts.map((post: Post, idx: number) => (
                    <div
                      key={post.id}
                      className="flex items-start gap-3 px-5 py-3.5 transition-colors"
                      style={{
                        borderBottom: idx < recentPosts.length - 1 ? "1px solid oklch(0.16 0.018 248)" : "none",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "oklch(0.12 0.018 248)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {post.title ?? (post.bodyText ? post.bodyText.substring(0, 60) + "…" : "Untitled post")}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{
                              background: STATUS_COLORS[post.status]?.bg ?? "oklch(0.14 0.018 248)",
                              color: STATUS_COLORS[post.status]?.text ?? "oklch(0.55 0.014 240)",
                            }}
                          >
                            {post.status}
                          </span>
                          {post.scheduledAt && (
                            <span className="flex items-center gap-1 text-[10px]" style={{ color: "oklch(0.50 0.014 240)" }}>
                              <Clock className="w-3 h-3" />
                              {format(new Date(post.scheduledAt), "MMM d, h:mm a")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Connected Platforms */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "oklch(0.10 0.016 248)", border: "1px solid oklch(0.20 0.018 248)" }}
            >
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid oklch(0.20 0.018 248)" }}>
                <h3 className="text-sm font-semibold text-foreground">Connected Platforms</h3>
                <Link href="/dashboard/connections">
                  <button className="text-xs font-medium" style={{ color: "oklch(0.65 0.28 220)" }}>Manage</button>
                </Link>
              </div>
              <div className="p-4">
                {!socialAccounts || socialAccounts.length === 0 ? (
                  <div className="text-center py-4">
                    <Globe className="w-8 h-8 mx-auto mb-2" style={{ color: "oklch(0.40 0.014 240)" }} />
                    <p className="text-xs mb-3" style={{ color: "oklch(0.50 0.014 240)" }}>No platforms connected</p>
                    <Link href="/dashboard/connections">
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs" style={{ borderColor: "oklch(0.25 0.018 248)" }}>
                        <Plus className="w-3 h-3" />Connect platform
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(socialAccounts as unknown as SocialAccount[]).map(account => {
                      const colors = PLATFORM_COLORS[account.platform] ?? { bg: "oklch(0.14 0.018 248)", text: "oklch(0.55 0.014 240)" };
                      return (
                        <div key={account.id} className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold"
                            style={{ background: colors.bg, color: colors.text }}
                          >
                            {account.platform[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate text-foreground">
                              {account.platformDisplayName ?? account.platformUsername ?? account.platform}
                            </p>
                            <p className="text-[10px] capitalize" style={{ color: "oklch(0.50 0.014 240)" }}>{account.platform}</p>
                          </div>
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              background: account.isActive ? "oklch(0.65 0.24 165)" : "oklch(0.35 0.014 240)",
                              boxShadow: account.isActive ? "0 0 4px oklch(0.65 0.24 165 / 0.60)" : "none",
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Active Campaigns */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "oklch(0.10 0.016 248)", border: "1px solid oklch(0.20 0.018 248)" }}
            >
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid oklch(0.20 0.018 248)" }}>
                <h3 className="text-sm font-semibold text-foreground">Active Campaigns</h3>
                <Link href="/dashboard/campaigns">
                  <button className="text-xs font-medium" style={{ color: "oklch(0.65 0.28 220)" }}>View all</button>
                </Link>
              </div>
              <div className="p-4">
                {campaignsLoading ? (
                  <Skeleton className="h-20 w-full rounded-xl" style={{ background: "oklch(0.14 0.018 248)" }} />
                ) : activeCampaigns.length === 0 ? (
                  <div className="text-center py-4">
                    <Megaphone className="w-8 h-8 mx-auto mb-2" style={{ color: "oklch(0.40 0.014 240)" }} />
                    <p className="text-xs mb-3" style={{ color: "oklch(0.50 0.014 240)" }}>No active campaigns</p>
                    <Link href="/dashboard/campaigns">
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs" style={{ borderColor: "oklch(0.25 0.018 248)" }}>
                        <Plus className="w-3 h-3" />New campaign
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeCampaigns.slice(0, 3).map((campaign: Campaign) => (
                      <Link key={campaign.id} href={`/dashboard/campaigns/${campaign.id}`}>
                        <div
                          className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-colors"
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "oklch(0.14 0.018 248)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: "oklch(0.65 0.28 220 / 0.12)", border: "1px solid oklch(0.65 0.28 220 / 0.20)" }}
                          >
                            <Megaphone className="w-3.5 h-3.5" style={{ color: "oklch(0.72 0.22 220)" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate text-foreground">{campaign.name}</p>
                            <p className="text-[10px] capitalize" style={{ color: "oklch(0.50 0.014 240)" }}>{campaign.goal ?? "campaign"}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Business Health Score */}
        <BusinessHealthChart />

        {/* Quick Actions */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest mb-3 font-mono" style={{ color: "oklch(0.45 0.020 248)" }}>
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "AI Ad Studio", icon: Wand2, href: "/dashboard/ad-studio", accent: "oklch(0.62 0.28 290)", accentBg: "oklch(0.62 0.28 290 / 0.10)", accentBorder: "oklch(0.62 0.28 290 / 0.20)" },
              { label: "AI Compose", icon: Sparkles, href: "/dashboard/compose", accent: "oklch(0.65 0.28 220)", accentBg: "oklch(0.65 0.28 220 / 0.10)", accentBorder: "oklch(0.65 0.28 220 / 0.20)" },
              { label: "Schedule Post", icon: Calendar, href: "/dashboard/calendar", accent: "oklch(0.65 0.24 165)", accentBg: "oklch(0.65 0.24 165 / 0.10)", accentBorder: "oklch(0.65 0.24 165 / 0.20)" },
              { label: "New Campaign", icon: Megaphone, href: "/dashboard/campaigns", accent: "oklch(0.75 0.18 80)", accentBg: "oklch(0.75 0.18 80 / 0.10)", accentBorder: "oklch(0.75 0.18 80 / 0.20)" },
              { label: "View Analytics", icon: BarChart3, href: "/dashboard/analytics", accent: "oklch(0.72 0.22 340)", accentBg: "oklch(0.72 0.22 340 / 0.10)", accentBorder: "oklch(0.72 0.22 340 / 0.20)" },
            ].map(({ label, icon: Icon, href, accent, accentBg, accentBorder }) => (
              <Link key={label} href={href}>
                <div
                  className="flex flex-col items-center gap-2.5 p-4 rounded-2xl cursor-pointer transition-all group"
                  style={{ background: "oklch(0.10 0.016 248)", border: "1px solid oklch(0.20 0.018 248)" }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.borderColor = accentBorder;
                    el.style.background = accentBg;
                    el.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.borderColor = "oklch(0.20 0.018 248)";
                    el.style.background = "oklch(0.10 0.016 248)";
                    el.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                    style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: accent }} />
                  </div>
                  <span className="text-xs font-medium text-foreground text-center">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
