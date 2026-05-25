import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { saveBrandProfileApi } from "@/lib/workspaceApi";
import { toast } from "sonner";
import {
  Building2, Globe, Palette, Users, Mic2, MicOff, Upload, Check,
  Sparkles, ChevronDown, Loader2, Image as ImageIcon, X,
} from "lucide-react";

const TONE_OPTIONS = [
  { value: "professional", label: "Professional", desc: "Formal, authoritative, expert" },
  { value: "friendly", label: "Friendly", desc: "Warm, approachable, conversational" },
  { value: "playful", label: "Playful", desc: "Fun, energetic, lighthearted" },
  { value: "educational", label: "Educational", desc: "Informative, clear, helpful" },
  { value: "inspirational", label: "Inspirational", desc: "Motivating, uplifting, bold" },
  { value: "bold", label: "Bold", desc: "Direct, confident, assertive" },
  { value: "casual", label: "Casual", desc: "Relaxed, natural, everyday" },
];

const INDUSTRY_OPTIONS = [
  "Technology", "Education", "Health & Wellness", "Finance", "Retail & E-commerce",
  "Food & Beverage", "Travel & Tourism", "Entertainment", "Real Estate", "Marketing",
  "Non-profit", "Gaming", "Fashion", "Sports & Fitness", "Other",
];

