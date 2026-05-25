import AppLayout from "@/components/AppLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuditList } from "@/hooks/useAuditList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart2, ExternalLink, Plus, Loader2, AlertCircle,
  CheckCircle2, TrendingUp, Calendar,
} from "lucide-react";
import { useLocation } from "wouter";

function GradeBadge({ score }: { score: number | null }) {
  const s = score ?? 0;
  const grade = s >= 90 ? "A" : s >= 80 ? "B" : s >= 70 ? "C" : s >= 60 ? "D" : "F";
  const colors: Record<string, string> = {
    A: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    B: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
    C: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    D: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800",
    F: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
  };
  return (
    <div className={`w-10 h-10 rounded-xl border flex flex-col items-center justify-center shrink-0 ${colors[grade]}`}>
      <span className="text-lg font-black leading-none">{grade}</span>
      <span className="text-[8px] font-medium opacity-70">{s}</span>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0;
  const color = v >= 75 ? "bg-emerald-500" : v >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{v}</span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

export default function AuditHistoryPage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id ?? 0;
  const workspaceSupabaseId = currentWorkspace?.supabaseId;
  const [, navigate] = useLocation();

  const { data: audits = [], isLoading } = useAuditList(workspaceSupabaseId, wsId);

  return (
    <AppLayout title="Audit History">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <BarChart2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                Audit History
              </h1>
              <p className="text-sm text-muted-foreground">All social media audits run for this workspace</p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/audit")}
            className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4" />Run New Audit
          </Button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (audits as any[]).length === 0 && (
          <div className="text-center py-16 border border-dashed border-border/60 rounded-2xl">
            <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-lg mb-1">No audits yet</p>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Run a free AI-powered social media audit to get a detailed health report, ad cost analysis, and personalised recommendations.
            </p>
            <Button
              onClick={() => navigate("/audit")}
              className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
            >
              <Plus className="w-4 h-4" />Run Your First Audit
            </Button>
          </div>
        )}

        {/* Audit cards */}
        {!isLoading && (audits as any[]).length > 0 && (
          <div className="space-y-3">
            {(audits as any[]).map((audit: any) => {
              const handles = (audit.handles as Record<string, string>) ?? {};
              const platformCount = Object.values(handles).filter(Boolean).length;
              const raw = audit.rawReport as any;
              const grade = raw?.overallGrade ?? "C";

              return (
                <Card key={audit.id} className="border-border/60 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <GradeBadge score={audit.overallScore} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <h3 className="font-semibold">{audit.businessName}</h3>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {audit.industry && <Badge variant="secondary" className="text-[10px]">{audit.industry}</Badge>}
                              {platformCount > 0 && (
                                <span className="text-[10px] text-muted-foreground">{platformCount} platform{platformCount !== 1 ? "s" : ""} audited</span>
                              )}
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(audit.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 shrink-0"
                            onClick={() => navigate(`/audit/report/${audit.shareToken}`)}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />View Report
                          </Button>
                        </div>

                        {/* Score bars */}
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <ScoreBar label="Content" value={audit.contentScore} />
                          <ScoreBar label="Ads" value={audit.adQualityScore} />
                          <ScoreBar label="Engagement" value={audit.engagementScore} />
                          <ScoreBar label="Growth" value={audit.growthScore} />
                        </div>

                        {/* Summary snippet */}
                        {raw?.summary && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{raw.summary}</p>
                        )}

                        {/* Finding counts */}
                        {Array.isArray(raw?.findings) && raw.findings.length > 0 && (
                          <div className="flex items-center gap-3 mt-2">
                            {raw.findings.filter((f: any) => f.severity === "critical").length > 0 && (
                              <span className="flex items-center gap-1 text-[10px] text-red-500 font-semibold">
                                <AlertCircle className="w-3 h-3" />
                                {raw.findings.filter((f: any) => f.severity === "critical").length} critical
                              </span>
                            )}
                            {raw.findings.filter((f: any) => f.severity === "opportunity").length > 0 && (
                              <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                                <CheckCircle2 className="w-3 h-3" />
                                {raw.findings.filter((f: any) => f.severity === "opportunity").length} opportunities
                              </span>
                            )}
                            {raw.recommendations?.length > 0 && (
                              <span className="flex items-center gap-1 text-[10px] text-blue-500 font-semibold">
                                <TrendingUp className="w-3 h-3" />
                                {raw.recommendations.length} recommendations
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* CTA to public audit page */}
        <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold">Share the Audit Tool with your clients</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Send them to <code className="text-xs bg-muted px-1.5 py-0.5 rounded">/audit</code> — free, no login required, and every report ends with a Blastly pitch.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/audit`);
            }}
          >
            <ExternalLink className="w-3.5 h-3.5" />Copy Audit URL
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
