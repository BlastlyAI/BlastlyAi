import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ConfidencePanel } from "@/components/ConfidencePanel";
import type { ScanConfidence } from "@/components/ConfidencePanel";
import {
  Target, Globe, TrendingUp, TrendingDown, Zap, ChevronDown, ChevronUp,
  CheckCircle, AlertTriangle, XCircle, ArrowRight, Clock, BarChart3,
  Lightbulb, Rocket, Star, Users, Search, ShoppingBag, Megaphone,
  FileText, Code, Share2, Award, Activity
} from "lucide-react";

// ─── Grade colour helper ──────────────────────────────────────────────────────
function gradeColor(grade: string): string {
  if (grade?.startsWith("A")) return "text-emerald-400";
  if (grade?.startsWith("B")) return "text-blue-400";
  if (grade?.startsWith("C")) return "text-amber-400";
  return "text-red-400";
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-blue-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-blue-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function priorityBadge(priority: string) {
  const map: Record<string, string> = {
    critical: "bg-red-500/15 text-red-400 border-red-500/30",
    high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  };
  return map[priority] ?? map.low;
}

function categoryIcon(category: string) {
  const map: Record<string, React.ElementType> = {
    product: ShoppingBag,
    service: Star,
    marketing: Megaphone,
    content: FileText,
    social: Share2,
    seo: Search,
    tech: Code,
  };
  return map[category] ?? Lightbulb;
}

function difficultyBadge(difficulty: string) {
  const map: Record<string, string> = {
    easy: "bg-emerald-500/15 text-emerald-400",
    medium: "bg-amber-500/15 text-amber-400",
    hard: "bg-red-500/15 text-red-400",
  };
  return map[difficulty] ?? map.medium;
}

// ─── Loading progress steps ───────────────────────────────────────────────────
const SCAN_STEPS = [
  "Analysing your website...",
  "Identifying your industry...",
  "Discovering 5 nearest competitors...",
  "Scanning competitor websites...",
  "Analysing competitor social media...",
  "Comparing digital presence...",
  "Generating improvement opportunities...",
  "Building your intelligence report...",
];

function ScanProgress() {
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => (s < SCAN_STEPS.length - 1 ? s + 1 : s));
    }, 3500);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
        <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Target className="w-8 h-8 text-violet-400" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-foreground">Scanning Competitors</p>
        <p className="text-sm text-muted-foreground animate-pulse">{SCAN_STEPS[step]}</p>
      </div>
      <div className="w-80 space-y-2">
        {SCAN_STEPS.map((s, i) => (
          <div key={s} className={`flex items-center gap-2 text-xs transition-all duration-500 ${i <= step ? "opacity-100" : "opacity-25"}`}>
            {i < step ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            ) : i === step ? (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-violet-400 border-t-transparent animate-spin flex-shrink-0" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 flex-shrink-0" />
            )}
            <span className={i <= step ? "text-foreground" : "text-muted-foreground"}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Competitor card ──────────────────────────────────────────────────────────
function CompetitorCard({ competitor, rank }: {
  competitor: {
    rank: number; name: string; websiteUrl: string; industry: string; description: string;
    websiteSeoScore: number; socialPresenceScore: number; overallScore: number; grade: string;
    socialProfiles: { platform: string; found: boolean; url: string | null; followers: number | null; score: number }[];
    services: string[]; contentStrategy: string; uniqueStrengths: string[];
    weaknesses: string[]; estimatedMonthlyTraffic: string; techStack: string[];
  };
  rank: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const rankColors = ["border-amber-500/40 bg-amber-500/5", "border-slate-400/40 bg-slate-400/5", "border-orange-700/40 bg-orange-700/5", "border-border", "border-border"];

  return (
    <div className={`rounded-xl border ${rankColors[rank - 1] ?? "border-border"} bg-card overflow-hidden transition-all duration-200`}>
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${rank === 1 ? "bg-amber-500/20 text-amber-400" : rank === 2 ? "bg-slate-400/20 text-slate-300" : rank === 3 ? "bg-orange-700/20 text-orange-400" : "bg-muted text-muted-foreground"}`}>
              #{rank}
            </div>
            <div>
              <div className="font-semibold text-foreground">{competitor.name}</div>
              <a href={competitor.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-400 hover:underline truncate max-w-[200px] block">
                {competitor.websiteUrl.replace(/^https?:\/\//, "")}
              </a>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className={`text-2xl font-bold ${scoreColor(competitor.overallScore)}`}>{competitor.overallScore}</div>
            <div className={`text-xs font-semibold ${gradeColor(competitor.grade)}`}>{competitor.grade}</div>
          </div>
        </div>

        {/* Score bars */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-24 flex-shrink-0">Website SEO</span>
            <div className="flex-1 bg-muted rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${scoreBg(competitor.websiteSeoScore)}`} style={{ width: `${competitor.websiteSeoScore}%` }} />
            </div>
            <span className={`w-8 text-right font-medium ${scoreColor(competitor.websiteSeoScore)}`}>{competitor.websiteSeoScore}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-24 flex-shrink-0">Social Media</span>
            <div className="flex-1 bg-muted rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${scoreBg(competitor.socialPresenceScore)}`} style={{ width: `${competitor.socialPresenceScore}%` }} />
            </div>
            <span className={`w-8 text-right font-medium ${scoreColor(competitor.socialPresenceScore)}`}>{competitor.socialPresenceScore}</span>
          </div>
        </div>

        {/* Social platforms found */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(competitor.socialProfiles || []).slice(0, 6).map(p => (
            <span key={p.platform} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.found ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
              {p.found ? "✓" : "✗"} {p.platform}
            </span>
          ))}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Show less" : "Full analysis"}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">
          <p className="text-sm text-muted-foreground">{competitor.description}</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-emerald-400" /> Strengths
              </div>
              <ul className="space-y-1">
                {(competitor.uniqueStrengths || []).map(s => (
                  <li key={s} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />{s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Weaknesses
              </div>
              <ul className="space-y-1">
                {(competitor.weaknesses || []).map(w => (
                  <li key={w} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <XCircle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />{w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {competitor.services?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-foreground mb-2">Services Offered</div>
              <div className="flex flex-wrap gap-1.5">
                {competitor.services.map(s => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{s}</span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2 rounded-lg bg-muted/40">
              <div className="text-muted-foreground">Est. Monthly Traffic</div>
              <div className="font-semibold text-foreground">{competitor.estimatedMonthlyTraffic || "Unknown"}</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/40">
              <div className="text-muted-foreground">Content Strategy</div>
              <div className="font-semibold text-foreground truncate">{competitor.contentStrategy || "Unknown"}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Improvement opportunity card ─────────────────────────────────────────────
function OpportunityCard({ opp, index }: {
  opp: {
    category: string; priority: string; title: string; description: string;
    competitorsDoing: string[]; estimatedImpact: string; timeToImplement: string;
    difficulty: string; canDoInBlastly: boolean; blastlyFeature: string | null;
    actionSteps: string[];
  };
  index: number;
}) {
  const [expanded, setExpanded] = useState(index < 2);
  const Icon = categoryIcon(opp.category);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4.5 h-4.5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priorityBadge(opp.priority)}`}>
                {opp.priority.toUpperCase()}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                {opp.category}
              </span>
              {opp.canDoInBlastly && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/30 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> Blastly
                </span>
              )}
            </div>
            <h3 className="font-semibold text-foreground text-sm">{opp.title}</h3>
          </div>
        </div>

        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{opp.description}</p>

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-center">
            <div className="text-muted-foreground">Impact</div>
            <div className="font-semibold text-emerald-400 truncate">{opp.estimatedImpact}</div>
          </div>
          <div className="p-2 rounded-lg bg-blue-500/10 text-center">
            <div className="text-muted-foreground">Timeline</div>
            <div className="font-semibold text-blue-400">{opp.timeToImplement}</div>
          </div>
          <div className={`p-2 rounded-lg text-center ${difficultyBadge(opp.difficulty)}`}>
            <div className="text-muted-foreground">Difficulty</div>
            <div className="font-semibold capitalize">{opp.difficulty}</div>
          </div>
        </div>

        {opp.competitorsDoing?.length > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Competitors doing this: </span>
            {opp.competitorsDoing.join(", ")}
          </div>
        )}

        {opp.canDoInBlastly && opp.blastlyFeature && (
          <div className="mt-3 p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs">
            <span className="font-semibold text-violet-300">Blastly can help: </span>
            <span className="text-violet-200">{opp.blastlyFeature}</span>
          </div>
        )}

        {opp.actionSteps?.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? "Hide steps" : `${opp.actionSteps.length} action steps`}
          </button>
        )}
      </div>

      {expanded && opp.actionSteps?.length > 0 && (
        <div className="border-t border-border px-5 pb-4 pt-3">
          <div className="text-xs font-semibold text-foreground mb-2">Action Steps</div>
          <ol className="space-y-1.5">
            {opp.actionSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="w-4 h-4 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ─── Industry Benchmark chart ─────────────────────────────────────────────────
function BenchmarkTable({ benchmarks, userScore }: {
  benchmarks: { metric: string; yourScore: number; industryAverage: number; topCompetitorScore: number; gap: number }[];
  userScore: number;
}) {
  return (
    <div className="space-y-3">
      {benchmarks.map(b => (
        <div key={b.metric} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">{b.metric}</span>
            <div className="flex items-center gap-3">
              <span className={`font-semibold ${scoreColor(b.yourScore)}`}>You: {b.yourScore}</span>
              <span className="text-muted-foreground">Avg: {b.industryAverage}</span>
              <span className="text-amber-400">Top: {b.topCompetitorScore}</span>
              {b.gap > 0 ? (
                <span className="text-red-400 flex items-center gap-0.5"><TrendingDown className="w-3 h-3" />-{b.gap}</span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />+{Math.abs(b.gap)}</span>
              )}
            </div>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            {/* Industry average marker */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/50 z-10" style={{ left: `${b.industryAverage}%` }} />
            {/* Top competitor */}
            <div className="absolute top-0 h-full bg-amber-500/30 rounded-full" style={{ width: `${b.topCompetitorScore}%` }} />
            {/* Your score */}
            <div className={`absolute top-0 h-full rounded-full ${scoreBg(b.yourScore)}`} style={{ width: `${b.yourScore}%` }} />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
        <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-violet-500" /> You</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-amber-500/50" /> Top Competitor</div>
        <div className="flex items-center gap-1.5"><div className="w-0.5 h-3 bg-muted-foreground/50" /> Industry Avg</div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CompetitorIntelligence() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<{
    brandName: string;
    industry: string;
    businessDescription: string;
    userDigitalScore: number;
    overallGapScore: number;
    competitors: {
      rank: number; name: string; websiteUrl: string; industry: string; description: string;
      websiteSeoScore: number; socialPresenceScore: number; overallScore: number; grade: string;
      socialProfiles: { platform: string; found: boolean; url: string | null; followers: number | null; score: number }[];
      services: string[]; contentStrategy: string; uniqueStrengths: string[];
      weaknesses: string[]; estimatedMonthlyTraffic: string; techStack: string[];
    }[];
    improvementOpportunities: {
      category: string; priority: string; title: string; description: string;
      competitorsDoing: string[]; estimatedImpact: string; timeToImplement: string;
      difficulty: string; canDoInBlastly: boolean; blastlyFeature: string | null;
      actionSteps: string[];
    }[];
    quickWins: {
      action: string; description: string; timeframe: string; impact: string; canDoInBlastly: boolean;
    }[];
    industryBenchmark: {
      metric: string; yourScore: number; industryAverage: number; topCompetitorScore: number; gap: number;
    }[];
    scanConfidence?: ScanConfidence;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "competitors" | "opportunities" | "quickwins" | "benchmark">("overview");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showUpgrade, setShowUpgrade] = useState(false);

  const scanMutation = trpc.competitorIntel.scanCompetitors.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setActiveTab("overview");
      toast.success("Competitor intelligence report ready!");
    },
    onError: (err) => {
      if (err.message === "FREE_LIMIT_REACHED") {
        setShowUpgrade(true);
      } else {
        toast.error(err.message || "Scan failed. Please try again.");
      }
    },
  });

  const { data: history } = trpc.competitorIntel.getScans.useQuery();

  const handleScan = () => {
    if (!url.trim()) { toast.error("Please enter your website URL"); return; }
    let u = url.trim();
    if (!u.startsWith("http")) u = "https://" + u;
    try { new URL(u); } catch { toast.error("Please enter a valid URL"); return; }
    setResult(null);
    scanMutation.mutate({ websiteUrl: u });
  };

  const filteredOpportunities = result?.improvementOpportunities?.filter(
    o => priorityFilter === "all" || o.priority === priorityFilter
  ) ?? [];

  const criticalCount = result?.improvementOpportunities?.filter(o => o.priority === "critical").length ?? 0;
  const highCount = result?.improvementOpportunities?.filter(o => o.priority === "high").length ?? 0;
  const blastlyCount = result?.improvementOpportunities?.filter(o => o.canDoInBlastly).length ?? 0;

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "competitors", label: `Competitors (${result?.competitors?.length ?? 0})`, icon: Target },
    { id: "opportunities", label: `Opportunities (${result?.improvementOpportunities?.length ?? 0})`, icon: Lightbulb },
    { id: "quickwins", label: `Quick Wins (${result?.quickWins?.length ?? 0})`, icon: Rocket },
    { id: "benchmark", label: "Benchmark", icon: Activity },
  ] as const;

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Upgrade prompt when free limit is reached */}
        {showUpgrade && (
          <UpgradePrompt feature="Competitor Intelligence" />
        )}
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-5 h-5 text-violet-400" />
            <h1 className="text-xl font-bold text-foreground">Competitor Intelligence</h1>
            <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/30 text-xs">New</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter your website URL — Blastly auto-discovers your 5 nearest competitors, scans their full digital presence, and shows you exactly what to do to get ahead.
          </p>
        </div>

        {/* URL Input */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleScan()}
              placeholder="https://yourwebsite.com"
              className="pl-9 h-11"
              disabled={scanMutation.isPending}
            />
          </div>
          <Button
            onClick={handleScan}
            disabled={scanMutation.isPending}
            className="btn-gradient text-white border-0 h-11 px-6 font-semibold"
          >
            {scanMutation.isPending ? "Scanning..." : "Scan Competitors"}
            <Target className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Loading state */}
        {scanMutation.isPending && <ScanProgress />}

        {/* Results */}
        {result && !scanMutation.isPending && (
          <div className="space-y-6">
            {/* Hero scorecard */}
            <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-2">
                  <div className="text-xs text-muted-foreground mb-1">Analysed Business</div>
                  <h2 className="text-xl font-bold text-foreground">{result.brandName}</h2>
                  <div className="text-sm text-violet-400 mb-2">{result.industry}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.businessDescription}</p>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">Your Digital Score</div>
                  <div className={`text-5xl font-bold ${scoreColor(result.userDigitalScore)}`}>{result.userDigitalScore}</div>
                  <div className="text-xs text-muted-foreground mt-1">out of 100</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">Gap to Leader</div>
                  <div className="text-5xl font-bold text-red-400">{result.overallGapScore}</div>
                  <div className="text-xs text-muted-foreground mt-1">points behind</div>
                </div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                  <div className="text-2xl font-bold text-red-400">{criticalCount}</div>
                  <div className="text-xs text-muted-foreground">Critical Gaps</div>
                </div>
                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
                  <div className="text-2xl font-bold text-orange-400">{highCount}</div>
                  <div className="text-xs text-muted-foreground">High Priority</div>
                </div>
                <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-center">
                  <div className="text-2xl font-bold text-violet-400">{blastlyCount}</div>
                  <div className="text-xs text-muted-foreground">Fixable with Blastly</div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border overflow-x-auto">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? "border-violet-500 text-violet-400"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab: Overview */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Competitor Landscape at a Glance</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {result.competitors.map(comp => (
                    <div key={comp.rank} className="p-4 rounded-xl border border-border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-sm text-foreground">{comp.name}</div>
                        <div className={`text-lg font-bold ${scoreColor(comp.overallScore)}`}>{comp.overallScore}</div>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2 truncate">{comp.websiteUrl.replace(/^https?:\/\//, "")}</div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">SEO</span>
                          <span className={scoreColor(comp.websiteSeoScore)}>{comp.websiteSeoScore}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Social</span>
                          <span className={scoreColor(comp.socialPresenceScore)}>{comp.socialPresenceScore}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab("competitors")}
                        className="mt-2 text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                      >
                        Full analysis <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Top 3 quick wins preview */}
                {result.quickWins?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Rocket className="w-4 h-4 text-emerald-400" /> Top Quick Wins This Week
                    </h3>
                    <div className="space-y-2">
                      {result.quickWins.slice(0, 3).map((win, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                          <div>
                            <div className="text-sm font-semibold text-foreground">{win.action}</div>
                            <div className="text-xs text-muted-foreground">{win.description}</div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-emerald-400 flex items-center gap-1"><Clock className="w-3 h-3" />{win.timeframe}</span>
                              <span className="text-xs text-blue-400">{win.impact}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confidence Score Panel */}
                {result.scanConfidence && (
                  <ConfidencePanel confidence={result.scanConfidence} />
                )}
              </div>
            )}

            {/* Tab: Competitors */}
            {activeTab === "competitors" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Your 5 nearest competitors, ranked by digital presence strength.</p>
                <div className="space-y-4">
                  {result.competitors.map(comp => (
                    <CompetitorCard key={comp.rank} competitor={comp} rank={comp.rank} />
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Opportunities */}
            {activeTab === "opportunities" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <p className="text-sm text-muted-foreground">
                    {result.improvementOpportunities?.length} business improvement opportunities identified — specific add-ons, services, and strategies your competitors are doing that you're not.
                  </p>
                  <div className="flex gap-2">
                    {["all", "critical", "high", "medium", "low"].map(p => (
                      <button
                        key={p}
                        onClick={() => setPriorityFilter(p)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${
                          priorityFilter === p
                            ? "bg-violet-500/20 text-violet-400 border-violet-500/40"
                            : "border-border text-muted-foreground hover:border-violet-500/40"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  {filteredOpportunities.map((opp, i) => (
                    <OpportunityCard key={i} opp={opp} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Quick Wins */}
            {activeTab === "quickwins" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  These are the fastest, highest-impact actions you can take right now to close the gap on your competitors.
                </p>
                <div className="space-y-3">
                  {result.quickWins?.map((win, i) => (
                    <div key={i} className="p-5 rounded-xl border border-border bg-card">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold flex-shrink-0">{i + 1}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-foreground">{win.action}</h3>
                            {win.canDoInBlastly && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/30 flex items-center gap-1">
                                <Zap className="w-2.5 h-2.5" /> Blastly
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{win.description}</p>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="flex items-center gap-1 text-amber-400"><Clock className="w-3 h-3" />{win.timeframe}</span>
                            <span className="flex items-center gap-1 text-emerald-400"><TrendingUp className="w-3 h-3" />{win.impact}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Benchmark */}
            {activeTab === "benchmark" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  How you compare against your industry average and the top competitor across key digital marketing metrics.
                </p>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="w-4 h-4 text-violet-400" />
                      Industry Benchmark
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BenchmarkTable benchmarks={result.industryBenchmark ?? []} userScore={result.userDigitalScore} />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Scan history */}
        {!result && !scanMutation.isPending && history && history.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" /> Recent Scans
            </h3>
            <div className="space-y-2">
              {history.map(scan => (
                <div key={scan.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card text-sm">
                  <div>
                    <div className="font-medium text-foreground">{scan.brandName || scan.websiteUrl}</div>
                    <div className="text-xs text-muted-foreground">{scan.industry} · {new Date(scan.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-lg font-bold ${scoreColor(scan.userDigitalScore)}`}>{scan.userDigitalScore}</div>
                    <div className="text-xs text-red-400">-{scan.overallGapScore} gap</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !scanMutation.isPending && (!history || history.length === 0) && (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto">
              <Target className="w-8 h-8 text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Discover Your Competitive Edge</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Enter your website URL above. Blastly will automatically find your 5 nearest competitors, scan their entire digital presence, and show you exactly what business improvements to make to get one step ahead.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left">
              {[
                { icon: Globe, title: "Auto-Discovery", desc: "AI finds your real competitors — no manual entry" },
                { icon: BarChart3, title: "Full Scan", desc: "Website SEO + all social platforms for each competitor" },
                { icon: Lightbulb, title: "Business Improvements", desc: "Specific add-ons and strategies to get ahead" },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="p-3 rounded-xl border border-border bg-card">
                  <Icon className="w-5 h-5 text-violet-400 mb-2" />
                  <div className="text-sm font-semibold text-foreground">{title}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
