import { Link } from "wouter";
import { Sparkles, Lock, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradePromptProps {
  /** Which feature hit the limit — used in the inline variant subtitle */
  feature?: string;
  /** Override the default headline */
  headline?: string;
  /** Override the default body copy */
  message?: string;
  /** Compact inline banner vs full centred card */
  variant?: "card" | "inline" | "banner";
}

const EVERYTHING_FEATURES = [
  "AI writes all content",
  "Blog articles published",
  "Aria AI assistant",
  "Calls, messages & bookings handled",
  "Full Command Centre",
  "Real-time alerts",
  "Morning briefing",
  "Google review monitoring",
  "AI citation tracking",
  "Monthly scorecard",
];

const GOLD = "#d4a843";
const BG_DARK = "#0d0d1a";

// ─── Inline banner (slim, used inside dashboard pages) ───────────────────────
function InlineBanner({ feature, message }: { feature?: string; message?: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.3)",
      borderRadius: 10, padding: "12px 16px",
    }}>
      <Lock size={16} style={{ color: GOLD, flexShrink: 0 }} />
      <p style={{ flex: 1, margin: 0, fontSize: 14, color: "#eae6da" }}>
        {message || `Aria would have caught that. Upgrade to AU$75/week and never miss an enquiry again.`}
      </p>
      <Button asChild size="sm" style={{ background: GOLD, color: "#000", border: "none", fontWeight: 700, flexShrink: 0 }}>
        <Link href="/upgrade">
          Start My Free Trial <ArrowRight size={13} style={{ marginLeft: 4 }} />
        </Link>
      </Button>
    </div>
  );
}

// ─── Full card (centred, used as page-level gate) ─────────────────────────────
function FullCard({ headline, message }: { headline?: string; message?: string }) {
  return (
    <div style={{
      background: BG_DARK, border: `1.5px solid ${GOLD}`,
      borderRadius: 20, padding: "48px 40px", maxWidth: 560, margin: "0 auto",
      textAlign: "center", boxShadow: `0 0 40px rgba(212,168,67,0.12)`,
      color: "#eae6da",
    }}>
      {/* Icon */}
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: `rgba(212,168,67,0.15)`, border: `1px solid rgba(212,168,67,0.3)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 20px",
      }}>
        <Sparkles size={26} style={{ color: GOLD }} />
      </div>

      {/* Headline */}
      <h3 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 10px" }}>
        {headline || "Aria would have caught that."}
      </h3>
      <p style={{ color: "rgba(234,230,218,0.6)", fontSize: 15, margin: "0 0 28px", lineHeight: 1.6 }}>
        {message || "Upgrade to AU$75/week and never miss an enquiry again."}
      </p>

      {/* Feature list */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px",
        textAlign: "left", marginBottom: 28,
      }}>
        {EVERYTHING_FEATURES.map((f) => (
          <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Check size={14} style={{ color: GOLD, marginTop: 3, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "rgba(234,230,218,0.8)" }}>{f}</span>
          </div>
        ))}
      </div>

      {/* Price callout */}
      <div style={{
        background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.25)",
        borderRadius: 12, padding: "14px 20px", marginBottom: 24, display: "inline-block",
      }}>
        <span style={{ fontSize: 32, fontWeight: 900, color: GOLD }}>AU$75</span>
        <span style={{ color: "rgba(234,230,218,0.5)", fontSize: 14 }}> / week</span>
        <div style={{ fontSize: 12, color: "rgba(234,230,218,0.4)", marginTop: 4 }}>
          14-day free trial · Cancel anytime
        </div>
      </div>

      {/* CTA */}
      <div>
        <Button asChild size="lg" style={{
          background: GOLD, color: "#000", border: "none",
          fontWeight: 700, fontSize: 15, width: "100%", padding: "14px 0",
        }}>
          <Link href="/upgrade">
            <Sparkles size={16} style={{ marginRight: 8 }} />
            Start My Free Trial
          </Link>
        </Button>
        <p style={{ fontSize: 12, color: "rgba(234,230,218,0.3)", marginTop: 10 }}>
          No charge for 14 days. Cancel before day 15 and pay nothing.
        </p>
      </div>
    </div>
  );
}

// ─── Top banner (slim full-width, used at top of free dashboard pages) ────────
function TopBanner({ message }: { message?: string }) {
  return (
    <div style={{
      background: "rgba(212,168,67,0.1)", borderBottom: "1px solid rgba(212,168,67,0.2)",
      padding: "10px 20px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 12, flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Sparkles size={14} style={{ color: GOLD }} />
        <span style={{ fontSize: 13, color: "#eae6da" }}>
          {message || "Aria would have caught that. Upgrade to AU$75/week and never miss an enquiry again."}
        </span>
      </div>
      <Button asChild size="sm" style={{ background: GOLD, color: "#000", border: "none", fontWeight: 700, flexShrink: 0 }}>
        <Link href="/upgrade">Start My Free Trial</Link>
      </Button>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function UpgradePrompt({
  feature,
  headline,
  message,
  variant = "card",
}: UpgradePromptProps) {
  if (variant === "inline") return <InlineBanner feature={feature} message={message} />;
  if (variant === "banner") return <TopBanner message={message} />;
  return <FullCard headline={headline} message={message} />;
}
