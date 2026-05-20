import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Bot, Zap, Globe, Sparkles, BarChart2, CheckCircle2, Clock,
  AlertCircle, ChevronRight, Play, ThumbsUp, Loader2, Twitter,
  Linkedin, Facebook, Instagram, Target, TrendingUp,
} from "lucide-react";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  twitter: <Twitter className="w-3.5 h-3.5" />,
  linkedin: <Linkedin className="w-3.5 h-3.5" />,
  facebook: <Facebook className="w-3.5 h-3.5" />,
  instagram: <Instagram className="w-3.5 h-3.5" />,
};

const PLATFORM_COLORS: Record<string, string> = {
  twitter: "bg-sky-500/10 text-sky-600 border-sky-200",
  linkedin: "bg-blue-600/10 text-blue-700 border-blue-200",
  facebook: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
  instagram: "bg-pink-500/10 text-pink-600 border-pink-200",
};

const STEP_ICONS: Record<string, React.ReactNode> = {
  "Fetching website content": <Globe className="w-4 h-4" />,
  "Extracting features & benefits": <Sparkles className="w-4 h-4" />,
  "Generating campaign brief": <Target className="w-4 h-4" />,
  "Generating platform posts": <Bot className="w-4 h-4" />,
  "Scoring virality": <TrendingUp className="w-4 h-4" />,
};

type AgentRun = {
  id: number;
  status: string;
  inputData: any;
  steps: any[];
  outputData: any;
  createdAt: Date;
};

