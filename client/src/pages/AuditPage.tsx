import { useState, useEffect, useCallback } from "react";
import { runAuditApi } from "@/lib/auditApi";
import { useAuth } from "@/_core/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLocation } from "wouter";
import AuditAnalyzingScreen from "@/components/premium/AuditAnalyzingScreen";
import {
  BarChart2, Sparkles, Globe, Loader2,
  ArrowRight, Shield, Zap, TrendingUp, Star, Search,
} from "lucide-react";

const FEATURES = [
  { icon: Sparkles, title: "AI Content Generation", desc: "Platform-tailored captions, hashtags & variations in seconds" },
  { icon: BarChart2, title: "Smart Analytics", desc: "UTM tracking, ROI predictions, and cross-channel insights" },
  { icon: Zap, title: "Autonomous Agent", desc: "One URL → full campaign, scheduled and published automatically" },
  { icon: TrendingUp, title: "Virality Predictor", desc: "AI scores your posts before publishing with improvement tips" },
  { icon: Shield, title: "Brand Voice Cloner", desc: "Train AI on your content so every post sounds exactly like you" },
  { icon: Star, title: "Competitor Intelligence", desc: "Monitor rivals, spot trends, and auto-generate counter-content" },
];

export default function AuditPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { currentWorkspace } = useWorkspace();

  // Read ?url= and ?trial= query params pre-filled from the homepage.
  const searchParams = new URLSearchParams(window.location.search);
  const prefillUrl = searchParams.get("url") ?? "";
  const isTrial = searchParams.get("trial") === "1";

  const [url, setUrl] = useState(prefillUrl);
  // If a URL was passed from the homepage, start in loading state immediately
  const [isRunning, setIsRunning] = useState(!!prefillUrl);

  const submitAudit = useCallback(
    (rawUrl: string) => {
      const trimmed = rawUrl.trim();
      if (!trimmed) {
        toast.error("Please enter your website or social media URL");
        return;
      }
      const normalised = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
      setIsRunning(true);

      void runAuditApi({
        businessName: normalised,
        website: normalised,
        workspaceId: isAuthenticated ? currentWorkspace?.supabaseId ?? null : null,
      })
        .then((data) => {
          navigate(`/audit/report/${data.shareToken}`);
        })
        .catch((err: Error) => {
          setIsRunning(false);
          toast.error(err.message);
        });
    },
    [navigate, isAuthenticated, currentWorkspace?.supabaseId]
  );

  // Auto-submit when a URL was pre-filled from the homepage
  useEffect(() => {
    if (prefillUrl) {
      submitAudit(prefillUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = () => submitAudit(url);

  // Running / countdown state
  if (isRunning) {
    const normalisedUrl = url.trim()
      ? (url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`)
      : prefillUrl
        ? (prefillUrl.startsWith("http") ? prefillUrl : `https://${prefillUrl}`)
        : undefined;
    return <AuditAnalyzingScreen website={normalisedUrl} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/60 px-6 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <a href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <img
            src="/manus-storage/blastly-icon-512_d2809e7c.png"
            alt="Blastly"
            className="w-9 h-9 rounded-xl object-cover"
          />
          <span className="text-xl font-black">Blastly</span>
        </a>
        <Badge variant="secondary" className="text-xs">14-day free trial</Badge>
      </nav>

      {/* Hero + URL input */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-background to-indigo-50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20 pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 py-20 text-center">
          <Badge variant="outline" className="mb-5 text-xs border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400 px-3 py-1">
            ✦ 14-day free trial · Includes free audit · No credit card required
          </Badge>
          <h1 className="text-4xl lg:text-6xl font-bold mb-5 leading-tight" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            Let's set up your
            <br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, oklch(0.52 0.22 145), oklch(0.62 0.22 200))" }}>
              free trial
            </span>
          </h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Enter your website below. We'll scan your business and social media, then set everything up for you — no forms, no hassle.
          </p>

          {/* URL input */}
          <div className="max-w-xl mx-auto">
            <div className="flex gap-3 p-2 bg-white/10 border-2 border-emerald-400/60 rounded-2xl shadow-xl shadow-emerald-500/20 backdrop-blur-sm">
              <div className="flex items-center pl-3 shrink-0">
                <Globe className="w-5 h-5 text-muted-foreground" />
              </div>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="yourwebsite.com.au"
                className="border-0 shadow-none focus-visible:ring-0 bg-transparent text-base h-11 px-2"
              />
              <Button
                onClick={handleSubmit}
                disabled={isRunning}
                className="gap-2 h-11 px-6 rounded-xl text-white font-bold shrink-0 transition-all duration-200"
                style={{ background: "linear-gradient(135deg, oklch(0.52 0.22 145), oklch(0.46 0.20 200))" }}
              >
                {isRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {isRunning ? "Running…" : "Start free trial →"}
                </span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Cancel any time · No credit card required · Takes ~15 seconds
            </p>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-10" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            What's included in your free trial
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: "📊", title: "Free Brand Audit", desc: "A full health score across content, ads, engagement, and growth — delivered instantly." },
              { icon: "📱", title: "Social Media Setup", desc: "We connect and configure all your platforms in one place." },
              { icon: "🤖", title: "AI Post Generation", desc: "One photo + voice note → posts across every platform in seconds." },
              { icon: "💰", title: "Ad Budget Planner", desc: "See exactly what your ad spend will achieve before you commit a dollar." },
              { icon: "📬", title: "Client CRM", desc: "Leads, messages, and reviews — all in one Command Centre." },
              { icon: "🚀", title: "14 Days Free", desc: "No credit card on day one. Use promo code FREE14 at checkout." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-card border border-border/60 rounded-2xl p-5 flex gap-4">
                <span className="text-2xl shrink-0">{icon}</span>
                <div>
                  <h3 className="font-semibold text-sm mb-1">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-6">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img
              src="/manus-storage/blastly-icon-512_d2809e7c.png"
              alt="Blastly"
              className="w-6 h-6 rounded object-cover"
            />
            <span className="font-semibold text-sm">Blastly</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Blastly. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
