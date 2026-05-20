# Blastly AI — Project TODO

## Phase 1 — Core Platform (COMPLETE)
- [x] Manus OAuth authentication with auto-workspace creation
- [x] Multi-platform social account connections (Twitter/X, LinkedIn, Facebook, Instagram)
- [x] AI post composer with UTM builder and platform-specific previews
- [x] Smart scheduling calendar with timezone support
- [x] Campaign management (create, edit, group posts under campaigns)
- [x] Cross-platform analytics dashboard with UTM tracking table
- [x] Team collaboration — admin/editor/viewer roles, member invitations
- [x] Content library — templates, hashtag sets, brand assets
- [x] Notification system (in-app alerts for post status, team activity)
- [x] AI Ad Studio — upload business info + images → AI generates full multi-platform ad campaigns
- [x] Database schema (10 tables), migration script, all tRPC routers
- [x] AppLayout with responsive sidebar (desktop persistent, mobile drawer)
- [x] Vitest unit tests (14 passing)

## Bug Fixes
- [x] Fix sidebar overlay bug — sidebar opens over main content and cannot be dismissed on mobile/small screens

## Phase 2 — Agentic AI Differentiators (COMPLETE)
- [x] Agent runner utility (server/agents/runner.ts)
- [x] URL fetcher utility (server/agents/fetcher.ts)
- [x] DB migration for all 8 new agentic tables
- [x] agents.ts router — all 7 agentic systems wired
- [x] Autonomous Campaign Agent UI (/dashboard/agent)
- [x] Website Intelligence Engine UI (/dashboard/intelligence)
- [x] Virality Predictor widget (inline in Compose page)
- [x] Brand Personality Cloner UI (/dashboard/brand-voice)
- [x] Competitor & Trend Agent UI (/dashboard/trends)
- [x] Multi-Modal Campaign Factory UI (/dashboard/factory)
- [x] Cross-Channel ROI Brain UI (/dashboard/roi-brain)
- [x] Update AppLayout sidebar with all new agent nav items (Core + AI Tools sections)
- [x] Update App.tsx with all new routes

## Phase 3 — Social Media Audit Tool (COMPLETE)
- [x] Backend: audit router with AI-powered per-platform analysis engine
- [x] DB table for storing audit reports (shareable, public)
- [x] Public audit landing page — hero, value prop, CTA (/audit)
- [x] Audit intake form — business name, industry, social handles, ad spend, URL
- [x] Scored audit report — overall health score, per-platform breakdown, ad quality, content scores, cost-per-result estimates
- [x] Blastly AI pitch section — personalized feature-matched recommendations at end of report
- [x] Shareable report URL (public, no login required)
- [x] Audit history in dashboard — listAudits procedure for workspace
- [x] Wire audit routes into App.tsx (/audit, /audit/report/:token)
- [x] Vitest tests for audit and agents routers (25 total passing)

## Phase 3 — Remaining Gaps
- [x] Add Audit History dashboard page — calls listAudits and shows workspace audit history with links to reports
- [x] Add "Free Audit Tool" nav link in AppLayout sidebar pointing to /audit

## Bug Fixes & Improvements (Round 2)
- [x] Fix "Try AI Audit" button on landing page — broken link/navigation
- [x] Simplify audit intake form — just a website URL input, AI auto-researches business name, industry, social handles, and all other info
- [x] Add TikTok to all social platform lists (connections, composer, analytics, campaigns, schema)

## Design Overhaul & Analytics Showcase (Round 3)
- [x] Complete elite dark theme redesign — premium color palette, typography, gradients, animations
- [x] Redesign landing page hero with premium look, elite audit CTA button
- [x] Add proof-of-improvement analytics showcase on landing page (before/after metrics)
- [x] Add improvement analytics section to dashboard overview
- [x] Polish AppLayout sidebar and all dashboard pages to match new elite design

## AI Video Studio & Design Overhaul (Round 4)
- [x] Complete elite dark theme redesign — deep obsidian, electric violet, gold accent, Syne + Plus Jakarta Sans fonts
- [x] Redesign landing page with premium hero, elite audit CTA, and proof-of-improvement analytics showcase
- [x] Add Video Studio feature highlight to landing page
- [x] Build AI Video Studio page — script generator, AI voiceover, captions, platform export
- [x] Add video generation backend router (script → storyboard → voiceover → video metadata)
- [x] Add DB table for video projects
- [x] Add Video Studio to AppLayout sidebar navigation
- [x] Add YouTube to supported platform list alongside TikTok
- [x] Polish AppLayout sidebar and all dashboard pages to match elite design

## Full Visual Redesign (Round 5)
- [x] Replace pure black with deep navy/charcoal base — richer, more premium
- [x] Fix stretched/distorted typography — swap Syne for Inter with proper weights and sizes
- [x] Rebuild landing page with correct proportions, elite layout, sleek sections
- [x] Polish sidebar and dashboard to match new refined design system

## Onboarding Wizard & Design Fix (Round 6)
- [x] Fix distorted/stretched typography — swap Syne for Inter, fix font sizes
- [x] Fix pure black background — use deep navy/charcoal instead
- [x] Rebuild landing page with correct proportions and elite clean look
- [x] DB tables: business_profiles, platform_connections (extended), onboarding_state
- [x] tRPC router: onboarding — saveProfile, getProfile, checkBrandName, savePlatformConnection, getOnboardingState, completeOnboarding
- [x] Step 1: Business Profile — name, industry dropdown, goals multi-select, audience description, ad budget range
- [x] Step 2: Brand Name Checker — input, namechk.com link, name variation suggestions
- [x] Step 3: Platform Connections — 10 platform cards (Facebook, Instagram, TikTok, YouTube, LinkedIn, X, Pinterest, Snapchat, Google Ads, WhatsApp Business) with Connect + New Setup modal
- [x] Setup Complete screen — connected platforms summary, Launch Campaign CTA, subscription note ($50/month)
- [x] Wire onboarding wizard into App.tsx — redirect first-time users to /onboarding after login
- [x] Progress bar across all wizard steps

## Launch Readiness
- [x] Add Stripe payment integration with Free, Starter, Pro, and Agency pricing plans
- [x] Create pricing page with plan comparison table (/pricing)
- [x] Create Terms of Service page (/terms)
- [x] Create Privacy Policy page (/privacy)
- [x] Add contact/support form page with email notification to owner (/contact)
- [x] Add footer links to Terms, Privacy, and Contact pages
- [x] Register all 4 new pages in App.tsx routes
- [x] Add Pricing link to homepage nav bar
- [x] Update homepage pricing section to show 3-plan comparison (Starter/Pro/Agency)
- [x] Create Stripe webhook handler at /api/stripe/webhook (signature verification, checkout.session.completed, subscription.updated/deleted, invoice.payment_failed)
- [x] Create subscriptions DB table (userId, stripeCustomerId, stripeSubscriptionId, plan, status, currentPeriodEnd)
- [x] Add Billing & Upgrade dashboard page (/dashboard/billing) with current plan display and upgrade CTAs
- [x] Add payment success/cancelled toast when returning from Stripe checkout
- [x] Add Billing & Upgrade link to dashboard sidebar navigation

## Currency Clarity
- [x] N/A — resolved: prices now shown as Free during beta; AUD pricing confirmed on Stripe account

## Beta Launch
- [x] Add sticky beta banner to homepage and dashboard: "Free during beta — no card required" with end date (30 May 2026)
- [x] Add in-app feedback button (fixed bottom-right) — opens popover, sends message to owner via notifyOwner
- [x] Update Pricing page to show all plans as "Free during beta" with original prices struck through
- [x] Update Billing & Upgrade dashboard page to reflect free beta status

## Cross-Promotion
- [x] Add "Also by the same team" section to Blastly homepage featuring Coach Nova (coachnova.io)
- [x] Add Coach Nova footer link to Blastly homepage footer

## Nova Labs Hub
- [x] Create /apps page — "Nova Labs" product suite listing Blastly and Coach Nova with descriptions, links, and status badges
- [x] Add "Nova Labs" link to Blastly homepage nav (violet, top right of nav links)
- [x] Add "Nova Labs" link to Blastly homepage footer
- [x] Update "Also by the same team" section on homepage to reference Nova Labs branding
- [x] Register /apps route in App.tsx

## SEO Website Health Feature (Diib Competitor)
- [x] Add seo_scans DB table (userId, url, score, title, metaDescription, h1Tags, keywords, pageSpeed, httpsEnabled, recommendations, createdAt)
- [x] Add tRPC router: seo.scanWebsite(url) — scrape URL, run AI analysis, return health score + recommendations
- [x] Add tRPC router: seo.getScans() — list user's previous scans
- [x] Build SEO Health dashboard page (/dashboard/seo-health) with score gauge, keyword table, recommendations list, scan history
- [x] Add "SEO Health Scanner" to AppLayout sidebar under "SEO & Analytics" section
- [x] Register /dashboard/seo-health route in App.tsx
- [x] Zero TypeScript errors, 44 tests passing

## SEO Feature Enhancements
- [x] Add SEO Health Scanner section to homepage with Diib price comparison ("Diib charges $30/mo just for this — Blastly includes it free")
- [x] Add competitor URL side-by-side comparison to SEO scanner — "Single Site Scan" and "Competitor Comparison" mode toggle, side-by-side score rings, 8-metric comparison table with win/loss arrows, top fixes for your site
- [x] Publish-ready: 0 TypeScript errors, 61 tests passing

## Social Media Presence Scanner (Full Digital Presence)
- [x] Add social_scans table to drizzle/schema.ts (userId, websiteUrl, discoveredProfiles JSON, overallScore, platformScores JSON, recommendations JSON, createdAt)
- [x] Run DB migration for social_scans table
- [x] Build server/routers/socialScan.ts: scanSocialPresence procedure (scrape website → discover social links → fetch each profile → AI score per platform → unified report)
- [x] Register socialScan router in server/routers.ts
- [x] Add "Full Digital Presence" tab to client/src/pages/SeoHealth.tsx
- [x] Show per-platform cards: profile found ✓/✗, follower count, last activity, health score, recommendations
- [x] Show overall "Digital Presence Score" combining website SEO + social health
- [x] Add Vitest tests for socialScan router

## Full Digital Presence Scanner — All Features
- [x] DB migration: social_scans table applied
- [x] Backend: auto-discover social profiles from website URL (scrape og:tags, footer links, meta tags, href patterns)
- [x] Backend: fetch each discovered social profile page and extract follower count, bio, last post date, posting frequency
- [x] Backend: AI scoring per platform (0-100 score, grade, strengths, weaknesses, recommendations)
- [x] Backend: Digital Presence Score — single 0-100 combined score (website SEO + social health weighted)
- [x] Backend: Platform Gap Detector — identify missing platforms, quantify reach cost of absence
- [x] Backend: Content Consistency Analyser — check brand name/bio/messaging consistency across platforms
- [x] Backend: Posting Cadence Health Check — flag dormant/dead accounts, days since last post
- [x] Backend: AI-Generated 30-day Action Plan — prioritised fix-it steps, one-click to Blastly campaign
- [x] Backend: Competitor Comparison mode — scan two websites, compare full social footprints side by side
- [x] Backend: AI Visibility Score — check if brand appears in AI search results (emerging frontier feature)
- [x] Frontend: "Full Digital Presence" tab on SEO Health page
- [x] Frontend: Single URL input → scan button → loading state with progress steps
- [x] Frontend: Digital Presence Score hero card (large score ring, grade, summary)
- [x] Frontend: Per-platform cards grid (found/not found, followers, last post, score, grade, recommendations)
- [x] Frontend: Platform Gap Detector section — missing platforms with estimated reach impact
- [x] Frontend: Content Consistency section — brand consistency flags across platforms
- [x] Frontend: Posting Cadence timeline — visual activity chart per platform
- [x] Frontend: AI 30-day Action Plan — prioritised cards, one-click "Create Campaign" CTA
- [x] Frontend: Competitor Comparison mode — two URL inputs, side-by-side social footprint comparison
- [x] Frontend: AI Visibility Score card — brand findability in AI search engines
- [x] Frontend: Scan history list for digital presence scans
- [x] Add "Digital Presence Scanner" to homepage as key differentiator feature
- [x] Vitest tests for socialScan router (scanSocialPresence, getSocialScans)

## Modern Hi-Tech Visual Redesign (Round 7)
- [x] Deep space CSS system — Space Grotesk font, OKLCH color tokens, glassmorphism, glow animations
- [x] Homepage redesign — video hero, animated gradient headline, glassmorphism cards, marquee, stats counter
- [x] BetaBanner updated to match new dark tech aesthetic
- [x] Dashboard page redesigned — glass stat cards, neon accents, deep space panels
- [x] FeedbackButton updated to match new dark tech aesthetic
- [x] Pricing page updated to match new dark tech aesthetic

