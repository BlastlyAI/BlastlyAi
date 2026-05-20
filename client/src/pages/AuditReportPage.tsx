import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { AlertCircle, BarChart2, Share2, Check, ArrowRight, Zap, Wand2, ShieldCheck, ShieldAlert, ShieldX, Lock, Eye, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useRef } from "react";
import React from "react";
import { useRoute, useLocation } from "wouter";

/** Returns a Tailwind gradient class based on score 0–100 */
function barColor(score: number): string {
  if (score >= 75) return "from-emerald-400 to-emerald-500";
  if (score >= 50) return "from-amber-400 to-amber-500";
  return "from-rose-400 to-rose-500";
}

/** Returns a text colour class */
function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-rose-400";
}

/** Section divider with label */
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

/** Tooltip wrapper — shows a floating tip above the child on hover/focus */
function Tip({ text, color, children }: { text: string; color: string; children: React.ReactNode }) {
  const [show, setShow] = React.useState(false);
  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-48 rounded-xl px-3 py-2 text-xs text-white leading-snug shadow-xl pointer-events-none"
          style={{ background: "oklch(0.16 0.015 245)", border: `1px solid ${color}`, boxShadow: `0 4px 20px ${color}40` }}
        >
          <div className="font-semibold mb-0.5" style={{ color }}>{text.split(":")[0]}</div>
          <div className="text-white/70">{text.split(":").slice(1).join(":").trim()}</div>
          {/* Arrow */}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
            style={{ borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: `6px solid ${color}` }}
          />
        </div>
      )}
    </div>
  );
}

/** 3-column score row: category label | current box | 30-day box | 90-day box */
function CategoryRow({
  label,
  score,
  sublabel,
  target,
  fix,
  feature,
  tooltip30,
  tooltip90,
}: {
  label: string;
  score: number;
  sublabel?: string;
  target: number;
  fix: string;
  feature: string;
  tooltip30: string;
  tooltip90: string;
}) {
  const pct = Math.min(100, Math.max(0, score));
  const target90 = Math.min(100, Math.round(pct + (target - pct) * 2.2));
  const needsFix = pct < 75;
  return (
    <div className="grid grid-cols-[1fr_68px_68px_68px] gap-2 items-stretch">
      {/* Category name */}
      <div className="min-w-0 flex flex-col justify-center">
        <span className="text-sm font-semibold text-foreground/90 leading-tight block">{label}</span>
        {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
      </div>
      {/* Current score box — fixed 68px */}
      <div
        className="rounded-lg px-2.5 py-2 text-center flex flex-col justify-center items-center"
        style={{
          background: needsFix ? "oklch(0.52 0.22 0 / 0.12)" : "oklch(0.52 0.22 145 / 0.10)",
          border: needsFix ? "1px solid oklch(0.52 0.22 0 / 0.35)" : "1px solid oklch(0.52 0.22 145 / 0.25)",
          minHeight: "60px",
        }}
      >
        <div className="text-[9px] font-bold uppercase tracking-wider mb-0.5 leading-tight" style={{ color: "oklch(0.55 0.012 240)" }}>Current<br/>Score</div>
        <div className="text-xl font-black tabular-nums leading-none" style={{ color: needsFix ? "oklch(0.65 0.22 25)" : "oklch(0.72 0.22 145)" }}>{pct}</div>
        <div className="text-[9px] mt-0.5" style={{ color: "oklch(0.45 0.012 240)" }}>/100</div>
      </div>
      {/* 30-day box — fixed 68px */}
      <Tip text={tooltip30} color="oklch(0.72 0.22 145)">
        <div
          className="rounded-lg px-2.5 py-2 text-center cursor-default transition-all duration-150 hover:scale-105 flex flex-col justify-center items-center"
          style={{
            background: "oklch(0.52 0.22 145 / 0.12)",
            border: "1px solid oklch(0.52 0.22 145 / 0.35)",
            minHeight: "60px",
          }}
        >
          <div className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "oklch(0.55 0.012 240)" }}>30 days</div>
          <div className="text-xl font-black tabular-nums leading-none" style={{ color: "oklch(0.72 0.22 145)" }}>{target}</div>
          <div className="text-[9px] mt-0.5 leading-tight" style={{ color: "oklch(0.45 0.012 240)" }}>{feature}</div>
        </div>
      </Tip>
      {/* 90-day box — fixed 68px */}
      <Tip text={tooltip90} color="oklch(0.72 0.22 200)">
        <div
          className="rounded-lg px-2.5 py-2 text-center cursor-default transition-all duration-150 hover:scale-105 flex flex-col justify-center items-center"
          style={{
            background: "oklch(0.52 0.22 200 / 0.12)",
            border: "1px solid oklch(0.52 0.22 200 / 0.35)",
            minHeight: "60px",
          }}
        >
          <div className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "oklch(0.55 0.012 240)" }}>90 days</div>
          <div className="text-xl font-black tabular-nums leading-none" style={{ color: "oklch(0.72 0.22 200)" }}>{target90}</div>
          <div className="text-[9px] mt-0.5 leading-tight" style={{ color: "oklch(0.45 0.012 240)" }}>{fix.split(" ").slice(0, 3).join(" ")}</div>
        </div>
      </Tip>
    </div>
  );
}

