import { useAuth } from "@/_core/hooks/useAuth";
import { useWorkspace, type Workspace } from "@/contexts/WorkspaceContext";
import type { AppUser } from "@/types/appUser";
import { fetchUnreadNotificationCount } from "@/lib/supabaseNotifications";
import { createWorkspaceApi } from "@/lib/workspaceApi";
import { getAppLoginPath } from "@/const";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart3, Bell, BookOpen, Brain, Building2, Calendar, Camera, ChevronDown,
  Factory, Globe, LayoutDashboard, LogOut, Megaphone, Menu, Plus, Plug,
  Settings, Sparkles, TrendingUp, Users, Wand2, X, Zap, Bot, Search,
  Mic, ClipboardList, ExternalLink, Video, CreditCard, Activity, Target, Check,
  Loader2, Sun, Moon,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

const NAV_ITEMS = [
  // Core
  { label: "Home", icon: LayoutDashboard, href: "/dashboard/home", section: "Core" },
  { label: "Command Centre", icon: Bell, href: "/command", highlight: true },
  { label: "Quick Upload", icon: Camera, href: "/dashboard/quick-capture", highlight: true },
  { label: "Content Queue", icon: ClipboardList, href: "/dashboard/queue" },
  { label: "Compose", icon: Sparkles, href: "/dashboard/compose" },
  { label: "Calendar", icon: Calendar, href: "/dashboard/calendar" },
  { label: "Campaigns", icon: Megaphone, href: "/dashboard/campaigns" },
  { label: "Analytics", icon: BarChart3, href: "/dashboard/analytics" },
  { label: "Content Library", icon: BookOpen, href: "/dashboard/library" },
  { label: "Connections", icon: Globe, href: "/dashboard/connections" },
  { label: "Team", icon: Users, href: "/dashboard/team" },
  // Brand
  { label: "Brand Profile", icon: Building2, href: "/dashboard/brand-profile", section: "Brand" },
  { label: "Connected Apps", icon: Plug, href: "/dashboard/connected-apps" },
  { label: "App Health", icon: Activity, href: "/dashboard/app-health" },
  // AI Tools
  { label: "AI Ad Studio", icon: Wand2, href: "/dashboard/ad-studio", section: "AI Tools", highlight: true },
  { label: "Campaign Agent", icon: Bot, href: "/dashboard/agent", highlight: true },
  { label: "Campaign Factory", icon: Factory, href: "/dashboard/factory", highlight: true },
  { label: "Brand Voice", icon: Mic, href: "/dashboard/brand-voice", highlight: true },
  { label: "Web Intelligence", icon: Search, href: "/dashboard/intelligence", highlight: true },
  { label: "Trends & Rivals", icon: TrendingUp, href: "/dashboard/trends", highlight: true },
  { label: "ROI Brain", icon: Brain, href: "/dashboard/roi-brain", highlight: true },
  { label: "Video Studio", icon: Video, href: "/dashboard/video-studio", highlight: true },
  // Audit
  { label: "Audit History", icon: ClipboardList, href: "/dashboard/audit-history", section: "Audit Tool" },
  { label: "Free Audit Tool", icon: ExternalLink, href: "/audit" },
  // SEO
  { label: "SEO Health Scanner", icon: Activity, href: "/dashboard/seo-health", section: "SEO & Analytics", highlight: true },
  { label: "Digital Presence Scanner", icon: Zap, href: "/dashboard/digital-presence", highlight: true },
  { label: "Competitor Intelligence", icon: Target, href: "/dashboard/competitor-intelligence", highlight: true },
  // Account
  { label: "Billing & Upgrade", icon: CreditCard, href: "/dashboard/billing", section: "Account" },
];

