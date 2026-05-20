import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Mic2, Loader2, Sparkles, CheckCircle2, Star, Wand2,
  PenLine, MessageSquare, Zap, ChevronDown, ChevronUp,
} from "lucide-react";

function ProfileCard({ profile, onActivate, onApply }: {
  profile: any;
  onActivate: (id: number) => void;
  onApply: (profileId: number, content: string, platform: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [testContent, setTestContent] = useState("");
  const [testPlatform, setTestPlatform] = useState("twitter");
  const [rewritten, setRewritten] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const style = profile.styleProfile as any;

  const handleApply = async () => {
    if (!testContent) return;
    setIsApplying(true);
    onApply(profile.id, testContent, testPlatform);
  };

  return (
    <Card className={`border-border/60 shadow-sm transition-all ${profile.isActive ? "ring-2 ring-primary/30 border-primary/30" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              profile.isActive ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}>
              <Mic2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="font-semibold text-sm">{profile.name}</p>
              <p className="text-xs text-muted-foreground">{new Date(profile.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          {profile.isActive ? (
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
              <CheckCircle2 className="w-3 h-3 mr-1" />Active
            </Badge>
          ) : (
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => onActivate(profile.id)}>
              Activate
            </Button>
          )}
        </div>

        {/* Style tags */}
        {style && (
          <div className="flex gap-1.5 flex-wrap mb-3">
            {style.tone && <Badge variant="secondary" className="text-[10px]">{style.tone}</Badge>}
            {style.vocabulary && <Badge variant="secondary" className="text-[10px]">{style.vocabulary}</Badge>}
            {style.emojiUsage && <Badge variant="secondary" className="text-[10px]">emoji: {style.emojiUsage}</Badge>}
            {style.sentenceLength && <Badge variant="secondary" className="text-[10px]">{style.sentenceLength} sentences</Badge>}
          </div>
        )}

        {/* Brand personality */}
        {style?.brandPersonality && (
          <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{style.brandPersonality}</p>
        )}

        {/* Sample outputs */}
        {profile.sampleOutputs?.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? "Hide" : "Show"} sample outputs
            </button>
            {expanded && (
              <div className="mt-2 space-y-2">
                {(profile.sampleOutputs as string[]).map((s, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-muted/50 text-xs leading-relaxed">{s}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Test rewriter */}
        <div className="border-t border-border/40 pt-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Test Brand Voice Rewriter</p>
          <Textarea
            placeholder="Paste any content to rewrite in this brand voice…"
            value={testContent}
            onChange={(e) => setTestContent(e.target.value)}
            className="text-xs min-h-[60px] resize-none"
          />
          <div className="flex gap-2">
            <Select value={testPlatform} onValueChange={setTestPlatform}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["twitter", "linkedin", "facebook", "instagram", "tiktok"].map(p => (
                  <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="gap-1.5 text-xs h-8"
              disabled={!testContent || isApplying}
              onClick={handleApply}
            >
              {isApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
              Rewrite
            </Button>
          </div>
          {rewritten && (
            <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs leading-relaxed">
              <p className="text-[10px] font-semibold text-primary mb-1.5">Rewritten in brand voice:</p>
              {rewritten}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BrandVoicePage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id ?? 0;

  const [name, setName] = useState("");
  const [trainingContent, setTrainingContent] = useState("");
  const [isTraining, setIsTraining] = useState(false);
  const [rewriteResults, setRewriteResults] = useState<Record<number, string>>({});

  const { data: profiles = [], refetch } = trpc.agents.listBrandProfiles.useQuery(
    { workspaceId: wsId }, { enabled: !!wsId }
  );

  const train = trpc.agents.trainBrandVoice.useMutation({
    onSuccess: () => {
      setIsTraining(false);
      setName("");
      setTrainingContent("");
      refetch();
      toast.success("Brand voice profile trained successfully!");
    },
    onError: (err) => {
      setIsTraining(false);
      toast.error(err.message);
    },
  });

  const activate = trpc.agents.activateBrandProfile.useMutation({
    onSuccess: () => { refetch(); toast.success("Brand profile activated!"); },
  });

  const applyVoice = trpc.agents.applyBrandVoice.useMutation({
    onSuccess: (data, vars) => {
      setRewriteResults(prev => ({ ...prev, [vars.brandProfileId]: data.rewritten }));
      toast.success("Content rewritten in brand voice!");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleTrain = () => {
    if (!name || !trainingContent || !wsId) return;
    setIsTraining(true);
    train.mutate({ workspaceId: wsId, name, trainingContent });
  };

  return (
    <AppLayout title="Brand Voice">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
            <Mic2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Brand Personality Cloner
            </h1>
            <p className="text-sm text-muted-foreground">Train AI on your content to clone your exact tone, style, and voice</p>
          </div>
        </div>

        {/* Training form */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-rose-500 to-pink-500" />
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-1">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Profile Name</Label>
                <Input
                  placeholder="e.g. Our Brand Voice"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Training Content
                  <span className="ml-1 text-muted-foreground font-normal normal-case">(paste 3-10 example posts, captions, or copy samples)</span>
                </Label>
                <Textarea
                  placeholder="Paste your existing social media posts, website copy, email newsletters, or any brand content here. The more examples you provide, the more accurately the AI will clone your voice…"
                  value={trainingContent}
                  onChange={(e) => setTrainingContent(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" />Analyzes tone & vocabulary</span>
                <span className="flex items-center gap-1.5"><PenLine className="w-3.5 h-3.5" />Extracts writing patterns</span>
                <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" />Generates voice profile</span>
              </div>
              <Button
                onClick={handleTrain}
                disabled={!name || trainingContent.length < 50 || isTraining || !wsId}
                className="gap-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700"
              >
                {isTraining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isTraining ? "Training AI…" : "Train Brand Voice"}
              </Button>
            </div>

            {isTraining && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                <Loader2 className="w-4 h-4 animate-spin text-rose-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-rose-700 dark:text-rose-400">Analyzing your brand voice…</p>
                  <p className="text-xs text-rose-600/70 dark:text-rose-500">Extracting tone, vocabulary, patterns, and personality traits</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How it works */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: PenLine, label: "Paste content samples", desc: "Any posts, copy, or emails", color: "text-rose-500" },
            { icon: Sparkles, label: "AI analyzes patterns", desc: "Tone, style, vocabulary", color: "text-pink-500" },
            { icon: Mic2, label: "Voice profile created", desc: "Detailed brand DNA", color: "text-violet-500" },
            { icon: Wand2, label: "Rewrite any content", desc: "Instant voice matching", color: "text-indigo-500" },
          ].map(({ icon: Icon, label, desc, color }, i) => (
            <div key={i} className="p-3 rounded-xl bg-muted/40 text-center space-y-1">
              <Icon className={`w-5 h-5 mx-auto ${color}`} />
              <p className="text-xs font-semibold">{label}</p>
              <p className="text-[10px] text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        {/* Profiles */}
        {(profiles as any[]).length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Brand Voice Profiles ({(profiles as any[]).length})
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {(profiles as any[]).map((profile: any) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  onActivate={(id) => activate.mutate({ workspaceId: wsId, profileId: id })}
                  onApply={(profileId, content, platform) => {
                    applyVoice.mutate({ workspaceId: wsId, brandProfileId: profileId, content, platform: platform as any });
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          !isTraining && (
            <div className="text-center py-16 text-muted-foreground">
              <Mic2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No brand voice profiles yet</p>
              <p className="text-sm mt-1">Paste your content samples above to train your first brand voice</p>
            </div>
          )
        )}
      </div>
    </AppLayout>
  );
}
