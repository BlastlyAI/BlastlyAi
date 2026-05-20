import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Globe,
  Search,
  Shield,
  Zap,
  FileText,
  Link2,
  Image,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  BarChart2,
  RefreshCw,
  Swords,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { ConfidencePanel } from "@/components/ConfidencePanel";
import type { ScanConfidence } from "@/components/ConfidencePanel";

type Recommendation = {
  priority: "high" | "medium" | "low";
  category: string;
  issue: string;
  fix: string;
};

type Keyword = {
  keyword: string;
  count: number;
  density: number;
};

type CompareResult = {
  yours: {
    url: string;
    title: string | null;
    score: number;
    pageSpeedScore: number;
    httpsEnabled: boolean;
    wordCount: number;
    keywords: { keyword: string; count: number; density: number }[];
    h1Tags: string[];
    recommendations: { priority: "high" | "medium" | "low"; category: string; issue: string; fix: string }[];
  };
  competitor: {
    url: string;
    title: string | null;
    score: number;
    pageSpeedScore: number;
    httpsEnabled: boolean;
    wordCount: number;
    keywords: { keyword: string; count: number; density: number }[];
    h1Tags: string[];
    recommendations: { priority: "high" | "medium" | "low"; category: string; issue: string; fix: string }[];
  };
  metrics: {
    label: string;
    yours: number;
    competitor: number;
    unit: string;
    higherIsBetter: boolean;
    isBool?: boolean;
  }[];
};

type SeoScan = {
  id: number;
  url: string;
  score: number;
  title: string | null;
  metaDescription: string | null;
  h1Tags: string[] | null;
  keywords: Keyword[] | null;
  pageSpeedScore: number | null;
  httpsEnabled: boolean | null;
  wordCount: number | null;
  imagesWithoutAlt: number | null;
  internalLinks: number | null;
  externalLinks: number | null;
  recommendations: Recommendation[] | null;
  createdAt: Date;
};

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color =
    score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function ScoreLabel({ score }: { score: number }) {
  if (score >= 80) return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Excellent</Badge>;
  if (score >= 60) return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Good</Badge>;
  if (score >= 40) return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Needs Work</Badge>;
  return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Poor</Badge>;
}

function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  if (priority === "high")
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">High</Badge>;
  if (priority === "medium")
    return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Medium</Badge>;
  return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Low</Badge>;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  status,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  status: "good" | "warning" | "bad" | "neutral";
}) {
  const statusColor = {
    good: "text-green-400",
    warning: "text-yellow-400",
    bad: "text-red-400",
    neutral: "text-muted-foreground",
  }[status];

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
      <div className="p-2 rounded-md bg-white/10">
        <Icon className="w-4 h-4 text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-semibold truncate ${statusColor}`}>{value}</p>
      </div>
    </div>
  );
}

