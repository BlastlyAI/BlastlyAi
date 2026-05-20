import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Globe, Share2, Linkedin, Twitter, Copy, CheckCircle2,
  TrendingUp, AlertCircle, Zap, Target, BarChart3, ExternalLink
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function gradeColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-blue-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function gradeLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Work";
}

const PLATFORM_ICONS: Record<string, string> = {
  facebook: "🔵", instagram: "📸", twitter: "🐦", x: "✖️",
  linkedin: "💼", tiktok: "🎵", youtube: "▶️", pinterest: "📌",
};

export default function SharedReport() {
  const { token } = useParams<{ token: string }>();
  const [copied, setCopied] = useState(false);

  const { data: report, isLoading, error } = trpc.shareReport.getSharedReport.useQuery(
    { token: token ?? "" },
    { enabled: !!token }
  );

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareLinkedIn() {
    const text = encodeURIComponent(
      `I just scanned my business with Blastly and got a Digital Presence Score of ${report?.overallScore ?? "??"}/100. See the full report:`
    );
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${text}`, "_blank");
  }

  function shareX() {
    const text = encodeURIComponent(
      `My business scored ${report?.overallScore ?? "??"}/100 on Blastly's Digital Presence Scanner. Check out the full report 👇 ${shareUrl} via @BlastlyAI`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading report…</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="text-2xl font-bold">Report Not Found</h1>
          <p className="text-muted-foreground">This report link may have expired or doesn't exist.</p>
          <Link href="/">
            <Button className="btn-gradient">Scan Your Own Business Free</Button>
          </Link>
        </div>
      </div>
    );
  }

  const scanData = report.scanData as any;
  const platforms: any[] = scanData?.platforms ?? scanData?.discoveredProfiles ?? [];
  const actionPlan: any[] = scanData?.actionPlan ?? [];
  const gaps: any[] = scanData?.platformGaps ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl">Blastly</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyLink} className="gap-2">
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button variant="outline" size="sm" onClick={shareLinkedIn} className="gap-2">
              <Linkedin className="w-4 h-4 text-blue-400" />
              LinkedIn
            </Button>
            <Button variant="outline" size="sm" onClick={shareX} className="gap-2">
              <Twitter className="w-4 h-4" />
              X
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Score Card */}
        <Card className="border-border/50 bg-card overflow-hidden">
          <div className="bg-gradient-to-br from-primary/20 via-card to-card p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Score Ring */}
              <div className="relative w-36 h-36 shrink-0">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor"
                    strokeWidth="10" className="text-muted/30" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor"
                    strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${(report.overallScore ?? 0) * 3.14} 314`}
                    className={gradeColor(report.overallScore ?? 0)}
                    style={{ transition: "stroke-dasharray 1s ease" }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-black ${gradeColor(report.overallScore ?? 0)}`}>
                    {report.overallScore ?? "—"}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">/ 100</span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left space-y-2">
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground text-sm">{report.websiteUrl}</span>
                </div>
                <h1 className="text-3xl font-black">
                  Digital Presence Score:{" "}
                  <span className={gradeColor(report.overallScore ?? 0)}>
                    {gradeLabel(report.overallScore ?? 0)}
                  </span>
                </h1>
                <p className="text-muted-foreground">
                  {scanData?.summary ?? `This business scored ${report.overallScore ?? "—"}/100 on Blastly's full digital presence scan — covering website SEO, all social media platforms, competitor comparison, and AI visibility.`}
                </p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-1">
                  <Badge variant="secondary" className="gap-1">
                    <BarChart3 className="w-3 h-3" />
                    {platforms.length} platforms scanned
                  </Badge>
                  {gaps.length > 0 && (
                    <Badge variant="secondary" className="gap-1 text-amber-400 border-amber-400/30">
                      <AlertCircle className="w-3 h-3" />
                      {gaps.length} platform gaps found
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Platform Cards */}
        {platforms.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              Social Media Presence
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {platforms.map((p: any, i: number) => (
                <Card key={i} className="border-border/50 bg-card/60">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{PLATFORM_ICONS[p.platform?.toLowerCase()] ?? "🌐"}</span>
                        <span className="font-semibold capitalize">{p.platform}</span>
                      </div>
                      {p.found !== false ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Found
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                          <AlertCircle className="w-3 h-3 mr-1" /> Missing
                        </Badge>
                      )}
                    </div>
                    {p.score != null && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted/30 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-primary to-emerald-500"
                            style={{ width: `${p.score}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold ${gradeColor(p.score)}`}>{p.score}/100</span>
                      </div>
                    )}
                    {p.recommendations?.[0] && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{p.recommendations[0]}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Top Action Plan Items */}
        {actionPlan.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Top Recommendations
            </h2>
            <div className="space-y-3">
              {actionPlan.slice(0, 5).map((item: any, i: number) => (
                <Card key={i} className="border-border/50 bg-card/60">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{item.action ?? item.title}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <Separator />

        {/* CTA */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-card">
          <CardContent className="p-8 text-center space-y-4">
            <Target className="w-10 h-10 text-primary mx-auto" />
            <h2 className="text-2xl font-black">Want to see your own score?</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Enter your website URL and Blastly will scan all your social media, score your digital presence, and show you exactly how to beat your competitors — free, in under 60 seconds.
            </p>
            <Link href="/">
              <Button size="lg" className="btn-gradient gap-2 text-lg px-8 py-6">
                <Zap className="w-5 h-5" />
                Scan My Business Free
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground">No credit card. No account needed.</p>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 mt-12 py-6 text-center text-sm text-muted-foreground">
        <p>
          Powered by{" "}
          <Link href="/" className="text-primary hover:underline font-semibold">Blastly</Link>
          {" "}— Your full digital presence, in one scan.
        </p>
      </footer>
    </div>
  );
}
