import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Save, Upload, Trash2, Loader2, CheckCircle2, ImageIcon,
  Shield, Mic2, Palette, BookOpen, AlertCircle
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";

const TONE_OPTIONS = [
  { value: "professional", label: "Professional — formal, authoritative" },
  { value: "friendly", label: "Friendly — warm, approachable" },
  { value: "bold", label: "Bold — confident, direct" },
  { value: "nurturing", label: "Nurturing — caring, supportive" },
  { value: "humorous", label: "Humorous — light-hearted, witty" },
  { value: "authoritative", label: "Authoritative — expert, commanding" },
  { value: "casual", label: "Casual — relaxed, conversational" },
];

function Section({ icon: Icon, title, description, children }: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4.5 h-4.5 text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">{title}</h3>
          <p className="text-xs text-white/40 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export default function BrandBrief() {
  const { user } = useAuth();
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    businessDescription: "",
    productsServices: "",
    differentiators: "",
    neverSay: "",
    targetAudience: "",
    tone: "friendly" as const,
    approvedPhrases: "",
    avoidPhrases: "",
    brandColors: [] as string[],
    complianceRules: "",
    noPriceClaims: false,
    noTestimonials: false,
    noCompetitorMentions: true,
  });
  const [colorInput, setColorInput] = useState("");

  // Get workspace
  const { data: workspaces } = trpc.workspace.list.useQuery();
  useEffect(() => {
    if (workspaces && workspaces.length > 0) setWorkspaceId(workspaces[0].id);
  }, [workspaces]);

  // Load existing brief
  const { data: brief, isLoading } = trpc.brandBrief.get.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );
  useEffect(() => {
    if (brief) {
      setForm({
        businessDescription: brief.businessDescription ?? "",
        productsServices: brief.productsServices ?? "",
        differentiators: brief.differentiators ?? "",
        neverSay: brief.neverSay ?? "",
        targetAudience: brief.targetAudience ?? "",
        tone: (brief.tone as typeof form.tone) ?? "friendly",
        approvedPhrases: brief.approvedPhrases ?? "",
        avoidPhrases: brief.avoidPhrases ?? "",
        brandColors: (brief.brandColors as string[]) ?? [],
        complianceRules: brief.complianceRules ?? "",
        noPriceClaims: brief.noPriceClaims ?? false,
        noTestimonials: brief.noTestimonials ?? false,
        noCompetitorMentions: brief.noCompetitorMentions ?? true,
      });
    }
  }, [brief]);

  // Save brief
  const saveMutation = trpc.brandBrief.save.useMutation({
    onSuccess: () => {
      setSaved(true);
      toast.success("Brand brief saved — AI will use this for all future content");
      setTimeout(() => setSaved(false), 3000);
    },
    onError: () => toast.error("Failed to save brand brief"),
  });

  // Photos
  const { data: photos, refetch: refetchPhotos } = trpc.brandBrief.getPhotos.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );
  const uploadPhotoMutation = trpc.brandBrief.uploadPhoto.useMutation({
    onSuccess: () => { toast.success("Photo added to library"); refetchPhotos(); },
    onError: () => toast.error("Failed to upload photo"),
  });
  const deletePhotoMutation = trpc.brandBrief.deletePhoto.useMutation({
    onSuccess: () => { toast.success("Photo removed"); refetchPhotos(); },
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspaceId) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Photo must be under 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadPhotoMutation.mutate({
        workspaceId,
        fileBase64: base64,
        mimeType: file.type,
        label: file.name.replace(/\.[^.]+$/, ""),
      });
    };
    reader.readAsDataURL(file);
  };

  const addColor = () => {
    const hex = colorInput.trim();
    if (!hex || form.brandColors.includes(hex)) return;
    setForm(f => ({ ...f, brandColors: [...f.brandColors, hex] }));
    setColorInput("");
  };

  const set = (key: keyof typeof form) => (val: string | boolean) =>
    setForm(f => ({ ...f, [key]: val }));

  if (isLoading || !workspaceId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Brand Brief</h1>
            <p className="text-sm text-white/50 mt-1">
              The AI reads this before generating any content. Fill it in once — keep it accurate.
            </p>
          </div>
          <Button
            onClick={() => saveMutation.mutate({ workspaceId, ...form })}
            disabled={saveMutation.isPending || saved}
            className="bg-blue-600 hover:bg-blue-500 text-white gap-2 flex-shrink-0"
          >
            {saveMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : saved
              ? <CheckCircle2 className="w-4 h-4" />
              : <Save className="w-4 h-4" />}
            {saved ? "Saved!" : "Save brief"}
          </Button>
        </div>

        {/* Identity anchors */}
        <Section icon={BookOpen} title="Business Identity" description="Facts the AI must never deviate from — use your own words">
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Describe your business in 2–3 sentences</label>
            <Textarea
              value={form.businessDescription}
              onChange={(e) => set("businessDescription")(e.target.value)}
              placeholder="e.g. We're a family-owned Italian restaurant in Melbourne's inner north, serving traditional Neapolitan pizza since 2008. Known for our wood-fired oven and locally sourced ingredients."
              className="bg-white/5 border-white/20 text-white placeholder:text-white/30 text-sm min-h-[80px]"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Products & services (with real names and prices)</label>
            <Textarea
              value={form.productsServices}
              onChange={(e) => set("productsServices")(e.target.value)}
              placeholder="e.g. Margherita pizza $22, Truffle pasta $28, Tiramisu $12. Catering packages from $45/head. Private dining room for up to 20 guests."
              className="bg-white/5 border-white/20 text-white placeholder:text-white/30 text-sm min-h-[80px]"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">What makes you different?</label>
            <Textarea
              value={form.differentiators}
              onChange={(e) => set("differentiators")(e.target.value)}
              placeholder="e.g. Only restaurant in the area with a certified Neapolitan pizza maker. 100% organic flour. Winner of Best Pizza Melbourne 2023."
              className="bg-white/5 border-white/20 text-white placeholder:text-white/30 text-sm min-h-[70px]"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Target audience</label>
            <Input
              value={form.targetAudience}
              onChange={(e) => set("targetAudience")(e.target.value)}
              placeholder="e.g. Families, date nights, corporate lunches, pizza enthusiasts aged 25–55"
              className="bg-white/5 border-white/20 text-white placeholder:text-white/30 text-sm"
            />
          </div>
        </Section>

        {/* Brand voice */}
        <Section icon={Mic2} title="Brand Voice" description="How your business sounds — the AI will match this tone">
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Tone</label>
            <Select value={form.tone} onValueChange={(v) => set("tone")(v)}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2035] border-white/20">
                {TONE_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-white text-sm">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Phrases to use (one per line)</label>
            <Textarea
              value={form.approvedPhrases}
              onChange={(e) => set("approvedPhrases")(e.target.value)}
              placeholder="e.g. Made with love&#10;Fresh from our kitchen&#10;Book your table"
              className="bg-white/5 border-white/20 text-white placeholder:text-white/30 text-sm min-h-[70px]"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Phrases to avoid (one per line)</label>
            <Textarea
              value={form.avoidPhrases}
              onChange={(e) => set("avoidPhrases")(e.target.value)}
              placeholder="e.g. Cheap&#10;Discount&#10;Fast food"
              className="bg-white/5 border-white/20 text-white placeholder:text-white/30 text-sm min-h-[70px]"
            />
          </div>
        </Section>

        {/* Compliance */}
        <Section icon={Shield} title="Compliance Rules" description="What the AI must never do — protects you legally">
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Things the AI must never say or claim</label>
            <Textarea
              value={form.neverSay}
              onChange={(e) => set("neverSay")(e.target.value)}
              placeholder="e.g. Never mention competitor names. Never claim 'best in Australia' without evidence. Never state specific health benefits."
              className="bg-white/5 border-white/20 text-white placeholder:text-white/30 text-sm min-h-[70px]"
            />
          </div>
          <div className="space-y-2">
            {[
              { key: "noCompetitorMentions" as const, label: "Never mention competitors by name" },
              { key: "noPriceClaims" as const, label: "Do not include prices in posts (I'll add them manually)" },
              { key: "noTestimonials" as const, label: "Do not fabricate testimonials or reviews" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => set(key)(!form[key])}
                  className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                    form[key] ? "bg-blue-500 border-blue-500" : "border-white/30 bg-white/5"
                  }`}
                >
                  {form[key] && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="text-sm text-white/70 group-hover:text-white transition-colors">{label}</span>
              </label>
            ))}
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Industry-specific rules (optional)</label>
            <Textarea
              value={form.complianceRules}
              onChange={(e) => set("complianceRules")(e.target.value)}
              placeholder="e.g. Health business: no medical claims. Finance: must include 'not financial advice'. Alcohol: no posts targeting under 18s."
              className="bg-white/5 border-white/20 text-white placeholder:text-white/30 text-sm min-h-[60px]"
            />
          </div>
        </Section>

        {/* Brand colours */}
        <Section icon={Palette} title="Brand Colours" description="The AI will reference these when describing visuals">
          <div className="flex gap-2">
            <Input
              value={colorInput}
              onChange={(e) => setColorInput(e.target.value)}
              placeholder="#1a2035"
              className="bg-white/5 border-white/20 text-white placeholder:text-white/30 text-sm font-mono"
              onKeyDown={(e) => e.key === "Enter" && addColor()}
            />
            <Button variant="outline" size="sm" onClick={addColor} className="border-white/20 text-white/60 hover:text-white">
              Add
            </Button>
          </div>
          {form.brandColors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.brandColors.map((c) => (
                <div key={c} className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: c }} />
                  <span className="text-xs text-white font-mono">{c}</span>
                  <button
                    onClick={() => setForm(f => ({ ...f, brandColors: f.brandColors.filter(x => x !== c) }))}
                    className="text-white/30 hover:text-red-400 ml-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Photo library */}
        <Section icon={ImageIcon} title="Photo Library" description="Upload your real business photos — the AI picks from these, not random stock images">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadPhotoMutation.isPending}
            className="w-full border-dashed border-white/20 text-white/50 hover:text-white hover:border-white/40 gap-2"
          >
            {uploadPhotoMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Upload className="w-4 h-4" />}
            Upload photo (max 5MB)
          </Button>

          {photos && photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-square bg-white/5">
                  <img src={photo.fileUrl} alt={photo.label ?? "Brand photo"} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => deletePhotoMutation.mutate({ photoId: photo.id, workspaceId: workspaceId! })}
                      className="p-2 rounded-full bg-red-500/80 hover:bg-red-500 text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {photo.label && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                      <p className="text-xs text-white truncate">{photo.label}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/20">
              <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No photos yet — upload your first one above</p>
            </div>
          )}
        </Section>

        {/* Save button (bottom) */}
        <Button
          onClick={() => saveMutation.mutate({ workspaceId, ...form })}
          disabled={saveMutation.isPending || saved}
          className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-2"
        >
          {saveMutation.isPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : saved
            ? <CheckCircle2 className="w-4 h-4" />
            : <Save className="w-4 h-4" />}
          {saved ? "Brand brief saved!" : "Save brand brief"}
        </Button>

      </div>
    </DashboardLayout>
  );
}
