import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Zap, Target, TrendingUp, CheckCircle, Menu, X, Globe, Search, BarChart2, Users, Sun, Moon, Sparkles, Rocket, MapPin, Trophy, Radar, Send } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

function ThemeToggleButton() {
  const { theme, toggleTheme, switchable } = useTheme();
  if (!switchable || !toggleTheme) return null;
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle light/dark mode"
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
    >
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
import { useLocation } from "wouter";
import AdSpendSlider from "@/components/AdSpendSlider";

// ── Quick Post Demo ──────────────────────────────────────────────────────
const DEMO_STEPS = [
  { id: "photo", label: "Tap to take photo", icon: "📷", color: "oklch(0.55 0.22 200)", desc: "Snap the moment — a finished job, a happy client, behind the scenes." },
  { id: "voice", label: "Hold to record", icon: "🎤", color: "oklch(0.55 0.22 0)", desc: "Say what happened in your own words. Rough is fine." },
  { id: "send", label: "Send to our team", icon: "✅", color: "oklch(0.55 0.22 145)", desc: "AI polishes the caption. We approve it. It goes live." },
  { id: "result", label: "Post is live! 🎉", icon: "🚀", color: "oklch(0.60 0.20 60)", desc: "Authentic content, published — in under 30 seconds." },
];

const PROGRESS_STAGES = [
  { label: "Uploading photo…", pct: 20 },
  { label: "Transcribing voice…", pct: 45 },
  { label: "Writing your post…", pct: 75 },
  { label: "Polishing captions…", pct: 90 },
  { label: "Done!", pct: 100 },
];

function ProgressRing({ pct, size = 120 }: { pct: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="oklch(0.25 0.02 240)" strokeWidth={8} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke="oklch(0.65 0.22 145)" strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

function QuickPostDemo({ compact = false }: { compact?: boolean }) {
  // ── Watch Demo mode state
  const [demoStep, setDemoStep] = React.useState(0);
  const [demoAnimating, setDemoAnimating] = React.useState(false);
  const [showVideoModal, setShowVideoModal] = React.useState(false);

  // ── Try It mode state
  type TryMode = "idle" | "photo" | "voice" | "processing" | "result";
  const [mode, setMode] = React.useState<"watch" | "try">("watch");
  const [tryState, setTryState] = React.useState<TryMode>("idle");
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = React.useState<string | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const [voiceTranscript, setVoiceTranscript] = React.useState<string | null>(null);
  const [progressStage, setProgressStage] = React.useState(0);
  const [result, setResult] = React.useState<Record<string, string> | null>(null);
  const [activePlatform, setActivePlatform] = React.useState("instagram");
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const guestPreview = trpc.quickCapture.guestPreview.useMutation();
  const searchStockPhotos = trpc.quickCapture.searchStockPhotos.useMutation();

  // ── Stock photo state
  const [stockPhotos, setStockPhotos] = React.useState<Array<{id: number; url: string; thumb: string; photographer: string; alt: string}>>([]);
  const [stockSearching, setStockSearching] = React.useState(false);
  const [selectedStockUrl, setSelectedStockUrl] = React.useState<string | null>(null);
  const [textNote, setTextNote] = React.useState("");

  // Smart upload hints — rotating
  const UPLOAD_HINTS = [
    "💡 Mention who's in the photo — e.g. 'This is Sarah, one of our best customers'",
    "📍 At an event? Tell us the event name — we'll add the hashtag automatically",
    "📅 Want a specific post date? Just say it — e.g. 'post this on 27 June'",
    "🎉 Celebrating something? Tell us — we'll make it shine",
    "🏆 Finished a job? Describe what you did — before & after works great",
    "⏰ Say 'post this early' to jump the queue",
  ];
  const [hintIndex, setHintIndex] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setHintIndex(i => (i + 1) % UPLOAD_HINTS.length), 3500);
    return () => clearInterval(t);
  }, []);

  const handleFindStockPhoto = async () => {
    setStockSearching(true);
    setStockPhotos([]);
    try {
      const res = await searchStockPhotos.mutateAsync({ query: textNote || "small business professional", perPage: 6 });
      setStockPhotos(res.photos);
    } catch {
      setStockPhotos([]);
    } finally {
      setStockSearching(false);
    }
  };

  // Auto-cycle watch demo
  React.useEffect(() => {
    if (mode !== "watch") return;
    const timer = setInterval(() => {
      setDemoAnimating(true);
      setTimeout(() => {
        setDemoStep(s => (s + 1) % DEMO_STEPS.length);
        setDemoAnimating(false);
      }, 300);
    }, 2200);
    return () => clearInterval(timer);
  }, [mode]);

  // Handle photo selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setPhotoPreview(dataUrl);
      setPhotoBase64(dataUrl.split(",")[1]);
      setTryState("voice");
    };
    reader.readAsDataURL(file);
  };

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = e => audioChunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        // Convert to base64 for transcription
        const reader = new FileReader();
        reader.onload = ev => {
          const b64 = (ev.target?.result as string).split(",")[1];
          // Use a simple placeholder transcript for the demo (real transcription happens server-side)
          setVoiceTranscript("[Voice recorded — AI will transcribe]");
          runProcessing(b64);
        };
        reader.readAsDataURL(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch {
      // Mic not available — skip to processing with just the photo
      setVoiceTranscript(null);
      runProcessing(null);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  // Run AI processing with progress ring animation
  const runProcessing = async (voiceB64: string | null) => {
    setTryState("processing");
    setProgressStage(0);
    // Animate through stages while waiting for AI
    const stageTimings = [600, 1200, 1800, 2400];
    stageTimings.forEach((t, i) => setTimeout(() => setProgressStage(i + 1), t));
    try {
      const res = await guestPreview.mutateAsync({
        voiceTranscript: voiceTranscript || undefined,
        textNote: undefined,
        hasPhoto: !!photoBase64,
        industry: undefined,
      });
      setProgressStage(4); // Done
      setTimeout(() => {
        setResult(res.posts as Record<string, string>);
        setTryState("result");
      }, 600);
    } catch {
      setProgressStage(4);
      setTimeout(() => {
        setResult({
          instagram: "✨ Just captured this moment — can't wait to share! #SmallBusiness #Authentic",
          facebook: "Something exciting just happened at our business. Stay tuned for more!",
          linkedin: "Proud of the work we do every day. Here's a glimpse behind the scenes.",
        });
        setTryState("result");
      }, 600);
    }
  };

  const resetTry = () => {
    setTryState("idle");
    setPhotoPreview(null);
    setPhotoBase64(null);
    setVoiceTranscript(null);
    setResult(null);
    setProgressStage(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const current = DEMO_STEPS[demoStep];
  const isResult = current.id === "result";
  const currentProgress = PROGRESS_STAGES[Math.min(progressStage, PROGRESS_STAGES.length - 1)];
  const loginUrl = "/signup";

  return (
    <section className="py-14 border-t relative overflow-hidden" style={{ borderColor: "oklch(0.26 0.012 245 / 0.50)" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, oklch(0.52 0.22 160 / 0.07), transparent 70%)" }} />
      <div className="container max-w-5xl mx-auto relative">
        <div className="grid md:grid-cols-2 gap-16 items-center">

          {/* Left: copy */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Nobody else on the planet does this</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight font-[Space_Grotesk]">
              Original content.<br />
              Locked and loaded.<br />
              <span className="text-emerald-400">In 30 seconds.</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              No agency. No studio. No editing software.<br />
              Just your phone, your moment, and your story.
              The AI polishes it. We approve it. It goes live.
            </p>
            <div className="space-y-3">
              {DEMO_STEPS.slice(0, 3).map((s, i) => (
                <div key={s.id} className={`flex gap-4 items-start transition-all duration-300 ${demoStep === i ? "opacity-100" : "opacity-40"}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5 font-bold" style={{ background: demoStep === i ? `${s.color}30` : "oklch(0.20 0.01 245)", border: `1px solid ${demoStep === i ? s.color : "oklch(0.30 0.01 245)"}`, color: demoStep === i ? s.color : "oklch(0.50 0.01 245)" }}>{i + 1}</div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{s.label}</p>
                    <p className="text-muted-foreground text-sm">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Two CTA buttons */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setShowVideoModal(true)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: "oklch(0.20 0.02 240)",
                  color: "white",
                  border: "1px solid oklch(0.35 0.02 240)",
                }}
              >
                ▶️ Watch the demo
              </button>
              <button
                onClick={() => { setMode("try"); setTryState("photo"); }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: mode === "try" ? "oklch(0.55 0.22 145)" : "oklch(0.20 0.02 240)",
                  color: "white",
                  border: `1px solid ${mode === "try" ? "oklch(0.55 0.22 145)" : "oklch(0.35 0.02 240)"}`,
                }}
              >
                ⚡ Try it yourself — 30 sec
              </button>
            </div>
            <p className="text-xs text-muted-foreground italic border-l-2 border-emerald-500/40 pl-3">
              "Your real photos + your real words = content that connects.
              The AI tidies it up — but the story is always yours."
            </p>
          </div>

          {/* Right: phone mockup */}
          <div className="flex justify-center">
            <div className="relative">

              {/* ── PROCESSING OVERLAY — shown above phone when AI is running ── */}
              {tryState === "processing" && (
                <div
                  className="absolute -top-36 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 px-6 py-4 rounded-2xl"
                  style={{
                    background: "oklch(0.14 0.03 240 / 0.96)",
                    border: "1px solid oklch(0.40 0.15 145 / 0.50)",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 8px 32px oklch(0.52 0.22 145 / 0.25)",
                    width: 220,
                  }}
                >
                  <div className="relative">
                    <ProgressRing pct={currentProgress.pct} size={80} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-emerald-400 font-bold text-base">{currentProgress.pct}%</span>
                    </div>
                  </div>
                  <p className="text-white/90 text-xs font-semibold text-center">{currentProgress.label}</p>
                  <div className="flex gap-1">
                    {PROGRESS_STAGES.map((_, i) => (
                      <div key={i} className="h-1 w-4 rounded-full transition-all duration-500" style={{ background: i <= progressStage ? "oklch(0.65 0.22 145)" : "oklch(0.25 0.02 240)" }} />
                    ))}
                  </div>
                  <p className="text-white/40 text-[10px]">AI is writing your post…</p>
                </div>
              )}
              {/* iPhone-shaped phone: ~260px wide × 540px tall (≈9:18.7 ratio) */}
              <div className="rounded-[2.8rem] border-4 border-white/20 bg-[oklch(0.13_0.02_240)] shadow-2xl shadow-black/60 overflow-hidden flex flex-col" style={{ width: 260, minHeight: 540 }}>
                {/* Status bar with Dynamic Island notch */}
                <div className="relative h-10 bg-black flex items-center justify-between px-5 flex-shrink-0">
                  <span className="text-white/50 text-[10px] font-medium">9:41</span>
                  {/* Dynamic Island */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-2 w-20 h-5 bg-black rounded-full border border-white/10"></div>
                  <span className="text-white/50 text-[10px]">🔋</span>
                </div>

                {/* ── WATCH DEMO MODE ── */}
                {mode === "watch" && (
                  <div className="p-4 space-y-3">
                    <p className="text-white text-xs font-semibold text-center">Quick Post</p>
                    <div
                      className="w-full h-44 rounded-xl flex flex-col items-center justify-center gap-3 transition-all duration-300"
                      style={{
                        opacity: demoAnimating ? 0 : 1,
                        transform: demoAnimating ? "scale(0.95)" : "scale(1)",
                        background: isResult ? "linear-gradient(135deg, oklch(0.25 0.08 145), oklch(0.20 0.06 200))" : "oklch(0.18 0.02 240)",
                        border: `1px solid ${current.color}40`,
                      }}
                    >
                      <span className="text-4xl">{current.icon}</span>
                      {isResult ? (
                        <>
                          <p className="text-emerald-300 text-xs font-bold text-center px-2">✨ Your post is ready!</p>
                          <div className="w-full px-3">
                            <div className="bg-white/10 rounded-lg p-2 text-[10px] text-white/80 leading-relaxed">
                              "Just finished this transformation — couldn't be happier! 🌟 #HairGoals #Salon"
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-white/60 text-[11px] font-medium">{current.label}</p>
                          {current.id === "voice" && (
                            <div className="flex items-end gap-0.5 h-6">
                              {[3,5,8,6,4,7,5,3,6,4,8,5].map((h, idx) => (
                                <div key={idx} className="w-1 rounded-full bg-red-400 animate-pulse" style={{ height: `${h * 2}px`, animationDelay: `${idx * 0.1}s` }} />
                              ))}
                            </div>
                          )}
                          {current.id === "send" && (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-emerald-400 text-[10px]">Sending…</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex justify-center gap-1.5">
                      {DEMO_STEPS.map((s, i) => (
                        <div key={s.id} className="h-1 rounded-full transition-all duration-300" style={{ width: demoStep === i ? "20px" : "6px", background: demoStep === i ? s.color : "oklch(0.30 0.01 245)" }} />
                      ))}
                    </div>
                    <div className="flex justify-center">
                      <span className="text-[10px] text-emerald-400 font-medium">⏱ Average: 23 seconds</span>
                    </div>
                  </div>
                )}

                {/* ── TRY IT MODE ── */}
                {mode === "try" && (
                  <div className="p-4 space-y-3">
                    <p className="text-white text-xs font-semibold text-center">Quick Post</p>

                    {/* Step: take photo or find stock */}
                    {tryState === "photo" && (
                      <div className="space-y-2">
                        {/* Smart hint — rotating */}
                        <div className="rounded-lg px-2.5 py-1.5 text-[9px] text-amber-300/80 border border-amber-400/20" style={{ background: "oklch(0.18 0.04 60 / 0.40)" }}>
                          {UPLOAD_HINTS[hintIndex]}
                        </div>
                        {/* Step 1 — Text note */}
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] font-bold text-emerald-400 mt-2 shrink-0">①</span>
                          <textarea
                            value={textNote}
                            onChange={e => setTextNote(e.target.value)}
                            placeholder="Describe your post (optional) — e.g. 'Mrs Smith's haircut, post on 27 June'"
                            className="w-full rounded-xl p-2 text-[10px] text-white/80 resize-none border border-white/10 focus:border-emerald-400/60 focus:outline-none"
                            style={{ background: "oklch(0.16 0.02 240)", minHeight: "48px" }}
                            rows={2}
                          />
                        </div>
                        {/* Step 2 — Photo */}
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] font-bold text-emerald-400 mt-2 shrink-0">②</span>
                          <div className="flex-1 space-y-1.5">
                            <div
                              className="w-full h-20 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer border-2 border-dashed border-white/20 hover:border-emerald-400/60 transition-colors"
                              style={{ background: "oklch(0.16 0.02 240)" }}
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <span className="text-2xl">📷</span>
                              <p className="text-white/70 text-[10px] text-center">Tap to upload your photo</p>
                            </div>
                            {/* Stock photo grid */}
                            {stockPhotos.length > 0 && (
                              <div className="grid grid-cols-3 gap-1">
                                {stockPhotos.slice(0, 6).map(p => (
                                  <div
                                    key={p.id}
                                    onClick={() => { setSelectedStockUrl(p.url); setPhotoPreview(p.url); setTryState("voice"); }}
                                    className="relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all"
                                    style={{ borderColor: selectedStockUrl === p.url ? "oklch(0.65 0.22 145)" : "transparent", aspectRatio: "1" }}
                                  >
                                    <img src={p.thumb} alt={p.alt} className="w-full h-full object-cover" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Step 3 — Upload */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-emerald-400 shrink-0">③</span>
                          <button
                            onClick={handleFindStockPhoto}
                            disabled={stockSearching}
                            className="flex-1 py-2 rounded-xl text-[10px] font-semibold text-white border border-emerald-400/40 hover:border-emerald-400/80 transition-colors flex items-center justify-center gap-1.5"
                            style={{ background: stockSearching ? "oklch(0.20 0.06 145)" : "oklch(0.18 0.04 145 / 0.60)" }}
                          >
                            {stockSearching ? (
                              <><div className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" /> Uploading…</>
                            ) : (
                              <>📤 Upload</>
                            )}
                          </button>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                      </div>
                    )}

                    {/* Step: record voice */}
                    {tryState === "voice" && (
                      <div className="space-y-3">
                        {photoPreview && (
                          <img src={photoPreview} alt="Your photo" className="w-full h-28 object-cover rounded-xl" />
                        )}
                        <div
                          className={`w-full h-20 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${isRecording ? "bg-red-500/20 border border-red-400" : "bg-white/5 border border-white/20 hover:border-emerald-400/60"}`}
                          onClick={isRecording ? stopRecording : startRecording}
                        >
                          {isRecording ? (
                            <>
                              <div className="flex items-end gap-0.5 h-5">
                                {[3,5,8,6,4,7,5,3,6,4].map((h, idx) => (
                                  <div key={idx} className="w-1 rounded-full bg-red-400 animate-pulse" style={{ height: `${h * 1.5}px`, animationDelay: `${idx * 0.1}s` }} />
                                ))}
                              </div>
                              <p className="text-red-300 text-[10px] font-semibold">Recording… tap to stop</p>
                            </>
                          ) : (
                            <>
                              <span className="text-2xl">🎤</span>
                              <p className="text-white/60 text-[10px]">Tap to record your message</p>
                            </>
                          )}
                        </div>
                        <button
                          onClick={() => runProcessing(null)}
                          className="w-full py-2 rounded-xl text-xs font-semibold text-white/60 border border-white/10 hover:border-white/30 transition-colors"
                        >
                          Skip voice → just use photo
                        </button>

                      </div>
                    )}

                    {/* Step: processing with progress ring */}
                    {tryState === "processing" && (
                      <div className="flex flex-col items-center justify-center gap-4 py-4">
                        <div className="relative">
                          <ProgressRing pct={currentProgress.pct} size={110} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-emerald-400 font-bold text-lg">{currentProgress.pct}%</span>
                          </div>
                        </div>
                        <p className="text-white/80 text-xs font-medium text-center">{currentProgress.label}</p>
                        <div className="flex gap-1">
                          {PROGRESS_STAGES.map((_, i) => (
                            <div key={i} className="h-1 w-5 rounded-full transition-all duration-500" style={{ background: i <= progressStage ? "oklch(0.65 0.22 145)" : "oklch(0.25 0.02 240)" }} />
                          ))}
                        </div>
                        <p className="text-white/30 text-[10px]">AI is writing your post…</p>
                      </div>
                    )}

                    {/* Step: result */}
                    {tryState === "result" && result && (
                      <div className="space-y-2">
                        <div className="flex gap-1.5 justify-center">
                          {["instagram", "facebook", "linkedin"].map(p => (
                            <button
                              key={p}
                              onClick={() => setActivePlatform(p)}
                              className="px-2 py-0.5 rounded-full text-[9px] font-semibold transition-all capitalize"
                              style={{
                                background: activePlatform === p ? "oklch(0.55 0.22 145)" : "oklch(0.20 0.02 240)",
                                color: "white",
                              }}
                            >{p}</button>
                          ))}
                        </div>
                        <div className="rounded-xl p-3 space-y-2" style={{ background: "linear-gradient(135deg, oklch(0.22 0.06 145), oklch(0.18 0.04 200))", border: "1px solid oklch(0.40 0.15 145 / 0.40)" }}>
                          <p className="text-emerald-300 text-[10px] font-bold">✨ Your post is ready!</p>
                          <p className="text-white/85 text-[10px] leading-relaxed">{result[activePlatform]}</p>
                        </div>
                        <a
                          href={loginUrl}
                          className="block w-full py-2 rounded-xl text-center text-xs font-bold text-white transition-all"
                          style={{ background: "oklch(0.55 0.22 145)" }}
                        >
                          Get started to publish this →
                        </a>
                        <button onClick={resetTry} className="w-full text-[10px] text-white/30 hover:text-white/60 transition-colors">
                          Try again
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Floating badge */}
              <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/40 whitespace-nowrap">
                Unique to Blastly
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Video Modal ── */}
      {showVideoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setShowVideoModal(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: "oklch(0.14 0.015 245)", border: "1px solid oklch(0.28 0.015 245)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors"
              style={{ background: "oklch(0.20 0.02 245)" }}
            >
              ✕
            </button>
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "oklch(0.55 0.22 145 / 0.15)", border: "1px solid oklch(0.55 0.22 145 / 0.40)" }}>
                <span className="text-3xl">▶️</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Demo video coming soon</h3>
              <p className="text-sm mb-6" style={{ color: "oklch(0.62 0.04 245)" }}>
                We're putting the finishing touches on our product walkthrough. In the meantime, try the live demo below — it takes 30 seconds and shows you exactly how it works.
              </p>
              <button
                onClick={() => { setShowVideoModal(false); setMode("try"); setTryState("photo"); }}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: "linear-gradient(135deg, oklch(0.52 0.22 145), oklch(0.46 0.20 200))", boxShadow: "0 4px 20px oklch(0.52 0.22 145 / 0.30)" }}
              >
                ⚡ Try it yourself instead — 30 sec
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Animated word cycler ───────────────────────────────────────────────────
const WORDS = ["Invisible", "Forgotten", "Missing", "Silent"];

function AnimatedWord() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % WORDS.length);
        setVisible(true);
      }, 350);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className="gradient-text"
      style={{
        display: "inline-block",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
      }}
    >
      {WORDS[index]}
    </span>
  );
}

// ── URL Audit Input ────────────────────────────────────────────────────────
function AuditInput({ loginUrl }: { loginUrl: string }) {
  const [url, setUrl] = useState("");
  const [, navigate] = useLocation();

  function runAudit() {
    const trimmed = url.trim();
    if (!trimmed) {
      // Focus the input instead of silently doing nothing
      document.querySelector<HTMLInputElement>('input[placeholder*="yourcompany"]')?.focus();
      return;
    }
    const normalised = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    navigate(`/audit?url=${encodeURIComponent(normalised)}`);
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className="flex items-center gap-2 p-2 rounded-2xl"
        style={{
          background: "oklch(0.17 0.012 245 / 0.90)",
          border: "1px solid oklch(0.62 0.18 220 / 0.35)",
          boxShadow: "0 0 50px oklch(0.52 0.18 220 / 0.12), 0 8px 32px rgba(0,0,0,0.35)",
        }}
      >
        <Globe className="w-5 h-5 ml-3 flex-shrink-0" style={{ color: "oklch(0.62 0.18 220)" }} />
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && runAudit()}
          placeholder="Enter your website — e.g. yourcompany.com"
          className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-base px-2 py-2"
          autoComplete="off"
          spellCheck={false}
        />
        <Button
          type="button"
          onClick={runAudit}
          size="default"
          className="btn-gradient text-white font-bold px-6 py-3 rounded-xl flex-shrink-0 text-base"
        >
          Get Free Audit
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
      <p className="text-sm font-semibold mt-3 text-center" style={{ color: "oklch(0.78 0.10 220)" }}>
        No account needed &nbsp;·&nbsp; Results in 60 seconds &nbsp;·&nbsp; 100% free
      </p>
    </div>
  );
}

// ── Scrolling ticker phrases ──────────────────────────────────────────────
const TICKER_PHRASES = [
  "At a client site — snap, speak, post.",
  "Just finished a job? Share it in 30 seconds.",
  "At an event? Post live before you leave.",
  "On the road — your phone is your studio.",
  "Behind the counter — capture the moment.",
  "At a trade show — post while it's happening.",
  "In the office — done before your coffee cools.",
  "After a big win — let the world know instantly.",
  "On a job site — real content, no editing needed.",
  "At a market stall — post and sell at the same time.",
];

function ScrollingTicker() {
  return (
    <div className="overflow-hidden relative" style={{ height: "2rem" }}>
      <div
        className="flex gap-8 whitespace-nowrap"
        style={{
          animation: "ticker-scroll 28s linear infinite",
          width: "max-content",
        }}
      >
        {[...TICKER_PHRASES, ...TICKER_PHRASES].map((phrase, i) => (
          <span key={i} className="text-xs font-medium" style={{ color: "oklch(0.72 0.14 145)" }}>
            <span style={{ color: "oklch(0.55 0.22 145)" }}>●</span> {phrase}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Sample audit report for the preview panel ──────────────────────────────
const SAMPLE_AUDIT = {
  business: "Blue Wave Plumbing",
  score: 62,
  grade: "C",
  platforms: [
    { name: "Website",   grade: "C", score: 58, icon: "🌐", color: "oklch(0.55 0.18 220)" },
    { name: "Google",    grade: "D", score: 41, icon: "G",  color: "oklch(0.55 0.22 30)"  },
    { name: "Facebook",  grade: "B", score: 74, icon: "f",  color: "oklch(0.55 0.22 240)" },
    { name: "Instagram", grade: "F", score: 22, icon: "📸", color: "oklch(0.55 0.22 0)"   },
  ],
  wins: ["Active Facebook page", "Mobile-friendly website"],
  fixes: ["No Google Business listing", "Instagram not set up", "No reviews strategy"],
};

function AuditPreviewCard() {
  const scoreColor =
    SAMPLE_AUDIT.score >= 80 ? "oklch(0.65 0.22 145)" :
    SAMPLE_AUDIT.score >= 60 ? "oklch(0.72 0.20 80)" :
    SAMPLE_AUDIT.score >= 40 ? "oklch(0.72 0.20 40)" : "oklch(0.65 0.22 20)";

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3 w-full"
      style={{ background: "oklch(0.15 0.012 245)", border: "1px solid oklch(0.30 0.012 245 / 0.70)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "oklch(0.55 0.04 245)" }}>Sample Report</p>
          <p className="text-sm font-bold text-white">{SAMPLE_AUDIT.business}</p>
        </div>
        <div className="text-center">
          <div className="text-3xl font-extrabold font-[Space_Grotesk]" style={{ color: scoreColor }}>{SAMPLE_AUDIT.score}</div>
          <div className="text-[10px] font-bold" style={{ color: scoreColor }}>Grade {SAMPLE_AUDIT.grade}</div>
        </div>
      </div>

      {/* Platform grades */}
      <div className="grid grid-cols-4 gap-1.5">
        {SAMPLE_AUDIT.platforms.map(p => (
          <div key={p.name} className="rounded-xl p-2 text-center" style={{ background: "oklch(0.18 0.012 245)" }}>
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white mx-auto mb-1"
              style={{ background: p.color }}
            >{p.icon}</div>
            <div className="text-[9px] font-bold" style={{ color: p.grade === "A" || p.grade === "B" ? "oklch(0.65 0.22 145)" : p.grade === "C" ? "oklch(0.72 0.20 80)" : "oklch(0.65 0.22 20)" }}>
              {p.grade} · {p.score}
            </div>
            <div className="text-[8px]" style={{ color: "oklch(0.50 0.04 245)" }}>{p.name}</div>
          </div>
        ))}
      </div>

      {/* Wins & fixes */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "oklch(0.65 0.22 145)" }}>✓ What's working</p>
          {SAMPLE_AUDIT.wins.map(w => (
            <p key={w} className="text-[9px] leading-snug" style={{ color: "oklch(0.65 0.05 245)" }}>• {w}</p>
          ))}
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "oklch(0.65 0.22 20)" }}>⚠ Fix these first</p>
          {SAMPLE_AUDIT.fixes.map(f => (
            <p key={f} className="text-[9px] leading-snug" style={{ color: "oklch(0.65 0.05 245)" }}>• {f}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Subtle tagline cycler (one line, no colour flash) ────────────────────────
function TaglineCycler({ lines }: { lines: string[] }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % lines.length);
        setVisible(true);
      }, 400);
    }, 3600);
    return () => clearInterval(t);
  }, [lines.length]);

  return (
    <p
      className="text-sm font-medium"
      style={{
        color: "oklch(0.60 0.04 245)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.4s ease",
        minHeight: "1.4rem",
      }}
    >
      {lines[idx]}
    </p>
  );
}

// ── Phone capture illustration ───────────────────────────────────────────────
function PhoneCapture() {
  return (
    <div className="relative flex flex-col items-center">
      {/* Phone shell */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          width: "72px",
          height: "120px",
          background: "oklch(0.12 0.010 245)",
          border: "2px solid oklch(0.32 0.012 245)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
        }}
      >
        {/* Screen — photo being captured */}
        <div className="absolute inset-1 rounded-xl overflow-hidden" style={{ background: "oklch(0.10 0.010 245)" }}>
          {/* Simulated photo scene */}
          <div className="w-full h-full" style={{ background: "linear-gradient(160deg, oklch(0.22 0.08 145 / 0.6), oklch(0.18 0.06 220 / 0.4))" }}>
            {/* Focus reticle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div style={{ width: "28px", height: "28px", border: "1.5px solid oklch(0.72 0.22 80)", borderRadius: "4px" }} />
            </div>
            {/* Platform icons flying out */}
            <div className="absolute top-1 right-1 flex flex-col gap-0.5">
              {["f","in","📸"].map((p, i) => (
                <div key={i} className="w-4 h-4 rounded flex items-center justify-center text-[7px] font-bold text-white"
                  style={{ background: i === 0 ? "oklch(0.45 0.22 240)" : i === 1 ? "oklch(0.45 0.22 220)" : "oklch(0.45 0.22 320)", opacity: 0.85 }}
                >{p}</div>
              ))}
            </div>
          </div>
        </div>
        {/* Shutter button */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: "oklch(0.65 0.22 145)", boxShadow: "0 0 6px oklch(0.65 0.22 145 / 0.6)" }}
        >
          <div className="w-3 h-3 rounded-full" style={{ background: "white", opacity: 0.9 }} />
        </div>
      </div>
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full" style={{ background: "oklch(0.32 0.012 245)" }} />
    </div>
  );
}

// ── Mini score card illustration ────────────────────────────────────────────
function MiniScoreCard() {
  const bars = [72, 41, 88, 55]; // platform scores
  const colors = ["oklch(0.55 0.22 240)", "oklch(0.55 0.22 30)", "oklch(0.55 0.22 145)", "oklch(0.55 0.22 320)"];
  return (
    <div
      className="rounded-xl p-2 flex flex-col gap-1.5"
      style={{ background: "oklch(0.11 0.010 245)", border: "1px solid oklch(0.28 0.012 245 / 0.70)", width: "76px" }}
    >
      {/* Score */}
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-extrabold" style={{ color: "oklch(0.72 0.20 80)", fontFamily: "'Space Grotesk', sans-serif" }}>62</span>
        <span className="text-[8px] font-bold" style={{ color: "oklch(0.50 0.04 245)" }}>/100</span>
      </div>
      {/* Platform bars */}
      {bars.map((v, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="w-full rounded-full overflow-hidden" style={{ height: "4px", background: "oklch(0.20 0.010 245)" }}>
            <div style={{ width: `${v}%`, height: "100%", background: colors[i], borderRadius: "9999px" }} />
          </div>
          <span className="text-[7px] font-bold flex-shrink-0" style={{ color: "oklch(0.50 0.04 245)", width: "14px", textAlign: "right" }}>{v}</span>
        </div>
      ))}
      <p className="text-[7px] font-semibold text-center" style={{ color: "oklch(0.45 0.04 245)" }}>vs competitors</p>
    </div>
  );
}

// ── Cinema Ring Section ─────────────────────────────────────────────────────

// ── Cinema Ring v3 ────────────────────────────────────────────────────────────
const CINEMA_FEATURES = [
  {
    icon: "audit" as const,
    color: "#e8455a", glow: "rgba(232,69,90,0.55)",
    label: ["INSTANT", "AUDIT"],
    urgency: ["YOUR COMPETITORS", "KNOW YOUR WEAKNESSES.", "DO YOU?"],
    headline: ["We expose your entire", "online position in", "60 seconds. Reviews.", "Rankings. Rivals. Truth."],
  },
  {
    icon: "market" as const,
    color: "#f07230", glow: "rgba(240,114,48,0.55)",
    label: ["MARKET", "INTELLIGENCE"],
    urgency: ["WHAT ARE THEY", "CHARGING? WHAT ARE", "THEY OFFERING YOU'RE NOT?"],
    headline: ["Searches. Pricing.", "New services. Reviews.", "We know what your", "rivals do before you do."],
  },
  {
    icon: "content" as const,
    color: "#c8b418", glow: "rgba(200,180,24,0.55)",
    label: ["SNAP · POST", "AI CONTENT"],
    urgency: ["PHOTO IT. WRITE IT.", "OR LET AI DO IT.", "YOU APPROVE. ONE CLICK."],
    headline: ["Every platform.", "Simultaneously.", "Automatically.", "Human verified."],
  },
  {
    icon: "publish" as const,
    color: "#28c87a", glow: "rgba(40,200,122,0.55)",
    label: ["COMMAND", "CENTRE"],
    urgency: ["STOP JUGGLING", "A DOZEN APPS.", "EVERYTHING IS HERE."],
    headline: ["Leads. Payments.", "Appointments. Social.", "One screen.", "Voice activated."],
  },
  {
    icon: "tracking" as const,
    color: "#3090f0", glow: "rgba(48,144,240,0.55)",
    label: ["GROWTH", "SCORECARD"],
    urgency: ["EVERY AGENCY", "PROMISED RESULTS.", "WE PROVE THEM."],
    headline: ["Measured against", "Day 1. Every month.", "Not estimates.", "Actual proof."],
  },
  {
    icon: "growth" as const,
    color: "#9060f0", glow: "rgba(144,96,240,0.55)",
    label: ["MCP CONTENT", "ENGINE"],
    urgency: ["TRENDS START IN", "FORUMS. WE FIND THEM", "BEFORE YOUR RIVALS DO."],
    headline: ["Thousands of posts.", "Blogs. AI engines.", "We spot what's coming", "before it arrives."],
  },
];

type CinemaIconType = "audit" | "market" | "content" | "publish" | "tracking" | "growth";

function CinemaRingSection({ loginUrl }: { loginUrl: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const ringRef = useRef<SVGGElement>(null);
  const handRef = useRef<SVGGElement>(null);
  const hubRef = useRef<SVGGElement>(null);
  const ticksRef = useRef<SVGGElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef(0);
  const totalRotRef = useRef(0);
  const progStartRef = useRef<number | null>(null);
  const progTimerRef = useRef<number | null>(null);
  const initDoneRef = useRef(false);

  const N = CINEMA_FEATURES.length;
  const CX = 400, CY = 400;
  const RADIUS = 262;
  const R_IDLE = 82;
  const R_ACTIVE = 210;
  const AUTO_MS = 7000;

  function svgEl(tag: string, attrs: Record<string, string>): SVGElement {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  function toXY(deg: number, r: number) {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
  }

  function buildTicks() {
    const g = ticksRef.current;
    if (!g) return;
    g.innerHTML = "";
    for (let i = 0; i < 60; i++) {
      const ang = i * 6;
      const major = i % 10 === 0;
      const mid = i % 5 === 0 && !major;
      if (!major && !mid && i % 2 !== 0) continue;
      const ro = 394, len = major ? 14 : mid ? 9 : 5;
      const p1 = toXY(ang, ro), p2 = toXY(ang, ro - len);
      g.appendChild(svgEl("line", {
        x1: String(p1.x), y1: String(p1.y), x2: String(p2.x), y2: String(p2.y),
        stroke: major ? "rgba(212,168,67,0.4)" : "rgba(255,255,255,0.07)",
        "stroke-width": major ? "2" : "0.8", "stroke-linecap": "round",
      }));
    }
  }

  function buildHub() {
    const g = hubRef.current;
    if (!g) return;
    g.innerHTML = "";
    const circles = [
      { r: 136, fill: "url(#hg)", stroke: "rgba(212,168,67,0.22)", sw: "1", cls: "hub-glow-el" },
      { r: 122, fill: "none", stroke: "rgba(212,168,67,0.08)", sw: "1", cls: "" },
      { r: 108, fill: "none", stroke: "rgba(212,168,67,0.05)", sw: "1", cls: "" },
    ];
    circles.forEach(({ r, fill, stroke, sw }) => {
      const c = svgEl("circle", { cx: String(CX), cy: String(CY), r: String(r), fill, stroke, "stroke-width": sw });
      g.appendChild(c);
    });
    const lines: { t: string; cls: string; dy: number }[] = [
      { t: "The World's Most", cls: "hub-t1", dy: -58 },
      { t: "Complete Marketing", cls: "hub-t2", dy: -32 },
      { t: "Intelligence Platform", cls: "hub-t2", dy: -6 },
      { t: "— for every business", cls: "hub-t1", dy: 22 },
      { t: "ready to grow", cls: "hub-t1", dy: 44 },
      { t: "watch · no touch needed", cls: "hub-hint", dy: 72 },
    ];
    lines.forEach(({ t, cls, dy }) => {
      const el = svgEl("text", { x: String(CX), y: String(CY + dy), class: cls });
      el.textContent = t;
      g.appendChild(el);
    });
  }

  function buildNodes() {
    const ring = ringRef.current;
    if (!ring) return;
    ring.innerHTML = "";

    CINEMA_FEATURES.forEach((f, i) => {
      const angle = i * 60;
      const pos = toXY(angle, RADIUS);
      const g = svgEl("g", { class: "cinema-node", id: `nd${i}`, transform: `translate(${pos.x},${pos.y})` });

      // ── IDLE STATE ──
      const idleG = svgEl("g", { id: `idle${i}` });
      idleG.appendChild(svgEl("circle", { cx: "0", cy: "0", r: String(R_IDLE), fill: "url(#ng)", stroke: f.color, "stroke-width": "1", opacity: "0.45" }));
      idleG.appendChild(svgEl("circle", { cx: "0", cy: "0", r: String(R_IDLE - 3), fill: "none", stroke: f.color, "stroke-width": "0.8", opacity: "0.3" }));

      // Icon (idle)
      const idleIcon = svgEl("use", { href: `#ic-${f.icon}`, x: "-20", y: "-32", width: "40", height: "40" });
      idleIcon.setAttribute("style", `color:${f.color};filter:drop-shadow(0 0 4px ${f.glow})`);
      idleG.appendChild(idleIcon);

      // Label
      f.label.forEach((line, li) => {
        const t = svgEl("text", { x: "0", y: String(20 + li * 18), "text-anchor": "middle", "dominant-baseline": "middle", "pointer-events": "none" });
        t.setAttribute("style", `font-family:'Bebas Neue',sans-serif;font-size:15px;fill:#f0ece0;letter-spacing:0.1em;filter:drop-shadow(0 1px 4px rgba(0,0,0,0.98))`);
        t.textContent = line;
        idleG.appendChild(t);
      });
      g.appendChild(idleG);

      // ── ACTIVE STATE ──
      const actG = svgEl("g", { id: `act${i}`, opacity: "0" });
      actG.setAttribute("style", "pointer-events:none");

      actG.appendChild(svgEl("circle", { cx: "0", cy: "0", r: String(R_ACTIVE), fill: "url(#ng)", stroke: f.color, "stroke-width": "2.5",
        style: `filter:drop-shadow(0 0 48px ${f.glow}) drop-shadow(0 0 80px ${f.glow})` }));
      actG.appendChild(svgEl("circle", { cx: "0", cy: "0", r: String(R_ACTIVE - 4), fill: "none", stroke: f.color, "stroke-width": "1", opacity: "0.4" }));
      actG.appendChild(svgEl("circle", { cx: "0", cy: "0", r: String(R_ACTIVE - 14), fill: "none", stroke: f.color, "stroke-width": "0.5", opacity: "0.2" }));

      // Icon (active)
      const actIcon = svgEl("use", { href: `#ic-${f.icon}`, x: "-30", y: String(-R_ACTIVE + 18), width: "60", height: "60" });
      actIcon.setAttribute("style", `color:${f.color};filter:drop-shadow(0 0 8px ${f.glow})`);
      actG.appendChild(actIcon);

      // Divider 1
      const divY = -R_ACTIVE + 90;
      actG.appendChild(svgEl("line", { x1: String(-(R_ACTIVE - 18)), y1: String(divY), x2: String(R_ACTIVE - 18), y2: String(divY), stroke: f.color, "stroke-width": "0.5", opacity: "0.4" }));

      // Urgency text
      f.urgency.forEach((line, li) => {
        const t = svgEl("text", { x: "0", y: String(divY + 24 + li * 19), "text-anchor": "middle", "dominant-baseline": "middle", "pointer-events": "none" });
        t.setAttribute("style", `font-family:'DM Mono',monospace;font-size:14px;fill:${f.color};letter-spacing:0.1em;font-weight:500;filter:drop-shadow(0 1px 6px rgba(0,0,0,0.98))`);
        t.textContent = line;
        actG.appendChild(t);
      });

      // Divider 2
      const div2Y = divY + 24 + f.urgency.length * 19 + 12;
      actG.appendChild(svgEl("line", { x1: String(-(R_ACTIVE - 24)), y1: String(div2Y), x2: String(R_ACTIVE - 24), y2: String(div2Y), stroke: "rgba(255,255,255,0.12)", "stroke-width": "0.5" }));

      // Headline
      f.headline.forEach((line, li) => {
        const t = svgEl("text", { x: "0", y: String(div2Y + 30 + li * 27), "text-anchor": "middle", "dominant-baseline": "middle", "pointer-events": "none" });
        t.setAttribute("style", `font-family:'Playfair Display',serif;font-weight:700;font-size:22px;fill:#f0ece0;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.98))`);
        t.textContent = line;
        actG.appendChild(t);
      });

      g.appendChild(actG);

      // Click handler
      g.addEventListener("click", () => goTo(i));
      ring.appendChild(g);
    });
  }

  function showActive(i: number, show: boolean) {
    const idle = document.getElementById(`idle${i}`);
    const act = document.getElementById(`act${i}`);
    if (!idle || !act) return;
    if (show) {
      idle.style.cssText = "transition:opacity 0.5s ease;opacity:0;pointer-events:none;";
      act.style.cssText = "pointer-events:none;transition:opacity 0.6s ease 0.2s;opacity:1;";
    } else {
      idle.style.cssText = "transition:opacity 0.4s ease;opacity:1;";
      act.style.cssText = "pointer-events:none;transition:opacity 0.3s ease;opacity:0;";
    }
  }

  function goTo(target: number) {
    showActive(currentRef.current, false);

    const targetAngle = target * 60;
    const currentMod = ((totalRotRef.current % 360) + 360) % 360;
    const targetMod = ((-targetAngle % 360) + 360) % 360;
    let delta = targetMod - currentMod;
    if (delta <= 0) delta += 360;
    if (target === currentRef.current) delta = 360;

    totalRotRef.current += delta;
    const totalRot = totalRotRef.current;

    const ring = ringRef.current;
    if (ring) {
      ring.style.cssText = `transform:rotate(${totalRot}deg);transform-origin:${CX}px ${CY}px;transition:transform 1.4s cubic-bezier(0.4,0,0.2,1);`;
    }

    // Counter-rotate each node's content
    for (let j = 0; j < N; j++) {
      const idleEl = document.getElementById(`idle${j}`);
      const actEl = document.getElementById(`act${j}`);
      if (idleEl) idleEl.setAttribute("transform", `rotate(${-totalRot})`);
      if (actEl) actEl.setAttribute("transform", `rotate(${-totalRot})`);
    }

    // Update clock hand
    const hand = handRef.current;
    if (hand) {
      hand.style.cssText = `transform:rotate(${totalRot}deg);transform-origin:${CX}px ${CY}px;transition:transform 1.4s cubic-bezier(0.4,0,0.2,1);`;
    }

    currentRef.current = target;
    setTimeout(() => showActive(currentRef.current, true), 1000);
    startProgress();
  }

  function startProgress() {
    if (progTimerRef.current !== null) cancelAnimationFrame(progTimerRef.current);
    const bar = barRef.current;
    if (!bar) return;
    const feat = CINEMA_FEATURES[currentRef.current];
    bar.style.cssText = `width:0%;transition:none;background:${feat.color}`;
    progStartRef.current = performance.now();

    function tick(now: number) {
      const pct = Math.min((now - (progStartRef.current ?? now)) / AUTO_MS, 1);
      if (bar) bar.style.width = (pct * 100) + "%";
      if (pct < 1) {
        progTimerRef.current = requestAnimationFrame(tick);
      } else {
        if (bar) bar.style.width = "0%";
        goTo((currentRef.current + 1) % N);
      }
    }
    progTimerRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;
    buildTicks();
    buildNodes();
    buildHub();
    // Hide all active states
    for (let i = 0; i < N; i++) {
      const act = document.getElementById(`act${i}`);
      if (act) act.style.opacity = "0";
    }
    const timer = setTimeout(() => {
      showActive(0, true);
      startProgress();
    }, 1400);
    return () => {
      clearTimeout(timer);
      if (progTimerRef.current !== null) cancelAnimationFrame(progTimerRef.current);
    };
  }, []);

  return (
    <section style={{ background: "#02020c", position: "relative", overflow: "hidden", padding: "80px 24px 40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Noise overlay */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")` }} />
      {/* Ambient glow */}
      <div style={{ position: "absolute", width: 900, height: 900, borderRadius: "50%", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none", zIndex: 0, background: "radial-gradient(circle,rgba(212,168,67,0.055) 0%,transparent 68%)" }} />

      {/* Stage */}
      <div style={{ position: "relative", width: "min(760px,96vw)", height: "min(760px,96vw)", flexShrink: 0, zIndex: 1 }}>
        {/* Deco rings */}
        <div style={{ position: "absolute", borderRadius: "50%", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "106%", height: "106%", border: "1px solid rgba(212,168,67,0.07)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", borderRadius: "50%", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "114%", height: "114%", border: "1px dashed rgba(255,255,255,0.025)", pointerEvents: "none", animation: "cinema-spin 80s linear infinite" }} />

        <svg ref={svgRef} viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", overflow: "visible", display: "block" }}>
          <defs>
            {/* Icons */}
            <symbol id="ic-audit" viewBox="0 0 32 32">
              <circle cx="14" cy="14" r="8" fill="none" stroke="currentColor" strokeWidth="2"/>
              <path d="M20 20L26 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M11 14l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </symbol>
            <symbol id="ic-market" viewBox="0 0 32 32">
              <rect x="4" y="18" width="4" height="10" rx="1" fill="currentColor" opacity="0.5"/>
              <rect x="10" y="12" width="4" height="16" rx="1" fill="currentColor" opacity="0.7"/>
              <rect x="16" y="7" width="4" height="21" rx="1" fill="currentColor" opacity="0.85"/>
              <rect x="22" y="14" width="4" height="14" rx="1" fill="currentColor"/>
              <path d="M4 9l6 2 6-5 6 2 5-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="27" cy="5" r="2" fill="currentColor"/>
            </symbol>
            <symbol id="ic-content" viewBox="0 0 32 32">
              <path d="M16 3l3 8.5 9 1.5-7 6.5 1.5 9L16 24l-6.5 4.5 1.5-9L4 13l9-1.5Z" fill="currentColor"/>
            </symbol>
            <symbol id="ic-publish" viewBox="0 0 32 32">
              <path d="M16 3l7 14-7-2-7 2Z" fill="currentColor"/>
              <rect x="14.5" y="15" width="3" height="14" rx="1.5" fill="currentColor"/>
              <path d="M7 24l3 4M25 24l-3 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.55"/>
            </symbol>
            <symbol id="ic-tracking" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
              <circle cx="16" cy="16" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
              <circle cx="16" cy="16" r="3.5" fill="currentColor"/>
              <line x1="16" y1="5" x2="16" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="16" y1="24" x2="16" y2="27" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="5" y1="16" x2="8" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="24" y1="16" x2="27" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </symbol>
            <symbol id="ic-growth" viewBox="0 0 32 32">
              <path d="M3 25l8-8 5 4 6-10 7 4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 11h7v4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="11" cy="17" r="2.5" fill="currentColor"/>
              <circle cx="16" cy="21" r="2.5" fill="currentColor"/>
              <circle cx="22" cy="11" r="2.5" fill="currentColor"/>
            </symbol>
            {/* Gradients */}
            <radialGradient id="ng" cx="35%" cy="28%" r="75%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.07)"/>
              <stop offset="50%" stopColor="rgba(10,10,26,0.97)"/>
              <stop offset="100%" stopColor="rgba(3,3,12,1)"/>
            </radialGradient>
            <radialGradient id="hg" cx="38%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#1c1c3c"/>
              <stop offset="100%" stopColor="#030310"/>
            </radialGradient>
            <linearGradient id="hndG" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="rgba(212,168,67,0)"/>
              <stop offset="100%" stopColor="#d4a843"/>
            </linearGradient>
          </defs>

          {/* Tick marks */}
          <g ref={ticksRef} />

          {/* Clock hand */}
          <g ref={handRef} id="handG">
            <line x1="400" y1="400" x2="400" y2="228" stroke="url(#hndG)" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="400" y1="400" x2="400" y2="436" stroke="rgba(212,168,67,0.22)" strokeWidth="2" strokeLinecap="round"/>
          </g>
          <circle cx="400" cy="400" r="8" fill="#d4a843" style={{ filter: "drop-shadow(0 0 9px rgba(212,168,67,0.9))" }}/>
          <circle cx="400" cy="400" r="3.5" fill="#fff"/>

          {/* Rotating ring (nodes injected by buildNodes) */}
          <g ref={ringRef} />

          {/* Hub (injected by buildHub) */}
          <g ref={hubRef} />
        </svg>

        {/* Progress bar */}
        <div style={{ position: "absolute", bottom: -28, left: "50%", width: 140, height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1, transform: "translateX(-50%)", overflow: "hidden" }}>
          <div ref={barRef} style={{ height: "100%", borderRadius: 1, background: "#d4a843", width: "0%" }} />
        </div>
      </div>

      {/* Tagline */}
      <p style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: "clamp(13px,1.4vw,17px)", color: "rgba(234,230,218,0.45)", textAlign: "center", maxWidth: 560, lineHeight: 1.75, marginTop: 56, zIndex: 1 }}>
        "Staying in the game is smart. Staying ahead of the game is{" "}
        <span style={{ color: "#d4a843", fontStyle: "italic" }}>Blastly.</span>"
      </p>

      {/* Inline keyframes */}
      <style>{`
        @keyframes cinema-spin { to { transform: translate(-50%,-50%) rotate(360deg); } }
        .hub-glow-el { animation: hub-pulse 5s ease-in-out infinite; }
        @keyframes hub-pulse { 0%,100% { filter: drop-shadow(0 0 20px rgba(212,168,67,0.12)); } 50% { filter: drop-shadow(0 0 44px rgba(212,168,67,0.26)); } }
        .hub-t1 { font-family:'Playfair Display',serif; font-style:italic; font-size:14px; fill:rgba(212,168,67,0.82); text-anchor:middle; dominant-baseline:middle; }
        .hub-t2 { font-family:'Playfair Display',serif; font-weight:700; font-size:20px; fill:#ffffff; text-anchor:middle; dominant-baseline:middle; letter-spacing:-0.01em; }
        .hub-hint { font-family:'DM Mono',monospace; font-size:8px; fill:rgba(72,72,96,0.8); text-anchor:middle; dominant-baseline:middle; letter-spacing:0.2em; }
        .cinema-node { cursor:pointer; }
      `}</style>
    </section>
  );
}


// ── Homepage Pricing Section ───────────────────────────────────────────────
function HomePricingSection({ onWatchSnap, onWatchEverything }: { onWatchSnap?: () => void; onWatchEverything?: () => void }) {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const snapFeatures = [
    "Connect all social platforms",
    "3 posts published per week",
    "AI polishes your caption",
    "Basic dashboard",
  ];

  const everythingFeatures = [
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

  function handleSnap() {
    navigate(isAuthenticated ? "/dashboard" : "/signup");
  }

  function handleEverything() {
    navigate(isAuthenticated ? "/dashboard/billing" : "/signup?plan=everything");
  }

  const GOLD = "#d4a843";
  const CARD: React.CSSProperties = {
    background: "oklch(0.13 0.014 245 / 0.95)",
    border: "2px solid oklch(0.50 0.14 200 / 0.85)",
    borderRadius: 16,
    padding: "24px 24px 20px",
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minWidth: 260,
    maxWidth: 400,
    position: "relative",
    alignSelf: "stretch",
  };

  return (
    <section
      id="pricing"
      style={{
        background: "#02020c",
        padding: "48px 24px 40px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 28,
        borderTop: "1px solid rgba(212,168,67,0.10)",
      }}
    >
      {/* Heading */}
      <div style={{ textAlign: "center" }}>
        <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: GOLD, marginBottom: 8 }}>
          Simple pricing
        </p>
        <h2
          style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontSize: "clamp(1.4rem,3vw,2rem)",
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          Two plans. No surprises.
        </h2>
        <p style={{ color: "oklch(0.55 0.04 245)", fontSize: 13, marginTop: 8 }}>
          Start free forever. Upgrade when you’re ready.
        </p>
      </div>

      {/* Plan cards */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          justifyContent: "center",
          width: "100%",
          maxWidth: 940,
        }}
      >
        {/* PLAN 1: Snap & Post (Free) */}
        <div style={CARD}>
          <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "oklch(0.60 0.14 200)", marginBottom: 8 }}>
            Socials Posting
          </p>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>
            Snap &amp; Post
          </h3>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 34, fontWeight: 900, color: "#fff", lineHeight: 1 }}>Free</span>
            <span style={{ color: "oklch(0.50 0.04 245)", fontSize: 13 }}>forever</span>
          </div>
          <p style={{ fontSize: 12, color: "oklch(0.52 0.06 200)", marginBottom: 16, fontWeight: 600 }}>
            No credit card required
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
            {snapFeatures.map(f => (
              <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "oklch(0.78 0.04 245)" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="8" cy="8" r="7.5" stroke="oklch(0.60 0.14 200)" strokeWidth="1"/>
                  <path d="M4.5 8l2.5 2.5 4.5-5" stroke="oklch(0.60 0.14 200)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {f}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={handleSnap}
              style={{
                padding: "11px 0",
                borderRadius: 10,
                border: "1.5px solid oklch(0.60 0.14 200)",
                background: "transparent",
                color: "oklch(0.78 0.14 200)",
                fontFamily: "'Space Grotesk',sans-serif",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                width: "100%",
                transition: "background 0.2s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.60 0.14 200 / 0.12)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              Get Started Free
            </button>
            {onWatchSnap && (
              <button
                onClick={onWatchSnap}
                style={{
                  padding: "8px 0",
                  borderRadius: 10,
                  border: "none",
                  background: "transparent",
                  color: "oklch(0.55 0.04 245)",
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "color 0.2s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "oklch(0.70 0.14 200)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "oklch(0.55 0.04 245)"; }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                Watch it in action
              </button>
            )}
          </div>
        </div>

        {/* PLAN 2: Everything (AU$75/week) */}
        <div
          style={{
            ...CARD,
            border: `2px solid ${GOLD}`,
            background: "oklch(0.14 0.016 245 / 0.98)",
            boxShadow: `0 0 48px oklch(0.65 0.18 60 / 0.12), 0 4px 32px rgba(0,0,0,0.5)`,
          }}
        >
          {/* Popular badge */}
          <div
            style={{
              position: "absolute",
              top: -14,
              left: "50%",
              transform: "translateX(-50%)",
              background: GOLD,
              color: "#02020c",
              fontFamily: "'DM Mono',monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              padding: "4px 16px",
              borderRadius: 99,
              whiteSpace: "nowrap",
            }}
          >
            Most Popular
          </div>
          <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: GOLD, marginBottom: 8 }}>
            All Inclusive
          </p>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>
            Everything
          </h3>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 34, fontWeight: 900, color: GOLD, lineHeight: 1 }}>AU$75</span>
            <span style={{ color: "oklch(0.50 0.04 245)", fontSize: 13 }}>/week</span>
          </div>
          <p style={{ fontSize: 12, color: GOLD, marginBottom: 16, fontWeight: 600 }}>
            14-day free trial · Cancel anytime
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 7 }}>
            {everythingFeatures.map(f => (
              <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "oklch(0.85 0.04 245)" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="8" cy="8" r="7.5" stroke={GOLD} strokeWidth="1"/>
                  <path d="M4.5 8l2.5 2.5 4.5-5" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {f}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={handleEverything}
              style={{
                padding: "11px 0",
                borderRadius: 10,
                border: "none",
                background: `linear-gradient(135deg, ${GOLD}, oklch(0.72 0.20 55))`,
                color: "#02020c",
                fontFamily: "'Space Grotesk',sans-serif",
                fontSize: 15,
                fontWeight: 800,
                cursor: "pointer",
                width: "100%",
                boxShadow: `0 4px 20px oklch(0.65 0.18 60 / 0.35)`,
                transition: "opacity 0.2s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            >
              Start My Free Trial
            </button>
            {onWatchEverything && (
              <button
                onClick={onWatchEverything}
                style={{
                  padding: "8px 0",
                  borderRadius: 10,
                  border: "none",
                  background: "transparent",
                  color: "oklch(0.55 0.04 245)",
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "color 0.2s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = GOLD; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "oklch(0.55 0.04 245)"; }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                Watch it in action
              </button>
            )}
            <p style={{ textAlign: "center", fontSize: 11, color: "oklch(0.45 0.03 245)", marginTop: 2 }}>
              Card charged after 14-day trial. Cancel before day 15 — pay nothing.
            </p>
          </div>
        </div>
      </div>

      {/* Trust line */}
      <p style={{ fontSize: 11, color: "oklch(0.38 0.03 245)", textAlign: "center", maxWidth: 480 }}>
        No lock-in contracts. No setup fees. Switch plans or cancel any time from your dashboard.
      </p>
    </section>
  );
}

const ROW_BASE: React.CSSProperties = {
  background: "oklch(0.15 0.012 245 / 0.85)",
  border: "1px solid oklch(0.28 0.012 245 / 0.60)",
};

function HeroThreePanels({ loginUrl, isAuthenticated }: { loginUrl: string; isAuthenticated: boolean }) {
  const [, navigate] = useLocation();
  const [auditUrl, setAuditUrl] = useState("");
  const [heroTab, setHeroTab] = useState<"trial" | "audit">("trial");
  function runAudit() {
    const trimmed = auditUrl.trim();
    if (!trimmed) return;
    const normalised = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    navigate(`/audit?url=${encodeURIComponent(normalised)}`);
  }

  const BG = "oklch(0.13 0.012 245)";
  const BORDER = "1px solid oklch(0.26 0.012 245 / 0.70)";

  return (
    <>
      {/* ════════════════════════════════════════════════════════════════════
          MASTER HEADLINE — full viewport, centred, bold
      ════════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          paddingTop: "80px", paddingBottom: "80px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: BG,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.42 0.16 220 / 0.08), transparent 70%)",
          }}
        />

        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
          {/* Main headline */}
          <h1
            className="font-extrabold leading-[1.05] tracking-tight mb-4"
            style={{
              fontSize: "clamp(2rem, 5.5vw, 4rem)",
              fontFamily: "'Space Grotesk', sans-serif",
              color: "#fff",
            }}
          >
            The World's Most Complete Marketing
            <br />
            <span
              style={{
                background:
                  "linear-gradient(90deg, oklch(0.75 0.22 145), oklch(0.65 0.20 200))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Intelligence Platform
            </span>
            <br />
            For Small And Medium Business
          </h1>

          {/* Tagline */}
          <p
            className="text-xs md:text-sm mb-6"
            style={{ color: "oklch(0.48 0.03 245)" }}
          >
            Nine layers of real market intelligence — all from one website URL in 60 seconds.
          </p>

          {/* CTA — website URL input */}
          <form
            onSubmit={e => {
              e.preventDefault();
              const trimmed = auditUrl.trim();
              if (!trimmed) return;
              const normalised = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
              window.location.href = `/audit?url=${encodeURIComponent(normalised)}&trial=1`;
            }}
            className="max-w-xl mx-auto"
          >
            <div className="flex items-center gap-3">
              <input
                id="audit-input"
                type="text"
                value={auditUrl}
                onChange={e => setAuditUrl(e.target.value)}
                placeholder="yourwebsite.com.au"
                className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 border focus:outline-none focus:border-emerald-400/60 transition-colors"
                style={{ background: "oklch(0.16 0.012 245 / 0.90)", border: "2px solid rgba(255,255,255,0.55)" }}
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl text-sm font-bold text-white whitespace-nowrap shrink-0"
                style={{ background: "linear-gradient(135deg, oklch(0.52 0.22 145), oklch(0.46 0.20 200))", boxShadow: "0 4px 20px oklch(0.52 0.22 145 / 0.35)" }}
              >
                Free audit →
              </button>
            </div>

          </form>

        </div>




      </section>
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Home() {
  const loginUrl = "/signup";
  const { user, loading, isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [videoModal, setVideoModal] = useState<null | "30sec" | "60sec">(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("focus") === "audit") {
      const tryFocus = () => {
        const el = document.getElementById("audit-input");
        if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus(); }
        else setTimeout(tryFocus, 200);
      };
      setTimeout(tryFocus, 300);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#02020c" }}>
        <div className="flex flex-col items-center gap-4">
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: "0.3em", color: "#d4a843" }}>BLASTLY</div>
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ background: "#02020c", overflowX: "hidden" }}>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 left-0 right-0 z-50"
        style={{
          borderBottom: "1px solid rgba(212,168,67,0.12)",
          background: "rgba(2,2,12,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="container flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <img
              src="/manus-storage/blastly-icon-512_d2809e7c.png"
              alt="Blastly"
              className="h-11 w-11 rounded-xl object-cover"
            />
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: "0.28em", color: "#fff" }}>BLAST<span style={{ color: "#d4a843" }}>LY</span></span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm">
          </div>
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggleButton />
            <a
              href="/login"
              style={{
                fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
                color: "#02020c", textDecoration: "none", fontWeight: 700,
                background: "oklch(0.72 0.22 145)",
                padding: "7px 16px", borderRadius: 4,
                display: "flex", alignItems: "center", gap: 6,
                boxShadow: "0 0 16px oklch(0.72 0.22 145 / 0.35)",
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              Client Login
            </a>
            <a
              href="#audit-input"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById("audit-input");
                if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => el.focus(), 400); }
                else window.scrollTo({ top: 600, behavior: "smooth" });
              }}
              style={{
                fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: "0.2em",
                padding: "8px 20px", background: "#d4a843", color: "#02020c",
                borderRadius: 3, textDecoration: "none",
              }}
            >
              Start Free Audit
            </a>
          </div>
          <div className="md:hidden flex items-center gap-1">
            <ThemeToggleButton />
            <button
              className="p-2"
              style={{ color: "rgba(234,230,218,0.6)" }}
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t px-6 py-4 flex flex-col gap-4 text-sm" style={{ borderTop: "1px solid rgba(212,168,67,0.12)", background: "#02020c" }}>
            <a href="/login" onClick={() => setMobileOpen(false)} style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "oklch(0.72 0.22 145)", fontWeight: 700 }}>Command Centre</a>
            <a
              href="#audit-input"
              onClick={() => {
                setMobileOpen(false);
                setTimeout(() => {
                  const el = document.getElementById("audit-input");
                  if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus(); }
                  else window.scrollTo({ top: 600, behavior: "smooth" });
                }, 100);
              }}
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: "0.2em", padding: "10px 20px", background: "#d4a843", color: "#02020c", borderRadius: 3, textDecoration: "none", textAlign: "center" }}
            >
              Start Free Audit
            </a>
          </div>
        )}
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <HeroThreePanels loginUrl={loginUrl} isAuthenticated={isAuthenticated} />

      {/* ── Cinema Ring ─────────────────────────────────────────────────── */}
      <CinemaRingSection loginUrl={loginUrl} />

      {/* ── Pricing — below the cinema ring ─────────────────────────────── */}
      <HomePricingSection onWatchSnap={() => setVideoModal("30sec")} onWatchEverything={() => setVideoModal("60sec")} />
      {/* VIDEO MODAL */}
      {videoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setVideoModal(null)}
        >
          {/* Wrapper gives relative context so close button anchors above the video card */}
          <div className="relative w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            {/* Close button above the video — never overlaps native volume/fullscreen controls */}
            <button
              onClick={() => setVideoModal(null)}
              className="absolute -top-10 right-0 z-20 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
              style={{ background: "oklch(0.25 0.015 245)" }}
            >
              ✕
            </button>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "oklch(0.10 0.012 245)" }}
          >
            <video
              key={videoModal}
              src={videoModal === "30sec"
                ? "/manus-storage/blastly-30sec_110aea6a.mp4"
                : "/manus-storage/blastly-60sec_d48fb00b.mp4"
              }
              controls
              autoPlay
              muted
              playsInline
              className="w-full"
              style={{ display: "block" }}
            />
            <div className="px-5 py-3">
              <p className="text-white font-semibold text-sm">
                {videoModal === "30sec" ? "Post live in under 30 seconds — 3 clicks, done." : "What is Blastly? — 60-second overview"}
              </p>
             </div>
          </div>
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{
        position: "relative", zIndex: 1,
        padding: "40px 52px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 20,
        borderTop: "1px solid rgba(255,255,255,0.04)",
        background: "#02020c",
      }}>
        <a href="/" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: "0.28em", color: "#fff", textDecoration: "none" }}>
          BLAST<span style={{ color: "#d4a843" }}>LY</span>
        </a>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "#484860", textAlign: "center" }}>
          The World's Most Complete Marketing Intelligence Platform For Small And Medium Business
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {[["Privacy", "/privacy"], ["Terms", "/terms"], ["Contact", "mailto:hello@blastly.ai"]].map(([label, href]) => (
            <a key={label} href={href} style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "#484860", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "#d4a843"}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "#484860"}
            >{label}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
