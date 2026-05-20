/**
 * Onboarding — Quick Setup Wizard (4 steps, one screen each)
 * Step 1: Welcome  — "You're in! 3 minutes to go live"
 * Step 2: Business — name + industry (2 fields only)
 * Step 3: Connect  — pick & connect first social account
 * Step 4: Done     — summary + "Go to dashboard"
 */
import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import HumanVerifiedBadge from "@/components/HumanVerifiedBadge";
import {
  Zap, CheckCircle2, ArrowRight,
  Building2, Globe,
  Facebook, Instagram, Linkedin, Twitter, Youtube,
} from "lucide-react";

// ── Platform list (top 6) ─────────────────────────────────────────────────
const PLATFORMS = [
  {
    id: "facebook",
    name: "Facebook",
    Icon: Facebook,
    color: "#1877F2",
    bg: "oklch(0.25 0.06 240)",
    border: "oklch(0.40 0.12 240 / 0.50)",
    tip: "Business Page — most businesses start here",
  },
  {
    id: "instagram",
    name: "Instagram",
    Icon: Instagram,
    color: "#E1306C",
    bg: "oklch(0.22 0.06 0)",
    border: "oklch(0.50 0.18 0 / 0.45)",
    tip: "Visual content — great for products & lifestyle",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    Icon: Linkedin,
    color: "#0A66C2",
    bg: "oklch(0.22 0.05 240)",
    border: "oklch(0.42 0.12 230 / 0.45)",
    tip: "B2B & professional services — high-intent audience",
  },
  {
    id: "twitter",
    name: "X / Twitter",
    Icon: Twitter,
    color: "#1DA1F2",
    bg: "oklch(0.20 0.03 245)",
    border: "oklch(0.45 0.10 240 / 0.40)",
    tip: "Real-time updates & community building",
  },
  {
    id: "youtube",
    name: "YouTube",
    Icon: Youtube,
    color: "#FF0000",
    bg: "oklch(0.20 0.05 25)",
    border: "oklch(0.50 0.18 25 / 0.40)",
    tip: "Video content — second-largest search engine",
  },
  {
    id: "tiktok",
    name: "TikTok",
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
      </svg>
    ),
    color: "#69C9D0",
    bg: "oklch(0.20 0.04 200)",
    border: "oklch(0.50 0.12 200 / 0.40)",
    tip: "Short-form video — fastest growing platform",
  },
];

const INDUSTRIES = [
  "Retail & E-commerce", "Food & Hospitality", "Health & Fitness",
  "Beauty & Wellness", "Professional Services", "Trades & Construction",
  "Real Estate", "Education", "Technology", "Other",
];

// ── Step dots ──────────────────────────────────────────────────────────────────────────────
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i + 1 === step ? 24 : 8,
            height: 8,
            background: i + 1 <= step
              ? "oklch(0.65 0.22 145)"
              : "oklch(0.28 0.01 245)",
          }}
        />
      ))}
    </div>
  );
}

