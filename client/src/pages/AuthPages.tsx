/**
 * AuthPages.tsx
 * Fully branded Blastly auth screens — no Manus branding anywhere.
 * Five screens: Entry, Sign Up, Login, Forgot Password, Welcome.
 */

import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  supabaseSignIn,
  supabaseSignOut,
  supabaseSignUp,
  supabaseResetPasswordForEmail,
  supabaseGetSession,
  supabaseUpdatePassword,
  formatSupabaseAuthError,
} from "@/lib/supabaseAuth";
import { upsertUserProfile, completeWelcome, fetchUserProfile } from "@/lib/supabaseProfile";

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG = "#02020c";
const GOLD = "#d4a843";
const SURFACE = "#0d0d1a";
const BORDER = "rgba(212,168,67,0.18)";
const TEXT = "#f0ede6";
const MUTED = "#7a7a8a";

// ── Shared layout wrapper ─────────────────────────────────────────────────────
function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "'DM Mono', monospace",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(212,168,67,0.06), transparent 70%)",
          pointerEvents: "none",
        }}
      />
      {/* Blastly logo */}
      <div style={{ marginBottom: "32px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <Link href="/">
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "28px",
              fontWeight: 700,
              color: GOLD,
              letterSpacing: "0.04em",
              cursor: "pointer",
            }}
          >
            BLASTLY
          </span>
        </Link>
        <div
          style={{
            width: "40px",
            height: "2px",
            background: GOLD,
            margin: "8px auto 0",
            opacity: 0.6,
          }}
        />
      </div>
      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          borderRadius: "16px",
          padding: "36px 28px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {children}
      </div>
      {/* Footer */}
      <p
        style={{
          marginTop: "24px",
          fontSize: "11px",
          color: MUTED,
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        © {new Date().getFullYear()} Blastly. All rights reserved.
      </p>
    </div>
  );
}