## Competitor Intelligence — 5 Nearest Competitors Scanner
- [x] DB table: competitor_scans (userId, websiteUrl, industry, competitors JSON, improvementOpportunities JSON, overallGapScore, createdAt)
- [x] Run DB migration for competitor_scans table
- [x] Backend: AI auto-discovers 5 nearest competitors from website URL + industry
- [x] Backend: Scrape each competitor's website (SEO, tech stack, services, pricing signals, content strategy)
- [x] Backend: Scan each competitor's full social media presence (all platforms, followers, posting frequency, engagement)
- [x] Backend: AI generates "Business Improvement Opportunities" — specific add-ons, services, products, strategies to get ahead
- [x] Backend: Competitive Gap Score per competitor (0-100 how far ahead/behind each one)
- [x] Backend: "Quick Wins" section — top 3 things user can do this week to overtake each competitor
- [x] Backend: Industry benchmark comparison — how user stacks up vs industry average across all 5
- [x] Frontend: /dashboard/competitor-intelligence page
- [x] Frontend: URL input → AI discovers competitors → loading state with progress steps
- [x] Frontend: "Your Brand vs 5 Competitors" overview scorecard
- [x] Frontend: Per-competitor expandable cards (website score, social scores, services offered, content strategy)
- [x] Frontend: Business Improvement Opportunities section — prioritised cards with "Add to Blastly Campaign" CTA
- [x] Frontend: Industry Benchmark radar chart
- [x] Frontend: "Quick Wins This Week" action cards
- [x] Add "Competitor Intelligence" to AppLayout sidebar
- [x] Register /dashboard/competitor-intelligence route in App.tsx
- [x] Add Competitor Intelligence callout to homepage
- [x] Vitest tests for competitor intelligence router

## Scan Confidence Score System
- [x] Create shared confidence scoring types in shared/confidence.ts
- [x] Update socialScan router to include confidence scores per data point
- [x] Update competitorIntel router to include confidence scores per competitor and opportunity
- [x] Update SEO health router to include confidence scores per metric
- [x] Add ConfidenceTag UI component (Verified/High/Estimated/Approximate badges)
- [x] Add ConfidencePanel UI component (overall report confidence breakdown)
- [x] Add confidence scores to DigitalPresence.tsx page
- [x] Add confidence scores to CompetitorIntelligence.tsx page
- [x] Add confidence scores to SeoHealth.tsx page
- [x] Add "How we calculate confidence" tooltip/modal explaining methodology
- [x] Vitest tests for confidence scoring logic

## Pricing Page & Stripe Checkout (AUD)
- [x] Create Stripe products and prices in AUD (Starter $29, Growth $79, Agency $199 monthly + annual)
- [x] Add subscriptions table to drizzle/schema.ts and run migration
- [x] Build server/routers/billing.ts with createCheckoutSession, getSubscription, createPortalSession procedures
- [x] Add Stripe webhook handler at /api/stripe/webhook for subscription events
- [x] Build client/src/pages/Pricing.tsx — public pricing page with plan comparison table
- [x] Build client/src/pages/Billing.tsx — dashboard billing management page
- [x] Build client/src/pages/PaymentSuccess.tsx — post-checkout success page
- [x] Add Pricing route to App.tsx and nav link to homepage header
- [x] Add Billing to AppLayout sidebar nav
- [x] Wire free tier scan limits (3/month) with upgrade prompts
- [x] Vitest tests for billing router

## Inline Homepage Scan (Single-Page Experience)
- [x] Homepage URL input triggers live scan inline — no redirect to another page
- [x] Scan results render below the hero on the same page (Digital Presence Score, platform cards, AI action plan)
- [x] Loading state shown inline while scan runs
- [x] "Sign up to save your report" CTA shown after results (not before)
- [x] Competitor comparison section shown inline after main results

## Share My Score — Viral Sharing
- [ ] Add shared_reports table to schema.ts (shareToken, scanData, expiresAt)
- [ ] Run DB migration for shared_reports table
- [ ] Add shareReport tRPC procedure (creates token, saves scan snapshot)
- [ ] Add public getSharedReport procedure (no auth, reads by token)
- [ ] Create /report/:token public page showing read-only scan results
- [ ] Add Share My Score button to homepage scan results
- [ ] Share buttons: LinkedIn, X/Twitter, copy link
- [ ] Add Open Graph meta tags to shared report page for rich link previews

## Share My Score — Viral Sharing
- [ ] Add shared_reports table to schema.ts (shareToken, scanData, expiresAt, websiteUrl, score)
- [ ] Run DB migration for shared_reports table
- [ ] Add shareReport tRPC procedure (protected — creates token, saves scan snapshot to DB)
- [ ] Add public getSharedReport procedure (no auth — reads by token)
- [ ] Create /report/:token public page showing read-only scan results with Blastly branding
- [ ] Add Share My Score button to homepage inline scan results
- [ ] Share buttons: LinkedIn, X/Twitter, copy link
- [ ] Add Open Graph meta tags to shared report page for rich link previews

## Sprint 4 — TikTok & Reddit Ads Integration
- [ ] TikTok: backend router (server/routers/tiktok.ts) — connect, getCampaigns, createCampaign, getAnalytics procedures
- [ ] TikTok: credential storage in social_accounts table (appId, appSecret, accessToken, advertiserId)
- [ ] TikTok: campaign creation using TikTok Marketing API v1.3
- [ ] TikTok: ad group and ad creation with targeting (age, gender, interests, location)
- [ ] Reddit: backend router (server/routers/reddit.ts) — connect, getCampaigns, createCampaign, getAnalytics procedures
- [ ] Reddit: credential storage in social_accounts table (clientId, clientSecret, accessToken, adAccountId)
- [ ] Reddit: campaign creation using Reddit Ads API
- [ ] Reddit: subreddit targeting and interest-based targeting
- [ ] Connections page: TikTok setup guide with step-by-step credential entry form
- [ ] Connections page: Reddit setup guide with step-by-step credential entry form
- [ ] Campaign creation UI: platform selector includes TikTok and Reddit
- [ ] Register tiktok and reddit routers in server/routers.ts
- [ ] Tests: Vitest for TikTok and Reddit router logic

## Visual Redesign — Modern High-Tech Premium SaaS (Sprint 5)
- [ ] Source hero background video (tech/AI/data visualization) from royalty-free source
- [ ] Source feature section images (dashboard mockups, AI interface screenshots)
- [ ] Redesign global CSS — new deep space color palette, Inter/Geist fonts, glassmorphism variables
- [ ] Add CSS animations — floating particles, gradient mesh, glow pulses, smooth scroll reveals
- [ ] Rebuild homepage hero — fullscreen video background, animated headline, glassmorphism CTA card
- [ ] Rebuild homepage feature sections — alternating image/text with scroll animations
- [ ] Add social proof section — animated counter stats, logo marquee
- [ ] Add product demo section — embedded animated mockup or video
- [ ] Polish AppLayout sidebar — glassmorphism panel, icon glows, active state animations
- [ ] Polish dashboard overview page — metric cards with glow borders, animated charts
- [ ] Add floating particle/grid background to all pages
- [ ] Ensure all text is readable against new backgrounds
- [ ] Run tests and save checkpoint

## Homepage Scan Result Card Overhaul
- [ ] 5 animated sub-scores: Social Discovery, Content Velocity, Engagement Quality, AI Visibility, Brand Sentiment — each with animated fill bar from 0
- [ ] AI Visibility flagged as weak spot with special callout styling
- [ ] Side-by-side competitor table — user domain vs 5 named competitors, score + social count + 30-day trend arrows, user row highlighted
- [ ] 3 specific recommendations with named impact (e.g. "+6 Discovery")
- [ ] Email-gated full report — email input + "Send My Plan" CTA, success state after submit
- [ ] Download PDF button in result card header
- [ ] Backend: email capture tRPC procedure (saveLeadEmail) — store email + scan token in DB
- [ ] DB: leads table (email, scanToken, createdAt)

## Competitor-Inspired Homepage Redesign (Round 8)
- [x] Pattern 1: Live product UI mock embedded in hero (Semrush/Ahrefs style) — floating animated scan result card visible above the fold
- [x] Pattern 2: Scan-first hero with 3 fear/curiosity bullets above URL input + live user counter below CTA (Diib/Brand24 style)
- [x] Pattern 3: Tabbed feature showcase with animated product mocks per tab (Sprout Social style) — Scan / Analyze / Publish / Grow tabs
- [x] Pattern 4: Animated social proof counter strip — brands scanned, platforms monitored, reports generated, countries (Ahrefs/Brand24 style)

## Facebook / Meta OAuth Integration
- [ ] Server: /api/auth/facebook/connect route — builds Meta OAuth URL with state token and redirects user
- [ ] Server: /api/auth/facebook/callback route — exchanges code for short-lived token, then long-lived token, fetches pages list
- [ ] Server: tRPC procedure social.facebookPages — returns list of pages the user manages (after OAuth)
- [ ] Server: tRPC procedure social.saveFacebookPage — saves selected page token + Instagram account to DB
- [ ] Server: tRPC procedure social.publishToFacebook — posts text/image/link to a Facebook Page via Graph API
- [ ] Server: tRPC procedure social.publishToInstagram — posts image/video to Instagram via Graph API
- [ ] DB: store page_access_token, instagram_business_account_id in socialAccounts table
- [ ] Frontend: "Connect Facebook" button in Social Accounts page — triggers OAuth redirect
- [ ] Frontend: Page picker modal — shows list of pages after OAuth callback, user selects which to connect
- [ ] Frontend: Connected state — shows page name, avatar, follower count, disconnect button
- [ ] Frontend: Compose page — Facebook/Instagram publish button uses real API when account is connected
- [ ] Secrets: FACEBOOK_APP_ID and FACEBOOK_APP_SECRET required from user

## Social Platform OAuth Integration (LinkedIn, YouTube, Pinterest, Bluesky)
- [x] DB: Platform enum extended (youtube, pinterest, bluesky added)
- [x] DB: Migration applied
- [x] Server: /api/auth/linkedin/connect — LinkedIn OAuth URL with state, redirect user
- [x] Server: /api/auth/linkedin/callback — exchange code for token, fetch profile, save to DB
- [x] Server: /api/auth/linkedin/publish — uses /v2/shares (personal profile, no follower requirement)
- [x] Server: /api/auth/youtube/connect — Google OAuth URL (YouTube scope), redirect user
- [x] Server: /api/auth/youtube/callback — exchange code for token, fetch channel info, save to DB
- [x] Server: /api/auth/pinterest/connect — Pinterest OAuth URL, redirect user
- [x] Server: /api/auth/pinterest/callback — exchange code for token, fetch profile, save to DB
- [x] Server: tRPC publish.connectBluesky — validate handle + app password via Bluesky API, save to DB
- [x] Server: tRPC publish.publish — unified publish procedure for LinkedIn, YouTube, Pinterest, Bluesky
- [x] Server: tRPC publish.getPinterestBoards — fetch user's Pinterest boards
- [x] Frontend: Connections page rebuilt — OAuth buttons for LinkedIn/YouTube/Pinterest, Bluesky modal
- [x] Frontend: OAuth callback success/error toast handling
- [x] Frontend: Connected account cards with disconnect button
- [ ] Secrets: LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET (user to provide)
- [ ] Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (user to provide)
- [ ] Secrets: PINTEREST_APP_ID, PINTEREST_APP_SECRET (user to provide)

## Multi-Brand Workspace Hub + Gap Fills
- [x] Schema: add brandIdentity columns to workspaces table (website, description, primaryColor, secondaryColor, toneOfVoice, targetAudience, industry)
- [x] DB migration: apply brandIdentity columns to workspaces
- [x] Server: workspace.updateBrandProfile procedure (name, website, description, primaryColor, secondaryColor, toneOfVoice, targetAudience, industry, logoUrl)
- [x] Frontend: /dashboard/brand-profile page — logo upload (S3), colour pickers, tone selector, audience, website, description, save
- [x] Frontend: Sidebar workspace switcher — more prominent, show brand logo/avatar, "Add New Brand" button
- [x] Frontend: "Create Brand" modal — name, website, industry → creates workspace + opens brand profile
- [ ] Frontend: Dashboard onboarding prompt if brand profile is incomplete
- [x] Frontend: Register /dashboard/brand-profile in App.tsx
- [x] Frontend: Add Brand Profile to AppLayout sidebar nav
- [x] Compose: "Generate Image" button — calls ai.generateImage with post text + brand context, shows preview, attaches to post
- [x] Server: ai.generateImage tRPC procedure — calls generateImage helper with prompt built from post text + brand colours/tone
- [ ] Pinterest: Add PINTEREST_APP_ID + PINTEREST_APP_SECRET secrets
- [ ] Pinterest: Verify OAuth callback route end-to-end
- [ ] Pinterest: Verify publish.publish posts a real Pin (image + title + description + board)
- [ ] Pinterest: Test with Genius Jungle as first live brand

## SaaS Multi-Tenant Platform (Client Onboarding + Per-Workspace Billing)

- [ ] Schema: add planTier, stripeCustomerId, stripeSubscriptionId, subscriptionStatus, trialEndsAt to workspaces table
- [ ] DB migration: apply workspace subscription fields
- [ ] Server: products.ts — define 3 Stripe price IDs (Free Audit, Fix My Brand one-off AUD, Managed Social monthly AUD)
- [ ] Server: billing.createWorkspaceCheckout procedure — per-workspace Stripe checkout session
- [ ] Server: /api/stripe/webhook — handle checkout.session.completed, customer.subscription.updated/deleted for workspace subscriptions
- [ ] Server: workspace.getPlanStatus procedure — return current plan tier, status, renewal date for a workspace
- [ ] Frontend: /onboarding multi-step wizard (Step 1: Brand details, Step 2: Connect socials, Step 3: Choose plan, Step 4: Launch)
- [ ] Frontend: Client portal view — simplified dashboard for non-owner clients (brand score, posts, plan badge, upgrade CTA)
- [ ] Frontend: Owner admin dashboard /admin — list all workspaces/clients, plan tier, MRR, manage button
- [ ] Frontend: Pricing page — rebuild as 3-tier funnel (Free Audit, Fix My Brand AUD one-off, Managed Social AUD/month)
- [ ] Frontend: Plan badge in sidebar showing current tier and upgrade link
- [ ] Frontend: Register /onboarding and /admin routes in App.tsx
- [ ] Tests: Vitest for workspace billing procedures

