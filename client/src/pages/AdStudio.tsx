import AppLayout from "@/components/AppLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Wand2, Upload, X, Sparkles, Twitter, Linkedin, Facebook, Instagram, Globe,
  Copy, Check, Save, Image, Target, Lightbulb, RefreshCw, ChevronRight, Megaphone
} from "lucide-react";
import { useState, useRef } from "react";

const PLATFORMS = [
  { id: "google",    name: "Google Ads",   icon: Globe,      color: "bg-blue-500 text-white",   charLimit: 300,  recommended: true,  unavailable: false },
  { id: "tiktok",   name: "TikTok Ads",   icon: Globe,      color: "bg-black text-white",      charLimit: 2200, recommended: true,  unavailable: false },
  { id: "instagram",name: "Instagram",    icon: Instagram,  color: "bg-gradient-to-br from-purple-500 to-pink-500 text-white", charLimit: 300, recommended: true, unavailable: false },
  { id: "linkedin", name: "LinkedIn",     icon: Linkedin,   color: "bg-blue-600 text-white",   charLimit: 700,  recommended: false, unavailable: false },
  { id: "twitter",  name: "Twitter/X",    icon: Twitter,    color: "bg-black text-white",      charLimit: 280,  recommended: false, unavailable: false },
  { id: "facebook", name: "Facebook Ads", icon: Facebook,   color: "bg-blue-500 text-white",   charLimit: 500,  recommended: false, unavailable: true  },
];

const GOALS = ["brand_awareness", "website_traffic", "lead_generation", "sales_conversion", "app_downloads", "event_promotion"];
const TONES = ["professional", "casual", "bold", "inspirational", "educational", "urgent"];
const INDUSTRIES = ["Technology", "E-commerce", "Healthcare", "Finance", "Food & Beverage", "Fashion", "Real Estate", "Education", "Travel", "Other"];

type AdResult = {
  campaignTheme: string;
  overarchingMessage: string;
  platforms: Record<string, { headline: string; copy: string; cta: string; hashtags: string[]; imageConcept: string }>;
  generalImageConcepts: string[];
  targetingRecommendations: string;
  businessName: string;
  uploadedImageUrls: string[];
  goal: string;
  tone: string;
};

