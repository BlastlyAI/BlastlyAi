#!/usr/bin/env python3
"""Replace the static URL input + sample preview in Home.tsx with a live inline scanner."""

import re

with open("/home/ubuntu/promoflow-ai/client/src/pages/Home.tsx", "r") as f:
    content = f.read()

# ── 1. Add trpc import at the top ─────────────────────────────────────────────
old_imports = 'import { useAuth } from "@/_core/hooks/useAuth";\nimport { getLoginUrl } from "@/const";\nimport { Button } from "@/components/ui/button";\nimport { Badge } from "@/components/ui/badge";\nimport { useLocation } from "wouter";\nimport {\n  Zap, BarChart3, Calendar, Users, Brain, TrendingUp,\n  ArrowRight, CheckCircle, Star, Play, Sparkles,\n  Target, Globe, Shield, ChevronRight, Search, Activity, Lock, FileText\n} from "lucide-react";'

new_imports = '''import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Zap, BarChart3, Calendar, Users, Brain, TrendingUp,
  ArrowRight, CheckCircle, Star, Play, Sparkles,
  Target, Globe, Shield, ChevronRight, Search, Activity, Lock, FileText,
  Loader2, AlertCircle, ExternalLink
} from "lucide-react";'''

content = content.replace(old_imports, new_imports, 1)

# ── 2. Replace the main Home function opening to add scanner state ─────────────
old_home_fn = '''export default function Home() {
  const { isAuthenticated } = useAuth();
  const loginUrl = getLoginUrl();
  const [, navigate] = useLocation();'''

new_home_fn = '''// ── Inline scan result types ─────────────────────────────────────────────────
type PlatformScore = {
  platform: string; found: boolean; url?: string | null; handle?: string | null;
  followers?: number | null; score: number; grade: string; isActive?: boolean;
  isDormant?: boolean; strengths?: string[]; weaknesses?: string[]; recommendations?: string[];
  postingFrequency?: string;
};
type ScanResult = {
  websiteUrl: string; brandName: string; brandIndustry: string;
  overallScore: number; overallGrade: string; overallSummary: string;
  websiteSeoScore: number;
  discoveredProfiles: { platform: string; url: string; handle: string; found: boolean }[];
  platformScores: PlatformScore[];
  platformGapAnalysis: { missingPlatforms: { platform: string; priority: string; reason: string }[]; gapScore: number; summary: string };
  contentConsistency: { score: number; issues: string[]; summary: string };
  postingCadence: { overallHealth: string; dormantAccounts: string[]; activeAccounts: string[]; summary: string; recommendation: string };
  aiVisibilityScore: { score: number; grade: string; likelyMentionedInAI: boolean; factors: string[]; summary: string; recommendations: string[] };
  actionPlan: { week: number; priority: string; platform: string; action: string; description: string; estimatedImpact: string; canCreateInBlastly: boolean }[];
  topRecommendations: { priority: string; platform: string; issue: string; fix: string }[];
  isSaved: boolean;
};

const PLATFORM_COLORS: Record<string, string> = {
  facebook: "text-blue-400", instagram: "text-pink-400", tiktok: "text-slate-300",
  youtube: "text-red-400", linkedin: "text-sky-400", twitter: "text-slate-300",
  pinterest: "text-rose-400", snapchat: "text-yellow-400", threads: "text-slate-300",
};

function gradeColor(grade: string) {
  if (grade.startsWith("A")) return "text-emerald-400";
  if (grade.startsWith("B")) return "text-blue-400";
  if (grade.startsWith("C")) return "text-amber-400";
  return "text-red-400";
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const loginUrl = getLoginUrl();
  const [, navigate] = useLocation();
  const [scanUrl, setScanUrl] = React.useState("");
  const [scanResult, setScanResult] = React.useState<ScanResult | null>(null);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const resultsRef = React.useRef<HTMLDivElement>(null);

  const publicScan = trpc.socialScan.publicScanPresence.useMutation({
    onSuccess: (data) => {
      setScanResult(data as ScanResult);
      setScanError(null);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    },
    onError: (err) => {
      setScanError(err.message || "Scan failed. Please check the URL and try again.");
    },
  });

  function handleScan() {
    if (!scanUrl.trim()) return;
    let url = scanUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
    setScanResult(null);
    setScanError(null);
    publicScan.mutate({ websiteUrl: url });
  }'''