// ── Create Brand modal ─────────────────────────────────────────────────────
function CreateBrandModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (ws: Workspace) => void;
}) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [pending, setPending] = useState(false);
  const { refetch } = useWorkspace();

  async function submitBrand() {
    if (!name.trim()) return;
    setPending(true);
    try {
      const ws = await createWorkspaceApi({
        name: name.trim(),
        website: website.trim() || undefined,
        industry: industry.trim() || undefined,
      });
      await refetch();
      toast.success(`Brand "${ws.name}" created!`, {
        description: "Set up your brand profile to get the best AI results.",
      });
      onCreated(ws);
      setName("");
      setWebsite("");
      setIndustry("");
    } catch (err) {
      toast.error("Could not create brand", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md" style={{ background: "oklch(0.09 0.015 250)", border: "1px solid oklch(0.22 0.018 248)" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[oklch(0.72_0.22_220)]" />
            Create a New Brand
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Each brand gets its own workspace — separate posts, analytics, and AI voice.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="brand-name" className="text-xs">Brand Name <span className="text-red-400">*</span></Label>
            <Input
              id="brand-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Genius Jungle"
              className="bg-[oklch(0.10_0.015_250)] border-white/10"
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) void submitBrand(); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand-website" className="text-xs">Website <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="brand-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://geniusjungle.com"
              className="bg-[oklch(0.10_0.015_250)] border-white/10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand-industry" className="text-xs">Industry <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="brand-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Education, Technology, Retail…"
              className="bg-[oklch(0.10_0.015_250)] border-white/10"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button
              onClick={() => void submitBrand()}
              disabled={!name.trim() || pending}
              className="flex-1 bg-[oklch(0.55_0.28_220)] hover:bg-[oklch(0.60_0.28_220)] text-white gap-2"
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Brand
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Sidebar content ────────────────────────────────────────────────────────
function SidebarContent({
  onClose,
  location,
  user,
  logout,
  workspaces,
  currentWorkspace,
  setCurrentWorkspace,
  unreadCount,
}: {
  onClose?: () => void;
  location: string;
  user: AppUser | null;
  logout: () => void | Promise<void>;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (ws: Workspace) => void;
  unreadCount: number;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [, navigate] = useLocation();
  const { theme, toggleTheme, switchable } = useTheme();

  function handleBrandCreated(ws: Workspace) {
    setCurrentWorkspace(ws);
    setCreateOpen(false);
    navigate("/dashboard/brand-profile");
  }

  // Brand avatar: logo image or coloured initial
  function BrandAvatar({ ws, size = 6 }: { ws: { name: string; logoUrl?: string | null }; size?: number }) {
    const sizeClass = `w-${size} h-${size}`;
    if (ws.logoUrl) {
      return (
        <div className={`${sizeClass} rounded-md overflow-hidden shrink-0 bg-[oklch(0.10_0.015_250)]`}>
          <img src={ws.logoUrl} alt={ws.name} className="w-full h-full object-contain" />
        </div>
      );
    }
    return (
      <div
        className={`${sizeClass} rounded-md flex items-center justify-center shrink-0`}
        style={{
          background: "linear-gradient(135deg, oklch(0.52 0.18 220), oklch(0.55 0.28 270))",
          boxShadow: "0 0 8px oklch(0.52 0.18 220 / 0.40)",
        }}
      >
        <span className="text-[10px] font-bold text-white">{ws.name?.[0]?.toUpperCase() ?? "B"}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "oklch(0.08 0.016 248)", borderRight: "1px solid oklch(0.26 0.012 245)" }}>
      {/* Logo + close button */}
      <div className="flex items-center justify-between px-4 py-5 border-b" style={{ borderColor: "oklch(0.26 0.012 245)" }}>
        <div className="flex items-center gap-2">
          <img
            src="/manus-storage/blastly-icon-512_d2809e7c.png"
            alt="Blastly"
            className="h-11 w-11 rounded-xl object-cover flex-shrink-0"
          />
          <span className="text-2xl font-black tracking-tight text-white">Blastly</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors"
            style={{ color: "var(--sidebar-foreground)" }}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Brand / Workspace Switcher ── */}
      <div className="px-3 py-3 border-b" style={{ borderColor: "oklch(0.26 0.012 245)" }}>
        <p className="text-[9px] font-bold uppercase tracking-[0.15em] font-mono px-1 mb-2" style={{ color: "oklch(0.40 0.018 248)" }}>
          Active Brand
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl border transition-all text-left hover:border-[oklch(0.65_0.28_220/0.3)]"
              style={{ background: "oklch(0.11 0.016 248)", borderColor: "oklch(0.22 0.018 248)" }}>
              {currentWorkspace ? (
                <BrandAvatar ws={currentWorkspace} size={7} />
              ) : (
                <div className="w-7 h-7 rounded-md bg-[oklch(0.14_0.018_248)] flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: "oklch(0.88 0.012 240)" }}>
                  {currentWorkspace?.name ?? "Select brand"}
                </p>
                {typeof (currentWorkspace as Record<string, unknown>)?.website === "string" && (
                  <p className="text-[10px] truncate" style={{ color: "oklch(0.45 0.014 240)" }}>
                    {((currentWorkspace as Record<string, unknown>).website as string).replace(/^https?:\/\//, "")}
                  </p>
                )}
              </div>
              <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: "oklch(0.45 0.014 240)" }} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56" style={{ background: "oklch(0.10 0.015 250)", border: "1px solid oklch(0.22 0.018 248)" }}>
            <div className="px-2 py-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Your Brands</p>
            </div>
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => { setCurrentWorkspace(ws); onClose?.(); }}
                className="gap-2.5 cursor-pointer"
              >
                <BrandAvatar ws={ws} size={5} />
                <span className="flex-1 truncate text-sm">{ws.name}</span>
                {ws.id === currentWorkspace?.id && <Check className="w-3.5 h-3.5 text-[oklch(0.72_0.22_220)] shrink-0" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => { setCreateOpen(true); onClose?.(); }}
              className="gap-2.5 cursor-pointer text-[oklch(0.72_0.22_220)]"
            >
              <div className="w-5 h-5 rounded-md border border-dashed border-[oklch(0.65_0.28_220/0.4)] flex items-center justify-center">
                <Plus className="w-3 h-3" />
              </div>
              <span className="text-sm font-medium">Add New Brand</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ label, icon: Icon, href, highlight, section }) => {
          const isActive = location === href || (href !== "/dashboard" && location.startsWith(href));
          return (
            <div key={href}>
              {section && (
                <div className="flex items-center gap-2 px-3 pt-5 pb-2">
                  <div className="h-px flex-1" style={{ background: "oklch(0.26 0.012 245)" }} />
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] font-mono"
                    style={{ color: "oklch(0.45 0.020 248)" }}>
                    {section}
                  </p>
                  <div className="h-px flex-1" style={{ background: "oklch(0.26 0.012 245)" }} />
                </div>
              )}
              <Link href={href} onClick={onClose}>
                <div
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer"
                  style={{
                    background: isActive
                      ? highlight
                        ? "linear-gradient(135deg, oklch(0.62 0.28 220 / 0.18), oklch(0.55 0.28 270 / 0.10))"
                        : "oklch(0.20 0.012 245)"
                      : "transparent",
                    color: isActive ? "oklch(0.95 0.010 240)" : "oklch(0.55 0.014 240)",
                    border: isActive && highlight ? "1px solid oklch(0.62 0.18 220 / 0.30)" : "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "oklch(0.12 0.018 248)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                  }}
                >
                  <Icon
                    className="w-4 h-4 shrink-0"
                    style={{ color: isActive ? "oklch(0.68 0.14 220)" : highlight ? "oklch(0.55 0.20 220)" : "oklch(0.45 0.014 240)" }}
                  />
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "0.8125rem" }}>{label}</span>
                  {highlight && !isActive && (
                    <span
                      className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-sm font-mono"
                      style={{ background: "oklch(0.62 0.18 220 / 0.12)", color: "oklch(0.68 0.14 220)", border: "1px solid oklch(0.62 0.18 220 / 0.20)" }}
                    >
                      AI
                    </span>
                  )}
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "oklch(0.62 0.18 220)", boxShadow: "0 0 6px oklch(0.62 0.18 220 / 0.80)" }} />
                  )}
                </div>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-3 border-t space-y-0.5" style={{ borderColor: "oklch(0.26 0.012 245)" }}>
        <Link href="/dashboard/notifications" onClick={onClose}>
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer"
            style={{ color: "oklch(0.55 0.014 240)", background: location === "/dashboard/notifications" ? "oklch(0.20 0.012 245)" : "transparent" }}
            onMouseEnter={(e) => { if (location !== "/dashboard/notifications") (e.currentTarget as HTMLDivElement).style.background = "oklch(0.12 0.018 248)"; }}
            onMouseLeave={(e) => { if (location !== "/dashboard/notifications") (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}>
            <div className="relative">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span>Notifications</span>
            {unreadCount > 0 && <span className="ml-auto text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded font-semibold">{unreadCount}</span>}
          </div>
        </Link>
        <Link href="/dashboard/settings" onClick={onClose}>
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer"
            style={{ color: "oklch(0.55 0.014 240)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "oklch(0.12 0.018 248)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}>
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </div>
        </Link>
      </div>

      {/* Theme toggle */}
      {switchable && toggleTheme && (
        <div className="px-3 pb-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left text-sm font-medium"
            style={{ color: "oklch(0.55 0.014 240)", background: "transparent" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.12 0.018 248)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
        </div>
      )}

      {/* User profile */}
      <div className="px-3 pb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl transition-all" style={{ background: "transparent" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.12 0.018 248)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarFallback className="text-xs font-semibold" style={{ background: "linear-gradient(135deg, oklch(0.52 0.18 220), oklch(0.55 0.28 270))", color: "white" }}>
                  {(user?.name as string)?.[0]?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-medium truncate" style={{ color: "oklch(0.85 0.012 240)" }}>{user?.name ?? "User"}</p>
                <p className="text-[10px] truncate" style={{ color: "oklch(0.45 0.014 240)" }}>{user?.email ?? ""}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => logout()} className="gap-2 text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4" />Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Create Brand Modal */}
      <CreateBrandModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleBrandCreated}
      />
    </div>
  );
}

export default function AppLayout({ children, title }: { children: ReactNode; title?: string }) {
  const { user, logout, isAuthenticated } = useAuth();
  const { currentWorkspace, workspaces, setCurrentWorkspace } = useWorkspace();
  const { theme, toggleTheme, switchable } = useTheme();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const wsId = currentWorkspace?.id ?? 0;

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["supabase", "notifications", "unread", user?.id],
    queryFn: () => fetchUnreadNotificationCount(user!.id),
    enabled: Boolean(user?.id),
    refetchInterval: 30_000,
  });

  useEffect(() => { setSidebarOpen(false); }, [location]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <img
            src="/manus-storage/blastly-icon-512_d2809e7c.png"
            alt="Blastly"
            className="h-12 w-auto object-contain mx-auto mb-4"
          />
          <p className="text-muted-foreground mb-4">Please sign in to access your dashboard.</p>
          <a href={getAppLoginPath()}><Button>Sign in</Button></a>
        </div>
      </div>
    );
  }

  const sidebarProps = {
    location,
    user,
    logout,
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    unreadCount: Number(unreadCount),
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col h-full" style={{ borderRight: "1px solid oklch(0.26 0.012 245)" }}>
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
          style={{ background: "rgba(0,0,0,0.5)" }}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col h-full transform transition-transform duration-300 ease-in-out lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <SidebarContent {...sidebarProps} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 shrink-0" style={{ borderBottom: "1px solid oklch(0.26 0.012 245)", background: "oklch(0.08 0.016 248)" }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center flex-1">
            <img
              src="/manus-storage/blastly-icon-512_d2809e7c.png"
              alt="Blastly"
              className="h-10 w-auto object-contain"
            />
          </div>
          {switchable && toggleTheme && (
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Toggle theme"
              style={{ color: "oklch(0.55 0.014 240)" }}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
