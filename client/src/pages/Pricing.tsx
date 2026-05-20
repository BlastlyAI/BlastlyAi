import { useState } from "react";
import { Link } from "wouter";
import { Check, Sparkles, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG      = "#02020c";
const PANEL   = "#0d0d1a";
const BORDER  = "rgba(255,255,255,0.08)";
const GOLD    = "#d4a843";
const GOLD_BG = "rgba(212,168,67,0.10)";
const GOLD_BD = "rgba(212,168,67,0.28)";
const TEXT    = "#eae6da";
const MUTED   = "rgba(234,230,218,0.50)";
const DIM     = "rgba(234,230,218,0.28)";

// ─── Plan feature lists ───────────────────────────────────────────────────────
const FREE_FEATURES = [
  "Connect all social platforms",
  "3 posts published per week",
  "AI polishes your caption",
  "Basic dashboard",
];

const EVERYTHING_FEATURES = [
  "Everything in Snap & Post",
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

export default function Pricing() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);

  const wsId = currentWorkspace?.id;
  const createCheckout = trpc.stripe.createWorkspaceCheckout.useMutation({
    onSuccess: (data) => {
      if (data?.url) {
        toast("Redirecting to checkout…");
        window.open(data.url, "_blank");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Could not start checkout. Please try again.");
    },
    onSettled: () => setLoadingCheckout(false),
  });

  function handleStartTrial() {
    if (!user) {
      window.location.href = getLoginUrl("/pricing");
      return;
    }
    if (!wsId) {
      toast.error("Please create a workspace first.");
      return;
    }
    setLoadingCheckout(true);
    createCheckout.mutate({ workspaceId: wsId, planTier: "everything", origin: window.location.origin });
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", color: TEXT, fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── Nav ── */}
      <nav style={{ borderBottom: `1px solid ${BORDER}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/">
          <span style={{ fontSize: 20, fontWeight: 900, color: TEXT, cursor: "pointer", letterSpacing: "-0.03em" }}>
            Blastly
          </span>
        </Link>
        <div style={{ display: "flex", gap: 12 }}>
          {user ? (
            <Link href="/dashboard/home">
              <Button size="sm" style={{ background: GOLD, color: "#000", border: "none", fontWeight: 700 }}>
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <a href={getLoginUrl("/pricing")}>
              <Button size="sm" variant="outline" style={{ borderColor: BORDER, color: TEXT }}>
                Sign in
              </Button>
            </a>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ textAlign: "center", padding: "72px 24px 48px" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: GOLD_BG, border: `1px solid ${GOLD_BD}`,
          borderRadius: 999, padding: "5px 14px", marginBottom: 24,
          fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: "0.06em", textTransform: "uppercase",
        }}>
          <Sparkles size={12} /> Simple pricing
        </div>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 900, margin: "0 0 16px", lineHeight: 1.1, letterSpacing: "-0.03em" }}>
          Two plans.<br />No surprises.
        </h1>
        <p style={{ fontSize: 17, color: MUTED, maxWidth: 480, margin: "0 auto" }}>
          Start free. Upgrade when Aria proves her worth — usually within the first week.
        </p>
      </div>

      {/* ── Plans grid ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: 24,
        maxWidth: 820,
        margin: "0 auto",
        padding: "0 24px 64px",
      }}>

        {/* ── PLAN 1: Snap & Post (Free) ── */}
        <div style={{
          background: PANEL,
          border: `1px solid ${BORDER}`,
          borderRadius: 20,
          padding: "36px 32px",
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase" }}>Plan 1</span>
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Snap &amp; Post</h2>
          <div style={{ marginBottom: 20 }}>
            <span style={{ fontSize: 36, fontWeight: 900, color: TEXT }}>Free</span>
            <span style={{ color: MUTED, fontSize: 14, marginLeft: 6 }}>forever</span>
          </div>
          <p style={{ color: MUTED, fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
            Get started with no credit card. Connect your platforms and let AI polish your posts.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", flex: 1 }}>
            {FREE_FEATURES.map((f) => (
              <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                <Check size={15} style={{ color: "#4ade80", marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: TEXT }}>{f}</span>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: "auto" }}>
            {user ? (
              <Link href="/dashboard/home">
                <Button
                  variant="outline"
                  style={{ width: "100%", borderColor: BORDER, color: TEXT, background: "transparent", fontWeight: 600 }}
                >
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <a href={getLoginUrl("/dashboard/home")} style={{ display: "block" }}>
                <Button
                  variant="outline"
                  style={{ width: "100%", borderColor: BORDER, color: TEXT, background: "transparent", fontWeight: 600 }}
                >
                  Get Started Free
                </Button>
              </a>
            )}
            <p style={{ fontSize: 12, color: DIM, textAlign: "center", marginTop: 10 }}>
              No credit card required
            </p>
          </div>
        </div>

        {/* ── PLAN 2: Everything ── */}
        <div style={{
          background: "linear-gradient(145deg, #0e0e1f, #0b0b18)",
          border: `1.5px solid ${GOLD_BD}`,
          borderRadius: 20,
          padding: "36px 32px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          boxShadow: `0 0 40px rgba(212,168,67,0.10), 0 12px 40px rgba(0,0,0,0.40)`,
        }}>
          {/* Popular badge */}
          <div style={{
            position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
            background: GOLD, color: "#000", fontSize: 11, fontWeight: 800,
            padding: "4px 16px", borderRadius: 999, letterSpacing: "0.06em", textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}>
            Most Popular
          </div>

          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" }}>Plan 2</span>
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Everything</h2>
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 36, fontWeight: 900, color: GOLD }}>AU$75</span>
            <span style={{ color: MUTED, fontSize: 14, marginLeft: 6 }}>/ week</span>
          </div>
          <p style={{ fontSize: 12, color: GOLD, marginBottom: 20, fontWeight: 600 }}>
            14-day free trial · Cancel anytime
          </p>
          <p style={{ color: MUTED, fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
            Aria runs your entire digital presence — content, calls, bookings, reviews, and more.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", flex: 1 }}>
            {EVERYTHING_FEATURES.map((f) => (
              <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                <Check size={15} style={{ color: GOLD, marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: TEXT }}>{f}</span>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: "auto" }}>
            <Button
              onClick={handleStartTrial}
              disabled={loadingCheckout}
              style={{
                width: "100%", background: GOLD, color: "#000", border: "none",
                fontWeight: 800, fontSize: 15, padding: "14px 0",
              }}
            >
              {loadingCheckout ? "Loading…" : (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Sparkles size={15} />
                  Start My Free Trial
                </span>
              )}
            </Button>
            <p style={{ fontSize: 12, color: DIM, textAlign: "center", marginTop: 10 }}>
              No charge for 14 days. Cancel before day 15 and pay nothing.
            </p>
          </div>
        </div>
      </div>

      {/* ── Add-on: Animated Aria (Coming Soon, greyed out) ── */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 24px 80px" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
          Add-on
        </p>
        <div
          onClick={() => setShowComingSoon(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setShowComingSoon(true)}
          style={{
            background: PANEL,
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            padding: "24px 28px",
            display: "flex",
            alignItems: "center",
            gap: 20,
            opacity: 0.55,
            cursor: "pointer",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "0.75"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "0.55"; }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: GOLD_BG, border: `1px solid ${GOLD_BD}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles size={22} style={{ color: GOLD }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>Animated Aria</span>
              <span style={{
                fontSize: 10, fontWeight: 800, color: GOLD, background: GOLD_BG,
                border: `1px solid ${GOLD_BD}`, borderRadius: 999,
                padding: "2px 10px", letterSpacing: "0.06em", textTransform: "uppercase",
              }}>
                Coming Soon
              </span>
            </div>
            <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
              A fully animated AI avatar that speaks, reacts, and represents your brand on video.
            </p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: TEXT }}>AU$30</div>
            <div style={{ fontSize: 12, color: MUTED }}>/month</div>
          </div>
          <Lock size={18} style={{ color: MUTED, flexShrink: 0 }} />
        </div>
      </div>

      {/* ── Coming Soon Modal ── */}
      {showComingSoon && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setShowComingSoon(false)}
        >
          <div
            style={{
              background: PANEL, border: `1px solid ${GOLD_BD}`,
              borderRadius: 20, padding: "40px 36px", maxWidth: 420, width: "100%",
              textAlign: "center", position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowComingSoon(false)}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: MUTED }}
            >
              <X size={18} />
            </button>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: GOLD_BG, border: `1px solid ${GOLD_BD}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <Sparkles size={26} style={{ color: GOLD }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px", color: TEXT }}>
              Animated Aria
            </h3>
            <p style={{ fontSize: 15, color: MUTED, margin: "0 0 24px", lineHeight: 1.6 }}>
              Coming soon — we will notify you when this is available.
            </p>
            <Button
              onClick={() => setShowComingSoon(false)}
              style={{ background: GOLD, color: "#000", border: "none", fontWeight: 700, width: "100%" }}
            >
              Got it
            </Button>
          </div>
        </div>
      )}

      {/* ── FAQ strip ── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, padding: "48px 24px", maxWidth: 820, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32 }}>
          {[
            { q: "Do I need a credit card to start?", a: "No. The Snap & Post plan is free forever with no card required. The Everything plan starts with a 14-day free trial — your card is only charged after day 14." },
            { q: "Can I cancel anytime?", a: "Yes. Cancel before day 15 of your trial and you will never be charged. After that, cancel at any time and your access continues until the end of the billing week." },
            { q: "Why weekly pricing?", a: "Weekly billing keeps things honest. You see exactly what you are paying each week, and you can cancel without worrying about a large monthly charge." },
          ].map(({ q, a }) => (
            <div key={q}>
              <p style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: "0 0 8px" }}>{q}</p>
              <p style={{ fontSize: 13, color: MUTED, margin: 0, lineHeight: 1.6 }}>{a}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
