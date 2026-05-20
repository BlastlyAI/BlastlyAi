import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  TrendingUp, Loader2, Sparkles, Plus, Trash2, AlertCircle,
  Zap, Target, Twitter, Linkedin, Facebook, Instagram,
  BarChart2, Eye, ChevronRight, Copy, Check,
} from "lucide-react";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  twitter: <Twitter className="w-3.5 h-3.5" />,
  linkedin: <Linkedin className="w-3.5 h-3.5" />,
  facebook: <Facebook className="w-3.5 h-3.5" />,
  instagram: <Instagram className="w-3.5 h-3.5" />,
};

const URGENCY_COLORS: Record<string, string> = {
  high: "bg-red-500/10 text-red-600 border-red-200",
  medium: "bg-amber-500/10 text-amber-600 border-amber-200",
  low: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
};

const MOMENTUM_COLORS: Record<string, string> = {
  rising: "text-emerald-600",
  stable: "text-blue-600",
  declining: "text-red-500",
  viral: "text-violet-600",
};

export default function TrendsPage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id ?? 0;

  // Trend scan state
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [industry, setIndustry] = useState("");
  const [scanPlatforms, setScanPlatforms] = useState<string[]>(["twitter", "linkedin"]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [copiedPost, setCopiedPost] = useState<string | null>(null);

  // Competitor state
  const [compHandle, setCompHandle] = useState("");
  const [compPlatform, setCompPlatform] = useState<"twitter" | "linkedin" | "facebook" | "instagram" | "tiktok">("twitter");
  const [compDisplayName, setCompDisplayName] = useState("");

  // Counter content state
  const [counterGap, setCounterGap] = useState("");
  const [counterPlatform, setCounterPlatform] = useState<"twitter" | "linkedin" | "facebook" | "instagram" | "tiktok">("twitter");
  const [counterHandle, setCounterHandle] = useState("");
  const [counterResult, setCounterResult] = useState<any>(null);
  const [isGeneratingCounter, setIsGeneratingCounter] = useState(false);

  const { data: competitors = [], refetch: refetchCompetitors } = trpc.agents.listCompetitorMonitors.useQuery(
    { workspaceId: wsId }, { enabled: !!wsId }
  );
  const { data: trendReports = [], refetch: refetchReports } = trpc.agents.listTrendReports.useQuery(
    { workspaceId: wsId }, { enabled: !!wsId }
  );

  const runScan = trpc.agents.runTrendScan.useMutation({
    onSuccess: (data) => {
      setIsScanning(false);
      setScanResult(data);
      refetchReports();
      toast.success("Trend scan complete!");
    },
    onError: (err) => { setIsScanning(false); toast.error(err.message); },
  });

  const addCompetitor = trpc.agents.addCompetitorMonitor.useMutation({
    onSuccess: () => { refetchCompetitors(); setCompHandle(""); setCompDisplayName(""); toast.success("Competitor added!"); },
    onError: (err) => toast.error(err.message),
  });

  const removeCompetitor = trpc.agents.removeCompetitorMonitor.useMutation({
    onSuccess: () => { refetchCompetitors(); toast.success("Competitor removed"); },
  });

  const generateCounter = trpc.agents.generateCounterContent.useMutation({
    onSuccess: (data) => { setIsGeneratingCounter(false); setCounterResult(data); toast.success("Counter content generated!"); },
    onError: (err) => { setIsGeneratingCounter(false); toast.error(err.message); },
  });

  const addKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  const toggleScanPlatform = (p: string) => {
    setScanPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const copyPost = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPost(key);
    setTimeout(() => setCopiedPost(null), 2000);
  };

  return (
    <AppLayout title="Trends & Competitors">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Competitor & Trend Agent
            </h1>
            <p className="text-sm text-muted-foreground">Monitor trends, track competitors, and auto-generate counter-content</p>
          </div>
        </div>

        <Tabs defaultValue="trends">
          <TabsList className="mb-4">
            <TabsTrigger value="trends" className="gap-2"><TrendingUp className="w-3.5 h-3.5" />Trend Scanner</TabsTrigger>
            <TabsTrigger value="competitors" className="gap-2"><Eye className="w-3.5 h-3.5" />Competitors</TabsTrigger>
            <TabsTrigger value="counter" className="gap-2"><Zap className="w-3.5 h-3.5" />Counter Content</TabsTrigger>
            <TabsTrigger value="history" className="gap-2"><BarChart2 className="w-3.5 h-3.5" />Scan History</TabsTrigger>
          </TabsList>

          {/* ── Trend Scanner ── */}
          <TabsContent value="trends" className="space-y-4">
            <Card className="border-border/60 shadow-sm overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-orange-500 to-red-500" />
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Industry / Niche</Label>
                    <Input
                      placeholder="e.g. SaaS, E-commerce, Health & Wellness"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Target Platforms</Label>
                    <div className="flex gap-2 flex-wrap">
                      {["twitter", "linkedin", "facebook", "instagram", "tiktok"].map(p => (
                        <button
                          key={p}
                          onClick={() => toggleScanPlatform(p)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                            scanPlatforms.includes(p)
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          {PLATFORM_ICONS[p]}<span className="capitalize">{p}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Keywords to Monitor</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add keyword and press Enter"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                    />
                    <Button variant="outline" size="sm" onClick={addKeyword} className="gap-1.5 shrink-0">
                      <Plus className="w-3.5 h-3.5" />Add
                    </Button>
                  </div>
                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {keywords.map(k => (
                        <Badge key={k} variant="secondary" className="gap-1.5 pr-1.5">
                          {k}
                          <button onClick={() => setKeywords(keywords.filter(x => x !== k))} className="hover:text-destructive">×</button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => { setIsScanning(true); setScanResult(null); runScan.mutate({ workspaceId: wsId, keywords, industry, platforms: scanPlatforms as any[] }); }}
                  disabled={!industry || isScanning || !wsId}
                  className="gap-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                >
                  {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                  {isScanning ? "Scanning trends…" : "Run Trend Scan"}
                </Button>
              </CardContent>
            </Card>

            {/* Scan results */}
            {scanResult && (
              <div className="space-y-4">
                {/* Trending topics */}
                {scanResult.trendingTopics?.length > 0 && (
                  <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-orange-500" />Trending Topics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {scanResult.trendingTopics.map((t: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/50">
                            <div>
                              <p className="text-sm font-medium">{t.topic}</p>
                              <p className={`text-xs font-semibold capitalize ${MOMENTUM_COLORS[t.momentum?.toLowerCase()] ?? "text-muted-foreground"}`}>{t.momentum}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold">{t.relevance}%</p>
                              <p className="text-[10px] text-muted-foreground">relevance</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Insights & opportunities */}
                {scanResult.insights?.length > 0 && (
                  <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-violet-500" />Content Opportunities
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      {scanResult.insights.map((insight: any, i: number) => (
                        <div key={i} className="p-3 rounded-xl border border-border/60 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-semibold">{insight.topic}</p>
                                <Badge variant="outline" className={`text-[10px] ${URGENCY_COLORS[insight.urgency] ?? ""}`}>
                                  {insight.urgency} urgency
                                </Badge>
                                <span className="text-muted-foreground">{PLATFORM_ICONS[insight.platform]}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{insight.opportunity}</p>
                            </div>
                          </div>
                          {insight.suggestedPost && (
                            <div className="bg-muted/40 rounded-lg p-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs leading-relaxed flex-1">{insight.suggestedPost}</p>
                                <Button
                                  variant="ghost" size="icon"
                                  className="w-6 h-6 shrink-0"
                                  onClick={() => copyPost(insight.suggestedPost, `insight-${i}`)}
                                >
                                  {copiedPost === `insight-${i}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                </Button>
                              </div>
                              {insight.hashtags?.length > 0 && (
                                <p className="text-[10px] text-primary mt-1.5">{insight.hashtags.map((h: string) => `#${h}`).join(" ")}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Recommended actions */}
                {scanResult.recommendedActions?.length > 0 && (
                  <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-500" />Recommended Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <ul className="space-y-2">
                        {scanResult.recommendedActions.map((a: string, i: number) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm">
                            <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />{a}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Competitors ── */}
          <TabsContent value="competitors" className="space-y-4">
            <Card className="border-border/60 shadow-sm overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
              <CardContent className="p-5 space-y-4">
                <p className="text-sm text-muted-foreground">Add competitor handles to monitor their content strategy and identify gaps.</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs">Handle / Username</Label>
                    <Input placeholder="@competitor" value={compHandle} onChange={(e) => setCompHandle(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Display Name</Label>
                    <Input placeholder="Competitor Co." value={compDisplayName} onChange={(e) => setCompDisplayName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Platform</Label>
                    <Select value={compPlatform} onValueChange={(v) => setCompPlatform(v as any)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["twitter", "linkedin", "facebook", "instagram", "tiktok"].map(p => (
                          <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={() => addCompetitor.mutate({ workspaceId: wsId, handle: compHandle, platform: compPlatform, displayName: compDisplayName || undefined })}
                  disabled={!compHandle || !wsId}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />Add Competitor
                </Button>
              </CardContent>
            </Card>

            {(competitors as any[]).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(competitors as any[]).map((c: any) => (
                  <Card key={c.id} className="border-border/60 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                            {PLATFORM_ICONS[c.platform]}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{c.displayName ?? c.handle}</p>
                            <p className="text-xs text-muted-foreground">{c.handle}</p>
                            <Badge variant="outline" className="text-[10px] mt-1 capitalize">{c.platform}</Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          className="w-7 h-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeCompetitor.mutate({ workspaceId: wsId, monitorId: c.id })}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Eye className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No competitors tracked yet</p>
                <p className="text-sm mt-1">Add competitor handles to monitor their strategy</p>
              </div>
            )}
          </TabsContent>

          {/* ── Counter Content ── */}
          <TabsContent value="counter" className="space-y-4">
            <Card className="border-border/60 shadow-sm overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-violet-500 to-pink-500" />
              <CardContent className="p-5 space-y-4">
                <p className="text-sm text-muted-foreground">Describe a content gap or competitor weakness — AI generates counter-content that positions your brand favorably.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Competitor Handle</Label>
                    <Input placeholder="@competitor" value={counterHandle} onChange={(e) => setCounterHandle(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Platform</Label>
                    <Select value={counterPlatform} onValueChange={(v) => setCounterPlatform(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["twitter", "linkedin", "facebook", "instagram", "tiktok"].map(p => (
                          <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Content Gap / Opportunity</Label>
                  <textarea
                    className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="e.g. They never address customer support quality, only features. We can own the 'customer success' angle…"
                    value={counterGap}
                    onChange={(e) => setCounterGap(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => {
                    setIsGeneratingCounter(true);
                    setCounterResult(null);
                    generateCounter.mutate({ workspaceId: wsId, competitorHandle: counterHandle, platform: counterPlatform, gapDescription: counterGap });
                  }}
                  disabled={!counterGap || !counterHandle || isGeneratingCounter || !wsId}
                  className="gap-2 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700"
                >
                  {isGeneratingCounter ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {isGeneratingCounter ? "Generating…" : "Generate Counter Content"}
                </Button>
              </CardContent>
            </Card>

            {counterResult && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Strategy</p>
                  <p className="text-sm">{counterResult.strategy}</p>
                </div>
                <div className="space-y-3">
                  {counterResult.posts?.map((post: any, i: number) => (
                    <Card key={i} className="border-border/60 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">{post.angle}</Badge>
                          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => copyPost(post.text, `counter-${i}`)}>
                            {copiedPost === `counter-${i}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                        <p className="text-sm leading-relaxed">{post.text}</p>
                        {post.hashtags?.length > 0 && (
                          <p className="text-xs text-primary mt-2">{post.hashtags.map((h: string) => `#${h}`).join(" ")}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Scan History ── */}
          <TabsContent value="history" className="space-y-3">
            {(trendReports as any[]).length > 0 ? (
              (trendReports as any[]).map((report: any) => (
                <Card key={report.id} className="border-border/60 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setScanResult(report)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">{report.industry ?? "Trend Scan"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(report.keywords as string[])?.join(", ") ?? "No keywords"} · {new Date(report.generatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{(report.trendingTopics as any[])?.length ?? 0} trends</Badge>
                        <Badge variant="secondary" className="text-xs">{(report.insights as any[])?.length ?? 0} insights</Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No scan history yet</p>
                <p className="text-sm mt-1">Run your first trend scan to see results here</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
