import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import AdSpendSlider from "@/components/AdSpendSlider";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, ChevronRight, Upload, Globe,
  ArrowRight, Loader2, Check, Star, X, Wand2, Wrench, Zap,
} from "lucide-react";

// ─── Industry → recommended platforms mapping ────────────────────────────────
const INDUSTRY_PLATFORM_RECOMMENDATIONS: Record<string, { recommended: string[]; reason: string }> = {
  "Technology":           { recommended: ["linkedin", "twitter", "youtube", "instagram", "facebook"], reason: "Tech audiences are highly active on LinkedIn for B2B and YouTube for tutorials & demos." },
  "Education":            { recommended: ["youtube", "instagram", "facebook", "tiktok", "linkedin"],  reason: "Educational content performs best on YouTube and TikTok — video drives enrolments." },
  "Health & Wellness":    { recommended: ["instagram", "tiktok", "facebook", "youtube", "pinterest"], reason: "Visual transformation content thrives on Instagram, TikTok, and Pinterest." },
  "Finance":              { recommended: ["linkedin", "twitter", "youtube", "facebook", "instagram"], reason: "Finance audiences trust LinkedIn and Twitter for credibility and thought leadership." },
  "Retail":               { recommended: ["instagram", "facebook", "pinterest", "tiktok", "gmb"],     reason: "Retail brands need visual platforms — Instagram, Pinterest, and Google Business drive sales." },
  "Food & Beverage":      { recommended: ["instagram", "facebook", "tiktok", "gmb", "pinterest"],    reason: "Food is one of the most visual niches — Instagram and TikTok drive massive discovery." },
  "Travel":               { recommended: ["instagram", "youtube", "tiktok", "pinterest", "facebook"], reason: "Travel inspiration lives on Instagram, YouTube, and Pinterest." },
  "Entertainment":        { recommended: ["tiktok", "instagram", "youtube", "twitter", "facebook"],  reason: "Entertainment content needs TikTok and YouTube for viral reach." },
  "Real Estate":          { recommended: ["facebook", "instagram", "youtube", "linkedin", "gmb"],    reason: "Real estate buyers research on Facebook and Google — video walkthroughs convert well." },
  "Professional Services":{ recommended: ["linkedin", "facebook", "twitter", "youtube", "gmb"],      reason: "B2B professional services win on LinkedIn — thought leadership builds trust." },
  "Beauty & Fashion":     { recommended: ["instagram", "tiktok", "pinterest", "youtube", "facebook"], reason: "Beauty and fashion are visual-first — Instagram Reels and TikTok drive discovery." },
  "Fitness":              { recommended: ["instagram", "tiktok", "youtube", "facebook", "pinterest"], reason: "Fitness transformation content goes viral on TikTok and Instagram." },
  "Home & Garden":        { recommended: ["pinterest", "instagram", "facebook", "youtube", "tiktok"], reason: "Pinterest is the #1 platform for home inspiration." },
  "Automotive":           { recommended: ["youtube", "instagram", "facebook", "tiktok", "twitter"],  reason: "Car buyers research on YouTube — reviews and walkarounds drive decisions." },
  "Other":                { recommended: ["facebook", "instagram", "linkedin", "youtube", "tiktok"], reason: "These five platforms cover the broadest audience reach for most business types." },
};

// ─── Platform data ────────────────────────────────────────────────────────────
const ALL_PLATFORMS = [
  { id: "facebook",   name: "Facebook",        color: "#1877F2", icon: "f" },
  { id: "instagram",  name: "Instagram",       color: "#E4405F", icon: "📸" },
  { id: "tiktok",     name: "TikTok",          color: "#010101", icon: "🎵", videoOnly: true },
  { id: "twitter",    name: "Twitter / X",     color: "#000000", icon: "𝕏" },
  { id: "linkedin",   name: "LinkedIn",        color: "#0A66C2", icon: "in" },
  { id: "pinterest",  name: "Pinterest",       color: "#E60023", icon: "P" },
  { id: "youtube",    name: "YouTube",         color: "#FF0000", icon: "▶" },
  { id: "bluesky",    name: "Bluesky",         color: "#0085FF", icon: "🦋" },
  { id: "reddit",     name: "Reddit",          color: "#FF4500", icon: "👽" },
  { id: "threads",    name: "Threads",         color: "#000000", icon: "@" },
  { id: "snapchat",   name: "Snapchat",        color: "#FFFC00", icon: "👻" },
  { id: "telegram",   name: "Telegram",        color: "#26A5E4", icon: "✈" },
  { id: "gmb",        name: "Google Business", color: "#4285F4", icon: "G" },
  { id: "website",    name: "Your Website",    color: "#10B981", icon: "🌐" },
];

const INDUSTRY_OPTIONS = [
  "Technology", "Education", "Health & Wellness", "Finance", "Retail",
  "Food & Beverage", "Travel", "Entertainment", "Real Estate", "Professional Services",
  "Beauty & Fashion", "Fitness", "Home & Garden", "Automotive", "Other",
];

const SETUP_FEE_PER_PLATFORM = 25;

// Map audit industry strings to our INDUSTRY_OPTIONS
function normaliseIndustry(raw: string | null | undefined): string {
  if (!raw) return "";
  const lower = raw.toLowerCase();
  for (const opt of INDUSTRY_OPTIONS) {
    if (lower.includes(opt.toLowerCase()) || opt.toLowerCase().includes(lower)) return opt;
  }
  return "Other";
}

