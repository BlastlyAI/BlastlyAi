import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Layers, Loader2, Globe, Sparkles, Twitter, Linkedin, Facebook,
  Instagram, FileText, Image, Film, AlignLeft, Copy, Check,
  ChevronDown, ChevronUp, Zap, Clock, LayoutGrid,
} from "lucide-react";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  twitter: <Twitter className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  instagram: <Instagram className="w-4 h-4" />,
};

const PLATFORM_COLORS: Record<string, string> = {
  twitter: "from-slate-800 to-slate-900",
  linkedin: "from-blue-700 to-blue-800",
  facebook: "from-blue-500 to-blue-600",
  instagram: "from-pink-500 to-violet-600",
};

const ASSET_ICONS: Record<string, React.ReactNode> = {
  textPost: <FileText className="w-4 h-4" />,
  carousel: <LayoutGrid className="w-4 h-4" />,
  thread: <AlignLeft className="w-4 h-4" />,
  imagePrompt: <Image className="w-4 h-4" />,
  videoScript: <Film className="w-4 h-4" />,
};

function AssetCard({ type, data, copied, onCopy }: { type: string; data: any; copied: boolean; onCopy: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const labels: Record<string, string> = {
    textPost: "Text Post",
    carousel: "Carousel Slides",
    thread: "Thread",
    imagePrompt: "Image Prompt",
    videoScript: "Video Script",
  };

  const getPreview = () => {
    if (type === "textPost") return data.text;
    if (type === "imagePrompt") return data;
    if (type === "carousel") return `${data.slides?.length ?? 0} slides`;
    if (type === "thread") return `${data.posts?.length ?? 0} posts`;
    if (type === "videoScript") return `${data.duration} · Hook: "${data.hook?.slice(0, 60)}…"`;
    return "";
  };

  const getCopyText = () => {
    if (type === "textPost") return `${data.text}\n\n${data.hashtags?.map((h: string) => `#${h}`).join(" ")}`;
    if (type === "imagePrompt") return data;
    if (type === "carousel") return data.slides?.map((s: any, i: number) => `Slide ${i + 1}: ${s.headline}\n${s.body}`).join("\n\n");
    if (type === "thread") return data.posts?.join("\n\n---\n\n");
    if (type === "videoScript") return `HOOK: ${data.hook}\n\nBODY: ${data.body}\n\nCTA: ${data.cta}\n\nVoiceover: ${data.voiceoverNotes}`;
    return "";
  };

  return (
    <div className="rounded-xl border border-border/60 bg-background overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
          {ASSET_ICONS[type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">{labels[type] ?? type}</p>
          <p className="text-[10px] text-muted-foreground truncate">{getPreview()}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="w-6 h-6" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(getCopyText() ?? ""); onCopy(); }}>
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          </Button>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-border/30 pt-2 space-y-2">
          {type === "textPost" && (
            <>
              <p className="text-sm leading-relaxed">{data.text}</p>
              {data.hashtags?.length > 0 && <p className="text-xs text-primary">{data.hashtags.map((h: string) => `#${h}`).join(" ")}</p>}
            </>
          )}
          {type === "imagePrompt" && (
            <p className="text-xs leading-relaxed text-muted-foreground italic">{data}</p>
          )}
          {type === "carousel" && (
            <div className="space-y-2">
              {data.slides?.map((slide: any, i: number) => (
                <div key={i} className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                  <p className="text-xs font-bold mb-1">Slide {i + 1}: {slide.headline}</p>
                  <p className="text-xs text-muted-foreground">{slide.body}</p>
                </div>
              ))}
            </div>
          )}
          {type === "thread" && (
            <div className="space-y-2">
              {data.posts?.map((post: string, i: number) => (
                <div key={i} className="flex gap-2">
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                    {i < data.posts.length - 1 && <div className="w-px flex-1 bg-border/50 my-1" />}
                  </div>
                  <p className="text-xs leading-relaxed pb-2">{post}</p>
                </div>
              ))}
            </div>
          )}
          {type === "videoScript" && (
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <p className="font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Hook ({data.duration})</p>
                <p>{data.hook}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                <p className="font-semibold mb-0.5">Body</p>
                <p>{data.body}</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <p className="font-semibold text-emerald-700 dark:text-emerald-400 mb-0.5">CTA</p>
                <p>{data.cta}</p>
              </div>
              <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
                <p className="font-semibold text-violet-700 dark:text-violet-400 mb-0.5">Voiceover Notes</p>
                <p>{data.voiceoverNotes}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlatformColumn({ platform, assets }: { platform: string; assets: any }) {
  const [copied, setCopied] = useState<string | null>(null);
  const assetTypes = ["textPost", "carousel", "thread", "imagePrompt", "videoScript"];

  return (
    <div className="rounded-2xl border border-border/60 overflow-hidden shadow-sm">
      <div className={`bg-gradient-to-r ${PLATFORM_COLORS[platform] ?? "from-gray-700 to-gray-800"} p-3 flex items-center gap-2`}>
        <span className="text-white">{PLATFORM_ICONS[platform]}</span>
        <span className="text-white font-semibold text-sm capitalize">{platform}</span>
        <Badge className="ml-auto bg-white/20 text-white border-0 text-[10px]">5 assets</Badge>
      </div>
      <div className="p-3 space-y-2 bg-muted/10">
        {assetTypes.map(type => assets[type] ? (
          <AssetCard
            key={type}
            type={type}
            data={assets[type]}
            copied={copied === type}
            onCopy={() => { setCopied(type); setTimeout(() => setCopied(null), 2000); }}
          />
        ) : null)}
      </div>
    </div>
  );
}

export default function FactoryPage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id ?? 0;

  const [url, setUrl] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["twitter", "linkedin", "instagram"]);
  const [campaignGoal, setCampaignGoal] = useState("awareness");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { data: campaigns = [], refetch } = trpc.agents.listMultimodalCampaigns.useQuery(
    { workspaceId: wsId }, { enabled: !!wsId }
  );

  const runFactory = trpc.agents.runCampaignFactory.useMutation({
    onSuccess: (data) => {
      setIsRunning(false);
      setResult(data);
      refetch();
      toast.success("Campaign assets generated across all platforms!");
    },
    onError: (err) => { setIsRunning(false); toast.error(err.message); },
  });

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleRun = () => {
    if (!url || selectedPlatforms.length === 0 || !wsId) return;
    setIsRunning(true);
    setResult(null);
    runFactory.mutate({ workspaceId: wsId, sourceUrl: url, platforms: selectedPlatforms as any[], campaignGoal });
  };

  return (
    <AppLayout title="Campaign Factory">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Multi-Modal Campaign Factory
            </h1>
            <p className="text-sm text-muted-foreground">One URL → text posts, carousels, threads, image prompts & video scripts across every platform</p>
          </div>
        </div>

        {/* Input */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Source URL</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="https://yourproduct.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Campaign Goal</Label>
                <Select value={campaignGoal} onValueChange={setCampaignGoal}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["awareness", "traffic", "engagement", "conversions", "leads"].map(g => (
                      <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Platforms</Label>
              <div className="flex gap-2 flex-wrap">
                {["twitter", "linkedin", "facebook", "instagram", "tiktok"].map(p => (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                      selectedPlatforms.includes(p)
                        ? "bg-primary/10 border-primary/30 text-primary shadow-sm"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {PLATFORM_ICONS[p]}<span className="capitalize">{p}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />Text posts</span>
                <span className="flex items-center gap-1.5"><LayoutGrid className="w-3.5 h-3.5" />Carousels</span>
                <span className="flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5" />Threads</span>
                <span className="flex items-center gap-1.5"><Image className="w-3.5 h-3.5" />Image prompts</span>
                <span className="flex items-center gap-1.5"><Film className="w-3.5 h-3.5" />Video scripts</span>
              </div>
              <Button
                onClick={handleRun}
                disabled={!url || selectedPlatforms.length === 0 || isRunning || !wsId}
                className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {isRunning ? "Generating assets…" : "Generate All Assets"}
              </Button>
            </div>

            {isRunning && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Factory running…</p>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-500">Analyzing URL → building unified theme → generating {selectedPlatforms.length * 5} assets across {selectedPlatforms.length} platforms</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Theme banner */}
            <Card className="border-border/60 shadow-sm overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-base">{result.theme?.campaignName}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{result.theme?.theme}</p>
                    <p className="text-sm mt-1">{result.theme?.keyMessage}</p>
                    {result.theme?.hashtags?.length > 0 && (
                      <p className="text-xs text-primary mt-2">{result.theme.hashtags.map((h: string) => `#${h}`).join(" ")}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0">{selectedPlatforms.length} platforms · {selectedPlatforms.length * 5} assets</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Platform columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {Object.entries(result.assets as Record<string, any>).map(([platform, assets]) => (
                <PlatformColumn key={platform} platform={platform} assets={assets} />
              ))}
            </div>
          </div>
        )}

        {/* Past campaigns */}
        {!result && (campaigns as any[]).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Campaigns</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(campaigns as any[]).map((c: any) => (
                <Card key={c.id} className="border-border/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
                  if (c.assets) setResult({ theme: { campaignName: c.theme, theme: c.theme, keyMessage: c.brief, hashtags: [] }, assets: c.assets });
                }}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <Layers className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{c.theme ?? "Campaign"}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.sourceUrl}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className="text-[10px] capitalize">{c.status}</Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />{new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {!result && (campaigns as any[]).length === 0 && !isRunning && (
          <div className="text-center py-16 text-muted-foreground">
            <Layers className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No campaigns generated yet</p>
            <p className="text-sm mt-1">Enter a URL above to generate a full multi-modal campaign</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
