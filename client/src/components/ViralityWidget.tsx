import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TrendingUp, Loader2, Zap, AlertCircle, CheckCircle2, Twitter, Linkedin, Facebook, Instagram } from "lucide-react";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  twitter: <Twitter className="w-3.5 h-3.5" />,
  linkedin: <Linkedin className="w-3.5 h-3.5" />,
  facebook: <Facebook className="w-3.5 h-3.5" />,
  instagram: <Instagram className="w-3.5 h-3.5" />,
};

type ViralityResult = {
  platform: string;
  score: number;
  confidence: number;
  suggestions: string[];
  factors: string[];
};

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

export function ViralityWidget({
  workspaceId,
  content,
  hashtags,
  platforms,
  postId,
}: {
  workspaceId: number;
  content: string;
  hashtags?: string[];
  platforms: string[];
  postId?: number;
}) {
  const [results, setResults] = useState<ViralityResult[]>([]);
  const [isScoring, setIsScoring] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const predict = trpc.agents.predictVirality.useMutation({
    onSuccess: (data) => {
      setIsScoring(false);
      setResults(data as ViralityResult[]);
    },
    onError: (err) => {
      setIsScoring(false);
      toast.error(err.message);
    },
  });

  const handleScore = () => {
    if (!content || platforms.length === 0) return;
    setIsScoring(true);
    setResults([]);
    predict.mutate({ workspaceId, content, hashtags, platforms: platforms as any[], postId });
  };

  const avgScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : null;

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Virality Predictor</span>
          {avgScore !== null && (
            <Badge variant="outline" className={`text-[10px] ${
              avgScore >= 75 ? "border-emerald-200 text-emerald-600" :
              avgScore >= 50 ? "border-amber-200 text-amber-600" :
              "border-red-200 text-red-500"
            }`}>
              Avg: {avgScore}/100
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1.5"
          onClick={handleScore}
          disabled={!content || platforms.length === 0 || isScoring}
        >
          {isScoring ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
          {isScoring ? "Scoring…" : results.length > 0 ? "Re-score" : "Score Virality"}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r) => (
            <div key={r.platform} className="rounded-lg bg-background border border-border/50 overflow-hidden">
              <button
                className="w-full flex items-center gap-3 p-2.5 hover:bg-muted/30 transition-colors text-left"
                onClick={() => setExpanded(expanded === r.platform ? null : r.platform)}
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-muted-foreground">{PLATFORM_ICONS[r.platform]}</span>
                  <span className="text-xs font-medium capitalize">{r.platform}</span>
                </div>
                <ScoreRing score={r.score} size={36} />
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">confidence</p>
                  <p className="text-xs font-semibold">{r.confidence}%</p>
                </div>
              </button>

              {expanded === r.platform && (
                <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2">
                  {/* Algorithm factors */}
                  {r.factors?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Key Factors</p>
                      <div className="flex flex-wrap gap-1.5">
                        {r.factors.map((f, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">{f}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {r.suggestions?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Improvement Suggestions</p>
                      <ul className="space-y-1">
                        {r.suggestions.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs">
                            <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !isScoring && (
        <p className="text-xs text-muted-foreground text-center py-1">
          Click "Score Virality" to get AI-powered engagement predictions per platform
        </p>
      )}
    </div>
  );
}
