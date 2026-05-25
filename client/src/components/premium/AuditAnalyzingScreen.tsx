import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";

const ANALYSIS_STEPS = [
  "Scraping website content",
  "Understanding business industry",
  "Detecting services",
  "Identifying target audience",
  "Analyzing brand tone",
  "Preparing onboarding",
  "Generating marketing insights",
];

type AuditAnalyzingScreenProps = {
  website?: string;
};

export default function AuditAnalyzingScreen({ website }: AuditAnalyzingScreenProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setActiveStep((prev) => (prev < ANALYSIS_STEPS.length - 1 ? prev + 1 : prev));
    }, 2200);
    const progressTimer = setInterval(() => {
      setProgress((prev) => (prev < 92 ? prev + 3 : prev));
    }, 900);
    return () => {
      clearInterval(stepTimer);
      clearInterval(progressTimer);
    };
  }, []);

  const hostname = website
    ? website.replace(/^https?:\/\//, "").split("/")[0]
    : "your business";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden audit-analyzing-bg"
      style={{ background: "oklch(0.07 0.015 250)" }}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="audit-orb audit-orb-1" />
        <div className="audit-orb audit-orb-2" />
        <div className="audit-orb audit-orb-3" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-300 tracking-wide">AI Audit in progress</span>
          </div>
          <h1
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: "oklch(0.95 0.008 240)" }}
          >
            Blastly is learning
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, oklch(0.72 0.22 145), oklch(0.65 0.20 200))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {hostname}
            </span>
          </h1>
          <p className="text-sm" style={{ color: "oklch(0.55 0.014 240)" }}>
            Our AI is reading your website so onboarding feels already done.
          </p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between text-xs mb-2" style={{ color: "oklch(0.50 0.012 240)" }}>
            <span>Analysis progress</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.15 0.018 248)" }}>
            <div
              className="h-full rounded-full audit-progress-fill transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="glass-card-glow rounded-2xl p-6 space-y-3">
          {ANALYSIS_STEPS.map((step, i) => {
            const done = i < activeStep;
            const active = i === activeStep;
            return (
              <div
                key={step}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-500 ${
                  active
                    ? "bg-emerald-500/10 border border-emerald-500/30 audit-step-active"
                    : done
                      ? "opacity-80"
                      : "opacity-40"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    done
                      ? "bg-emerald-500 text-white"
                      : active
                        ? "bg-emerald-500/20 border border-emerald-500/50"
                        : "bg-white/5 border border-white/10"
                  }`}
                >
                  {done ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : active ? (
                    <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    active ? "text-white" : done ? "text-emerald-200/90" : "text-white/50"
                  }`}
                >
                  {step}
                </span>
                {active && (
                  <span className="ml-auto text-[10px] uppercase tracking-widest text-emerald-400/80">
                    Live
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs mt-8" style={{ color: "oklch(0.38 0.012 240)" }}>
          Powered by Make.com + Claude · Results saved securely to your Blastly profile
        </p>
      </div>
    </div>
  );
}
