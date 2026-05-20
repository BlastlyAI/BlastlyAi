/**
 * Snap to Post — Free Demo Page
 *
 * Flow:
 *  1. Enter website URL → audit detects their social platforms
 *  2. Pick one of THEIR detected platforms (only publishable ones shown)
 *  3. Take a photo (camera or file upload)
 *  4. Speak a caption (voice-to-text or type)
 *  5. AI polishes the caption — live preview card
 *  6. Post it now → save snap to DB → redirect to onboarding with snap token
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Camera, Mic, MicOff, Sparkles, Share2,
  ArrowRight, CheckCircle2, Upload, Loader2,
} from "lucide-react";

// Platform metadata
const PLATFORM_META: Record<string, {
  label: string; icon: string; color: string; bg: string; canPublish: boolean;
}> = {
  linkedin:  { label: "LinkedIn",  icon: "💼", color: "#0A66C2", bg: "bg-blue-700",   canPublish: true  },
  youtube:   { label: "YouTube",   icon: "▶️", color: "#FF0000", bg: "bg-red-600",    canPublish: true  },
  pinterest: { label: "Pinterest", icon: "📌", color: "#E60023", bg: "bg-red-500",    canPublish: true  },
  bluesky:   { label: "Bluesky",   icon: "🦋", color: "#0085FF", bg: "bg-sky-500",    canPublish: true  },
  instagram: { label: "Instagram", icon: "📸", color: "#E1306C", bg: "bg-pink-600",   canPublish: false },
  facebook:  { label: "Facebook",  icon: "👥", color: "#1877F2", bg: "bg-blue-600",   canPublish: false },
  tiktok:    { label: "TikTok",    icon: "🎵", color: "#010101", bg: "bg-zinc-900",   canPublish: false },
  twitter:   { label: "X",         icon: "✖️", color: "#000000", bg: "bg-zinc-900",   canPublish: false },
};

// SpeechRecognition shim
interface ISpeechRecognition extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string;
  start(): void; stop(): void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export default function SnapDemo() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [detectedPlatforms, setDetectedPlatforms] = useState<string[]>([]);
  const [businessContext, setBusinessContext] = useState("");

  // Step 2
  const [selectedPlatform, setSelectedPlatform] = useState<string>("linkedin");
  const [nothingConnected, setNothingConnected] = useState(false); // true when audit finds no publishable platforms
  const [detectedAllPlatforms, setDetectedAllPlatforms] = useState<string[]>([]); // all detected (incl. non-publishable)

  // Step 3
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Step 4
  const [rawCaption, setRawCaption] = useState("");
  const [interimText, setInterimText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTranscriptRef = useRef("");

  // Step 5
  const [polishedCaption, setPolishedCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [platformTip, setPlatformTip] = useState("");

  // Step 6
  const [isSaving, setIsSaving] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const runAudit = trpc.audit.runAudit.useMutation();
  const polishMutation = trpc.snap.polishCaption.useMutation();
  const savePendingSnap = trpc.snap.savePendingSnap.useMutation();

  async function handleAudit() {
    const url = websiteUrl.trim();
    if (!url) { toast.error("Please enter your website URL"); return; }
    const withProtocol = url.startsWith("http") ? url : `https://${url}`;
    try {
      const result = await runAudit.mutateAsync({ businessName: url, website: withProtocol });
      const handles = (result as any).detectedHandles as Record<string, string | null> | null;
      const businessDesc = (result as any).businessDescription as string | null;
      if (businessDesc) setBusinessContext(businessDesc.slice(0, 300));
      const found: string[] = [];
      const allFound: string[] = [];
      if (handles) {
        for (const [platform, handle] of Object.entries(handles)) {
          if (handle && PLATFORM_META[platform]) {
            allFound.push(platform);
            if (PLATFORM_META[platform].canPublish) found.push(platform);
          }
        }
      }
      setDetectedAllPlatforms(allFound);
      if (found.length === 0) {
        // Nothing publishable found — skip platform picker, go straight to onboarding pitch
        setNothingConnected(true);
        setDetectedPlatforms([]);
      } else {
        setNothingConnected(false);
        setDetectedPlatforms(found);
        setSelectedPlatform(found[0]);
      }
      setStep(2);
    } catch {
      // On error, also show the onboarding pitch — don't invent platforms
      setNothingConnected(true);
      setDetectedPlatforms([]);
      setDetectedAllPlatforms([]);
      setStep(2);
    }
  }

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      setCameraError(
        err?.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access or upload a photo instead."
          : "Could not start camera. Try uploading a photo instead."
      );
    }
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
    setStep(4);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCapturedImage(ev.target?.result as string);
      stopCamera();
      setStep(4);
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => () => stopCamera(), []);

  function stopListening(showToast = false) {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText("");
    if (finalTranscriptRef.current.trim()) {
      setRawCaption(finalTranscriptRef.current.trim());
    }
    if (showToast) toast.success("Caption captured! Tap \"Polish with AI\" when ready.");
  }

  function toggleListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice input requires Chrome or Edge. Please type your caption below.");
      return;
    }
    if (isListening) { stopListening(true); return; }

    finalTranscriptRef.current = "";
    setRawCaption("");
    setInterimText("");

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-AU";

    recognition.onresult = (event: any) => {
      let finalPart = "";
      let interimPart = "";
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalPart += r[0].transcript + " ";
        else interimPart += r[0].transcript;
      }
      if (finalPart) {
        finalTranscriptRef.current += finalPart;
        setRawCaption(finalTranscriptRef.current.trim());
      }
      setInterimText(interimPart);
      // Auto-stop after 3 s of silence
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => stopListening(true), 3000);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        toast.error("Microphone access denied. Allow microphone access in your browser settings.");
      } else if (event.error !== "no-speech") {
        toast.error("Microphone error — please type your caption below.");
      }
      setIsListening(false);
      setInterimText("");
    };

    recognition.onend = () => { setIsListening(false); setInterimText(""); if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current); };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  async function handlePolish() {
    if (!rawCaption.trim()) { toast.error("Please add a caption first"); return; }
    try {
      const result = await polishMutation.mutateAsync({
        rawCaption,
        platform: selectedPlatform,
        businessContext,
      });
      setPolishedCaption(result.caption);
      setHashtags(result.hashtags);
      setPlatformTip(result.tip);
      setStep(5);
    } catch {
      toast.error("AI polish failed — using your original caption.");
      setPolishedCaption(rawCaption);
      setHashtags([]);
      setStep(5);
    }
  }

  async function handlePostNow() {
    if (!capturedImage || !polishedCaption) return;
    setIsSaving(true);
    try {
      const result = await savePendingSnap.mutateAsync({
        imageBase64: capturedImage,
        caption: polishedCaption,
        hashtags,
        platform: selectedPlatform,
        websiteUrl: websiteUrl || undefined,
      });
      setSessionToken(result.sessionToken);
      localStorage.setItem("snap_session_token", result.sessionToken);
      localStorage.setItem("snap_platform", selectedPlatform);
      setStep(6);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save your snap. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleConnectAndPost() {
    const token = sessionToken ?? localStorage.getItem("snap_session_token") ?? "";
    navigate(`/onboarding/managed?snap=${token}&platform=${selectedPlatform}`);
  }

  const platformMeta = PLATFORM_META[selectedPlatform] ?? PLATFORM_META.linkedin;

  function getAspectClass() {
    if (selectedPlatform === "youtube") return "aspect-video";
    if (selectedPlatform === "linkedin") return "aspect-[1.91/1]";
    return "aspect-square";
  }

  const STEPS = ["Your website", "Platform", "Snap", "Caption", "Preview", "Post"];

  return (
    <div className="min-h-screen bg-[#080e1f] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <a href="/" className="text-white/60 hover:text-white text-sm">← Back</a>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
            Snap to Post
          </span>
          <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">Free demo</span>
        </div>
        <div className="w-16" />
      </header>

      {/* Progress */}
      <div className="flex items-center gap-1 px-4 py-3 overflow-x-auto">
        {STEPS.map((label, i) => {
          const stepNum = (i + 1) as Step;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <div key={label} className="flex items-center gap-1 flex-shrink-0">
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all ${
                isActive ? "bg-violet-600 text-white font-semibold" :
                isDone   ? "bg-violet-900/50 text-violet-300" : "text-white/30"
              }`}>
                {isDone ? <CheckCircle2 className="w-3 h-3" /> : <span>{stepNum}</span>}
                <span className={isActive || isDone ? "" : "hidden sm:inline"}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-3 h-px ${isDone ? "bg-violet-500" : "bg-white/10"}`} />
              )}
            </div>
          );
        })}
      </div>

      <main className="flex-1 flex flex-col items-center justify-start px-4 py-6 max-w-md mx-auto w-full gap-6">

        {/* Step 1: Website URL */}
        {step === 1 && (
          <div className="w-full space-y-6 text-center">
            <div className="space-y-2">
              <div className="text-5xl mb-4">📸</div>
              <h1 className="text-3xl font-bold leading-tight">
                Post to social in{" "}
                <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                  30 seconds
                </span>
              </h1>
              <p className="text-white/60 text-sm leading-relaxed">
                Enter your website — we find your platforms, you take a snap, speak your caption, and it posts for real. No account needed to try.
              </p>
            </div>
            <div className="space-y-3">
              <Input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAudit()}
                placeholder="yourwebsite.com.au"
                className="bg-white/5 border-white/20 text-white placeholder:text-white/30 text-lg h-14 rounded-xl text-center"
                autoFocus
              />
              <Button
                onClick={handleAudit}
                disabled={runAudit.isPending}
                className="w-full h-14 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-lg rounded-xl"
              >
                {runAudit.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Scanning your website…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">Let's go <ArrowRight className="w-5 h-5" /></span>
                )}
              </Button>
              <button
                onClick={() => { setNothingConnected(true); setDetectedPlatforms([]); setDetectedAllPlatforms([]); setStep(2); }}
                className="text-xs text-white/30 hover:text-white/50 underline"
              >
                Skip — I'll enter my website later
              </button>
            </div>
            <p className="text-xs text-white/20">No account required · No credit card · 100% free demo</p>
          </div>
        )}

        {/* Step 2: Platform picker OR nothing-connected screen */}
        {step === 2 && (
          <div className="w-full space-y-6 text-center">

            {/* ── Nothing connected ── */}
            {nothingConnected ? (
              <>
                <div className="space-y-3">
                  <div className="text-5xl">🔌</div>
                  <h1 className="text-2xl font-bold leading-snug">
                    Looks like you're not connected yet
                  </h1>
                  <p className="text-white/60 text-sm leading-relaxed">
                    No social platforms were found linked to your website — and that's completely fine.
                    It's a lot easier than you might think.
                  </p>
                </div>

                {/* Detected non-publishable platforms (Facebook/Instagram only) */}
                {detectedAllPlatforms.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left space-y-2">
                    <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">We spotted these on your site</p>
                    <div className="flex flex-wrap gap-2">
                      {detectedAllPlatforms.map(p => (
                        <span key={p} className="flex items-center gap-1.5 text-sm text-white/70 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                          {PLATFORM_META[p]?.icon} {PLATFORM_META[p]?.label ?? p}
                        </span>
                      ))}
                    </div>
                    <p className="text-white/30 text-xs">We can get all of these connected for you in your free trial.</p>
                  </div>
                )}

                <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-5 text-left space-y-3">
                  <p className="text-violet-300 font-semibold text-sm">✅ We can connect you to these platforms in under 5 minutes:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {["linkedin","facebook","instagram","youtube","tiktok","pinterest"].map(p => (
                      <div key={p} className="flex items-center gap-2 text-sm text-white/70">
                        <span>{PLATFORM_META[p]?.icon ?? "🔗"}</span>
                        <span>{PLATFORM_META[p]?.label ?? p}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => navigate("/onboarding/managed")}
                  className="w-full h-14 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-violet-500/30"
                >
                  Start my free 14-day trial →
                </Button>
                <p className="text-white/30 text-xs">No credit card required · Cancel any time · Setup takes under 5 minutes</p>
              </>
            ) : (
              /* ── Publishable platforms found ── */
              <>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold">We found these on your website</h1>
                  <p className="text-white/60 text-sm">Pick one — we'll style the caption and post it there for real.</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {detectedPlatforms.map((p) => {
                    const meta = PLATFORM_META[p];
                    return (
                      <button
                        key={p}
                        onClick={() => setSelectedPlatform(p)}
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                          selectedPlatform === p
                            ? "border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/20"
                            : "border-white/10 bg-white/5 hover:border-white/30"
                        }`}
                      >
                        <span className="text-3xl">{meta.icon}</span>
                        <div className="flex-1">
                          <p className="font-bold text-base">{meta.label}</p>
                          <p className="text-white/40 text-xs">Post for real — one tap to connect</p>
                        </div>
                        {selectedPlatform === p && <CheckCircle2 className="w-5 h-5 text-violet-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                {/* Non-publishable platforms also detected */}
                {detectedAllPlatforms.some(p => !PLATFORM_META[p]?.canPublish) && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-left">
                    <p className="text-amber-300 text-xs font-semibold mb-1">Also on your site:</p>
                    <div className="flex flex-wrap gap-2">
                      {detectedAllPlatforms.filter(p => !PLATFORM_META[p]?.canPublish).map(p => (
                        <span key={p} className="flex items-center gap-1 text-xs text-white/50 bg-white/5 px-2 py-1 rounded-full">
                          {PLATFORM_META[p]?.icon} {PLATFORM_META[p]?.label}
                        </span>
                      ))}
                    </div>
                    <p className="text-white/30 text-xs mt-2">Facebook & Instagram are available in your full dashboard.</p>
                  </div>
                )}
                <Button
                  onClick={() => { stopCamera(); setStep(3); }}
                  disabled={!selectedPlatform}
                  className="w-full h-12 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-base rounded-xl"
                >
                  Post to {platformMeta.label} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}
          </div>
        )}

        {/* Step 3: Camera */}
        {step === 3 && (
          <div className="w-full space-y-4 text-center">
            <div>
              <h1 className="text-2xl font-bold mb-1">Take your snap</h1>
              <p className="text-white/60 text-sm">Point your camera at something worth sharing, then tap the shutter.</p>
            </div>
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-square w-full max-w-sm mx-auto border border-white/10">
              <video ref={videoRef} className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`} playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              {!cameraActive && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/5">
                  <Camera className="w-16 h-16 text-white/30" />
                  <p className="text-white/40 text-sm">Tap below to open camera</p>
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
                  <p className="text-amber-400 text-sm text-center">{cameraError}</p>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {!cameraActive ? (
                <>
                  <Button
                    onClick={startCamera}
                    className="w-full h-14 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-lg rounded-2xl"
                  >
                    <Camera className="w-6 h-6 mr-2" /> Open Camera
                  </Button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-white/20 text-white/60 hover:text-white hover:border-white/40 text-sm transition-all"
                  >
                    <Upload className="w-4 h-4" /> Upload a photo instead
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={capturePhoto}
                    className="w-20 h-20 rounded-full bg-white border-4 border-violet-500 shadow-lg shadow-violet-500/40 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
                    aria-label="Capture photo"
                  >
                    <Camera className="w-8 h-8 text-violet-600" />
                  </button>
                  <p className="text-white/40 text-xs">Tap to capture</p>
                  <button onClick={stopCamera} className="text-xs text-white/30 hover:text-white/50 underline">Cancel</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Voice / Caption */}
        {step === 4 && (
          <div className="w-full space-y-5">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-1">Describe your snap</h1>
              <p className="text-white/60 text-sm">Tap the mic and speak naturally — AI will tidy it up for {platformMeta.label}.</p>
            </div>
            {capturedImage && (
              <div className="w-full aspect-square max-w-[200px] mx-auto rounded-xl overflow-hidden border border-white/10">
                <img src={capturedImage} alt="Your snap" className="w-full h-full object-cover" />
              </div>
            )}
            {/* Mic button */}
            <button
              onClick={toggleListening}
              className={`w-full flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                isListening
                  ? "border-red-500 bg-red-500/10"
                  : "border-violet-500/50 bg-violet-500/5 hover:border-violet-500 hover:bg-violet-500/10"
              }`}
            >
              <div className="relative">
                {isListening && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                    <span className="absolute -inset-2 rounded-full border-2 border-red-400/40 animate-pulse" />
                  </>
                )}
                <div className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                  isListening ? "bg-red-500" : "bg-violet-600"
                }`}>
                  {isListening ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
                </div>
              </div>
              <div className="text-center">
                <p className="font-bold text-base">
                  {isListening ? "🔴 Listening… tap to stop" : "🎙️ Tap to speak your caption"}
                </p>
                <p className="text-white/40 text-xs mt-1">
                  {isListening ? "Auto-stops after 3 seconds of silence" : "Stops automatically when you pause — or type below"}
                </p>
              </div>
              {isListening && (
                <div className="flex items-end gap-1 h-7">
                  {[0.4,0.7,1,0.6,0.9,0.5,0.8,0.4,0.7,1,0.6].map((h, i) => (
                    <div key={i} className="w-1.5 rounded-full bg-red-400"
                      style={{ height: `${h*100}%`, animation: `snapWave 0.${6+(i%4)}s ease-in-out infinite alternate`, animationDelay: `${i*0.07}s` }} />
                  ))}
                </div>
              )}
            </button>

            {/* Live transcript box — appears as soon as mic is active */}
            {(isListening || rawCaption || interimText) && (
              <div className={`w-full rounded-xl border-2 p-4 min-h-[72px] transition-all ${
                isListening ? "border-red-500/50 bg-red-500/5" : "border-violet-500/30 bg-white/5"
              }`}>
                {isListening && !rawCaption && !interimText && (
                  <p className="text-white/40 text-sm italic animate-pulse">Start speaking… words appear here in real time</p>
                )}
                <span className="text-white text-sm leading-relaxed">{rawCaption}</span>
                {interimText && <span className="text-white/50 text-sm italic"> {interimText}</span>}
              </div>
            )}

            <Textarea
              value={rawCaption}
              onChange={(e) => setRawCaption(e.target.value)}
              placeholder={isListening ? "Words will appear here as you speak…" : "Or type your caption here…"}
              rows={3}
              className="bg-white/5 border-white/20 text-white placeholder:text-white/30 rounded-xl resize-none text-sm"
            />
            <style>{`@keyframes snapWave{from{transform:scaleY(0.3);opacity:.6}to{transform:scaleY(1);opacity:1}}`}</style>
            <Button
              onClick={handlePolish}
              disabled={polishMutation.isPending || !rawCaption.trim()}
              className="w-full h-12 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-base rounded-xl"
            >
              {polishMutation.isPending ? (
                <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> AI is polishing…</span>
              ) : (
                <span className="flex items-center gap-2"><Sparkles className="w-5 h-5" /> Polish with AI</span>
              )}
            </Button>
          </div>
        )}

        {/* Step 5: Preview */}
        {step === 5 && (
          <div className="w-full space-y-5">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-1">Your post is ready ✨</h1>
              <p className="text-white/60 text-sm">AI-polished for {platformMeta.label}. Edit if you like, then post it for real.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className={`${platformMeta.bg} px-4 py-2.5 flex items-center gap-2`}>
                <span className="text-xl">{platformMeta.icon}</span>
                <span className="text-white font-semibold text-sm">{platformMeta.label}</span>
                <span className="ml-auto text-white/60 text-xs">Preview</span>
              </div>
              {capturedImage && (
                <div className={`relative w-full ${getAspectClass()} overflow-hidden`}>
                  <img src={capturedImage} alt="Post" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4 space-y-3">
                <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{polishedCaption}</p>
                {hashtags.length > 0 && (
                  <p className="text-violet-400 text-sm">{hashtags.map(h => `#${h}`).join(" ")}</p>
                )}
                {platformTip && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  <p className="text-amber-300 text-xs">💡 {platformTip}</p>
                  </div>
                )}
              </div>
            </div>
            <details className="text-sm">
              <summary className="text-white/50 cursor-pointer hover:text-white/80 select-none">✏️ Edit caption</summary>
              <Textarea
                value={polishedCaption}
                onChange={(e) => setPolishedCaption(e.target.value)}
                rows={4}
                className="mt-2 bg-white/5 border-white/20 text-white rounded-xl resize-none text-sm"
              />
            </details>
            <Button
              onClick={handlePostNow}
              disabled={isSaving}
              className="w-full h-14 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-violet-500/30"
            >
              {isSaving ? (
                <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Saving your snap…</span>
              ) : (
                <span className="flex items-center gap-2"><Share2 className="w-5 h-5" /> Post it now →</span>
              )}
            </Button>
            <button
              onClick={() => { setCapturedImage(null); setRawCaption(""); setStep(3); }}
              className="w-full text-sm text-white/40 hover:text-white/60 underline"
            >
              Take a different photo
            </button>
          </div>
        )}

        {/* Step 6: Connect & Post */}
        {step === 6 && (
          <div className="w-full space-y-6 text-center">
            {capturedImage && (
              <div className="relative w-28 h-28 mx-auto rounded-2xl overflow-hidden border-2 border-violet-500/60 shadow-lg shadow-violet-500/20">
                <img src={capturedImage} alt="Your snap" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 flex items-end justify-center pb-2">
                  <span className="text-2xl">{platformMeta.icon}</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">One last step 🚀</h1>
              <p className="text-white/60 text-sm leading-relaxed">
                To post, you'll need to log in to your {platformMeta.label} account. This proves it's yours — we can only ever post to accounts you personally authorise.
              </p>
            </div>
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-5 space-y-3 text-left">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-violet-400 flex-shrink-0" />
                <p className="text-sm text-white/80">Your snap is saved and ready to post</p>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-violet-400 flex-shrink-0" />
                <p className="text-sm text-white/80">AI caption polished for {platformMeta.label}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-violet-400 flex-shrink-0" />
                <p className="text-sm text-white/80">Log in to {platformMeta.label} → post goes live instantly</p>
              </div>
            </div>
            {/* Security note */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3 text-left">
              <span className="text-emerald-400 text-lg mt-0.5">🔒</span>
              <div>
                <p className="text-emerald-300 text-sm font-semibold">Your account is protected</p>
                <p className="text-white/50 text-xs leading-relaxed mt-1">
                  We use {platformMeta.label}'s official login — we never see your password and can only post when you're connected. Nobody else can post to your account through Blastly.
                </p>
              </div>
            </div>
            <Button
              onClick={handleConnectAndPost}
              className="w-full h-14 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-violet-500/30"
            >
              <span className="text-xl mr-2">{platformMeta.icon}</span>
              Log in to {platformMeta.label} &amp; Post →
            </Button>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left space-y-2">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">What happens next</p>
              <p className="text-white/50 text-xs leading-relaxed">You'll log in to your {platformMeta.label} account (takes about 30 seconds), your post goes live instantly, and you'll unlock a free 14-day trial of Blastly.</p>
            </div>
            <p className="text-white/20 text-xs">No credit card required · Cancel any time · We never post without your permission</p>
          </div>
        )}
      </main>
    </div>
  );
}