content = content.replace(old_home_fn, new_home_fn, 1)

# ── 3. Replace the URL Input + Sample Report Preview with live scanner ─────────
old_input_section = '''            {/* ── URL Input — the primary CTA ── */}
            <div className="max-w-2xl mx-auto mb-4">
              <div className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl border border-border bg-card shadow-lg shadow-primary/5">
                <div className="flex items-center gap-2 flex-1 px-3">
                  <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground text-sm flex-1 text-left">yourwebsite.com</span>
                </div>
                <Button
                  size="lg"
                  className="btn-gradient text-white border-0 h-11 px-8 text-sm font-semibold whitespace-nowrap"
                  onClick={() => {
                    if (isAuthenticated) navigate("/dashboard/digital-presence");
                    else window.location.href = loginUrl;
                  }}
                >
                  Scan My Business Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">No credit card. No sign-up required to preview. Takes 60 seconds.</p>
            </div>'''

new_input_section = '''            {/* ── URL Input — live inline scanner ── */}
            <div className="max-w-2xl mx-auto mb-4">
              <div className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl border border-border bg-card shadow-lg shadow-primary/5">
                <div className="flex items-center gap-2 flex-1 px-3">
                  <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <input
                    type="text"
                    value={scanUrl}
                    onChange={e => setScanUrl(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleScan()}
                    placeholder="yourwebsite.com.au"
                    className="bg-transparent text-sm flex-1 text-foreground placeholder:text-muted-foreground outline-none min-w-0"
                    disabled={publicScan.isPending}
                  />
                </div>
                <Button
                  size="lg"
                  className="btn-gradient text-white border-0 h-11 px-8 text-sm font-semibold whitespace-nowrap"
                  onClick={handleScan}
                  disabled={publicScan.isPending || !scanUrl.trim()}
                >
                  {publicScan.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning…</>
                  ) : (
                    <>Scan My Business Free<ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">No credit card. No sign-up required. Results appear below in ~60 seconds.</p>
            </div>
            {/* ── Scan error ── */}
            {scanError && (
              <div className="max-w-2xl mx-auto mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {scanError}
              </div>
            )}
            {/* ── Scanning progress indicator ── */}
            {publicScan.isPending && (
              <div className="max-w-3xl mx-auto mb-4 p-5 rounded-2xl border border-border bg-card shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                  <span className="text-sm font-semibold text-foreground">Scanning your digital presence…</span>
                </div>
                <div className="space-y-2">
                  {["Fetching your website", "Discovering social media profiles", "Analysing each platform", "Running AI competitor analysis", "Generating your report"].map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}'''

content = content.replace(old_input_section, new_input_section, 1)

# ── 4. Replace the static Sample Report Preview with live results ──────────────
# Find the sample report preview section and replace it
old_sample_start = '            {/* ── Sample Report Preview — show what they\'ll get ── */}'
old_sample_end = '''            {/* Social proof */}
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">'''

# Find positions
start_idx = content.find(old_sample_start)
end_idx = content.find(old_sample_end)

if start_idx == -1 or end_idx == -1:
    print(f"ERROR: Could not find sample section. start={start_idx}, end={end_idx}")
    exit(1)