## Universal App Webhook Integration
- [x] Schema: add connected_apps table (id, workspaceId, appSlug, appName, webhookSecret, createdAt, lastEventAt)
- [x] Schema: add webhook_events table (id, connectedAppId, eventType, payload, status, processedAt, createdAt)
- [x] DB migration: apply connected_apps and webhook_events tables
- [x] Server: /api/webhooks/app-events Express route (raw JSON, secret key auth via X-Blastly-Key header)
- [x] Server: workspace.registerApp tRPC procedure (create connected_app record, return webhook URL + secret)
- [x] Server: workspace.listConnectedApps tRPC procedure
- [x] Server: workspace.revokeApp tRPC procedure
- [x] Server: AI post generation on webhook event arrival (invokeLLM with event context + brand profile)
- [x] Server: queue generated posts as drafts in the posts table for review
- [x] Frontend: Connected Apps page at /dashboard/connected-apps
- [x] Frontend: Register App modal (app name, app slug, select workspace)
- [x] Frontend: Show webhook URL + secret key with copy button after registration
- [x] Frontend: Recent events log per connected app
- [x] Frontend: Add Connected Apps to AppLayout sidebar nav
- [x] Frontend: Register /dashboard/connected-apps in App.tsx
- [ ] Tests: webhook endpoint auth, event handling, post generation trigger

## Managed Social Platform — Full Build

### Phase 1: Ayrshare Integration Layer
- [ ] Server: AyrshareService class in server/ayrshare.ts — mock mode (no key) + live mode (AYRSHARE_API_KEY env)
- [ ] Server: createProfile(workspaceId, brandName) — creates Ayrshare profile per client
- [ ] Server: publishPost(profileKey, platforms, text, mediaUrls) — posts to all selected platforms
- [ ] Server: getAnalytics(profileKey) — returns engagement stats per platform
- [ ] Server: deletePost(profileKey, postIds) — removes a post from platforms
- [ ] Server: workspace.publishViaAyrshare tRPC procedure — wraps AyrshareService.publishPost
- [ ] Tests: ayrshare.test.ts covering mock mode publish, profile creation, analytics

### Phase 2: Client Onboarding Wizard
- [ ] Schema: add ayrshareProfileKey, setupFeepaid, creditsBalance to workspaces table + migration
- [ ] Frontend: /onboarding/managed — 5-step wizard (Business Details → Logo Generation → Platform Selection → Payment → Launch)
- [ ] Step 1: Business name, website, industry, description
- [ ] Step 2: Upload existing logo OR generate 4 AI logo options to choose from
- [ ] Step 3: Select platforms (all 13 shown, all pre-selected by default)
- [ ] Step 4: Stripe checkout — $297 setup fee + $197/month subscription + $100 credits
- [ ] Step 5: Launch confirmation — "Your accounts are being created, you'll be live in 24 hours"
- [ ] Server: workspace.startManagedOnboarding tRPC procedure
- [ ] Server: ai.generateLogos tRPC procedure — generates 4 logo variations via generateImage

### Phase 3: Prepaid Credits System
- [ ] Schema: add creditsBalance (int, default 0) to workspaces, add credit_transactions table + migration
- [ ] Server: stripe/products.ts — add CREDITS_PACK_100 ($100 = 200 credits), CREDITS_PACK_250 ($200 = 600 credits)
- [ ] Server: workspace.purchaseCredits tRPC procedure — Stripe one-off checkout for credit packs
- [ ] Server: workspace.deductCredits internal helper — called on each post publish (5 credits/post)
- [ ] Server: webhook handler for credits checkout.session.completed — add credits to workspace balance
- [ ] Frontend: Credits balance shown in client portal header
- [ ] Frontend: "Top Up Credits" button → Stripe checkout
- [ ] Tests: credits purchase and deduction flow

### Phase 4: Content Studio
- [ ] Schema: add content_assets table (id, workspaceId, fileUrl, fileKey, mimeType, voiceNote, aiCaption, status, createdAt) + migration
- [ ] Frontend: /dashboard/content-studio — main page with upload zone + voice record button + asset library
- [ ] Frontend: Photo upload → S3 → preview
- [ ] Frontend: Voice record button (MediaRecorder API) → upload audio to S3 → transcribe via server
- [ ] Frontend: AI generates platform-specific captions from photo + voice transcript + brand profile
- [ ] Frontend: Review and edit captions per platform before approving
- [ ] Frontend: "Approve & Schedule" sends to Ayrshare queue
- [ ] Server: contentStudio.uploadAsset tRPC procedure — stores S3 URL + metadata
- [ ] Server: contentStudio.generateCaptions tRPC procedure — invokeLLM with image URL + transcript + brand context
- [ ] Server: contentStudio.transcribeVoice tRPC procedure — calls transcribeAudio helper
- [ ] Server: contentStudio.approvePost tRPC procedure — deducts credits + calls AyrshareService.publishPost
- [ ] Add Content Studio to AppLayout sidebar nav
- [ ] Register /dashboard/content-studio in App.tsx
- [ ] Tests: caption generation and asset upload flow

### Phase 5: Branded Client Portal
- [ ] Frontend: /portal/:workspaceSlug — branded portal page with client's logo + colours
- [ ] Frontend: Portal shows: platform status cards, upcoming posts, credit balance, recent results
- [ ] Frontend: "Add Content" button → opens Content Studio upload flow
- [ ] Frontend: Post history with engagement stats per post
- [ ] Server: workspace.getPortalData tRPC procedure — returns workspace + posts + credits + analytics
- [ ] Register /portal/:slug in App.tsx

### Phase 6: Platform Setup Assistant
- [ ] Frontend: /dashboard/platform-setup — shows all 13 platforms, highlights missing ones
- [ ] Frontend: "Set Up [Platform]" button → opens guided checklist modal
- [ ] Frontend: AI-generated bio, username suggestion, profile description — all copy-paste ready
- [ ] Server: social.generatePlatformSetupContent tRPC procedure — invokeLLM with brand profile + platform context
- [ ] Add Platform Setup to AppLayout sidebar nav
- [ ] Register /dashboard/platform-setup in App.tsx

### Phase 7: Landing Page Update
- [ ] Update Home.tsx hero: "2-minute signup. 13 platforms. We handle everything."
- [ ] Add social platform logo strip (all 13 icons)
- [ ] Update CTA: "Start Free — No Setup Required" → leads to /onboarding/managed
- [ ] Add "How it works" section: 3 steps (Sign up → We create your accounts → Posts go live daily)

## Cybersecurity & Smart Platform Recommendations
- [x] Add cyberSecurityScore column to auditReports DB table (migration applied)
- [x] Add cybersecurity section to audit LLM prompt — HTTPS, SSL, privacy policy, cookie consent, data exposure risk, social account security, findings with fixes
- [x] Add Cybersecurity Rating card to AuditReportPage UI — score, grade, checklist, risk indicators, security findings
- [x] Add industry-based platform recommendations to Managed Social onboarding wizard Step 3 — 15 industry profiles, recommended vs additional platforms split, reason text
- [x] 136 tests passing, 0 TypeScript errors

## Two-Tier Content Approval System
- [x] DB schema: brand_briefs table (workspaceId, businessDescription, products, differentiators, neverSay, tone, brandColors, approvedPhrases, complianceRules, updatedAt)
- [x] DB schema: brand_photos table (workspaceId, fileUrl, fileKey, label, isApproved, uploadedAt)
- [x] DB schema: Add approvalStatus column to posts table (draft | pending_agency | pending_client | approved | rejected | scheduled | published)
- [x] DB schema: Add agencyNote, clientNote, previewToken columns to posts table
- [x] Run DB migration for all new columns and tables
- [x] tRPC: brandBrief.save — upsert brand brief for workspace
- [x] tRPC: brandBrief.get — get brand brief for workspace
- [x] tRPC: brandBrief.uploadPhoto — upload photo to S3, save to brand_photos
- [x] tRPC: brandBrief.getPhotos — list approved photos for workspace
- [x] tRPC: approval.getPendingPosts — agency view, all posts with approvalStatus = pending_agency across all workspaces
- [x] tRPC: approval.approvePost — agency approves, moves to pending_client or scheduled
- [x] tRPC: approval.rejectPost — agency rejects with note, moves back to draft
- [x] tRPC: approval.editAndApprove — agency edits content then approves
- [x] tRPC: approval.getClientPreview — public procedure, returns posts by previewToken (no login)
- [x] tRPC: approval.clientFlag — public procedure, client flags a post with a note
- [x] tRPC: approval.clientApproveAll — public procedure, client approves all pending posts
- [x] Agency Queue dashboard page (/dashboard/approval-queue) — table of all pending posts across all clients, approve/edit/reject inline
- [x] Brand Brief setup page (/dashboard/brand-brief) — form for business facts, voice, compliance rules
- [x] Photo Library page (/dashboard/brand-photos) — upload, label, and manage approved photos
- [x] Client Preview page (/preview/:token) — public read-only, shows upcoming posts, Flag / Looks Good buttons
- [x] Wire AI Ad Studio to read Brand Brief before generating content
- [x] Add approval queue link to AppLayout sidebar
- [x] Add brand brief and photo library links to AppLayout sidebar
- [x] Notify owner when client flags a post (notifyOwner)
- [x] Tests for all new procedures

## Quick Capture — Mobile-First Content Submission

- [ ] DB schema: quick_captures table (workspaceId, userId, mediaUrl, mediaType, voiceUrl, voiceTranscript, textNote, aiGeneratedPosts JSON, status, createdAt)
- [ ] DB migration for quick_captures table
- [ ] tRPC: quickCapture.submit — upload media + voice + text note, trigger AI post generation
- [ ] tRPC: quickCapture.getForWorkspace — list captures with status for agency review
- [ ] tRPC: quickCapture.approveAndSchedule — agency approves AI-generated posts from a capture
- [ ] tRPC: quickCapture.reject — reject a capture with note back to client
- [ ] Voice transcription via Whisper API (existing voiceTranscription helper)
- [ ] AI post generation from capture (photo/video description + voice transcript + brand brief → platform captions)
- [ ] Mobile-first Quick Capture page (/capture) — camera, voice recorder, text note, one-tap submit
- [ ] Camera/photo/video capture using browser MediaDevices API (mobile Safari + Chrome)
- [ ] Voice recorder using MediaRecorder API with S3 upload
- [ ] Real-time upload progress indicator on mobile
- [ ] Success screen after submission ("Your content is with us — we will take it from here!")
- [ ] Quick Capture review page in agency dashboard — media preview, transcript, AI posts, approve/edit/reject
- [ ] TikTok video-only enforcement — warn/block if TikTok selected but no video attached
- [ ] Weekly content reminder notifications (2x per week) — push/email to clients asking for new captures
- [ ] Reminder settings — client can set preferred reminder days and times
- [ ] Shareable /capture link clients can add to phone home screen (PWA manifest + mobile meta tags)
- [ ] Tests for quickCapture procedures

## Dynamic Ad Spend Slider Pricing
- [ ] Build AdSpendSlider reusable component with real-time management fee calculation
- [ ] Replace fixed packages on Pricing page with the slider
- [ ] Replace Step 4 payment in ManagedOnboarding with the slider + dynamic Stripe checkout
- [ ] Update Stripe checkout to pass dynamic management fee amount

## Instant Ad Demo — Wow Moment Rebuild (2 May)
- [ ] Rebuild InstantAdDemo: two-panel layout (left = platforms, right = progress ring)
- [ ] Left panel: list of 6 recommended platforms, highlighted green based on business type
- [ ] Left panel: "Suggested platforms only" disclaimer
- [ ] Right panel: animated SVG progress ring with percentage counter
- [ ] Right panel: live status messages cycling while AI builds ("Analysing your website...", "Crafting your post...", "Generating your image...")
- [ ] AI image generation: generate a business-relevant image alongside the ad copy
- [ ] Final reveal: polished post preview card with image, caption, platform badges
- [ ] Final reveal: bold signup CTA below the post ("Sign up to a package here")
- [ ] Smooth fade-in animation when the post is revealed

## Instant Ad Demo — Wow Moment Rebuild (2 May)
- [ ] Rebuild InstantAdDemo: two-panel layout (left = all 13 platforms, right = progress ring)
- [ ] Left panel: all 13 platforms listed, recommended ones highlighted green based on business type
- [ ] Left panel: "Suggested platforms for your business type" label
- [ ] Right panel: animated SVG progress ring with "Your social media post is being generated" text
- [ ] Right panel: live status messages cycling while AI builds
- [ ] AI image generation: generate a business-relevant image alongside the ad copy
- [ ] Pexels fallback: if image generation takes >8s, pull relevant stock photo
- [ ] Final reveal: polished post preview card with image, caption, platform badges
- [ ] Final reveal: bold signup CTA below the post
- [ ] Smooth fade-in animation when the post is revealed

## Session — Logo Upload & Onboarding Simplification
- [x] Fix logo upload on Brand Profile page — replaced broken hidden-input button with accessible label+input drag-and-drop zone, file processes via FileReader → base64 → S3 via updateBrandProfile mutation
- [x] Remove "13 platforms" reference from Brand Profile business description section
- [x] Rename "Brand Basics" section to "About Your Business" with cleaner copy
- [x] Collapse Managed Onboarding wizard from 5 steps (Business, Logo, Platforms, Payment, Launch) to 2 steps (Your Business + Launch)
- [x] Step 1 now combines: business name/website/industry/description + logo upload + platform selection with industry-based recommendations
- [x] Step 2 (Launch) shows what's included, AdSpendSlider for budget, trust signals, and Go to Dashboard button