export default function AdStudio() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id ?? 0;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    businessName: "",
    businessDescription: "",
    industry: "",
    targetAudience: "",
    websiteUrl: "",
    keyMessage: "",
    goal: "brand_awareness",
    tone: "professional",
  });
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["google", "tiktok", "instagram", "linkedin"]);
  const [uploadedImages, setUploadedImages] = useState<{ url: string; name: string }[]>([]);
  const [adResult, setAdResult] = useState<AdResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const generateMutation = trpc.adStudio.generateAd.useMutation({
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const uploadMutation = trpc.adStudio.uploadImage.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const utils = trpc.useUtils();
  const saveMutation = trpc.adStudio.saveProject.useMutation({
    onSuccess: () => { toast.success("Ad campaign saved to library"); utils.adStudio.listProjects.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const { data: savedProjects = [] } = trpc.adStudio.listProjects.useQuery({ workspaceId: wsId }, { enabled: !!wsId });

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} is too large (max 5MB)`); continue; }
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1];
        try {
          const result = await uploadMutation.mutateAsync({
            workspaceId: wsId,
            fileName: file.name,
            contentType: file.type,
            base64,
          });
          setUploadedImages((prev) => [...prev, { url: result.url, name: file.name }]);
          toast.success(`${file.name} uploaded`);
        } catch {
          toast.error(`Failed to upload ${file.name}`);
        }
      };
      reader.readAsDataURL(file);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    if (!form.businessName || !form.businessDescription) {
      toast.error("Business name and description are required");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }
    const result = await generateMutation.mutateAsync({
      workspaceId: wsId,
      businessName: form.businessName,
      businessDescription: form.businessDescription,
      industry: form.industry || undefined,
      targetAudience: form.targetAudience || undefined,
      websiteUrl: form.websiteUrl || undefined,
      keyMessage: form.keyMessage || undefined,
      goal: form.goal as any,
      tone: form.tone as any,
      platforms: selectedPlatforms as any[],
      uploadedImageUrls: uploadedImages.map((i) => i.url),
    });
    setAdResult(result as AdResult);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast.success("Copied!");
  };

  const handleSave = () => {
    if (!adResult) return;
    saveMutation.mutate({
      workspaceId: wsId,
      name: `${adResult.businessName} — ${new Date().toLocaleDateString()}`,
      adData: adResult,
    });
  };

  return (
    <AppLayout title="Ad Studio">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                <Wand2 className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-2xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>AI Ad Studio</h2>
            </div>
            <p className="text-muted-foreground text-sm">Upload your business info and images — AI generates a complete multi-platform ad campaign.</p>
          </div>
          {adResult && (
            <Button onClick={handleSave} disabled={saveMutation.isPending} variant="outline" className="gap-2">
              <Save className="w-4 h-4" />Save campaign
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Input form */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-primary" />Business Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Business Name *</Label>
                  <Input placeholder="e.g. Acme Coffee Co." value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className="text-base h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">What does your business do? *</Label>
                  <Textarea placeholder="Describe what you do, what makes you different, and what you want to promote..." rows={3} value={form.businessDescription} onChange={(e) => setForm({ ...form, businessDescription: e.target.value })} className="text-sm resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Industry</Label>
                    <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v })}>
                      <SelectTrigger className="h-11 text-sm"><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((i) => <SelectItem key={i} value={i.toLowerCase()} className="text-sm">{i}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Website URL</Label>
                    <Input placeholder="https://..." value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} className="text-sm h-11" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Target Audience</Label>
                  <Input placeholder="e.g. Local families, gym-goers aged 25–45, small business owners" value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} className="text-sm h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Key Message</Label>
                  <Input placeholder="e.g. Premium quality at affordable prices" value={form.keyMessage} onChange={(e) => setForm({ ...form, keyMessage: e.target.value })} className="text-sm h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Campaign Goal</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {GOALS.map((g) => (
                      <button key={g} onClick={() => setForm({ ...form, goal: g })}
                        className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all text-left capitalize ${
                          form.goal === g
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
                        }`}>
                        {g.replace(/_/g, " ")}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Brand Tone</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {TONES.map((t) => (
                      <button key={t} onClick={() => setForm({ ...form, tone: t })}
                        className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all capitalize ${
                          form.tone === t
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Image upload */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Image className="w-4 h-4 text-primary" />Business Images
                  <Badge variant="secondary" className="text-[10px]">Optional</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  {uploading ? (
                    <RefreshCw className="w-5 h-5 text-muted-foreground mx-auto mb-1 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                  )}
                  <p className="text-xs text-muted-foreground">{uploading ? "Uploading..." : "Upload product or business photos"}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG, GIF up to 5MB each</p>
                </button>
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {uploadedImages.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img.url} alt={img.name} className="w-full h-16 object-cover rounded-lg border border-border" />
                        <button
                          onClick={() => setUploadedImages((prev) => prev.filter((_, j) => j !== i))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Platform selection */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Target Platforms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map(({ id, name, icon: Icon, recommended, unavailable }) => (
                    <button key={id}
                      onClick={() => !unavailable && togglePlatform(id)}
                      disabled={unavailable}
                      title={unavailable ? "Facebook Ads currently unavailable — use Google Ads or TikTok instead" : undefined}
                      className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                        unavailable
                          ? "border-border/40 text-muted-foreground/40 cursor-not-allowed opacity-50"
                          : selectedPlatforms.includes(id)
                            ? "bg-primary/10 border-primary/40 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30"
                      }`}>
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{name}</span>
                      {recommended && !unavailable && (
                        <span className="ml-auto text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1 py-0.5 rounded">TOP</span>
                      )}
                      {unavailable && (
                        <span className="ml-auto text-[9px] font-bold text-red-400 bg-red-400/10 px-1 py-0.5 rounded">N/A</span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                  ⭐ <strong>Google Ads</strong> and <strong>TikTok Ads</strong> are recommended for local businesses.
                  Facebook Ads is currently unavailable — use these alternatives for the same reach.
                </p>
              </CardContent>
            </Card>

            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="w-full gap-2 shadow-sm shadow-primary/20 h-11"
            >
              {generateMutation.isPending ? (
                <><RefreshCw className="w-4 h-4 animate-spin" />Generating your campaign...</>
              ) : (
                <><Wand2 className="w-4 h-4" />Generate Ad Campaign</>
              )}
            </Button>
          </div>

          {/* Right: Generated ads */}
          <div className="lg:col-span-3">
            {/* Loading circle — always at the top of the right panel when generating */}
            {generateMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative w-28 h-28 mb-6">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112" fill="none">
                    <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="5" className="text-muted/20" />
                    <circle cx="56" cy="56" r="48" stroke="url(#adGrad)" strokeWidth="5" strokeLinecap="round"
                      strokeDasharray="301" strokeDashoffset="75" className="animate-spin" style={{ animationDuration: '1.5s' }} />
                    <defs>
                      <linearGradient id="adGrad" x1="0" y1="0" x2="112" y2="112" gradientUnits="userSpaceOnUse">
                        <stop stopColor="oklch(0.52 0.22 264)" />
                        <stop offset="1" stopColor="oklch(0.62 0.22 310)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-9 h-9 text-violet-500" />
                  </div>
                </div>
                <p className="font-bold text-lg mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Generating your campaign…</p>
                <p className="text-sm text-muted-foreground text-center max-w-xs">AI is crafting platform-specific copy, headlines, hashtags and targeting tips</p>
                <div className="flex flex-wrap gap-2 justify-center mt-6">
                  {["Twitter/X", "LinkedIn", "Facebook", "Instagram", "TikTok"].filter((_, i) => selectedPlatforms[i]).map((p) => (
                    <Badge key={p} variant="secondary" className="text-xs animate-pulse">{p}</Badge>
                  ))}
                </div>
              </div>
            )}
            {!adResult && !generateMutation.isPending ? (
              <div className="flex flex-col items-center justify-center h-full min-h-96 border-2 border-dashed border-border rounded-2xl text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-pink-100 dark:from-violet-900/30 dark:to-pink-900/30 flex items-center justify-center mb-4">
                  <Wand2 className="w-7 h-7 text-violet-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Your AI Ad Campaign</h3>
                <p className="text-sm text-muted-foreground max-w-xs mb-4">Fill in your business details on the left, optionally upload images, and click Generate to create a complete multi-platform ad campaign.</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["Platform-specific copy", "Headlines & CTAs", "Hashtag sets", "Image concepts", "Targeting tips"].map((f) => (
                    <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                  ))}
                </div>
              </div>
            ) : adResult ? (
              <div className="space-y-4">
                {/* Campaign overview */}
                <Card className="border-border/60 shadow-sm bg-gradient-to-br from-violet-50 to-pink-50 dark:from-violet-950/20 dark:to-pink-950/20">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm mb-0.5">{adResult.campaignTheme}</p>
                        <p className="text-xs text-muted-foreground">{adResult.overarchingMessage}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Platform tabs */}
                <Tabs defaultValue={selectedPlatforms[0]}>
                  <TabsList className="w-full">
                    {selectedPlatforms.map((p) => {
                      const platform = PLATFORMS.find((pl) => pl.id === p);
                      const Icon = platform?.icon ?? Sparkles;
                      return (
                        <TabsTrigger key={p} value={p} className="flex-1 gap-1.5 text-xs">
                          <Icon className="w-3.5 h-3.5" />{platform?.name ?? p}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {selectedPlatforms.map((p) => {
                    const platform = PLATFORMS.find((pl) => pl.id === p);
                    const ad = adResult.platforms?.[p];
                    if (!ad) return null;
                    const fullCopy = `${ad.headline}\n\n${ad.copy}\n\n${ad.cta}\n\n${ad.hashtags.map((h) => `#${h}`).join(" ")}`;
                    return (
                      <TabsContent key={p} value={p}>
                        <Card className="border-border/60 shadow-sm">
                          <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${platform?.color ?? "bg-muted"}`}>
                                {p[0].toUpperCase()}
                              </div>
                              <CardTitle className="text-sm">{platform?.name} Ad</CardTitle>
                            </div>
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7"
                              onClick={() => handleCopy(fullCopy, p)}>
                              {copied === p ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              {copied === p ? "Copied!" : "Copy all"}
                            </Button>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Ad preview */}
                            <div className="bg-muted/30 border border-border/50 rounded-xl p-4 space-y-2">
                              <p className="font-bold text-sm">{ad.headline}</p>
                              <p className="text-sm text-muted-foreground leading-relaxed">{ad.copy}</p>
                              {uploadedImages.length > 0 && (
                                <div className="grid grid-cols-3 gap-1 mt-2">
                                  {uploadedImages.slice(0, 3).map((img, i) => (
                                    <img key={i} src={img.url} alt="" className="w-full h-20 object-cover rounded-lg" />
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center justify-between pt-1">
                                <div className="flex flex-wrap gap-1">
                                  {ad.hashtags.slice(0, 4).map((tag) => (
                                    <span key={tag} className="text-[10px] text-primary font-medium">#{tag}</span>
                                  ))}
                                </div>
                                <Badge className="bg-primary text-primary-foreground text-[10px] border-0">{ad.cta}</Badge>
                              </div>
                            </div>

                            <Separator />

                            {/* Sections */}
                            <div className="space-y-3">
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Headline</p>
                                <p className="text-sm font-medium">{ad.headline}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Body Copy</p>
                                <p className="text-sm text-muted-foreground leading-relaxed">{ad.copy}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Call to Action</p>
                                <Badge className="bg-primary/10 text-primary border-0">{ad.cta}</Badge>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Hashtags</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {ad.hashtags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-[10px] gap-1 cursor-pointer hover:bg-primary/10"
                                      onClick={() => handleCopy(`#${tag}`, `tag-${tag}`)}>
                                      #{tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                  <Lightbulb className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Image Concept</p>
                                    <p className="text-xs text-amber-600 dark:text-amber-500">{ad.imageConcept}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    );
                  })}
                </Tabs>

                {/* General recommendations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {adResult.generalImageConcepts?.length > 0 && (
                    <Card className="border-border/60 shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                          <Image className="w-3.5 h-3.5 text-primary" />Visual Concepts
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1.5">
                          {adResult.generalImageConcepts.map((concept, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <ChevronRight className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                              {concept}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                  {adResult.targetingRecommendations && (
                    <Card className="border-border/60 shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-primary" />Targeting Tips
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground leading-relaxed">{adResult.targetingRecommendations}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Saved Projects History */}
        {(savedProjects as any[]).length > 0 && (
          <div className="mt-8">
            <h3 className="text-base font-semibold mb-3" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Saved Campaigns</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(savedProjects as any[]).map((project: any) => {
                let adData: any = null;
                try { adData = JSON.parse(project.content ?? "{}"); } catch {}
                return (
                  <Card key={project.id} className="border-border/60 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer"
                    onClick={() => adData && setAdResult(adData)}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shrink-0">
                          <Wand2 className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{project.name}</p>
                          {adData?.campaignTheme && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{adData.campaignTheme}</p>}
                          {adData?.platforms && (
                            <div className="flex gap-1 mt-1.5">
                              {Object.keys(adData.platforms).map((p: string) => (
                                <Badge key={p} variant="secondary" className="text-[9px] capitalize">{p}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
