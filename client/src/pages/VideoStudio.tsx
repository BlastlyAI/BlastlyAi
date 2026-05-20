import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Video, Sparkles, Play, Clock, Hash, Lightbulb, TrendingUp,
  Copy, ChevronDown, ChevronUp, Zap, BarChart3, Film, Mic,
  Youtube, Music2, Loader2, CheckCircle2, ArrowRight, Star, Wand2
} from "lucide-react";

const PLATFORMS = [
  { id: "tiktok", label: "TikTok", icon: "🎵", color: "oklch(0.65 0.22 25)", desc: "15–60s vertical" },
  { id: "youtube", label: "YouTube", icon: "▶️", color: "oklch(0.62 0.24 25)", desc: "60s–10min horizontal" },
  { id: "instagram", label: "Instagram Reels", icon: "📸", color: "oklch(0.65 0.24 330)", desc: "15–90s vertical" },
  { id: "facebook", label: "Facebook", icon: "👥", color: "oklch(0.55 0.22 250)", desc: "Up to 4 min" },
  { id: "twitter", label: "Twitter / X", icon: "✖️", color: "oklch(0.72 0.01 265)", desc: "Up to 140s" },
  { id: "linkedin", label: "LinkedIn", icon: "💼", color: "oklch(0.58 0.22 240)", desc: "Up to 10 min" },
] as const;

const TONES = [
  { id: "energetic", label: "⚡ Energetic", desc: "High-energy, fast-paced" },
  { id: "professional", label: "💼 Professional", desc: "Polished, authoritative" },
  { id: "casual", label: "😊 Casual", desc: "Friendly, conversational" },
  { id: "inspirational", label: "✨ Inspirational", desc: "Motivational, uplifting" },
  { id: "humorous", label: "😄 Humorous", desc: "Funny, entertaining" },
] as const;

const FORMATS = [
  { id: "short", label: "Short-form", desc: "15–60 seconds" },
  { id: "reel", label: "Reel / Story", desc: "15–30 seconds" },
  { id: "long", label: "Long-form", desc: "2–10 minutes" },
  { id: "story", label: "Story", desc: "Up to 15 seconds" },
] as const;

type ScriptData = {
  title: string;
  hook: string;
  script: string;
  scenes: Array<{
    sceneNumber: number;
    duration: number;
    visualDescription: string;
    voiceover: string;
    textOverlay: string;
    transition: string;
  }>;
  captions: Array<{ startTime: number; endTime: number; text: string }>;
  hashtags: string[];
  estimatedDuration: number;
  thumbnailConcept: string;
  platformTips: string[];
  voiceoverNotes: string;
};

type PredictionData = {
  overallScore: number;
  viralityScore: number;
  hookStrength: number;
  retentionScore: number;
  ctaEffectiveness: number;
  predictedViews: string;
  predictedEngagementRate: string;
  strengths: string[];
  improvements: string[];
  bestPostingTime: string;
  competitiveAnalysis: string;
};

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={radius} fill="none" stroke="oklch(0.18 0.025 265)" strokeWidth="4" />
          <circle
            cx="32" cy="32" r={radius} fill="none"
            stroke={color} strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold" style={{ color: "oklch(0.92 0.010 265)", fontFamily: "'Syne', sans-serif" }}>{score}</span>
        </div>
      </div>
      <span className="text-[10px] text-center" style={{ color: "oklch(0.52 0.018 265)" }}>{label}</span>
    </div>
  );
}

