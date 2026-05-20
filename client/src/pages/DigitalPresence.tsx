import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ConfidencePanel } from "@/components/ConfidencePanel";
import { ShareScoreButton } from "@/components/ShareScoreButton";
import type { ScanConfidence } from "@/components/ConfidencePanel";
import {
  Globe, Search, Zap, TrendingUp, AlertTriangle, CheckCircle,
  Clock, ChevronRight, BarChart2, RefreshCw, Users, MessageSquare,
  Eye, Swords, Star, Target, Lightbulb, Activity, Bot, Calendar,
  ArrowUp, ArrowDown, Minus, Shield,
} from "lucide-react";

// ─── Platform config ──────────────────────────────────────────────────────────
const PLATFORM_CONFIG: Record<string, { label: string; color: string; bg: string; textColor: string }> = {
  facebook:  { label: "Facebook",    color: "#1877F2", bg: "bg-blue-500/10",   textColor: "text-blue-400" },
  instagram: { label: "Instagram",   color: "#E1306C", bg: "bg-pink-500/10",   textColor: "text-pink-400" },
  tiktok:    { label: "TikTok",      color: "#69C9D0", bg: "bg-cyan-500/10",   textColor: "text-cyan-400" },
  youtube:   { label: "YouTube",     color: "#FF0000", bg: "bg-red-500/10",    textColor: "text-red-400" },
  linkedin:  { label: "LinkedIn",    color: "#0A66C2", bg: "bg-sky-500/10",    textColor: "text-sky-400" },
  twitter:   { label: "X (Twitter)", color: "#FFFFFF", bg: "bg-white/10",      textColor: "text-gray-300" },
  pinterest: { label: "Pinterest",   color: "#E60023", bg: "bg-rose-500/10",   textColor: "text-rose-400" },
  snapchat:  { label: "Snapchat",    color: "#FFFC00", bg: "bg-yellow-500/10", textColor: "text-yellow-400" },
  threads:   { label: "Threads",     color: "#FFFFFF", bg: "bg-white/10",      textColor: "text-gray-300" },
};

function getPlatformConfig(platform: string) {
  return PLATFORM_CONFIG[platform.toLowerCase()] ?? { label: platform, color: "#8B5CF6", bg: "bg-violet-500/10", textColor: "text-violet-400" };
}

// ─── Score ring component ─────────────────────────────────────────────────────
function ScoreRing({ score, size = 80, grade }: { score: number; size?: number; grade?: string }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div className="absolute text-center">
        <div className="font-bold leading-none" style={{ fontSize: size * 0.22, color }}>{score}</div>
        {grade && <div className="font-bold leading-none mt-0.5" style={{ fontSize: size * 0.14, color }}>{grade}</div>}
      </div>
    </div>
  );
}

// ─── Grade badge ──────────────────────────────────────────────────────────────
function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    "A+": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    "A":  "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    "B+": "bg-green-500/20 text-green-400 border-green-500/30",
    "B":  "bg-green-500/20 text-green-400 border-green-500/30",
    "C+": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    "C":  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    "D":  "bg-orange-500/20 text-orange-400 border-orange-500/30",
    "F":  "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${colors[grade] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}>
      {grade}
    </span>
  );
}