// ── Shared input ──────────────────────────────────────────────────────────────
function AuthInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label
        style={{
          display: "block",
          fontSize: "10px",
          fontFamily: "'DM Mono', monospace",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: MUTED,
          marginBottom: "6px",
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${BORDER}`,
          borderRadius: "8px",
          padding: "12px 14px",
          fontSize: "14px",
          fontFamily: "'DM Mono', monospace",
          color: TEXT,
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 0.2s",
        }}
        onFocus={(e) => (e.target.style.borderColor = GOLD)}
        onBlur={(e) => (e.target.style.borderColor = BORDER)}
      />
    </div>
  );
}

// ── Gold button ───────────────────────────────────────────────────────────────
function GoldButton({
  children,
  onClick,
  loading,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        width: "100%",
        background: loading ? "rgba(212,168,67,0.4)" : GOLD,
        color: "#02020c",
        border: "none",
        borderRadius: "8px",
        padding: "14px",
        fontSize: "13px",
        fontFamily: "'DM Mono', monospace",
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: loading ? "not-allowed" : "pointer",
        transition: "opacity 0.2s",
        marginTop: "8px",
      }}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
function OrDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
      <div style={{ flex: 1, height: "1px", background: BORDER }} />
      <span style={{ fontSize: "11px", color: MUTED, fontFamily: "'DM Mono', monospace" }}>OR</span>
      <div style={{ flex: 1, height: "1px", background: BORDER }} />
    </div>
  );
}

// ── Social auth buttons (placeholder) ────────────────────────────────────────
function SocialAuthButtons() {
  const msg = () => toast.info("Google and Apple sign-in coming soon.");
  return (
    <div style={{ display: "flex", gap: "10px" }}>
      <button
        onClick={msg}
        style={{
          flex: 1,
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${BORDER}`,
          borderRadius: "8px",
          padding: "11px",
          color: TEXT,
          fontSize: "13px",
          fontFamily: "'DM Mono', monospace",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Google
      </button>
      <button
        onClick={msg}
        style={{
          flex: 1,
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${BORDER}`,
          borderRadius: "8px",
          padding: "11px",
          color: TEXT,
          fontSize: "13px",
          fontFamily: "'DM Mono', monospace",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
        Apple
      </button>
    </div>
  );
}

// ── Industries ────────────────────────────────────────────────────────────────
const INDUSTRIES = [
  { slug: "trades", label: "Trades & Construction" },
  { slug: "hospitality", label: "Hospitality & Food" },
  { slug: "health", label: "Health & Wellness" },
  { slug: "retail", label: "Retail & E-commerce" },
  { slug: "professional", label: "Professional Services" },
  { slug: "beauty", label: "Beauty & Personal Care" },
  { slug: "real-estate", label: "Real Estate" },
  { slug: "education", label: "Education & Training" },
  { slug: "automotive", label: "Automotive" },
  { slug: "other", label: "Other" },
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. AUTH ENTRY
// ─────────────────────────────────────────────────────────────────────────────
export function AuthEntry() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    navigate(user.welcomeCompleted ? "/command" : "/welcome");
  }, [user, loading, navigate]);

  return (
    <AuthShell>
      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "26px",
            fontWeight: 700,
            color: TEXT,
            marginBottom: "8px",
            lineHeight: 1.2,
          }}
        >
          Your business,<br />
          <span style={{ color: GOLD }}>everywhere at once.</span>
        </h1>
        <p style={{ fontSize: "13px", color: MUTED, marginBottom: "32px", lineHeight: 1.6 }}>
          The world's most complete marketing intelligence platform for small and medium business.
        </p>
        <GoldButton onClick={() => navigate("/signup")}>Start Free Audit</GoldButton>
        <button
          onClick={() => navigate("/login")}
          style={{
            width: "100%",
            background: "transparent",
            border: `1px solid ${BORDER}`,
            borderRadius: "8px",
            padding: "14px",
            fontSize: "13px",
            fontFamily: "'DM Mono', monospace",
            color: TEXT,
            cursor: "pointer",
            marginTop: "12px",
            letterSpacing: "0.05em",
          }}
        >
          Already have an account? Log in
        </button>
        <p style={{ marginTop: "24px", fontSize: "11px", color: MUTED, lineHeight: 1.6 }}>
          No credit card required. 14-day free trial.
        </p>
      </div>
    </AuthShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SIGN UP
// ─────────────────────────────────────────────────────────────────────────────
export function AuthSignup() {
  const [, navigate] = useLocation();
  const { user, loading, refresh } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [industrySlug, setIndustrySlug] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);

  const planParam = new URLSearchParams(window.location.search).get("plan") ?? "";
  const isPremium = planParam === "everything";

  function getPostSignupRoute(welcomeCompleted: boolean) {
    if (welcomeCompleted) return "/command";
    if (isPremium) return "/onboarding/managed?plan=everything";
    return "/welcome";
  }

  useEffect(() => {
    if (loading || !user) return;
    navigate(getPostSignupRoute(user.welcomeCompleted));
  }, [user, loading, navigate]);

  const handleSubmit = async () => {
    if (!name || !email || !password) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!agreed) {
      toast.error("Please agree to the terms to continue");
      return;
    }

    const emailTrim = email.trim();
    const nameTrim = name.trim();

    setAuthBusy(true);
    try {
      const sb = await supabaseSignUp(emailTrim, password, {
        data: { full_name: nameTrim },
      });
      if (sb.error) {
        toast.error(formatSupabaseAuthError(sb.error));
        return;
      }
      if (!sb.data.user) {
        toast.error("Sign up failed — please try again.");
        return;
      }

      if (!sb.data.session) {
        toast.success("Check your email to confirm your account, then log in.");
        navigate("/login");
        return;
      }

      await upsertUserProfile(sb.data.user, {
        displayName: nameTrim,
        businessName: businessName.trim() || undefined,
        industry: industrySlug.trim() || undefined,
      });

      await refresh();
      navigate(getPostSignupRoute(false));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign up failed");
      await supabaseSignOut().catch(() => {});
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <AuthShell>
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "22px",
          fontWeight: 700,
          color: TEXT,
          marginBottom: "4px",
        }}
      >
        Set up your account
      </h2>
      <p style={{ fontSize: "12px", color: MUTED, marginBottom: "24px" }}>
        14-day free trial. No credit card needed.
      </p>

      <SocialAuthButtons />
      <OrDivider />

      <AuthInput label="Your name" value={name} onChange={setName} autoComplete="name" />
      <AuthInput label="Email address" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <AuthInput label="Password (min 8 chars)" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
      <AuthInput label="Business name (optional)" value={businessName} onChange={setBusinessName} />

      <div style={{ marginBottom: "16px" }}>
        <label
          style={{
            display: "block",
            fontSize: "10px",
            fontFamily: "'DM Mono', monospace",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: MUTED,
            marginBottom: "8px",
          }}
        >
          Industry
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {INDUSTRIES.map((ind) => (
            <button
              key={ind.slug}
              type="button"
              onClick={() => setIndustrySlug(ind.slug === industrySlug ? "" : ind.slug)}
              style={{
                padding: "6px 12px",
                borderRadius: "20px",
                fontSize: "11px",
                fontFamily: "'DM Mono', monospace",
                border: `1px solid ${industrySlug === ind.slug ? GOLD : BORDER}`,
                background: industrySlug === ind.slug ? "rgba(212,168,67,0.12)" : "transparent",
                color: industrySlug === ind.slug ? GOLD : MUTED,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {ind.label}
            </button>
          ))}
        </div>
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          cursor: "pointer",
          marginBottom: "16px",
        }}
      >
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          style={{ marginTop: "3px", accentColor: GOLD, flexShrink: 0 }}
        />
        <span style={{ fontSize: "12px", color: MUTED, lineHeight: 1.5 }}>
          I agree to the{" "}
          <a href="/terms" style={{ color: GOLD, textDecoration: "none" }}>Terms of Service</a>
          {" "}and{" "}
          <a href="/privacy" style={{ color: GOLD, textDecoration: "none" }}>Privacy Policy</a>
        </span>
      </label>

      <GoldButton onClick={() => void handleSubmit()} loading={authBusy}>
        Create Account
      </GoldButton>

      <p style={{ textAlign: "center", marginTop: "20px", fontSize: "12px", color: MUTED }}>
        Already have an account?{" "}
        <Link href="/login">
          <span style={{ color: GOLD, cursor: "pointer" }}>Log in</span>
        </Link>
      </p>
    </AuthShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. LOGIN
// ─────────────────────────────────────────────────────────────────────────────
export function AuthLogin() {
  const [, navigate] = useLocation();
  const { user, loading, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    navigate(user.welcomeCompleted ? "/command" : "/welcome");
  }, [user, loading, navigate]);

  const handleSubmit = async () => {
    if (!email || !password) {
      toast.error("Please enter your email and password");
      return;
    }

    const emailTrim = email.trim();
    setAuthBusy(true);
    try {
      const res = await supabaseSignIn(emailTrim, password);
      if (res.error) {
        toast.error(formatSupabaseAuthError(res.error));
        return;
      }
      if (res.data.user) {
        const profile = await fetchUserProfile(res.data.user);
        await refresh();
        navigate(profile.welcomeCompleted ? "/command" : "/welcome");
        return;
      }
      await refresh();
      navigate("/command");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Login failed");
      await supabaseSignOut().catch(() => {});
    } finally {
      setAuthBusy(false);
    }
  };

  void remember;

  return (
    <AuthShell>
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "22px",
          fontWeight: 700,
          color: TEXT,
          marginBottom: "4px",
        }}
      >
        Welcome back
      </h2>
      <p style={{ fontSize: "12px", color: MUTED, marginBottom: "24px" }}>
        Log in to your Blastly account.
      </p>

      <SocialAuthButtons />
      <OrDivider />

      <AuthInput label="Email address" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <AuthInput label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            style={{ accentColor: GOLD }}
          />
          <span style={{ fontSize: "12px", color: MUTED }}>Remember me</span>
        </label>
        <Link href="/forgot-password">
          <span style={{ fontSize: "12px", color: GOLD, cursor: "pointer" }}>Forgot password?</span>
        </Link>
      </div>

      <GoldButton onClick={() => void handleSubmit()} loading={authBusy}>
        Log In
      </GoldButton>

      <p style={{ textAlign: "center", marginTop: "20px", fontSize: "12px", color: MUTED }}>
        Don't have an account?{" "}
        <Link href="/signup">
          <span style={{ color: GOLD, cursor: "pointer" }}>Set up for free</span>
        </Link>
      </p>
    </AuthShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. FORGOT PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
export function AuthForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabaseResetPasswordForEmail(email.trim(), redirectTo);
      if (error) {
        toast.error(error.message);
        return;
      }
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthShell>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(212,168,67,0.12)",
              border: `1px solid ${GOLD}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: "24px",
            }}
          >
            ✉
          </div>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "22px",
              fontWeight: 700,
              color: TEXT,
              marginBottom: "12px",
            }}
          >
            Check your inbox
          </h2>
          <p style={{ fontSize: "13px", color: MUTED, lineHeight: 1.6, marginBottom: "24px" }}>
            If an account exists for <strong style={{ color: TEXT }}>{email}</strong>, you'll receive a password reset link shortly.
          </p>
          <Link href="/login">
            <span style={{ fontSize: "13px", color: GOLD, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>
              ← Back to login
            </span>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "22px",
          fontWeight: 700,
          color: TEXT,
          marginBottom: "4px",
        }}
      >
        Reset your password
      </h2>
      <p style={{ fontSize: "12px", color: MUTED, marginBottom: "24px" }}>
        Enter your email and we'll send a reset link.
      </p>

      <AuthInput label="Email address" type="email" value={email} onChange={setEmail} autoComplete="email" />

      <GoldButton onClick={() => void handleSubmit()} loading={busy}>
        Send Reset Link
      </GoldButton>

      <p style={{ textAlign: "center", marginTop: "20px", fontSize: "12px", color: MUTED }}>
        <Link href="/login">
          <span style={{ color: GOLD, cursor: "pointer" }}>← Back to login</span>
        </Link>
      </p>
    </AuthShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4b. RESET PASSWORD (token from email link)