export default function VideoStudio() {
  const { currentWorkspace } = useWorkspace();
  const [platform, setPlatform] = useState<typeof PLATFORMS[number]["id"]>("tiktok");
  const [format, setFormat] = useState<typeof FORMATS[number]["id"]>("short");
  const [tone, setTone] = useState<typeof TONES[number]["id"]>("energetic");
  const [prompt, setPrompt] = useState("");
  const [brandName, setBrandName] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [callToAction, setCallToAction] = useState("");
  const [generatedScript, setGeneratedScript] = useState<ScriptData | null>(null);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [expandedScene, setExpandedScene] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState("create");

  const workspaceId = currentWorkspace?.id ?? 0;

  const generateMutation = trpc.video.generateScript.useMutation({
    onSuccess: (data) => {
      setGeneratedScript(data.script as ScriptData);
      setActiveTab("script");
      toast.success("Video script generated!", { description: `"${(data.script as ScriptData).title}" is ready to review.` });
    },
    onError: (err) => toast.error("Generation failed", { description: err.message }),
  });

  const predictMutation = trpc.video.predictPerformance.useMutation({
    onSuccess: (data) => {
      setPrediction(data as PredictionData);
      setActiveTab("predict");
    },
    onError: (err) => toast.error("Prediction failed", { description: err.message }),
  });

  const { data: projects } = trpc.video.listProjects.useQuery(
    { workspaceId },
    { enabled: workspaceId > 0 }
  );

  const handleGenerate = () => {
    if (!prompt.trim()) { toast.error("Please describe your video"); return; }
    if (!workspaceId) { toast.error("No workspace selected"); return; }
    generateMutation.mutate({
      workspaceId,
      platform,
      format,
      tone,
      prompt: prompt.trim(),
      brandName: brandName || undefined,
      targetAudience: targetAudience || undefined,
      callToAction: callToAction || undefined,
    });
  };

  const handlePredict = () => {
    if (!generatedScript) return;
    predictMutation.mutate({
      platform,
      format,
      script: generatedScript.script,
      hashtags: generatedScript.hashtags,
    });
  };

  const selectedPlatform = PLATFORMS.find(p => p.id === platform)!;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, oklch(0.62 0.24 25 / 0.2), oklch(0.80 0.18 75 / 0.15))", border: "1px solid oklch(0.62 0.24 25 / 0.3)" }}>
                <Video className="w-5 h-5" style={{ color: "oklch(0.80 0.18 75)" }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "oklch(0.96 0.008 265)" }}>
                  AI Video Studio
                </h1>
                <p className="text-sm" style={{ color: "oklch(0.56 0.018 265)" }}>
                  Generate TikTok &amp; YouTube marketing videos from a prompt
                </p>
              </div>
            </div>
          </div>
          <Badge className="text-xs px-3 py-1" style={{ background: "oklch(0.62 0.24 25 / 0.15)", color: "oklch(0.80 0.18 75)", border: "1px solid oklch(0.62 0.24 25 / 0.3)" }}>
            ✨ AI-Powered
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6" style={{ background: "oklch(0.13 0.022 265)", border: "1px solid oklch(0.22 0.025 265)" }}>
            <TabsTrigger value="create" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <Sparkles className="w-4 h-4 mr-1.5" />Create
            </TabsTrigger>
            <TabsTrigger value="script" disabled={!generatedScript} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <Film className="w-4 h-4 mr-1.5" />Script
            </TabsTrigger>
            <TabsTrigger value="predict" disabled={!prediction} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <BarChart3 className="w-4 h-4 mr-1.5" />Performance
            </TabsTrigger>
            <TabsTrigger value="history" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <Clock className="w-4 h-4 mr-1.5" />History
            </TabsTrigger>
          </TabsList>

          {/* ── CREATE TAB ─────────────────────────────────────────────── */}
          <TabsContent value="create">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left — Platform + Settings */}
              <div className="space-y-5">
                {/* Platform selector */}
                <div className="rounded-2xl p-5" style={{ background: "oklch(0.13 0.022 265)", border: "1px solid oklch(0.22 0.025 265)" }}>
                  <h3 className="text-sm font-bold mb-4" style={{ color: "oklch(0.90 0.010 265)", fontFamily: "'Syne', sans-serif" }}>
                    Target Platform
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPlatform(p.id)}
                        className="flex flex-col items-start p-3 rounded-xl text-left transition-all"
                        style={{
                          background: platform === p.id ? `${p.color}18` : "oklch(0.16 0.022 265)",
                          border: `1px solid ${platform === p.id ? `${p.color}50` : "oklch(0.22 0.025 265)"}`,
                        }}
                      >
                        <span className="text-lg mb-1">{p.icon}</span>
                        <span className="text-xs font-semibold" style={{ color: platform === p.id ? p.color : "oklch(0.80 0.010 265)" }}>{p.label}</span>
                        <span className="text-[10px]" style={{ color: "oklch(0.50 0.015 265)" }}>{p.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Format */}
                <div className="rounded-2xl p-5" style={{ background: "oklch(0.13 0.022 265)", border: "1px solid oklch(0.22 0.025 265)" }}>
                  <h3 className="text-sm font-bold mb-3" style={{ color: "oklch(0.90 0.010 265)", fontFamily: "'Syne', sans-serif" }}>Video Format</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {FORMATS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFormat(f.id)}
                        className="p-2.5 rounded-xl text-left transition-all"
                        style={{
                          background: format === f.id ? "oklch(0.62 0.26 280 / 0.15)" : "oklch(0.16 0.022 265)",
                          border: `1px solid ${format === f.id ? "oklch(0.62 0.26 280 / 0.4)" : "oklch(0.22 0.025 265)"}`,
                        }}
                      >
                        <p className="text-xs font-semibold" style={{ color: format === f.id ? "oklch(0.75 0.22 280)" : "oklch(0.80 0.010 265)" }}>{f.label}</p>
                        <p className="text-[10px]" style={{ color: "oklch(0.50 0.015 265)" }}>{f.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tone */}
                <div className="rounded-2xl p-5" style={{ background: "oklch(0.13 0.022 265)", border: "1px solid oklch(0.22 0.025 265)" }}>
                  <h3 className="text-sm font-bold mb-3" style={{ color: "oklch(0.90 0.010 265)", fontFamily: "'Syne', sans-serif" }}>Tone &amp; Style</h3>
                  <div className="space-y-1.5">
                    {TONES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTone(t.id)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl transition-all"
                        style={{
                          background: tone === t.id ? "oklch(0.62 0.26 280 / 0.12)" : "transparent",
                          border: `1px solid ${tone === t.id ? "oklch(0.62 0.26 280 / 0.35)" : "transparent"}`,
                        }}
                      >
                        <span className="text-xs font-medium" style={{ color: "oklch(0.82 0.012 265)" }}>{t.label}</span>
                        <span className="text-[10px]" style={{ color: "oklch(0.50 0.015 265)" }}>{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right — Prompt + Options */}
              <div className="lg:col-span-2 space-y-5">
                <div className="rounded-2xl p-6" style={{ background: "oklch(0.13 0.022 265)", border: "1px solid oklch(0.22 0.025 265)" }}>
                  <h3 className="text-sm font-bold mb-4" style={{ color: "oklch(0.90 0.010 265)", fontFamily: "'Syne', sans-serif" }}>
                    Describe Your Video
                  </h3>
                  <Textarea
                    placeholder={`Describe what you want to promote...\n\nExamples:\n• "Our new AI fitness app that creates personalised workout plans"\n• "Summer sale — 50% off all products at TechStore"\n• "How our accounting software saves small businesses 10 hours a week"`}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[160px] text-sm resize-none mb-4"
                    style={{
                      background: "oklch(0.10 0.018 265)",
                      border: "1px solid oklch(0.22 0.025 265)",
                      color: "oklch(0.88 0.010 265)",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.60 0.018 265)" }}>Brand Name (optional)</Label>
                      <Input
                        placeholder="e.g. Blastly"
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        className="text-sm h-9"
                        style={{ background: "oklch(0.10 0.018 265)", border: "1px solid oklch(0.22 0.025 265)", color: "oklch(0.88 0.010 265)" }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.60 0.018 265)" }}>Target Audience (optional)</Label>
                      <Input
                        placeholder="e.g. Small business owners"
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        className="text-sm h-9"
                        style={{ background: "oklch(0.10 0.018 265)", border: "1px solid oklch(0.22 0.025 265)", color: "oklch(0.88 0.010 265)" }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block" style={{ color: "oklch(0.60 0.018 265)" }}>Call to Action (optional)</Label>
                      <Input
                        placeholder="e.g. Start free trial"
                        value={callToAction}
                        onChange={(e) => setCallToAction(e.target.value)}
                        className="text-sm h-9"
                        style={{ background: "oklch(0.10 0.018 265)", border: "1px solid oklch(0.22 0.025 265)", color: "oklch(0.88 0.010 265)" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Generate button */}
                <button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !prompt.trim()}
                  className="w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed btn-glow"
                  style={{ color: "oklch(0.99 0.002 265)" }}
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating your {selectedPlatform.label} script...
                    </>
                  ) : (
                    <>
                      <Video className="w-5 h-5" />
                      Generate {selectedPlatform.icon} {selectedPlatform.label} Video Script
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* What you'll get */}
                <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.018 265)", border: "1px solid oklch(0.18 0.022 265)" }}>
                  <h4 className="text-xs font-bold mb-3 uppercase tracking-widest" style={{ color: "oklch(0.52 0.018 265)" }}>What you'll receive</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { icon: Mic, label: "Full voiceover script", color: "oklch(0.65 0.26 280)" },
                      { icon: Film, label: "Scene-by-scene breakdown", color: "oklch(0.72 0.22 160)" },
                      { icon: Hash, label: "Optimised hashtags", color: "oklch(0.80 0.18 75)" },
                      { icon: Lightbulb, label: "Thumbnail concept", color: "oklch(0.65 0.24 330)" },
                    ].map(({ icon: Icon, label, color }) => (
                      <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl text-center"
                        style={{ background: "oklch(0.14 0.022 265)" }}>
                        <Icon className="w-4 h-4" style={{ color }} />
                        <span className="text-[10px] leading-tight" style={{ color: "oklch(0.60 0.018 265)" }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── SCRIPT TAB ─────────────────────────────────────────────── */}
          <TabsContent value="script">
            {generatedScript && (
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Script overview */}
                <div className="lg:col-span-2 space-y-5">
                  {/* Title + hook */}
                  <div className="rounded-2xl p-6" style={{ background: "oklch(0.13 0.022 265)", border: "1px solid oklch(0.22 0.025 265)" }}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Syne', sans-serif", color: "oklch(0.96 0.008 265)" }}>
                          {generatedScript.title}
                        </h2>
                        <div className="flex items-center gap-3 text-xs" style={{ color: "oklch(0.56 0.018 265)" }}>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{generatedScript.estimatedDuration}s</span>
                          <span>{selectedPlatform.icon} {selectedPlatform.label}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText(generatedScript.script); toast.success("Script copied!"); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={{ background: "oklch(0.18 0.025 265)", color: "oklch(0.72 0.015 265)" }}
                      >
                        <Copy className="w-3.5 h-3.5" />Copy script
                      </button>
                    </div>

                    {/* Hook */}
                    <div className="rounded-xl p-4 mb-4" style={{ background: "oklch(0.62 0.26 280 / 0.08)", border: "1px solid oklch(0.62 0.26 280 / 0.2)" }}>
                      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "oklch(0.72 0.22 280)" }}>
                        ⚡ Opening Hook (first 3 seconds)
                      </p>
                      <p className="text-sm font-semibold" style={{ color: "oklch(0.90 0.010 265)" }}>{generatedScript.hook}</p>
                    </div>

                    {/* Full script */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "oklch(0.52 0.018 265)" }}>Full Voiceover Script</p>
                      <div className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap"
                        style={{ background: "oklch(0.10 0.018 265)", color: "oklch(0.78 0.012 265)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {generatedScript.script}
                      </div>
                    </div>
                  </div>

                  {/* Scene breakdown */}
                  <div className="rounded-2xl p-6" style={{ background: "oklch(0.13 0.022 265)", border: "1px solid oklch(0.22 0.025 265)" }}>
                    <h3 className="text-sm font-bold mb-4" style={{ color: "oklch(0.90 0.010 265)", fontFamily: "'Syne', sans-serif" }}>
                      Scene-by-Scene Breakdown
                    </h3>
                    <div className="space-y-2">
                      {generatedScript.scenes.map((scene) => (
                        <div key={scene.sceneNumber} className="rounded-xl overflow-hidden"
                          style={{ border: "1px solid oklch(0.20 0.025 265)" }}>
                          <button
                            onClick={() => setExpandedScene(expandedScene === scene.sceneNumber ? null : scene.sceneNumber)}
                            className="w-full flex items-center justify-between p-3.5 text-left transition-colors"
                            style={{ background: expandedScene === scene.sceneNumber ? "oklch(0.16 0.025 265)" : "oklch(0.12 0.020 265)" }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                                style={{ background: "oklch(0.62 0.26 280 / 0.15)", color: "oklch(0.72 0.22 280)" }}>
                                {scene.sceneNumber}
                              </div>
                              <div>
                                <p className="text-xs font-semibold" style={{ color: "oklch(0.85 0.010 265)" }}>
                                  Scene {scene.sceneNumber} · {scene.duration}s
                                </p>
                                <p className="text-[10px]" style={{ color: "oklch(0.52 0.018 265)" }}>
                                  {scene.visualDescription.slice(0, 60)}...
                                </p>
                              </div>
                            </div>
                            {expandedScene === scene.sceneNumber
                              ? <ChevronUp className="w-4 h-4" style={{ color: "oklch(0.52 0.018 265)" }} />
                              : <ChevronDown className="w-4 h-4" style={{ color: "oklch(0.52 0.018 265)" }} />
                            }
                          </button>
                          {expandedScene === scene.sceneNumber && (
                            <div className="p-4 space-y-3" style={{ background: "oklch(0.11 0.018 265)" }}>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "oklch(0.50 0.015 265)" }}>Visual</p>
                                <p className="text-xs" style={{ color: "oklch(0.75 0.012 265)" }}>{scene.visualDescription}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "oklch(0.50 0.015 265)" }}>Voiceover</p>
                                <p className="text-xs italic" style={{ color: "oklch(0.78 0.012 265)" }}>"{scene.voiceover}"</p>
                              </div>
                              {scene.textOverlay && (
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "oklch(0.50 0.015 265)" }}>On-Screen Text</p>
                                  <span className="inline-block px-2 py-0.5 rounded text-xs font-bold"
                                    style={{ background: "oklch(0.80 0.18 75 / 0.15)", color: "oklch(0.80 0.18 75)" }}>
                                    {scene.textOverlay}
                                  </span>
                                </div>
                              )}
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "oklch(0.50 0.015 265)" }}>Transition</p>
                                <span className="text-[10px] px-2 py-0.5 rounded"
                                  style={{ background: "oklch(0.18 0.025 265)", color: "oklch(0.60 0.018 265)" }}>
                                  {scene.transition}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right sidebar */}
                <div className="space-y-5">
                  {/* Hashtags */}
                  <div className="rounded-2xl p-5" style={{ background: "oklch(0.13 0.022 265)", border: "1px solid oklch(0.22 0.025 265)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold" style={{ color: "oklch(0.90 0.010 265)", fontFamily: "'Syne', sans-serif" }}>Hashtags</h3>
                      <button
                        onClick={() => { navigator.clipboard.writeText(generatedScript.hashtags.map(h => `#${h}`).join(" ")); toast.success("Hashtags copied!"); }}
                        className="text-[10px] flex items-center gap-1"
                        style={{ color: "oklch(0.56 0.018 265)" }}
                      >
                        <Copy className="w-3 h-3" />Copy all
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {generatedScript.hashtags.map((tag) => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "oklch(0.62 0.26 280 / 0.12)", color: "oklch(0.72 0.22 280)", border: "1px solid oklch(0.62 0.26 280 / 0.2)" }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Thumbnail concept */}
                  <div className="rounded-2xl p-5" style={{ background: "oklch(0.13 0.022 265)", border: "1px solid oklch(0.22 0.025 265)" }}>
                    <h3 className="text-sm font-bold mb-2" style={{ color: "oklch(0.90 0.010 265)", fontFamily: "'Syne', sans-serif" }}>Thumbnail Concept</h3>
                    <p className="text-xs leading-relaxed" style={{ color: "oklch(0.62 0.018 265)" }}>{generatedScript.thumbnailConcept}</p>
                  </div>

                  {/* Voiceover notes */}
                  <div className="rounded-2xl p-5" style={{ background: "oklch(0.13 0.022 265)", border: "1px solid oklch(0.22 0.025 265)" }}>
                    <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: "oklch(0.90 0.010 265)", fontFamily: "'Syne', sans-serif" }}>
                      <Mic className="w-4 h-4" style={{ color: "oklch(0.65 0.26 280)" }} />Voiceover Notes
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: "oklch(0.62 0.018 265)" }}>{generatedScript.voiceoverNotes}</p>
                  </div>

                  {/* Platform tips */}
                  <div className="rounded-2xl p-5" style={{ background: "oklch(0.13 0.022 265)", border: "1px solid oklch(0.22 0.025 265)" }}>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "oklch(0.90 0.010 265)", fontFamily: "'Syne', sans-serif" }}>
                      <TrendingUp className="w-4 h-4" style={{ color: "oklch(0.72 0.22 160)" }} />{selectedPlatform.label} Tips
                    </h3>
                    <div className="space-y-2">
                      {generatedScript.platformTips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "oklch(0.68 0.015 265)" }}>
                          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "oklch(0.72 0.22 160)" }} />
                          {tip}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Predict performance CTA */}
                  <button
                    onClick={handlePredict}
                    disabled={predictMutation.isPending}
                    className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: "linear-gradient(135deg, oklch(0.68 0.22 160 / 0.15), oklch(0.72 0.22 160 / 0.10))",
                      border: "1px solid oklch(0.68 0.22 160 / 0.3)",
                      color: "oklch(0.72 0.22 160)"
                    }}
                  >
                    {predictMutation.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Predicting...</>
                      : <><BarChart3 className="w-4 h-4" />Predict Performance</>
                    }
                  </button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── PERFORMANCE TAB ────────────────────────────────────────── */}
          <TabsContent value="predict">
            {prediction && (
              <div className="max-w-xl space-y-5">
                {/* Overall pass/fail */}
                {(() => {
                  const overall = prediction.overallScore ?? 0;
                  const passed = overall >= 50;
                  return (
                    <div className={`rounded-2xl border-2 p-5 flex items-center gap-5 ${passed ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                      <div className="text-center shrink-0">
                        <div className={`text-5xl font-black tabular-nums ${passed ? "text-emerald-600" : "text-red-500"}`}>{overall}</div>
                        <div className="text-xs text-gray-400">/100</div>
                      </div>
                      <div>
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold mb-1 ${passed ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
                          {passed ? "✓ LIKELY TO PERFORM" : "✗ NEEDS IMPROVEMENT"}
                        </div>
                        <p className="text-xs text-gray-600">Best time to post: <span className="font-semibold">{prediction.bestPostingTime}</span></p>
                        <p className="text-xs text-gray-600 mt-0.5">Predicted views: <span className="font-semibold">{prediction.predictedViews}</span> · Engagement: <span className="font-semibold">{prediction.predictedEngagementRate}</span></p>
                      </div>
                    </div>
                  );
                })()}

                {/* Score bars */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900">Score Breakdown</h3>
                  {[
                    { label: "Virality Potential",    score: prediction.viralityScore },
                    { label: "Hook Strength",         score: prediction.hookStrength },
                    { label: "Audience Retention",    score: prediction.retentionScore },
                    { label: "Call-to-Action",        score: prediction.ctaEffectiveness },
                  ].map(({ label, score }) => {
                    const pct = Math.min(100, Math.max(0, score ?? 0));
                    const barCls = pct >= 75 ? "from-emerald-400 to-emerald-500" : pct >= 50 ? "from-amber-400 to-amber-500" : "from-red-400 to-red-500";
                    const txtCls = pct >= 75 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-500";
                    return (
                      <div key={label} className="flex items-center gap-4">
                        <span className="w-40 shrink-0 text-sm font-medium text-gray-700">{label}</span>
                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full bg-gradient-to-r ${barCls} transition-all duration-700`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`w-14 text-right text-sm font-bold tabular-nums ${txtCls}`}>{pct}<span className="text-gray-400 font-normal">/100</span></span>
                      </div>
                    );
                  })}
                </div>

                {/* CTA box */}
                <div className="bg-gradient-to-br from-blue-600 to-emerald-500 rounded-2xl p-5 text-white text-center">
                  <Wand2 className="w-7 h-7 mx-auto mb-2 opacity-90" />
                  <h3 className="text-base font-bold mb-1">Want a higher-scoring ad?</h3>
                  <p className="text-xs opacity-85 mb-3">Blastly will redesign this script to maximise virality and engagement based on your scores.</p>
                  <button
                    onClick={() => setActiveTab("create")}
                    className="bg-white text-blue-700 hover:bg-gray-100 font-bold px-6 py-2 rounded-xl text-sm transition-colors"
                  >
                    Optimise My Script
                  </button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── HISTORY TAB ────────────────────────────────────────────── */}
          <TabsContent value="history">
            <div className="space-y-3">
              {!projects || projects.length === 0 ? (
                <div className="text-center py-16">
                  <Video className="w-12 h-12 mx-auto mb-4" style={{ color: "oklch(0.30 0.020 265)" }} />
                  <p className="text-sm font-semibold mb-1" style={{ color: "oklch(0.60 0.018 265)" }}>No video projects yet</p>
                  <p className="text-xs" style={{ color: "oklch(0.42 0.015 265)" }}>Generate your first video script to get started</p>
                </div>
              ) : (
                projects.map((project) => {
                  const meta = project.metadata as Record<string, unknown> | null;
                  return (
                    <div key={project.id} className="rounded-2xl p-5 flex items-center justify-between gap-4"
                      style={{ background: "oklch(0.13 0.022 265)", border: "1px solid oklch(0.22 0.025 265)" }}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                          style={{ background: "oklch(0.16 0.022 265)" }}>
                          {PLATFORMS.find(p => p.id === project.platform)?.icon ?? "🎬"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "oklch(0.90 0.010 265)" }}>{project.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: "oklch(0.52 0.018 265)" }}>
                            <span>{PLATFORMS.find(p => p.id === project.platform)?.label}</span>
                            <span>·</span>
                            <span>{project.format}</span>
                            {meta?.estimatedDuration != null && <><span>·</span><span>{String(meta.estimatedDuration)}s</span></>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{
                            background: project.status === "ready" ? "oklch(0.72 0.22 160 / 0.15)" : "oklch(0.62 0.26 280 / 0.15)",
                            color: project.status === "ready" ? "oklch(0.72 0.22 160)" : "oklch(0.72 0.22 280)",
                          }}>
                          {project.status}
                        </span>
                        <span className="text-xs" style={{ color: "oklch(0.42 0.015 265)" }}>
                          {new Date(project.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
