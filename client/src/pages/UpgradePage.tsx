import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  ArrowRight,
  Bot,
  Check,
  Loader2,
  Sparkles,
  Zap,
  Bell,
  PenLine,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { loadDashboardProfile } from "@/lib/dashboardProfile";
import {
  createUpgradeCheckoutApi,
  saveAssistantSetupApi,
  type AssistantSetupInput,
} from "@/lib/billingApi";
import { getAppLoginPath } from "@/const";

const GOLD = "#d4a843";
const BG = "#02020c";
const SURFACE = "#0d0d1a";
const TEXT = "#f0ede6";
const MUTED = "rgba(240,237,230,0.55)";

const PREMIUM_FEATURES = [
  { icon: Bot, label: "AI Assistant (Aria)", desc: "Handles enquiries, drafts replies, books appointments" },
  { icon: Zap, label: "Full Command Centre", desc: "Morning briefing, urgent alerts, daily schedule" },
  { icon: PenLine, label: "AI content & blogs", desc: "Posts and articles written for your brand" },
  { icon: Bell, label: "Real-time notifications", desc: "Never miss a lead or review again" },
  { icon: MessageSquare, label: "Enquiry handling", desc: "DMs, email, SMS — handled automatically" },
];

const TONES = ["Professional", "Friendly", "Bold", "Warm", "Expert"];
const PERSONALITIES = [
  "Trusted advisor",
  "Local expert",
  "Premium concierge",
  "Energetic coach",
  "Calm problem-solver",
];

export default function UpgradePage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { isPaid, isLoading: planLoading, billing } = usePlanAccess();
  const [, navigate] = useLocation();
  const profile = loadDashboardProfile();

  const [step, setStep] = useState<1 | 2>(1);
  const [assistantName, setAssistantName] = useState(billing?.assistantName || "Aria");
  const [assistantTone, setAssistantTone] = useState(billing?.assistantTone || "Professional");
  const [assistantPersonality, setAssistantPersonality] = useState(
    billing?.assistantPersonality || "Trusted advisor"
  );
  const [busy, setBusy] = useState(false);

  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const cancelled = params.get("cancelled") === "1";

  useEffect(() => {
    if (cancelled) toast.info("Checkout cancelled — your free dashboard is unchanged.");
  }, [cancelled]);

  useEffect(() => {
    if (authLoading || planLoading) return;
    if (!isAuthenticated) {
      window.location.href = getAppLoginPath("/upgrade");
      return;
    }
    if (isPaid) navigate("/command-centre");
  }, [authLoading, planLoading, isAuthenticated, isPaid, navigate]);

  const businessName = profile?.businessName || user?.businessName || user?.name || "Your business";

  async function saveAssistantAndCheckout() {
    setBusy(true);
    try {
      const payload: AssistantSetupInput = {
        assistantName,
        assistantTone,
        assistantPersonality,
      };
      await saveAssistantSetupApi(payload);
      const { url } = await createUpgradeCheckoutApi();
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
      setBusy(false);
    }
  }

  if (authLoading || planLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: BG, color: TEXT, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <Link href="/dashboard/home" className="text-sm hover:opacity-80" style={{ color: MUTED }}>
          ← Back to dashboard
        </Link>

        <div className="mt-6 mb-8">
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: GOLD }}>
            Upgrade · No re-onboarding
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-3">Unlock Full Command Centre</h1>
          <p style={{ color: MUTED, lineHeight: 1.6 }}>
            Your audit, onboarding, and business profile for <strong style={{ color: TEXT }}>{businessName}</strong>{" "}
            carry forward automatically. You will not repeat setup.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 mb-8">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{ background: step >= n ? GOLD : "rgba(255,255,255,0.1)" }}
            />
          ))}
        </div>

        {step === 1 && (
          <div
            className="rounded-2xl border p-6 md:p-8 space-y-6"
            style={{ background: SURFACE, borderColor: "rgba(212,168,67,0.2)" }}
          >
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl p-4 border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: MUTED }}>
                  Current · Free
                </p>
                <p className="font-bold text-lg">Snap & Post</p>
                <ul className="mt-3 space-y-2 text-sm" style={{ color: MUTED }}>
                  <li>· Simple dashboard</li>
                  <li>· Website audit</li>
                  <li>· 3 posts / week</li>
                </ul>
              </div>
              <div
                className="rounded-xl p-4 border"
                style={{ borderColor: "rgba(212,168,67,0.35)", background: "rgba(212,168,67,0.06)" }}
              >
                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: GOLD }}>
                  Blastly Pro
                </p>
                <p className="font-bold text-lg">
                  AU$75 <span className="text-sm font-normal" style={{ color: MUTED }}>/ week</span>
                </p>
                <p className="text-xs mt-1" style={{ color: MUTED }}>
                  14-day free trial · Cancel anytime
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {PREMIUM_FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex gap-3 items-start">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "rgba(212,168,67,0.12)" }}
                  >
                    <Icon size={18} style={{ color: GOLD }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-sm" style={{ color: MUTED }}>
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2"
              style={{ background: GOLD, color: "#000" }}
            >
              <Sparkles size={18} />
              Set up AI Assistant
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div
            className="rounded-2xl border p-6 md:p-8 space-y-6"
            style={{ background: SURFACE, borderColor: "rgba(212,168,67,0.2)" }}
          >
            <div>
              <h2 className="text-xl font-bold mb-1">Name your AI Assistant</h2>
              <p className="text-sm" style={{ color: MUTED }}>
                Saved to your account before payment. Uses your existing business profile — no re-audit.
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-wider" style={{ color: MUTED }}>
                Assistant name
              </span>
              <input
                value={assistantName}
                onChange={(e) => setAssistantName(e.target.value)}
                className="w-full rounded-xl px-4 py-3 border bg-transparent outline-none focus:border-amber-500/50"
                style={{ borderColor: "rgba(255,255,255,0.12)", color: TEXT }}
                placeholder="Aria"
              />
            </label>

            <div>
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: MUTED }}>
                Tone
              </p>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAssistantTone(t)}
                    className="px-3 py-1.5 rounded-full text-sm border transition-colors"
                    style={{
                      borderColor: assistantTone === t ? GOLD : "rgba(255,255,255,0.15)",
                      background: assistantTone === t ? "rgba(212,168,67,0.15)" : "transparent",
                      color: assistantTone === t ? GOLD : MUTED,
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: MUTED }}>
                Personality
              </p>
              <div className="flex flex-wrap gap-2">
                {PERSONALITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAssistantPersonality(p)}
                    className="px-3 py-1.5 rounded-full text-sm border transition-colors"
                    style={{
                      borderColor: assistantPersonality === p ? GOLD : "rgba(255,255,255,0.15)",
                      background: assistantPersonality === p ? "rgba(212,168,67,0.15)" : "transparent",
                      color: assistantPersonality === p ? GOLD : MUTED,
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="rounded-xl p-4 text-sm flex gap-2"
              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <p style={{ color: MUTED }}>
                Audit data, onboarding, dashboard profile, and business info are preserved. Payment only unlocks
                Command Centre and automations.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl border font-medium"
                style={{ borderColor: "rgba(255,255,255,0.15)", color: MUTED }}
                disabled={busy}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void saveAssistantAndCheckout()}
                disabled={busy || !assistantName.trim()}
                className="flex-[2] py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: GOLD, color: "#000" }}
              >
                {busy ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Redirecting to Stripe…
                  </>
                ) : (
                  <>
                    Activate AI Assistant — Start Free Trial
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
