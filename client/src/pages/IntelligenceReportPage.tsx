import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Download, CheckCircle2, TrendingUp, Users, Search, Star, Target, Zap, Calendar, Brain, Shield } from "lucide-react";
import { toast } from "sonner";

// ─── Section Components ──────────────────────────────────────────────────────

function ConfidenceBadge({ score }: { score: number }) {
  const color = score >= 85 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    : score >= 70 ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
    : "bg-red-500/20 text-red-400 border-red-500/30";
  return (
    <Badge variant="outline" className={`${color} text-[10px] font-medium`}>
      {score}% confidence
    </Badge>
  );
}

function SectionCard({ title, icon: Icon, confidence, children }: {
  title: string;
  icon: React.ElementType;
  confidence?: number;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-[oklch(0.14_0.01_250)] border-[oklch(0.22_0.02_250)] overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Icon className="w-4 h-4 text-violet-400" />
            </div>
            <CardTitle className="text-base text-white">{title}</CardTitle>
          </div>
          {confidence !== undefined && <ConfidenceBadge score={confidence} />}
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function DataRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  if (value === null || value === undefined) return null;
  const display = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-white/50">{label}</span>
      <span className="text-xs text-white/90 font-medium text-right max-w-[60%]">{display}</span>
    </div>
  );
}

function TagList({ items, color = "violet" }: { items: string[]; color?: string }) {
  const colors: Record<string, string> = {
    violet: "bg-violet-500/15 text-violet-300 border-violet-500/25",
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/25",
    cyan: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
    red: "bg-red-500/15 text-red-300 border-red-500/25",
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <Badge key={i} variant="outline" className={`${colors[color]} text-[10px]`}>{item}</Badge>
      ))}
    </div>
  );
}

