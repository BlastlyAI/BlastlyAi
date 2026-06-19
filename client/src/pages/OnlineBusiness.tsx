/**
 * OnlineBusiness.tsx
 * /online — Category selection + 4-step onboarding for digital products & services.
 * This is the path for DateReady, BillSnap, SaaS, memberships, etc.
 * Blastly runs Meta ads → client's website. Fee: 5% of revenue.
 */
import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  BookOpen, Briefcase, Code2, Users, Heart, BarChart2,
  HelpCircle, ArrowRight, ArrowLeft, Check, Globe,
  DollarSign, User, Facebook, Instagram, ChevronDown,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────
type Category = {
  id: string;
  icon: React.ElementType;
  label: string;
  sub: string;
  accent: string;
};

type Step = 1 | 2 | 3 | 4;

type FormData = {
  // Step 1
  category: string;
  businessName: string;
  whatYouSell: string;
  websiteUrl: string;
  priceModel: string;
  customerAge: string;
  customerGender: string;
  customerInterest: string;
  // Step 2 — social connections (UI only, no OAuth in frontend-first build)
  facebookConnected: boolean;
  instagramConnected: boolean;
  // Step 3
  monthlyBudget: string;
  // Step 4
  email: string;
  password: string;
  confirmPassword: string;
};

// ── Category data ─────────────────────────────────────────────────────────
const CATEGORIES: Category[] = [
  {
    id: "digital-product",
    icon: BookOpen,
    label: "Digital Product",
    sub: "Ebook, course, template, software",
    accent: "oklch(0.60 0.20 240)",
  },
  {
    id: "service-business",
    icon: Briefcase,
    label: "Service Business",
    sub: "Consulting, coaching, freelance",
    accent: "oklch(0.62 0.18 200)",
  },
  {
    id: "saas-app",
    icon: Code2,
    label: "SaaS or App",
    sub: "Software, tool, platform",
    accent: "oklch(0.60 0.22 270)",
  },
  {
    id: "membership",
    icon: Users,
    label: "Membership or Subscription",
    sub: "Community, newsletter, access",
    accent: "oklch(0.58 0.20 300)",
  },
  {
    id: "dating-lifestyle",
    icon: Heart,
    label: "Dating or Lifestyle Platform",
    sub: "Dating, wellness, personal development",
    accent: "oklch(0.60 0.22 0)",
  },
  {
    id: "finance-comparison",
    icon: BarChart2,
    label: "Finance or Comparison Platform",
    sub: "Finance tools, comparison sites, fintech",
    accent: "oklch(0.62 0.18 145)",
  },
  {
    id: "other",
    icon: HelpCircle,
    label: "Other Digital Business",
    sub: "Something else — tell us about it",
    accent: "oklch(0.55 0.04 245)",
  },
];

const PRICE_MODELS = [
  "Single product (one price)",
  "Tiered packages (e.g. Basic / Pro / Elite)",
  "Subscription / recurring",
  "Pay what you want",
  "Free with upsells",
];

const AGE_RANGES = ["18–24", "25–34", "35–44", "45–54", "55+", "All ages"];
const GENDERS = ["Mostly men", "Mostly women", "Mixed / all genders"];
const INTERESTS = [
  "Dating & relationships",
  "Health & fitness",
  "Business & finance",
  "Technology",
  "Lifestyle & fashion",
  "Education & learning",
  "Home & family",
  "Travel",
  "Other",
];

const BUDGET_OPTIONS = [
  { label: "AU$500 / month", value: "500" },
  { label: "AU$1,000 / month", value: "1000" },
  { label: "AU$2,000 / month", value: "2000" },
  { label: "AU$3,000 / month", value: "3000" },
  { label: "AU$5,000 / month", value: "5000" },
  { label: "AU$10,000+ / month", value: "10000" },
];

// ── Design tokens ─────────────────────────────────────────────────────────
const BG = "#02020c";
const CARD_BG = "oklch(0.13 0.014 245 / 0.95)";
const BORDER = "oklch(0.26 0.012 245 / 0.70)";
const GOLD = "#d4a843";
const TEXT_DIM = "oklch(0.50 0.04 245)";
const TEXT_MUTED = "oklch(0.38 0.02 245)";

