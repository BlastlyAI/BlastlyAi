import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Brain, Loader2, TrendingUp, DollarSign, Users, BarChart2,
  Target, Sparkles, ChevronRight, AlertCircle, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";

function MetricCard({
  label, value, sub, trend, color,
}: {
  label: string; value: string; sub?: string; trend?: "up" | "down" | "neutral"; color: string;
}) {
  return (
    <div className={`rounded-xl p-4 border border-border/60 bg-gradient-to-br ${color}`}>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-bold">{value}</p>
        {trend && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold ${
            trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-500" : "text-muted-foreground"
          }`}>
            {trend === "up" ? <ArrowUpRight className="w-3.5 h-3.5" /> : trend === "down" ? <ArrowDownRight className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
            {sub}
          </div>
        )}
      </div>
      {sub && !trend && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ROIBrainPage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id ?? 0;

  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [adSpend, setAdSpend] = useState("");
  const [avgOrderValue, setAvgOrderValue] = useState("");
  const [isPredicting, setIsPredicting] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);

  const { data: campaigns = [] } = trpc.campaigns.list.useQuery({ workspaceId: wsId }, { enabled: !!wsId });
  const { data: roiHistory = [] } = trpc.agents.listROIPredictions.useQuery(
    { workspaceId: wsId }, { enabled: !!wsId }
  );
  const predictROI = trpc.agents.predictROI.useMutation({
    onSuccess: (data) => {
      setIsPredicting(false);
      setPrediction(data);
      toast.success("ROI prediction complete!");
    },
    onError: (err) => { setIsPredicting(false); toast.error(err.message); },
  });

  const handlePredict = () => {
    if (!selectedCampaign || !wsId) return;
    setIsPredicting(true);
    setPrediction(null);
    const campaign = (campaigns as any[]).find((c: any) => String(c.id) === selectedCampaign);
    predictROI.mutate({
      workspaceId: wsId,
      campaignId: Number(selectedCampaign),
      campaignName: campaign?.name ?? "Campaign",
      goal: (campaign?.goal ?? "awareness") as any,
      platforms: campaign?.platforms ?? ["twitter", "linkedin"],
      postCount: campaign?.postCount ?? 10,
      timeframeDays: 30,
      averageOrderValue: avgOrderValue ? Number(avgOrderValue) : undefined,
    });
  };

  // Build chart data from history
  const chartData = (roiHistory as any[]).slice(0, 10).reverse().map((r: any, i: number) => ({
    name: `Run ${i + 1}`,
    predicted: r.predictedRevenue ?? 0,
    traffic: r.predictedTraffic ?? 0,
    conversions: r.predictedConversions ?? 0,
    confidence: r.confidence ?? 0,
  }));

  return (
    <AppLayout title="ROI Brain">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Cross-Channel ROI Brain
            </h1>
            <p className="text-sm text-muted-foreground">AI-powered revenue forecasting using historical performance and campaign data</p>
          </div>
        </div>

        {/* Prediction form */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-violet-600 to-indigo-600" />
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Campaign</Label>
                <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                  <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                  <SelectContent>
                    {(campaigns as any[]).map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ad Spend ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="e.g. 500"
                    value={adSpend}
                    onChange={(e) => setAdSpend(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avg. Order Value ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="e.g. 49"
                    value={avgOrderValue}
                    onChange={(e) => setAvgOrderValue(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
            <Button
              onClick={handlePredict}
              disabled={!selectedCampaign || isPredicting || !wsId}
              className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
            >
              {isPredicting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              {isPredicting ? "Predicting ROI…" : "Predict Business Impact"}
            </Button>
          </CardContent>
        </Card>

        {/* Prediction results */}
        {prediction && (
          <div className="space-y-4">
            {/* Confidence badge */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${
                prediction.confidence >= 75 ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400" :
                prediction.confidence >= 50 ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400" :
                "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400"
              }`}>
                {prediction.confidence >= 75 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {prediction.confidence}% confidence
              </div>
              <p className="text-sm text-muted-foreground">Based on {prediction.dataPoints ?? "historical"} data points</p>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard
                label="Predicted Traffic"
                value={(prediction.predictedTraffic ?? 0).toLocaleString()}
                sub="visitors"
                color="from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20"
              />
              <MetricCard
                label="Predicted Conversions"
                value={(prediction.predictedConversions ?? 0).toLocaleString()}
                sub={`${prediction.conversionRate ?? 0}% rate`}
                color="from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20"
              />
              <MetricCard
                label="Predicted Revenue"
                value={`$${(prediction.predictedRevenue ?? 0).toLocaleString()}`}
                sub={prediction.roi ? `${prediction.roi}x ROI` : undefined}
                trend={prediction.roi >= 2 ? "up" : prediction.roi < 1 ? "down" : "neutral"}
                color="from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20"
              />
              <MetricCard
                label="Reach Estimate"
                value={(prediction.estimatedReach ?? 0).toLocaleString()}
                sub="impressions"
                color="from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20"
              />
            </div>

            {/* Breakdown by platform */}
            {prediction.platformBreakdown && Object.keys(prediction.platformBreakdown).length > 0 && (
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-violet-500" />Platform Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {Object.entries(prediction.platformBreakdown as Record<string, any>).map(([platform, data]) => (
                      <div key={platform} className="p-3 rounded-xl bg-muted/40 border border-border/50">
                        <p className="text-xs font-semibold capitalize mb-2">{platform}</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between"><span className="text-muted-foreground">Traffic</span><span className="font-medium">{(data as any).traffic?.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Conversions</span><span className="font-medium">{(data as any).conversions?.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span className="font-medium text-emerald-600">${(data as any).revenue?.toLocaleString()}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {prediction.recommendations?.length > 0 && (
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />AI Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <ul className="space-y-2">
                    {prediction.recommendations.map((r: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />{r}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Historical chart */}
        {chartData.length > 0 && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />Prediction History — Revenue Forecast
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="predicted" stroke="#7c3aed" fill="url(#colorRevenue)" strokeWidth={2} name="Predicted Revenue ($)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!prediction && chartData.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Brain className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No predictions yet</p>
            <p className="text-sm mt-1">Select a campaign and run your first ROI prediction</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
