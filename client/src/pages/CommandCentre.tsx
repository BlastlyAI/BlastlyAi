/**
 * CommandCentre — The Blastly client home page.
 *
 * Design principle: one screen, no scrolling, everything at a glance.
 * - Business name + greeting at the top
 * - 4 large action buttons (Quick Post, Approve, Queue, Ad Budget)
 * - 3 status tiles (posts ready, next post, unread alerts)
 * - Social platform health bar at the bottom
 * - Colour scheme picker (3 themes) + "Full Dashboard" escape hatch
 */

import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Camera, CheckSquare, ClipboardList, CreditCard,
  LayoutDashboard, Bell, Palette, ChevronRight,
  Wifi, WifiOff, AlertCircle, Zap, Bot, Brain,
  Building2, LogOut, Settings, ChevronDown, Users, BarChart3,
  FileText, Megaphone, Eye, Phone, CalendarCheck, MessageSquare, Cpu, Clock,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// ── Colour scheme definitions ─────────────────────────────────────────────────
const SCHEMES = {
  bold: {
    label: "Bold",
    description: "Dark navy + electric blue",
    swatch: "#1a56db",
    bg: "oklch(0.13 0.012 245)",
    card: "oklch(0.17 0.012 245)",
    border: "oklch(0.26 0.012 245)",
    accent: "oklch(0.62 0.18 220)",
    accentFg: "#fff",
    text: "oklch(0.92 0.008 240)",
    muted: "oklch(0.58 0.010 240)",
    heroGradient: "linear-gradient(135deg, oklch(0.52 0.18 220) 0%, oklch(0.52 0.18 265) 100%)",
    quickPostBg: "linear-gradient(135deg, oklch(0.52 0.18 220) 0%, oklch(0.52 0.18 265) 100%)",
    approveBg: "linear-gradient(135deg, oklch(0.52 0.16 165) 0%, oklch(0.52 0.16 185) 100%)",
    queueBg: "linear-gradient(135deg, oklch(0.52 0.18 280) 0%, oklch(0.52 0.18 300) 100%)",
    adBg: "linear-gradient(135deg, oklch(0.55 0.16 50) 0%, oklch(0.55 0.16 35) 100%)",
  },
  soft: {
    label: "Soft",
    description: "Light lavender + rose",
    swatch: "#9b59b6",
    bg: "oklch(0.97 0.005 285)",
    card: "oklch(0.99 0.003 285)",
    border: "oklch(0.88 0.012 285)",
    accent: "oklch(0.55 0.20 285)",
    accentFg: "#fff",
    text: "oklch(0.22 0.012 285)",
    muted: "oklch(0.52 0.010 285)",
    heroGradient: "linear-gradient(135deg, oklch(0.55 0.20 285) 0%, oklch(0.55 0.20 340) 100%)",
    quickPostBg: "linear-gradient(135deg, oklch(0.55 0.20 285) 0%, oklch(0.55 0.20 310) 100%)",
    approveBg: "linear-gradient(135deg, oklch(0.55 0.18 165) 0%, oklch(0.55 0.18 185) 100%)",
    queueBg: "linear-gradient(135deg, oklch(0.55 0.20 340) 0%, oklch(0.55 0.20 355) 100%)",
    adBg: "linear-gradient(135deg, oklch(0.58 0.18 60) 0%, oklch(0.58 0.18 45) 100%)",
  },
  warm: {
    label: "Warm",
    description: "Cream + terracotta",
    swatch: "#e07b39",
    bg: "oklch(0.97 0.010 65)",
    card: "oklch(0.99 0.006 65)",
    border: "oklch(0.88 0.018 65)",
    accent: "oklch(0.58 0.18 35)",
    accentFg: "#fff",
    text: "oklch(0.22 0.018 35)",
    muted: "oklch(0.52 0.012 35)",
    heroGradient: "linear-gradient(135deg, oklch(0.58 0.18 35) 0%, oklch(0.58 0.18 55) 100%)",
    quickPostBg: "linear-gradient(135deg, oklch(0.58 0.18 35) 0%, oklch(0.58 0.18 20) 100%)",
    approveBg: "linear-gradient(135deg, oklch(0.55 0.16 165) 0%, oklch(0.55 0.16 185) 100%)",
    queueBg: "linear-gradient(135deg, oklch(0.55 0.18 55) 0%, oklch(0.55 0.18 70) 100%)",
    adBg: "linear-gradient(135deg, oklch(0.52 0.18 280) 0%, oklch(0.52 0.18 300) 100%)",
  },
} as const;