## Content Library & Onboarding Fixes (Current Session)
- [ ] Fix onboarding: pre-fill description from rawReport.summary
- [ ] Fix onboarding: show confirmation card with all detected data + "adjust if not correct" note
- [ ] DB schema: content_assets table (workspaceId, photoUrl, voiceUrl, transcript, aiCaption, status: pending/processing/approved/rejected, createdAt)
- [ ] tRPC: uploadContentAsset — photo (base64) + voice (base64) → S3 upload → DB record status=pending
- [ ] tRPC: polishAsset — Whisper transcription + LLM caption generation → status=processing→ready
- [ ] tRPC: listAssets, approveAsset, rejectAsset
- [ ] Dashboard sidebar nav item: "Content Library"
- [ ] Content Library page: daily reminder banner, upload card (photo + voice), asset queue
- [ ] Upload card: camera/file input for photo, MediaRecorder for voice, auto-transcribe on stop, preview before submit
- [ ] Queue view: pending items with photo + transcript + AI caption, Approve / Reject buttons
- [ ] Approved gallery: approved assets ready for scheduling

## Quick Post Homepage Demo (Interactive)
- [ ] Public tRPC procedure: guest preview — accepts base64 photo + voice transcript, returns AI-generated captions (no auth required)
- [ ] Homepage Quick Post section: two-tab UI — Watch Demo (animated) / Try It Yourself (interactive)
- [ ] Try It Yourself: photo upload from device, voice recording with MediaRecorder, transcription, AI caption generation, result display
- [ ] Sign-up prompt after result: "Love it? Sign up to publish"

## Homepage & Onboarding Overhaul
- [ ] Replace Stats+Hooks section with 5 clean feature cards (ease of use, 30-sec upload, brand audit, budget slider, AI hashtags)
- [ ] Add "human approves every post" trust badge to homepage hero
- [ ] Add Google Business Profile and Website as platform options throughout app
- [ ] Add platform setup step to ManagedOnboarding: audit pre-selects recommended platforms, user ticks which they have vs need
- [ ] Dynamic onboarding fee: $25 per platform needing setup, shown as total on checkout step
- [ ] No price shown during platform selection — only revealed on the fee summary screen

## Stock Photo Library + Always-3 Queue System

- [ ] Integrate Unsplash API for stock photo search in QuickPost flow
- [ ] Add "Find a photo for me" button in QuickPost as alternative to uploading
- [ ] AI auto-selects best Unsplash photo based on post topic + business type
- [ ] Display photo results in a scrollable grid for client to confirm or swap
- [ ] Always-3 Queue: auto-generate 3 pre-approved backup posts per client workspace
- [ ] Queue replenishment: when a queued post is used, AI generates a replacement automatically
- [ ] Notification system: alert client when a post is due (day before scheduled date)
- [ ] Notification includes two options: "Upload my own" or "Use a queued post"
- [ ] If no client upload by due time, automatically pull from queue and notify client
- [ ] Queue management UI: client can view, approve, edit, or swap queued posts
- [ ] Queue status indicator in dashboard showing how many posts are ready

## Homepage Redesign

- [ ] Research Buffer, Later, Framer homepage designs for layout inspiration
- [ ] Create 3-4 homepage design concept mockups for user selection
- [ ] Implement chosen homepage design concept
- [ ] Embed user-provided video into homepage hero when ready

## Smart Content Queue — Priority Upload System

- [ ] Client-submitted posts always take priority over AI-generated queue posts
- [ ] Upload screen: rotating smart hint tips (mention customer names, event hashtags, date requests)
- [ ] AI date intent detection: parse "post this on 27 June" or "post this Friday" from voice/text notes
- [ ] Scheduling: if date detected, slot post for that date; if "post early" detected, move to front of queue
- [ ] Queue priority order: (1) client posts with date → (2) client posts no date → (3) AI backup posts
- [ ] postQueue DB table: workspaceId, type (client|ai_backup), mediaUrl, caption, scheduledDate, status
- [ ] Always-3 backup queue: auto-generate 3 AI posts using Pexels photos + brand brief when queue is low
- [ ] Queue replenishment: when a backup post is used, generate a replacement automatically
- [ ] Client queue view: "Your Uploads (N)" vs "Ready if Needed (N)" clearly separated
- [ ] Weekly upload reminder notification with smart tips included in the message
- [ ] Event hashtag detection: if client mentions an event name, AI adds the event hashtag automatically

## QuickPost Demo Fixes (May 2026)
- [x] Fix phone mockup shape — make it tall and narrow like an iPhone (aspect ratio ~9:19.5), not square
- [x] Fix "Watch the demo" button — currently dead toggle, wire to YouTube/video modal or remove if no asset
- [x] Fix "Try it yourself" feature — camera/mic broken in browser preview context; ensure file upload + voice flow works
- [x] Make the button below the phone mockup smaller (text-xs, compact padding)
- [x] Fix homepage layout wobble — add overflow-x:hidden to html/body
- [x] Remove "Go to Dashboard" button from hero CTA

## PWA & Voice Shortcut Feature (May 2026)
- [ ] Add manifest.json to client/public with app name, icons, start_url pointing to /dashboard/quick-capture, display standalone, theme/background colors
- [ ] Generate PWA icons (192x192 and 512x512) from Blastly logo and upload to webdev static assets
- [ ] Add service worker (sw.js) for offline splash / fast load
- [ ] Register service worker in client/main.tsx
- [ ] Add meta tags to index.html for iOS (apple-mobile-web-app-capable, apple-touch-icon, apple-mobile-web-app-title)
- [ ] Add install prompt hook (beforeinstallprompt) and InstallBanner component
- [ ] Show InstallBanner on homepage (dismissable, appears after 3 seconds)
- [ ] Show InstallBanner on dashboard quick-capture page
- [ ] Build /install page — ultra-simple 3-step guide: (1) Add to Home Screen, (2) Open app, (3) Ask Siri "Hey Siri, Blastly Post"
- [ ] Add /install route to App.tsx
- [ ] Add "Add to Home Screen" CTA to homepage hero section

## Ad Budget Wallet Feature (May 2026)
- [ ] DB table: ad_wallet (workspaceId, balanceAud cents, monthlyBudgetAud cents, autoTopUp bool, autoTopUpThresholdAud cents, autoTopUpAmountAud cents, stripePaymentMethodId, nextBillingDate, createdAt, updatedAt)
- [ ] DB table: wallet_transactions (id, workspaceId, type top_up/spend/refund, amountAud cents, description, stripePaymentIntentId, createdAt)
- [ ] Run DB migration for both tables
- [ ] tRPC wallet router: getWallet, setMonthlyBudget, topUp (Stripe checkout), getTransactions, setAutoTopUp
- [ ] Register wallet router in server/routers.ts
- [ ] Budget slider on homepage: show live balance widget below slider (current balance, % used, top up button)
- [ ] Budget slider on homepage: show "Low balance" warning when balance < 20% of monthly budget
- [ ] Billing dashboard page: add Wallet section showing balance, transaction history, top-up button, auto top-up toggle
- [ ] Stripe checkout for wallet top-up (one-time payment, amounts: $50, $100, $200, $500 AUD)
- [ ] Stripe webhook: on payment_intent.succeeded for wallet top-up, credit the wallet balance
- [ ] Low-balance email/notification reminder: 7 days before month end if balance < 25% of monthly budget
- [ ] Auto top-up setting: if enabled, automatically charge saved payment method when balance drops below threshold
- [ ] Show "Direct Debit / Auto Top-Up" toggle in wallet settings with threshold and amount inputs

## Ad Budget Wallet Feature (May 2026)
- [ ] DB table: ad_wallet (workspaceId, balanceAud, monthlyBudgetAud, autoTopUp, autoTopUpThreshold, autoTopUpAmount, stripePaymentMethodId, nextBillingDate)
- [ ] DB table: wallet_transactions (id, workspaceId, type, amountAud, description, stripePaymentIntentId, createdAt)
- [ ] Run DB migration for wallet tables
- [ ] tRPC wallet router: getWallet, setMonthlyBudget, topUp, getTransactions, setAutoTopUp
- [ ] Register wallet router in server/routers.ts
- [ ] Budget slider on homepage: show live balance widget below slider (current balance, % used, top up button)
- [ ] Budget slider on homepage: show Low balance warning when balance < 20% of monthly budget
- [ ] Billing dashboard page: add Wallet section with balance, transaction history, top-up, auto top-up toggle
- [ ] Stripe checkout for wallet top-up (one-time payment, amounts: 50, 100, 200, 500 AUD)
- [ ] Stripe webhook: on payment_intent.succeeded for wallet top-up, credit the wallet balance
- [ ] Low-balance notification reminder: 7 days before month end if balance < 25% of monthly budget
- [ ] Auto top-up: if enabled, charge saved payment method when balance drops below threshold
- [ ] Show Direct Debit / Auto Top-Up toggle in wallet settings with threshold and amount inputs

## Social Provider Abstraction + Zernio Integration (COMPLETE)
- [x] Create socialProvider.ts abstraction layer (ISocialProvider interface)
- [x] Implement ZernioProvider (mock mode when ZERNIO_API_KEY not set)
- [x] Implement AyrshareProvider (fallback, switch via SOCIAL_PROVIDER env var)
- [x] Update workspace router to use socialProvider instead of ayrshare directly
- [x] Add getLinkingUrl procedure to workspace router (generates OAuth linking URL)
- [x] Build SocialSetup.tsx — 3-step guided setup page
  - [x] Step 1: Connect existing accounts via provider OAuth (one button, new tab)
  - [x] Step 2: Quick wins — Bluesky, Threads, Pinterest, TikTok (< 5 min each)
  - [x] Step 3: Heavy platforms — Facebook, Instagram, LinkedIn, YouTube, Google Business, X
- [x] Build SocialSetupWrapper.tsx — route wrapper with auth/workspace guards
- [x] Register /social-setup route in App.tsx

## Social Setup Progress Tracking
- [x] Add socialSetupProgress table to drizzle schema (workspaceId, step1Done, step2Done, step3Done, connectedPlatforms JSON, completedSetups JSON, lastUpdated)
- [x] Run migration SQL
- [x] Add getSetupProgress and saveSetupProgress tRPC procedures
- [x] Update SocialSetup.tsx to load progress on mount and auto-save on every state change
- [x] Show setup completion badge/progress bar on dashboard Connections page
- [x] Show "Resume setup" prompt in dashboard if setup is incomplete

## Admin Dashboard — Setup Progress Widget
- [ ] Add getSetupProgressStats tRPC admin procedure (aggregate across all workspaces)
- [ ] Build SetupProgressWidget component with overall completion rate, per-step breakdown, and per-client list
- [ ] Add widget to admin dashboard page

## Client Dashboard Home Screen & Colour Schemes

- [x] Add workspace_preferences DB table (workspaceId, colorScheme, homeScreenMode: 'dashboard'|'assistant', createdAt, updatedAt)
- [x] Run DB migration for workspace_preferences table
- [x] tRPC: preferences.get and preferences.save procedures
- [x] Define 3 colour schemes: Bold/Pro (dark navy + electric blue), Soft/Friendly (light lavender + rose), Warm/Earthy (cream + terracotta)
- [x] Apply active colour scheme dynamically based on workspace preference (all in CommandCentre.tsx)
- [x] Build colour scheme picker UI component (3 swatches with labels, saved to DB)
- [ ] Add colour scheme picker to onboarding setup flow
- [ ] Add colour scheme picker to Settings page (can change any time)
- [x] Build Command Centre home screen (/dashboard/home): Quick Post CTA full-width, status tiles (queue/approvals/ad budget), platform health bar, Full Dashboard escape hatch
- [ ] Generate AI assistant character image for Blastly (professional, friendly, gender-neutral or two options)
- [ ] Build AI assistant home screen mode: full-screen character, greeting message with daily summary, hold-to-talk / tap-to-type interaction, navigates to features by voice/text command
- [ ] AI assistant navigation commands: "quick post" → /capture, "show messages" → /inbox, "my posts" → /posts, "dashboard" → /dashboard, "appointments" → /appointments, "raise invoice" → /invoices
- [ ] Add home screen mode toggle to Settings page (switch between Dashboard and AI Assistant at any time)
- [ ] Add home screen mode choice to onboarding (step shown after colour scheme pick)
- [ ] Persist home screen mode preference per workspace in DB

## Ideas Bank — Unified Inbox / Smart Inbox (Future)

Concept shared for reference — elements may be incorporated into Command Centre or as a future feature.

Key ideas worth using:
- [ ] AI daily summary line on Command Centre: "Most interest today is coming from Instagram. Customers are asking about X." — short, plain-English, generated from recent activity
- [ ] Opportunity value indicator on Command Centre — surface high-value leads/enquiries with estimated $ value
- [ ] Priority inbox panel — ranked list of messages needing attention across all connected channels (Instagram DMs, Facebook comments, email, reviews), with one-tap Confirm/Reply/View actions
- [ ] Channel health strip — per-channel new message count, reply backlog, booking conflicts (extends current platform health dots)
- [ ] Lead scoring — flag enquiries with booking intent or high purchase signals

Longer-term (separate product consideration):
- [ ] Full unified inbox product — pulls Instagram DMs, Facebook comments, email, Google reviews, calendar into one ranked list with AI context
- [ ] Business intelligence layer — "what are customers asking about today" aggregated across all channels