// Derive pre-selected platforms from audit platformScores
function platformsFromAudit(platformScores: Record<string, unknown> | null | undefined): string[] {
  if (!platformScores) return ["facebook", "instagram", "linkedin"];
  return Object.keys(platformScores).filter((p) => ALL_PLATFORMS.some((ap) => ap.id === p));
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  const steps = ["Your Business", "Launch"];
  return (
    <div className="flex items-center justify-center gap-3 mb-10">
      {steps.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={step} className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                done ? "bg-emerald-500 text-white" :
                active ? "bg-blue-500 text-white ring-4 ring-blue-500/30" :
                "bg-white/10 text-white/40"
              }`}>
                {done ? <Check className="w-4 h-4" /> : step}
              </div>
              <span className={`text-xs font-medium ${active ? "text-white" : done ? "text-emerald-400" : "text-white/40"}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-16 h-0.5 mb-5 ${done ? "bg-emerald-500" : "bg-white/10"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Platform card ────────────────────────────────────────────────────────────
// States: unselected → selected+owned → selected+needsSetup (cycle on click)
// Visual: grey = off, green tick = "I have it", blue wrench = "Set up for me"
type PlatformState = "off" | "owned" | "setup";

interface PlatformCardProps {
  platform: typeof ALL_PLATFORMS[number];
  state: PlatformState;
  isRecommended?: boolean;
  onChange: (id: string, next: PlatformState) => void;
}

function PlatformCard({ platform, state, isRecommended, onChange }: PlatformCardProps) {
  function cycle() {
    // off → owned → setup → off
    const next: PlatformState = state === "off" ? "owned" : state === "owned" ? "setup" : "off";
    onChange(platform.id, next);
  }

  const borderClass =
    state === "owned" ? "border-emerald-500 bg-emerald-500/10" :
    state === "setup"  ? "border-blue-500 bg-blue-500/10" :
    "border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20";

  return (
    <button
      type="button"
      onClick={cycle}
      className={`relative p-3 rounded-xl border-2 transition-all text-left w-full ${borderClass}`}
    >
      {/* Platform icon + name */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ backgroundColor: platform.color }}
        >
          {platform.icon}
        </div>
        <div className="min-w-0 flex-1">
          <span className={`text-xs font-semibold block truncate ${state !== "off" ? "text-white" : "text-white/60"}`}>
            {platform.name}
          </span>
          {isRecommended && state === "off" && (
            <span className="text-[10px] text-blue-400">Recommended</span>
          )}
          {'videoOnly' in platform && platform.videoOnly && (
            <span className="text-[10px] text-amber-400">Video only</span>
          )}
        </div>
      </div>

      {/* Status pill — only shown when selected */}
      {state !== "off" && (
        <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 w-fit text-[10px] font-semibold ${
          state === "owned"
            ? "bg-emerald-500/20 text-emerald-300"
            : "bg-blue-500/20 text-blue-300"
        }`}>
          {state === "owned"
            ? <><Check className="w-2.5 h-2.5" /> Connected</>
            : <><Wrench className="w-2.5 h-2.5" /> Set up for me</>
          }
        </div>
      )}

      {/* Corner indicator */}
      {state !== "off" && (
        <div className={`absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center ${
          state === "owned" ? "bg-emerald-500" : "bg-blue-500"
        }`}>
          {state === "owned"
            ? <Check className="w-2.5 h-2.5 text-white" />
            : <Wrench className="w-2.5 h-2.5 text-white" />
          }
        </div>
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ManagedOnboarding() {
  const [, navigate] = useLocation();
  // NOTE: wouter's useLocation() strips the query string — must use window.location.search
  const params = new URLSearchParams(window.location.search);
  const paymentSuccess = params.get("payment_success") === "1";
  const auditToken = params.get("audit") ?? "";
  const initialStep = paymentSuccess ? 2 : 1;

  const [step, setStep] = useState(initialStep);
  const [workspaceId, setWorkspaceId] = useState<number | null>(
    params.get("workspace") ? parseInt(params.get("workspace")!) : null
  );

  // ── Business fields ──────────────────────────────────────────────────────────
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState(""); // kept for backward-compat with createBrand
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [otherIndustry, setOtherIndustry] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMobile, setContactMobile] = useState("");
  const [description, setDescription] = useState(""); // AI/audit-generated summary
  const [customerWords, setCustomerWords] = useState(""); // Customer's own words
  const [descriptionTab, setDescriptionTab] = useState<"ours" | "yours">("ours");
  const [geographicReach, setGeographicReach] = useState<"local" | "state" | "national" | "international">("local");
  const [prefilled, setPrefilled] = useState(false);
  // ── Extended profile fields (pre-filled from audit) ──────────────────────────
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [tagline, setTagline] = useState("");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationState, setLocationState] = useState("");
  const [locationCountry, setLocationCountry] = useState("");

  // ── Logo ─────────────────────────────────────────────────────────────────────
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Audit-recommended platform IDs (from the AI audit, not the industry lookup) ──
  const [auditRecommendedIds, setAuditRecommendedIds] = useState<string[]>([]);

  // ── Target audience (pre-filled from audit, editable by client) ──────────────
  const ALL_AGE_RANGES = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
  const ALL_INTERESTS = [
    "Food & Dining", "Health & Fitness", "Fashion & Beauty", "Home & Garden",
    "Technology", "Business & Finance", "Travel", "Entertainment",
    "Sports", "Parenting & Family", "Automotive", "Real Estate",
    "Education", "Arts & Culture", "Pets", "Outdoors & Nature",
  ];
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<string[]>([]);
  const [audienceCategory, setAudienceCategory] = useState<"children" | "adults" | null>(null);
  const [genderSkew, setGenderSkew] = useState<"male-skewed" | "female-skewed" | "balanced">("balanced");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [locationRadiusKm, setLocationRadiusKm] = useState<number | null>(10);
  const [audiencePrefilled, setAudiencePrefilled] = useState(false);
  const [audienceNotes, setAudienceNotes] = useState("");
  // ── Platform statess ───────────────────────────────────────────────────────────
  // Map of platformId → PlatformState
  const [platformStates, setPlatformStates] = useState<Record<string, PlatformState>>(() => {
    const init: Record<string, PlatformState> = {};
    for (const p of ALL_PLATFORMS) init[p.id] = "off";
    // Default selections
    ["facebook", "instagram", "linkedin"].forEach((id) => { init[id] = "owned"; });
    return init;
  });

  // Derived: which platforms are selected (owned or setup)
  const selectedPlatforms = ALL_PLATFORMS.filter((p) => platformStates[p.id] !== "off").map((p) => p.id);
  // Derived: which need setup
  const setupPlatforms = ALL_PLATFORMS.filter((p) => platformStates[p.id] === "setup");
  const setupFeeTotal = setupPlatforms.length * SETUP_FEE_PER_PLATFORM;

  // ── Fetch audit data to pre-fill ──────────────────────────────────────────────
  const { data: auditReport } = trpc.audit.getReport.useQuery(
    { shareToken: auditToken },
    { enabled: !!auditToken && !prefilled }
  );

  useEffect(() => {
    if (auditReport && !prefilled) {
      setBusinessName(auditReport.businessName ?? "");
      setWebsite(auditReport.website ?? "");
      const normIndustry = normaliseIndustry(auditReport.industry);
      setIndustry(normIndustry);
      if (normIndustry) setSelectedIndustries([normIndustry]);

      // Use the new AI-extracted description first, fall back to audit summary
      const raw = auditReport.rawReport as Record<string, unknown> | null;
      const extractedDesc = (auditReport as Record<string, unknown>).description as string | undefined
        ?? raw?.businessDescription as string | undefined;
      const auditSummary = raw?.summary as string | undefined;
      if (extractedDesc) setDescription(extractedDesc);
      else if (auditSummary) setDescription(auditSummary.slice(0, 300));

      // ── Platform states: use audit recommendedPlatforms as the single source of truth ──
      // Priority: audit AI recommendedPlatforms > detectedHandles > platformScores > industry fallback
      const auditRecommended = (auditReport as Record<string, unknown>).recommendedPlatforms as string[] | null
        ?? (raw?.recommendedPlatforms as string[] | null);

      const detectedHandles = (auditReport as Record<string, unknown>).detectedHandles as Record<string, string | null> | null
        ?? raw?.detectedHandles as Record<string, string | null> | null;
      const detectedIds = new Set<string>(
        Object.entries(detectedHandles ?? {}).filter(([, v]) => v).map(([k]) => k)
      );

      const scoredPlatforms = platformsFromAudit(auditReport.platformScores as Record<string, unknown> | null);

      // Fallback if nothing detected
      const fallback = normIndustry
        ? (INDUSTRY_PLATFORM_RECOMMENDATIONS[normIndustry] ?? INDUSTRY_PLATFORM_RECOMMENDATIONS["Other"]).recommended.slice(0, 5)
        : ["facebook", "instagram", "linkedin"];

      // Platforms the business already owns (detected or scored)
      const ownedIds = detectedIds.size > 0
        ? detectedIds
        : new Set(scoredPlatforms.length > 0 ? scoredPlatforms : fallback);

      // Store audit-recommended platform IDs so the UI can show them in the green section
      if (auditRecommended && auditRecommended.length > 0) {
        setAuditRecommendedIds(auditRecommended);
      }

      setPlatformStates((prev) => {
        const next = { ...prev };
        for (const id of Object.keys(next)) next[id] = "off";
        // Mark platforms the business already has as "owned"
        for (const id of Array.from(ownedIds)) {
          if (next[id] !== undefined) next[id] = "owned";
        }
        return next;
      });

      // Pre-fill geographic reach from audit
      const rawReach = (auditReport as Record<string, unknown>).geographicReach as string | undefined
        ?? raw?.geographicReach as string | undefined;
      const validReach = ["local", "state", "national", "international"];
      if (rawReach && validReach.includes(rawReach)) {
        setGeographicReach(rawReach as "local" | "state" | "national" | "international");
      }

      // Pre-fill target audience from audit
      const auditTargetAudience = (auditReport as Record<string, unknown>).targetAudience as Record<string, unknown> | null
        ?? raw?.targetAudience as Record<string, unknown> | null;
      if (auditTargetAudience && !audiencePrefilled) {
        const ageRanges = auditTargetAudience.ageRanges as string[] | null;
        if (ageRanges && ageRanges.length > 0) setSelectedAgeRanges(ageRanges);
        const gender = auditTargetAudience.genderSkew as string | null;
        if (gender && ["male-skewed", "female-skewed", "balanced"].includes(gender)) {
          setGenderSkew(gender as "male-skewed" | "female-skewed" | "balanced");
        }
        const interests = auditTargetAudience.interests as string[] | null;
        if (interests && interests.length > 0) {
          // Map audit interests to our predefined list where possible
          const matched = interests.filter((i: string) =>
            ALL_INTERESTS.some((a) => a.toLowerCase().includes(i.toLowerCase()) || i.toLowerCase().includes(a.toLowerCase()))
          );
          if (matched.length > 0) setSelectedInterests(matched.slice(0, 6));
        }
        const radius = auditTargetAudience.locationRadiusKm as number | null;
        if (radius !== undefined) setLocationRadiusKm(radius);
        setAudiencePrefilled(true);
      }

      // Pre-fill extended profile fields from audit
      const auditPhone = (auditReport as Record<string, unknown>).phone as string | null ?? raw?.phone as string | null;
      const auditAddress = (auditReport as Record<string, unknown>).address as string | null ?? raw?.address as string | null;
      const auditTagline = (auditReport as Record<string, unknown>).tagline as string | null ?? raw?.tagline as string | null;
      const auditGoogleReviewUrl = (auditReport as Record<string, unknown>).googleReviewUrl as string | null ?? raw?.googleReviewUrl as string | null;
      const auditLocationCity = (auditReport as Record<string, unknown>).locationCity as string | null ?? raw?.locationCity as string | null;
      const auditLocationState = (auditReport as Record<string, unknown>).locationState as string | null ?? raw?.locationState as string | null;
      const auditLocationCountry = (auditReport as Record<string, unknown>).locationCountry as string | null ?? raw?.locationCountry as string | null;
      if (auditPhone) setPhone(auditPhone);
      if (auditAddress) setAddress(auditAddress);
      if (auditTagline) setTagline(auditTagline);
      if (auditGoogleReviewUrl) setGoogleReviewUrl(auditGoogleReviewUrl);
      if (auditLocationCity) setLocationCity(auditLocationCity);
      if (auditLocationState) setLocationState(auditLocationState);
      if (auditLocationCountry) setLocationCountry(auditLocationCountry);

      setPrefilled(true);
    }
  }, [auditReport, prefilled]);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createBrand = trpc.workspace.createBrand.useMutation();
  const updateBrandProfile = trpc.workspace.updateBrandProfile.useMutation();
  const mergeDescription = trpc.workspace.mergeDescription.useMutation();
  const startOnboarding = trpc.workspace.startManagedOnboarding.useMutation();
  const completeOnboarding = trpc.workspace.completeOnboarding.useMutation();
  const createOnboardingCheckout = trpc.wallet.createOnboardingCheckout.useMutation();

  // ── Budget + QR state ─────────────────────────────────────────────────────────
   const [selectedBudgetAud, setSelectedBudgetAud] = useState(300);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  async function handleConfirmBudget() {
    if (!workspaceId) { toast.error("Workspace not ready — please go back and try again."); return; }
    try {
      // Derive currency from business location country
      const countryCurrencyMap: Record<string, string> = {
        "Australia": "aud", "United States": "usd", "United Kingdom": "gbp",
        "Canada": "cad", "New Zealand": "nzd", "Singapore": "sgd",
        "European Union": "eur", "Germany": "eur", "France": "eur",
        "Netherlands": "eur", "Spain": "eur", "Italy": "eur",
        "India": "inr", "Japan": "jpy", "South Africa": "zar",
      };
      const detectedCurrency = locationCountry ? (countryCurrencyMap[locationCountry] ?? "aud") : "aud";
      const result = await createOnboardingCheckout.mutateAsync({
        workspaceId,
        monthlyBudgetAud: selectedBudgetAud,
        selectedPlatforms,
        currency: detectedCurrency,
        ...(contactEmail ? { contactEmail } : {}),
      });
      setCheckoutUrl(result.checkoutUrl);
      // Open immediately in new tab
      window.open(result.checkoutUrl, "_blank");
    } catch {
      toast.error("Could not create checkout — please try again.");
    }
  }

  // ── Logo handling ─────────────────────────────────────────────────────────────
  const processLogoFile = useCallback((file: File) => {
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo too large — max 2MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please upload a PNG, JPG, or SVG"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setLogoPreview(result);
      setLogoBase64(result.split(",")[1]);
      setLogoFileName(file.name);
    };
    reader.readAsDataURL(file);
  }, []);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processLogoFile(file);
    e.target.value = "";
  }

  function handleLogoDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processLogoFile(file);
  }

  // ── Platform state change ─────────────────────────────────────────────────────
  function handlePlatformChange(id: string, next: PlatformState) {
    setPlatformStates((prev) => ({ ...prev, [id]: next }));
  }

  // ── Step 1 submit ─────────────────────────────────────────────────────────────
  async function handleStep1() {
    if (!businessName.trim()) { toast.error("Please enter your business name"); return; }
    if (selectedIndustries.length === 0) { toast.error("Please select at least one industry"); return; }
    if (selectedAgeRanges.length === 0) { toast.error("Please select at least one age range for your target audience — this helps us tailor your content"); return; }
    if (selectedPlatforms.length === 0) { toast.error("Please select at least one platform"); return; }
    // Sync single-industry field for backward compat
    const primaryIndustry = selectedIndustries[0] ?? "";
    setIndustry(primaryIndustry);
    try {
      // Silently merge AI summary + customer words into a polished description
      let finalDescription = description || undefined;
      if (description || customerWords) {
        try {
          const merged = await mergeDescription.mutateAsync({
            auditSummary: description || undefined,
            customerWords: customerWords || undefined,
          });
          if (merged.polished) finalDescription = merged.polished;
        } catch {
          // Non-fatal — fall back to the audit description
        }
      }
      const ws = await createBrand.mutateAsync({
        name: businessName,
        website: website || undefined,
        industry: selectedIndustries[0] ?? industry,
        description: finalDescription,
      });
      if (!ws) throw new Error("Failed to create brand");
      setWorkspaceId(ws.id);
      // Always save extended profile fields (from audit pre-fill or manual entry)
      await updateBrandProfile.mutateAsync({
        id: ws.id,
        ...(logoBase64 && logoFileName ? { logoBase64, logoFileName } : {}),
        ...(tagline ? { tagline } : {}),
        ...(phone ? { phone } : {}),
        ...(address ? { address } : {}),
        ...(googleReviewUrl ? { googleReviewUrl } : {}),
        ...(geographicReach ? { geographicReach } : {}),
        ...(locationCity ? { locationCity } : {}),
        ...(locationState ? { locationState } : {}),
        ...(locationCountry ? { locationCountry } : {}),
        industries: selectedIndustries,
        ...(otherIndustry ? { otherIndustry } : {}),
        ageRanges: selectedAgeRanges,
        ...(contactEmail ? { contactEmail } : {}),
        ...(contactMobile ? { contactMobile } : {}),
      });
      await startOnboarding.mutateAsync({
        workspaceId: ws.id,
        brandName: businessName,
        selectedPlatforms,
      });
      setStep(2);
      window.scrollTo(0, 0);
    } catch (e: unknown) {
      toast.error((e as Error).message || "Something went wrong — please try again");
    }
  }

  const isSubmitting = createBrand.isPending || updateBrandProfile.isPending || startOnboarding.isPending;

  // ── Step 2 submit ─────────────────────────────────────────────────────────────
  async function handleLaunch() {
    if (!workspaceId) return;
    await completeOnboarding.mutateAsync({ workspaceId, selectedPlatforms });
    navigate("/dashboard/home");
  }

  // ── Derived: recommended platforms ────────────────────────────────────────────
  // Use audit AI recommendations if available; fall back to industry lookup
  const rec = INDUSTRY_PLATFORM_RECOMMENDATIONS[industry] ?? INDUSTRY_PLATFORM_RECOMMENDATIONS["Other"];
  const industryRecommendedIds = industry ? rec.recommended : [];
  const effectiveRecommendedIds = auditRecommendedIds.length > 0 ? auditRecommendedIds : industryRecommendedIds;
  const recommendedPlatforms = ALL_PLATFORMS.filter((p) => effectiveRecommendedIds.includes(p.id));
  const otherPlatforms = ALL_PLATFORMS.filter((p) => !effectiveRecommendedIds.includes(p.id));

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[oklch(0.13_0.02_240)] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/manus-storage/blastly-icon-512_d2809e7c.png"
            alt="Blastly"
            className="h-9 w-9 rounded-xl object-cover"
          />
          <span className="font-semibold text-white">Blastly</span>
        </div>
        <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-xs">
          2-minute setup
        </Badge>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <StepIndicator current={step} />

        {/* ══ STEP 1: Your Business ══════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold">
                {prefilled ? "Does this look right?" : "Tell us about your business"}
              </h1>
              {prefilled ? (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-4 py-1.5">
                    <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs text-emerald-300 font-medium">
                      Detected from your audit — tap each platform to confirm
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-white/60">We'll set up your social media presence and start creating content for you</p>
              )}
            </div>

            {/* Business basics */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-white/80">Business Name *</Label>
                  <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                    Please confirm this is correct
                  </span>
                </div>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Genius Jungle"
                  className={`h-12 text-white placeholder:text-white/30 transition-all ${
                    prefilled && businessName
                      ? "bg-emerald-500/10 border-emerald-500/60 ring-2 ring-emerald-500/30 focus:ring-emerald-500/60"
                      : "bg-white/5 border-white/60 ring-2 ring-white/40 focus:ring-white/80"
                  }`}
                  autoFocus
                />
              </div>

              <div>
                <Label className="text-white/80 mb-2 block">Website</Label>
                <div className="relative">
                  <Globe className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    prefilled && website ? "text-emerald-400" : "text-white/30"
                  }`} />
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="yourwebsite.com"
                    className={`h-12 pl-10 text-white placeholder:text-white/30 transition-all ${
                      prefilled && website
                        ? "bg-emerald-500/10 border-emerald-500/60 ring-1 ring-emerald-500/30"
                        : "bg-white/5 border-white/10"
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-white/80">Industry * <span className="text-white/40 font-normal text-xs">(select all that apply)</span></Label>
                  {prefilled && selectedIndustries.length > 0 && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Detected from audit
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {INDUSTRY_OPTIONS.filter(ind => ind !== "Other").map((ind) => {
                    const isSelected = selectedIndustries.includes(ind);
                    return (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => {
                          setSelectedIndustries(prev => isSelected ? prev.filter(i => i !== ind) : [...prev, ind]);
                          setIndustry(isSelected ? (selectedIndustries.filter(i => i !== ind)[0] ?? "") : ind);
                        }}
                        className={`px-3 py-2 rounded-lg text-sm text-left transition-all border font-medium ${
                          isSelected && prefilled
                            ? "bg-emerald-500/20 text-emerald-100 border-emerald-500/60 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500/40"
                            : isSelected
                            ? "bg-white text-gray-900 border-white shadow-lg shadow-white/20"
                            : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80"
                        }`}
                      >
                        {ind}
                      </button>
                    );
                  })}
                  {/* Other option */}
                  <button
                    type="button"
                    onClick={() => {
                      const isSelected = selectedIndustries.includes("Other");
                      setSelectedIndustries(prev => isSelected ? prev.filter(i => i !== "Other") : [...prev, "Other"]);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm text-left transition-all border font-medium ${
                      selectedIndustries.includes("Other")
                        ? "bg-white text-gray-900 border-white shadow-lg shadow-white/20"
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80"
                    }`}
                  >
                    Other
                  </button>
                </div>
                {selectedIndustries.includes("Other") && (
                  <div className="mt-2">
                    <Input
                      value={otherIndustry}
                      onChange={(e) => setOtherIndustry(e.target.value)}
                      placeholder="Type your industry here..."
                      className="h-10 text-white placeholder:text-white/30 bg-white/5 border-white/20 focus:border-violet-500/60"
                    />
                    <p className="text-[11px] text-white/40 mt-1">Your suggestion may be added as a standard option in future.</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-white/80 block">About your business</Label>
                {description && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <p className="text-[11px] text-emerald-400 font-semibold uppercase tracking-widest mb-1">Our AI summary (from your audit)</p>
                    <p className="text-sm text-white/70 leading-relaxed">{description}</p>
                  </div>
                )}
                {/* Voice-to-text box */}
                <div className="rounded-xl border-2 border-violet-500/50 bg-gradient-to-br from-violet-500/10 to-violet-500/5 p-5 shadow-lg shadow-violet-500/10">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center shrink-0 text-xl">
                      🎤
                    </div>
                    <div>
                      <p className="text-base font-bold text-white leading-tight">Tell us about your business in your own words</p>
                      <p className="text-xs text-violet-300/80 mt-0.5">📱 Tap this box and use your phone&apos;s <strong>voice-to-text</strong> button to speak naturally — or just type. Our AI will tidy it up.</p>
                    </div>
                  </div>
                  <Textarea
                    value={customerWords}
                    onChange={(e) => setCustomerWords(e.target.value)}
                    placeholder="Click here to speak — summarise your business in your own words. What do you do, who do you help, and what makes you different? Our AI will tidy this up along with your audit summary."
                    rows={5}
                    className="text-white placeholder:text-white/40 min-h-[120px] bg-white/5 border-violet-500/30 focus:border-violet-400 focus:ring-1 focus:ring-violet-400/40 resize-none text-sm leading-relaxed"
                  />
                  <p className="text-[11px] text-violet-300/60 mt-2.5 flex items-center gap-1">
                    <span>✨</span>
                    <span>Our AI will combine your words with the audit summary to create polished, on-brand content.</span>
                  </p>
                </div>
              </div>

              {/* Geographic reach */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-white/80">Where do you serve customers?</Label>
                  {prefilled && (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Detected from audit
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {([
                    { id: "local", label: "Local", sub: "City / suburb", icon: "📍" },
                    { id: "state", label: "State", sub: "State-wide", icon: "🗺️" },
                    { id: "national", label: "National", sub: "Country-wide", icon: "🌏" },
                    { id: "international", label: "Global", sub: "Worldwide", icon: "🌐" },
                  ] as const).map(({ id, label, sub, icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setGeographicReach(id);
                        // Keep locationRadiusKm in sync — no separate selector needed
                        const radiusMap = { local: 10, state: 250, national: 2000, international: null } as const;
                        setLocationRadiusKm(radiusMap[id]);
                      }}
                      className={`px-3 py-2.5 rounded-xl text-sm text-center transition-all border font-medium flex flex-col items-center gap-0.5 ${
                        geographicReach === id && prefilled
                          ? "bg-emerald-500/20 text-emerald-100 border-emerald-500/60 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500/40"
                          : geographicReach === id
                          ? "bg-white text-gray-900 border-white shadow-lg shadow-white/20"
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80"
                      }`}
                    >
                      <span className="text-base">{icon}</span>
                      <span className="font-bold text-xs">{label}</span>
                      <span className="text-[9px] opacity-70">{sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Target Audience ──────────────────────────────────────────── */}
            <div className="space-y-5 rounded-2xl border border-violet-500/40 bg-violet-500/8 p-5 shadow-lg shadow-violet-500/10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white/90">Target Audience</h3>
                {audiencePrefilled && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Detected from audit
                  </span>
                )}
              </div>

              {/* Gender skew */}
              <div>
                <Label className="text-white/70 text-xs uppercase tracking-widest mb-2 block">Gender skew</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["male-skewed", "balanced", "female-skewed"] as const).map((g) => {
                    const labels = { "male-skewed": "Male-skewed", "balanced": "Balanced", "female-skewed": "Female-skewed" };
                    const icons = { "male-skewed": "👨", "balanced": "👥", "female-skewed": "👩" };
                    const isSelected = genderSkew === g;
                    const isAudit = audiencePrefilled && isSelected;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGenderSkew(g)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all flex flex-col items-center gap-0.5 ${
                          isAudit
                            ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/50 ring-1 ring-emerald-500/30"
                            : isSelected
                            ? "bg-white/20 text-white border-white/40"
                            : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80"
                        }`}
                      >
                        <span>{icons[g]}</span>
                        <span>{labels[g]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Free-text notes */}
              <div>
                <Label className="text-white/70 text-xs uppercase tracking-widest mb-2 block">Anything else about your audience?</Label>
                <textarea
                  value={audienceNotes}
                  onChange={(e) => setAudienceNotes(e.target.value)}
                  placeholder="e.g. Mostly parents with young children, strong local community focus, seasonal peaks around Christmas..."
                  rows={3}
                  className="w-full rounded-xl border border-white/15 bg-white/5 text-white placeholder:text-white/30 text-sm px-4 py-3 resize-none focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all"
                />
              </div>

              {/* Contact details */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <Label className="text-white/70 text-xs uppercase tracking-widest block">Contact details <span className="text-white/30 font-normal normal-case text-[10px] ml-1">(used for reminders &amp; marketing)</span></Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white/60 text-xs mb-1 block">Email address</Label>
                    <Input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="you@yourbusiness.com"
                      className="h-10 text-white placeholder:text-white/30 bg-white/5 border-white/20 focus:border-violet-500/60"
                    />
                  </div>
                  <div>
                    <Label className="text-white/60 text-xs mb-1 block">Mobile number</Label>
                    <Input
                      type="tel"
                      value={contactMobile}
                      onChange={(e) => setContactMobile(e.target.value)}
                      placeholder="+61 4XX XXX XXX"
                      className="h-10 text-white placeholder:text-white/30 bg-white/5 border-white/20 focus:border-violet-500/60"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-white/30">We&apos;ll send your day-10 trial reminder and important updates here. Never shared with third parties.</p>
              </div>

            </div>

            {/* Logo upload */}
            <div>
              <Label className="text-white/80 mb-2 block">Logo (optional)</Label>
              <label
                htmlFor="onboarding-logo-input"
                className={`block w-full rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                  isDragging ? "border-blue-400 bg-blue-500/10" : "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/8"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleLogoDrop}
              >
                {logoPreview ? (
                  <div className="flex flex-col items-center gap-2 p-4">
                    <img src={logoPreview} alt="Logo" className="max-h-16 max-w-[160px] object-contain rounded" />
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Logo ready
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setLogoPreview(null); setLogoBase64(null); setLogoFileName(null); }}
                        className="text-xs text-white/40 hover:text-white/70 flex items-center gap-0.5"
                      >
                        <X className="w-3 h-3" /> Remove
                      </button>
                    </div>
                    <p className="text-[11px] text-white/30">Click or drag to replace</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <Upload className="w-5 h-5 text-white/30" />
                    <p className="text-sm text-white/50">Upload your logo · PNG, JPG, SVG · max 2MB</p>
                  </div>
                )}
              </label>
              <input
                id="onboarding-logo-input"
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                className="sr-only"
                onChange={handleLogoChange}
              />
            </div>

            {/* ── Platform selection ─────────────────────────────────────────── */}
            <div className="space-y-4">
              <Label className="text-white/80">Your platforms *</Label>

              {/* Legend — compact inline */}
              <div className="flex items-center gap-4 text-[11px] text-white/50 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white/20" /> Set Up
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Connect
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Posting
                </span>
              </div>

              {/* Recommended by Blastly box */}
              {effectiveRecommendedIds.length > 0 && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-2">⚡ Recommended by Blastly (from your audit)</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {recommendedPlatforms.map((platform) => {
                      const state = platformStates[platform.id] ?? "off";
                      return (
                        <div key={platform.id} className="flex items-center gap-2 py-1.5">
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                            style={{ backgroundColor: platform.color }}
                          >
                            {platform.icon}
                          </div>
                          <span className="text-xs text-white/90 flex-1 min-w-0 truncate">{platform.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handlePlatformChange(platform.id, state === "setup" ? "off" : "setup")}
                              className={`px-2 py-0.5 rounded text-[9px] font-semibold transition-all ${
                                state === "setup"
                                  ? "bg-white/15 text-white ring-1 ring-white/30"
                                  : "bg-white/5 text-white/25 hover:bg-white/10 hover:text-white/50"
                              }`}
                            >
                              Set Up
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePlatformChange(platform.id, state === "owned" ? "off" : "owned")}
                              className={`px-2 py-0.5 rounded text-[9px] font-semibold transition-all ${
                                state === "owned"
                                  ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
                                  : "bg-white/5 text-white/25 hover:bg-white/10 hover:text-white/50"
                              }`}
                            >
                              Connect
                            </button>
                            <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-white/5 text-white/15">
                              Posting
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Other platforms — 2-column grid */}
              {otherPlatforms.length > 0 && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {otherPlatforms.map((platform) => {
                    const state = platformStates[platform.id] ?? "off";
                    return (
                      <div key={platform.id} className="flex items-center gap-2 py-1.5">
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                          style={{ backgroundColor: platform.color }}
                        >
                          {platform.icon}
                        </div>
                        <span className="text-xs text-white/90 flex-1 min-w-0 truncate">{platform.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handlePlatformChange(platform.id, state === "setup" ? "off" : "setup")}
                            className={`px-2 py-0.5 rounded text-[9px] font-semibold transition-all ${
                              state === "setup"
                                ? "bg-white/15 text-white ring-1 ring-white/30"
                                : "bg-white/5 text-white/25 hover:bg-white/10 hover:text-white/50"
                            }`}
                          >
                            Set Up
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePlatformChange(platform.id, state === "owned" ? "off" : "owned")}
                            className={`px-2 py-0.5 rounded text-[9px] font-semibold transition-all ${
                              state === "owned"
                                ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
                                : "bg-white/5 text-white/25 hover:bg-white/10 hover:text-white/50"
                            }`}
                          >
                            Connect
                          </button>
                          <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-white/5 text-white/15">
                            Posting
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button
              onClick={handleStep1}
              disabled={isSubmitting}
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {prefilled ? "Confirm & Continue" : "Continue"}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* ══ STEP 2: Launch ═══════════════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-6">

            {/* Header */}
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
              </div>
              <h1 className="text-3xl font-bold">You're almost live, {businessName || "welcome"}!</h1>
              <p className="text-white/60">Here's exactly what you're signing up for — no surprises.</p>
            </div>

            {/* FREE14 promo banner */}
            <div
              className="rounded-2xl p-4 text-center"
              style={{ background: "linear-gradient(135deg, oklch(0.18 0.06 145), oklch(0.14 0.04 145))", border: "1px solid oklch(0.52 0.22 145 / 0.4)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "oklch(0.72 0.22 145)" }}>Your promo code</p>
              <p className="text-3xl font-black tracking-widest text-white mb-1">FREE14</p>
              <p className="text-xs" style={{ color: "oklch(0.60 0.14 145)" }}>Enter this at checkout — no charge for 14 days</p>
            </div>

            {/* What's included */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: "oklch(0.12 0.015 248)", border: "1px solid oklch(0.22 0.018 248)" }}>
              <h3 className="text-sm font-semibold text-white">What's included in your trial</h3>
              <div className="space-y-2">
                {[
                  { icon: "📣", text: "AI-powered social media posts across all your platforms" },
                  { icon: "📊", text: "Full analytics dashboard — see what's working in real time" },
                  { icon: "🤖", text: "Command Centre — leads, messages, appointments in one place" },
                  { icon: "🎨", text: "Brand voice AI — every post sounds exactly like you" },
                  { icon: "📱", text: "Quick Post — photo to live in under 30 seconds" },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-start gap-3">
                    <span className="text-base shrink-0 mt-0.5">{icon}</span>
                    <p className="text-sm text-white/70">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ad spend slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Set your monthly ad budget</h3>
                <span className="text-xs text-white/40">(preview — no charge today)</span>
              </div>
              <AdSpendSlider
                initialIndex={3}
                workspaceId={workspaceId ?? undefined}
                onBudgetChange={setSelectedBudgetAud}
              />
              <p className="text-xs text-white/40 text-center">
                Adjust anytime from your dashboard. Ad spend only applies when you're ready to run paid ads.
              </p>
            </div>

            {/* Setup fee summary — only if they chose setup platforms */}
            {setupPlatforms.length > 0 && (
              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white text-sm">One-time account setup</h3>
                    <span className="text-lg font-bold text-white">${setupFeeTotal}</span>
                  </div>
                  <div className="space-y-1.5">
                    {setupPlatforms.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: p.color }}>
                            {p.icon}
                          </div>
                          <span className="text-white/70">{p.name} account creation</span>
                        </div>
                        <span className="text-white/50">${SETUP_FEE_PER_PLATFORM}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-white/30 mt-3">Charged once · accounts handed to you after setup</p>
                </CardContent>
              </Card>
            )}

            {/* No charge today callout */}
            <div className="rounded-2xl p-4 text-center" style={{ background: "oklch(0.10 0.015 248)", border: "1px solid oklch(0.20 0.018 248)" }}>
              <p className="text-base font-bold text-white mb-1">🎉 No credit card charge today</p>
              <p className="text-sm text-white/60">
                Enter <span className="font-bold text-white">FREE14</span> at checkout. Your 14-day free trial starts the moment you proceed.
                Around day 10 we'll send you a reminder — you can cancel any time before day 14 with zero cost.
              </p>
            </div>

            {/* CTA button */}
            <div className="space-y-3">
              <Button
                onClick={handleConfirmBudget}
                disabled={createOnboardingCheckout.isPending}
                className="w-full h-14 text-white font-bold text-base rounded-2xl shadow-xl flex items-center justify-center gap-3"
                style={{
                  background: "linear-gradient(135deg, oklch(0.52 0.22 145), oklch(0.46 0.20 200))",
                  boxShadow: "0 4px 24px oklch(0.52 0.22 145 / 0.35)",
                }}
              >
                {createOnboardingCheckout.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Start my 14-day free trial</span>
                    <ArrowRight className="w-4 h-4 opacity-70" />
                  </>
                )}
              </Button>
              <p className="text-center text-xs text-white/30">
                You'll be taken to a secure checkout — enter <strong className="text-white/50">FREE14</strong> to apply your free trial.
                Powered by Stripe · 256-bit SSL encryption.
              </p>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { icon: "🔒", label: "Secure checkout" },
                { icon: "↩", label: "Cancel anytime" },
                { icon: "⚡", label: "Live in 24 hours" },
              ].map((item) => (
                <div key={item.label} className="bg-white/5 rounded-xl p-3">
                  <div className="text-xl mb-1">{item.icon}</div>
                  <p className="text-xs text-white/60">{item.label}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-center text-sm text-white/40 hover:text-white/60 transition-colors"
            >
              ← Back to edit details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