export default function SeoHealth() {
  const [url, setUrl] = useState("");
  const [activeScan, setActiveScan] = useState<SeoScan | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [mode, setMode] = useState<"single" | "compare">("single");
  const [yourUrl, setYourUrl] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const { data: scans, refetch: refetchScans } = trpc.seo.getScans.useQuery();

  const scanMutation = trpc.seo.scanWebsite.useMutation({
    onSuccess: (data) => {
      if (data) {
        setActiveScan(data as SeoScan);
        refetchScans();
        toast.success(`Scan complete! SEO score: ${data.score}/100`);
      }
    },
    onError: (err) => {
      if (err.message === "FREE_LIMIT_REACHED") {
        setShowUpgrade(true);
      } else {
        toast.error(err.message || "Scan failed");
      }
    },
  });

  const compareMutation = trpc.seo.compareWebsites.useMutation({
    onSuccess: (data) => {
      setCompareResult(data as CompareResult);
      toast.success("Comparison complete!");
    },
    onError: (err) => {
      toast.error(err.message || "Comparison failed");
    },
  });

  const handleScan = () => {
    let scanUrl = url.trim();
    if (!scanUrl) return;
    if (!scanUrl.startsWith("http://") && !scanUrl.startsWith("https://")) {
      scanUrl = "https://" + scanUrl;
    }
    setUrl(scanUrl);
    scanMutation.mutate({ url: scanUrl });
  };

  const handleCompare = () => {
    let y = yourUrl.trim();
    let c = competitorUrl.trim();
    if (!y || !c) return;
    if (!y.startsWith("http")) y = "https://" + y;
    if (!c.startsWith("http")) c = "https://" + c;
    setYourUrl(y);
    setCompetitorUrl(c);
    compareMutation.mutate({ yourUrl: y, competitorUrl: c });
  };

  const highPriority = activeScan?.recommendations?.filter((r) => r.priority === "high") ?? [];
  const mediumPriority = activeScan?.recommendations?.filter((r) => r.priority === "medium") ?? [];
  const lowPriority = activeScan?.recommendations?.filter((r) => r.priority === "low") ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Upgrade prompt when free limit is reached */}
      {showUpgrade && (
        <UpgradePrompt feature="SEO" />
      )}
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-violet-400" />
            SEO Health Scanner
          </h1>
          <p className="text-muted-foreground mt-1">
            Analyse any website's SEO health, get an AI-powered score, and actionable recommendations.
          </p>
        </div>
        {scans && scans.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {scans.length} scan{scans.length !== 1 ? "s" : ""} saved
          </Badge>
        )}
      </div>

      {/* Mode Toggle + Scan Input */}
      <Card className="border-white/10 bg-white/5">
        <CardContent className="pt-6 space-y-4">
          {/* Mode tabs */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={mode === "single" ? "default" : "outline"}
              onClick={() => { setMode("single"); setCompareResult(null); }}
              className={mode === "single" ? "bg-violet-600 hover:bg-violet-700" : ""}
            >
              <Search className="w-3.5 h-3.5 mr-1.5" /> Single Site Scan
            </Button>
            <Button
              size="sm"
              variant={mode === "compare" ? "default" : "outline"}
              onClick={() => { setMode("compare"); setActiveScan(null); }}
              className={mode === "compare" ? "bg-violet-600 hover:bg-violet-700" : ""}
            >
              <Swords className="w-3.5 h-3.5 mr-1.5" /> Competitor Comparison
            </Button>
          </div>

          {mode === "single" ? (
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9 bg-white/5 border-white/20 focus:border-violet-500"
                  placeholder="Enter website URL (e.g. https://yoursite.com)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScan()}
                  disabled={scanMutation.isPending}
                />
              </div>
              <Button
                onClick={handleScan}
                disabled={!url.trim() || scanMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700 min-w-[120px]"
              >
                {scanMutation.isPending ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Scanning...</>
                ) : (
                  <><Search className="w-4 h-4 mr-2" />Scan Site</>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" />
                  <Input
                    className="pl-9 bg-white/5 border-white/20 focus:border-violet-500"
                    placeholder="Your website URL"
                    value={yourUrl}
                    onChange={(e) => setYourUrl(e.target.value)}
                    disabled={compareMutation.isPending}
                  />
                </div>
                <div className="relative">
                  <Swords className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                  <Input
                    className="pl-9 bg-white/5 border-white/20 focus:border-red-500"
                    placeholder="Competitor website URL"
                    value={competitorUrl}
                    onChange={(e) => setCompetitorUrl(e.target.value)}
                    disabled={compareMutation.isPending}
                  />
                </div>
              </div>
              <Button
                onClick={handleCompare}
                disabled={!yourUrl.trim() || !competitorUrl.trim() || compareMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {compareMutation.isPending ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Comparing (this takes ~30s)...</>
                ) : (
                  <><Swords className="w-4 h-4 mr-2" />Compare Sites</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">Both sites are scanned simultaneously and compared across 8 SEO metrics.</p>
            </div>
          )}

          {(scanMutation.isPending || compareMutation.isPending) && (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-muted-foreground">
                {compareMutation.isPending
                  ? "Scanning both sites in parallel, running AI analysis..."
                  : "Fetching page, analysing SEO signals, and generating AI recommendations..."}
              </p>
              <Progress value={undefined} className="h-1 animate-pulse" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Competitor Comparison Results */}
      {mode === "compare" && compareResult && (
        <div className="space-y-6">
          {/* Score header */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-violet-500/30 bg-violet-500/5">
              <CardContent className="pt-5 flex flex-col items-center gap-2">
                <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs mb-1">Your Site</Badge>
                <ScoreRing score={compareResult.yours.score} size={100} />
                <p className="text-xs text-muted-foreground truncate max-w-[180px] text-center">{compareResult.yours.url}</p>
              </CardContent>
            </Card>
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="pt-5 flex flex-col items-center gap-2">
                <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs mb-1">Competitor</Badge>
                <ScoreRing score={compareResult.competitor.score} size={100} />
                <p className="text-xs text-muted-foreground truncate max-w-[180px] text-center">{compareResult.competitor.url}</p>
              </CardContent>
            </Card>
          </div>

          {/* Metrics comparison table */}
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-sm">Side-by-Side Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {compareResult.metrics.map((m) => {
                  const youWin = m.higherIsBetter ? m.yours > m.competitor : m.yours < m.competitor;
                  const tied = m.yours === m.competitor;
                  return (
                    <div key={m.label} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center py-2 border-b border-white/5 last:border-0">
                      <div className={`text-right text-sm font-semibold ${youWin ? "text-violet-400" : tied ? "text-muted-foreground" : "text-red-400"}`}>
                        {m.isBool ? (m.yours ? "✓ Yes" : "✗ No") : `${m.yours}${m.unit ? " " + m.unit : ""}`}
                        {!tied && (
                          youWin
                            ? <ArrowUp className="inline w-3 h-3 ml-1 text-violet-400" />
                            : <ArrowDown className="inline w-3 h-3 ml-1 text-red-400" />
                        )}
                        {tied && <Minus className="inline w-3 h-3 ml-1" />}
                      </div>
                      <div className="text-center">
                        <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded">{m.label}</span>
                      </div>
                      <div className={`text-left text-sm font-semibold ${!youWin && !tied ? "text-red-400" : tied ? "text-muted-foreground" : "text-muted-foreground"}`}>
                        {m.isBool ? (m.competitor ? "✓ Yes" : "✗ No") : `${m.competitor}${m.unit ? " " + m.unit : ""}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top recommendations for your site */}
          {compareResult.yours.recommendations.length > 0 && (
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-sm">Top Fixes for Your Site</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {compareResult.yours.recommendations.map((r, i) => (
                  <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1">
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={r.priority} />
                      <span className="text-xs font-medium text-muted-foreground">{r.category}</span>
                    </div>
                    <p className="text-sm font-medium">{r.issue}</p>
                    <p className="text-xs text-muted-foreground">{r.fix}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Results */}
      {activeScan && (
        <div className="space-y-6">
          {/* Score Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Main Score */}
            <Card className="border-white/10 bg-white/5 md:col-span-1">
              <CardContent className="pt-6 flex flex-col items-center gap-3">
                <ScoreRing score={activeScan.score} />
                <div className="text-center">
                  <ScoreLabel score={activeScan.score} />
                  <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">
                    {activeScan.url}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center mt-1">
                    <Clock className="w-3 h-3" />
                    {new Date(activeScan.createdAt).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Metrics Grid */}
            <Card className="border-white/10 bg-white/5 md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Key Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <MetricCard
                    icon={Shield}
                    label="HTTPS Security"
                    value={activeScan.httpsEnabled ? "Enabled ✓" : "Not Enabled ✗"}
                    status={activeScan.httpsEnabled ? "good" : "bad"}
                  />
                  <MetricCard
                    icon={Zap}
                    label="Page Speed Score"
                    value={activeScan.pageSpeedScore !== null ? `${activeScan.pageSpeedScore}/100` : "N/A"}
                    status={
                      activeScan.pageSpeedScore === null
                        ? "neutral"
                        : activeScan.pageSpeedScore >= 80
                        ? "good"
                        : activeScan.pageSpeedScore >= 50
                        ? "warning"
                        : "bad"
                    }
                  />
                  <MetricCard
                    icon={FileText}
                    label="Word Count"
                    value={activeScan.wordCount !== null ? `${activeScan.wordCount.toLocaleString()} words` : "N/A"}
                    status={
                      activeScan.wordCount === null
                        ? "neutral"
                        : activeScan.wordCount >= 300
                        ? "good"
                        : "warning"
                    }
                  />
                  <MetricCard
                    icon={Image}
                    label="Images Without Alt"
                    value={activeScan.imagesWithoutAlt !== null ? activeScan.imagesWithoutAlt : "N/A"}
                    status={
                      activeScan.imagesWithoutAlt === null
                        ? "neutral"
                        : activeScan.imagesWithoutAlt === 0
                        ? "good"
                        : activeScan.imagesWithoutAlt <= 3
                        ? "warning"
                        : "bad"
                    }
                  />
                  <MetricCard
                    icon={Link2}
                    label="Internal Links"
                    value={activeScan.internalLinks !== null ? activeScan.internalLinks : "N/A"}
                    status={
                      activeScan.internalLinks === null
                        ? "neutral"
                        : activeScan.internalLinks >= 5
                        ? "good"
                        : "warning"
                    }
                  />
                  <MetricCard
                    icon={TrendingUp}
                    label="External Links"
                    value={activeScan.externalLinks !== null ? activeScan.externalLinks : "N/A"}
                    status="neutral"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Confidence Score Panel */}
          {(activeScan as typeof activeScan & { scanConfidence?: ScanConfidence }).scanConfidence && (
            <ConfidencePanel confidence={(activeScan as typeof activeScan & { scanConfidence?: ScanConfidence }).scanConfidence!} />
          )}

          {/* Tabs: Recommendations / Keywords / Meta */}
          <Tabs defaultValue="recommendations">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="recommendations">
                Recommendations
                {activeScan.recommendations && activeScan.recommendations.length > 0 && (
                  <Badge className="ml-2 bg-violet-500/20 text-violet-300 text-xs">
                    {activeScan.recommendations.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="keywords">Top Keywords</TabsTrigger>
              <TabsTrigger value="meta">Meta & Content</TabsTrigger>
            </TabsList>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations" className="space-y-3 mt-4">
              {activeScan.recommendations && activeScan.recommendations.length > 0 ? (
                <>
                  {highPriority.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                        High Priority — Fix These First
                      </p>
                      {highPriority.map((rec, i) => (
                        <Card key={i} className="border-red-500/20 bg-red-500/5">
                          <CardContent className="pt-4 pb-4">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <PriorityBadge priority={rec.priority} />
                                  <span className="text-xs text-muted-foreground">{rec.category}</span>
                                </div>
                                <p className="text-sm font-medium">{rec.issue}</p>
                                <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                                  <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-violet-400" />
                                  {rec.fix}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  {mediumPriority.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">
                        Medium Priority
                      </p>
                      {mediumPriority.map((rec, i) => (
                        <Card key={i} className="border-yellow-500/20 bg-yellow-500/5">
                          <CardContent className="pt-4 pb-4">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <PriorityBadge priority={rec.priority} />
                                  <span className="text-xs text-muted-foreground">{rec.category}</span>
                                </div>
                                <p className="text-sm font-medium">{rec.issue}</p>
                                <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                                  <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-violet-400" />
                                  {rec.fix}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  {lowPriority.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                        Low Priority
                      </p>
                      {lowPriority.map((rec, i) => (
                        <Card key={i} className="border-blue-500/20 bg-blue-500/5">
                          <CardContent className="pt-4 pb-4">
                            <div className="flex items-start gap-3">
                              <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <PriorityBadge priority={rec.priority} />
                                  <span className="text-xs text-muted-foreground">{rec.category}</span>
                                </div>
                                <p className="text-sm font-medium">{rec.issue}</p>
                                <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                                  <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-violet-400" />
                                  {rec.fix}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p>No recommendations — this site looks great!</p>
                </div>
              )}
            </TabsContent>

            {/* Keywords Tab */}
            <TabsContent value="keywords" className="mt-4">
              <Card className="border-white/10 bg-white/5">
                <CardHeader>
                  <CardTitle className="text-sm">Top Keywords Found on Page</CardTitle>
                </CardHeader>
                <CardContent>
                  {activeScan.keywords && activeScan.keywords.length > 0 ? (
                    <div className="space-y-2">
                      {activeScan.keywords.slice(0, 15).map((kw, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                          <span className="text-sm font-medium flex-1">{kw.keyword}</span>
                          <span className="text-xs text-muted-foreground w-16 text-right">
                            {kw.count}x
                          </span>
                          <div className="w-24">
                            <Progress value={Math.min(kw.density * 10, 100)} className="h-1.5" />
                          </div>
                          <span className="text-xs text-muted-foreground w-12 text-right">
                            {kw.density}%
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No keywords extracted.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Meta & Content Tab */}
            <TabsContent value="meta" className="mt-4 space-y-4">
              <Card className="border-white/10 bg-white/5">
                <CardHeader>
                  <CardTitle className="text-sm">Page Title</CardTitle>
                </CardHeader>
                <CardContent>
                  {activeScan.title ? (
                    <div>
                      <p className="text-sm">{activeScan.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activeScan.title.length} characters
                        {activeScan.title.length < 30 && " — too short (aim for 50–60)"}
                        {activeScan.title.length > 60 && " — too long (aim for 50–60)"}
                        {activeScan.title.length >= 30 && activeScan.title.length <= 60 && " — good length ✓"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-red-400 text-sm font-medium">⚠ No title tag found — this is a critical SEO issue.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5">
                <CardHeader>
                  <CardTitle className="text-sm">Meta Description</CardTitle>
                </CardHeader>
                <CardContent>
                  {activeScan.metaDescription ? (
                    <div>
                      <p className="text-sm">{activeScan.metaDescription}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activeScan.metaDescription.length} characters
                        {activeScan.metaDescription.length < 120 && " — too short (aim for 150–160)"}
                        {activeScan.metaDescription.length > 160 && " — too long (aim for 150–160)"}
                        {activeScan.metaDescription.length >= 120 && activeScan.metaDescription.length <= 160 && " — good length ✓"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-red-400 text-sm font-medium">⚠ No meta description found — this hurts click-through rates.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5">
                <CardHeader>
                  <CardTitle className="text-sm">H1 Headings</CardTitle>
                </CardHeader>
                <CardContent>
                  {activeScan.h1Tags && activeScan.h1Tags.length > 0 ? (
                    <div className="space-y-1">
                      {activeScan.h1Tags.map((h1, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Badge variant="outline" className="text-xs shrink-0">H1</Badge>
                          <p className="text-sm">{h1}</p>
                        </div>
                      ))}
                      {activeScan.h1Tags.length > 1 && (
                        <p className="text-xs text-yellow-400 mt-2">
                          ⚠ Multiple H1 tags found — best practice is to have only one H1 per page.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-red-400 text-sm font-medium">⚠ No H1 tag found — every page should have exactly one H1.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Previous Scans */}
      {!activeScan && scans && scans.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Previous Scans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {scans.map((scan) => (
              <Card
                key={scan.id}
                className="border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                onClick={() => setActiveScan(scan as SeoScan)}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className="text-2xl font-bold"
                        style={{
                          color:
                            scan.score >= 80
                              ? "#22c55e"
                              : scan.score >= 60
                              ? "#f59e0b"
                              : "#ef4444",
                        }}
                      >
                        {scan.score}
                      </span>
                      <span className="text-xs text-muted-foreground">score</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{scan.url}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(scan.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!activeScan && (!scans || scans.length === 0) && (
        <div className="text-center py-16 text-muted-foreground">
          <BarChart2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Scan your first website</p>
          <p className="text-sm mt-1">
            Enter any URL above to get an instant SEO health score and actionable recommendations.
          </p>
        </div>
      )}
    </div>
  );
}
