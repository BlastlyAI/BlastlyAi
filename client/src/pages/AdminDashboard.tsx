import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Building2, Users, DollarSign, TrendingUp, Search, ExternalLink,
  Globe, Zap, Crown, CheckCircle2, Clock, AlertCircle, XCircle,
  ArrowUpRight, Settings, BarChart3, Wifi, WifiOff, MessageSquare,
  Activity, ChevronDown, ChevronUp, ArrowUp, ArrowDown, ArrowUpDown,
} from "lucide-react";

type PlanTier = "free" | "fix_my_brand" | "managed_social";
type SubStatus = "active" | "cancelled" | "past_due" | "trialing" | "none";
type ChurnRisk = "none" | "amber" | "red";

const PLAN_LABELS: Record<PlanTier, string> = {
  free: "Free Audit",
  fix_my_brand: "Fix My Brand",
  managed_social: "Managed Social",
};

const PLAN_PRICES: Record<PlanTier, number> = {
  free: 0,
  fix_my_brand: 297,
  managed_social: 197,
};

const PLAN_COLORS: Record<PlanTier, string> = {
  free: "bg-muted text-muted-foreground",
  fix_my_brand: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  managed_social: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const STATUS_ICONS: Record<SubStatus, React.ReactNode> = {
  active: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
  trialing: <Clock className="h-3.5 w-3.5 text-sky-400" />,
  past_due: <AlertCircle className="h-3.5 w-3.5 text-amber-400" />,
  cancelled: <XCircle className="h-3.5 w-3.5 text-rose-400" />,
  none: <XCircle className="h-3.5 w-3.5 text-muted-foreground" />,
};

function ChurnBadge({ risk, days }: { risk: ChurnRisk; days: number | null }) {
  if (risk === "red") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
      <AlertCircle className="h-2.5 w-2.5" /> {days}d inactive
    </span>
  );
  if (risk === "amber") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
      <Clock className="h-2.5 w-2.5" /> {days}d inactive
    </span>
  );
  if (days !== null && days === 0) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
      <Activity className="h-2.5 w-2.5" /> Active today
    </span>
  );
  if (days !== null) return (
    <span className="text-[10px] text-muted-foreground">{days}d ago</span>
  );
  return <span className="text-[10px] text-muted-foreground">—</span>;
}

