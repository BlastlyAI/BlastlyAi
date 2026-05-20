import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLocation } from "wouter";
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

const MARKETING_FACTS = [
  { stat: "7", label: "touchpoints", detail: "A customer needs to see your brand at least 7 times before they decide to buy. Most small businesses only manage 2." },
  { stat: "23%", label: "more revenue", detail: "Businesses with consistent branding across all platforms generate up to 23% more revenue than those without." },
  { stat: "3×", label: "more traffic", detail: "Businesses that post on social media 5 or more times per week get 3× more website traffic than those that post once a week." },
  { stat: "78%", label: "of buyers", detail: "78% of consumers say a company's social media posts influence their decision to buy. Your feed is your storefront." },
  { stat: "$5.20", label: "return per $1", detail: "For every $1 spent on social media marketing, businesses earn an average return of $5.20. That's a 420% ROI." },
  { stat: "54%", label: "research online first", detail: "54% of social media users research products on social platforms before making a purchase. If you're not there, they'll find your competitor." },
  { stat: "10×", label: "more engagement", detail: "Video content generates 10× more engagement than text or image posts. One short video can outperform a month of static posts." },
  { stat: "91%", label: "of adults online", detail: "91% of Australian adults are online every day. Your next customer is scrolling right now — the question is whether they'll find you." },
  { stat: "60%", label: "discover brands", detail: "60% of people discover new products and businesses through Instagram alone. A dormant profile is a missed introduction every single day." },
  { stat: "4.4 billion", label: "social media users", detail: "There are 4.4 billion active social media users worldwide. Your local customers are among them — and they're looking for businesses like yours." },
  { stat: "2 hrs 21 min", label: "daily on social", detail: "The average person spends 2 hours and 21 minutes on social media every day. That's your window to be seen, remembered, and chosen." },
  { stat: "40×", label: "more reach", detail: "Content shared on social media reaches 40× more people than the same content published only on a website. Social is the amplifier." },
  { stat: "80%", label: "of leads ignored", detail: "80% of sales require at least 5 follow-up touchpoints, yet 44% of salespeople give up after just one. Consistent posting does the follow-up for you." },
  { stat: "1 in 3", label: "customers complain online", detail: "1 in 3 customers who have a bad experience will post about it online. But businesses that respond publicly retain 70% of those customers." },
  { stat: "6 seconds", label: "to make an impression", detail: "You have just 6 seconds to make a first impression online. A polished, active social profile is the difference between a click and a scroll-past." },
  { stat: "16 blogs", label: "per month = 3.5× leads", detail: "Businesses that publish 16 or more blog posts per month generate 3.5× more website traffic and 4.5× more leads than those that blog less." },
  { stat: "$4/day", label: "is all it takes", detail: "For less than the cost of a coffee a day, Blastly can post daily across all your platforms, write your blogs, and run your ads — automatically." },
  { stat: "70%", label: "prefer to learn via content", detail: "70% of consumers prefer to learn about a business through articles and social posts rather than traditional advertising. Content is the new cold call." },
  { stat: "5×", label: "cheaper to retain", detail: "It costs 5× more to attract a new customer than to keep an existing one. Regular social posting keeps your current customers engaged and coming back." },
  { stat: "30 days", label: "to see real results", detail: "Businesses that post consistently for just 30 days report measurable increases in website visits, enquiries, and brand recognition. It starts faster than you think." },
];

const ANALYSIS_STEPS = [
  "Scanning your website…",
  "Discovering your social media presence…",
  "Evaluating content quality & consistency…",
  "Estimating ad performance & cost metrics…",
  "Benchmarking against industry standards…",
  "Generating personalised recommendations…",
  "Preparing your onboarding profile…",
];