new_results_section = '''            {/* ── Live Scan Results OR Static Sample Preview ── */}
            <div ref={resultsRef}>
            {scanResult ? (
              /* ── LIVE RESULTS ── */
              <div className="max-w-3xl mx-auto mt-6 rounded-2xl border border-violet-500/30 bg-card shadow-xl overflow-hidden">
                {/* Results header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-violet-500/5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold text-foreground">{scanResult.brandName || scanResult.websiteUrl}</span>
                    {scanResult.brandIndustry && <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{scanResult.brandIndustry}</span>}
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Live Report</span>
                </div>
                <div className="p-5 space-y-5">
                  {/* Overall score */}
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-18 h-18 rounded-full border-4 border-violet-500/40 flex items-center justify-center bg-violet-500/10 w-16 h-16">
                      <span className={`text-xl font-extrabold ${gradeColor(scanResult.overallGrade)}`}>{scanResult.overallScore}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-semibold text-foreground">Digital Presence Score</div>
                      <div className={`text-xs mb-1.5 ${gradeColor(scanResult.overallGrade)}`}>Grade {scanResult.overallGrade}</div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div className="bg-gradient-to-r from-violet-500 to-blue-500 h-1.5 rounded-full transition-all duration-1000" style={{width: `${scanResult.overallScore}%`}} />
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right hidden sm:block">
                      <div className="text-xs text-muted-foreground">SEO Score</div>
                      <div className="text-sm font-bold text-blue-400">{scanResult.websiteSeoScore}/100</div>
                    </div>
                  </div>
                  {/* Summary */}
                  {scanResult.overallSummary && (
                    <p className="text-xs text-muted-foreground text-left leading-relaxed bg-muted/30 rounded-lg p-3">{scanResult.overallSummary}</p>
                  )}
                  {/* Platform grid */}
                  <div>
                    <div className="text-xs font-semibold text-foreground mb-2 text-left">Social Platforms Found ({scanResult.discoveredProfiles.length})</div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {["facebook","instagram","tiktok","youtube","linkedin","twitter"].map(platform => {
                        const ps = scanResult.platformScores.find(p => p.platform === platform);
                        const found = ps?.found ?? false;
                        const score = ps?.score ?? 0;
                        const color = PLATFORM_COLORS[platform] || "text-slate-400";
                        const label = platform === "twitter" ? "X" : platform.charAt(0).toUpperCase() + platform.slice(1);
                        return (
                          <div key={platform} className={`p-2 rounded-lg text-center ${found ? "bg-muted/40" : "bg-red-500/8 border border-red-500/20"}`}>
                            <div className={`text-[10px] font-semibold ${color}`}>{label}</div>
                            <div className={`text-sm font-bold ${found ? "text-foreground" : "text-red-400"}`}>{found ? score : "—"}</div>
                            <div className="text-[9px] text-muted-foreground">{found ? "/100" : "Missing"}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Top recommendation */}
                  {scanResult.topRecommendations[0] && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/8 border border-amber-500/20">
                      <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-300 text-left">
                        <span className="font-semibold">Top opportunity:</span> {scanResult.topRecommendations[0].fix}
                      </p>
                    </div>
                  )}
                  {/* Missing platforms */}
                  {scanResult.platformGapAnalysis.missingPlatforms.length > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/8 border border-red-500/20">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-300 text-left">
                        <span className="font-semibold">Platform gaps:</span> You are missing {scanResult.platformGapAnalysis.missingPlatforms.map(p => p.platform).join(", ")}.
                      </p>
                    </div>
                  )}
                  {/* AI Visibility */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                    <Brain className="w-4 h-4 text-violet-400 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="text-xs font-semibold text-foreground">AI Visibility Score</div>
                      <div className="text-[10px] text-muted-foreground">{scanResult.aiVisibilityScore.summary?.slice(0, 100)}</div>
                    </div>
                    <div className={`text-sm font-bold ${gradeColor(scanResult.aiVisibilityScore.grade)}`}>{scanResult.aiVisibilityScore.score}/100</div>
                  </div>
                  {/* Save / sign up CTA */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-border">
                    <div className="flex-1 text-left">
                      <div className="text-xs font-semibold text-foreground">Want to save this report and get your full 30-day action plan?</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Free account — no credit card required.</div>
                    </div>
                    <Button size="sm" className="btn-gradient text-white border-0 whitespace-nowrap" asChild>
                      <a href={loginUrl}>Save My Report Free <ArrowRight className="w-3.5 h-3.5 ml-1" /></a>
                    </Button>
                  </div>
                </div>
              </div>
            ) : !publicScan.isPending ? (
              /* ── STATIC SAMPLE PREVIEW (shown before any scan) ── */
              <div className="max-w-3xl mx-auto mt-10 rounded-2xl border border-border bg-card shadow-xl shadow-primary/5 overflow-hidden">
                {/* Report header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="ml-2 text-xs text-muted-foreground font-mono">blastly.io/report — example.com.au</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">Sample Report</span>
                </div>
                {/* Report body */}
                <div className="p-5 space-y-4">
                  {/* Score row */}
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-16 h-16 rounded-full border-4 border-violet-500/40 flex items-center justify-center bg-violet-500/10">
                      <span className="text-xl font-extrabold text-violet-400">84</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-semibold text-foreground">Digital Presence Score</div>
                      <div className="text-xs text-muted-foreground mb-1.5">Grade A — Strong presence, 2 gaps found</div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div className="bg-gradient-to-r from-violet-500 to-blue-500 h-1.5 rounded-full" style={{width: "84%"}} />
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right hidden sm:block">
                      <div className="text-xs text-muted-foreground">vs. top competitor</div>
                      <div className="text-sm font-bold text-emerald-400">+12 pts ahead</div>
                    </div>
                  </div>
                  {/* Platform grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { label: "Facebook", score: 72, color: "text-blue-400", found: true },
                      { label: "Instagram", score: 88, color: "text-pink-400", found: true },
                      { label: "TikTok", score: 0, color: "text-slate-400", found: false },
                      { label: "YouTube", score: 65, color: "text-red-400", found: true },
                      { label: "LinkedIn", score: 91, color: "text-sky-400", found: true },
                      { label: "X", score: 0, color: "text-slate-400", found: false },
                    ].map(({ label, score, color, found }) => (
                      <div key={label} className={`p-2 rounded-lg text-center ${found ? "bg-muted/40" : "bg-red-500/8 border border-red-500/20"}`}>
                        <div className={`text-[10px] font-semibold ${color}`}>{label}</div>
                        <div className={`text-sm font-bold ${found ? "text-foreground" : "text-red-400"}`}>{found ? score : "—"}</div>
                        <div className="text-[9px] text-muted-foreground">{found ? "/100" : "Missing"}</div>
                      </div>
                    ))}
                  </div>
                  {/* AI insight strip */}
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/8 border border-amber-500/20">
                    <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300 text-left"><span className="font-semibold">Top opportunity:</span> Your TikTok account is missing — your #1 competitor has 14,200 followers there. Claiming it this week could add ~800 monthly visitors.</p>
                  </div>
                  {/* Competitor row */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                    <Target className="w-4 h-4 text-violet-400 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="text-xs font-semibold text-foreground">5 Competitors Scanned</div>
                      <div className="text-[10px] text-muted-foreground">competitor1.com.au · competitor2.com.au · +3 more</div>
                    </div>
                    <div className="text-xs text-emerald-400 font-semibold whitespace-nowrap">See full report →</div>
                  </div>
                  {/* Enter URL prompt */}
                  <div className="text-center pt-1">
                    <p className="text-xs text-muted-foreground">↑ Enter your website URL above to see your real report</p>
                  </div>
                </div>
              </div>
            ) : null}
            </div>

'''

content = content[:start_idx] + new_results_section + content[end_idx:]

with open("/home/ubuntu/promoflow-ai/client/src/pages/Home.tsx", "w") as f:
    f.write(content)

print("SUCCESS: Home.tsx updated with live inline scanner")
print(f"New file length: {len(content.splitlines())} lines")
