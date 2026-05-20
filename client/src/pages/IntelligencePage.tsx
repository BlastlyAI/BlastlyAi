import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Globe, Loader2, Sparkles, Target, Users, Lightbulb,
  ArrowRight, CheckCircle2, RefreshCw, ExternalLink, Zap,
} from "lucide-react";

export default function IntelligencePage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id ?? 0;
  const [, navigate] = useLocation();
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { data: analyses = [], refetch } = trpc.agents.listWebsiteAnalyses.useQuery(
    { workspaceId: wsId }, { enabled: !!wsId }
  );

  const analyze = trpc.agents.analyzeWebsite.useMutation({
    onSuccess: (data) => {
      setIsAnalyzing(false);
      setResult(data);
      refetch();
      toast.success("Website analyzed successfully!");
    },
    onError: (err) => {
      setIsAnalyzing(false);
      toast.error(err.message);
    },
  });

  const handleAnalyze = () => {
    if (!url || !wsId) return;
    setIsAnalyzing(true);
    setResult(null);
    analyze.mutate({ workspaceId: wsId, url });
  };

  const extracted = result?.extractedData as any;

  return (
    <AppLayout title="Website Intelligence">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Website Intelligence Engine
            </h1>
            <p className="text-sm text-muted-foreground">Deep-analyze any URL to extract marketing intelligence in real time</p>
          </div>
        </div>

        {/* URL input */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
          <CardContent className="p-5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="https://yourproduct.com or any competitor URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pl-9"
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                />
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={!url || isAnalyzing || !wsId}
                className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isAnalyzing ? "Analyzing…" : "Analyze"}
              </Button>
            </div>
            {isAnalyzing && (
              <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Fetching and analyzing page…</p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-500">Extracting features, benefits, USPs, and content opportunities</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {extracted && (
          <div className="space-y-4">
            {/* Summary header */}
            <Card className="border-border/60 shadow-sm overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold">{extracted.productName}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5 italic">"{extracted.tagline}"</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{extracted.tone} tone</Badge>
                      <Badge variant="secondary" className="text-xs">{extracted.targetAudience}</Badge>
                    </div>
                  </div>
                  <a href={result.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" />View
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Features */}
              {extracted.features?.length > 0 && (
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />Key Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <ul className="space-y-1.5">
                      {extracted.features.map((f: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Benefits */}
              {extracted.benefits?.length > 0 && (
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-500" />Benefits
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <ul className="space-y-1.5">
                      {extracted.benefits.map((b: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* USPs */}
              {extracted.uniqueSellingPoints?.length > 0 && (
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />Unique Selling Points
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <ul className="space-y-1.5">
                      {extracted.uniqueSellingPoints.map((u: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                          {u}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Target Audience */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-violet-500" />Target Audience & Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  <p className="text-sm">{extracted.targetAudience}</p>
                  {extracted.pricingInfo && (
                    <p className="text-sm text-muted-foreground">{extracted.pricingInfo}</p>
                  )}
                  {extracted.callToActions?.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-2">
                      {extracted.callToActions.map((cta: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">{cta}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Content Opportunities */}
            {extracted.contentOpportunities?.length > 0 && (
              <Card className="border-border/60 shadow-sm overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-violet-500 to-pink-500" />
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-violet-500" />AI-Identified Content Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {extracted.contentOpportunities.map((opp: string, i: number) => (
                      <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
                        <span className="w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <p className="text-sm text-violet-800 dark:text-violet-300">{opp}</p>
                      </div>
                    ))}
                  </div>
                  <Button
                    className="mt-4 gap-2 w-full sm:w-auto"
                    onClick={() => navigate("/dashboard/agent")}
                  >
                    <Sparkles className="w-4 h-4" />Generate Campaign from This URL
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Past analyses */}
        {!result && (analyses as any[]).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Analyses</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(analyses as any[]).map((a: any) => (
                <Card
                  key={a.id}
                  className="border-border/60 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer"
                  onClick={() => setResult(a)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{a.pageTitle ?? a.url}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.url}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(a.lastAnalyzedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0 w-7 h-7" onClick={(e) => { e.stopPropagation(); setUrl(a.url); handleAnalyze(); }}>
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {!result && (analyses as any[]).length === 0 && !isAnalyzing && (
          <div className="text-center py-16 text-muted-foreground">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No analyses yet</p>
            <p className="text-sm mt-1">Enter any URL above to extract deep marketing intelligence</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