// ─── Priority badge ───────────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  const map = {
    high:   "bg-red-500/15 text-red-400 border-red-500/25",
    medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    low:    "bg-blue-500/15 text-blue-400 border-blue-500/25",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${map[priority]}`}>
      {priority}
    </span>
  );
}

// ─── Loading steps ────────────────────────────────────────────────────────────
const SCAN_STEPS = [
  "Fetching website...",
  "Discovering social profiles...",
  "Scanning Facebook & Instagram...",
  "Scanning TikTok & YouTube...",
  "Scanning LinkedIn & X...",
  "Running AI analysis...",
  "Generating action plan...",
];

function ScanProgress({ step }: { step: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        <span className="text-sm text-violet-300">{SCAN_STEPS[Math.min(step, SCAN_STEPS.length - 1)]}</span>
      </div>
      <Progress value={((step + 1) / SCAN_STEPS.length) * 100} className="h-1.5" />
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type PlatformScore = {
  platform: string;
  found: boolean;
  url: string | null;
  handle: string | null;
  followers: number | null;
  bio: string | null;
  lastPostDate: string | null;
  daysSinceLastPost: number | null;
  postingFrequency: string | null;
  score: number;
  grade: string;
  isActive: boolean;
  isDormant: boolean;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
};

type ScanResult = {
  websiteUrl: string;
  brandName: string;
  brandIndustry: string;
  overallScore: number;
  overallGrade: string;
  overallSummary: string;
  websiteSeoScore: number;
  discoveredProfiles: { platform: string; url: string; handle: string; found: boolean }[];
  platformScores: PlatformScore[];
  platformGapAnalysis: {
    missingPlatforms: { platform: string; estimatedReachLoss: string; competitorUsage: string; priority: string; reason: string }[];
    gapScore: number;
    summary: string;
  };
  contentConsistency: {
    score: number;
    brandNameConsistent: boolean;
    bioConsistent: boolean;
    messagingConsistent: boolean;
    issues: string[];
    summary: string;
  };
  postingCadence: {
    overallHealth: string;
    dormantAccounts: string[];
    activeAccounts: string[];
    summary: string;
    recommendation: string;
  };
  aiVisibilityScore: {
    score: number;
    grade: string;
    likelyMentionedInAI: boolean;
    factors: string[];
    summary: string;
    recommendations: string[];
  };
  actionPlan: {
    week: number;
    priority: string;
    platform: string;
    action: string;
    description: string;
    estimatedImpact: string;
    canCreateInBlastly: boolean;
  }[];
  topRecommendations: { priority: "high" | "medium" | "low"; platform: string; issue: string; fix: string }[];
  scanConfidence?: ScanConfidence;
};

type CompareResult = {
  yourUrl: string;
  competitorUrl: string;
  yourScore: number;
  competitorScore: number;
  yourGrade: string;
  competitorGrade: string;
  platformComparison: {
    platform: string;
    yourFollowers: number | null;
    competitorFollowers: number | null;
    yourFound: boolean;
    competitorFound: boolean;
    yourScore: number;
    competitorScore: number;
    winner: "you" | "competitor" | "tie";
    gap: string;
  }[];
  yourAdvantages: string[];
  competitorAdvantages: string[];
  quickWins: string[];
  summary: string;
  yourProfiles: { platform: string; url: string; handle: string }[];
  competitorProfiles: { platform: string; url: string; handle: string }[];
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DigitalPresence() {
  const [mode, setMode] = useState<"single" | "compare">("single");
  const [url, setUrl] = useState("");
  const [yourUrl, setYourUrl] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [scanStep, setScanStep] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const { data: history } = trpc.socialScan.getSocialScans.useQuery();

  const scanMutation = trpc.socialScan.scanSocialPresence.useMutation({
    onSuccess: (data) => {
      setScanResult(data as ScanResult);
      setScanStep(0);
      toast.success("Digital presence scan complete!");
    },
    onError: (err) => {
      setScanStep(0);
      if (err.message === "FREE_LIMIT_REACHED") {
        setShowUpgrade(true);
      } else {
        toast.error(err.message || "Scan failed. Please try again.");
      }
    },
  });

  const compareMutation = trpc.socialScan.comparePresences.useMutation({
    onSuccess: (data) => {
      setCompareResult(data as CompareResult);
      setScanStep(0);
      toast.success("Competitor comparison complete!");
    },
    onError: (err) => {
      setScanStep(0);
      toast.error(err.message || "Comparison failed. Please try again.");
    },
  });

  // Simulate progress steps during scan
  const startProgressSimulation = () => {
    setScanStep(0);
    const interval = setInterval(() => {
      setScanStep(prev => {
        if (prev >= SCAN_STEPS.length - 2) { clearInterval(interval); return prev; }
        return prev + 1;
      });
    }, 3500);
  };

  const handleScan = () => {
    let u = url.trim();
    if (!u) return;
    if (!u.startsWith("http")) u = "https://" + u;
    setScanResult(null);
    startProgressSimulation();
    scanMutation.mutate({ websiteUrl: u });
  };

  const handleCompare = () => {
    let y = yourUrl.trim();
    let c = competitorUrl.trim();
    if (!y || !c) return;
    if (!y.startsWith("http")) y = "https://" + y;
    if (!c.startsWith("http")) c = "https://" + c;
    setCompareResult(null);
    startProgressSimulation();
    compareMutation.mutate({ yourUrl: y, competitorUrl: c });
  };

  const isLoading = scanMutation.isPending || compareMutation.isPending;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Upgrade prompt when free limit is reached */}
      {showUpgrade && (
        <UpgradePrompt feature="Digital Presence" />
      )}
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-violet-400" />
            Digital Presence Scanner
          </h1>
          <p className="text-muted-foreground mt-1 max-w-xl">
            Enter your website URL — Blastly automatically discovers all your social media profiles and gives you a complete digital health report. <span className="text-violet-400 font-medium">No other tool does this.</span>
          </p>
        </div>
        {history && history.length > 0 && (
          <Badge variant="outline" className="text-xs">{history.length} scan{history.length !== 1 ? "s" : ""} saved</Badge>
        )}
      </div>

      {/* Mode Toggle + Input */}
      <Card className="border-white/10 bg-white/5">
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant={mode === "single" ? "default" : "outline"}
              onClick={() => { setMode("single"); setCompareResult(null); }}
              className={mode === "single" ? "bg-violet-600 hover:bg-violet-700" : ""}>
              <Zap className="w-3.5 h-3.5 mr-1.5" /> Full Digital Presence
            </Button>
            <Button size="sm" variant={mode === "compare" ? "default" : "outline"}
              onClick={() => { setMode("compare"); setScanResult(null); }}
              className={mode === "compare" ? "bg-violet-600 hover:bg-violet-700" : ""}>
              <Swords className="w-3.5 h-3.5 mr-1.5" /> Competitor Comparison
            </Button>
          </div>

          {mode === "single" ? (
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9 bg-white/5 border-white/20 focus:border-violet-500"
                  placeholder="Enter your website URL (e.g. https://yoursite.com)"
                  value={url} onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScan()} />
              </div>
              <Button onClick={handleScan} disabled={isLoading || !url.trim()}
                className="bg-violet-600 hover:bg-violet-700 shrink-0">
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-1.5" />}
                {isLoading ? "Scanning..." : "Scan Now"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" />
                  <Input className="pl-9 bg-white/5 border-white/20 focus:border-violet-500"
                    placeholder="Your website URL" value={yourUrl} onChange={(e) => setYourUrl(e.target.value)} />
                </div>
                <div className="relative flex-1">
                  <Swords className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                  <Input className="pl-9 bg-white/5 border-white/20 focus:border-orange-500"
                    placeholder="Competitor website URL" value={competitorUrl} onChange={(e) => setCompetitorUrl(e.target.value)} />
                </div>
                <Button onClick={handleCompare} disabled={isLoading || !yourUrl.trim() || !competitorUrl.trim()}
                  className="bg-violet-600 hover:bg-violet-700 shrink-0">
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4 mr-1.5" />}
                  {isLoading ? "Comparing..." : "Compare"}
                </Button>
              </div>
            </div>
          )}

          {isLoading && <ScanProgress step={scanStep} />}
        </CardContent>
      </Card>

      {/* ── Single Scan Results ── */}
      {scanResult && mode === "single" && (
        <div className="space-y-6">
          {/* Hero: Overall Digital Presence Score */}
          <Card className="border-white/10 bg-gradient-to-br from-violet-900/30 to-indigo-900/20">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <ScoreRing score={scanResult.overallScore} size={110} grade={scanResult.overallGrade} />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-xl font-bold">{scanResult.brandName || scanResult.websiteUrl}</h2>
                      {scanResult.brandIndustry && (
                        <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-300">{scanResult.brandIndustry}</Badge>
                      )}
                      <GradeBadge grade={scanResult.overallGrade} />
                    </div>
                    <ShareScoreButton
                      reportType="digital_presence"
                      websiteUrl={scanResult.websiteUrl}
                      overallScore={scanResult.overallScore}
                      scanData={scanResult}
                    />
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">{scanResult.overallSummary}</p>
                  <div className="flex gap-4 flex-wrap pt-1">
                    <div className="text-center">
                      <div className="text-lg font-bold text-violet-400">{scanResult.websiteSeoScore}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Website SEO</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-cyan-400">{scanResult.discoveredProfiles.length}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Profiles Found</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-emerald-400">{scanResult.postingCadence.activeAccounts.length}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Active Accounts</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${scanResult.postingCadence.dormantAccounts.length > 0 ? "text-red-400" : "text-emerald-400"}`}>
                        {scanResult.postingCadence.dormantAccounts.length}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Dormant</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Confidence Score Panel */}
          {scanResult.scanConfidence && (
            <ConfidencePanel confidence={scanResult.scanConfidence} />
          )}

          {/* Platform Cards Grid */}
          <div>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" /> Social Media Profiles
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {scanResult.platformScores.map((platform) => {
                const cfg = getPlatformConfig(platform.platform);
                return (
                  <Card key={platform.platform} className={`border-white/10 ${platform.found ? "bg-white/5" : "bg-white/2 opacity-60"}`}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                            <span className={`text-xs font-bold ${cfg.textColor}`}>{cfg.label[0]}</span>
                          </div>
                          <div>
                            <div className="text-sm font-semibold">{cfg.label}</div>
                            {platform.handle && <div className="text-[11px] text-muted-foreground">@{platform.handle}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {platform.found ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                          )}
                          {platform.found && <GradeBadge grade={platform.grade} />}
                        </div>
                      </div>

                      {platform.found ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Health Score</span>
                            <span className="text-sm font-bold" style={{ color: platform.score >= 70 ? "#22c55e" : platform.score >= 40 ? "#f59e0b" : "#ef4444" }}>
                              {platform.score}/100
                            </span>
                          </div>
                          <Progress value={platform.score} className="h-1.5" />
                          {platform.followers !== null && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="w-3 h-3" />
                              <span>{platform.followers.toLocaleString()} followers</span>
                            </div>
                          )}
                          {platform.daysSinceLastPost !== null && (
                            <div className={`flex items-center gap-1 text-xs ${platform.isDormant ? "text-red-400" : "text-emerald-400"}`}>
                              <Clock className="w-3 h-3" />
                              <span>{platform.isDormant ? `Dormant — ${platform.daysSinceLastPost}d ago` : `Active — ${platform.daysSinceLastPost}d ago`}</span>
                            </div>
                          )}
                          {platform.postingFrequency && platform.postingFrequency !== "Unknown" && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {platform.postingFrequency}
                            </div>
                          )}
                          {platform.recommendations.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-white/5">
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Top Fix</div>
                              <p className="text-xs text-amber-300">{platform.recommendations[0]}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-xs text-red-400 font-medium">Profile not found</p>
                          <p className="text-xs text-muted-foreground">Not present on this platform</p>
                          {platform.recommendations[0] && (
                            <p className="text-xs text-violet-300 mt-1">{platform.recommendations[0]}</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Platform Gap Detector */}
          {scanResult.platformGapAnalysis.missingPlatforms.length > 0 && (
            <Card className="border-orange-500/20 bg-orange-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-400" />
                  Platform Gap Detector
                  <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-xs">
                    {scanResult.platformGapAnalysis.missingPlatforms.length} gaps found
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{scanResult.platformGapAnalysis.summary}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {scanResult.platformGapAnalysis.missingPlatforms.map((gap, i) => {
                  const cfg = getPlatformConfig(gap.platform);
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                        <span className={`text-xs font-bold ${cfg.textColor}`}>{cfg.label[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{cfg.label}</span>
                          <PriorityBadge priority={gap.priority as "high" | "medium" | "low"} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{gap.reason}</p>
                        <div className="flex gap-4 mt-1.5 flex-wrap">
                          <span className="text-xs text-orange-300">📉 {gap.estimatedReachLoss}</span>
                          <span className="text-xs text-muted-foreground">{gap.competitorUsage}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Content Consistency Analyser */}
          <Card className="border-white/10 bg-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                Content Consistency Analyser
                <span className="text-sm font-normal text-muted-foreground ml-auto">Score: {scanResult.contentConsistency.score}/100</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{scanResult.contentConsistency.summary}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={scanResult.contentConsistency.score} className="h-2" />
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Brand Name", ok: scanResult.contentConsistency.brandNameConsistent },
                  { label: "Bio/Description", ok: scanResult.contentConsistency.bioConsistent },
                  { label: "Messaging", ok: scanResult.contentConsistency.messagingConsistent },
                ].map(({ label, ok }) => (
                  <div key={label} className={`flex items-center gap-2 p-2 rounded-lg ${ok ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                    {ok ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                    <span className="text-xs font-medium">{label}</span>
                  </div>
                ))}
              </div>
              {scanResult.contentConsistency.issues.length > 0 && (
                <div className="space-y-1.5">
                  {scanResult.contentConsistency.issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-amber-300">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Posting Cadence Health */}
          <Card className="border-white/10 bg-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Posting Cadence Health
                <Badge className={`text-xs ml-auto ${
                  scanResult.postingCadence.overallHealth === "Excellent" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                  scanResult.postingCadence.overallHealth === "Good" ? "bg-green-500/20 text-green-300 border-green-500/30" :
                  scanResult.postingCadence.overallHealth === "Fair" ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" :
                  "bg-red-500/20 text-red-300 border-red-500/30"
                }`}>{scanResult.postingCadence.overallHealth}</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{scanResult.postingCadence.summary}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wide mb-1.5">Active Accounts</div>
                  {scanResult.postingCadence.activeAccounts.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {scanResult.postingCadence.activeAccounts.map(p => (
                        <span key={p} className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full capitalize">{p}</span>
                      ))}
                    </div>
                  ) : <span className="text-xs text-muted-foreground">None detected</span>}
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="text-xs text-red-400 font-semibold uppercase tracking-wide mb-1.5">Dormant Accounts</div>
                  {scanResult.postingCadence.dormantAccounts.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {scanResult.postingCadence.dormantAccounts.map(p => (
                        <span key={p} className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full capitalize">{p}</span>
                      ))}
                    </div>
                  ) : <span className="text-xs text-emerald-400">All accounts active!</span>}
                </div>
              </div>
              {scanResult.postingCadence.recommendation && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <Lightbulb className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-violet-200">{scanResult.postingCadence.recommendation}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Visibility Score */}
          <Card className="border-white/10 bg-gradient-to-br from-indigo-900/20 to-purple-900/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-400" />
                AI Visibility Score
                <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-300 ml-1">NEW</Badge>
                <span className="text-sm font-normal text-muted-foreground ml-auto">{scanResult.aiVisibilityScore.score}/100</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">How findable is your brand in ChatGPT, Perplexity, and Google AI Overviews?</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4">
                <ScoreRing score={scanResult.aiVisibilityScore.score} size={70} grade={scanResult.aiVisibilityScore.grade} />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground leading-relaxed">{scanResult.aiVisibilityScore.summary}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {scanResult.aiVisibilityScore.likelyMentionedInAI ? (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" /> Likely mentioned by AI
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Not yet in AI results
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {scanResult.aiVisibilityScore.factors.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Key Factors</div>
                  {scanResult.aiVisibilityScore.factors.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <ChevronRight className="w-3 h-3 mt-0.5 text-indigo-400 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              )}
              {scanResult.aiVisibilityScore.recommendations.length > 0 && (
                <div className="space-y-1.5">
                  {scanResult.aiVisibilityScore.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-indigo-300">
                      <Lightbulb className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 30-Day AI Action Plan */}
          {scanResult.actionPlan.length > 0 && (
            <Card className="border-white/10 bg-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  Your 30-Day AI Action Plan
                </CardTitle>
                <p className="text-sm text-muted-foreground">Prioritised steps to improve your digital presence this month.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3, 4].map(week => {
                  const weekItems = scanResult.actionPlan.filter(a => a.week === week);
                  if (weekItems.length === 0) return null;
                  return (
                    <div key={week}>
                      <div className="text-xs font-bold text-violet-400 uppercase tracking-wide mb-2">Week {week}</div>
                      <div className="space-y-2">
                        {weekItems.map((item, i) => {
                          const cfg = getPlatformConfig(item.platform);
                          return (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-violet-500/30 transition-colors">
                              <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                                <span className={`text-[10px] font-bold ${cfg.textColor}`}>{item.platform[0].toUpperCase()}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold">{item.action}</span>
                                  <PriorityBadge priority={item.priority as "high" | "medium" | "low"} />
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                                {item.estimatedImpact && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                                    <span className="text-xs text-emerald-400">{item.estimatedImpact}</span>
                                  </div>
                                )}
                              </div>
                              {item.canCreateInBlastly && (
                                <Button size="sm" variant="outline"
                                  className="shrink-0 text-xs border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
                                  onClick={() => toast.info("Opening Blastly Compose...")}>
                                  Create in Blastly
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Top Recommendations */}
          {scanResult.topRecommendations.length > 0 && (
            <Card className="border-white/10 bg-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  Top Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {scanResult.topRecommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                    <PriorityBadge priority={rec.priority} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-muted-foreground capitalize">{rec.platform}</span>
                        <span className="text-sm">{rec.issue}</span>
                      </div>
                      <p className="text-xs text-violet-300 mt-0.5">{rec.fix}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Competitor Comparison Results ── */}
      {compareResult && mode === "compare" && (
        <div className="space-y-6">
          {/* Score Overview */}
          <Card className="border-white/10 bg-gradient-to-br from-violet-900/20 to-indigo-900/20">
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="text-center space-y-2">
                  <ScoreRing score={compareResult.yourScore} size={90} grade={compareResult.yourGrade} />
                  <div>
                    <div className="text-sm font-semibold truncate">{compareResult.yourUrl.replace(/^https?:\/\//, "")}</div>
                    <div className="text-xs text-violet-400 font-medium">YOUR BRAND</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-muted-foreground">VS</div>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{compareResult.summary}</p>
                </div>
                <div className="text-center space-y-2">
                  <ScoreRing score={compareResult.competitorScore} size={90} grade={compareResult.competitorGrade} />
                  <div>
                    <div className="text-sm font-semibold truncate">{compareResult.competitorUrl.replace(/^https?:\/\//, "")}</div>
                    <div className="text-xs text-orange-400 font-medium">COMPETITOR</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Platform Comparison Table */}
          {compareResult.platformComparison.length > 0 && (
            <Card className="border-white/10 bg-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-violet-400" /> Platform-by-Platform Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Platform</th>
                        <th className="text-center py-2 text-xs text-violet-400 font-semibold uppercase tracking-wide">Your Score</th>
                        <th className="text-center py-2 text-xs text-orange-400 font-semibold uppercase tracking-wide">Competitor</th>
                        <th className="text-center py-2 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Winner</th>
                        <th className="text-left py-2 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compareResult.platformComparison.map((row) => {
                        const cfg = getPlatformConfig(row.platform);
                        return (
                          <tr key={row.platform} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded ${cfg.bg} flex items-center justify-center`}>
                                  <span className={`text-[9px] font-bold ${cfg.textColor}`}>{cfg.label[0]}</span>
                                </div>
                                <span className="font-medium">{cfg.label}</span>
                              </div>
                            </td>
                            <td className="py-3 text-center">
                              <span className={`font-bold ${row.yourFound ? "text-violet-300" : "text-red-400"}`}>
                                {row.yourFound ? row.yourScore : "—"}
                              </span>
                              {row.yourFollowers !== null && (
                                <div className="text-[10px] text-muted-foreground">{row.yourFollowers.toLocaleString()}</div>
                              )}
                            </td>
                            <td className="py-3 text-center">
                              <span className={`font-bold ${row.competitorFound ? "text-orange-300" : "text-red-400"}`}>
                                {row.competitorFound ? row.competitorScore : "—"}
                              </span>
                              {row.competitorFollowers !== null && (
                                <div className="text-[10px] text-muted-foreground">{row.competitorFollowers.toLocaleString()}</div>
                              )}
                            </td>
                            <td className="py-3 text-center">
                              {row.winner === "you" && <ArrowUp className="w-4 h-4 text-emerald-400 mx-auto" />}
                              {row.winner === "competitor" && <ArrowDown className="w-4 h-4 text-red-400 mx-auto" />}
                              {row.winner === "tie" && <Minus className="w-4 h-4 text-yellow-400 mx-auto" />}
                            </td>
                            <td className="py-3 text-xs text-muted-foreground max-w-xs">{row.gap}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Advantages + Quick Wins */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Your Advantages
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {compareResult.yourAdvantages.map((a, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-emerald-400 shrink-0" />{a}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-red-500/20 bg-red-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Their Advantages
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {compareResult.competitorAdvantages.map((a, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-red-400 shrink-0" />{a}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-violet-500/20 bg-violet-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-violet-400 flex items-center gap-1.5">
                  <Zap className="w-4 h-4" /> Quick Wins
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {compareResult.quickWins.map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-violet-400 shrink-0" />{w}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Scan History */}
      {history && history.length > 0 && !scanResult && !compareResult && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" /> Recent Scans
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.slice(0, 5).map((scan) => (
              <div key={scan.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-violet-400" />
                  <div>
                    <div className="text-sm font-medium truncate max-w-xs">{scan.websiteUrl}</div>
                    <div className="text-xs text-muted-foreground">{new Date(scan.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold text-violet-400">{scan.overallScore}</div>
                  <Button size="sm" variant="outline" className="text-xs border-white/20"
                    onClick={() => { setUrl(scan.websiteUrl); setMode("single"); }}>
                    Re-scan
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!scanResult && !compareResult && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <Zap className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Enter your website URL above</p>
          <p className="text-sm mt-1">Blastly will automatically discover all your social profiles and score your complete digital presence.</p>
          <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
            {["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn", "X"].map(p => (
              <span key={p} className="text-xs text-muted-foreground/60">{p}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