function ColorSwatch({ color, label, onChange }: { color: string; label: string; onChange: (c: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div
        className="w-12 h-12 rounded-xl border-2 border-white/10 cursor-pointer relative overflow-hidden shadow-lg transition-transform hover:scale-105"
        style={{ background: color || "#6366f1" }}
        onClick={() => inputRef.current?.click()}
        title="Click to pick colour"
      >
        <input
          ref={inputRef}
          type="color"
          value={color || "#6366f1"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/30 transition-opacity">
          <Palette className="w-4 h-4 text-white" />
        </div>
      </div>
      <span className="text-[10px] font-mono text-muted-foreground">{color || "#6366f1"}</span>
    </div>
  );
}

export default function BrandProfile() {
  const { currentWorkspace, refetch } = useWorkspace();

  const [form, setForm] = useState({
    name: "",
    website: "",
    industry: "",
    description: "",
    primaryColor: "#6366f1",
    secondaryColor: "#f59e0b",
    toneOfVoice: "professional",
    targetAudience: "",
    tagline: "",
    phone: "",
    address: "",
    googleReviewUrl: "",
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const transcribeBrandVoice = trpc.workspace.transcribeBrandVoice.useMutation({
    onSuccess: (data) => {
      setForm(f => ({ ...f, description: data.polished }));
      setIsTranscribing(false);
      toast.success("Voice transcribed!", { description: "Your description has been updated. Review and save." });
    },
    onError: (err) => {
      setIsTranscribing(false);
      toast.error("Transcription failed", { description: err.message });
    },
  });

  async function startRecording() {
    if (!currentWorkspace) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size > 16 * 1024 * 1024) {
          toast.error("Recording too long", { description: "Please keep it under ~10 minutes." });
          setIsTranscribing(false);
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = (ev.target?.result as string).split(",")[1];
          setIsTranscribing(true);
          transcribeBrandVoice.mutate({ workspaceId: currentWorkspace.id, audioBase64: base64, mimeType });
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch {
      toast.error("Microphone access denied", { description: "Please allow microphone access in your browser settings." });
    }
  }

  function stopRecording() {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  // Populate form from current workspace
  useEffect(() => {
    if (currentWorkspace) {
      const ws = currentWorkspace as Record<string, unknown>;
      setForm({
        name: currentWorkspace.name ?? "",
        website: ws.website as string ?? "",
        industry: ws.industry as string ?? "",
        description: ws.description as string ?? "",
        primaryColor: ws.primaryColor as string ?? "#6366f1",
        secondaryColor: ws.secondaryColor as string ?? "#f59e0b",
        toneOfVoice: ws.toneOfVoice as string ?? "professional",
        targetAudience: ws.targetAudience as string ?? "",
        tagline: ws.tagline as string ?? "",
        phone: ws.phone as string ?? "",
        address: ws.address as string ?? "",
        googleReviewUrl: ws.googleReviewUrl as string ?? "",
      });
      if (currentWorkspace.logoUrl) setLogoPreview(currentWorkspace.logoUrl);
    }
  }, [currentWorkspace]);

  async function handleSave() {
    if (!currentWorkspace?.supabaseId) {
      toast.error("No workspace selected");
      return;
    }
    setSaving(true);
    try {
      await saveBrandProfileApi({
        workspaceId: currentWorkspace.supabaseId,
        name: form.name,
        website: form.website,
        industry: form.industry,
        description: form.description,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        toneOfVoice: form.toneOfVoice,
        targetAudience: form.targetAudience,
        tagline: form.tagline,
        phone: form.phone,
        address: form.address,
        googleReviewUrl: form.googleReviewUrl,
        ...(logoBase64 && logoFileName ? { logoBase64, logoFileName } : {}),
      });
      setSaved(true);
      setLogoBase64(null);
      setLogoFileName(null);
      setTimeout(() => setSaved(false), 3000);
      await refetch();
      toast.success("Brand profile saved!", { description: "Your brand identity has been updated." });
    } catch (e) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setSaving(false);
    }
  }

  const processFile = useCallback((file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo too large", { description: "Please use an image under 2MB." });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file type", { description: "Please upload a PNG, JPG, or SVG image." });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setLogoPreview(result);
      setLogoBase64(result.split(",")[1]);
      setLogoFileName(file.name);
      toast.success("Logo ready — click Save Profile to apply it.");
    };
    reader.readAsDataURL(file);
  }, []);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleRemoveLogo() {
    setLogoPreview(null);
    setLogoBase64(null);
    setLogoFileName(null);
  }

  const profileComplete = !!(form.name && form.website && form.description && form.targetAudience);

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-2">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl glass-card flex items-center justify-center">
            <Building2 className="w-5 h-5 text-[oklch(0.72_0.22_220)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-[Space_Grotesk]">Brand Profile</h1>
            <p className="text-sm text-muted-foreground">
              {currentWorkspace?.name ?? "Your brand"} — identity, voice &amp; audience
            </p>
          </div>
        </div>
        {!profileComplete && (
          <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-300">
              Complete your brand profile so the AI composer generates content that sounds exactly like your brand.
            </p>
          </div>
        )}
      </div>

      {/* Logo */}
      <section className="glass-card rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-[oklch(0.72_0.22_220)]" /> Brand Logo
        </h2>

        <label
          htmlFor="logo-file-input"
          className={`flex flex-col items-center justify-center gap-3 w-full min-h-[140px] rounded-xl border-2 border-dashed cursor-pointer transition-all ${
            isDragging
              ? "border-[oklch(0.65_0.28_220)] bg-[oklch(0.65_0.28_220)/0.08]"
              : logoPreview
              ? "border-white/20 bg-[oklch(0.10_0.015_250)]"
              : "border-white/15 bg-[oklch(0.10_0.015_250)] hover:border-[oklch(0.65_0.28_220)/0.5] hover:bg-[oklch(0.65_0.28_220)/0.04]"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {logoPreview ? (
            <div className="relative flex flex-col items-center gap-2 p-4">
              <img
                src={logoPreview}
                alt="Brand logo"
                className="max-h-24 max-w-[200px] object-contain rounded-lg"
              />
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Logo ready
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleRemoveLogo(); }}
                  className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-0.5 transition-colors"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">Click or drag to replace</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="w-12 h-12 rounded-xl bg-[oklch(0.65_0.28_220)/0.12] flex items-center justify-center">
                <Upload className="w-5 h-5 text-[oklch(0.72_0.22_220)]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Upload your logo</p>
                <p className="text-xs text-muted-foreground mt-0.5">Drag &amp; drop or click to browse</p>
                <p className="text-[11px] text-muted-foreground mt-1">PNG, JPG, SVG · max 2 MB</p>
              </div>
            </div>
          )}
        </label>
        <input
          id="logo-file-input"
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
          className="sr-only"
          onChange={handleLogoChange}
        />
      </section>

      {/* Brand name + website */}
      <section className="glass-card rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Globe className="w-4 h-4 text-[oklch(0.72_0.22_220)]" /> About Your Business
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs">Business Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Genius Jungle"
              className="bg-[oklch(0.10_0.015_250)] border-white/10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website" className="text-xs">Website URL</Label>
            <Input
              id="website"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://geniusjungle.com"
              className="bg-[oklch(0.10_0.015_250)] border-white/10"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="industry" className="text-xs">Industry</Label>
          <div className="relative">
            <select
              id="industry"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className="w-full appearance-none bg-[oklch(0.10_0.015_250)] border border-white/10 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.65_0.28_220)/0.4] pr-8"
            >
              <option value="">Select industry…</option>
              {INDUSTRY_OPTIONS.map((ind) => (
                <option key={ind} value={ind.toLowerCase().replace(/[^a-z0-9]+/g, "_")}>{ind}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="description" className="text-xs">What does your business do?</Label>
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              title={isRecording ? "Stop recording" : "Describe your business by voice"}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all
                ${isRecording
                  ? "bg-rose-500/15 text-rose-400 border-rose-500/40 animate-pulse"
                  : isTranscribing
                  ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
                  : "bg-[oklch(0.65_0.28_220)/0.10] text-[oklch(0.72_0.22_220)] border-[oklch(0.65_0.28_220)/0.30] hover:bg-[oklch(0.65_0.28_220)/0.18]"}`}
            >
              {isTranscribing ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Transcribing…</>
              ) : isRecording ? (
                <><MicOff className="h-3 w-3" /> Stop {recordingSeconds > 0 ? `(${recordingSeconds}s)` : ""}</>
              ) : (
                <><Mic2 className="h-3 w-3" /> Speak it</>
              )}
            </button>
          </div>
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs text-rose-400">Recording… speak naturally about your business. Click Stop when done.</span>
            </div>
          )}
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What does your brand do? What problem does it solve? (2-3 sentences)"
            rows={3}
            className="bg-[oklch(0.10_0.015_250)] border-white/10 resize-none"
          />
          <p className="text-[11px] text-muted-foreground">
            The AI uses this to write content that accurately represents your business. Or click <strong>Speak it</strong> to describe your business by voice — the AI will polish it for you.
          </p>
        </div>
      </section>

      {/* Contact & Review Details */}
      <section className="glass-card rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Globe className="w-4 h-4 text-[oklch(0.72_0.22_220)]" /> Contact &amp; Review Details
          <span className="ml-auto text-[10px] font-normal px-2 py-0.5 rounded-full" style={{ background: "oklch(0.65 0.28 220 / 0.12)", color: "oklch(0.72 0.22 220)" }}>Auto-detected from audit</span>
        </h2>
        <p className="text-xs text-muted-foreground">
          These fields are pre-filled from your audit. Review and update them — they're used in review requests, SMS campaigns, and your Command Centre.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="tagline" className="text-xs">Business Tagline</Label>
          <Input
            id="tagline"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            placeholder="e.g. The smarter way to grow your business"
            className="bg-[oklch(0.10_0.015_250)] border-white/10"
          />
          <p className="text-[11px] text-muted-foreground">Shown under your business name in the Command Centre.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs">Business Phone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="e.g. 0412 345 678"
              className="bg-[oklch(0.10_0.015_250)] border-white/10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs">Business Address</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="e.g. 123 Main St, Brisbane QLD"
              className="bg-[oklch(0.10_0.015_250)] border-white/10"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="googleReviewUrl" className="text-xs">Google Review Link</Label>
          <Input
            id="googleReviewUrl"
            value={form.googleReviewUrl}
            onChange={(e) => setForm({ ...form, googleReviewUrl: e.target.value })}
            placeholder="https://g.page/r/YOUR_PLACE_ID/review"
            className="bg-[oklch(0.10_0.015_250)] border-white/10"
          />
          <p className="text-[11px] text-muted-foreground">Used in the Review button in your Command Centre. Find it in Google Business Profile → Get more reviews → Share review form.</p>
        </div>
      </section>

      {/* Brand colours */}
      <section className="glass-card rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Palette className="w-4 h-4 text-[oklch(0.72_0.22_220)]" /> Brand Colours
        </h2>
        <p className="text-xs text-muted-foreground">
          Used when generating AI images and visual content for your brand.
        </p>
        <div className="flex gap-8">
          <ColorSwatch
            color={form.primaryColor}
            label="Primary colour"
            onChange={(c) => setForm({ ...form, primaryColor: c })}
          />
          <ColorSwatch
            color={form.secondaryColor}
            label="Secondary colour"
            onChange={(c) => setForm({ ...form, secondaryColor: c })}
          />
          {/* Live preview */}
          <div className="flex-1 flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Preview</Label>
            <div
              className="flex-1 min-h-[48px] rounded-xl flex items-center justify-center text-xs font-semibold text-white shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${form.primaryColor}, ${form.secondaryColor})`,
              }}
            >
              {form.name || "Your Brand"}
            </div>
          </div>
        </div>
      </section>

      {/* Tone of voice */}
      <section className="glass-card rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Mic2 className="w-4 h-4 text-[oklch(0.72_0.22_220)]" /> Tone of Voice
        </h2>
        <p className="text-xs text-muted-foreground">
          How should your brand sound? The AI composer will match this tone in every post.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {TONE_OPTIONS.map((t) => (
            <button
              key={t.value}
              onClick={() => setForm({ ...form, toneOfVoice: t.value })}
              className={`p-3 rounded-xl border text-left transition-all ${
                form.toneOfVoice === t.value
                  ? "border-[oklch(0.65_0.28_220)/0.6] bg-[oklch(0.65_0.28_220/0.10)] text-foreground"
                  : "border-white/8 bg-[oklch(0.10_0.015_250)] text-muted-foreground hover:border-white/15 hover:text-foreground"
              }`}
            >
              <div className="text-xs font-semibold">{t.label}</div>
              <div className="text-[10px] mt-0.5 opacity-70">{t.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Target audience */}
      <section className="glass-card rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-[oklch(0.72_0.22_220)]" /> Target Audience
        </h2>
        <Textarea
          value={form.targetAudience}
          onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
          placeholder="Who are you talking to? e.g. Parents of children aged 7-18 who want fun, engaging STEM education at home."
          rows={3}
          className="bg-[oklch(0.10_0.015_250)] border-white/10 resize-none"
        />
        <p className="text-[11px] text-muted-foreground">
          The more specific you are, the better the AI will tailor content to your audience.
        </p>
      </section>

      {/* Save */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <p className="text-xs text-muted-foreground">
          {profileComplete ? (
            <span className="text-emerald-400 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Profile complete — AI composer is fully configured
            </span>
          ) : (
            "Fill in all fields for best AI results"
          )}
        </p>
        <Button
          onClick={handleSave}
          disabled={saving || !form.name}
          className="gap-2 bg-[oklch(0.55_0.28_220)] hover:bg-[oklch(0.60_0.28_220)] text-white min-w-[120px]"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
          ) : saved ? (
            <><Check className="w-4 h-4" /> Saved!</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Save Profile</>
          )}
        </Button>
      </div>
    </div>
  );
}
