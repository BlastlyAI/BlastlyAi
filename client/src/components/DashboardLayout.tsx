import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getAppLoginPath } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard, LogOut, PanelLeft, Zap, Calendar, BarChart3,
  Link2, Video, Search, Globe, TrendingUp, Brain,
  Bot, LineChart, CreditCard,
  CheckSquare, Image, ClipboardList, Megaphone, Camera, BellRing,
  CalendarCheck, Star, Gift, Lock, Rocket
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { toast } from "sonner";
import { usePlanAccess } from "@/hooks/usePlanAccess";

// ─── 4-Stage sidebar structure ────────────────────────────────────────────────
const STAGE_GROUPS = [
  {
    stage: 1,
    label: "Stage 1 — Get Live",
    sublabel: "Post in under 30 seconds",
    locked: false,
    dotColor: "#4ade80",   // green
    items: [
      { icon: LayoutDashboard, label: "Home", path: "/dashboard/home" },
      { icon: Camera, label: "Quick Post", path: "/dashboard/quick-capture" },
      { icon: Link2, label: "Connect Platforms", path: "/dashboard/connections" },
      { icon: Image, label: "Brand Profile", path: "/dashboard/brand-profile" },
      { icon: ClipboardList, label: "Audit History", path: "/dashboard/audit-history" },
      { icon: Brain, label: "Intelligence Report", path: "/dashboard/intelligence-report" },
    ],
  },
  {
    stage: 2,
    label: "Stage 2 — Command Centre",
    sublabel: "Schedule · Calendar · AI content",
    locked: true,
    dotColor: "#a78bfa",   // violet
    items: [
      { icon: Megaphone, label: "Compose", path: "/dashboard/compose" },
      { icon: Calendar, label: "Calendar", path: "/dashboard/calendar" },
      { icon: ClipboardList, label: "Campaigns", path: "/dashboard/campaigns" },
      { icon: BarChart3, label: "Analytics", path: "/dashboard/analytics" },
      { icon: CheckSquare, label: "Approval Queue", path: "/dashboard/approval-queue" },
      { icon: Zap, label: "Ad Studio", path: "/dashboard/ad-studio" },
      { icon: Video, label: "Video Studio", path: "/dashboard/video-studio" },
      { icon: Bot, label: "AI Agent", path: "/dashboard/agent" },
    ],
  },
  {
    stage: 3,
    label: "Stage 3 — Get Found",
    sublabel: "Reviews · SEO · Reputation",
    locked: true,
    dotColor: "#38bdf8",   // cyan
    items: [
      { icon: Star, label: "Reviews", path: "/dashboard/reviews" },
      { icon: Search, label: "SEO Health", path: "/dashboard/seo-health" },
      { icon: Globe, label: "Digital Presence", path: "/dashboard/digital-presence" },
      { icon: TrendingUp, label: "Trends", path: "/dashboard/trends" },
      { icon: Brain, label: "ROI Brain", path: "/dashboard/roi-brain" },
    ],
  },
  {
    stage: 4,
    label: "Stage 4 — Get Paid",
    sublabel: "Payments · Invoicing · Leads",
    locked: true,
    dotColor: "#fbbf24",   // gold
    items: [
      { icon: CreditCard, label: "Billing & Payments", path: "/dashboard/billing" },
      { icon: CalendarCheck, label: "Appointments", path: "/dashboard/appointments" },
      { icon: Gift, label: "Loyalty & Vouchers", path: "/dashboard/loyalty" },
      { icon: BellRing, label: "Reminders", path: "/dashboard/reminders" },
    ],
  },
];

// Flat list for active-path detection
const menuItems = STAGE_GROUPS.flatMap(g => g.items);

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => {
              const returnTo = window.location.pathname + window.location.search;
              window.location.href = getAppLoginPath(returnTo);
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const { isPaid } = usePlanAccess();
  const stageGroups = STAGE_GROUPS.map((g) => ({
    ...g,
    locked: g.stage > 1 && !isPaid,
  }));
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="offcanvas"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>

            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 overflow-y-auto">
            {stageGroups.map((group) => (
              <div key={group.stage} className={`mb-1 ${group.locked ? "opacity-50" : ""}`}>
                {/* Stage header */}
                {!isCollapsed && (
                  <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
                    {group.locked ? (
                      <Lock className="h-3 w-3 shrink-0" style={{ color: group.dotColor }} />
                    ) : (
                      <span
                        className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                        style={{ backgroundColor: group.dotColor }}
                      />
                    )}
                    <div className="min-w-0">
                      <p
                        className="text-[10px] font-bold uppercase tracking-wider truncate leading-none"
                        style={{ color: group.dotColor }}
                      >
                        {group.label}
                      </p>
                      <p className="text-[9px] text-muted-foreground truncate mt-0.5">
                        {group.locked ? `🔒 Unlocks after trial` : group.sublabel}
                      </p>
                    </div>
                  </div>
                )}
                {/* Collapsed: just show a coloured dot divider */}
                {isCollapsed && (
                  <div className="flex justify-center py-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: group.dotColor, opacity: group.locked ? 0.4 : 1 }}
                    />
                  </div>
                )}
                {/* Items */}
                <SidebarMenu className="px-2 pb-1">
                  {group.items.map(item => {
                    const isActive = location === item.path;
                    if (group.locked) {
                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            tooltip={`${item.label} — unlocks after trial`}
                            onClick={() =>
                              toast.info(`${group.label} unlocks with Blastly Pro`, {
                                description: "Upgrade — your audit and onboarding carry forward.",
                                action: { label: "Upgrade", onClick: () => setLocation("/upgrade") },
                              })
                            }
                            className="h-9 font-normal cursor-not-allowed select-none"
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                            {!isCollapsed && (
                              <Lock className="h-3 w-3 ml-auto shrink-0 opacity-60" />
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    }
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className="h-9 transition-all font-normal"
                        >
                          <item.icon
                            className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                          />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            ))}
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </>
  );
}