// ─────────────────────────────────────────────────────────────────────────────
export function AuthResetPassword() {
  const [, navigate] = useLocation();
  const { refresh } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);

  useEffect(() => {
    void (async () => {
      const session = await supabaseGetSession();
      setHasRecoverySession(Boolean(session));
    })();
  }, []);

  const handleSubmit = async () => {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabaseUpdatePassword(password);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password updated — you are now logged in.");
      await refresh();
      navigate("/command");
    } finally {
      setBusy(false);
    }
  };

  if (hasRecoverySession === false) {
    return (
      <AuthShell>
        <p style={{ color: MUTED, textAlign: "center" }}>
          Invalid or expired reset link.{" "}
          <Link href="/forgot-password">
            <span style={{ color: GOLD, cursor: "pointer" }}>Request a new one</span>
          </Link>
        </p>
      </AuthShell>
    );
  }

  if (hasRecoverySession === null) {
    return (
      <AuthShell>
        <p style={{ color: MUTED, textAlign: "center" }}>Loading…</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "22px",
          fontWeight: 700,
          color: TEXT,
          marginBottom: "4px",
        }}
      >
        Choose a new password
      </h2>
      <p style={{ fontSize: "12px", color: MUTED, marginBottom: "24px" }}>
        Make it strong — at least 8 characters.
      </p>

      <AuthInput label="New password" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
      <AuthInput label="Confirm password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />

      <GoldButton onClick={() => void handleSubmit()} loading={busy}>
        Update Password
      </GoldButton>
    </AuthShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. WELCOME (first login)