function StepDots({ s1, s2, s3 }: { s1: boolean; s2: boolean; s3: boolean }) {
  const steps = [
    { done: s1, label: "Profile" },
    { done: s2, label: "Platforms" },
    { done: s3, label: "Setup" },
  ];
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((s, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold
            ${s.done ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-muted text-muted-foreground border border-border"}`}>
            {s.done ? "✓" : i + 1}
          </div>
          <span className="text-[8px] text-muted-foreground">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<PlanTier | "all">("all");
  const [riskFilter, setRiskFilter] = useState<ChurnRisk | "all">("all");
  const [showJourney, setShowJourney] = useState(true);
  type SortKey = "errors" | "auditScore" | "postsSent" | "lastActive" | "churnRisk" | "plan" | "name" | "none";
  const [sortBy, setSortBy] = useState<SortKey>("none");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      // Default direction: errors/churnRisk/lastActive → desc (worst first); auditScore → asc (lowest first)
      setSortDir(key === "auditScore" ? "asc" : "desc");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortBy !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDir === "desc"
      ? <ArrowDown className="h-3 w-3 ml-1 text-primary" />
      : <ArrowUp className="h-3 w-3 ml-1 text-primary" />;
  }

  const { data: allWorkspaces = [], isLoading: loadingBasic } = trpc.workspace.adminListAll.useQuery();
  const { data: clientIntel = [], isLoading: loadingIntel } = trpc.workspace.adminClientIntelligence.useQuery();
  const nudgeMutation = trpc.system.notifyOwner.useMutation();

  const isLoading = loadingBasic || loadingIntel;

  // Guard — only admins can see this
  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Crown className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold">Admin access required</h2>
          <p className="text-muted-foreground text-sm">This page is only visible to platform owners.</p>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  // Derived metrics
  const paying = allWorkspaces.filter(w => (w.planTier as PlanTier) !== "free" && (w.subscriptionStatus as SubStatus) === "active");
  const mrr = allWorkspaces.reduce((sum, w) => {
    if ((w.subscriptionStatus as SubStatus) !== "active") return sum;
    return sum + (PLAN_PRICES[(w.planTier as PlanTier) ?? "free"] ?? 0);
  }, 0);
  const pastDue = allWorkspaces.filter(w => (w.subscriptionStatus as SubStatus) === "past_due").length;
  const atRisk = clientIntel.filter(c => c.churnRisk !== "none").length;

  // Build intel map for quick lookup
  const intelMap = new Map(clientIntel.map(c => [c.workspaceId, c]));

  // Filter
  const baseFiltered = clientIntel.filter(c => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.website ?? "").toLowerCase().includes(search.toLowerCase());
    const matchPlan = planFilter === "all" || c.planTier === planFilter;
    const matchRisk = riskFilter === "all" || c.churnRisk === riskFilter;
    return matchSearch && matchPlan && matchRisk;
  });

  // Sort
  const CHURN_ORDER: Record<ChurnRisk, number> = { red: 2, amber: 1, none: 0 };
  const PLAN_ORDER: Record<PlanTier, number> = { managed_social: 2, fix_my_brand: 1, free: 0 };
  const filtered = sortBy === "none" ? baseFiltered : [...baseFiltered].sort((a, b) => {
    let diff = 0;
    if (sortBy === "errors")     diff = (a.postsFailed ?? 0) - (b.postsFailed ?? 0);
    if (sortBy === "auditScore") diff = (a.auditScore ?? 101) - (b.auditScore ?? 101);
    if (sortBy === "postsSent")  diff = (a.postsPublished ?? 0) - (b.postsPublished ?? 0);
    if (sortBy === "lastActive") diff = (a.daysSinceActive ?? 9999) - (b.daysSinceActive ?? 9999);
    if (sortBy === "churnRisk")  diff = CHURN_ORDER[a.churnRisk] - CHURN_ORDER[b.churnRisk];
    if (sortBy === "plan")       diff = PLAN_ORDER[a.planTier] - PLAN_ORDER[b.planTier];
    if (sortBy === "name")       diff = a.name.localeCompare(b.name);
    return sortDir === "desc" ? -diff : diff;
  });

  function handleNudge(clientName: string, workspaceId: number) {
    nudgeMutation.mutate(
      { title: `Nudge: ${clientName}`, content: `Admin nudge triggered for workspace #${workspaceId} (${clientName}). Consider reaching out.` },
      {
        onSuccess: () => toast.success(`Nudge sent for ${clientName}`),
        onError: () => toast.error("Failed to send nudge"),
      }
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center">
            <Crown className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-base">Owner Admin</h1>
            <p className="text-xs text-muted-foreground">All brands &amp; clients</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
          <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" /> My Dashboard
        </Button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Building2, label: "Total Brands", value: allWorkspaces.length, color: "text-primary" },
            { icon: Users, label: "Paying Clients", value: paying.length, color: "text-emerald-400" },
            { icon: DollarSign, label: "MRR (AUD)", value: `A$${mrr.toLocaleString()}`, color: "text-sky-400" },
            { icon: AlertCircle, label: "At Risk", value: atRisk, color: atRisk > 0 ? "text-amber-400" : "text-muted-foreground" },
          ].map(item => (
            <Card key={item.label} className="border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div>
                  <div className="text-xl font-bold">{item.value}</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Plan breakdown */}
        <div className="grid grid-cols-3 gap-3">
          {(["free", "fix_my_brand", "managed_social"] as PlanTier[]).map(tier => {
            const count = allWorkspaces.filter(w => (w.planTier as PlanTier) === tier).length;
            const active = allWorkspaces.filter(w => (w.planTier as PlanTier) === tier && (w.subscriptionStatus as SubStatus) === "active").length;
            return (
              <button key={tier} type="button" onClick={() => setPlanFilter(planFilter === tier ? "all" : tier)}
                className={`p-4 rounded-xl border-2 text-left transition-all
                  ${planFilter === tier ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/40"}`}>
                <div className="font-semibold text-sm">{PLAN_LABELS[tier]}</div>
                <div className="text-2xl font-bold mt-1">{count}</div>
                {tier !== "free" && <div className="text-xs text-muted-foreground mt-0.5">{active} active</div>}
                {tier === "free" && <div className="text-xs text-muted-foreground mt-0.5">Free tier</div>}
              </button>
            );
          })}
        </div>

        {/* Client Journey Table */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Client Journey ({filtered.length})
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setShowJourney(v => !v)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showJourney ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Risk filter */}
                <div className="flex items-center gap-1">
                  {(["all", "amber", "red"] as const).map(r => (
                    <button key={r} type="button" onClick={() => setRiskFilter(r)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-full border transition-all
                        ${riskFilter === r
                          ? r === "red" ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                            : r === "amber" ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                            : "bg-primary/10 text-primary border-primary/40"
                          : "border-border/60 text-muted-foreground hover:border-primary/40"}`}>
                      {r === "all" ? "All" : r === "amber" ? "⚠ Amber" : "🔴 Red"}
                    </button>
                  ))}
                </div>
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9 h-9 text-sm" placeholder="Search brands…"
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
            </div>
          </CardHeader>

          {showJourney && (
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-12 text-center text-muted-foreground text-sm">Loading client data…</div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">No clients found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 text-xs text-muted-foreground">
                        <th className="text-left px-6 py-3 font-medium">
                          <button type="button" onClick={() => toggleSort("name")} className="flex items-center hover:text-foreground transition-colors">
                            Brand <SortIcon col="name" />
                          </button>
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          <button type="button" onClick={() => toggleSort("plan")} className="flex items-center hover:text-foreground transition-colors">
                            Plan <SortIcon col="plan" />
                          </button>
                        </th>
                        <th className="text-left px-4 py-3 font-medium">Onboarding Steps</th>
                        <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Platforms</th>
                        <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">
                          <button type="button" onClick={() => toggleSort("postsSent")} className="flex items-center hover:text-foreground transition-colors">
                            Posts Sent <SortIcon col="postsSent" />
                          </button>
                        </th>
                        <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">
                          <button type="button" onClick={() => toggleSort("errors")} className="flex items-center hover:text-foreground transition-colors">
                            Errors <SortIcon col="errors" />
                          </button>
                        </th>
                        <th className="text-left px-4 py-3 font-medium hidden xl:table-cell">
                          <button type="button" onClick={() => toggleSort("auditScore")} className="flex items-center hover:text-foreground transition-colors">
                            Audit Score <SortIcon col="auditScore" />
                          </button>
                        </th>
                        <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">
                          <button type="button" onClick={() => toggleSort("lastActive")} className="flex items-center hover:text-foreground transition-colors">
                            Last Active <SortIcon col="lastActive" />
                          </button>
                        </th>
                        <th className="text-right px-6 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c, i) => (
                        <tr key={c.workspaceId}
                          className={`border-b border-border/30 hover:bg-muted/20 transition-colors
                            ${c.churnRisk === "red" ? "bg-rose-500/5" : c.churnRisk === "amber" ? "bg-amber-500/5" : ""}
                            ${i === filtered.length - 1 ? "border-b-0" : ""}`}>

                          {/* Brand */}
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {c.logoUrl
                                  ? <img src={c.logoUrl} alt={c.name} className="w-full h-full object-cover" />
                                  : <Building2 className="h-4 w-4 text-muted-foreground" />}
                              </div>
                              <div>
                                <div className="font-medium text-sm">{c.name}</div>
                                {c.website && (
                                  <a href={c.website} target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                                    <Globe className="h-3 w-3" />
                                    {c.website.replace(/^https?:\/\//, "").slice(0, 28)}
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Plan */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className={`text-xs w-fit ${PLAN_COLORS[c.planTier]}`}>
                                {PLAN_LABELS[c.planTier]}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs">
                                {STATUS_ICONS[c.subscriptionStatus]}
                                <span className="text-muted-foreground capitalize text-[10px]">
                                  {c.subscriptionStatus === "none" ? "—" : c.subscriptionStatus.replace("_", " ")}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Onboarding Steps */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1.5">
                              <StepDots s1={c.step1Done} s2={c.step2Done} s3={c.step3Done} />
                              <span className="text-[10px] text-muted-foreground">
                                {c.stepsCompleted}/3 complete
                              </span>
                            </div>
                          </td>

                          {/* Platforms connected */}
                          <td className="px-4 py-3 hidden md:table-cell">
                            <div className="flex items-center gap-1.5">
                              {c.platformCount > 0
                                ? <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                                : <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />}
                              <span className={`text-xs font-medium ${c.platformCount > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
                                {c.platformCount} connected
                              </span>
                            </div>
                          </td>

                          {/* Posts Sent */}
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-semibold text-emerald-400">{c.postsPublished ?? 0}</span>
                              <span className="text-[10px] text-muted-foreground">{c.postsTotal ?? 0} total</span>
                            </div>
                          </td>

                          {/* Errors */}
                          <td className="px-4 py-3 hidden lg:table-cell">
                            {(c.postsFailed ?? 0) > 0
                              ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                                  {c.postsFailed} failed
                                </span>
                              : <span className="text-xs text-muted-foreground">—</span>}
                          </td>

                          {/* Audit Score */}
                          <td className="px-4 py-3 hidden xl:table-cell">
                            {c.auditScore !== null && c.auditScore !== undefined
                              ? <div className="flex items-center gap-1.5">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                                    style={{ background: c.auditScore >= 75 ? "rgba(16,185,129,0.15)" : c.auditScore >= 50 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
                                             color: c.auditScore >= 75 ? "#10b981" : c.auditScore >= 50 ? "#f59e0b" : "#ef4444" }}>
                                    {c.auditScore}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">/100</span>
                                </div>
                              : <span className="text-xs text-muted-foreground">No audit</span>}
                          </td>

                          {/* Last active + churn risk */}
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="flex flex-col gap-1">
                              <ChurnBadge risk={c.churnRisk} days={c.daysSinceActive} />
                              {c.lastActive && (
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(c.lastActive).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-1.5 justify-end">
                              <Button size="sm" variant="ghost" className="h-7 px-2"
                                title="Open workspace"
                                onClick={() => navigate(`/dashboard?workspace=${c.workspaceId}`)}>
                                <Zap className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2"
                                title="Brand settings"
                                onClick={() => navigate(`/dashboard/brand-profile?workspace=${c.workspaceId}`)}>
                                <Settings className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2"
                                title="Send nudge notification"
                                onClick={() => handleNudge(c.name, c.workspaceId)}>
                                <MessageSquare className="h-3.5 w-3.5 text-sky-400" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Revenue breakdown */}
        {paying.length > 0 && (
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Revenue Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-muted-foreground mb-3">By Plan</div>
                  <div className="space-y-2">
                    {(["fix_my_brand", "managed_social"] as PlanTier[]).map(tier => {
                      const count = allWorkspaces.filter(w => (w.planTier as PlanTier) === tier && (w.subscriptionStatus as SubStatus) === "active").length;
                      const revenue = count * PLAN_PRICES[tier];
                      return (
                        <div key={tier} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{PLAN_LABELS[tier]}</span>
                          <span className="font-medium">A${revenue.toLocaleString()} <span className="text-xs text-muted-foreground">({count} clients)</span></span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-3">Total MRR</div>
                  <div className="text-3xl font-bold text-emerald-400">A${mrr.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1">per month (AUD)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
