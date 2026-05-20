import AppLayout from "@/components/AppLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Sparkles, Send, Calendar, RefreshCw, Copy, Check, Link2, Hash,
  Twitter, Linkedin, Facebook, Instagram, Globe, Image, Loader2, X,
} from "lucide-react";
import { useState } from "react";
import { ViralityWidget } from "@/components/ViralityWidget";

const PLATFORMS = [
  { id: "twitter", name: "Twitter/X", icon: Twitter, charLimit: 280, color: "bg-black text-white" },
  { id: "linkedin", name: "LinkedIn", icon: Linkedin, charLimit: 700, color: "bg-blue-600 text-white" },
  { id: "facebook", name: "Facebook", icon: Facebook, charLimit: 500, color: "bg-blue-500 text-white" },
  { id: "instagram", name: "Instagram", icon: Instagram, charLimit: 300, color: "bg-gradient-to-br from-purple-500 to-pink-500 text-white" },
  { id: "tiktok", name: "TikTok", icon: Globe, charLimit: 2200, color: "bg-black text-white" },
];

const TONES = ["professional", "casual", "fun", "urgent", "inspirational", "educational"] as const;

export default function Compose() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id ?? 0;

  const { data: campaigns = [] } = trpc.campaigns.list.useQuery({ workspaceId: wsId }, { enabled: !!wsId });
  const { data: socialAccounts = [] } = trpc.social.list.useQuery({ workspaceId: wsId }, { enabled: !!wsId });

  const generateMutation = trpc.ai.generateContent.useMutation({
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const generateImageMutation = trpc.ai.generatePostImage.useMutation({
    onError: (e: { message: string }) => toast.error("Image generation failed: " + e.message),
  });
  const createPostMutation = trpc.posts.create.useMutation({
    onSuccess: () => toast.success("Post saved!"),
    onError: (e) => toast.error(e.message),
  });

  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<typeof TONES[number]>("professional");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["twitter"]);
  const [campaignId, setCampaignId] = useState<string>("");
  const [generatedContent, setGeneratedContent] = useState<Record<string, { content: string; hashtags: string[] }>>({});
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  // Per-platform generated images
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null);

  // UTM builder
  const [utmSource, setUtmSource] = useState("blastly");
  const [utmMedium, setUtmMedium] = useState("social");
  const [utmContent, setUtmContent] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  const utmUrl = baseUrl
    ? `${baseUrl}?utm_source=${utmSource}&utm_medium=${utmMedium}${utmContent ? `&utm_content=${utmContent}` : ""}`
    : "";

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const handleGenerate = async () => {
    if (!topic.trim()) { toast.error("Please enter a topic or brief"); return; }
    if (selectedPlatforms.length === 0) { toast.error("Select at least one platform"); return; }
    const result = await generateMutation.mutateAsync({
      workspaceId: wsId,
      productDescription: topic,
      tone: tone as any,
      platforms: selectedPlatforms as ("twitter" | "linkedin" | "facebook" | "instagram" | "tiktok")[],
    });
    const newContent: Record<string, { content: string; hashtags: string[] }> = {};
    const newEdited: Record<string, string> = {};
    const platforms = (result as any)?.platforms ?? {};
    for (const p of selectedPlatforms) {
      const platformData = platforms[p];
      if (platformData) {
        const text = platformData.caption ?? platformData.content ?? "";
        const tags = platformData.hashtags ?? [];
        newContent[p] = { content: text, hashtags: tags };
        newEdited[p] = text + (tags.length ? "\n\n" + tags.map((h: string) => `#${h}`).join(" ") : "");
      }
    }
    setGeneratedContent(newContent);
    setEditedContent(newEdited);
  };

  const handleGenerateImage = async (platform: string) => {
    const postText = editedContent[platform] ?? topic;
    if (!postText.trim()) { toast.error("Write or generate content first, then generate an image."); return; }
    setGeneratingImageFor(platform);
    try {
      const ws = currentWorkspace as Record<string, unknown>;
      const result = await generateImageMutation.mutateAsync({
        workspaceId: wsId,
        postText,
        platform: platform as any,
        brandContext: {
          name: currentWorkspace?.name,
          industry: typeof ws?.industry === "string" ? ws.industry : undefined,
          primaryColor: typeof ws?.primaryColor === "string" ? ws.primaryColor : undefined,
          toneOfVoice: typeof ws?.toneOfVoice === "string" ? ws.toneOfVoice : undefined,
          targetAudience: typeof ws?.targetAudience === "string" ? ws.targetAudience : undefined,
        },
      });
      setGeneratedImages((prev) => ({ ...prev, [platform]: result.url ?? "" }));
      toast.success("Image generated!", { description: "Your brand-matched image is ready." });
    } finally {
      setGeneratingImageFor(null);
    }
  };

  const handleCopy = (platform: string) => {
    const text = editedContent[platform] ?? "";
    navigator.clipboard.writeText(text);
    setCopied(platform);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSchedule = (platform: string) => {
    const content = editedContent[platform];
    if (!content) { toast.error("No content to schedule"); return; }
    const scheduledAt = scheduleDate && scheduleTime ? new Date(`${scheduleDate}T${scheduleTime}`) : undefined;
    const acct = (socialAccounts as any[]).find((a: any) => a.platform === platform);
    createPostMutation.mutate({
      workspaceId: wsId,
      bodyText: content,
      status: scheduledAt ? "scheduled" : "draft",
      scheduledAt,
      campaignId: campaignId ? Number(campaignId) : undefined,
      utmSource: utmSource || undefined,
      utmMedium: utmMedium || undefined,
      utmContent: utmContent || undefined,
      platforms: acct ? [{ socialAccountId: acct.id, platform: platform as any }] : undefined,
    });
  };

  return (
    <AppLayout title="Compose">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>AI Post Composer</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Generate platform-tailored content with AI, then schedule across all channels.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Generator controls */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />AI Content Generator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Topic / Brief *</Label>
                  <Textarea
                    placeholder="e.g. Announcing our new product launch with 20% off this week only..."
                    rows={3}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="text-sm resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Tone</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {TONES.map((t) => (
                      <button key={t} onClick={() => setTone(t)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                          tone === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Platforms</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {PLATFORMS.map(({ id, name, icon: Icon }) => (
                      <button key={id} onClick={() => togglePlatform(id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                          selectedPlatforms.includes(id) ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                        }`}>
                        <Icon className="w-3.5 h-3.5" />{name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Campaign (optional)</Label>
                  <Select value={campaignId} onValueChange={setCampaignId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Link to campaign" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No campaign</SelectItem>
                      {(campaigns as any[]).map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="w-full gap-2 shadow-sm shadow-primary/20">
                  {generateMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {generateMutation.isPending ? "Generating..." : "Generate Content"}
                </Button>
              </CardContent>
            </Card>

            {/* UTM Builder */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-primary" />UTM Link Builder
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Base URL</Label>
                  <Input placeholder="https://example.com" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="text-xs h-8" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">utm_source</Label>
                    <Input value={utmSource} onChange={(e) => setUtmSource(e.target.value)} className="text-xs h-7" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">utm_medium</Label>
                    <Input value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} className="text-xs h-7" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">utm_content</Label>
                    <Input value={utmContent} onChange={(e) => setUtmContent(e.target.value)} className="text-xs h-7" />
                  </div>
                </div>
                {utmUrl && (
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-[10px] text-muted-foreground mb-1 font-medium">Generated URL</p>
                    <p className="text-[10px] font-mono break-all text-foreground">{utmUrl}</p>
                    <button onClick={() => { navigator.clipboard.writeText(utmUrl); toast.success("URL copied!"); }}
                      className="text-[10px] text-primary mt-1 hover:underline">Copy URL</button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Schedule */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="text-xs h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Time</Label>
                    <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="text-xs h-8" />
                  </div>
                </div>
                {scheduleDate && scheduleTime && (
                  <p className="text-[10px] text-muted-foreground">
                    Scheduled for {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Generated content per platform */}
          <div className="lg:col-span-3">
            {Object.keys(generatedContent).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center rounded-2xl border border-dashed border-border/60 bg-muted/20">
                <Sparkles className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <h3 className="font-semibold mb-2">Ready to generate</h3>
                <p className="text-sm text-muted-foreground max-w-xs">Enter your topic, choose your platforms and tone, then click Generate Content.</p>
              </div>
            ) : (
              <Tabs defaultValue={selectedPlatforms[0]}>
                <TabsList className="mb-4 flex-wrap h-auto gap-1">
                  {selectedPlatforms.filter((p) => generatedContent[p]).map((p) => {
                    const platform = PLATFORMS.find((pl) => pl.id === p);
                    const Icon = platform?.icon ?? Globe;
                    return (
                      <TabsTrigger key={p} value={p} className="gap-1.5 text-xs">
                        <Icon className="w-3.5 h-3.5" />{platform?.name ?? p}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                {selectedPlatforms.map((p) => {
                  const platform = PLATFORMS.find((pl) => pl.id === p);
                  const content = editedContent[p] ?? "";
                  const charLimit = platform?.charLimit ?? 500;
                  const charCount = content.length;
                  const isOverLimit = charCount > charLimit;
                  const generatedImage = generatedImages[p];
                  const isGeneratingImage = generatingImageFor === p;

                  return (
                    <TabsContent key={p} value={p}>
                      <Card className="border-border/60 shadow-sm">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${platform?.color ?? "bg-muted"}`}>
                              {p[0].toUpperCase()}
                            </div>
                            <CardTitle className="text-sm">{platform?.name} Preview</CardTitle>
                          </div>
                          <Badge variant={isOverLimit ? "destructive" : "secondary"} className="text-[10px]">
                            {charCount}/{charLimit}
                          </Badge>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Preview box */}
                          <div className="bg-muted/30 border border-border/50 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                {currentWorkspace?.name?.[0] ?? "Y"}
                              </div>
                              <div>
                                <p className="text-xs font-semibold">{currentWorkspace?.name ?? "Your Brand"}</p>
                                <p className="text-[10px] text-muted-foreground">@yourbrand · Just now</p>
                              </div>
                            </div>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
                            {/* Show generated image in preview */}
                            {generatedImage && (
                              <div className="mt-3 relative">
                                <img
                                  src={generatedImage}
                                  alt="AI generated post image"
                                  className="w-full rounded-lg object-cover max-h-64"
                                />
                                <button
                                  onClick={() => setGeneratedImages((prev) => { const n: Record<string, string> = {}; for (const k of Object.keys(prev)) { if (k !== p && prev[k]) n[k] = prev[k] as string; } return n; })}
                                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                                  title="Remove image"
                                >
                                  <X className="w-3.5 h-3.5 text-white" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Edit */}
                          <Textarea
                            value={content}
                            onChange={(e) => setEditedContent({ ...editedContent, [p]: e.target.value })}
                            rows={5}
                            className={`text-sm resize-none ${isOverLimit ? "border-destructive" : ""}`}
                            placeholder="Edit your content here..."
                          />

                          {/* Hashtags */}
                          {generatedContent[p]?.hashtags?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {generatedContent[p].hashtags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-[10px] gap-1 cursor-pointer hover:bg-primary/10"
                                  onClick={() => setEditedContent({ ...editedContent, [p]: content + ` #${tag}` })}>
                                  <Hash className="w-2.5 h-2.5" />{tag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Virality Predictor */}
                          <ViralityWidget
                            workspaceId={wsId}
                            content={content}
                            hashtags={generatedContent[p]?.hashtags}
                            platforms={[p]}
                          />

                          <Separator />

                          {/* Action buttons */}
                          <div className="flex gap-2 flex-wrap">
                            {/* Generate Image button */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-xs border-[oklch(0.65_0.28_220/0.3)] text-[oklch(0.72_0.22_220)] hover:bg-[oklch(0.65_0.28_220/0.08)]"
                              onClick={() => handleGenerateImage(p)}
                              disabled={isGeneratingImage}
                              title="Generate a brand-matched image for this post using AI"
                            >
                              {isGeneratingImage
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Image className="w-3.5 h-3.5" />}
                              {isGeneratingImage ? "Generating…" : generatedImage ? "Regenerate Image" : "Generate Image"}
                            </Button>

                            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleCopy(p)}>
                              {copied === p ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              {copied === p ? "Copied!" : "Copy"}
                            </Button>
                            <Button size="sm" className="gap-1.5 text-xs flex-1" onClick={() => handleSchedule(p)} disabled={createPostMutation.isPending}>
                              {scheduleDate ? <><Calendar className="w-3.5 h-3.5" />Schedule</> : <><Send className="w-3.5 h-3.5" />Save as draft</>}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
