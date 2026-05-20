import AppLayout from "@/components/AppLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { BarChart3, TrendingUp, MousePointerClick, Heart, Link2, Target } from "lucide-react";
import { useState } from "react";

const CHART_COLORS = ["oklch(0.52 0.22 264)", "oklch(0.60 0.18 160)", "oklch(0.65 0.20 50)", "oklch(0.58 0.22 320)"];

export default function Analytics() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id ?? 0;
  const [period, setPeriod] = useState("30");

  const { data: summary } = trpc.analytics.summary.useQuery({ workspaceId: wsId }, { enabled: !!wsId });
  const { data: byPlatform } = trpc.analytics.byPlatform.useQuery({ workspaceId: wsId }, { enabled: !!wsId });
  const { data: byCampaign } = trpc.analytics.byCampaign.useQuery({ workspaceId: wsId }, { enabled: !!wsId });
  const { data: topPosts } = trpc.analytics.topPosts.useQuery({ workspaceId: wsId, limit: 5 }, { enabled: !!wsId });

  const stats = [
    { label: "Total Impressions", value: summary?.totalImpressions ? Number(summary.totalImpressions).toLocaleString() : "0", icon: TrendingUp, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30", change: "+12%" },
    { label: "Total Clicks", value: summary?.totalClicks ? Number(summary.totalClicks).toLocaleString() : "0", icon: MousePointerClick, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30", change: "+8%" },
    { label: "Engagements", value: summary ? (Number(summary.totalLikes) + Number(summary.totalShares)).toLocaleString() : "0", icon: Heart, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-950/30", change: "+15%" },
    { label: "UTM Conversions", value: summary ? Number(summary.totalUtmConversions).toLocaleString() : "0", icon: Target, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", change: "+5%" },
  ];

  const platformData = ((byPlatform ?? []) as any[]).map((p: any) => ({
    name: p.platform ? (p.platform.charAt(0).toUpperCase() + p.platform.slice(1)) : "Unknown",
    impressions: Number(p.totalImpressions ?? 0),
    clicks: Number(p.totalClicks ?? 0),
    engagements: Number(p.totalEngagements ?? 0),
  }));

  const campaignData = ((byCampaign ?? []) as any[]).slice(0, 5).map((c: any) => ({
    name: c.campaignName ?? "Unknown",
    impressions: Number(c.totalImpressions ?? 0),
    clicks: Number(c.totalClicks ?? 0),
    conversions: Number(c.totalConversions ?? 0),
  }));

  const pieData = platformData.map((p, i) => ({ name: p.name, value: p.impressions, color: CHART_COLORS[i % CHART_COLORS.length] }));

  return (
    <AppLayout title="Analytics">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Analytics</h2>
            <p className="text-muted-foreground text-sm mt-0.5">Track performance across all platforms and campaigns.</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, color, bg, change }) => (
            <Card key={label} className="border-border/60 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-0">{change}</Badge>
                </div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Platform performance bar chart */}
          <div className="lg:col-span-2">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />Performance by Platform
                </CardTitle>
              </CardHeader>
              <CardContent>
                {platformData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <BarChart3 className="w-10 h-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No analytics data yet.</p>
                    <p className="text-xs text-muted-foreground">Publish posts to start tracking performance.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={platformData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.01 264)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid oklch(0.90 0.01 264)" }} />
                      <Bar dataKey="impressions" fill="oklch(0.52 0.22 264)" radius={[4, 4, 0, 0]} name="Impressions" />
                      <Bar dataKey="clicks" fill="oklch(0.60 0.18 160)" radius={[4, 4, 0, 0]} name="Clicks" />
                      <Bar dataKey="engagements" fill="oklch(0.65 0.20 50)" radius={[4, 4, 0, 0]} name="Engagements" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pie chart */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Impressions by Platform</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <div className="flex items-center justify-center h-48">
                  <p className="text-sm text-muted-foreground">No data yet</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {pieData.map((entry, i) => (
                      <div key={entry.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                          <span>{entry.name}</span>
                        </div>
                        <span className="font-medium">{entry.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Campaign performance */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />Campaign Performance (UTM Tracked)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {campaignData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Link2 className="w-10 h-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No campaign data yet.</p>
                <p className="text-xs text-muted-foreground">Create campaigns with UTM parameters to track conversions.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={campaignData} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.01 264)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="impressions" fill="oklch(0.52 0.22 264)" radius={[0, 4, 4, 0]} name="Impressions" />
                  <Bar dataKey="clicks" fill="oklch(0.60 0.18 160)" radius={[0, 4, 4, 0]} name="Clicks" />
                  <Bar dataKey="conversions" fill="oklch(0.65 0.20 50)" radius={[0, 4, 4, 0]} name="Conversions" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* UTM Tracking Table */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />UTM Tracking Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!byCampaign || (byCampaign as any[]).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No UTM data yet. Add UTM parameters to your posts to track conversions.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Campaign</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Impressions</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Clicks</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">UTM Conversions</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {(byCampaign as any[]).map((c: any) => {
                      const clicks = Number(c.totalClicks ?? 0);
                      const conversions = Number(c.totalConversions ?? 0);
                      const convRate = clicks > 0 ? ((conversions / clicks) * 100).toFixed(1) : "0.0";
                      return (
                        <tr key={c.campaignId ?? c.campaignName} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 font-medium">{c.campaignName ?? "Unassigned"}</td>
                          <td className="py-2.5 px-3 text-right">{Number(c.totalImpressions ?? 0).toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right">{clicks.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right">
                            <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-0 text-[10px]">{conversions.toLocaleString()}</Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground">{convRate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top posts */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />Top Performing Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!topPosts || (topPosts as any[]).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No post analytics yet. Publish posts to see performance data.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {(topPosts as any[]).map((post: any, i: number) => (
                  <div key={post.id} className="flex items-center gap-4 py-3">
                    <span className="text-lg font-bold text-muted-foreground w-6 text-center">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{post.title ?? post.bodyText?.substring(0, 60) ?? "Post"}</p>
                      <p className="text-xs text-muted-foreground capitalize">{post.platform ?? "multiple platforms"}</p>
                    </div>
                    <div className="flex gap-4 text-xs text-right">
                      <div>
                        <p className="font-semibold">{Number(post.impressions ?? 0).toLocaleString()}</p>
                        <p className="text-muted-foreground">impressions</p>
                      </div>
                      <div>
                        <p className="font-semibold">{Number(post.clicks ?? 0).toLocaleString()}</p>
                        <p className="text-muted-foreground">clicks</p>
                      </div>
                      <div>
                        <p className="font-semibold">{Number(post.engagements ?? 0).toLocaleString()}</p>
                        <p className="text-muted-foreground">engagements</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