// ── Shared style helpers ──────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "oklch(0.10 0.010 245)",
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  padding: "10px 14px",
  color: "#fff",
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase" as const,
  color: TEXT_DIM,
  marginBottom: 6,
  display: "block",
};

// ── Step indicator ────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: Step }) {
  const steps = ["About you", "Connect pages", "Budget", "Create account"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32 }}>
      {steps.map((label, i) => {
        const num = (i + 1) as Step;
        const done = num < current;
        const active = num === current;
        const accent = "oklch(0.60 0.20 240)";
        return (
          <React.Fragment key={num}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: done ? accent : active ? `${accent}30` : "oklch(0.18 0.01 245)",
                  border: `1.5px solid ${done || active ? accent : BORDER}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
              >
                {done ? (
                  <Check size={13} style={{ color: "#fff" }} />
                ) : (
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 11,
                      fontWeight: 700,
                      color: active ? accent : TEXT_MUTED,
                    }}
                  >
                    {num}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: active ? accent : TEXT_MUTED,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: i < current - 1 ? "oklch(0.60 0.20 240)" : BORDER,
                  margin: "0 6px",
                  marginBottom: 20,
                  transition: "background 0.3s ease",
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Category selection screen ─────────────────────────────────────────────
function CategorySelect({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: GOLD,
            marginBottom: 8,
          }}
        >
          Online Business
        </p>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(1.4rem, 3vw, 2rem)",
            fontWeight: 700,
            color: "#fff",
            margin: 0,
            marginBottom: 8,
          }}
        >
          What kind of online business do you run?
        </h1>
        <p style={{ color: TEXT_DIM, fontSize: 13, fontFamily: "'Space Grotesk', sans-serif" }}>
          Blastly will run your Meta ads and report results. You keep full control.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
          maxWidth: 780,
          margin: "0 auto",
        }}
      >
        {CATEGORIES.map(({ id, icon: Icon, label, sub, accent }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            style={{
              background: selected === id ? `${accent}18` : CARD_BG,
              border: `1.5px solid ${selected === id ? accent : BORDER}`,
              borderRadius: 14,
              padding: "20px 18px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 10,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.18s ease",
              boxShadow: selected === id ? `0 4px 20px ${accent}30` : "none",
            }}
            onMouseEnter={e => {
              if (selected !== id) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = accent;
              }
            }}
            onMouseLeave={e => {
              if (selected !== id) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER;
              }
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: `${accent}20`,
                border: `1px solid ${accent}40`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon size={18} style={{ color: accent }} />
            </div>
            <div>
              <p
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#fff",
                  margin: 0,
                  marginBottom: 3,
                }}
              >
                {label}
              </p>
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9,
                  color: TEXT_DIM,
                  margin: 0,
                  lineHeight: 1.5,
                  letterSpacing: "0.02em",
                }}
              >
                {sub}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 1: About your business ───────────────────────────────────────────
function Step1({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (field: keyof FormData, value: string) => void;
}) {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <h2
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "clamp(1.2rem, 2.5vw, 1.5rem)",
          fontWeight: 700,
          color: "#fff",
          marginBottom: 6,
        }}
      >
        Tell us about your business
      </h2>
      <p style={{ color: TEXT_DIM, fontSize: 13, marginBottom: 28, fontFamily: "'Space Grotesk', sans-serif" }}>
        This helps Blastly write your ads and target the right audience.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Business name */}
        <div>
          <label style={labelStyle}>Business or product name</label>
          <input
            style={inputStyle}
            type="text"
            placeholder="e.g. DateReady"
            value={data.businessName}
            onChange={e => onChange("businessName", e.target.value)}
          />
        </div>

        {/* What you sell */}
        <div>
          <label style={labelStyle}>What do you sell?</label>
          <input
            style={inputStyle}
            type="text"
            placeholder="e.g. Dating profile makeover packages"
            value={data.whatYouSell}
            onChange={e => onChange("whatYouSell", e.target.value)}
          />
        </div>

        {/* Website URL */}
        <div>
          <label style={labelStyle}>Your website URL</label>
          <div style={{ position: "relative" }}>
            <Globe
              size={14}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: TEXT_DIM,
              }}
            />
            <input
              style={{ ...inputStyle, paddingLeft: 34 }}
              type="url"
              placeholder="https://dateready.pro"
              value={data.websiteUrl}
              onChange={e => onChange("websiteUrl", e.target.value)}
            />
          </div>
        </div>

        {/* Price model */}
        <div>
          <label style={labelStyle}>How do you price your product?</label>
          <div style={{ position: "relative" }}>
            <select
              style={{ ...inputStyle, appearance: "none", paddingRight: 32, cursor: "pointer" }}
              value={data.priceModel}
              onChange={e => onChange("priceModel", e.target.value)}
            >
              <option value="">Select a pricing model…</option>
              {PRICE_MODELS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <ChevronDown
              size={14}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: TEXT_DIM,
                pointerEvents: "none",
              }}
            />
          </div>
        </div>

        {/* Customer profile */}
        <div>
          <label style={labelStyle}>Who is your customer?</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {/* Age */}
            <div style={{ position: "relative" }}>
              <select
                style={{ ...inputStyle, appearance: "none", paddingRight: 24, cursor: "pointer", fontSize: 12 }}
                value={data.customerAge}
                onChange={e => onChange("customerAge", e.target.value)}
              >
                <option value="">Age range</option>
                {AGE_RANGES.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <ChevronDown size={12} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: TEXT_DIM, pointerEvents: "none" }} />
            </div>
            {/* Gender */}
            <div style={{ position: "relative" }}>
              <select
                style={{ ...inputStyle, appearance: "none", paddingRight: 24, cursor: "pointer", fontSize: 12 }}
                value={data.customerGender}
                onChange={e => onChange("customerGender", e.target.value)}
              >
                <option value="">Gender</option>
                {GENDERS.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <ChevronDown size={12} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: TEXT_DIM, pointerEvents: "none" }} />
            </div>
            {/* Interest */}
            <div style={{ position: "relative" }}>
              <select
                style={{ ...inputStyle, appearance: "none", paddingRight: 24, cursor: "pointer", fontSize: 12 }}
                value={data.customerInterest}
                onChange={e => onChange("customerInterest", e.target.value)}
              >
                <option value="">Interest</option>
                {INTERESTS.map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
              <ChevronDown size={12} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: TEXT_DIM, pointerEvents: "none" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Connect social pages ──────────────────────────────────────────
function Step2({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (field: keyof FormData, value: boolean) => void;
}) {
  const accent = "oklch(0.60 0.20 240)";
  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <h2
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "clamp(1.2rem, 2.5vw, 1.5rem)",
          fontWeight: 700,
          color: "#fff",
          marginBottom: 6,
        }}
      >
        Connect your pages
      </h2>
      <p style={{ color: TEXT_DIM, fontSize: 13, marginBottom: 28, fontFamily: "'Space Grotesk', sans-serif" }}>
        Blastly uses these to run your Meta ads. You stay in full control — we never post without your approval.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Facebook */}
        <div
          style={{
            background: data.facebookConnected ? "oklch(0.22 0.08 240 / 0.6)" : CARD_BG,
            border: `1.5px solid ${data.facebookConnected ? "oklch(0.55 0.22 240)" : BORDER}`,
            borderRadius: 14,
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "oklch(0.45 0.22 240 / 0.20)",
                border: "1px solid oklch(0.45 0.22 240 / 0.40)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Facebook size={20} style={{ color: "oklch(0.65 0.22 240)" }} />
            </div>
            <div>
              <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>
                Facebook Page
              </p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: TEXT_DIM, margin: 0, letterSpacing: "0.04em" }}>
                Required to run Meta ads
              </p>
            </div>
          </div>
          <button
            onClick={() => onChange("facebookConnected", !data.facebookConnected)}
            style={{
              background: data.facebookConnected ? "oklch(0.55 0.22 240)" : "oklch(0.18 0.01 245)",
              border: `1px solid ${data.facebookConnected ? "oklch(0.55 0.22 240)" : BORDER}`,
              borderRadius: 8,
              padding: "7px 16px",
              color: "#fff",
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              letterSpacing: "0.08em",
              cursor: "pointer",
              transition: "all 0.18s ease",
              whiteSpace: "nowrap",
            }}
          >
            {data.facebookConnected ? "✓ Connected" : "Connect"}
          </button>
        </div>

        {/* Instagram */}
        <div
          style={{
            background: data.instagramConnected ? "oklch(0.22 0.08 0 / 0.4)" : CARD_BG,
            border: `1.5px solid ${data.instagramConnected ? "oklch(0.60 0.22 0)" : BORDER}`,
            borderRadius: 14,
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "oklch(0.55 0.22 0 / 0.20)",
                border: "1px solid oklch(0.55 0.22 0 / 0.40)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Instagram size={20} style={{ color: "oklch(0.70 0.22 0)" }} />
            </div>
            <div>
              <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>
                Instagram Account
              </p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: TEXT_DIM, margin: 0, letterSpacing: "0.04em" }}>
                Optional — extends your ad reach
              </p>
            </div>
          </div>
          <button
            onClick={() => onChange("instagramConnected", !data.instagramConnected)}
            style={{
              background: data.instagramConnected ? "oklch(0.60 0.22 0)" : "oklch(0.18 0.01 245)",
              border: `1px solid ${data.instagramConnected ? "oklch(0.60 0.22 0)" : BORDER}`,
              borderRadius: 8,
              padding: "7px 16px",
              color: "#fff",
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              letterSpacing: "0.08em",
              cursor: "pointer",
              transition: "all 0.18s ease",
              whiteSpace: "nowrap",
            }}
          >
            {data.instagramConnected ? "✓ Connected" : "Connect"}
          </button>
        </div>
      </div>

      {/* Info note */}
      <div
        style={{
          marginTop: 20,
          padding: "12px 16px",
          background: `${accent}10`,
          border: `1px solid ${accent}30`,
          borderRadius: 10,
        }}
      >
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: TEXT_DIM, margin: 0, lineHeight: 1.6 }}>
          You can also connect these inside your dashboard after signup. Your ad account stays yours — Blastly only manages the campaigns.
        </p>
      </div>
    </div>
  );
}

// ── Step 3: Budget setup ──────────────────────────────────────────────────
function Step3({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (field: keyof FormData, value: string) => void;
}) {
  const accent = "oklch(0.60 0.20 240)";
  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <h2
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "clamp(1.2rem, 2.5vw, 1.5rem)",
          fontWeight: 700,
          color: "#fff",
          marginBottom: 6,
        }}
      >
        Set your ad budget
      </h2>
      <p style={{ color: TEXT_DIM, fontSize: 13, marginBottom: 28, fontFamily: "'Space Grotesk', sans-serif" }}>
        This is your monthly Meta ad spend. Blastly takes 5% of revenue generated — nothing else.
      </p>

      {/* Budget selector */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 28 }}>
        {BUDGET_OPTIONS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => onChange("monthlyBudget", value)}
            style={{
              background: data.monthlyBudget === value ? `${accent}20` : CARD_BG,
              border: `1.5px solid ${data.monthlyBudget === value ? accent : BORDER}`,
              borderRadius: 12,
              padding: "14px 12px",
              color: data.monthlyBudget === value ? "#fff" : TEXT_DIM,
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 13,
              fontWeight: data.monthlyBudget === value ? 700 : 400,
              cursor: "pointer",
              transition: "all 0.18s ease",
              textAlign: "center",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Two payment options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: TEXT_DIM,
            marginBottom: 4,
          }}
        >
          How would you like to pay your ad spend?
        </p>

        {/* Option A — Pay Meta directly */}
        <div
          style={{
            background: CARD_BG,
            border: `1.5px solid ${BORDER}`,
            borderRadius: 14,
            padding: "16px 18px",
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "oklch(0.45 0.22 240 / 0.15)",
              border: "1px solid oklch(0.45 0.22 240 / 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <DollarSign size={16} style={{ color: "oklch(0.65 0.22 240)" }} />
          </div>
          <div>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "#fff", margin: 0, marginBottom: 3 }}>
              Pay Meta directly
            </p>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: TEXT_DIM, margin: 0, lineHeight: 1.6, letterSpacing: "0.02em" }}>
              Your money goes straight to Meta. Blastly manages the campaigns. You see every dollar spent in your Meta Ads account. This is the recommended option.
            </p>
          </div>
        </div>

        {/* Option B — Blastly manages billing */}
        <div
          style={{
            background: CARD_BG,
            border: `1.5px solid ${BORDER}`,
            borderRadius: 14,
            padding: "16px 18px",
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "oklch(0.62 0.18 145 / 0.15)",
              border: "1px solid oklch(0.62 0.18 145 / 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <DollarSign size={16} style={{ color: "oklch(0.72 0.18 145)" }} />
          </div>
          <div>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "#fff", margin: 0, marginBottom: 3 }}>
              Pay via Blastly
            </p>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: TEXT_DIM, margin: 0, lineHeight: 1.6, letterSpacing: "0.02em" }}>
              Blastly bills your card and manages the Meta account on your behalf. Simpler setup — same transparency in your dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 9,
          color: TEXT_MUTED,
          marginTop: 16,
          lineHeight: 1.7,
          letterSpacing: "0.02em",
        }}
      >
        Blastly's fee is 5% of revenue generated through Blastly-managed ads. Ad spend is separate and goes directly to Meta. No lock-in — cancel anytime.
      </p>
    </div>
  );
}

// ── Step 4: Create account ────────────────────────────────────────────────
function Step4({
  data,
  onChange,
  onSubmit,
  submitting,
}: {
  data: FormData;
  onChange: (field: keyof FormData, value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const accent = "oklch(0.60 0.20 240)";
  return (
    <div style={{ maxWidth: 440, margin: "0 auto" }}>
      <h2
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "clamp(1.2rem, 2.5vw, 1.5rem)",
          fontWeight: 700,
          color: "#fff",
          marginBottom: 6,
        }}
      >
        Create your account
      </h2>
      <p style={{ color: TEXT_DIM, fontSize: 13, marginBottom: 28, fontFamily: "'Space Grotesk', sans-serif" }}>
        That's it — everything else is inside your dashboard.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle}>Email address</label>
          <div style={{ position: "relative" }}>
            <User size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: TEXT_DIM }} />
            <input
              style={{ ...inputStyle, paddingLeft: 34 }}
              type="email"
              placeholder="you@example.com"
              value={data.email}
              onChange={e => onChange("email", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Password</label>
          <input
            style={inputStyle}
            type="password"
            placeholder="At least 8 characters"
            value={data.password}
            onChange={e => onChange("password", e.target.value)}
          />
        </div>

        <div>
          <label style={labelStyle}>Confirm password</label>
          <input
            style={inputStyle}
            type="password"
            placeholder="Repeat your password"
            value={data.confirmPassword}
            onChange={e => onChange("confirmPassword", e.target.value)}
          />
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={onSubmit}
        disabled={submitting}
        style={{
          marginTop: 28,
          width: "100%",
          background: submitting ? "oklch(0.40 0.10 240)" : accent,
          border: "none",
          borderRadius: 12,
          padding: "14px 24px",
          color: "#fff",
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 15,
          fontWeight: 700,
          cursor: submitting ? "not-allowed" : "pointer",
          transition: "all 0.18s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
        onMouseEnter={e => {
          if (!submitting) (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.65 0.20 240)";
        }}
        onMouseLeave={e => {
          if (!submitting) (e.currentTarget as HTMLButtonElement).style.background = accent;
        }}
      >
        {submitting ? "Creating your account…" : (
          <>
            Create my account
            <ArrowRight size={16} />
          </>
        )}
      </button>

      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 9,
          color: TEXT_MUTED,
          marginTop: 14,
          textAlign: "center",
          lineHeight: 1.7,
          letterSpacing: "0.02em",
        }}
      >
        By creating an account you agree to Blastly's Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}

// ── Main page component ───────────────────────────────────────────────────
export default function OnlineBusinessPage() {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<"select" | "onboard">("select");
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState<FormData>({
    category: "",
    businessName: "",
    whatYouSell: "",
    websiteUrl: "",
    priceModel: "",
    customerAge: "",
    customerGender: "",
    customerInterest: "",
    facebookConnected: false,
    instagramConnected: false,
    monthlyBudget: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  function setField(field: keyof FormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleCategorySelect(id: string) {
    setField("category", id);
  }

  function handleCategoryNext() {
    if (!form.category) return;
    setPhase("onboard");
    setStep(1);
  }

  function handleNext() {
    if (step < 4) setStep(s => (s + 1) as Step);
  }

  function handleBack() {
    if (step === 1) {
      setPhase("select");
    } else {
      setStep(s => (s - 1) as Step);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    // Frontend-first: simulate submission
    await new Promise(r => setTimeout(r, 1400));
    setSubmitting(false);
    setSubmitted(true);
  }

  const accent = "oklch(0.60 0.20 240)";

  // ── Success screen ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: BG,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: `${accent}20`,
            border: `2px solid ${accent}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <Check size={28} style={{ color: accent }} />
        </div>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(1.4rem, 3vw, 2rem)",
            fontWeight: 700,
            color: "#fff",
            marginBottom: 12,
          }}
        >
          You're in.
        </h1>
        <p style={{ color: TEXT_DIM, fontSize: 14, maxWidth: 400, lineHeight: 1.7, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 32 }}>
          Your Blastly account is being set up. We'll email you within 24 hours with your dashboard access and first campaign brief.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            background: accent,
            border: "none",
            borderRadius: 12,
            padding: "12px 28px",
            color: "#fff",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Go to dashboard <ArrowRight size={15} />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top nav */}
      <nav
        style={{
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={{
            background: "none",
            border: "none",
            color: TEXT_DIM,
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.12em",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: 0,
          }}
        >
          <ArrowLeft size={13} />
          Back
        </button>
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "0.04em",
          }}
        >
          BLASTLY
        </span>
        <div style={{ width: 60 }} />
      </nav>

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: "40px 24px 80px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {phase === "select" ? (
          <>
            <CategorySelect selected={form.category} onSelect={handleCategorySelect} />
            <button
              onClick={handleCategoryNext}
              disabled={!form.category}
              style={{
                marginTop: 32,
                background: form.category ? accent : "oklch(0.20 0.01 245)",
                border: "none",
                borderRadius: 12,
                padding: "13px 32px",
                color: form.category ? "#fff" : TEXT_MUTED,
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 14,
                fontWeight: 700,
                cursor: form.category ? "pointer" : "not-allowed",
                transition: "all 0.18s ease",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              Continue <ArrowRight size={15} />
            </button>
          </>
        ) : (
          <div style={{ width: "100%", maxWidth: 640 }}>
            <StepIndicator current={step} />

            {step === 1 && (
              <Step1
                data={form}
                onChange={(field, value) => setField(field as keyof FormData, value)}
              />
            )}
            {step === 2 && (
              <Step2
                data={form}
                onChange={(field, value) => setField(field as keyof FormData, value)}
              />
            )}
            {step === 3 && (
              <Step3
                data={form}
                onChange={(field, value) => setField(field as keyof FormData, value)}
              />
            )}
            {step === 4 && (
              <Step4
                data={form}
                onChange={(field, value) => setField(field as keyof FormData, value)}
                onSubmit={handleSubmit}
                submitting={submitting}
              />
            )}

            {/* Navigation buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 36,
                paddingTop: 24,
                borderTop: `1px solid ${BORDER}`,
              }}
            >
              <button
                onClick={handleBack}
                style={{
                  background: "none",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: "10px 20px",
                  color: TEXT_DIM,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM; }}
              >
                <ArrowLeft size={13} /> Back
              </button>

              {step < 4 && (
                <button
                  onClick={handleNext}
                  style={{
                    background: accent,
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 24px",
                    color: "#fff",
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.18s ease",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.65 0.20 240)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = accent; }}
                >
                  Continue <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