## Live Action Feed — Core Concept (High Priority Feature)

A rolling, real-time feed that surfaces everything requiring attention or awareness. Items stay on the feed until actioned or acknowledged. Replies and actions happen inline — no navigating away.

### Feed item types

**Action required (must respond):**
- Incoming DM or message (Instagram, Facebook, email, SMS) — inline reply box, send goes back via original channel, item drops off feed
- Booking request — Confirm / Reschedule / Decline inline
- Negative review — inline reply drafted by AI, one tap to publish
- Post approval waiting — Approve / Edit / Reject inline

**Awareness items (read and dismiss):**
- Post gaining traction — "Your post from last night has 15 likes and is still growing — tap to boost"
- Website update suggestion — "Your homepage hasn't been updated in 6 weeks — here's a suggested post"
- Competitor alert — "A competitor just posted about a sale — consider a response"
- Low ad budget warning — "At current spend you'll run out in 3 days"
- Booking conflict — "You have two appointments at 3pm on Thursday"

### Key behaviours
- Feed updates in real time (polling or websocket)
- Items ranked by priority: action-required > time-sensitive > awareness
- Each item has enough context to act without opening another screen
- Actioning or acknowledging removes the item from the feed
- AI drafts replies for messages and reviews — editable before sending
- "Mark as read" / "Dismiss" for awareness items
- Feed is per-workspace, not per-user

### This is the Command Centre's intelligence layer
The current Command Centre shows counts (3 approvals, 0 queue). The Live Action Feed replaces the need to tap through to find out what those counts mean. The feed IS the detail.

## Business AI Intelligence — Live Action Feed

### Feed priority rules
- Leads (new enquiries with booking/purchase intent) — always pinned to top, red/orange badge
- Action required items (DMs needing reply, approvals pending, negative reviews) — second tier, amber badge
- Awareness items (post traction, website suggestions, competitor alerts, low budget) — bottom of feed, blue/grey badge
- Items stay on feed until actioned or explicitly dismissed
- Feed updates in real time (polling every 30 seconds)

### Inline actions (no navigation away from feed)
- [ ] Reply to SMS inline — text box expands in the feed item, send goes via SMS, item drops off
- [ ] Reply to Instagram/Facebook DM inline — same pattern
- [ ] Reply to email inline — same pattern
- [ ] Approve/reject post inline — post approval without opening the queue page
- [ ] Confirm/decline booking inline
- [ ] Reply to Google review inline — AI drafts response, editable before publishing
- [ ] Dismiss awareness item — "Got it" button removes from feed
- [ ] Boost post inline — one-tap to boost a high-traction post to ads

### Feed item types
- [ ] New lead — name, channel, message snippet, AI-scored intent, Reply button
- [ ] Incoming DM (Instagram, Facebook) — inline reply
- [ ] Incoming email — inline reply
- [ ] Incoming SMS — inline reply
- [ ] Booking request — Confirm / Reschedule / Decline
- [ ] Post approval waiting — Approve / Edit / Reject
- [ ] Negative review — AI-drafted reply, one-tap publish
- [ ] Post gaining traction — "15 likes, still growing — Boost?" awareness item
- [ ] Low ad budget warning — awareness item with top-up link
- [ ] Website update suggestion — awareness item, dismiss or act
- [ ] Invoice paid notification — awareness item, dismiss
- [ ] Competitor alert — awareness item

### DB and backend
- [x] Add intelligence_feed_items table (workspaceId, type, priority, channel, senderName, messageSnippet, metadata JSON, status: pending/actioned/dismissed, createdAt)
- [x] Add tRPC procedures: intelligence.list, intelligence.action, intelligence.dismiss, intelligence.seedDemo
- [x] Add mock feed item seeder for demo/testing purposes

### UI
- [x] Build /dashboard/live-feed page with live feed (IntelligenceFeed.tsx)
- [x] Two sections: "Needs Attention" (priority 1-5) at top, "Your Business" (priority 6) at bottom
- [x] Each feed item is a card with sender info, channel icon, message preview, AI context line, and inline action buttons
- [x] Inline reply box expands on tap — no modal, no navigation
- [x] Feed auto-refreshes every 30 seconds, new items slide in at top of their section
- [x] Add "Live Feed" to AppLayout sidebar navigation
- [ ] Add intelligence feed summary count to Command Centre home screen (future)

## Updated Onboarding Wizard

- [ ] Rebuild onboarding to 8 steps (was 3): Business Profile → Social Accounts → Email → Phone/SMS → Google Business → Booking/Calendar → Payment System → Colour Theme + Done
- [ ] Step 3 — Email connection: Gmail (OAuth) and Outlook (OAuth) as primary options, manual IMAP as fallback, skip option
- [ ] Step 4 — Phone/SMS: enter mobile number, select SMS provider (Twilio built-in, or their existing provider), verify with code
- [ ] Step 5 — Google Business: connect Google Business Profile via OAuth for review monitoring and local SEO data
- [ ] Step 6 — Booking/Calendar: tiles for Calendly, Acuity, SimplyBook, Google Calendar, Square Appointments, skip option
- [ ] Step 7 — Payment System: tiles for Square, Stripe, Xero, MYOB, PayPal, Shopify, skip option — OAuth connect where available, store preference otherwise
- [ ] Step 8 — Colour theme picker (3 options: Bold, Soft, Warm) + "Your Command Centre is ready" completion screen
- [ ] All steps have "Skip for now" — nothing blocks completion
- [ ] Progress bar shows all 8 steps with labels
- [ ] Save all connection preferences to DB on each step (resume if they drop off)
- [ ] Voice input brand name correction: "lastly" → "Blastly" post-processing on all voice input fields

## Intelligence Feed — Priority Tier Update

Top section "Needs Your Attention" priority order (highest to lowest):
1. Upcoming appointments (within next 4 hours) — always shown first with time countdown
2. New leads / booking requests — second, with channel icon and AI-scored intent
3. Messages needing reply (DM, SMS, email) — third
4. Post approvals waiting — fourth
5. Negative reviews needing response — fifth

Appointment card shows: client name, time, service type, Confirm / Reschedule / Cancel inline
Booking conflict (two appointments same time) shown as red urgent card at very top

## Intelligence Feed — Two-Section Layout (Confirmed Design)

### Section 1: "Needs Attention" (top, always visible)
- Time-dependent and action-required items only
- Red/amber badges, sorted by urgency
- Items: upcoming appointments, new leads, booking requests, messages needing reply, post approvals, negative reviews
- Each card has inline action — reply, confirm, approve, dismiss
- Items drop off when actioned
- Auto-refreshes every 30 seconds, new items slide in

### Section 2: "Your Business" (below, always visible)
- Not time-dependent — business intelligence and awareness
- Blue/grey badges, no urgency pressure
- Items: post traction updates, invoice paid, ad budget status, website suggestions, competitor alerts, performance insights
- "Got it" / "Act on it" to dismiss
- Can accumulate — not urgent to clear
- Stays visible until explicitly dismissed

### Visual separation
- Clear divider between the two sections with section headers
- Section 1 header: red dot + "Needs Attention (3)"
- Section 2 header: blue dot + "Your Business"
- If Section 1 is empty: show "All clear — nothing needs attention right now" with a green tick

## Future Features — AI Route Optimisation & Website Integration

### AI-Optimised Daily Route (Tradies / Mobile Businesses)
- When calendar appointments are connected, AI sequences the day's jobs by geography to minimise drive time
- Factors in job duration estimates per appointment type
- Morning view: map showing today's jobs in optimal order, tap to open Google Maps navigation to first stop
- Drag to reorder if client wants to override AI suggestion
- Uses Google Maps Distance Matrix API (already available via Manus proxy)
- Particularly valuable for: plumbers, electricians, cleaners, mobile pet groomers, mobile beauty

### Website Contact Form Embed
- Simple JavaScript embed snippet (one line of code) that clients drop into their existing website
- When a visitor submits the contact form, the enquiry appears in the intelligence feed as a lead_new item in real time
- AI scores the intent (booking request, quote request, general enquiry) and drafts a reply
- No need to check website email separately — it all flows into the feed
- Embed code generated per workspace (unique token for security)
- Include in onboarding step: "Add this to your website to capture leads directly in Blastly"

### Connection Trust & Transparency
- Each connection screen shows exactly what data is accessed and what is never touched
- Disconnect button always visible — one tap to remove any connection
- Connections are optional — app works with whatever is connected, value increases with each addition
- Show immediate value on connection (appointments appear instantly when calendar connected)

## Field View — Phone-First Daily Driver

- [x] Build FieldView page at /field — standalone, no AppLayout sidebar, no dashboard chrome
- [x] Header: business name (large, clean) + time/date + notification dot
- [x] Live feed: 2-3 lines per item max, tap to expand, inline reply with AI draft
- [x] Feed items show channel icon + sender + one-line summary only (no walls of text)
- [x] Appointment items: show time countdown + inline actions (Confirm / Reschedule / Cancel)
- [x] Message items: tap to expand inline reply box with AI draft
- [x] Floating Quick Post button (bottom centre, camera icon, always visible)
- [x] Subtle "Office View →" link at very bottom (small, not prominent)
- [x] No sidebar, no nav bar, no dashboard chrome — standalone screen
- [x] Set /field as the default redirect after login (Home.tsx → My Feed button)
- [x] Renamed Live Feed to Field View in AppLayout sidebar
- [x] /dashboard/home (Command Centre) accessible via Office View

## Field View — Two-Column Redesign

- [x] Two-column layout: left = needs action feed, right = day calendar + payments
- [x] Left column: colour-coded feed cards (blue=appointments, green=leads, amber=messages, red=urgent/negative review)
- [x] Right column top: day-view calendar showing today's confirmed appointments (blue blocks) and pending/leads (green blocks) in time slots
- [x] Right column bottom: payments received today (list of transactions with amount, source, time)
- [x] Colour coding consistent across both columns (blue appointment in calendar = blue card in left feed)
- [x] Mobile: tab switcher (Live Feed / My Day tabs)
- [x] Demo data seeds calendar appointments and payments for preview
- [x] Move Quick Post button to top of right column (above the day calendar), remove floating FAB at bottom
- [x] Full colour design for Field View: deep navy/dark background, blue appointment cards, green lead cards, amber message cards, red urgent/review cards, teal payment cards

## Marketing / App Separation Fix
- [ ] Remove "My Feed" button from marketing homepage nav (Home.tsx)
- [x] Logged-in users visiting / redirect straight to /command-centre. Added ?preview=1 bypass for owner to test marketing page while logged in.
- [ ] Marketing homepage is for prospects only — no logged-in app links visible

## Field View — Visual Polish
- [ ] Sharpen typography: tighter headings, better font weights, cleaner hierarchy
- [ ] Improve card design: sharper borders, better colour contrast, more professional feel
- [ ] Header: cleaner layout, better spacing, more polished branding strip
- [ ] Colour-coded cards: more vivid, less washed out — blue/green/amber/red should pop
- [ ] Overall: feels like a premium business tool, not a prototype

## Field View — Visual Redesign (Match Marketing Site)
- [ ] Match marketing site colour palette: oklch(0.13 0.012 245) background, electric blue accents, emerald highlights
- [ ] Add Space Grotesk font to Field View header (same as marketing site)
- [ ] Quick-action strip at top: Send Email, Send SMS, Quick Social Post, Raise Invoice — 4 icon buttons in a row
- [ ] Payments received section stays bottom-right column
- [ ] Card design: sharper, more premium — subtle gradient borders, stronger contrast
- [ ] Section labels: same uppercase tracking style as marketing site
- [ ] Overall feel: premium business tool, consistent with Blastly brand

## Field View — Podium-Inspired Redesign
- [ ] Remove traffic-light colour scheme (no red/green/amber/purple per card type)
- [ ] Dark background overall, cards use dark panel colour with subtle border only
- [ ] Single accent: Blastly blue only — used for active/selected state and primary CTA
- [ ] Small status pill badges only (e.g. "NEW LEAD", "APPOINTMENT", "REVIEW") — pill is the only colour hint
- [ ] Leads section completely separate from messages/notifications section
- [ ] Pre-written message templates as quick-reply pill buttons below reply box
- [ ] Clean typography: bold sender name, regular weight preview, muted grey metadata/timestamp
- [ ] Minimal borders — subtle separator lines only, no decorative coloured borders
- [ ] Quick action strip uses consistent dark styling, not 4 different gradient colours

## Field View — 3-Layer IA Redesign (from external brief)
- [ ] Layer 1 — KPI strip: 6 metrics (new leads, appointments booked, unanswered messages, revenue opportunity, response time, conversion rate)
- [ ] Layer 1 — Channel health cards: 6 sources (Social, Email, Website Chat, Appointments, Ads/Campaigns, Reviews) each with count, needs-action count, trend vs previous period, one-line summary
- [ ] Layer 1 — Blastly logo in header (replace B placeholder) ← DONE
- [ ] Layer 2 — Work view panel: reply, confirm, assign, mark complete, conversation history (opens when channel card clicked)
- [ ] Layer 3 — Detail drill-in: source attribution, lead history, AI reasoning, full thread (future)
- [ ] Colour semantics: red=urgent/overdue, green=confirmed/completed, blue=primary action, gray=neutral/archived — NO other colours
- [ ] Source icons/labels instead of per-source colour coding
- [ ] Google review request system: DB tables created, tRPC router + UI in Field View
- [ ] Review request: auto-send on invoice_paid / invoice_sent / job_completed
- [ ] Review request: pre-written SMS/email templates with dropdown selector