type SchemeKey = keyof typeof SCHEMES;

// ── Platform health dot ───────────────────────────────────────────────────────
function PlatformDot({
  platform,
  connected,
  scheme,
}: {
  platform: string;
  connected: boolean;
  scheme: typeof SCHEMES[SchemeKey];
}) {
  const ICONS: Record<string, string> = {
    facebook: "F", instagram: "In", twitter: "X", linkedin: "Li",
    tiktok: "Tt", youtube: "Yt", pinterest: "Pi", google_business: "G",
  };
  const label = ICONS[platform] ?? platform.slice(0, 2).toUpperCase();
  return (
    <div
      className="flex flex-col items-center gap-1 cursor-pointer"
      title={`${platform}: ${connected ? "Connected" : "Not connected"}`}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
        style={{
          background: connected ? scheme.accent : scheme.border,
          color: connected ? scheme.accentFg : scheme.muted,
          border: `2px solid ${connected ? scheme.accent : scheme.border}`,
        }}
      >
        {label}
      </div>
      <div
        className="w-2 h-2 rounded-full"
        style={{ background: connected ? "oklch(0.65 0.22 165)" : "oklch(0.55 0.14 22)" }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CommandCentre() {
  const { user, logout, isAuthenticated } = useAuth();
  const { currentWorkspace, workspaces, setCurrentWorkspace } = useWorkspace();
  const [, navigate] = useLocation();
  const wsId = currentWorkspace?.id ?? 0;

  // Colour scheme state — load from DB, fall back to bold
  const [scheme, setScheme] = useState<SchemeKey>("bold");
  const [showSchemePicker, setShowSchemePicker] = useState(false);

  const { data: prefs } = trpc.preferences.get.useQuery(
    { workspaceId: wsId },
    { enabled: !!wsId }
  );
  const savePrefs = trpc.preferences.save.useMutation();

  useEffect(() => {
    if (prefs?.colorScheme) {
      const key = prefs.colorScheme as SchemeKey;
      // Guard against stale DB values that no longer exist in SCHEMES
      setScheme(key in SCHEMES ? key : "bold");
    }
  }, [prefs]);

  const handleSchemeChange = (s: SchemeKey) => {
    setScheme(s);
    setShowSchemePicker(false);
    if (wsId) {
      savePrefs.mutate({ workspaceId: wsId, colorScheme: s });
      toast.success(`Theme changed to ${SCHEMES[s].label}`);
    }
  };

  // Data queries
  const { data: queueStats } = trpc.postQueue.stats.useQuery(
    { workspaceId: wsId }, { enabled: !!wsId }
  );
  const { data: approvalStats } = trpc.approval.getStats.useQuery(
    undefined, { enabled: !!wsId }
  );
  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(
    { workspaceId: wsId }, { enabled: !!wsId, refetchInterval: 30000 }
  );
  const { data: socialAccounts = [] } = trpc.social.list.useQuery(
    { workspaceId: wsId }, { enabled: !!wsId }
  );
  const { data: wallet } = trpc.wallet.getWallet.useQuery(
    { workspaceId: wsId }, { enabled: !!wsId }
  );
  const { data: monthlyStats } = trpc.monthlyStats.getMyStats.useQuery(
    { workspaceId: wsId },
    { enabled: !!wsId, refetchInterval: 60000 }
  );

  const s = SCHEMES[scheme];
  const businessName = currentWorkspace?.name ?? "Your Business";
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const pendingApprovals = (approvalStats?.pendingAgency ?? 0) + (approvalStats?.pendingClient ?? 0);
  const queueTotal = queueStats?.total ?? 0;
  const adBalance = wallet ? `$${wallet.balanceAud}` : "—";
  const adLow = wallet?.isLowBalance ?? false;

  // Auth gate — redirect immediately to login, no intermediate screen
  if (!isAuthenticated) {
    window.location.href = getLoginUrl("/dashboard/home");
    return null;
  }

  const PLATFORMS_TO_SHOW = ["facebook", "instagram", "twitter", "linkedin", "tiktok", "youtube"];
  const connectedPlatforms = new Set((socialAccounts as any[]).map((a: any) => a.platform));

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: s.bg, color: s.text, fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: `1px solid ${s.border}` }}
      >
        {/* Brand / workspace switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: s.accent }}
              >
                <Building2 className="w-4 h-4" style={{ color: s.accentFg }} />
              </div>
              <span className="font-semibold text-sm truncate max-w-[140px]" style={{ color: s.text }}>
                {businessName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: s.muted }} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            {(workspaces as any[]).map((ws: any) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => setCurrentWorkspace(ws)}
                className={ws.id === wsId ? "font-semibold" : ""}
              >
                {ws.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Colour scheme picker */}
          <div className="relative">
            <button
              onClick={() => setShowSchemePicker(v => !v)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-80"
              style={{ background: s.card, border: `1px solid ${s.border}` }}
              title="Change colour theme"
            >
              <Palette className="w-4 h-4" style={{ color: s.muted }} />
            </button>
            {showSchemePicker && (
              <div
                className="absolute right-0 top-10 z-50 rounded-xl p-3 shadow-xl space-y-2 w-52"
                style={{ background: s.card, border: `1px solid ${s.border}` }}
              >
                <p className="text-xs font-semibold mb-2" style={{ color: s.muted }}>Choose your theme</p>
                {(Object.keys(SCHEMES) as SchemeKey[]).map(k => (
                  <button
                    key={k}
                    onClick={() => handleSchemeChange(k)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all hover:opacity-80"
                    style={{
                      background: k === scheme ? s.accent + "22" : "transparent",
                      border: `1px solid ${k === scheme ? s.accent : "transparent"}`,
                    }}
                  >
                    <div className="w-5 h-5 rounded-full shrink-0" style={{ background: SCHEMES[k].swatch }} />
                    <div className="text-left">
                      <div className="text-sm font-medium" style={{ color: s.text }}>{SCHEMES[k].label}</div>
                      <div className="text-xs" style={{ color: s.muted }}>{SCHEMES[k].description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dashboard toggle */}
          <Link href="/dashboard/overview">
            <button
              className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ background: s.accent + "22", border: `1px solid ${s.accent}55`, color: s.accent }}
              title="Switch to Dashboard"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Dashboard
            </button>
          </Link>

          {/* Notifications */}
          <Link href="/dashboard/notifications">
            <button
              className="w-8 h-8 rounded-lg flex items-center justify-center relative transition-opacity hover:opacity-80"
              style={{ background: s.card, border: `1px solid ${s.border}` }}
            >
              <Bell className="w-4 h-4" style={{ color: s.muted }} />
              {Number(unreadCount) > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: "oklch(0.55 0.22 25)", color: "#fff" }}
                >
                  {Number(unreadCount) > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </Link>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hover:opacity-80 transition-opacity">
                <Avatar className="w-8 h-8">
                  <AvatarFallback style={{ background: s.accent, color: s.accentFg, fontSize: "12px" }}>
                    {user?.name?.slice(0, 2).toUpperCase() ?? "ME"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
                <Settings className="w-4 h-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-500">
                <LogOut className="w-4 h-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col px-4 py-5 gap-5 max-w-lg mx-auto w-full">

        {/* Greeting */}
        <div>
          <p className="text-sm" style={{ color: s.muted }}>{greeting},</p>
          <h1 className="text-2xl font-bold leading-tight" style={{ color: s.text }}>
            {businessName}
          </h1>
        </div>

        {/* ── PRIMARY ACTIONS: Quick Post + Client Contact ───────────────────────── */}
        <div className="grid grid-cols-2 gap-4">

          {/* Quick Post */}
          <Link href="/dashboard/quick-capture">
            <button
              className="w-full rounded-2xl p-5 flex flex-col items-center gap-3 transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: s.quickPostBg,
                boxShadow: `0 6px 24px ${s.accent}55`,
                minHeight: "120px",
              }}
            >
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <div className="text-center">
                <div className="text-base font-bold text-white">Quick Post</div>
                <div className="text-xs text-white/70 mt-0.5">Photo → live in 30 sec</div>
              </div>
            </button>
          </Link>

          {/* Client Contact */}
          <Link href="/dashboard/contacts">
            <button
              className="w-full rounded-2xl p-5 flex flex-col items-center gap-3 transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, oklch(0.45 0.18 265) 0%, oklch(0.45 0.18 290) 100%)",
                boxShadow: "0 6px 24px oklch(0.45 0.18 265 / 0.40)",
                minHeight: "120px",
              }}
            >
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div className="text-center">
                <div className="text-base font-bold text-white">Client Contact</div>
                <div className="text-xs text-white/70 mt-0.5">CRM · messages · leads</div>
              </div>
            </button>
          </Link>

        </div>

        {/* ── Status row (3 tiles) ────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {/* Posts ready */}
          <div
            className="rounded-xl p-3 flex flex-col gap-1"
            style={{ background: s.card, border: `1px solid ${s.border}` }}
          >
            <span className="text-xs font-medium" style={{ color: s.muted }}>Queue</span>
            <span className="text-2xl font-bold" style={{ color: s.text }}>{queueTotal}</span>
            <span className="text-xs" style={{ color: s.muted }}>posts ready</span>
          </div>

          {/* Pending approvals */}
          <div
            className="rounded-xl p-3 flex flex-col gap-1 relative"
            style={{
              background: s.card,
              border: `1px solid ${pendingApprovals > 0 ? "oklch(0.72 0.14 80)" : s.border}`,
            }}
          >
            {pendingApprovals > 0 && (
              <div
                className="absolute top-2 right-2 w-2 h-2 rounded-full"
                style={{ background: "oklch(0.72 0.14 80)" }}
              />
            )}
            <span className="text-xs font-medium" style={{ color: s.muted }}>Approvals</span>
            <span className="text-2xl font-bold" style={{ color: s.text }}>{pendingApprovals}</span>
            <span className="text-xs" style={{ color: s.muted }}>need review</span>
          </div>

          {/* Ad balance */}
          <div
            className="rounded-xl p-3 flex flex-col gap-1 relative"
            style={{
              background: s.card,
              border: `1px solid ${adLow ? "oklch(0.55 0.14 22)" : s.border}`,
            }}
          >
            {adLow && (
              <div
                className="absolute top-2 right-2 w-2 h-2 rounded-full"
                style={{ background: "oklch(0.55 0.14 22)" }}
              />
            )}
            <span className="text-xs font-medium" style={{ color: s.muted }}>Ad Budget</span>
            <span className="text-2xl font-bold" style={{ color: s.text }}>{adBalance}</span>
            <span className="text-xs" style={{ color: s.muted }}>remaining</span>
          </div>
        </div>

        {/* ── Intelligence Report — prominent CTA ─────────────────────────────── */}
        <Link href="/dashboard/intelligence-report">
          <button
            className="w-full rounded-2xl p-4 flex items-center gap-4 transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, oklch(0.35 0.18 280) 0%, oklch(0.40 0.15 310) 100%)",
              boxShadow: "0 6px 24px oklch(0.35 0.18 280 / 0.40)",
              border: "1px solid oklch(0.50 0.18 280 / 0.30)",
            }}
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div className="text-left flex-1">
              <div className="text-base font-bold text-white">Intelligence Report</div>
              <div className="text-xs text-white/70 mt-0.5">Your 9-section business intelligence — Stage 1 of 7</div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/60 shrink-0" />
          </button>
        </Link>

        {/* ── Secondary action buttons (Approve, Queue, Ad Budget) ─────────────────── */}
        <div className="grid grid-cols-2 gap-4">

          {/* Approve Posts */}
          <Link href="/dashboard/queue">
            <button
              className="w-full rounded-2xl p-4 flex flex-col gap-3 transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: s.approveBg,
                boxShadow: "0 4px 16px oklch(0.52 0.16 165 / 0.25)",
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-bold text-white">Approve</div>
                <div className="text-xs text-white/75">
                  {pendingApprovals > 0 ? `${pendingApprovals} waiting` : "All clear"}
                </div>
              </div>
            </button>
          </Link>

          {/* Content Queue */}
          <Link href="/dashboard/queue">
            <button
              className="w-full rounded-2xl p-4 flex flex-col gap-3 transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: s.queueBg,
                boxShadow: "0 4px 16px oklch(0.52 0.18 280 / 0.25)",
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-bold text-white">Queue</div>
                <div className="text-xs text-white/75">
                  {queueTotal > 0 ? `${queueTotal} scheduled` : "Add content"}
                </div>
              </div>
            </button>
          </Link>

          {/* Ad Budget */}
          <Link href="/dashboard/billing" className="col-span-2">
            <button
              className="w-full rounded-2xl p-4 flex items-center gap-4 transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: s.adBg,
                boxShadow: "0 4px 16px oklch(0.55 0.16 50 / 0.25)",
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-white">Ad Budget</div>
                <div className="text-xs text-white/75">
                  {adLow ? "⚠️ Balance is low — tap to top up" : `${adBalance} available this month`}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/60 shrink-0" />
            </button>
          </Link>
        </div>

        {/* ── Monthly Activity Stats ────────────────────────────────────────── */}
        {monthlyStats && (() => {
          const features = monthlyStats.activeFeatures ?? [];
          const allCards = [
            { key: "blogs",        label: "Blogs Published",   value: monthlyStats.blogsPublished,       icon: FileText,      color: "oklch(0.62 0.18 220)" },
            { key: "social",       label: "Social Posts",      value: monthlyStats.socialPostsPublished,  icon: Megaphone,     color: "oklch(0.62 0.18 165)" },
            { key: "reach",        label: "People Reached",    value: monthlyStats.peopleReached,         icon: Eye,           color: "oklch(0.62 0.18 285)" },
            { key: "ai_voice",     label: "Calls Handled",     value: monthlyStats.callsHandled,          icon: Phone,         color: "oklch(0.62 0.18 140)" },
            { key: "appointments", label: "Appointments",      value: monthlyStats.appointmentsBooked,    icon: CalendarCheck, color: "oklch(0.62 0.18 50)" },
            { key: "enquiries",    label: "New Enquiries",     value: monthlyStats.newEnquiries,          icon: MessageSquare, color: "oklch(0.62 0.18 340)" },
            { key: "mcp_engine",   label: "AI Citations",      value: monthlyStats.aiCitations,           icon: Cpu,           color: "oklch(0.62 0.18 300)" },
            { key: "hours",        label: "Hours Saved",       value: monthlyStats.hoursSaved,            icon: Clock,         color: "oklch(0.62 0.18 80)" },
          ];
          // If no features configured, show all cards; otherwise filter to active ones
          const visibleCards = features.length === 0
            ? allCards
            : allCards.filter(c => features.includes(c.key));
          if (visibleCards.length === 0) return null;
          const now = new Date();
          const monthLabel = now.toLocaleString("default", { month: "long" }) + " " + now.getFullYear();
          return (
            <div
              className="rounded-2xl p-4"
              style={{ background: s.card, border: `1px solid ${s.border}` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: s.muted }}>
                  {monthLabel} Activity
                </span>
                <span className="text-xs" style={{ color: s.muted }}>Live</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {visibleCards.map(card => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.key}
                      className="rounded-xl p-2 flex flex-col items-center gap-1 text-center"
                      style={{ background: s.bg, border: `1px solid ${s.border}` }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: `${card.color}22` }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: card.color }} />
                      </div>
                      <span className="text-lg font-bold leading-none" style={{ color: s.text }}>
                        {card.value.toLocaleString()}
                      </span>
                      <span className="text-[10px] leading-tight" style={{ color: s.muted }}>
                        {card.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── Social platform health ──────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-4"
          style={{ background: s.card, border: `1px solid ${s.border}` }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: s.muted }}>
              Connected Platforms
            </span>
            <Link href="/dashboard/connections">
              <span className="text-xs font-medium" style={{ color: s.accent }}>Manage →</span>
            </Link>
          </div>
          <div className="flex items-center justify-around">
            {PLATFORMS_TO_SHOW.map(p => (
              <PlatformDot
                key={p}
                platform={p}
                connected={connectedPlatforms.has(p)}
                scheme={s}
              />
            ))}
          </div>
        </div>

        {/* ── Full Dashboard link ──────────────────────────────────────────────────────── */}
        <Link href="/dashboard/overview">
          <button
            className="w-full rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-medium transition-all hover:opacity-80"
            style={{ background: s.card, border: `1px solid ${s.border}`, color: s.muted }}
          >
            <LayoutDashboard className="w-4 h-4" />
            Full Dashboard
            <ChevronRight className="w-4 h-4" />
          </button>
        </Link>

      </main>
    </div>
  );
}
