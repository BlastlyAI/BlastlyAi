import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check, ArrowRight, ChevronRight, Zap, Sparkles, Copy,
  Facebook, Instagram, Linkedin, Twitter, Youtube, Pin
} from "lucide-react";
import { toast } from "sonner";
import AdSpendSlider from "@/components/AdSpendSlider";
import HumanVerifiedBadge from "@/components/HumanVerifiedBadge";

// All 13 supported platforms
const ALL_PLATFORMS = [
  { id: "facebook", label: "Facebook", icon: Facebook, color: "#1877F2" },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "#E1306C" },
  { id: "tiktok", label: "TikTok", icon: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
    </svg>
  ), color: "#010101" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "#0A66C2" },
  { id: "twitter", label: "X (Twitter)", icon: Twitter, color: "#000000" },
  { id: "youtube", label: "YouTube", icon: Youtube, color: "#FF0000" },
  { id: "pinterest", label: "Pinterest", icon: Pin, color: "#E60023" },
  { id: "google_business", label: "Google Business", icon: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  ), color: "#4285F4" },
  { id: "snapchat", label: "Snapchat", icon: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z"/>
    </svg>
  ), color: "#FFFC00" },
  { id: "threads", label: "Threads", icon: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.312-.883-2.378-.89h-.036c-.813 0-1.698.208-2.375.557l-.74-1.882c.907-.453 2.07-.703 3.115-.703h.053c1.62.01 2.95.49 3.845 1.387.82.82 1.302 1.997 1.433 3.504a11.57 11.57 0 0 1 1.162.668c1.228.793 2.09 1.89 2.498 3.17.557 1.773.298 4.213-1.786 6.25-1.822 1.783-4.028 2.618-7.16 2.64zm.376-8.274c-.08 0-.16.002-.24.007-1.16.065-2.063.43-2.554.857-.406.35-.587.793-.558 1.354.044.817.606 1.498 1.536 1.926.644.3 1.395.437 2.167.395 1.13-.063 1.998-.477 2.58-1.23.556-.72.833-1.75.822-3.063a11.64 11.64 0 0 0-1.753-.246z"/>
    </svg>
  ), color: "#000000" },
  { id: "bluesky", label: "Bluesky", icon: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.204-.659-.299-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z"/>
    </svg>
  ), color: "#0085FF" },
  { id: "reddit", label: "Reddit", icon: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
    </svg>
  ), color: "#FF4500" },
  { id: "telegram", label: "Telegram", icon: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  ), color: "#2CA5E0" },
];

const LOADING_MESSAGES = [
  "Analysing your website...",
  "Reading your brand voice...",
  "Identifying your audience...",
  "Crafting your social media post...",
  "Generating your image...",
  "Finalising your campaign...",
];

type AdResult = {
  campaignTheme: string;
  overarchingMessage: string;
  platforms: Record<string, { headline: string; copy: string; cta: string; hashtags: string[]; imageConcept: string }>;
  generalImageConcepts: string[];
  targetingRecommendations: string;
  businessName: string;
  industry: string;
  website: string;
  recommendedPlatforms: string[];
  imageUrl: string | null;
};

