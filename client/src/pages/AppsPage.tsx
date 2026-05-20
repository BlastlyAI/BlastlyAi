import { Link } from "wouter";
import { ArrowRight, Zap, ExternalLink, FlaskConical, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── App registry ───────────────────────────────────────────────────────────
// To add a new app, just add an entry to this list.
const APPS = [
  {
    name: "Blastly",
    tagline: "The AI marketing team that never sleeps",
    description:
      "Blastly creates, schedules, and optimises your social media content across all your connected platforms — AI-powered and human verified. From one URL to a full content plan in minutes.",
    url: "/",
    external: false,
    status: "beta" as const,
    color: "from-blue-500 to-cyan-500",
    initials: "B",
    features: ["AI content generation", "Multi-platform scheduling", "Analytics & ROI tracking", "AI Video Studio"],
  },
  {
    name: "Coach Nova",
    tagline: "Your AI-powered personal health & fitness coach",
    description:
      "Personalised workout plans, nutrition guidance, and progress tracking — all powered by AI. Built for busy entrepreneurs who want to stay fit without the guesswork.",
    url: "https://coachnova.io",
    external: true,
    status: "beta" as const,
    color: "from-emerald-500 to-teal-500",
    initials: "CN",
    features: ["Personalised workout plans", "Nutrition guidance", "Progress tracking", "AI coaching"],
  },
  // Coming soon placeholder — remove or replace when next app launches
  {
    name: "More coming soon",
    tagline: "The next Nova Labs app is in the works",
    description:
      "We are constantly building new AI-powered tools for entrepreneurs. Follow us to be the first to know when the next app drops.",
    url: null,
    external: false,
    status: "coming_soon" as const,
    color: "from-slate-400 to-slate-500",
    initials: "?",
    features: [],
  },
];

const STATUS_LABELS = {
  live: { label: "Live", className: "bg-green-100 text-green-700 border-green-200" },
  beta: { label: "Free Beta", className: "bg-violet-100 text-violet-700 border-violet-200" },
  coming_soon: { label: "Coming Soon", className: "bg-slate-100 text-slate-500 border-slate-200" },
};

export default function AppsPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <Link href="/">
              <img
                src="/manus-storage/blastly-icon-512_d2809e7c.png"
                alt="Blastly"
                className="h-16 w-auto object-contain cursor-pointer"
              />
            </Link>
            <div className="flex items-center gap-3">
              {user ? (
                <Link href="/dashboard">
                  <Button size="sm">Dashboard <ArrowRight className="w-4 h-4 ml-1" /></Button>
                </Link>
              ) : (
                <a href={getLoginUrl()}>
                  <Button size="sm">Sign In</Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 text-center">
        <div className="container max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-muted/60 text-sm font-medium text-muted-foreground mb-6">
            <FlaskConical className="w-4 h-4 text-violet-500" />
            Nova Labs
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            AI tools built for{" "}
            <span className="bg-gradient-to-r from-violet-600 to-blue-500 bg-clip-text text-transparent">
              entrepreneurs
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            Nova Labs builds AI-powered apps that help you grow your business, stay healthy, and work smarter — all free during beta.
          </p>
        </div>
      </section>

      {/* App cards */}
      <section className="pb-24">
        <div className="container max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {APPS.map((app) => {
              const statusConfig = STATUS_LABELS[app.status];
              const isComingSoon = app.status === "coming_soon";

              return (
                <div
                  key={app.name}
                  className={`rounded-2xl border bg-card flex flex-col transition-all ${
                    isComingSoon
                      ? "opacity-60 border-dashed"
                      : "shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  }`}
                >
                  <div className="p-6 flex-1">
                    {/* Icon + status */}
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center`}
                      >
                        <span className="text-white font-bold text-sm">{app.initials}</span>
                      </div>
                      <Badge variant="outline" className={statusConfig.className}>
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {/* Name + tagline */}
                    <h2 className="text-lg font-bold text-foreground mb-1">{app.name}</h2>
                    <p className="text-sm font-medium text-primary mb-3">{app.tagline}</p>
                    <p className="text-sm text-muted-foreground mb-5">{app.description}</p>

                    {/* Features */}
                    {app.features.length > 0 && (
                      <ul className="space-y-1.5">
                        {app.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Sparkles className="w-3 h-3 text-violet-400 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* CTA */}
                  {!isComingSoon && app.url && (
                    <div className="p-6 pt-0">
                      {app.external ? (
                        <a href={app.url} target="_blank" rel="noopener noreferrer">
                          <Button
                            className={`w-full bg-gradient-to-r ${app.color} text-white border-0 hover:opacity-90`}
                          >
                            Visit {app.name}
                            <ExternalLink className="w-3.5 h-3.5 ml-2" />
                          </Button>
                        </a>
                      ) : (
                        <Link href={app.url}>
                          <Button
                            className={`w-full bg-gradient-to-r ${app.color} text-white border-0 hover:opacity-90`}
                          >
                            Open {app.name}
                            <ArrowRight className="w-3.5 h-3.5 ml-2" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Beta note */}
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              All Nova Labs apps are <strong>free during the beta period</strong> — no card required. Paid plans activate after 30 May 2026.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-violet-500" />
            <span className="font-semibold text-foreground">Nova Labs</span>
          </div>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-foreground transition-colors">Blastly</Link>
            <a href="https://coachnova.io" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Coach Nova</a>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
          <p>© 2026 Nova Labs. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
