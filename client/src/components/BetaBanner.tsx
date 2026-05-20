import { Zap } from "lucide-react";
import { useLocation } from "wouter";
/**
 * FreeTrialBanner — persistent top-of-page strip shown on every page.
 * Bold, consistent, same colour/font/size everywhere.
 * Not dismissible — it's a core trust signal, not a notification.
 */
export default function BetaBanner() {
  const [location, navigate] = useLocation();

  function handleStartFree(e: React.MouseEvent) {
    e.preventDefault();
    // Always start with the audit — scroll to input if on homepage, otherwise navigate there
    if (location === "/" || location === "") {
      const el = document.getElementById("audit-input");
      if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => el.focus(), 400); return; }
    }
    // On any other page: go to homepage with ?focus=audit so it auto-scrolls
    navigate("/?focus=audit");
  }

  return (
    <div
      className="w-full flex items-center justify-center gap-3 px-4 py-3 text-sm font-semibold relative overflow-hidden"
      style={{
        background: "linear-gradient(90deg, oklch(0.18 0.06 145), oklch(0.16 0.04 200), oklch(0.18 0.06 145))",
        borderBottom: "1px solid oklch(0.52 0.22 145 / 0.35)",
        color: "#ffffff",
        letterSpacing: "0.01em",
      }}
    >
      {/* Subtle animated shimmer line at top */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent 0%, oklch(0.72 0.22 145 / 0.70) 50%, transparent 100%)",
        }}
      />

      {/* Zap icon */}
      <Zap
        className="w-4 h-4 shrink-0"
        style={{ color: "oklch(0.72 0.22 145)" }}
        aria-hidden
      />

      {/* Main message */}
      <span style={{ color: "#ffffff" }}>
        <strong style={{ color: "oklch(0.82 0.22 145)", fontWeight: 800 }}>
          30-day exclusive trial
        </strong>
        {" "}— 10 spots only. No credit card. No contracts. Walk away any time.
      </span>

      {/* CTA pill */}
      <button
        type="button"
        onClick={handleStartFree}
        className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all hover:opacity-90 shrink-0"
        style={{
          background: "oklch(0.52 0.22 145)",
          color: "#ffffff",
          boxShadow: "0 1px 8px oklch(0.52 0.22 145 / 0.40)",
        }}
      >
        Claim your spot →
      </button>
    </div>
  );
}