export default function AuditPage() {
  const [, navigate] = useLocation();

  // Read ?url= and ?trial= query params pre-filled from the homepage.
  const searchParams = new URLSearchParams(window.location.search);
  const prefillUrl = searchParams.get("url") ?? "";
  const isTrial = searchParams.get("trial") === "1";

  const [url, setUrl] = useState(prefillUrl);
  // If a URL was passed from the homepage, start in loading state immediately
  const [isRunning, setIsRunning] = useState(!!prefillUrl);

  // Countdown: starts at 15 and ticks down while audit runs
  const [countdown, setCountdown] = useState(15);
  const [stepIndex, setStepIndex] = useState(0);
  const [factIndex, setFactIndex] = useState(0);
  const [factVisible, setFactVisible] = useState(true);
  const factTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick the countdown every ~2 seconds while running
  useEffect(() => {
    if (!isRunning) return;
    setCountdown(15);
    setStepIndex(0);
    // Randomise starting fact
    setFactIndex(Math.floor(Math.random() * MARKETING_FACTS.length));
    setFactVisible(true);
    const interval = setInterval(() => {
      setCountdown(prev => (prev > 1 ? prev - 1 : 1));
      setStepIndex(prev => (prev < ANALYSIS_STEPS.length - 1 ? prev + 1 : prev));
    }, 2000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Rotate facts every 4 seconds with a fade transition
  useEffect(() => {
    if (!isRunning) return;
    factTimer.current = setInterval(() => {
      setFactVisible(false);
      setTimeout(() => {
        setFactIndex(prev => (prev + 1) % MARKETING_FACTS.length);
        setFactVisible(true);
      }, 400);
    }, 4000);
    return () => { if (factTimer.current) clearInterval(factTimer.current); };
  }, [isRunning]);

  const runAudit = trpc.audit.runAudit.useMutation({
    onSuccess: (data) => {
      // Always show the full report page first — the report has the "Fix my brand" CTA
      // that takes customers to onboarding. Never skip the report page.
      navigate(`/audit/report/${data.shareToken}`);
    },
    onError: (err) => {
      setIsRunning(false);
      toast.error(err.message);
    },
  });

  const submitAudit = useCallback((rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      toast.error("Please enter your website or social media URL");
      return;
    }
    const normalised = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    setIsRunning(true);
    runAudit.mutate({
      businessName: normalised,
      website: normalised,
      industry: undefined,
      handles: undefined,
      adSpend: undefined,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // Circumference of the progress ring (r=46)
    const circumference = 2 * Math.PI * 46; // ≈ 289
    const progress = ((15 - countdown) / 15) * circumference;

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: "oklch(0.07 0.015 250)" }}
      >
        <div className="text-center max-w-sm w-full">

          {/* Countdown ring */}
          <div className="relative w-36 h-36 mx-auto mb-10">
            {/* Track */}
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" fill="none" stroke="oklch(0.18 0.018 248)" strokeWidth="5" />
              {/* Progress arc */}
              <circle
                cx="50" cy="50" r="46" fill="none"
                stroke="oklch(0.52 0.22 145)" strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${progress} ${circumference}`}
                style={{ transition: "stroke-dasharray 0.8s ease" }}
              />
            </svg>
            {/* Spinning outer ring */}
            <svg
              className="absolute inset-0 w-full h-full"
              style={{ animation: "spin 3s linear infinite" }}
              viewBox="0 0 100 100"
            >
              <circle
                cx="50" cy="50" r="46" fill="none"
                stroke="oklch(0.52 0.22 145 / 0.25)" strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="20 269"
              />
            </svg>
            {/* Logo + countdown number */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <img
                src="/manus-storage/blastly-icon-512_d2809e7c.png"
                alt="Blastly"
                className="w-10 h-10 rounded-xl object-cover"
              />
              <span
                className="text-2xl font-black tabular-nums"
                style={{ color: "oklch(0.72 0.22 145)", fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {countdown}
              </span>
            </div>
          </div>

          {/* Headline */}
          <h2
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: "oklch(0.95 0.008 240)" }}
          >
            Collecting your data
          </h2>
          <p className="text-lg font-semibold mb-6" style={{ color: "oklch(0.72 0.22 145)" }}>
            and social media — hold tight!
          </p>

          {/* Current step */}
          <p
            className="text-sm mb-8 min-h-[1.5rem] transition-all duration-500"
            style={{ color: "oklch(0.55 0.014 240)" }}
          >
            {ANALYSIS_STEPS[stepIndex]}
          </p>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5">
            {ANALYSIS_STEPS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-500"
                style={{
                  width: i === stepIndex ? "20px" : "6px",
                  height: "6px",
                  background: i <= stepIndex
                    ? "oklch(0.52 0.22 145)"
                    : "oklch(0.25 0.015 245)",
                }}
              />
            ))}
          </div>

          {/* Email note */}
          <p className="text-xs mt-8" style={{ color: "oklch(0.40 0.012 240)" }}>
            You'll receive a copy of your audit report by email once it's complete.
          </p>
        </div>

        {/* ── Rotating Marketing Facts Carousel ─────────────────────────── */}
        <div className="w-full max-w-sm mt-10 mx-auto">
          {/* Fact card */}
          <div
            className="rounded-2xl p-5 text-center"
            style={{
              background: "oklch(0.11 0.018 248)",
              border: "1px solid oklch(0.52 0.22 145 / 0.25)",
              transition: "opacity 0.4s ease",
              opacity: factVisible ? 1 : 0,
              minHeight: "130px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {/* Big stat */}
            <div
              className="text-4xl font-black tabular-nums leading-none"
              style={{ color: "oklch(0.72 0.22 145)", fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {MARKETING_FACTS[factIndex].stat}
            </div>
            {/* Label */}
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "oklch(0.55 0.014 240)" }}>
              {MARKETING_FACTS[factIndex].label}
            </div>
            {/* Detail */}
            <p className="text-xs leading-relaxed" style={{ color: "oklch(0.50 0.012 240)" }}>
              {MARKETING_FACTS[factIndex].detail}
            </p>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-1 mt-3">
            {MARKETING_FACTS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === factIndex ? "16px" : "4px",
                  height: "4px",
                  background: i === factIndex
                    ? "oklch(0.52 0.22 145)"
                    : "oklch(0.22 0.015 245)",
                }}
              />
            ))}
          </div>

          {/* Did you know label */}
          <p className="text-center text-xs mt-3 font-medium" style={{ color: "oklch(0.35 0.012 240)" }}>
            Did you know? · {factIndex + 1} of {MARKETING_FACTS.length}
          </p>
        </div>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
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
                disabled={runAudit.isPending}
                className="gap-2 h-11 px-6 rounded-xl text-white font-bold shrink-0 transition-all duration-200"
                style={{ background: "linear-gradient(135deg, oklch(0.52 0.22 145), oklch(0.46 0.20 200))" }}
              >
                {runAudit.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {runAudit.isPending ? "Running…" : "Start free trial →"}
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