export default function AuditReportPage() {
  const [, params] = useRoute("/audit/report/:token");
  const token = params?.token ?? "";
  const [copied, setCopied] = useState(false);
  const [showAllFindings, setShowAllFindings] = useState(false);
  const [showAllRecs, setShowAllRecs] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [, navigate] = useLocation();

  const { data: report, isLoading, error } = trpc.audit.getReport.useQuery(
    { shareToken: token },
    { enabled: !!token }
  );

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <BarChart2 className="w-6 h-6 text-white" />
          </div>
          <p className="text-muted-foreground text-sm">Analysing your social media presence…</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="font-semibold text-foreground">Report not found</p>
          <p className="text-sm text-muted-foreground mt-1">This link may have expired.</p>
          <Button className="mt-4" onClick={() => navigate("/audit")}>Run New Audit</Button>
        </div>
      </div>
    );
  }

  const raw = report.rawReport as any;
  const overall = report.overallScore ?? 0;
  const passed = overall >= 50;

  // Cybersecurity data
  const cyber = raw?.cyberSecurity;
  const cyberScore = report.cyberSecurityScore ?? cyber?.score ?? null;

  // Social presence score
  const socialPresenceScore: number = (raw?.socialPresenceScore as number | undefined) ?? 0;

  // Content analysis sub-scores
  const contentAnalysis = raw?.contentAnalysis ?? {};
  const brandConsistency: number = contentAnalysis.brandConsistency ?? raw?.brandConsistencyScore ?? raw?.brandScore ?? 0;
  const visualQuality: number = contentAnalysis.visualQuality ?? 0;
  const copyEffectiveness: number = contentAnalysis.copyEffectiveness ?? 0;

  // Ad analysis
  const adAnalysis = raw?.adAnalysis ?? {};

  // Competitive position
  const competitive = raw?.competitivePosition ?? {};

  // Findings & recommendations
  const findings: any[] = raw?.findings ?? [];
  const recommendations: any[] = (raw?.recommendations ?? []).sort((a: any, b: any) => (b.priority ?? 0) - (a.priority ?? 0));

  // Platform scores
  const platformScores = (report.platformScores ?? raw?.platformScores ?? {}) as Record<string, any>;
  const platformEntries = Object.entries(platformScores).filter(([, v]) => v && typeof v === "object");

  // Cybersecurity grade helper
  function cyberGradeColor(score: number) {
    if (score >= 80) return { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: ShieldCheck };
    if (score >= 60) return { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: ShieldAlert };
    return { text: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", icon: ShieldX };
  }

  // One-sentence summary
  const summary: string = raw?.summary
    ? raw.summary.split(". ").slice(0, 2).join(". ") + (raw.summary.split(". ").length > 2 ? "." : "")
    : "Audit complete. See your scores below.";

  // Severity colour helper
  function severityColor(severity: string) {
    if (severity === "critical") return { bg: "bg-rose-500/10", border: "border-rose-500/20", badge: "text-rose-400" };
    if (severity === "warning") return { bg: "bg-amber-500/10", border: "border-amber-500/20", badge: "text-amber-400" };
    return { bg: "bg-blue-500/10", border: "border-blue-500/20", badge: "text-blue-400" };
  }

  const visibleFindings = showAllFindings ? findings : findings.slice(0, 4);
  const visibleRecs = showAllRecs ? recommendations : recommendations.slice(0, 4);

  // All category rows for the combined breakdown
  const categoryRows = [
    {
      label: "Social Media Presence",
      score: socialPresenceScore,
      sublabel: socialPresenceScore > 0 ? `${Object.values(report.platformScores ?? raw?.platformScores ?? {}).filter(Boolean).length || "?"} platforms` : "No platforms detected",
      fix: "Daily posting across all platforms",
      feature: "Auto-Scheduler",
      group: "Social Media",
      tooltip30: "30-Day Plan: Blastly schedules 5 posts/week across all your platforms using AI-generated captions and images — no effort from you.",
      tooltip90: "90-Day Plan: Sustained daily posting builds a consistent brand presence, growing your follower count and platform authority across every channel.",
    },
    {
      label: "Engagement Rate",
      score: report.engagementScore ?? raw?.engagementScore ?? 0,
      sublabel: "Likes, comments & shares",
      fix: "AI captions, hashtags & reply automation",
      feature: "AI Captions",
      group: "Social Media",
      tooltip30: "30-Day Plan: AI writes high-engagement captions with proven hooks and auto-suggests the best hashtags to boost reach and interaction.",
      tooltip90: "90-Day Plan: Reply automation and comment monitoring keeps your audience engaged 24/7, compounding engagement as your audience grows.",
    },
    {
      label: "Audience Growth",
      score: report.growthScore ?? raw?.audienceGrowthScore ?? 0,
      sublabel: "Follower growth trend",
      fix: "Consistent posting grows followers",
      feature: "Auto-Scheduler",
      group: "Social Media",
      tooltip30: "30-Day Plan: Consistent posting at peak times signals the algorithm to push your content to new audiences, growing followers organically.",
      tooltip90: "90-Day Plan: 3 months of consistent content builds algorithmic trust — platforms reward regular posters with exponentially more organic reach.",
    },
    {
      label: "Content Quality",
      score: report.contentScore ?? raw?.contentQualityScore ?? 0,
      sublabel: "Overall content effectiveness",
      fix: "AI posts from a photo or voice note",
      feature: "Content Factory",
      group: "Content",
      tooltip30: "30-Day Plan: Snap a photo or record a 10-second voice note — Blastly's AI turns it into a polished post with caption, hashtags, and image in seconds.",
      tooltip90: "90-Day Plan: A library of high-quality posts builds brand authority. Blastly repurposes top-performing content to maximise every piece you create.",
    },
    {
      label: "Visual Quality",
      score: visualQuality,
      sublabel: "Images, graphics & video",
      fix: "AI-designed graphics & thumbnails",
      feature: "Visual Studio",
      group: "Content",
      tooltip30: "30-Day Plan: Blastly's Visual Studio generates on-brand graphics, thumbnails, and social images automatically — no designer needed.",
      tooltip90: "90-Day Plan: A consistent visual style across all posts builds instant brand recognition. Blastly keeps every image on-brand automatically.",
    },
    {
      label: "Copy Effectiveness",
      score: copyEffectiveness,
      sublabel: "Headlines, captions & CTAs",
      fix: "AI copywriter for every post",
      feature: "AI Captions",
      group: "Content",
      tooltip30: "30-Day Plan: Every post gets AI-written copy with a strong hook, clear message, and a call-to-action that drives clicks and enquiries.",
      tooltip90: "90-Day Plan: Blastly learns what copy works for your audience and continuously refines your messaging to improve conversion over time.",
    },
    {
      label: "Brand Consistency",
      score: brandConsistency,
      sublabel: "Colours, tone & messaging",
      fix: "Brand voice cloner keeps posts on-brand",
      feature: "Brand Voice AI",
      group: "Content",
      tooltip30: "30-Day Plan: Blastly's Brand Voice AI clones your tone of voice and applies it to every post — so everything sounds like you, every time.",
      tooltip90: "90-Day Plan: Consistent brand voice across 3 months builds customer trust. Research shows it takes 7 touchpoints before a customer buys — we make sure every one counts.",
    },
    {
      label: "Ad Performance",
      score: report.adQualityScore ?? raw?.adPerformanceScore ?? 0,
      sublabel: "Ad quality & targeting",
      fix: "Automated ad creation & targeting",
      feature: "Ad Studio",
      group: "Advertising",
      tooltip30: "30-Day Plan: Blastly's Ad Studio creates targeted ad campaigns with AI-written copy and auto-optimised audience targeting to lower your cost per lead.",
      tooltip90: "90-Day Plan: Ongoing ad optimisation reduces wasted spend and improves ROI month-on-month — most businesses see a 3–5x return on ad spend within 90 days.",
    },
    ...(cyberScore !== null ? [{
      label: "Cybersecurity",
      score: cyberScore,
      sublabel: "HTTPS, SSL, privacy policy",
      fix: "Security checklist handled for you",
      feature: "Security Audit",
      group: "Security",
      tooltip30: "30-Day Plan: Blastly runs a full security audit — HTTPS, SSL certificate, privacy policy, and data handling — and flags exactly what needs fixing.",
      tooltip90: "90-Day Plan: A secure, trusted website ranks higher in Google and converts more visitors. We monitor your security posture continuously.",
    }] : []),
  ].filter(r => r.score > 0);

  // Projected numbers based on overall score gap
  const gap = Math.max(0, 80 - overall);
  const extraPosts = Math.max(20, Math.round(gap * 0.6));
  const extraBlogs = Math.max(4, Math.round(gap * 0.2));
  const extraLeads = Math.max(3, Math.round(gap * 0.15));
  const extraReach = Math.max(500, gap * 80);

  // Group the rows
  const groups = ["Social Media", "Content", "Advertising", "Security"] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="bg-card border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black text-foreground">Blastly</span>
        </a>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5 text-xs">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Share"}
          </Button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Social Media Audit</p>
            <button
              type="button"
              onClick={() => navigate(`/onboarding/managed?audit=${token}`)}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, oklch(0.52 0.22 145), oklch(0.46 0.20 200))", boxShadow: "0 2px 10px oklch(0.52 0.22 145 / 0.35)" }}
            >
              Fix my brand — 14-day free trial <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <h1 className="text-2xl font-black text-foreground">{report.businessName}</h1>
          <p className="text-sm text-muted-foreground mt-1">{new Date(report.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>

        {/* Inferred-data disclaimer */}
        {(raw?.dataConfidence === "inferred" || (!raw?.dataConfidence && !report.rawReport)) && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
            <span className="text-amber-400 text-lg flex-shrink-0">⚠</span>
            <div>
              <p className="text-sm font-semibold text-amber-300">Estimated scores — limited data available</p>
              <p className="text-xs text-amber-200/70 mt-0.5 leading-relaxed">
                We couldn't retrieve live content from this website, so these scores are based on our AI's general knowledge of this brand. Results may not reflect the current state of your social media presence.
              </p>
            </div>
          </div>
        )}

        {/* Overall score + pass/fail */}
        <div className={`rounded-2xl border-2 p-6 flex items-center gap-6 ${passed ? "bg-emerald-500/10 border-emerald-500/30" : "bg-rose-500/10 border-rose-500/30"}`}>
          <div className="text-center shrink-0">
            <div className={`text-6xl font-black tabular-nums ${passed ? "text-emerald-400" : "text-rose-400"}`}>{overall}</div>
            <div className="text-xs text-muted-foreground font-medium">/100</div>
          </div>
          <div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold mb-2 ${passed ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
              {passed ? "✓ PASS" : "✗ NEEDS WORK"}
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{summary}</p>
          </div>
        </div>

        {/* ── Combined Category Breakdown + 30-Day Roadmap ─────────────── */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold text-foreground">Score Breakdown</h2>
          </div>

          {/* Column labels — 4-column header matching CategoryRow grid */}
          <div className="grid grid-cols-[1fr_68px_68px_68px] gap-2 px-0.5 items-end">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Category</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider text-center leading-tight">Current<br/>Score</span>
            {/* Premium offer header spanning the two target columns */}
            <div
              className="col-span-2 rounded-lg px-2 py-1 text-center"
              style={{ background: "oklch(0.52 0.22 165 / 0.10)", border: "1px solid oklch(0.52 0.22 165 / 0.30)" }}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "oklch(0.72 0.22 165)" }}>🎯 With Everything Plan</span>
              <div className="grid grid-cols-2 gap-1 mt-0.5">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-center" style={{ color: "oklch(0.72 0.22 145)" }}>30 Days</span>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-center" style={{ color: "oklch(0.72 0.22 200)" }}>90 Days</span>
              </div>
            </div>
          </div>

          {/* Grouped rows — left side is category+current score, right two columns are wrapped in a premium offer border */}
          <div className="relative">
            {/* Premium offer border — wraps the 30/90-day columns for all rows */}
            <div
              className="absolute top-0 bottom-0 right-0 rounded-xl pointer-events-none"
              style={{
                width: "calc(68px + 68px + 8px)",  /* two 68px cols + gap */
                border: "1.5px solid oklch(0.72 0.22 165 / 0.45)",
                background: "oklch(0.52 0.22 165 / 0.04)",
                boxShadow: "0 0 20px oklch(0.52 0.22 165 / 0.08) inset",
              }}
            />
            {/* Label badge on top of the border */}
            <div
              className="absolute -top-3 right-0 flex items-center justify-center"
              style={{ width: "calc(68px + 68px + 8px)" }}
            >
              <span
                className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{
                  background: "oklch(0.52 0.22 165 / 0.18)",
                  border: "1px solid oklch(0.72 0.22 165 / 0.50)",
                  color: "oklch(0.80 0.22 165)",
                }}
              >Everything Plan</span>
            </div>
            <div className="space-y-3 pt-2">
              {groups.map((group) => {
                const rows = categoryRows.filter(r => r.group === group);
                if (rows.length === 0) return null;
                return (
                  <div key={group} className="space-y-3">
                    <SectionLabel label={group} />
                    {rows.map((row) => {
                      const needsFix = row.score < 75;
                      const target = Math.min(100, Math.round(row.score + (needsFix ? 15 : 5)));
                      return (
                        <CategoryRow
                          key={row.label}
                          label={row.label}
                          score={row.score}
                          sublabel={row.sublabel}
                          target={target}
                          fix={row.fix}
                          feature={row.feature}
                          tooltip30={row.tooltip30}
                          tooltip90={row.tooltip90}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Projected gains */}
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-3">With Blastly in 30 days you could have:</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { num: `+${extraPosts}`, label: "Posts" },
                { num: `+${extraBlogs}`, label: "Blogs" },
                { num: `+${extraLeads}/wk`, label: "Leads" },
                { num: `${extraReach.toLocaleString()}+`, label: "Reach" },
              ].map(({ num, label }) => (
                <div key={label} className="rounded-xl py-2.5 text-center bg-muted/50">
                  <div className={`text-lg font-black leading-none`} style={{ color: "oklch(0.72 0.22 145)" }}>{num}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={() => navigate(`/onboarding/managed?audit=${token}`)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(135deg, oklch(0.52 0.22 145), oklch(0.46 0.20 200))", boxShadow: "0 4px 20px oklch(0.52 0.22 145 / 0.35)" }}
          >
            Fix my brand — start 14-day free trial <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-center text-xs text-muted-foreground">Less than $4 a day · No credit card · Cancel any time</p>

          {/* Expandable detail */}
          <button
            type="button"
            onClick={() => setShowDetail(!showDetail)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
          >
            {showDetail ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showDetail ? "Hide detail" : "Why these numbers? See the stats"}
          </button>
          {showDetail && (
            <div className="rounded-lg p-4 space-y-2 bg-muted/30 border border-border text-xs" style={{ color: "oklch(0.55 0.012 240)" }}>
              <p>🔁 Customers need to see your brand <strong className="text-foreground">7 times</strong> before they buy — most businesses only manage 2.</p>
              <p>💰 Consistent branding increases revenue by up to <strong className="text-foreground">23%</strong>. Every $1 in social media returns <strong className="text-foreground">$5.20</strong>.</p>
              <p>📝 16+ blogs/month = <strong className="text-foreground">3.5× more traffic</strong> and <strong className="text-foreground">4.5× more leads</strong>.</p>
              <p>📱 Businesses posting 5× per week get <strong className="text-foreground">3× more website visits</strong> than those posting once.</p>
            </div>
          )}
        </div>

        {/* ── Per-Platform Scores ─────────────────────────────────────────── */}
        {platformEntries.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <h2 className="text-base font-bold text-foreground">Platform Scores</h2>
            {platformEntries.map(([platform, data]) => (
              <div key={platform} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground capitalize">{platform.replace("_", " ")}</span>
                  {data.grade && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      data.grade === "A" ? "bg-emerald-500/20 text-emerald-400" :
                      data.grade === "B" ? "bg-blue-500/20 text-blue-400" :
                      data.grade === "C" ? "bg-amber-500/20 text-amber-400" :
                      "bg-rose-500/20 text-rose-400"
                    }`}>Grade {data.grade}</span>
                  )}
                </div>
                {data.score != null && (
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${barColor(data.score)} transition-all duration-700`} style={{ width: `${data.score}%` }} />
                  </div>
                )}
                {data.profileCompleteness != null && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Profile completeness:</span>
                    <span className={`font-bold ${scoreColor(data.profileCompleteness)}`}>{data.profileCompleteness}/100</span>
                  </div>
                )}
                {(data.strengths?.length > 0 || data.weaknesses?.length > 0) && (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {data.strengths?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-emerald-400 mb-1">✓ Strengths</p>
                        {data.strengths.slice(0, 2).map((s: string, i: number) => (
                          <p key={i} className="text-xs text-foreground/60 leading-snug">• {s}</p>
                        ))}
                      </div>
                    )}
                    {data.weaknesses?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-rose-400 mb-1">✗ Weaknesses</p>
                        {data.weaknesses.slice(0, 2).map((w: string, i: number) => (
                          <p key={i} className="text-xs text-foreground/60 leading-snug">• {w}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Competitive Position ────────────────────────────────────────── */}
        {(competitive.industryBenchmark || competitive.differentiators?.length > 0 || competitive.gaps?.length > 0) && (
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <h2 className="text-base font-bold text-foreground">Competitive Position</h2>
            {competitive.industryBenchmark && (
              <div className="flex items-center gap-3">
                {competitive.industryBenchmark.toLowerCase().includes("above") ? (
                  <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : competitive.industryBenchmark.toLowerCase().includes("below") ? (
                  <TrendingDown className="w-5 h-5 text-rose-400 shrink-0" />
                ) : (
                  <Minus className="w-5 h-5 text-amber-400 shrink-0" />
                )}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Industry Benchmark</p>
                  <p className="text-sm font-semibold text-foreground capitalize">{competitive.industryBenchmark}</p>
                </div>
                {competitive.estimatedMarketShare && (
                  <div className="ml-auto text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Market Position</p>
                    <p className="text-sm font-semibold text-foreground">{competitive.estimatedMarketShare}</p>
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {competitive.differentiators?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Your Advantages</p>
                  {competitive.differentiators.map((d: string, i: number) => (
                    <p key={i} className="text-xs text-foreground/70 leading-snug mb-1">✓ {d}</p>
                  ))}
                </div>
              )}
              {competitive.gaps?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">Gaps to Close</p>
                  {competitive.gaps.map((g: string, i: number) => (
                    <p key={i} className="text-xs text-foreground/70 leading-snug mb-1">✗ {g}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Key Findings ────────────────────────────────────────────────── */}
        {findings.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-6 space-y-3">
            <h2 className="text-base font-bold text-foreground">Key Findings</h2>
            {visibleFindings.map((f: any, i: number) => {
              const col = severityColor(f.severity);
              return (
                <div key={i} className={`rounded-lg p-3 border ${col.bg} ${col.border}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold uppercase ${col.badge}`}>{f.severity}</span>
                    {f.category && <span className="text-xs text-muted-foreground">· {f.category}</span>}
                    {f.impact && <span className="text-xs text-muted-foreground ml-auto">Impact: {f.impact}</span>}
                  </div>
                  <p className="text-sm font-semibold text-foreground">{f.title}</p>
                  <p className="text-xs text-foreground/60 mt-0.5 leading-relaxed">{f.detail}</p>
                </div>
              );
            })}
            {findings.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllFindings(!showAllFindings)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
              >
                {showAllFindings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showAllFindings ? "Show less" : `Show ${findings.length - 4} more findings`}
              </button>
            )}
          </div>
        )}

        {/* ── Recommendations ─────────────────────────────────────────────── */}
        {recommendations.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-6 space-y-3">
            <h2 className="text-base font-bold text-foreground">Recommendations</h2>
            {visibleRecs.map((r: any, i: number) => (
              <div key={i} className="rounded-lg p-4 border border-border bg-background/40 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{r.title}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.estimatedImpact && (
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">{r.estimatedImpact}</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-foreground/60 leading-relaxed">{r.detail}</p>
                <div className="flex items-center gap-3 pt-1">
                  {r.timeToImplement && (
                    <span className="text-xs text-muted-foreground">⏱ {r.timeToImplement}</span>
                  )}
                  {r.blastlyFeature && (
                    <span className="text-xs text-violet-400 font-medium">✦ {r.blastlyFeature}</span>
                  )}
                </div>
              </div>
            ))}
            {recommendations.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllRecs(!showAllRecs)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
              >
                {showAllRecs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showAllRecs ? "Show less" : `Show ${recommendations.length - 4} more recommendations`}
              </button>
            )}
          </div>
        )}

        {/* ── Ad Analysis ─────────────────────────────────────────────────── */}
        {adAnalysis && (adAnalysis.estimatedCPM || adAnalysis.qualityRating) && (
          <div className="bg-card rounded-2xl border border-border p-6 space-y-3">
            <h2 className="text-base font-bold text-foreground">Ad Performance Analysis</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {adAnalysis.estimatedCPM && (
                <div className="bg-background/40 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Est. CPM</p>
                  <p className="text-sm font-bold text-foreground">{adAnalysis.estimatedCPM}</p>
                </div>
              )}
              {adAnalysis.estimatedCPC && (
                <div className="bg-background/40 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Est. CPC</p>
                  <p className="text-sm font-bold text-foreground">{adAnalysis.estimatedCPC}</p>
                </div>
              )}
              {adAnalysis.estimatedCPA && (
                <div className="bg-background/40 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Est. CPA</p>
                  <p className="text-sm font-bold text-foreground">{adAnalysis.estimatedCPA}</p>
                </div>
              )}
              {adAnalysis.qualityRating && (
                <div className="bg-background/40 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Quality</p>
                  <p className={`text-sm font-bold ${
                    adAnalysis.qualityRating === "Excellent" ? "text-emerald-400" :
                    adAnalysis.qualityRating === "Good" ? "text-blue-400" :
                    adAnalysis.qualityRating === "Fair" ? "text-amber-400" : "text-rose-400"
                  }`}>{adAnalysis.qualityRating}</p>
                </div>
              )}
              {adAnalysis.audienceTargeting && (
                <div className="bg-background/40 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Targeting</p>
                  <p className={`text-sm font-bold ${
                    adAnalysis.audienceTargeting === "Excellent" ? "text-emerald-400" :
                    adAnalysis.audienceTargeting === "Good" ? "text-blue-400" :
                    adAnalysis.audienceTargeting === "Fair" ? "text-amber-400" : "text-rose-400"
                  }`}>{adAnalysis.audienceTargeting}</p>
                </div>
              )}
              {adAnalysis.adSpendEfficiency && (
                <div className="bg-background/40 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Ad Efficiency</p>
                  <p className="text-sm font-bold text-foreground">{adAnalysis.adSpendEfficiency}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instant Ad Demo CTA */}
        <div className="bg-gradient-to-br from-violet-700 via-purple-700 to-pink-700 rounded-2xl p-7 text-white text-center shadow-xl">
          <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full text-xs font-medium mb-4">
            <Zap className="w-3.5 h-3.5 text-yellow-300" />
            No typing. No forms. Just watch.
          </div>
          <h3 className="text-2xl font-black mb-2 leading-tight">
            Watch us build your first ad campaign — right now
          </h3>
          <p className="text-white/80 text-sm mb-5 max-w-sm mx-auto leading-relaxed">
            We already know your business from this audit. One click and we'll generate a complete Facebook, Instagram, LinkedIn &amp; Twitter campaign — in under 15 seconds.
          </p>
          <Button
            size="lg"
            className="bg-white text-violet-700 hover:bg-gray-100 font-black px-8 text-base h-12 gap-2"
            onClick={() => navigate(`/ad-demo/${token}`)}
          >
            <Wand2 className="w-4 h-4" />
            Watch Us Build Your Ad
            <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-xs text-white/50 mt-3">Free · No account needed · Takes 15 seconds</p>
        </div>

        {/* Cybersecurity Score Section — detailed breakdown */}
        {cyberScore !== null && cyber && (() => {
          const grade = cyberGradeColor(cyberScore);
          const GradeIcon = grade.icon;
          return (
            <div className={`rounded-2xl border-2 p-6 space-y-5 ${grade.bg} ${grade.border}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GradeIcon className={`w-6 h-6 ${grade.text}`} />
                  <h2 className="text-base font-bold text-foreground">Cybersecurity Rating</h2>
                </div>
                <div className="text-right">
                  <span className={`text-3xl font-black tabular-nums ${grade.text}`}>{cyberScore}</span>
                  <span className="text-muted-foreground text-sm">/100</span>
                </div>
              </div>

              {cyber.summary && (
                <p className="text-sm text-foreground/70 leading-relaxed">{cyber.summary}</p>
              )}

              {/* Security checklist */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "HTTPS Enabled", value: cyber.httpsEnabled },
                  { label: "SSL Certificate", value: cyber.sslValid },
                  { label: "Privacy Policy", value: cyber.privacyPolicyPresent },
                  { label: "Cookie Consent", value: cyber.cookieConsentPresent },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 bg-background/40 rounded-lg px-3 py-2">
                    {item.value
                      ? <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      : <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
                    <span className="text-xs text-foreground/70">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Risk indicators */}
              <div className="flex flex-wrap gap-3 text-xs">
                {cyber.dataExposureRisk && (
                  <div className="flex items-center gap-1.5 bg-background/40 rounded-full px-3 py-1">
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-foreground/60">Data Risk:</span>
                    <span className={`font-semibold ${
                      cyber.dataExposureRisk === "Low" ? "text-emerald-400" :
                      cyber.dataExposureRisk === "Medium" ? "text-amber-400" : "text-rose-400"
                    }`}>{cyber.dataExposureRisk}</span>
                  </div>
                )}
                {cyber.socialAccountsSecured && (
                  <div className="flex items-center gap-1.5 bg-background/40 rounded-full px-3 py-1">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-foreground/60">Social Security:</span>
                    <span className={`font-semibold ${
                      cyber.socialAccountsSecured === "Good" ? "text-emerald-400" :
                      cyber.socialAccountsSecured === "Fair" ? "text-amber-400" : "text-rose-400"
                    }`}>{cyber.socialAccountsSecured}</span>
                  </div>
                )}
              </div>

              {/* Cyber findings */}
              {cyber.findings?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">Security Findings</p>
                  {cyber.findings.slice(0, 4).map((f: any, i: number) => (
                    <div key={i} className={`rounded-lg p-3 border ${
                      f.severity === "critical" ? "bg-rose-500/10 border-rose-500/20" :
                      f.severity === "warning" ? "bg-amber-500/10 border-amber-500/20" :
                      "bg-blue-500/10 border-blue-500/20"
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold uppercase ${
                          f.severity === "critical" ? "text-rose-400" :
                          f.severity === "warning" ? "text-amber-400" : "text-blue-400"
                        }`}>{f.severity}</span>
                        <span className="text-sm font-semibold text-foreground">{f.title}</span>
                      </div>
                      <p className="text-xs text-foreground/60">{f.detail}</p>
                      {f.fix && <p className="text-xs text-emerald-400 mt-1">✓ Fix: {f.fix}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Run another */}
        <div className="text-center">
          <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={() => navigate("/audit")}>
            ← Run another audit
          </Button>
        </div>

      </div>
    </div>
  );
}
