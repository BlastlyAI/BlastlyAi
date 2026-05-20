import AppLayout from "@/components/AppLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Megaphone, Plus, TrendingUp, Target, Calendar, Link2, BarChart3, Trash2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  archived: "bg-muted text-muted-foreground",
};

const GOAL_ICONS: Record<string, typeof TrendingUp> = {
  awareness: TrendingUp,
  traffic: Link2,
  engagement: Target,
  conversions: BarChart3,
  leads: Target,
};

export default function Campaigns() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id ?? 0;
  const utils = trpc.useUtils();

  const { data: campaigns = [], isLoading } = trpc.campaigns.list.useQuery({ workspaceId: wsId }, { enabled: !!wsId });
  const createMutation = trpc.campaigns.create.useMutation({
    onSuccess: () => { utils.campaigns.list.invalidate(); setShowDialog(false); toast.success("Campaign created"); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.campaigns.delete.useMutation({
    onSuccess: () => { utils.campaigns.list.invalidate(); toast.success("Campaign deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", goal: "", promotedUrl: "", utmSource: "", utmMedium: "", utmCampaign: "", startDate: "", endDate: "" });

  const resetForm = () => setForm({ name: "", description: "", goal: "", promotedUrl: "", utmSource: "", utmMedium: "", utmCampaign: "", startDate: "", endDate: "" });

  const handleCreate = () => {
    if (!form.name) { toast.error("Campaign name is required"); return; }
    createMutation.mutate({
      workspaceId: wsId,
      name: form.name,
      description: form.description || undefined,
      goal: (form.goal as any) || undefined,
      promotedUrl: form.promotedUrl || undefined,
      utmSource: form.utmSource || undefined,
      utmMedium: form.utmMedium || undefined,
      utmCampaign: form.utmCampaign || form.name.toLowerCase().replace(/\s+/g, "-"),
      startsAt: form.startDate ? new Date(form.startDate) : undefined,
      endsAt: form.endDate ? new Date(form.endDate) : undefined,
    });
  };

  return (
    <AppLayout title="Campaigns">
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Campaigns</h2>
            <p className="text-muted-foreground text-sm mt-0.5">Group related posts and track performance with UTM parameters.</p>
          </div>
          <Button onClick={() => setShowDialog(true)} className="gap-2 shadow-sm shadow-primary/20">
            <Plus className="w-4 h-4" />New campaign
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total", value: (campaigns as any[]).length, color: "text-foreground" },
            { label: "Active", value: (campaigns as any[]).filter((c: any) => c.status === "active").length, color: "text-emerald-600" },
            { label: "Draft", value: (campaigns as any[]).filter((c: any) => c.status === "draft").length, color: "text-muted-foreground" },
            { label: "Completed", value: (campaigns as any[]).filter((c: any) => c.status === "completed").length, color: "text-blue-600" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="border-border/60 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Campaign list */}
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : (campaigns as any[]).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Megaphone className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No campaigns yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">Create your first campaign to group posts, track UTM performance, and measure your marketing goals.</p>
            <Button onClick={() => setShowDialog(true)} className="gap-2"><Plus className="w-4 h-4" />Create first campaign</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(campaigns as any[]).map((campaign: any) => {
              const GoalIcon = GOAL_ICONS[campaign.goal] ?? TrendingUp;
              return (
                <Card key={campaign.id} className="border-border/60 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <GoalIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${STATUS_COLORS[campaign.status]} border-0 text-[10px] capitalize`}>{campaign.status}</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteMutation.mutate({ id: campaign.id, workspaceId: wsId })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{campaign.name}</h3>
                    {campaign.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{campaign.description}</p>}
                    <div className="space-y-1.5">
                      {campaign.goal && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Target className="w-3 h-3" />
                          <span className="capitalize">{campaign.goal}</span>
                        </div>
                      )}
                      {campaign.promotedUrl && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Link2 className="w-3 h-3" />
                          <span className="truncate">{campaign.promotedUrl}</span>
                        </div>
                      )}
                      {(campaign.startDate || campaign.endDate) && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {campaign.startDate ? format(new Date(campaign.startDate), "MMM d") : "—"}
                            {" → "}
                            {campaign.endDate ? format(new Date(campaign.endDate), "MMM d, yyyy") : "Ongoing"}
                          </span>
                        </div>
                      )}
                      {campaign.utmCampaign && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <BarChart3 className="w-3 h-3" />
                          <span className="font-mono">utm_campaign={campaign.utmCampaign}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Campaign Name *</Label>
              <Input placeholder="e.g. Summer Product Launch" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="What is this campaign about?" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Goal</Label>
              <Select value={form.goal} onValueChange={(v) => setForm({ ...form, goal: v })}>
                <SelectTrigger><SelectValue placeholder="Select goal" /></SelectTrigger>
                <SelectContent>
                  {["awareness", "traffic", "engagement", "conversions", "leads"].map((g) => (
                    <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Promoted URL</Label>
              <Input placeholder="https://example.com/product" value={form.promotedUrl} onChange={(e) => setForm({ ...form, promotedUrl: e.target.value })} />
            </div>
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">UTM Parameters</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">utm_source</Label>
                  <Input placeholder="blastly" value={form.utmSource} onChange={(e) => setForm({ ...form, utmSource: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">utm_medium</Label>
                  <Input placeholder="social" value={form.utmMedium} onChange={(e) => setForm({ ...form, utmMedium: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">utm_campaign</Label>
                  <Input placeholder="summer-launch" value={form.utmCampaign} onChange={(e) => setForm({ ...form, utmCampaign: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-2">
              <Plus className="w-4 h-4" />Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