## Command Centre UI Polish (May 2026)
- [ ] Header: replace "Blastly" text with actual Blastly logo image (prominent, good size)
- [ ] Header: replace "My Workspace" with real business name from workspace profile
- [ ] Action strip: remove Review button
- [ ] Action strip: add Contacts button (opens inline contact list with call/email/SMS)
- [ ] Move Invoice action from top strip into Invoices & Payments panel
- [ ] Today's Schedule: dark/shaded header bar so it stands out
- [ ] Today's Schedule: darker border around the whole panel
- [ ] Today's Schedule: show as time-slot calendar (9:00, 9:30, 10:00 etc.) with booked slots filled, free slots clearly visible
- [ ] Invoices & Payments: dark/shaded header bar
- [ ] Invoices & Payments: darker border around the whole panel
- [ ] Invoices & Payments: "+ Invoice" becomes a proper green CTA button (positive action)

## Command Centre Feed UX (May 2026)
- [ ] Remove red action-count badge from header (no extra click needed)
- [ ] Remove AI briefing banner from below action strip (move summary into header)
- [ ] Feed cards: always expanded by default — no tap required to see content
- [ ] Feed sorted by urgency: urgent/overdue first, then leads (green), then appointments (blue), then messages, then awareness
- [ ] Section labels renamed: "Urgent — Act Now" / "New Messages & Leads" / "Your Business"
- [ ] Header: AI briefing inline next to logo (compact — "4 items need attention")
- [ ] Remove chevron expand/collapse on feed cards — content always visible
- [ ] Oval black pill header on Today's Schedule and Invoices & Payments panels
- [ ] Contacts button replaces Review button in action strip
- [ ] Invoice button moved to Invoices & Payments panel as green CTA

## Command Centre Redesign — No-Scroll Layout
- [x] Compact 2-line feed cards (name + service + status, no expansion by default)
- [x] Swipe-left on card reveals Archive / Reply / Dismiss (iPhone Messages style)
- [x] Reply panel opens to the RIGHT — client info left, AI voice-to-text reply right
- [x] Pinned urgent section at top (red/amber, never moves, always actionable)
- [x] Rotating awareness carousel below urgent — info items rotate every 20s like departure board
- [x] Compact action strip (4 small icon+label buttons) moved above Today's Schedule
- [x] No scrolling needed — entire screen fits in one view on desktop
## Client Contact & Quick Setup (May 2026)
- [x] Action strip: replace 4 buttons with 2 — "Client Contact" and "Quick Post"
- [x] Reply panel: add channel selector (SMS / Email / Social) before composing
- [x] Fix empty gap in feed column (Today at a Glance panel fills remaining space)
- [x] ClientContactModal: My Contacts tab (from DB), Google Import tab, Upload File tab
- [x] ClientContactModal: privacy disclaimer + Disconnect any time on each tab
- [x] QuickSetup page: rapid-fire approve flow for 12 connections with privacy notes
- [x] QuickSetup: Disconnect any time button on each approved card
- [x] QuickSetup: global privacy banner — no data stored on our servers
- [x] Route /quick-setup registered in App.tsx
- [ ] Logo: strip blue background, clean dark text on transparent background (Podium-style)
- [x] Day Zero snapshot in Quick Setup: platforms used, hours/week, social metrics, leads/week
- [x] Business Health dashboard chart: rising line graph from Day Zero to today (time saved, reach, platforms consolidated)
- [ ] Test & Simulate panel: trigger test lead, appointment, SMS, invoice, review request

## Mobile UX Fixes
- [x] Command Centre / Live Feed: on mobile, tapping a message item opens a full-screen overlay (fixed inset-0 z-50) instead of a side panel. Desktop keeps the 50/50 side-panel layout.

## Admin Dashboard Enhancements
- [ ] Promote owner account to admin role in the database
- [ ] Admin API: expose onboarding progress per workspace (quick setup completed, social platforms connected, first post published, etc.)
- [ ] Admin Dashboard UI: show client onboarding journey progress (step-by-step checklist per client)
- [ ] Admin Dashboard UI: show which social platforms each client has connected
- [ ] Admin Dashboard UI: show last active date and activity summary per client
- [ ] Admin Dashboard UI: send progress update / nudge message to individual clients
- [ ] Admin Dashboard UI: churn risk indicators (inactive clients, incomplete setup)

## AI-Powered Onboarding (Smart Setup)
- [ ] Onboarding: logo upload — extract brand colours, font style, and visual identity automatically
- [ ] Onboarding: voice-to-text brand summary (60-90 sec) — transcribe and AI-extract brand voice, USPs, key messages, tone
- [ ] Onboarding: document upload (PDF brochures, price lists, service menus) — AI reads and populates services, pricing, descriptions
- [ ] Onboarding: video upload — AI watches and extracts key points, quotes, and messaging
- [ ] Onboarding: AI pre-populates all social platform fields (bio, category, website, phone, profile image brief, cover image brief, first 5 posts)
- [ ] Onboarding: user reviews pre-populated fields, makes minor edits, then creates platform passwords — minimal manual entry
- [ ] Onboarding: generate brand colour palette from logo and apply to Blastly workspace theme
- [ ] Onboarding: suggest posting strategy based on industry and brand voice

## Social Platform Connection UI (Smart Connect)
- [ ] Social Setup page: two-column layout — left column lists all platforms, right column shows pre-populated fields + Connect button
- [ ] Each platform row shows: platform icon, platform name, status badge (Connected / Not Connected)
- [ ] Clicking Connect opens a panel/modal showing all pre-populated fields (bio, username suggestion, category, website, phone, profile image) ready for the user to review
- [ ] User reviews fields, makes minor edits if needed, then clicks "Open [Platform] to Create Account" — opens platform signup with fields ready to copy-paste
- [ ] After creating the account on the platform, user returns to Blastly and clicks "Mark as Connected" — status badge updates to Connected (green)
- [ ] For platforms that support OAuth (Instagram, Facebook, LinkedIn, Twitter/X): Connect button triggers OAuth flow directly — no manual password needed
- [ ] Unconnected platforms show "Connect" button in muted style; connected platforms show green "Connected" badge with disconnect option
- [ ] Progress indicator at top: "X of Y platforms connected"

## Smart Social Setup — Pre-Population (Priority Build)
- [ ] Server: add generatePlatformBios procedure — takes workspace brand data (name, description, industry, tone, website, phone, address, tagline, target audience) and returns AI-generated bios tailored per platform (Instagram 150 chars, Facebook 500 chars, TikTok 80 chars, LinkedIn 300 chars, Google Business 750 chars, YouTube 1000 chars, Twitter/X 160 chars, Pinterest 160 chars, Bluesky 300 chars)
- [ ] SocialSetup: pull workspace brand data and call generatePlatformBios on load
- [ ] SocialSetup: show copy-to-clipboard pre-filled fields per platform (bio, business name, website, phone, category suggestion) when user expands a platform card
- [ ] SocialSetup: "Copy Bio" button copies the platform-specific bio to clipboard with toast confirmation
- [ ] SocialSetup: "Copy All Fields" button copies all pre-filled fields as formatted text for easy paste
- [ ] SocialSetup: show loading skeleton while bios are being generated
- [ ] SocialSetup: "Regenerate" button to re-generate bios if user updates their brand profile

## SocialSetup Bio Generation — COMPLETED
- [x] Server: generatePlatformBios procedure added to workspace.ts — calls invokeLLM, returns per-platform bios + prefilledFields for 9 platforms
- [x] SocialSetup: state variables (platformBios, prefilledFields, biosLoaded), generateBios mutation, copyToClipboard/copyAllFields helpers
- [x] SocialSetup Step 2: Generate Bios banner (pre-generation prompt + post-generation regenerate button)
- [x] SocialSetup Step 3: Generate Bios banner (amber theme, same shared state)
- [x] SocialSetup Steps 2 & 3: pre-filled fields block inside each expanded platform section (business name, bio, website, phone, address, tagline — each with Copy button + Copy All)
- [x] SocialSetup: "Generate bios above" placeholder shown when bios not yet generated

## Tab Styling Fix — Command Centre
- [ ] Fix Live Feed / My Day mobile tab switcher: both tabs same pill/capsule shape, white background with white circle ring, white text — active tab solid white bg with dark text, inactive tab transparent with white text

## Admin Dashboard Expansion
- [ ] Admin Dashboard: add client journey columns — onboarding steps completed, platforms connected, last active date
- [ ] Admin Dashboard: add nudge/contact action button per client row
- [ ] Admin Dashboard: add churn risk indicator (inactive > 7 days = amber, > 14 days = red)
- [ ] Admin Dashboard: server procedure adminClientIntelligence (or extend existing) to return per-workspace onboarding progress + platform count + last active

## Voice-to-Text Brand Summary
- [ ] BrandProfile: add microphone record button to business description field
- [ ] BrandProfile: on record stop, upload audio to S3, call transcribeAudio, paste transcript into description field
- [ ] BrandProfile: show recording state (pulsing red mic), processing state (spinner), and success toast

## Sprint — Tab Styling, Admin Dashboard, Voice Bio

- [x] Fix Live Feed / My Day tab styling — matching pill/capsule shape, same white background, consistent look
- [x] Admin Dashboard — expanded client journey table (onboarding steps, platforms connected, last active, churn risk, nudge action)
- [x] Admin Dashboard — adminClientIntelligence tRPC procedure + db helper with churn risk calculation
- [x] BrandProfile — voice-to-text brand description (Speak it button, MediaRecorder, upload to S3, Whisper transcription, AI-polish)

## Appointments & Booking System

- [x] DB schema: appointments table (workspaceId, contactId, serviceId, title, startAt, endAt, status, notes, paymentMethod, amountCents, loyaltyPointsEarned, reminderSent, reviewSent, bookingToken)
- [x] DB schema: services table (workspaceId, name, durationMinutes, priceCents, description, isActive)
- [x] DB schema: loyalty_settings table (workspaceId, pointsPerDollar, dollarsPerPoint, smsFrequencyDays, isEnabled)
- [x] DB schema: loyalty_balances table (workspaceId, contactId, pointsBalance, totalEarned, totalRedeemed)
- [x] DB schema: booking_portal_settings table (workspaceId, isEnabled, slug, welcomeMessage, businessHoursJson)
- [x] DB migration applied (6 tables created)
- [x] tRPC appointments router: listByRange, create, update, cancel, complete, closeOut, sendReminder, getAvailableSlots, createPortalBooking
- [x] tRPC services router: listServices, createService, updateService, deleteService
- [ ] tRPC loyalty router: getSettings, saveSettings, getBalance, redeemPoints, sendBalanceSMS
- [ ] tRPC booking router: getPortalSettings, savePortalSettings, getAvailableSlots, createBooking (public)
- [x] Calendar page: day/week tab toggle, appointment cards with dark borders, time labels (8:00–8:30 AM style)
- [x] Calendar: + button to add appointment
- [x] Calendar: tap/hover overlay showing full appointment details inline (not new screen)
- [x] Add Appointment modal: client name/phone/email, service picker (auto-fills duration), date/time, notes
- [ ] Appointment overlay/modal: SMS reply button, email reply button
- [ ] Appointment close-out: payment method selector (QR code/cash/card), amount, loyalty points awarded
- [ ] Appointment close-out: auto-send review + thank-you SMS after payment
- [ ] Automated reminders: day-before SMS, 2-hour-before SMS, confirmation SMS with reschedule link
- [ ] Reminder message templates: editable in appointment settings
- [x] Service Menu settings page: add/edit/delete services with name, duration, price
- [ ] Loyalty settings page: configure points-per-dollar, dollar-per-point, SMS frequency
- [ ] Loyalty dashboard widget: total members, total points outstanding, monthly redemptions
- [x] Online Booking Portal: public page at /book/:slug, service picker, available time slots, contact form, confirmation
- [ ] Booking portal: optional toggle in settings (on/off per workspace)
- [ ] Booking portal: confirmation SMS/email with reschedule link sent to client
- [x] Add Calendar/Appointments to sidebar navigation and App.tsx routes
- [ ] Add Booking Portal settings to workspace settings
- [x] TypeScript check passes (0 errors), 164 tests passing

## AppointmentDrawer UX Improvement
- [ ] Remove Reminders/Payment tabs — show Payment/Rewards section above Reminders in one scrollable view (no tabs)
- [ ] Fetch loyalty settings + balance and display points-to-earn preview and redeem option in payment section

## Customer Profile in Contacts
- [ ] Contacts page: search by name/phone/email with instant filter
- [ ] Tap contact → open full CustomerProfile panel/page
- [ ] CustomerProfile: SMS conversation history
- [ ] CustomerProfile: Email history
- [ ] CustomerProfile: Appointment history (past + upcoming) with status and amount
- [ ] CustomerProfile: Loyalty points balance, total earned, total redeemed, history
- [ ] CustomerProfile: Payment history (date, amount, method, service)
- [ ] CustomerProfile: Notes/tags editable inline
- [ ] Backend: getContactProfile procedure returning all above data in one query

