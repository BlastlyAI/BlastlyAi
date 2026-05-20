/**
 * CLIENT INTELLIGENCE REPORT — Structured JSON Schema
 * 
 * This is the canonical data structure for Stage 1 of the 7-stage pipeline.
 * Every field has a clear data label so it can be mapped directly into
 * the Stage 3 Claude API prompt for content generation.
 * 
 * IMPORTANT: Competitors data (section 3) is INTERNAL ONLY — never shown to customer.
 */

// ─── Section 1: Business Snapshot ─────────────────────────────────────────────
export interface Section1_BusinessSnapshot {
  label: "business_snapshot";
  business_name: string;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  industry: string;
  business_description: string;
  tagline: string | null;
  geographic_reach: "local" | "state" | "national" | "international";
  platforms_active: string[];           // currently connected
  platforms_recommended: string[];      // suggested based on industry
  google_review_score: number | null;   // e.g. 4.2
  google_review_count: number | null;
  top_competitor_review_score: number | null;  // INTERNAL ONLY
  confidence_score: number;             // 0-100 accuracy indicator
}

// ─── Section 2: Market Demand ─────────────────────────────────────────────────
export interface Section2_MarketDemand {
  label: "market_demand";
  top_keywords: Array<{
    keyword: string;
    estimated_monthly_searches: string;
    difficulty: "low" | "medium" | "high";
  }>;
  ai_engine_questions: Array<{
    question: string;
    source: string;  // e.g. "Google SGE", "ChatGPT", "Perplexity"
  }>;
  customer_frustrations: Array<{
    frustration: string;
    source: string;  // e.g. "Reddit", "Google Reviews", "Forum"
  }>;
  peak_seasonal_months: string[];       // e.g. ["November", "December"]
  seasonal_notes: string;
  confidence_score: number;
}

// ─── Section 3: Competitive Position (INTERNAL ONLY) ──────────────────────────
export interface Section3_CompetitivePosition {
  label: "competitive_position";
  internal_only: true;
  competitors: Array<{
    name: string;
    website_url: string | null;
    google_rating: number | null;
    google_review_count: number | null;
    social_activity_level: "dormant" | "low" | "moderate" | "active" | "very_active";
    platforms_active: string[];
    visible_gaps: string[];             // weaknesses we can exploit
    estimated_monthly_traffic: string | null;
  }>;
  client_vs_competitors: {
    reviews_position: "leading" | "competitive" | "behind";
    visibility_position: "leading" | "competitive" | "behind";
    social_activity_position: "leading" | "competitive" | "behind";
  };
  biggest_opportunity: string;
  confidence_score: number;
}

// ─── Section 4: Reputation Summary ───────────────────────────────────────────
export interface Section4_ReputationSummary {
  label: "reputation_summary";
  strongest_proof_points: string[];     // best things customers say
  reputation_issues: string[];          // flagged problems
  unanswered_negative_reviews: number;
  recommended_testimonial_angles: string[];
  review_sources_checked: string[];     // e.g. ["Google", "Facebook", "Trustpilot"]
  top_praise_themes: string[];
  top_complaint_themes: string[];
  confidence_score: number;
}

// ─── Section 5: Visibility Baseline ──────────────────────────────────────────
export interface Section5_VisibilityBaseline {
  label: "visibility_baseline";
  month_label: string;                  // "Month 1 Baseline"
  local_search_position: string;        // e.g. "Position 4 in local pack"
  local_pack_appearing: boolean;
  nap_consistency: "pass" | "fail" | "partial";
  nap_issues: string[];
  website_health_score: number;         // 0-100
  website_mobile_friendly: boolean;
  website_page_speed: "fast" | "moderate" | "slow";
  website_indexed: boolean;
  website_has_blog: boolean;
  website_has_faqs: boolean;
  duplicate_listings_found: number;
  confidence_score: number;
}

// ─── Section 6: Opportunity Gaps ─────────────────────────────────────────────
export interface Section6_OpportunityGaps {
  label: "opportunity_gaps";
  content_gaps: Array<{
    gap: string;
    impact: "high" | "medium" | "low";
  }>;
  keyword_opportunities: Array<{
    keyword: string;
    current_position: string | null;
    opportunity: string;
  }>;
  biggest_market_gap: string;           // single biggest gap
  recommended_primary_message: string;  // core message for all content
  confidence_score: number;
}

// ─── Section 7: Customer Journey ─────────────────────────────────────────────
export interface Section7_CustomerJourney {
  label: "customer_journey";
  how_customers_find: string[];         // discovery channels
  what_they_check_before_deciding: string[];
  key_objections_to_address: string[];
  decision_cycle_length: string;        // e.g. "1-3 days", "2-4 weeks"
  confidence_score: number;
}

// ─── Section 8: Quick Wins ───────────────────────────────────────────────────
export interface Section8_QuickWins {
  label: "quick_wins";
  actions: Array<{
    action: string;
    estimated_impact: string;
    ease: "easy" | "medium" | "hard";
    timeframe: string;                  // e.g. "This week", "2-3 days"
  }>;
  confidence_score: number;
}

// ─── Section 9: Content Strategy Bridge ──────────────────────────────────────
export interface Section9_ContentStrategyBridge {
  label: "content_strategy_bridge";
  recommended_content_types: string[];
  recommended_posting_frequency: string;
  platforms_to_prioritise: string[];
  aeo_content_angles: Array<{
    question: string;
    why_this_business_should_answer: string;
  }>;
  seasonal_calendar_90_days: Array<{
    month: string;
    theme: string;
    content_ideas: string[];
  }>;
  confidence_score: number;
}

// ─── Full Report (all 9 sections combined) ───────────────────────────────────
export interface ClientIntelligenceReport {
  report_version: "1.0";
  generated_at: string;                 // ISO timestamp
  website_url: string;
  overall_confidence_score: number;     // average of all section scores
  sections: {
    business_snapshot: Section1_BusinessSnapshot;
    market_demand: Section2_MarketDemand;
    competitive_position: Section3_CompetitivePosition;  // INTERNAL ONLY
    reputation_summary: Section4_ReputationSummary;
    visibility_baseline: Section5_VisibilityBaseline;
    opportunity_gaps: Section6_OpportunityGaps;
    customer_journey: Section7_CustomerJourney;
    quick_wins: Section8_QuickWins;
    content_strategy_bridge: Section9_ContentStrategyBridge;
  };
  // Brand voice extracted from voice summary (Addition 2)
  brand_voice: {
    exact_phrases: string[];            // their own words for what they do best
    differentiators: string[];          // unique selling points they mention
    natural_tone: string;               // e.g. "warm and casual", "professional and direct"
    problems_they_solve: string[];      // in their own words
  } | null;
}

// ─── Export for Stage 3 API handoff ──────────────────────────────────────────
// This is the exact structure sent to Claude for content generation.
// Section 3 (competitive_position) is INCLUDED in the Stage 3 handoff
// because Claude needs it for strategy — it's just never shown to the customer.
export type Stage3ExportPayload = ClientIntelligenceReport;