// ── Main wizard ─────────────────────────────────────────────────────────────────────────────────
export default function Onboarding() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [connected, setConnected] = useState<string[]>([]);
  const [connecting, setConnecting] = useState(false);

  const { data: onboardingState } = trpc.onboarding.getState.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const saveProfile = trpc.onboarding.saveProfile.useMutation();
  const savePlatformConnection = trpc.onboarding.savePlatformConnection.useMutation();
  const complete = trpc.onboarding.complete.useMutation();

  useEffect(() => {
    if (!isAuthenticated && user !== undefined) navigate("/");
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (onboardingState?.isComplete) { navigate("/dashboard"); return; }
    if (onboardingState?.profile) {
      setBusinessName(onboardingState.profile.businessName ?? "");
      setIndustry(onboardingState.profile.industry ?? "");
    }
    if (onboardingState?.connections) {
      setConnected(
        onboardingState.connections.filter(c => c.status === "connected").map(c => c.platform)
      );
    }
  }, [onboardingState, navigate]);

  const handleBusinessNext = async () => {
    if (!businessName.trim()) { toast.error("Please enter your business name"); return; }
    try {
      await saveProfile.mutateAsync({
        businessName: businessName.trim(),
        industry: industry || "Other",
        goals: ["grow_audience"],
        targetAudience: undefined,
        adBudgetRange: undefined,
      });
    } catch { /* non-blocking */ }
    setStep(3);
  };

  const handleConnect = async (platformId: string) => {
    setConnecting(true);
    try {
      await savePlatformConnection.mutateAsync({
        platform: platformId as any,
        status: "connected",
        accountName: user?.name ?? undefined,
      });
      setConnected(prev => [...prev, platformId]);
      toast.success(`${PLATFORMS.find(p => p.id === platformId)?.name} connected! ✓`);
      setTimeout(() => setStep(4), 800);
    } catch { toast.error("Connection failed — please try again"); }
    finally { setConnecting(false); }
  };

  const handleComplete = async () => {
    try { await complete.mutateAsync(); } catch { /* non-blocking */ }
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "oklch(0.11 0.012 245)" }}>
      {/* Nav */}
      <div className="border-b flex items-center px-6 py-4 gap-3" style={{ borderColor: "oklch(0.22 0.012 245)" }}>
        <a href="/" className="flex items-center gap-2.5">
          <img src="/manus-storage/blastly-icon-512_d2809e7c.png" alt="Blastly" className="h-9 w-auto" />
          <span className="font-extrabold text-xl tracking-tight" style={{ color: "oklch(0.92 0.01 245)", fontFamily: "'Space Grotesk', sans-serif" }}>
            Blastly
          </span>
        </a>
        <span className="text-sm ml-1" style={{ color: "oklch(0.55 0.01 245)" }}>— Quick Set-up</span>
        <div className="ml-auto"><HumanVerifiedBadge size="sm" /></div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <StepDots step={step} total={4} />

          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider"
                style={{ background: "oklch(0.52 0.22 145 / 0.12)", border: "1px solid oklch(0.52 0.22 145 / 0.30)", color: "oklch(0.75 0.18 145)" }}>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                14-day free trial activated
              </div>
              <h1 className="text-4xl font-extrabold leading-tight" style={{ color: "oklch(0.95 0.01 245)", fontFamily: "'Space Grotesk', sans-serif" }}>
                You're in!<br /><span style={{ color: "oklch(0.65 0.22 145)" }}>Let's get you live.</span>
              </h1>
              <p style={{ color: "oklch(0.65 0.01 245)" }} className="text-lg leading-relaxed">
                Connect your existing social accounts in under 3 minutes.<br />No tech skills needed. We handle everything else.
              </p>
              <div className="rounded-2xl p-5 text-left space-y-3" style={{ background: "oklch(0.15 0.012 245)", border: "1px solid oklch(0.22 0.012 245)" }}>
                {[
                  { n: "1", label: "Tell us your business name", time: "30 sec" },
                  { n: "2", label: "Connect your first social account", time: "1 min" },
                  { n: "3", label: "Your dashboard is ready", time: "instant" },
                ].map(item => (
                  <div key={item.n} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: "oklch(0.52 0.22 145 / 0.15)", border: "1px solid oklch(0.52 0.22 145 / 0.35)", color: "oklch(0.72 0.18 145)" }}>
                      {item.n}
                    </div>
                    <span style={{ color: "oklch(0.80 0.01 245)" }} className="text-sm flex-1">{item.label}</span>
                    <span className="text-xs" style={{ color: "oklch(0.55 0.01 245)" }}>{item.time}</span>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setStep(2)}
                className="w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all"
                style={{ background: "linear-gradient(135deg, oklch(0.52 0.22 145), oklch(0.46 0.20 200))", color: "white", boxShadow: "0 4px 24px oklch(0.52 0.22 145 / 0.35)" }}>
                Let's go <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step 2: Business */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold mb-1" style={{ color: "oklch(0.95 0.01 245)", fontFamily: "'Space Grotesk', sans-serif" }}>
                  What's your business called?
                </h2>
                <p style={{ color: "oklch(0.60 0.01 245)" }} className="text-sm">We'll use this to personalise your posts and campaigns.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2" style={{ color: "oklch(0.80 0.01 245)" }}>
                  <Building2 className="w-4 h-4" style={{ color: "oklch(0.65 0.22 145)" }} />
                  Business name
                </label>
                <Input value={businessName} onChange={e => setBusinessName(e.target.value)}
                  placeholder="e.g. Sunrise Plumbing Co." className="h-12 text-base"
                  style={{ background: "oklch(0.16 0.012 245)", border: "1px solid oklch(0.28 0.012 245)", color: "oklch(0.92 0.01 245)" }}
                  onKeyDown={e => e.key === "Enter" && handleBusinessNext()} autoFocus />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2" style={{ color: "oklch(0.80 0.01 245)" }}>
                  <Globe className="w-4 h-4" style={{ color: "oklch(0.65 0.22 145)" }} />
                  Industry <span style={{ color: "oklch(0.55 0.01 245)" }}>(optional)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {INDUSTRIES.map(ind => (
                    <button key={ind} type="button" onClick={() => setIndustry(ind)}
                      className="px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all"
                      style={{
                        background: industry === ind ? "oklch(0.52 0.22 145 / 0.15)" : "oklch(0.16 0.012 245)",
                        border: `1px solid ${industry === ind ? "oklch(0.52 0.22 145 / 0.50)" : "oklch(0.26 0.012 245)"}`,
                        color: industry === ind ? "oklch(0.80 0.18 145)" : "oklch(0.65 0.01 245)",
                      }}>
                      {ind}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)} className="flex-none px-5 h-12 rounded-xl text-sm font-medium transition-all"
                  style={{ background: "oklch(0.18 0.012 245)", border: "1px solid oklch(0.28 0.012 245)", color: "oklch(0.65 0.01 245)" }}>
                  Back
                </button>
                <button type="button" onClick={handleBusinessNext} disabled={saveProfile.isPending}
                  className="flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, oklch(0.52 0.22 145), oklch(0.46 0.20 200))", color: "white", boxShadow: "0 4px 20px oklch(0.52 0.22 145 / 0.30)" }}>
                  {saveProfile.isPending ? "Saving…" : <>Next — Connect accounts <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Connect */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-extrabold mb-1" style={{ color: "oklch(0.95 0.01 245)", fontFamily: "'Space Grotesk', sans-serif" }}>
                  Connect your first account
                </h2>
                <p style={{ color: "oklch(0.60 0.01 245)" }} className="text-sm">
                  Pick the platform where your customers are most active. You can add more later.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {PLATFORMS.map(p => {
                  const isConnected = connected.includes(p.id);
                  const isSelected = selectedPlatform === p.id;
                  return (
                    <button key={p.id} type="button" onClick={() => setSelectedPlatform(isSelected ? null : p.id)}
                      className="relative rounded-2xl p-4 text-left transition-all"
                      style={{
                        background: isSelected ? p.bg : "oklch(0.15 0.012 245)",
                        border: `1.5px solid ${isSelected ? p.border : "oklch(0.24 0.012 245)"}`,
                        boxShadow: isSelected ? `0 0 20px ${p.color}22` : "none",
                      }}>
                      {isConnected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: "oklch(0.52 0.22 145)", color: "white" }}>
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      )}
                      <p.Icon className="w-6 h-6 mb-2" style={{ color: isSelected ? p.color : "oklch(0.65 0.01 245)" }} />
                      <p className="font-bold text-sm" style={{ color: isSelected ? "oklch(0.92 0.01 245)" : "oklch(0.75 0.01 245)" }}>{p.name}</p>
                      <p className="text-xs mt-0.5 leading-snug" style={{ color: "oklch(0.55 0.01 245)" }}>{p.tip}</p>
                    </button>
                  );
                })}
              </div>
              {selectedPlatform && (
                <button type="button" onClick={() => handleConnect(selectedPlatform)} disabled={connecting}
                  className="w-full rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, oklch(0.52 0.22 145), oklch(0.46 0.20 200))", color: "white", boxShadow: "0 4px 20px oklch(0.52 0.22 145 / 0.30)", height: "52px" }}>
                  {connecting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Connecting…
                    </span>
                  ) : (
                    <><Zap className="w-4 h-4" /> Connect {PLATFORMS.find(p => p.id === selectedPlatform)?.name}</>
                  )}
                </button>
              )}
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setStep(2)} className="flex-none px-5 h-10 rounded-xl text-xs font-medium transition-all"
                  style={{ background: "oklch(0.16 0.012 245)", border: "1px solid oklch(0.26 0.012 245)", color: "oklch(0.60 0.01 245)" }}>
                  Back
                </button>
                <button type="button" onClick={() => setStep(4)} className="flex-1 h-10 rounded-xl text-xs font-medium transition-all text-center"
                  style={{ color: "oklch(0.55 0.01 245)", border: "1px solid oklch(0.22 0.012 245)", background: "transparent" }}>
                  Skip for now — I'll connect later
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: "oklch(0.52 0.22 145 / 0.15)", border: "2px solid oklch(0.52 0.22 145 / 0.40)", boxShadow: "0 0 40px oklch(0.52 0.22 145 / 0.20)" }}>
                  <CheckCircle2 className="w-10 h-10" style={{ color: "oklch(0.72 0.22 145)" }} />
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-extrabold mb-2" style={{ color: "oklch(0.95 0.01 245)", fontFamily: "'Space Grotesk', sans-serif" }}>
                  {connected.length > 0 ? "You're all set up!" : "Your account is ready!"}
                </h2>
                <p style={{ color: "oklch(0.62 0.01 245)" }} className="text-base">
                  {connected.length > 0
                    ? `${PLATFORMS.find(p => p.id === connected[0])?.name} is connected. Your first post is ready to go.`
                    : "Head to your dashboard to connect accounts and start posting."}
                </p>
              </div>
              <div className="rounded-2xl p-5 text-left space-y-3" style={{ background: "oklch(0.15 0.012 245)", border: "1px solid oklch(0.22 0.012 245)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "oklch(0.55 0.01 245)" }}>What's waiting for you</p>
                {[
                  "Free social media audit — see exactly what to fix",
                  "AI post generator — create content in 30 seconds",
                  "Command Centre — all messages in one place",
                  "Human-verified posting — we check every post",
                ].map(item => (
                  <div key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "oklch(0.65 0.22 145)" }} />
                    <span className="text-sm" style={{ color: "oklch(0.78 0.01 245)" }}>{item}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-center"><HumanVerifiedBadge size="md" /></div>
              <button type="button" onClick={handleComplete}
                className="w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all"
                style={{ background: "linear-gradient(135deg, oklch(0.52 0.22 145), oklch(0.46 0.20 200))", color: "white", boxShadow: "0 4px 24px oklch(0.52 0.22 145 / 0.35)" }}>
                Go to my dashboard <ArrowRight className="w-5 h-5" />
              </button>
              <p className="text-xs" style={{ color: "oklch(0.48 0.01 245)" }}>
                14-day free trial active · No credit card required · Cancel anytime
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