## Bug Fixes & Homepage Improvements (May 2026)
- [ ] Fix Audit "All" button — currently reloads URL input form instead of navigating to all-results view
- [ ] Fix fake audit scores — unregistered domains (e.g. geniusjungle.ai) should return "no data" state, not hallucinated 65/100 scores
- [ ] Simplify Social Autopilot (AdSpendSlider): keep only 2 plan options (3×/week and 5×/week), remove 3 credits boxes, remove daily budget per post field
- [ ] Change autopilot CTA button to "I'm ready to try 14 days for free" (no Stripe checkout — just navigate to sign-up/onboarding)
- [ ] Add "Human verified" badge/copy to autopilot section
- [ ] Add Command Centre demo/preview section to homepage — animated mock showing live messages, appointments, and alerts so visitors see the product before signing up
- [x] Fix Blastly logo — make bigger throughout, ensure it links to homepage on every page (AppLayout, AuditPage, AuditReportPage, CommandCentreBI, BusinessIntelligence, Pricing, Home, SharedReport, Privacy, Terms, Contact)
- [ ] Add 3 animated in-browser demos to homepage: Command Centre (large left), Post in 2 clicks (centre), Blastly overview (right) — replacing 2 identical video thumbnails
- [ ] Add type="button" to all filter buttons in ApprovalQueue and AdminDashboard to prevent form reload
- [ ] Add dataConfidence disclaimer banner in AuditReportPage for inferred-only audits

## Session 3 — Autopilot, Human Verified Badge, OAuth Name
- [ ] AdSpendSlider: restore budget slider starting at $300/month, replace big plan boxes with small tick-box frequency options (3x/week, 5x/week, 7x/week at +$50 each)
- [ ] Add persistent Human Verified badge pinned to corner on every page (AppLayout + public pages)
- [ ] Fix OAuth login screen showing "PromoFlow AI" — change VITE_APP_TITLE to "Blastly"

## Gift Voucher Expiry Configuration (Workspace Settings)
- [ ] Extend workspace_settings table with gift_voucher_expiry_days column (default 365)
- [ ] Apply DB migration for new column
- [ ] tRPC: quickCharge.getVoucherSettings(workspaceId) — return expiry days + other voucher config
- [ ] tRPC: quickCharge.saveVoucherSettings(workspaceId, expiryDays) — update setting (admin only)
- [ ] Wire expiry days into issueGiftVoucher so new vouchers use workspace default
- [ ] Add "Gift Voucher Settings" section to workspace Settings page with expiry picker (3/6/12 months + custom days)
- [ ] Write vitest tests for getVoucherSettings and saveVoucherSettings

## UI Polish — Human Verified Badge & 14-Day Trial Banner
- [ ] Fix Human Verified badge — show "HUMAN VERIFIED" text only once, make it bigger, remove duplicate/old white writing
- [ ] Create shared FreeTrialBanner component — consistent position (top of every page), same colour/font/size on all pages
- [ ] Add FreeTrialBanner to Home page
- [ ] Add FreeTrialBanner to Pricing page
- [ ] Add FreeTrialBanner to Audit page (/audit)
- [ ] Add FreeTrialBanner to Audit Report page
- [ ] Add FreeTrialBanner to all dashboard pages (via DashboardLayout)
- [ ] Add FreeTrialBanner to Terms, Privacy, Contact, and Apps pages

## Homepage Cleanup
- [x] Remove duplicate "I'm ready to try 14 days for free" CTA button from the budget/slider section
- [x] Remove the "80% goes direct to ads / 20% is our management fee" text block under the budget heading (already shown in slider)
- [x] Remove the "5 platforms live in 24 hours / we approve every post / AI written content" box from the budget section

## Onboarding Page 2 (Launch) Rework
- [x] Replace "I'm ready to try 14 days for free" with a Confirm button
- [x] Confirm button generates a Stripe checkout QR code for the selected monthly budget
- [x] Show QR code above the "Live in 24 hours" / trust badges section
- [x] After payment completes, redirect directly to the dashboard (no intermediate step)
- [x] Remove the separate "Go to my dashboard" button at the bottom

## Navigation Default — Command Centre First
- [ ] Set /dashboard/command-centre as the default redirect after login and onboarding
- [ ] Change the top-right "Dashboard" button in DashboardLayout to link to /dashboard/command-centre
- [ ] Change the top-right "Command Centre" label so it reads "Command Centre" (not "Dashboard")

## Command Centre Layout — Quick Post & Client Contact
- [ ] Move Quick Post and Client Contact buttons to the top of the Command Centre, above the message preview cards
- [ ] Make Quick Post and Client Contact buttons large and visually prominent (primary action size)
- [ ] Set /dashboard/home as the default redirect after login and onboarding payment
- [ ] Change the "Full Dashboard" escape hatch label in Command Centre to stay as-is
- [ ] Add a "Command Centre" button in the Dashboard top-right area that links to /dashboard/home

## Lead-to-Booking Flow in Command Centre
- [x] LeadBookingSheet component — bottom sheet with day picker + available time slots
- [x] Available slots query: fetch appointments for selected day filtered by workspace/service
- [x] One-tap booking: pre-fill lead name/phone/email, select slot, confirm booking
- [x] Post-booking: send SMS + email confirmation to the lead automatically
- [x] Wire "Book Appointment" action into lead/message cards in the Command Centre intelligence feed
- [x] Show booked confirmation inline in the card (green tick + time)

## Navigation — Logo & Toggle Button
- [x] Disable logo link to marketing page for logged-in users (make it non-clickable or link to /dashboard/home)
- [x] Add smart toggle button in top-right header: shows "Command Centre" when on Dashboard, shows "Dashboard" when in Command Centre
- [x] Toggle button uses useLocation to detect current route and switch accordingly

## Age Group & Category Fix (Audit/Onboarding AI)
- [x] Find where AI generates the age group field (audit router or onboarding AI analysis)
- [x] Fix AI prompt: only output age group when there is a clear, confident signal — leave blank/null otherwise
- [x] Add Children / Adults two-button category selector at the top of the relevant form/report
- [x] Category selection feeds into AI analysis context so it doesn't guess demographics

## Geographic Reach — Merge Duplicate Selectors
- [x] Remove the duplicate "target radius" km selector from the bottom of the Target Audience section in ManagedOnboarding
- [x] Keep the top four-button Local/State/National/Global selector as the single source of truth
- [x] Map the four-button selection to the locationRadiusKm value automatically (local=10, state=250, national=2000, global=null)

## Business Description — Merge Duplicate Sections
- [ ] Find both "about your business" description fields in ManagedOnboarding step 1
- [ ] Merge into one section: show pre-populated audit text as a read-only callout above a single editable textarea
- [ ] Heading: "Here's what we found — add or correct anything below"
- [ ] If no audit data, just show the editable textarea with a placeholder

## Business Description — Two-Tab Box
- [x] Replace single description textarea with a two-tab box: "Our Summary" (AI audit) + "Your Words" (customer free-text)
- [x] "Our Summary" tab: read-only display of the AI-generated audit description, styled as a polished card
- [x] "Your Words" tab: editable textarea for the customer to add their own thoughts
- [x] On save/continue, silently merge both via AI into a polished final description stored as the workspace description
- [x] Add a tRPC procedure: workspace.mergeDescription(auditSummary, customerWords) → returns polished combined text
- [x] If no audit summary exists, skip the "Our Summary" tab and show only "Your Words"

## Onboarding Step 2 — Badge & Button Fix
- [x] Human Verified badge: "Human" on top, "Verified" on bottom, both in white text inside the circle
- [x] Confirm payment button: smaller size, label changed to "Confirm & Proceed to Payment" (no dollar amount)

## Payment Page UX — One Screen
- [x] Show QR code and "Open payment page" link together immediately after Confirm tap (no two-step reveal)
- [x] Pre-select AUD currency in Stripe checkout session (currency: "aud")
- [x] Pre-fill customer email in Stripe checkout session from logged-in user's email

## Payment Step — Apple Pay / Google Pay Primary
- [x] Replace QR code + confirm button with Stripe Payment Request Button (Apple Pay / Google Pay)
- [x] Show Apple Pay / Google Pay as the primary large button
- [x] "Pay with card instead" secondary button below opens the Stripe checkout URL in a new tab
- [x] Remove QR code, showQr state, and two-step reveal entirely
- [x] Currency pre-set to AUD, email pre-filled from logged-in user

## CTA Flow — Audit-First Gate
- [ ] "Start free trial" / "14-day trial" CTAs scroll to / focus the audit URL input on the homepage instead of going to login/onboarding directly
- [ ] BetaBanner "Start free →" scrolls to audit section for all users
- [ ] Pricing page "Start Free" buttons scroll to audit section
- [ ] After audit completes, the report page shows a prominent "Start your 14-day free trial" CTA that links to /onboarding/managed?audit=TOKEN
- [ ] If user is already logged in when clicking a trial CTA, scroll to audit section so they still run the audit first

## No-Card Onboarding — Payment Step Replacement
- [ ] Replace Step 3 payment/Stripe checkout in ManagedOnboarding with a "You're all set" screen
- [ ] Show promo code FREE14 prominently on the "You're all set" screen
- [ ] Add ad spend slider preview (no payment, just shows how budget works)
- [ ] Clear message: "No credit card required today — you won't be charged until day 14"
- [ ] Day-10 automated reminder email/notification to add payment details
- [ ] Remove Stripe checkout from the onboarding flow entirely

## UX Improvements Batch — May 2026
- [x] Banner button: change "Start free" to "Click here"
- [ ] Banner button: on click scroll to audit input and show animated arrow pointing at input
- [x] Onboarding industry field: allow multi-select (not just one)
- [x] Onboarding industry field: add "Other" option that reveals a free-text input
- [x] Onboarding: restore age range tabs (13-17, 18-25, 26-35, 36-45, 46-55, 55+)
- [x] Onboarding: age range required — cannot advance without selecting at least one
- [x] Onboarding: clear voice-to-text business summary box with obvious click target
- [x] Onboarding: collect email and mobile number fields
- [ ] Payment step: auto-populate FREE14 promo code field
- [x] Payment step: detect currency from business location (AUD default, others by geo)
- [x] Payment step: pre-fill contact email from collected onboarding data
- [x] Day-10 trial reminder: server-side cron job (node-cron) runs daily at 09:00 UTC, finds workspaces on day 10 of trial, sends owner notification with contact email/mobile
- [x] ManagedOnboarding.tsx: fix corrupted handleStep1 validation block (selectedIndustries variable, duplicate lines removed)
- [x] ManagedOnboarding.tsx: remove duplicate age-range UI block and duplicate contact-details block

## Snap to Post — Free Demo Feature
- [ ] Add "Try Snap to Post" CTA button on homepage (below audit input, secondary CTA)
- [ ] Create /snap-demo page (public, no login required)
- [ ] Step 1: Website URL input → runs audit (same as existing audit flow) to capture lead data
- [ ] Step 2: Platform selector — horizontal pill buttons (Facebook, Instagram, TikTok, LinkedIn, X, YouTube)
- [ ] Step 3: Camera capture — large "Take a Snap" button opens device camera (getUserMedia API), shows live preview, tap to capture
- [ ] Step 4: Voice-to-text caption box — large mic button, browser SpeechRecognition API, live transcript shown as user speaks, editable after
- [ ] Step 5: AI caption polish — server-side tRPC procedure snap.polishCaption(imageBase64, rawCaption, platform) → returns platform-optimised caption + 5 hashtags
- [ ] Step 6: Preview screen — shows the captured photo in a platform-styled card (Instagram square, Facebook post, TikTok vertical) with the AI caption and hashtags overlaid
- [ ] Gate: "Post it now" button shows a modal: "Your post is ready — set up your free 14-day trial to publish it" with audit URL pre-filled and a countdown "Your post will be waiting for you"
- [ ] Store the pending snap (image URL via S3, caption, platform) in localStorage so it survives the audit/signup flow and can be posted after onboarding
- [ ] Add snap.polishCaption tRPC procedure (public, rate-limited) in server/routers/snap.ts
- [ ] Register snap router in server/routers.ts
- [ ] Register /snap-demo route in App.tsx
- [ ] Add "Snap to Post" feature card to homepage Features section
- [ ] Vitest tests for snap.polishCaption procedure

## Snap to Post — Real Publish Flow
- [ ] SnapDemo Step 1: website URL input → run audit → extract detected social platform handles
- [ ] SnapDemo Step 2: show detected platforms as pill buttons ("We found these on your website — pick one to post to")
- [ ] SnapDemo Step 3: camera capture (getUserMedia) + photo upload fallback
- [ ] SnapDemo Step 4: voice-to-text caption box (SpeechRecognition API) + manual text fallback
- [ ] SnapDemo Step 5: AI caption polish (snap.polishCaption tRPC, already built)
- [ ] SnapDemo Step 6: "Post it now" → OAuth connect modal for chosen platform → real publish via existing publish router
- [ ] snap.savePendingSnap tRPC procedure: stores image (S3), caption, platform, sessionToken in DB (no auth required)
- [ ] snap.publishPending tRPC procedure: called after OAuth redirect, retrieves pending snap by sessionToken and publishes it
- [ ] Add /snap-demo route to App.tsx (already done)
- [ ] Add "Try Snap to Post" secondary CTA to homepage below audit input (already done)
- [ ] Vitest tests for snap router procedures

## Snap to Post — Real Publish Demo (Completed May 2026)
- [x] pending_snaps DB table created (sessionToken, imageUrl, caption, hashtags, platform, websiteUrl, expiresAt)
- [x] snap.polishCaption — AI polish raw voice caption for specific platform
- [x] snap.savePendingSnap — upload photo to S3, save snap to DB, return sessionToken
- [x] snap.getPendingSnap — retrieve pending snap by sessionToken for post-OAuth resume
- [x] SnapDemo page rewritten: URL → audit → detected platforms picker → camera → voice → AI → save → OAuth gate
- [x] Detected platforms: show only publishable ones (LinkedIn, YouTube, Pinterest, Bluesky)
- [x] Non-publishable platforms (Facebook, Instagram, TikTok, X) shown with explanation note
- [x] Step 6: "Connect [Platform] & Post" redirects to onboarding with snap token
- [x] Homepage "Try Snap to Post — free demo" button already present at /snap-demo

