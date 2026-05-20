/**
 * SocialSetup — 3-Step Social Media Setup Guide
 *
 * Step 1: Connect existing accounts (OAuth via provider)
 * Step 2: Quick wins — easy new platforms (no verification, < 5 min each)
 * Step 3: The heavy ones — platforms requiring personal accounts or verification
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2, ExternalLink, Loader2, ChevronRight,
  Zap, Clock, AlertCircle, Check, Link2, ArrowRight, Save, Copy, RefreshCw,
} from "lucide-react";

// ─── Platform definitions ─────────────────────────────────────────────────────

interface PlatformDef {
  id: string;
  name: string;
  color: string;
  icon: string;
  step: 1 | 2 | 3;
  setupTime: string;
  requiresPersonalAccount?: string;
  verificationWait?: string;
  signupUrl: string;
  setupNotes: string[];
}

const ALL_PLATFORMS: PlatformDef[] = [
  // ── Step 2: Quick wins (no verification, < 5 min) ──────────────────────────
  {
    id: "bluesky",
    name: "Bluesky",
    color: "#0085FF",
    icon: "🦋",
    step: 2,
    setupTime: "3 min",
    signupUrl: "https://bsky.app",
    setupNotes: [
      "Go to bsky.app and click 'Sign up'",
      "Enter your email and choose a handle (e.g. @yourbusiness.bsky.social)",
      "Verify your email — you can post immediately",
      "Add your business name, bio, and website link",
    ],
  },
  {
    id: "threads",
    name: "Threads",
    color: "#000000",
    icon: "@",
    step: 2,
    setupTime: "2 min",
    requiresPersonalAccount: "Instagram",
    signupUrl: "https://www.threads.net",
    setupNotes: [
      "Threads is linked to your Instagram account",
      "Go to threads.net and log in with your Instagram credentials",
      "Your Instagram profile carries over automatically",
      "You can post immediately — no extra verification needed",
    ],
  },
  {
    id: "pinterest",
    name: "Pinterest",
    color: "#E60023",
    icon: "P",
    step: 2,
    setupTime: "5 min",
    signupUrl: "https://business.pinterest.com",
    setupNotes: [
      "Go to business.pinterest.com and click 'Create a free business account'",
      "Enter your email, password, and business name",
      "Select your business type and add your website",
      "You can start pinning immediately — no verification wait",
    ],
  },
  {
    id: "tiktok",
    name: "TikTok",
    color: "#010101",
    icon: "🎵",
    step: 2,
    setupTime: "5 min",
    signupUrl: "https://www.tiktok.com/business/en",
    setupNotes: [
      "Go to tiktok.com/business and click 'Get started for free'",
      "Sign up with email or Google/Apple account",
      "Switch to a Business Account in Settings → Manage account",
      "Add your business category, website, and bio",
    ],
  },

  // ── Step 3: Heavy ones (personal account required or verification wait) ────
  {
    id: "facebook",
    name: "Facebook Page",
    color: "#1877F2",
    icon: "f",
    step: 3,
    setupTime: "15–20 min",
    requiresPersonalAccount: "Facebook",
    signupUrl: "https://www.facebook.com/pages/create",
    setupNotes: [
      "You need a personal Facebook account first — create one at facebook.com if you don't have one",
      "Go to facebook.com/pages/create",
      "Enter your Page name, category, and description",
      "Add your profile photo (your logo), cover photo, website, phone, and hours",
      "Your Page is live immediately — ads require identity verification (1–3 days)",
    ],
  },
  {
    id: "instagram",
    name: "Instagram Business",
    color: "#E4405F",
    icon: "📸",
    step: 3,
    setupTime: "10–15 min",
    requiresPersonalAccount: "Instagram (personal)",
    signupUrl: "https://www.instagram.com",
    setupNotes: [
      "Download the Instagram app and create a personal account",
      "Go to Settings → Account → Switch to Professional Account",
      "Select 'Business' and choose your category",
      "Add your contact details, website, and bio",
      "Connect to your Facebook Page for full business features (optional but recommended)",
    ],
  },
  {
    id: "linkedin",
    name: "LinkedIn Page",
    color: "#0A66C2",
    icon: "in",
    step: 3,
    setupTime: "15–20 min",
    requiresPersonalAccount: "LinkedIn (personal)",
    signupUrl: "https://www.linkedin.com/company/setup/new/",
    setupNotes: [
      "You need a personal LinkedIn account first — create one at linkedin.com",
      "Go to linkedin.com/company/setup/new",
      "Enter your company name, website, industry, and size",
      "Add your logo and a company description",
      "Your Page is live immediately — no verification wait",
    ],
  },
  {
    id: "youtube",
    name: "YouTube Channel",
    color: "#FF0000",
    icon: "▶",
    step: 3,
    setupTime: "10–15 min",
    requiresPersonalAccount: "Google account",
    signupUrl: "https://www.youtube.com/create_channel",
    setupNotes: [
      "You need a Google account (Gmail) — create one at google.com/gmail if needed",
      "Go to youtube.com and sign in with your Google account",
      "Click your profile → Create a channel",
      "Choose 'Use a custom name' for your business name",
      "Add your channel description, website, and profile photo",
    ],
  },
  {
    id: "gmb",
    name: "Google Business",
    color: "#4285F4",
    icon: "G",
    step: 3,
    setupTime: "10 min + 5–7 day wait",
    requiresPersonalAccount: "Google account",
    verificationWait: "5–7 days (postcard)",
    signupUrl: "https://business.google.com",
    setupNotes: [
      "Go to business.google.com and sign in with your Google account",
      "Enter your business name and address (or service area)",
      "Select your business category and add your phone number and website",
      "Choose verification method — postcard is most common (arrives in 5–7 days)",
      "Once verified, your business appears on Google Maps and Search",
    ],
  },
  {
    id: "twitter",
    name: "X / Twitter",
    color: "#000000",
    icon: "𝕏",
    step: 3,
    setupTime: "5 min + 30-day posting limit",
    signupUrl: "https://twitter.com/i/flow/signup",
    setupNotes: [
      "Go to twitter.com and click 'Sign up'",
      "Enter your name, email, and date of birth",
      "Choose a username (handle) for your business",
      "Note: new accounts have reduced posting limits for the first 30 days",
      "Add your bio, website, and profile photo",
    ],
  },
];

// ─── Step 1 platforms (connect via provider OAuth) ────────────────────────────

const STEP1_PLATFORMS = [
  { id: "facebook",   name: "Facebook",        color: "#1877F2", icon: "f" },
  { id: "instagram",  name: "Instagram",       color: "#E4405F", icon: "📸" },
  { id: "tiktok",     name: "TikTok",          color: "#010101", icon: "🎵" },
  { id: "twitter",    name: "Twitter / X",     color: "#000000", icon: "𝕏" },
  { id: "linkedin",   name: "LinkedIn",        color: "#0A66C2", icon: "in" },
  { id: "pinterest",  name: "Pinterest",       color: "#E60023", icon: "P" },
  { id: "youtube",    name: "YouTube",         color: "#FF0000", icon: "▶" },
  { id: "bluesky",    name: "Bluesky",         color: "#0085FF", icon: "🦋" },
  { id: "threads",    name: "Threads",         color: "#000000", icon: "@" },
  { id: "gmb",        name: "Google Business", color: "#4285F4", icon: "G" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepHeader({ step, title, subtitle, active, done }: {
  step: number; title: string; subtitle: string; active: boolean; done: boolean;
}) {
  return (
    <div className={`flex items-start gap-4 p-5 rounded-xl border transition-all ${
      active ? "border-blue-500/50 bg-blue-500/5" :
      done ? "border-emerald-500/30 bg-emerald-500/5" :
      "border-white/10 bg-white/2 opacity-50"
    }`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
        done ? "bg-emerald-500 text-white" :
        active ? "bg-blue-500 text-white ring-4 ring-blue-500/20" :
        "bg-white/10 text-white/40"
      }`}>
        {done ? <Check className="w-4 h-4" /> : step}
      </div>
      <div>
        <h3 className={`font-semibold text-base ${active || done ? "text-white" : "text-white/40"}`}>{title}</h3>
        <p className={`text-sm mt-0.5 ${active || done ? "text-white/60" : "text-white/30"}`}>{subtitle}</p>
      </div>
      {done && <Badge className="ml-auto bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Complete</Badge>}
      {active && <Badge className="ml-auto bg-blue-500/20 text-blue-400 border-blue-500/30">In progress</Badge>}
    </div>
  );
}

function PlatformIcon({ platform }: { platform: { icon: string; color: string; name: string } }) {
  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
      style={{ backgroundColor: platform.color + "33", border: `1px solid ${platform.color}44` }}
    >
      <span style={{ color: platform.color }}>{platform.icon}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SocialSetupProps {
  workspaceId: number;
}

export default function SocialSetup({ workspaceId }: SocialSetupProps) {
  const [, navigate] = useLocation();
  const [activeStep, setActiveStep] = useState(1);
  const [step1Done, setStep1Done] = useState(false);
  const [step2Done, setStep2Done] = useState(false);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [completedSetups, setCompletedSetups] = useState<Set<string>>(new Set());
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [platformBios, setPlatformBios] = useState<Record<string, string>>({});
  const [prefilledFields, setPrefilledFields] = useState<Record<string, string>>({});
  const [biosLoaded, setBiosLoaded] = useState(false);

  const getLinkingUrl = trpc.workspace.getLinkingUrl.useMutation();
  const saveProgress = trpc.workspace.saveSetupProgress.useMutation();
  const generateBios = trpc.workspace.generatePlatformBios.useMutation({
    onSuccess: (data) => {
      setPlatformBios(data.bios);
      setPrefilledFields(data.prefilledFields);
      setBiosLoaded(true);
      toast.success("Your platform bios are ready to copy!");
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to generate bios. Please complete your Brand Profile first.");
    },
  });

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard!`);
    }).catch(() => {
      toast.error("Copy failed — please select and copy manually.");
    });
  }

  function copyAllFields(platformId: string) {
    const bio = platformBios[platformId] ?? "";
    const fields = [
      prefilledFields.businessName && `Business name: ${prefilledFields.businessName}`,
      bio && `Bio: ${bio}`,
      prefilledFields.website && `Website: ${prefilledFields.website}`,
      prefilledFields.phone && `Phone: ${prefilledFields.phone}`,
      prefilledFields.address && `Address: ${prefilledFields.address}`,
      prefilledFields.tagline && `Tagline: ${prefilledFields.tagline}`,
    ].filter(Boolean).join("\n");
    copyToClipboard(fields, "All fields");
  }
  const { data: savedProgress, isLoading: progressLoading } = trpc.workspace.getSetupProgress.useQuery(
    { workspaceId },
    { enabled: !!workspaceId }
  );

  // Load saved progress on mount
  useEffect(() => {
    if (savedProgress && !progressLoaded) {
      setStep1Done(savedProgress.step1Done);
      setStep2Done(savedProgress.step2Done);
      setActiveStep(savedProgress.activeStep ?? 1);
      const saved = (savedProgress.completedSetups as string[] | null) ?? [];
      setCompletedSetups(new Set(saved));
      setLastSaved(new Date(savedProgress.updatedAt));
      setProgressLoaded(true);
    }
  }, [savedProgress, progressLoaded]);

  // Auto-save progress with debounce whenever state changes
  const debouncedSave = useCallback((data: {
    step1Done: boolean; step2Done: boolean; activeStep: number; completedSetups: string[];
  }) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveProgress.mutateAsync({ workspaceId, ...data });
        setLastSaved(new Date());
      } catch {
        // Silent — don't interrupt the user with save errors
      }
    }, 800);
  }, [workspaceId, saveProgress]);

  // Handle return from provider linking page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    if (connected) {
      toast.success("Social accounts connected successfully!");
      setStep1Done(true);
      setActiveStep(2);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Trigger save whenever key state changes (after initial load)
  useEffect(() => {
    if (!progressLoaded) return;
    debouncedSave({
      step1Done,
      step2Done,
      activeStep,
      completedSetups: Array.from(completedSetups),
    });
  }, [step1Done, step2Done, activeStep, completedSetups, progressLoaded, debouncedSave]);

  async function handleConnectExisting() {
    try {
      const result = await getLinkingUrl.mutateAsync({
        workspaceId,
        redirectUrl: `${window.location.origin}/social-setup?connected=1`,
      });
      if (result.mockMode) {
        toast.info("Mock mode: provider linking page would open here. Set ZERNIO_API_KEY to go live.");
        setStep1Done(true);
        setActiveStep(2);
        return;
      }
      toast.info("Opening your social account connection page...");
      window.open(result.linkingUrl, "_blank", "width=600,height=700,noopener");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to generate linking URL");
    }
  }

  function markSetupDone(platformId: string) {
    setCompletedSetups((prev) => new Set(Array.from(prev).concat(platformId)));
  }

  function handleStep2Complete() {
    setStep2Done(true);
    setActiveStep(3);
    toast.success("Quick wins complete! Moving to the final step.");
  }

  if (progressLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
      </div>
    );
  }

  const step2Platforms = ALL_PLATFORMS.filter((p) => p.step === 2);
  const step3Platforms = ALL_PLATFORMS.filter((p) => p.step === 3);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
              <Link2 className="w-4 h-4" />
              Social Media Setup
            </div>
            {lastSaved && (
              <div className="flex items-center gap-1.5 text-xs text-white/30">
                <Save className="w-3 h-3" />
                Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
            {saveProgress.isPending && (
              <div className="flex items-center gap-1.5 text-xs text-white/30">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Connect your platforms</h1>
          <p className="text-white/60 mb-5">
            Follow these three steps to get all your social accounts connected to Blastly.
            You don't have to do it all at once — come back any time.
          </p>
          {/* Overall progress bar */}
          <div className="bg-white/5 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${Math.round(([step1Done, step2Done, activeStep >= 3].filter(Boolean).length / 3) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/30 mt-1.5">
            <span>Step 1</span>
            <span>{[step1Done, step2Done, activeStep >= 3].filter(Boolean).length} of 3 steps reached</span>
            <span>Step 3</span>
          </div>
        </div>

        {/* Progress overview */}
        <div className="space-y-3 mb-8">
          <StepHeader
            step={1} active={activeStep === 1} done={step1Done}
            title="Connect existing accounts"
            subtitle="Link the social accounts you already have — takes under 60 seconds each"
          />
          <StepHeader
            step={2} active={activeStep === 2} done={step2Done}
            title="Quick wins — new accounts, no friction"
            subtitle="Platforms that take under 5 minutes to create and post immediately"
          />
          <StepHeader
            step={3} active={activeStep === 3} done={false}
            title="The important ones — takes a bit longer"
            subtitle="Facebook, Instagram, LinkedIn, Google Business — worth the effort"
          />
        </div>

        {/* ── Step 1 ── */}
        {activeStep === 1 && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Step 1 — Connect existing accounts</h2>
              </div>
              <p className="text-white/60 text-sm mb-6">
                If you already have accounts on any of these platforms, click the button below.
                A secure page will open where you can connect them all in one place.
                You'll be logged into each platform as you normally would — Blastly never sees your passwords.
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {STEP1_PLATFORMS.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: p.color + "22", color: p.color, border: `1px solid ${p.color}33` }}
                  >
                    <span>{p.icon}</span>
                    <span>{p.name}</span>
                  </div>
                ))}
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-white/70">
                    <strong className="text-white">How it works:</strong> A new tab opens showing a connection page.
                    Click each platform you have, log in as normal, and click Authorise.
                    Most people are already logged in — it takes under 60 seconds per platform.
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleConnectExisting}
                  disabled={getLinkingUrl.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12"
                >
                  {getLinkingUrl.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening connection page...</>
                  ) : (
                    <><ExternalLink className="w-4 h-4 mr-2" /> Connect my existing accounts</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setStep1Done(true); setActiveStep(2); }}
                  className="border-white/20 text-white/60 hover:text-white hover:border-white/40 bg-transparent"
                >
                  I don't have any yet
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2 ── */}
        {activeStep === 2 && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-semibold text-white">Step 2 — Quick wins</h2>
              </div>
              <p className="text-white/60 text-sm mb-4">
                These platforms take under 5 minutes to create and you can post immediately —
                no waiting for verification or approval.
              </p>
              {/* Generate Bios Banner */}
              {!biosLoaded ? (
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-6">
                  <div>
                    <p className="text-sm font-medium text-emerald-300">✨ AI-generated bios ready to paste</p>
                    <p className="text-xs text-white/50 mt-0.5">Blastly will write your bio for every platform using your Brand Profile</p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 shrink-0"
                    onClick={() => generateBios.mutate({ workspaceId })}
                    disabled={generateBios.isPending}
                  >
                    {generateBios.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                    {generateBios.isPending ? "Generating..." : "Generate Bios"}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-6">
                  <p className="text-sm text-emerald-300">✅ Bios generated — expand any platform to copy your pre-filled details</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/20 text-white/60 hover:text-white bg-transparent shrink-0"
                    onClick={() => generateBios.mutate({ workspaceId })}
                    disabled={generateBios.isPending}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Regenerate
                  </Button>
                </div>
              )}

              <div className="space-y-3 mb-6">
                {step2Platforms.map((platform) => {
                  const done = completedSetups.has(platform.id);
                  const expanded = expandedPlatform === platform.id;
                  return (
                    <div
                      key={platform.id}
                      className={`rounded-xl border transition-all ${
                        done ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-white/3"
                      }`}
                    >
                      <button
                        className="w-full flex items-center gap-3 p-4 text-left"
                        onClick={() => setExpandedPlatform(expanded ? null : platform.id)}
                      >
                        <PlatformIcon platform={platform} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{platform.name}</span>
                            {platform.requiresPersonalAccount && (
                              <Badge variant="outline" className="text-xs border-white/20 text-white/50">
                                Needs {platform.requiresPersonalAccount}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3 text-white/40" />
                            <span className="text-xs text-white/40">{platform.setupTime}</span>
                          </div>
                        </div>
                        {done ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : (
                          <ChevronRight className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
                        )}
                      </button>

                      {expanded && !done && (
                        <div className="px-4 pb-4 border-t border-white/10 pt-4">
                          <ol className="space-y-2 mb-4">
                            {platform.setupNotes.map((note, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                                <span className="w-5 h-5 rounded-full bg-white/10 text-white/50 text-xs flex items-center justify-center shrink-0 mt-0.5">
                                  {i + 1}
                                </span>
                                {note}
                              </li>
                            ))}
                          </ol>

                          {/* Pre-filled fields */}
                          {biosLoaded ? (
                            <div className="mb-4 rounded-lg border border-white/10 bg-white/3 p-3 space-y-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-white/60 uppercase tracking-wide">Pre-filled details — copy &amp; paste</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-xs border-white/20 text-white/60 hover:text-white bg-transparent px-2"
                                  onClick={() => copyAllFields(platform.id)}
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy All
                                </Button>
                              </div>
                              {([
                                { label: "Business Name", value: prefilledFields.businessName },
                                { label: "Bio", value: platformBios[platform.id] },
                                { label: "Website", value: prefilledFields.website },
                                { label: "Phone", value: prefilledFields.phone },
                                { label: "Address", value: prefilledFields.address },
                                { label: "Tagline", value: prefilledFields.tagline },
                              ] as { label: string; value: string | undefined }[]).filter(f => f.value).map(({ label, value }) => (
                                <div key={label} className="flex items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white/40 mb-0.5">{label}</p>
                                    <p className="text-sm text-white/80 break-words">{value}</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs border-white/20 text-white/60 hover:text-white bg-transparent px-2 shrink-0 mt-4"
                                    onClick={() => copyToClipboard(value!, label)}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mb-4 p-3 rounded-lg border border-dashed border-white/10 text-center">
                              <p className="text-xs text-white/40">Generate bios above to see your pre-filled details here</p>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-white/10 hover:bg-white/20 text-white border-0"
                              onClick={() => window.open(platform.signupUrl, "_blank", "noopener")}
                            >
                              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                              Open {platform.name}
                            </Button>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                              onClick={() => { markSetupDone(platform.id); setExpandedPlatform(null); }}
                            >
                              <Check className="w-3.5 h-3.5 mr-1.5" />
                              Done, account created
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleStep2Complete}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-11"
                >
                  Continue to Step 3
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setStep2Done(true); setActiveStep(3); }}
                  className="border-white/20 text-white/60 hover:text-white hover:border-white/40 bg-transparent"
                >
                  Skip for now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3 ── */}
        {activeStep === 3 && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-white">Step 3 — The important ones</h2>
              </div>
              <p className="text-white/60 text-sm mb-2">
                These platforms take a bit more effort — some require creating a personal account first,
                and Google Business requires a verification postcard (5–7 days).
                They're worth it: Facebook, Instagram, and Google Business drive the most business for most industries.
              </p>
              <p className="text-white/40 text-xs mb-4">
                You don't have to do these all today. Come back to this page any time to continue.
              </p>
              {/* Generate Bios Banner (shared state with Step 2) */}
              {!biosLoaded ? (
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-6">
                  <div>
                    <p className="text-sm font-medium text-amber-300">✨ AI-generated bios ready to paste</p>
                    <p className="text-xs text-white/50 mt-0.5">Blastly will write your bio for every platform using your Brand Profile</p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white border-0 shrink-0"
                    onClick={() => generateBios.mutate({ workspaceId })}
                    disabled={generateBios.isPending}
                  >
                    {generateBios.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                    {generateBios.isPending ? "Generating..." : "Generate Bios"}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-6">
                  <p className="text-sm text-emerald-300">✅ Bios generated — expand any platform to copy your pre-filled details</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/20 text-white/60 hover:text-white bg-transparent shrink-0"
                    onClick={() => generateBios.mutate({ workspaceId })}
                    disabled={generateBios.isPending}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Regenerate
                  </Button>
                </div>
              )}

              <div className="space-y-3 mb-6">
                {step3Platforms.map((platform) => {
                  const done = completedSetups.has(platform.id);
                  const expanded = expandedPlatform === platform.id;
                  return (
                    <div
                      key={platform.id}
                      className={`rounded-xl border transition-all ${
                        done ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-white/3"
                      }`}
                    >
                      <button
                        className="w-full flex items-center gap-3 p-4 text-left"
                        onClick={() => setExpandedPlatform(expanded ? null : platform.id)}
                      >
                        <PlatformIcon platform={platform} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-white">{platform.name}</span>
                            {platform.requiresPersonalAccount && (
                              <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400/70">
                                Needs personal {platform.requiresPersonalAccount}
                              </Badge>
                            )}
                            {platform.verificationWait && (
                              <Badge variant="outline" className="text-xs border-red-500/30 text-red-400/70">
                                {platform.verificationWait}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3 text-white/40" />
                            <span className="text-xs text-white/40">{platform.setupTime}</span>
                          </div>
                        </div>
                        {done ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : (
                          <ChevronRight className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
                        )}
                      </button>

                      {expanded && !done && (
                        <div className="px-4 pb-4 border-t border-white/10 pt-4">
                          <ol className="space-y-2 mb-4">
                            {platform.setupNotes.map((note, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                                <span className="w-5 h-5 rounded-full bg-white/10 text-white/50 text-xs flex items-center justify-center shrink-0 mt-0.5">
                                  {i + 1}
                                </span>
                                {note}
                              </li>
                            ))}
                          </ol>

                          {/* Pre-filled fields */}
                          {biosLoaded ? (
                            <div className="mb-4 rounded-lg border border-white/10 bg-white/3 p-3 space-y-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-white/60 uppercase tracking-wide">Pre-filled details — copy &amp; paste</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-xs border-white/20 text-white/60 hover:text-white bg-transparent px-2"
                                  onClick={() => copyAllFields(platform.id)}
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy All
                                </Button>
                              </div>
                              {([
                                { label: "Business Name", value: prefilledFields.businessName },
                                { label: "Bio", value: platformBios[platform.id] },
                                { label: "Website", value: prefilledFields.website },
                                { label: "Phone", value: prefilledFields.phone },
                                { label: "Address", value: prefilledFields.address },
                                { label: "Tagline", value: prefilledFields.tagline },
                              ] as { label: string; value: string | undefined }[]).filter(f => f.value).map(({ label, value }) => (
                                <div key={label} className="flex items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white/40 mb-0.5">{label}</p>
                                    <p className="text-sm text-white/80 break-words">{value}</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs border-white/20 text-white/60 hover:text-white bg-transparent px-2 shrink-0 mt-4"
                                    onClick={() => copyToClipboard(value!, label)}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mb-4 p-3 rounded-lg border border-dashed border-white/10 text-center">
                              <p className="text-xs text-white/40">Generate bios above to see your pre-filled details here</p>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-white/10 hover:bg-white/20 text-white border-0"
                              onClick={() => window.open(platform.signupUrl, "_blank", "noopener")}
                            >
                              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                              Open {platform.name}
                            </Button>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                              onClick={() => { markSetupDone(platform.id); setExpandedPlatform(null); }}
                            >
                              <Check className="w-3.5 h-3.5 mr-1.5" />
                              Done, account created
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Completion CTA */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <h3 className="font-semibold text-white mb-1">You're all set up</h3>
                <p className="text-white/60 text-sm mb-4">
                  Once your accounts are connected, Blastly will start creating and scheduling
                  content automatically. A human reviews every post before it goes live.
                </p>
                <Button
                  onClick={() => navigate("/connections")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  View connected accounts
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step navigation (when not on step 1) */}
        {activeStep > 1 && (
          <div className="mt-4 flex justify-start">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveStep(activeStep - 1)}
              className="text-white/40 hover:text-white/70"
            >
              ← Back to Step {activeStep - 1}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