// ─────────────────────────────────────────────────────────────────────────────
const WELCOME_STEPS = [
  {
    icon: "🔗",
    title: "Connect your social accounts",
    desc: "Link Facebook, Instagram, Google Business, TikTok and more in one place.",
    action: "Connect now",
    href: "/settings/channels",
  },
  {
    icon: "🔍",
    title: "Run your first audit",
    desc: "Enter your website URL and get 9 layers of market intelligence in 60 seconds.",
    action: "Start audit",
    href: "/audit",
  },
  {
    icon: "📊",
    title: "Explore your dashboard",
    desc: "See your intelligence feed, post queue, calendar, and command centre.",
    action: "Open dashboard",
    href: "/command",
  },
];

export function AuthWelcome() {
  const [, navigate] = useLocation();
  const { user, loading, refresh } = useAuth();
  const [completed, setCompleted] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  const markWelcomeComplete = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await completeWelcome(user.id);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleStepClick = (idx: number, href: string) => {
    setCompleted((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
    void markWelcomeComplete();
    navigate(href);
  };

  const handleSkip = () => {
    void markWelcomeComplete().then(() => navigate("/command"));
  };

  return (
    <AuthShell>
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ fontSize: "36px", marginBottom: "12px" }}>🎉</div>
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "24px",
            fontWeight: 700,
            color: TEXT,
            marginBottom: "6px",
          }}
        >
          Welcome to Blastly
          {user?.name ? <span style={{ color: GOLD }}>, {user.name.split(" ")[0]}</span> : null}
        </h2>
        <p style={{ fontSize: "13px", color: MUTED, lineHeight: 1.6 }}>
          You're in. Let's get you set up in three quick steps.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
        {WELCOME_STEPS.map((step, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleStepClick(idx, step.href)}
            style={{
              background: completed.includes(idx) ? "rgba(212,168,67,0.08)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${completed.includes(idx) ? GOLD : BORDER}`,
              borderRadius: "12px",
              padding: "16px",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              transition: "all 0.2s",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: completed.includes(idx) ? "rgba(212,168,67,0.2)" : "rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                flexShrink: 0,
              }}
            >
              {completed.includes(idx) ? "✓" : step.icon}
            </div>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: completed.includes(idx) ? GOLD : TEXT,
                  marginBottom: "4px",
                }}
              >
                {step.title}
              </p>
              <p style={{ fontSize: "12px", color: MUTED, lineHeight: 1.5 }}>{step.desc}</p>
            </div>
            <span
              style={{
                fontSize: "11px",
                color: GOLD,
                fontFamily: "'DM Mono', monospace",
                whiteSpace: "nowrap",
                paddingTop: "2px",
              }}
            >
              {step.action} →
            </span>
          </button>
        ))}
      </div>

      {/* Aria placeholder */}
      <div
        style={{
          background: "rgba(212,168,67,0.04)",
          border: `1px dashed ${BORDER}`,
          borderRadius: "12px",
          padding: "16px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "rgba(212,168,67,0.1)",
            border: `1px solid ${BORDER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            flexShrink: 0,
          }}
        >
          🤖
        </div>
        <div>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: GOLD, marginBottom: "2px" }}>
            Aria — AI Assistant
          </p>
          <p style={{ fontSize: "11px", color: MUTED }}>
            Your intelligent business companion is coming soon.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSkip}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          fontSize: "12px",
          color: MUTED,
          cursor: "pointer",
          fontFamily: "'DM Mono', monospace",
          padding: "8px",
        }}
      >
        Skip for now — go to dashboard →
      </button>
    </AuthShell>
  );
}
