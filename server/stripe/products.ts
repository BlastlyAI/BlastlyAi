// Blastly Pricing — AUD (Australian Dollars)
// Two plans only: Snap & Post (free) and Everything (AU$75/week)

// ─── Plan Tier enum ────────────────────────────────────────────────────────────
// "free"       = Snap & Post — free forever, no card required
// "everything" = Everything — AU$75/week, 14-day free trial
export type PlanTier = "free" | "everything";

// ─── Main Plans ────────────────────────────────────────────────────────────────
export const PLANS = {
  free: {
    id: "free" as const,
    name: "Snap & Post",
    price: 0,
    currency: "aud",
    interval: null as null,
    description: "Get started for free — no credit card required",
    features: [
      "Connect all social platforms",
      "3 posts published per week",
      "AI polishes your caption",
      "Basic dashboard",
    ],
    stripePriceId: null as string | null,
    cta: "Start Free — No Card Needed",
    badge: null as string | null,
    requiresCard: false,
    trialDays: 0,
    weeklyPrice: 0,
  },
  everything: {
    id: "everything" as const,
    name: "Everything",
    price: 75,             // AU$75 per week
    currency: "aud",
    interval: "week" as const,
    description: "Everything you need to grow — AI handles it all",
    features: [
      "Everything in Free",
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
    ],
    stripePriceId: (process.env.STRIPE_PRICE_EVERYTHING || null) as string | null,
    cta: "Start My Free Trial",
    badge: "Most Popular" as string | null,
    requiresCard: true,
    trialDays: 14,
    weeklyPrice: 75,
  },
} as const;

// ─── Add-ons ───────────────────────────────────────────────────────────────────
// Only one add-on: Animated Aria — Coming Soon (display only, no Stripe price)
export const ADD_ONS = {
  animated_aria: {
    id: "animated_aria" as const,
    name: "Animated Aria",
    price: 30,             // AU$30/month (display only)
    currency: "aud",
    interval: "month" as const,
    description: "A lifelike animated avatar of Aria that greets your customers and guides them through your site.",
    stripePriceId: null as string | null,
    comingSoon: true,
    badge: "Coming Soon" as string | null,
    comingSoonMessage: "Coming soon — we will notify you when this is available",
  },
} as const;

export type AddOnId = keyof typeof ADD_ONS;

// ─── Free plan limits ──────────────────────────────────────────────────────────
export const FREE_LIMITS = {
  postsPerWeek: 3,
  aiWritesContent: false,
  blogArticles: false,
  ariaAssistant: false,
  callsMessagesBookings: false,
  commandCentre: false,   // basic dashboard only
  realTimeAlerts: false,
  morningBriefing: false,
  reviewMonitoring: false,
  aiCitationTracking: false,
  monthlyScorecard: false,
};

// ─── Everything plan limits ────────────────────────────────────────────────────
export const EVERYTHING_LIMITS = {
  postsPerWeek: Infinity,
  aiWritesContent: true,
  blogArticles: true,
  ariaAssistant: true,
  callsMessagesBookings: true,
  commandCentre: true,
  realTimeAlerts: true,
  morningBriefing: true,
  reviewMonitoring: true,
  aiCitationTracking: true,
  monthlyScorecard: true,
};

// ─── Feature gate helper ───────────────────────────────────────────────────────
// Returns true if the workspace's planTier allows the given feature
export function canAccess(planTier: PlanTier, feature: keyof typeof FREE_LIMITS): boolean {
  if (planTier === "everything") return EVERYTHING_LIMITS[feature] as boolean;
  return FREE_LIMITS[feature] as boolean;
}

// ─── Upgrade prompt copy ───────────────────────────────────────────────────────
export const UPGRADE_PROMPT = {
  headline: "Aria would have caught that.",
  body: "Upgrade to AU$75/week and never miss an enquiry again.",
  cta: "Start My Free Trial",
  ctaPath: "/pricing",
} as const;

// ─── Legacy plan mapping (kept for backward compat with existing DB rows) ──────
// Old plan tiers in the DB ("fix_my_brand", "managed_social") are treated as "everything"
export function normalisePlanTier(raw: string | null | undefined): PlanTier {
  if (!raw || raw === "free") return "free";
  return "everything"; // fix_my_brand, managed_social, everything all map to everything
}