## Snap to Post — Platform Detection Fix (May 202- [x] Remove fallback platform list (linkedin/youtube/pinterest/bluesky) shown when audit finds nothing — was misleading use- [x] If audit finds NO platforms at all: show "nothing connected" screen — warm message + list what we connect in trial + CT- [x] If audit finds platforms but NONE are publishable (only Facebook/Instagram/TikTok/X): show those detected + explain Meta approval + trial CTA- [x] If audit finds publishable platforms: show ONLY those detected platforms as pill buttons with their handle/URL
- [x] Show the detected platform handle alongside each pill so user recognises their own account
- [x] "Nothing connected" screen: friendly tone, no shame, clear next step = start free trial to get connected

## Social Platform Detection Fix (May 2026)
- [ ] Fix audit scraper to detect Facebook and other social links from websites like alkaviva.com.au
- [ ] Support indirect social links (icon links, JS-rendered buttons, footer links)
- [ ] Broaden URL pattern matching: facebook.com/*, fb.com/*, instagram.com/*, linkedin.com/*, etc.
- [ ] Follow meta tags (og:url, twitter:site) for additional social signals
- [ ] Test against alkaviva.com.au to confirm Facebook is detected

## Snap to Post — Security & Ownership (May 2026)
- [ ] Fix fetchPageText to extract href attributes from anchor tags (not just visible text) so CSS icon links are detected
- [ ] The OAuth connect step already proves ownership — user must log into the platform to post, so they can only post to accounts they control
- [ ] Add clear UI explanation: "To post, you'll need to connect your account — this proves it's yours and keeps everyone safe"
- [ ] Snap to Post should never post without a successful OAuth — the platform API rejects unauthorised tokens automatically
- [ ] Add note in SnapDemo: "We only post to accounts you connect and authorise — we can never post to someone else's account"

## Command Centre Navigation
- [x] Rename "Dashboard" nav link on homepage to "Command Centre"
- [x] Command Centre link: if not logged in, redirect to login; if logged in, go to /dashboard
- [x] Add a "Dashboard" button at the top of the Command Centre (/dashboard) page header (already existed as a pill button in the top-right header)
- [ ] FUTURE: Role-based access for Command Centre — allow business owner to grant receptionist/staff access with limited feature set (post scheduling, inbox, calendar — not billing or settings)

## Command Centre as Default Landing
- [x] Post-login redirect: after OAuth login, land on /dashboard/home (Command Centre) not /dashboard/overview
- [x] Onboarding completion redirect: after finishing onboarding, land on /dashboard/home
- [x] "Sign in" button on homepage: redirect to /dashboard/home after login
- [x] "Start free trial" button: after onboarding, land on /dashboard/home

## Onboarding Platform Status Wording Fix (May 2026)
- [ ] Detected platforms (from audit scan) should show as "Detected — tap to connect" with amber indicator, NOT "Connected"
- [ ] Only show "Connected ✓ Ready to post" in green after user has completed OAuth login for that platform
- [ ] Add clear CTA button on each detected-but-not-connected platform card: "Log in to connect →"
- [ ] After OAuth completes and returns to onboarding, the platform card updates to "Connected ✓ Ready to post"

## Target Audience Purple Box + Platform Wording (May 2026)
- [x] Wrap Target Audience section (from header down through contact details) in a purple/violet box to visually group all business-related fields
- [x] Platform section header badge: change "Connected" (green) to "Detected from audit" (amber/Zap icon) when audit data is present but OAuth not done
- [x] Recommended platforms box: change border/bg from emerald to amber, label from "Connected" to "Detected — tap to connect"
- [x] Step 1 subtitle: change "Connected from your audit — just confirm and continue" to "Detected from your audit — tap each platform to confirm"
- [x] TypeScript: 0 errors confirmed

## 4-Stage Locked Sidebar + Exclusive Trial Messaging (May 2026)
- [x] Restructure sidebar into 4 labelled stage groups (Stage 1 active, Stages 2-4 locked/greyed)
- [x] Stage 1 (Get Live): Home, Quick Post, Connect Platforms, Brand Profile, Audit History — fully active with green dot
- [x] Stage 2 (Command Centre): locked, violet, padlock icon, "Unlocks after trial" tooltip on each item
- [x] Stage 3 (Get Found): locked, cyan, padlock icon, "Unlocks after trial" tooltip on each item
- [x] Stage 4 (Get Paid): locked, gold, padlock icon, "Unlocks after trial" tooltip on each item
- [x] Clicking a locked item shows a toast: "Stage X unlocks after your 30-day trial"
- [x] Sidebar header shows "30-day exclusive trial" in green with Rocket icon
- [x] Homepage hero headline updated: "Post to all your social platforms in under 30 seconds"
- [x] Homepage eyebrow: "Exclusive trial — 10 customers only"
- [x] Homepage sub-headline: "Free for 30 days. No credit card. No lock-in. Just results."
- [x] Homepage accent line: "10 founding spots only."
- [x] Homepage CTA footer: "30-day exclusive trial · Includes free audit · No credit card required · 10 spots only"
- [x] BetaBanner updated: "30-day exclusive trial — 10 founding spots only. No credit card required." + "Claim your spot →"
- [x] TypeScript: 0 errors confirmed

## Founding Member Trial Conditions + Feedback Form (May 2026)
- [ ] Add "Founding Member Conditions" section to homepage (post 3x/week + feedback form 2x/week)
- [ ] Build /dashboard/feedback page with structured feedback form (rating, what worked, what didn't, suggestions)
- [ ] Add tRPC procedure to save feedback submissions to database
- [ ] Add "Feedback" item to Stage 1 sidebar
- [ ] Add twice-weekly feedback reminder banner/prompt inside the dashboard
- [ ] Notify owner when new feedback is submitted

## Intelligence Layer Build (May 2026)
- [ ] Enhanced scraping: Google Business Profile data (rating, reviews, themes, photos, hours)
- [x] Enhanced scraping: Top 3 local competitors (hidden from customer)
- [x] Enhanced scraping: Review intelligence (Google, Facebook, Trustpilot themes)
- [x] Enhanced scraping: Current search visibility (local pack, keywords, NAP, duplicates)
- [x] Enhanced scraping: Demand signals (search terms, AI questions, forum themes, seasonal)
- [x] Enhanced scraping: Website health check (mobile, speed, indexation, content)
- [x] Brand Voice extraction from voice summary
- [x] 9-section Client Intelligence Report on summary page
- [x] PDF export for intelligence report
- [x] Shaded intelligence panel on audit page (link from sidebar instead)
- [x] Confidence score displayed on report
- [x] Competitors hidden from customer view (internal only)
- [x] Database schema for intelligence data
- [x] JSON export endpoint for Stage 3 API handoff (exportForStage3)
- [x] Strategy approval mutation (triggers Stage 3 readiness)
- [x] Intelligence Report page added to Stage 1 sidebar
- [x] All fields have clear data labels for Claude API mapping

## Simplified Platform List (May 2026)
- [x] Replace confusing platform badges/asterisks with clean 3-state list
- [x] States: "Set Up" (don't have it), "Connect" (have it, link to Blastly), "Posting" (live)
- [x] Simple list layout — platform name on left, 3 state indicators on right
- [x] Only one state active per row, others greyed out
- [x] Remove all confusing mixed colours and badges

## Platform List Layout Improvements (May 2026)
- [x] Split platform list into 2-column grid (half on each side)
- [x] Add "Recommended by Blastly" highlighted box based on audit results

## Command Centre Button Fix (May 2026)
- [x] Command Centre button in top-right nav should go to login for non-authenticated users (already correct)
- [x] Command Centre button should go to dashboard for logged-in users (already correct)
- [x] Coloured boxes page IS the Command Centre — Intelligence Report tile added prominently

## Make Intelligence Report Prominent (May 2026)
- [x] Add Intelligence Report as a prominent tile on /dashboard/home (coloured boxes page)
- [x] Make it impossible to miss — same visual weight as Quick Post tile

## Rotating Feature Circle (May 2026)
- [x] Add rotating feature circle between hero and How It Works sections
- [x] 6 features, auto-rotate every 3 seconds, click-to-jump
- [x] Mobile: horizontal swipe carousel
- [x] Gold accent for active feature, distinct icon colours
- [x] Closing line + Start Free Audit CTA below

## Audit Report Restoration (May 2026)
- [x] Restore full audit score breakdown on AuditReportPage — 8 category score bars (Social Media Presence, Content Quality, Visual Quality, Copy Effectiveness, Brand Consistency, Engagement Rate, Ad Performance, Audience Growth), Cybersecurity bar row, Per-Platform Scores section, Competitive Position section, Key Findings section (expandable), Recommendations section (expandable), Ad Performance Analysis section

## client_monthly_stats Feature (May 2026)
- [x] Create client_monthly_stats table with all fields: id, workspaceId, month, blogsPublished, socialPostsPublished, peopleReached, callsHandled, appointmentsBooked, newEnquiries, aiCitations, hoursSaved, activeFeatures (JSON), createdAt, updatedAt
- [x] Unique constraint on (workspaceId, month) for row-level isolation
- [x] incrementMonthlyStat() db helper with ON DUPLICATE KEY UPDATE and auto-calculated hoursSaved formula
- [x] setMonthlyPeopleReached() db helper for absolute value sync
- [x] setMonthlyActiveFeatures() db helper for per-client feature gating
- [x] getMonthlyStats() db helper returning zeroed defaults if no row exists
- [x] monthlyStats tRPC router (getMyStats procedure with workspaceId input)
- [x] Auto-increment hook in appointments.ts (create, createPortalBooking, bookFromLead)
- [x] Auto-increment hook in contacts.ts (create — newEnquiries)
- [x] Auto-increment hook in workspace.ts (publishViaAyrshare — socialPostsPublished, only when not scheduled)
- [x] Command Centre monthly activity widget with 8 stat cards, feature-gating via activeFeatures, 60s polling
- [x] 13 unit tests for currentMonth(), field validation, hoursSaved formula, activeFeatures parsing (all passing)
- [x] Full DB schema exported to schema-exports/schema_2026-05-19.sql (73 tables) and /home/ubuntu/blastly_schema_2026-05-19.sql

## Social Connections Fix (May 2026)
- [x] Add ageGroup and businessSector fields to workspace_preferences table and schema
- [x] Add getPreferences / upsertPreferences tRPC procedures for ageGroup + businessSector
- [x] Add age group selector (button group: Children, Teens, Adults, Seniors, All Ages) to Connections page
- [x] Add business sector selector (button group: Retail, Hospitality, Health, Beauty, Trades, Professional Services, Food & Beverage, Education, Other) to Connections page
- [x] Fix social platform connect flow: show a proper "Connect / Sign Up" modal that opens the platform signup URL in a new tab, then shows a "Mark as Connected" confirmation step that calls the backend to record the connection
- [x] For platforms with real OAuth (LinkedIn, YouTube, Pinterest): show modal explaining the flow, then redirect to OAuth; display clear error if API keys not configured
- [x] For Bluesky: keep existing app-password dialog (already works)
- [x] For coming-soon platforms: show modal with signup link + "I've created my account" button to mark as pending/connected
- [ ] Add secrets for LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, PINTEREST_APP_ID, PINTEREST_APP_SECRET

## Pricing System Overhaul (May 2026)
- [x] Update server/products.ts — two plans only: Snap & Post (free) and Everything (AU$75/week), remove all others
- [x] Add Animated Aria add-on as coming-soon entry (no Stripe price, display only)
- [x] Rewrite public Pricing page: two plan cards + greyed-out Animated Aria add-on
- [x] Show AU$75/week everywhere — no monthly pricing
- [x] Free plan: no credit card required, 3 posts/week limit
- [x] Everything plan: 14-day free trial, cancel anytime, card charged after trial
- [x] Upgrade prompt component: "Aria would have caught that. Upgrade to AU$75/week and never miss an enquiry again." with "Start My Free Trial" button
- [x] Trigger upgrade prompt inside free dashboard when user hits a locked feature or misses an enquiry
- [x] Update subscription gating: free plan capped at 3 posts/week
- [x] Remove all references to old plans from the codebase (legacy values kept for DB compat only)

## Theme / Dark-Light Mode Fix (May 20 2026)
- [x] Diagnose why dark/light mode toggle does not apply across pages
- [x] Fix ThemeProvider so theme change persists and applies globally to all pages
- [x] Ensure dashboard pages respect the active theme (no hardcoded colours overriding CSS vars)

## Homepage Restructure (May 2026)
- [x] Remove standalone "Start Free Trial" button and "Free for 30 days / no credit card" text from hero
- [x] Move rolling circles (CinemaRingSection) above pricing cards
- [x] Add "Watch it in action" button inside Snap & Post card (opens 30-sec video modal)
- [x] Add "Watch it in action" button inside Everything card (opens 60-sec video modal)
- [x] Remove standalone video section from between pricing and footer
- [x] Remove stats/social proof bar (add back later once real data available)

## Future: Social Proof Stats Section (Homepage)
- [ ] Add stats bar once real data is available: total customers, posts published per day, reviews monitored, avg response time
- [ ] Leave placeholder commented out in code so it's easy to enable later