// Animated SVG progress ring
function ProgressRing({ progress, size = 200 }: { progress: number; size?: number }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke="url(#progressGrad)" strokeWidth="8"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <defs>
        <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function InstantAdDemo() {
  const params = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const shareToken = params.token;

  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [adResult, setAdResult] = useState<AdResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const demoMutation = trpc.adStudio.instantAdDemo.useMutation({
    onSuccess: (data) => {
      setProgress(100);
      setTimeout(() => {
        setAdResult(data as AdResult);
        setTimeout(() => setRevealed(true), 300);
      }, 600);
    },
    onError: (e) => setError(e.message),
  });

  useEffect(() => {
    if (!shareToken) return;
    demoMutation.mutate({ shareToken });

    // Cycle through loading messages
    intervalRef.current = setInterval(() => {
      setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2200);

    // Animate progress ring (0 → 90% while loading, jumps to 100 on success)
    let p = 0;
    progressRef.current = setInterval(() => {
      p = Math.min(p + 1.2, 90);
      setProgress(p);
      if (p >= 90 && progressRef.current) clearInterval(progressRef.current);
    }, 200);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [shareToken]);

  const isLoading = demoMutation.isPending;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm">Blastly AI</span>
          </div>
          <Button
            size="sm"
            onClick={() => navigate(`/onboarding/managed?audit=${shareToken}`)}
            className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white border-0 text-xs gap-1"
          >
            Get Started Free <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Loading state — two-panel layout */}
      {isLoading && !adResult && !error && (
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Watch us build your social media campaign
            </h1>
            <p className="text-white/60 text-lg">We already know everything we need about your business.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left panel — all 13 platforms */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <p className="text-xs text-white/40 uppercase tracking-widest mb-1 font-semibold">Suggested platforms for your business type</p>
              <p className="text-white/60 text-sm mb-5">Green platforms are recommended based on your industry</p>
              <div className="space-y-2.5">
                {ALL_PLATFORMS.map((platform) => {
                  // We don't know recommended yet during loading — show all as pending with a shimmer
                  const Icon = platform.icon;
                  return (
                    <div key={platform.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 animate-pulse">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: platform.color + "33" }}>
                        <Icon />
                      </div>
                      <span className="text-sm font-medium text-white/70">{platform.label}</span>
                      <div className="ml-auto w-16 h-4 rounded bg-white/10" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right panel — progress ring */}
            <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-3xl p-8 min-h-[520px]">
              <div className="relative mb-6">
                <ProgressRing progress={progress} size={180} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {progress < 100 ? (
                    <>
                      <HumanVerifiedBadge size="md" />
                      <span className="text-lg font-bold mt-1">{Math.round(progress)}%</span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-green-400">✓</span>
                      <span className="text-white/70 text-xs mt-1">Done!</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">Your social media post is being generated</p>
                <div className="flex items-center justify-center gap-2 text-violet-300 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  <span className="transition-all duration-500">{LOADING_MESSAGES[msgIdx]}</span>
                </div>
              </div>
              <div className="mt-8 w-full space-y-2">
                {LOADING_MESSAGES.slice(0, 4).map((msg, i) => (
                  <div key={i} className={`flex items-center gap-2 text-sm transition-all duration-300 ${i <= msgIdx ? "text-white" : "text-white/30"}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                      i < msgIdx ? "bg-green-500" : i === msgIdx ? "bg-violet-500 animate-pulse" : "bg-white/10"
                    }`}>
                      {i < msgIdx && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span>{msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="max-w-6xl mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-white/60 mb-6">{error}</p>
          <Button onClick={() => navigate("/audit")} variant="outline" className="border-white/20 text-white hover:bg-white/10">
            Run a free audit first
          </Button>
        </div>
      )}

      {/* Result state */}
      {adResult && (
        <div className={`max-w-6xl mx-auto px-4 py-10 transition-all duration-700 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>

          {/* Success banner */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 text-green-300 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Check className="w-4 h-4" />
              Campaign built — without you lifting a finger
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">{adResult.businessName}</h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">{adResult.overarchingMessage}</p>
          </div>

          {/* Two-panel result layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            {/* Left — all 13 platforms with recommended highlighted green */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <p className="text-xs text-white/40 uppercase tracking-widest mb-1 font-semibold">Platform Recommendations</p>
              <p className="text-white/60 text-sm mb-5">
                <span className="text-green-400 font-semibold">Green</span> = recommended for your business type · Suggested platforms only
              </p>
              <div className="space-y-2">
                {ALL_PLATFORMS.map((platform) => {
                  const isRecommended = adResult.recommendedPlatforms?.includes(platform.id);
                  const Icon = platform.icon;
                  return (
                    <div
                      key={platform.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                        isRecommended
                          ? "bg-green-500/10 border-green-500/30"
                          : "bg-white/3 border-white/8 opacity-60"
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: platform.color + "33", color: platform.color }}
                      >
                        <Icon />
                      </div>
                      <span className={`text-sm font-medium ${isRecommended ? "text-white" : "text-white/50"}`}>
                        {platform.label}
                      </span>
                      {isRecommended && (
                        <div className="ml-auto flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                          <span className="text-xs text-green-400 font-medium">Recommended</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right — featured post preview with AI image */}
            <div className="space-y-4">
              {/* AI generated image */}
              {adResult.imageUrl && (
                <div className="rounded-2xl overflow-hidden border border-white/10 aspect-video relative">
                  <img
                    src={adResult.imageUrl}
                    alt="AI-generated campaign image"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-violet-600/90 text-white border-0 text-xs backdrop-blur-sm">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI Generated
                    </Badge>
                  </div>
                </div>
              )}

              {/* Featured Instagram post — only if recommended */}
              {adResult.platforms?.instagram && adResult.recommendedPlatforms?.includes("instagram") && (
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-white" />
                    <span className="font-semibold text-white text-sm">Instagram Post</span>
                    <Badge className="ml-auto bg-white/20 text-white border-0 text-xs">Ready to post</Badge>
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="font-bold text-lg">{adResult.platforms.instagram.headline}</p>
                    <p className="text-white/80 text-sm leading-relaxed">{adResult.platforms.instagram.copy}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(adResult.platforms.instagram.hashtags ?? []).map((tag) => (
                        <span key={tag} className="text-xs text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded-full">#{tag}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-white/10">
                      <span className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1.5 rounded-full font-semibold">
                        {adResult.platforms.instagram.cta}
                      </span>
                      <button
                        onClick={() => handleCopy(`${adResult.platforms.instagram.headline}\n\n${adResult.platforms.instagram.copy}\n\n${(adResult.platforms.instagram.hashtags ?? []).map(h => `#${h}`).join(" ")}`, "instagram")}
                        className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
                      >
                        {copied === "instagram" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied === "instagram" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Facebook post — only if recommended */}
              {adResult.platforms?.facebook && adResult.recommendedPlatforms?.includes("facebook") && (
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="bg-blue-600 px-4 py-3 flex items-center gap-2">
                    <Facebook className="w-4 h-4 text-white" />
                    <span className="font-semibold text-white text-sm">Facebook Post</span>
                  </div>
                  <div className="p-4 space-y-2">
                    <p className="font-bold">{adResult.platforms.facebook.headline}</p>
                    <p className="text-white/80 text-sm leading-relaxed">{adResult.platforms.facebook.copy}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-white/10">
                      <span className="inline-block bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full font-semibold">
                        {adResult.platforms.facebook.cta}
                      </span>
                      <button
                        onClick={() => handleCopy(`${adResult.platforms.facebook.headline}\n\n${adResult.platforms.facebook.copy}`, "facebook")}
                        className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
                      >
                        {copied === "facebook" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied === "facebook" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* LinkedIn + Twitter row — only show recommended platforms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {adResult.platforms?.linkedin && adResult.recommendedPlatforms?.includes("linkedin") && (
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="bg-blue-700 px-4 py-3 flex items-center gap-2">
                  <Linkedin className="w-4 h-4 text-white" />
                  <span className="font-semibold text-white text-sm">LinkedIn Post</span>
                </div>
                <div className="p-4 space-y-2">
                  <p className="font-bold">{adResult.platforms.linkedin.headline}</p>
                  <p className="text-white/80 text-sm leading-relaxed">{adResult.platforms.linkedin.copy}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(adResult.platforms.linkedin.hashtags ?? []).map((tag) => (
                      <span key={tag} className="text-xs text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-full">#{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {adResult.platforms?.twitter && adResult.recommendedPlatforms?.includes("twitter") && (
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="bg-black px-4 py-3 flex items-center gap-2">
                  <Twitter className="w-4 h-4 text-white" />
                  <span className="font-semibold text-white text-sm">X (Twitter) Post</span>
                </div>
                <div className="p-4 space-y-2">
                  <p className="font-bold">{adResult.platforms.twitter.headline}</p>
                  <p className="text-white/80 text-sm leading-relaxed">{adResult.platforms.twitter.copy}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(adResult.platforms.twitter.hashtags ?? []).map((tag) => (
                      <span key={tag} className="text-xs text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-full">#{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Big CTA */}
          <div className="bg-gradient-to-r from-violet-600/30 to-pink-600/30 border border-violet-500/30 rounded-3xl p-8 md:p-12 text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-sm text-white/70 mb-4">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              This is what we do for your business every single week
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to put your social media on autopilot?
            </h2>
            <p className="text-white/60 text-lg mb-6 max-w-xl mx-auto">
              We manage everything — content, scheduling, and posting across all your platforms. You approve before anything goes live. No surprises.
            </p>

            {/* Budget slider — drag to choose your plan, then pay inline */}
            <AdSpendSlider initialIndex={1} industry={adResult?.industry} />

            <p className="text-white/40 text-sm mt-6">No lock-in contract · Cancel anytime</p>
          </div>
        </div>
      )}
    </div>
  );
}
