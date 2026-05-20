import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  CheckCircle, Zap, Rocket, Globe, ArrowRight, Star, Mic, Smartphone
} from "lucide-react";

const PLATFORM_NAMES: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  twitter: "X (Twitter)",
  pinterest: "Pinterest",
  snapchat: "Snapchat",
  google_ads: "Google Ads",
  whatsapp: "WhatsApp Business",
};

const PLATFORM_COLORS: Record<string, string> = {
  facebook: "from-blue-600 to-blue-700",
  instagram: "from-pink-500 to-purple-600",
  tiktok: "from-slate-700 to-slate-800",
  youtube: "from-red-600 to-red-700",
  linkedin: "from-blue-500 to-blue-600",
  twitter: "from-slate-600 to-slate-700",
  pinterest: "from-red-500 to-red-600",
  snapchat: "from-yellow-400 to-yellow-500",
  google_ads: "from-green-500 to-emerald-600",
  whatsapp: "from-green-600 to-green-700",
};

// ── Siri Shortcut Setup Component ────────────────────────────────────────────
function SiriShortcutSetup() {
  const [status, setStatus] = useState<"idle" | "done" | "skipped">("idle");
  const quickCaptureUrl = `${window.location.origin}/dashboard/quick-capture`;

  const handleSetupSiri = () => {
    // Build the Shortcuts deep-link URL that pre-fills an "Open URL" action
    // pointing straight at the Quick Capture screen.
    // On iOS this opens the Shortcuts app with the action ready — user just
    // taps the record button and speaks their phrase once.
    const shortcutsUrl =
      `shortcuts://create-shortcut?` +
      `actions=[{"WFWorkflowActionIdentifier":"is.workflow.actions.openurl","WFWorkflowActionParameters":{"WFURLActionURL":"${encodeURIComponent(quickCaptureUrl)}"}}]` +
      `&name=Blastly%20Post`;

    window.location.href = shortcutsUrl;

    // Give iOS a moment to open Shortcuts, then mark as done
    setTimeout(() => setStatus("done"), 1500);
  };

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-5 text-center space-y-2">
        <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
        <p className="font-semibold text-emerald-300">Voice shortcut set up!</p>
        <p className="text-xs text-muted-foreground">
          Say <span className="text-white font-medium">"Hey Siri, Blastly Post"</span> from anywhere to open the camera instantly.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-violet-500/8 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
          <Mic className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <p className="font-bold text-foreground">Set up your voice shortcut</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Say <span className="text-white font-medium">"Hey Siri, Blastly Post"</span> — camera opens instantly. No tapping, no searching.
          </p>
        </div>
      </div>

      {/* How it works — 3 simple lines */}
      <div className="space-y-2 pl-1">
        {[
          { step: "1", text: "Tap the button below" },
          { step: "2", text: "Speak the phrase \"Blastly Post\" when prompted" },
          { step: "3", text: "Done — say it anytime to open the camera" },
        ].map(({ step, text }) => (
          <div key={step} className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold flex items-center justify-center shrink-0">
              {step}
            </span>
            {text}
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={handleSetupSiri}
        className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-sm transition-all"
        style={{
          background: "linear-gradient(135deg, oklch(0.55 0.22 290), oklch(0.50 0.20 260))",
          color: "white",
          boxShadow: "0 4px 20px oklch(0.55 0.22 290 / 0.35)",
        }}
      >
        <Mic className="w-4 h-4" />
        Set up "Hey Siri, Blastly Post"
      </button>

      {/* Android note */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Smartphone className="w-3.5 h-3.5 shrink-0" />
        <span>Android? Say <span className="text-foreground">"OK Google, open blastly.ai"</span> — works right now, no setup needed.</span>
      </div>

      {/* Skip */}
      <button
        onClick={() => setStatus("skipped")}
        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
      >
        Skip for now — I'll set this up later
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function OnboardingComplete() {
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();

  const { data: state } = trpc.onboarding.getState.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!isAuthenticated && user !== undefined) navigate("/");
  }, [isAuthenticated, user]);

  const connectedPlatforms = (state?.connections ?? []).filter(c => c.status === "connected");
  const businessName = state?.profile?.businessName ?? user?.name ?? "Your Business";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-xl">
        <div className="container py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight">Blastly</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-lg space-y-6">

          {/* Success icon + headline */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-2xl shadow-blue-500/30">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg">
                  <Star className="w-3.5 h-3.5 text-yellow-900 fill-yellow-900" />
                </div>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                You're all set, {businessName.split(" ")[0]}! 🎉
              </h1>
              <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
                Your Blastly account is ready. One last thing — set up your voice shortcut so posting takes 20 seconds.
              </p>
            </div>
          </div>

          {/* ── SIRI SHORTCUT — the hero action ── */}
          <SiriShortcutSetup />

          {/* Connected platforms */}
          {connectedPlatforms.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Connected platforms ({connectedPlatforms.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {connectedPlatforms.map(c => (
                  <div
                    key={c.platform}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/8"
                  >
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${PLATFORM_COLORS[c.platform] ?? "from-slate-500 to-slate-600"}`} />
                    <span className="text-xs font-medium text-emerald-400">
                      {PLATFORM_NAMES[c.platform] ?? c.platform}
                    </span>
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What you can do now */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What you can do now</p>
            <div className="space-y-2">
              {[
                { icon: Rocket, text: "Launch your first AI-powered campaign in minutes" },
                { icon: Globe, text: "Schedule posts across all connected platforms" },
                { icon: Star, text: "Use the AI Ad Studio to generate ad creatives" },
                { icon: CheckCircle, text: "Get a free audit of your current social performance" },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-3 h-3 text-primary" />
                  </div>
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Go to dashboard */}
          <Button
            className="btn-gradient text-white border-0 w-full h-12 font-semibold text-base"
            onClick={() => navigate("/dashboard")}
          >
            <Rocket className="w-5 h-5 mr-2" />
            Go to My Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

        </div>
      </div>
    </div>
  );
}