function StepIndicator({ step }: { step: any }) {
  const icon = STEP_ICONS[step.stepName] ?? <Zap className="w-4 h-4" />;
  return (
    <div className="flex items-center gap-3 py-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
        step.status === "completed" ? "bg-emerald-500/10 text-emerald-600" :
        step.status === "running" ? "bg-primary/10 text-primary" :
        step.status === "failed" ? "bg-red-500/10 text-red-500" :
        "bg-muted text-muted-foreground"
      }`}>
        {step.status === "running" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
         step.status === "completed" ? <CheckCircle2 className="w-3.5 h-3.5" /> :
         step.status === "failed" ? <AlertCircle className="w-3.5 h-3.5" /> : icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{step.stepName}</p>
        {step.output && step.status === "completed" && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {typeof step.output === "object" && step.output.title
              ? `Found: "${step.output.title}"`
              : typeof step.output === "object" && step.output.platforms
              ? `Generated for: ${(step.output.platforms as string[]).join(", ")}`
              : typeof step.output === "object" && step.output.campaignName
              ? `"${step.output.campaignName}"`
              : "Completed"}
          </p>
        )}
      </div>
      <Badge variant="outline" className={`text-[10px] ${
        step.status === "completed" ? "border-emerald-200 text-emerald-600" :
        step.status === "running" ? "border-primary/30 text-primary" :
        step.status === "failed" ? "border-red-200 text-red-500" : ""
      }`}>
        {step.status}
      </Badge>
    </div>
  );
}

function RunCard({ run, onApprove }: { run: AgentRun; onApprove: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const output = run.outputData as any;
  const input = run.inputData as any;
  const steps = (run.steps as any[]) ?? [];

  const statusColor: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    awaiting_approval: "bg-amber-500/10 text-amber-600 border-amber-200",
    running: "bg-primary/10 text-primary border-primary/20",
    failed: "bg-red-500/10 text-red-500 border-red-200",
    approved: "bg-blue-500/10 text-blue-600 border-blue-200",
    pending: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Bot className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">{output?.brief?.campaignName ?? "Campaign Agent Run"}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{input?.url}</p>
            </div>
          </div>
          <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColor[run.status] ?? ""}`}>
            {run.status.replace("_", " ")}
          </Badge>
        </div>

        {/* Virality scores summary */}
        {output?.viralityScores && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {Object.entries(output.viralityScores as Record<string, any>).map(([platform, vs]) => (
              <div key={platform} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs ${PLATFORM_COLORS[platform] ?? ""}`}>
                {PLATFORM_ICONS[platform]}
                <span className="font-semibold">{(vs as any).score}/100</span>
              </div>
            ))}
          </div>
        )}

        {/* Steps */}
        {steps.length > 0 && (
          <div className="border-t border-border/40 pt-3 mt-1">
            <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2">
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} />
              {steps.length} agent steps
            </button>
            {expanded && (
              <div className="space-y-0.5 divide-y divide-border/30">
                {steps.map((step: any, i: number) => <StepIndicator key={i} step={step} />)}
              </div>
            )}
          </div>
        )}

        {/* Platform posts preview */}
        {expanded && output?.platformPosts && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Generated Posts</p>
            {Object.entries(output.platformPosts as Record<string, any>).map(([platform, post]: [string, any]) => (
              <div key={platform} className={`p-3 rounded-lg border text-xs ${PLATFORM_COLORS[platform] ?? "border-border"}`}>
                <div className="flex items-center gap-1.5 mb-1.5 font-semibold capitalize">
                  {PLATFORM_ICONS[platform]}{platform}
                </div>
                <p className="text-foreground leading-relaxed">{post.text}</p>
                {post.hashtags?.length > 0 && (
                  <p className="mt-1.5 opacity-70">{post.hashtags.map((h: string) => `#${h}`).join(" ")}</p>
                )}
                <p className="mt-1.5 opacity-60">⏰ {new Date(post.scheduledAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}

        {/* Approval button */}
        {run.status === "awaiting_approval" && (
          <div className="mt-3 pt-3 border-t border-border/40">
            <Button size="sm" className="w-full gap-2" onClick={() => onApprove(run.id)}>
              <ThumbsUp className="w-3.5 h-3.5" />Approve & Schedule Campaign
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AgentPage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id ?? 0;

  const [url, setUrl] = useState("");
  const [goal, setGoal] = useState<"awareness" | "traffic" | "engagement" | "conversions" | "leads">("awareness");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["twitter", "linkedin"]);
  const [requireApproval, setRequireApproval] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);

  const { data: runs = [], refetch } = trpc.agents.listAgentRuns.useQuery(
    { workspaceId: wsId, type: "campaign_agent" },
    { enabled: !!wsId, refetchInterval: isRunning ? 3000 : false }
  );

  const runAgent = trpc.agents.runCampaignAgent.useMutation({
    onSuccess: (data) => {
      setIsRunning(false);
      setActiveRunId(data.runId);
      refetch();
      toast.success(data.status === "awaiting_approval" ? "Campaign ready for approval!" : "Campaign agent completed!");
    },
    onError: (err) => {
      setIsRunning(false);
      toast.error(err.message);
    },
  });

  const approveRun = trpc.agents.approveAgentRun.useMutation({
    onSuccess: () => { refetch(); toast.success("Campaign approved and scheduled!"); },
  });

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleRun = () => {
    if (!url || selectedPlatforms.length === 0 || !wsId) return;
    setIsRunning(true);
    runAgent.mutate({
      workspaceId: wsId,
      url,
      goal,
      platforms: selectedPlatforms as any[],
      requireApproval,
    });
  };

  return (
    <AppLayout title="Campaign Agent">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Autonomous Campaign Agent
            </h1>
            <p className="text-sm text-muted-foreground">Provide a URL and goal — the AI handles everything else</p>
          </div>
        </div>

        {/* Command input */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500" />
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Website or App URL</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="https://yourproduct.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Campaign Goal</Label>
                <Select value={goal} onValueChange={(v) => setGoal(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["awareness", "traffic", "engagement", "conversions", "leads"].map(g => (
                      <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Target Platforms</Label>
                <div className="flex gap-2 flex-wrap">
                  {["twitter", "linkedin", "facebook", "instagram", "tiktok"].map(p => (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        selectedPlatforms.includes(p)
                          ? `${PLATFORM_COLORS[p]} shadow-sm`
                          : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {PLATFORM_ICONS[p]}
                      <span className="capitalize">{p}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="approval"
                  checked={requireApproval}
                  onCheckedChange={(v) => setRequireApproval(!!v)}
                />
                <Label htmlFor="approval" className="text-sm cursor-pointer">
                  Require approval before publishing
                </Label>
              </div>
              <Button
                onClick={handleRun}
                disabled={!url || selectedPlatforms.length === 0 || isRunning || !wsId}
                className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
              >
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {isRunning ? "Agent Running…" : "Launch Agent"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* How it works */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { icon: Globe, label: "Fetches URL", color: "text-blue-500" },
            { icon: Sparkles, label: "Extracts insights", color: "text-violet-500" },
            { icon: Bot, label: "Writes posts", color: "text-indigo-500" },
            { icon: TrendingUp, label: "Scores virality", color: "text-emerald-500" },
            { icon: Clock, label: "Schedules optimally", color: "text-amber-500" },
          ].map(({ icon: Icon, label, color }, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 text-center">
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* Run history */}
        {(runs as AgentRun[]).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Agent Run History</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {(runs as AgentRun[]).map((run) => (
                <RunCard
                  key={run.id}
                  run={run}
                  onApprove={(id) => approveRun.mutate({ runId: id, workspaceId: wsId })}
                />
              ))}
            </div>
          </div>
        )}

        {(runs as AgentRun[]).length === 0 && !isRunning && (
          <div className="text-center py-16 text-muted-foreground">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No agent runs yet</p>
            <p className="text-sm mt-1">Enter a URL above to launch your first autonomous campaign</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