// ─── Section 1: Business Snapshot ─────────────────────────────────────────────
function BusinessSnapshot({ data }: { data: Record<string, unknown> }) {
  return (
    <SectionCard title="Business Snapshot" icon={FileText} confidence={data.confidence_score as number}>
      <div className="space-y-3">
        <DataRow label="Business Name" value={data.business_name as string} />
        <DataRow label="Industry" value={data.industry as string} />
        <DataRow label="Description" value={data.business_description as string} />
        <DataRow label="Location" value={[data.location_city, data.location_state, data.location_country].filter(Boolean).join(", ")} />
        <DataRow label="Geographic Reach" value={data.geographic_reach as string} />
        <DataRow label="Google Rating" value={data.google_review_score ? `${data.google_review_score} ★ (${data.google_review_count} reviews)` : "Not found"} />
        {data.tagline ? <DataRow label="Tagline" value={data.tagline as string} /> : null}
        <div className="pt-2">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Active Platforms</p>
          <TagList items={(data.platforms_active as string[]) || []} color="emerald" />
        </div>
        <div className="pt-1">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Recommended Platforms</p>
          <TagList items={(data.platforms_recommended as string[]) || []} color="cyan" />
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Section 2: Market Demand ─────────────────────────────────────────────────
function MarketDemand({ data }: { data: Record<string, unknown> }) {
  const keywords = (data.top_keywords as Array<{ keyword: string; estimated_monthly_searches: string; difficulty: string }>) || [];
  const questions = (data.ai_engine_questions as Array<{ question: string; source: string }>) || [];
  const frustrations = (data.customer_frustrations as Array<{ frustration: string; source: string }>) || [];
  return (
    <SectionCard title="Market Demand" icon={TrendingUp} confidence={data.confidence_score as number}>
      <div className="space-y-4">
        {/* Keywords */}
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Top Keywords</p>
          <div className="space-y-1.5">
            {keywords.map((kw, i) => (
              <div key={i} className="flex items-center justify-between py-1 px-2 rounded bg-white/5">
                <span className="text-xs text-white/80">{kw.keyword}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/50">{kw.estimated_monthly_searches}/mo</span>
                  <Badge variant="outline" className={`text-[9px] ${kw.difficulty === "low" ? "text-emerald-400 border-emerald-500/30" : kw.difficulty === "medium" ? "text-amber-400 border-amber-500/30" : "text-red-400 border-red-500/30"}`}>
                    {kw.difficulty}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* AI Questions */}
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Questions People Ask AI</p>
          <div className="space-y-1.5">
            {questions.map((q, i) => (
              <div key={i} className="py-1.5 px-2 rounded bg-white/5">
                <p className="text-xs text-white/80">{q.question}</p>
                <p className="text-[10px] text-white/40 mt-0.5">Source: {q.source}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Frustrations */}
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Customer Frustrations</p>
          <div className="space-y-1.5">
            {frustrations.map((f, i) => (
              <div key={i} className="py-1.5 px-2 rounded bg-red-500/5 border border-red-500/10">
                <p className="text-xs text-white/80">{f.frustration}</p>
                <p className="text-[10px] text-white/40 mt-0.5">Source: {f.source}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Seasonal */}
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Peak Months</p>
          <TagList items={(data.peak_seasonal_months as string[]) || []} color="amber" />
          {data.seasonal_notes ? <p className="text-[10px] text-white/50 mt-1">{String(data.seasonal_notes)}</p> : null}
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Section 4: Reputation Summary ───────────────────────────────────────────
function ReputationSummary({ data }: { data: Record<string, unknown> }) {
  return (
    <SectionCard title="Reputation Summary" icon={Star} confidence={data.confidence_score as number}>
      <div className="space-y-4">
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Strongest Proof Points</p>
          <TagList items={(data.strongest_proof_points as string[]) || []} color="emerald" />
        </div>
        {((data.reputation_issues as string[]) || []).length > 0 && (
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Issues Flagged</p>
            <TagList items={(data.reputation_issues as string[]) || []} color="red" />
          </div>
        )}
        <DataRow label="Unanswered Negative Reviews" value={data.unanswered_negative_reviews as number} />
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Recommended Testimonial Angles</p>
          <div className="space-y-1">
            {((data.recommended_testimonial_angles as string[]) || []).map((angle, i) => (
              <p key={i} className="text-xs text-white/70 pl-2 border-l-2 border-violet-500/40">{angle}</p>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Top Praise Themes</p>
          <TagList items={(data.top_praise_themes as string[]) || []} color="emerald" />
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Top Complaint Themes</p>
          <TagList items={(data.top_complaint_themes as string[]) || []} color="amber" />
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Section 5: Visibility Baseline ──────────────────────────────────────────
function VisibilityBaseline({ data }: { data: Record<string, unknown> }) {
  return (
    <SectionCard title="Visibility Baseline" icon={Search} confidence={data.confidence_score as number}>
      <div className="space-y-3">
        <div className="py-2 px-3 rounded-lg bg-violet-500/10 border border-violet-500/20 mb-3">
          <p className="text-[10px] text-violet-300 font-semibold uppercase tracking-wider">{data.month_label as string}</p>
          <p className="text-[10px] text-white/50 mt-0.5">This baseline will be compared against in monthly reporting</p>
        </div>
        <DataRow label="Local Search Position" value={data.local_search_position as string} />
        <DataRow label="Local Pack Appearing" value={data.local_pack_appearing as boolean} />
        <DataRow label="NAP Consistency" value={data.nap_consistency as string} />
        <DataRow label="Website Health Score" value={`${data.website_health_score}/100`} />
        <DataRow label="Mobile Friendly" value={data.website_mobile_friendly as boolean} />
        <DataRow label="Page Speed" value={data.website_page_speed as string} />
        <DataRow label="Indexed" value={data.website_indexed as boolean} />
        <DataRow label="Has Blog" value={data.website_has_blog as boolean} />
        <DataRow label="Has FAQs" value={data.website_has_faqs as boolean} />
        <DataRow label="Duplicate Listings Found" value={data.duplicate_listings_found as number} />
        {((data.nap_issues as string[]) || []).length > 0 && (
          <div className="pt-1">
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">NAP Issues</p>
            <TagList items={(data.nap_issues as string[]) || []} color="red" />
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ─── Section 6: Opportunity Gaps ─────────────────────────────────────────────
function OpportunityGaps({ data }: { data: Record<string, unknown> }) {
  const contentGaps = (data.content_gaps as Array<{ gap: string; impact: string }>) || [];
  const keywordOpps = (data.keyword_opportunities as Array<{ keyword: string; current_position: string | null; opportunity: string }>) || [];
  return (
    <SectionCard title="Opportunity Gaps" icon={Target} confidence={data.confidence_score as number}>
      <div className="space-y-4">
        {/* Biggest gap highlight */}
        <div className="py-3 px-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider mb-1">Biggest Market Gap</p>
          <p className="text-sm text-white/90">{data.biggest_market_gap as string}</p>
        </div>
        {/* Primary message */}
        <div className="py-3 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wider mb-1">Recommended Primary Message</p>
          <p className="text-sm text-white/90 italic">"{data.recommended_primary_message as string}"</p>
        </div>
        {/* Content gaps */}
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Content Gaps</p>
          <div className="space-y-1.5">
            {contentGaps.map((gap, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded bg-white/5">
                <span className="text-xs text-white/80">{gap.gap}</span>
                <Badge variant="outline" className={`text-[9px] ${gap.impact === "high" ? "text-red-400 border-red-500/30" : gap.impact === "medium" ? "text-amber-400 border-amber-500/30" : "text-emerald-400 border-emerald-500/30"}`}>
                  {gap.impact} impact
                </Badge>
              </div>
            ))}
          </div>
        </div>
        {/* Keyword opportunities */}
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Keyword Opportunities</p>
          <div className="space-y-1.5">
            {keywordOpps.map((kw, i) => (
              <div key={i} className="py-1.5 px-2 rounded bg-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/80 font-medium">{kw.keyword}</span>
                  {kw.current_position && <span className="text-[10px] text-white/40">Currently: {kw.current_position}</span>}
                </div>
                <p className="text-[10px] text-white/50 mt-0.5">{kw.opportunity}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Section 7: Customer Journey ─────────────────────────────────────────────
function CustomerJourney({ data }: { data: Record<string, unknown> }) {
  return (
    <SectionCard title="Customer Journey" icon={Users} confidence={data.confidence_score as number}>
      <div className="space-y-4">
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">How Customers Find This Business</p>
          <TagList items={(data.how_customers_find as string[]) || []} color="cyan" />
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">What They Check Before Deciding</p>
          <div className="space-y-1">
            {((data.what_they_check_before_deciding as string[]) || []).map((item, i) => (
              <p key={i} className="text-xs text-white/70 pl-2 border-l-2 border-cyan-500/40">{item}</p>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Key Objections to Address</p>
          <TagList items={(data.key_objections_to_address as string[]) || []} color="amber" />
        </div>
        <DataRow label="Decision Cycle Length" value={data.decision_cycle_length as string} />
      </div>
    </SectionCard>
  );
}

// ─── Section 8: Quick Wins ───────────────────────────────────────────────────
function QuickWins({ data }: { data: Record<string, unknown> }) {
  const actions = (data.actions as Array<{ action: string; estimated_impact: string; ease: string; timeframe: string }>) || [];
  return (
    <SectionCard title="Quick Wins" icon={Zap} confidence={data.confidence_score as number}>
      <div className="space-y-3">
        {actions.map((action, i) => (
          <div key={i} className="py-3 px-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-emerald-400">{i + 1}</span>
                </div>
                <p className="text-sm text-white/90">{action.action}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2 ml-8">
              <span className="text-[10px] text-white/40">Impact: <span className="text-emerald-400">{action.estimated_impact}</span></span>
              <span className="text-[10px] text-white/40">Ease: <span className="text-white/70">{action.ease}</span></span>
              <span className="text-[10px] text-white/40">Time: <span className="text-white/70">{action.timeframe}</span></span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ─── Section 9: Content Strategy Bridge ──────────────────────────────────────
function ContentStrategyBridge({ data }: { data: Record<string, unknown> }) {
  const aeoAngles = (data.aeo_content_angles as Array<{ question: string; why_this_business_should_answer: string }>) || [];
  const calendar = (data.seasonal_calendar_90_days as Array<{ month: string; theme: string; content_ideas: string[] }>) || [];
  return (
    <SectionCard title="Content Strategy Bridge" icon={Calendar} confidence={data.confidence_score as number}>
      <div className="space-y-4">
        <DataRow label="Posting Frequency" value={data.recommended_posting_frequency as string} />
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Content Types</p>
          <TagList items={(data.recommended_content_types as string[]) || []} color="violet" />
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Platforms to Prioritise</p>
          <TagList items={(data.platforms_to_prioritise as string[]) || []} color="cyan" />
        </div>
        {/* AEO Angles */}
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">AEO Content Angles</p>
          <div className="space-y-2">
            {aeoAngles.map((angle, i) => (
              <div key={i} className="py-2 px-2 rounded bg-violet-500/5 border border-violet-500/10">
                <p className="text-xs text-white/80 font-medium">{angle.question}</p>
                <p className="text-[10px] text-white/50 mt-0.5">{angle.why_this_business_should_answer}</p>
              </div>
            ))}
          </div>
        </div>
        {/* 90-day calendar */}
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">90-Day Content Calendar</p>
          <div className="space-y-3">
            {calendar.map((month, i) => (
              <div key={i} className="py-2 px-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-white/90">{month.month}</span>
                  <span className="text-[10px] text-white/50">— {month.theme}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {month.content_ideas.map((idea, j) => (
                    <Badge key={j} variant="outline" className="text-[9px] bg-white/5 text-white/60 border-white/10">{idea}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Brand Voice Section ─────────────────────────────────────────────────────
function BrandVoiceSection({ data }: { data: { exact_phrases: string[]; differentiators: string[]; natural_tone: string; problems_they_solve: string[] } }) {
  return (
    <SectionCard title="Brand Voice" icon={Brain} confidence={90}>
      <div className="space-y-4">
        <DataRow label="Natural Tone" value={data.natural_tone} />
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Their Exact Phrases</p>
          <div className="space-y-1">
            {data.exact_phrases.map((phrase, i) => (
              <p key={i} className="text-xs text-white/70 pl-2 border-l-2 border-violet-500/40 italic">"{phrase}"</p>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Differentiators</p>
          <TagList items={data.differentiators} color="emerald" />
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Problems They Solve</p>
          <TagList items={data.problems_they_solve} color="cyan" />
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────
export default function IntelligenceReportPage() {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);

  // Get workspace
  const { data: workspaces } = trpc.workspace.list.useQuery(undefined, { enabled: !!user });
  const workspaceId = workspaces?.[0]?.id;

  // Get latest report
  const { data: report, isLoading, refetch } = trpc.intelligenceReport.getLatest.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  // Generate mutation
  const generateMutation = trpc.intelligenceReport.generate.useMutation({
    onSuccess: () => {
      setGenerating(false);
      refetch();
      toast.success("Intelligence Report Generated — all 9 sections populated.");
    },
    onError: (err) => {
      setGenerating(false);
      toast.error("Generation failed: " + err.message);
    },
  });

  // Approve strategy mutation
  const approveMutation = trpc.intelligenceReport.approveStrategy.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Strategy Approved — ready for Stage 3 content generation.");
    },
  });

  const handleGenerate = () => {
    if (!workspaceId) return;
    setGenerating(true);
    // Use workspace website URL — in real flow this comes from the audit
    generateMutation.mutate({
      workspaceId,
      websiteUrl: "blastly.ai", // Will be dynamic in production
    });
  };

  if (!user) return null;

  const reportData = report?.reportData as Record<string, unknown> | undefined;
  const sections = (reportData?.sections || {}) as Record<string, Record<string, unknown>>;
  const brandVoice = report?.brandVoice as { exact_phrases: string[]; differentiators: string[]; natural_tone: string; problems_they_solve: string[] } | null;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Client Intelligence Report</h1>
            <p className="text-sm text-white/50 mt-1">Stage 1 of 7 — the foundation for your content strategy</p>
          </div>
          <div className="flex items-center gap-2">
            {report && report.status === "complete" && !report.strategyApproved && (
              <Button
                size="sm"
                onClick={() => approveMutation.mutate({ workspaceId: workspaceId!, reportId: report.id })}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Approve Strategy
              </Button>
            )}
            {report && report.strategyApproved && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Strategy Approved
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerate}
              disabled={generating}
              className="border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Brain className="w-3.5 h-3.5 mr-1" />}
              {report ? "Regenerate" : "Generate Report"}
            </Button>
          </div>
        </div>

        {/* Overall confidence */}
        {report && (
          <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <Shield className="w-5 h-5 text-violet-400" />
            <div>
              <p className="text-sm text-white/90 font-medium">Overall Confidence Score: <span className="text-violet-300">{report.overallConfidenceScore}%</span></p>
              <p className="text-[10px] text-white/50">Based on {(report.sectionsCompleted as string[])?.length || 0} of 9 sections completed</p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !report && (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto">
              <Brain className="w-8 h-8 text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">No Intelligence Report Yet</h2>
            <p className="text-sm text-white/50 max-w-md mx-auto">
              Generate your Client Intelligence Report to unlock all 9 sections of market intelligence.
              This report feeds directly into your content strategy.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
              Generate Intelligence Report
            </Button>
          </div>
        )}

        {/* Report sections */}
        {report && report.status === "complete" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sections.business_snapshot && <BusinessSnapshot data={sections.business_snapshot} />}
            {sections.market_demand && <MarketDemand data={sections.market_demand} />}
            {sections.reputation_summary && <ReputationSummary data={sections.reputation_summary} />}
            {sections.visibility_baseline && <VisibilityBaseline data={sections.visibility_baseline} />}
            {sections.opportunity_gaps && <div className="lg:col-span-2"><OpportunityGaps data={sections.opportunity_gaps} /></div>}
            {sections.customer_journey && <CustomerJourney data={sections.customer_journey} />}
            {sections.quick_wins && <QuickWins data={sections.quick_wins} />}
            {sections.content_strategy_bridge && <div className="lg:col-span-2"><ContentStrategyBridge data={sections.content_strategy_bridge} /></div>}
            {brandVoice && <div className="lg:col-span-2"><BrandVoiceSection data={brandVoice} /></div>}
          </div>
        )}

        {/* Generating state */}
        {report && report.status === "generating" && (
          <div className="text-center py-20 space-y-4">
            <Loader2 className="w-12 h-12 text-violet-400 animate-spin mx-auto" />
            <h2 className="text-lg font-semibold text-white">Generating Intelligence Report...</h2>
            <p className="text-sm text-white/50">Analysing market data, competitors, and opportunities. This takes 30-60 seconds.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
