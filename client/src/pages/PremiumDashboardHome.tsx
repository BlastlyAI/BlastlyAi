import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { GlassCard } from "@/components/premium/GlassCard";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { useDashboardAudit } from "@/hooks/useDashboardAudit";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { PLATFORM_LABELS } from "@shared/dashboardFromAudit";
import { scoreBand, scoreBandLabel } from "@/lib/websiteAuditBuilder";
import {
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  Globe,
  Loader2,
  PenLine,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

function ScorePill({ label, score }: { label: string; score: number }) {
  const band = scoreBand(score);
  const color =
    band === "green" ? "text-emerald-400 border-emerald-500/35 bg-emerald-500/10" : band === "yellow" ? "text-amber-400 border-amber-500/35 bg-amber-500/10" : "text-rose-400 border-rose-500/35 bg-rose-500/10";
  return (
    <div className={`rounded-xl border px-3 py-2.5 text-center ${color}`}>
      <p className="text-2xl font-black tabular-nums">{score}</p>
      <p className="text-[10px] uppercase tracking-wider opacity-80 mt-0.5">{label}</p>
    </div>
  );
}

export default function PremiumDashboardHome() {
  const data = useDashboardAudit();
  const { isFree } = usePlanAccess();

  const {
    businessName,
    website,
    faviconUrl,
    industry,
    aiSummary,
    services,
    products,
    brandTone,
    recommendedPlatforms,
    overallScore,
    brandingScore,
    seoScore,
    trustScore,
    contentScore,
    strengths,
    weaknesses,
    recommendations,
    socialLinks,
    suggestedPosts,
    notifications,
    isLoading,
    fromAudit,
  } = data;

  const offerings = services.length > 0 ? services : products;
  const detectedSocial = socialLinks.filter((s) => s.detected);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {isFree && (
        <UpgradePrompt
          variant="banner"
          message="Unlock Full Command Centre — your audit & onboarding carry forward automatically."
        />
      )}
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
        <div className="relative overflow-hidden rounded-3xl glass-card-glow p-8 md:p-10">
          <div className="absolute inset-0 pointer-events-none audit-analyzing-bg opacity-40" aria-hidden />
          <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="tech-tag">AI Ready</span>
                {fromAudit && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Populated from your website audit
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mb-3">
                {faviconUrl && (
                  <img
                    src={faviconUrl}
                    alt=""
                    className="w-12 h-12 rounded-xl border border-white/15 bg-white/5 object-contain p-1"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <div className="min-w-0">
                  <h1
                    className="text-3xl md:text-4xl font-bold truncate"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Welcome back, {businessName}
                  </h1>
                  {website && (
                    <a
                      href={website.startsWith("http") ? website : `https://${website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-emerald-400/90 hover:text-emerald-300 mt-1 truncate max-w-full"
                    >
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      {website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
              </div>
              <p className="text-muted-foreground max-w-2xl leading-relaxed">{aiSummary}</p>
              <div className="flex flex-wrap gap-3 mt-6">
                <Link
                  href="/dashboard/quick-capture"
                  className="inline-flex items-center gap-2 btn-emerald text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
                >
                  <PenLine className="w-4 h-4" />
                  Quick Post
                </Link>
                <Link
                  href="/dashboard/connections"
                  className="inline-flex items-center gap-2 glass-card px-5 py-2.5 rounded-xl text-sm font-medium hover:border-emerald-500/30 transition-colors"
                >
                  <Globe className="w-4 h-4 text-emerald-400" />
                  Connect platforms
                </Link>
                <Link
                  href={isFree ? "/upgrade" : "/command-centre"}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2.5"
                >
                  {isFree ? "Unlock Command Centre" : "Command Centre"}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            {overallScore > 0 && (
              <div className="shrink-0 text-center rounded-2xl px-5 py-4 border border-emerald-500/35 bg-emerald-500/10 ring-4 ring-emerald-500/10">
                <div className="text-4xl font-black tabular-nums text-emerald-400">{overallScore}</div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Audit score</p>
                <p className="text-xs font-semibold text-emerald-400 mt-1">{scoreBandLabel(overallScore)}</p>
              </div>
            )}
          </div>
        </div>

        {overallScore > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ScorePill label="Branding" score={brandingScore} />
            <ScorePill label="SEO" score={seoScore} />
            <ScorePill label="Trust" score={trustScore} />
            <ScorePill label="Content" score={contentScore} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <GlassCard glow className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  Your AI business profile
                </h2>
                {fromAudit && (
                  <span className="text-[10px] uppercase tracking-widest text-emerald-400/80">
                    From website audit
                  </span>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Industry</p>
                  <p className="font-medium">{industry}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Brand tone</p>
                  <p className="font-medium">{brandTone}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-2">
                  {products.length > 0 ? "Products & services detected" : "Services detected"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {offerings.length > 0 ? (
                    offerings.map((s) => (
                      <span
                        key={s}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/25 text-emerald-200"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">Not detected on homepage</span>
                  )}
                </div>
              </div>
              {detectedSocial.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs mb-2">Social links detected</p>
                  <div className="flex flex-wrap gap-2">
                    {detectedSocial.map((s) => (
                      <span
                        key={s.platform}
                        className="text-xs px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                      >
                        {s.platform}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>

            {(strengths.length > 0 || weaknesses.length > 0) && (
              <GlassCard className="p-6 grid sm:grid-cols-2 gap-6">
                {strengths.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-400 mb-2">Strengths</h3>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      {strengths.map((s, i) => (
                        <li key={i} className="leading-relaxed">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {weaknesses.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-amber-400 mb-2">Opportunities</h3>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      {weaknesses.map((s, i) => (
                        <li key={i} className="leading-relaxed">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </GlassCard>
            )}

            {recommendations.length > 0 && (
              <GlassCard className="p-6">
                <h2 className="text-lg font-semibold mb-3">Recommendations</h2>
                <ul className="space-y-2">
                  {recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-muted-foreground pl-3 border-l-2 border-violet-500/40">
                      {r}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            )}

            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  Suggested posts
                </h2>
                <span className="text-[10px] uppercase tracking-widest text-violet-400">
                  From audit pipeline
                </span>
              </div>
              <div className="space-y-3">
                {suggestedPosts.map((post) => (
                  <div
                    key={post.id}
                    className="feature-card rounded-xl border border-border/60 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-emerald-400">{post.platform}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground capitalize">
                          {post.status}
                        </span>
                      </div>
                      <p className="font-medium text-sm">{post.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.preview}</p>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {post.scheduled}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          <div className="space-y-6">
            <GlassCard glow className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-400" />
                Recommended platforms
              </h2>
              <div className="space-y-2">
                {recommendedPlatforms.map((p) => (
                  <div
                    key={p}
                    className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5 text-sm"
                  >
                    <span>{PLATFORM_LABELS[p] ?? p}</span>
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase">
                      {fromAudit ? "From audit" : "Suggested"}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-400" />
                Notifications
              </h2>
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n.id} className="rounded-lg border border-border/50 p-3">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">{n.time}</p>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-violet-400" />
                Quick actions
              </h2>
              <div className="grid grid-cols-1 gap-2">
                {[
                  ...(isFree ? [{ label: "Unlock Command Centre", href: "/upgrade" }] : []),
                  { label: "Review post queue", href: "/dashboard/queue" },
                  { label: "Open ad studio", href: "/dashboard/ad-studio" },
                  {
                    label: "View audit report",
                    href: data.auditShareToken ? `/audit/report/${data.auditShareToken}` : "/audit",
                  },
                ].map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3 text-sm hover:bg-white/10 transition-colors"
                  >
                    {action.label}
                    <ArrowRight className="w-4 h-4 opacity-50" />
                  </Link>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h2 className="text-lg font-semibold mb-3">Upcoming content</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Starter posts generated from your website audit.
              </p>
              <div className="space-y-2 text-xs">
                {suggestedPosts.map((post, i) => (
                  <div
                    key={post.id}
                    className={`flex justify-between py-2 ${i < suggestedPosts.length - 1 ? "border-b border-border/40" : ""}`}
                  >
                    <span>
                      {post.scheduled.split(" · ")[0]} — {post.platform}
                    </span>
                    <span
                      className={
                        post.status === "ready"
                          ? "text-emerald-400"
                          : post.status === "draft"
                            ? "text-amber-400"
                            : "text-blue-400"
                      }
                    >
                      {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

