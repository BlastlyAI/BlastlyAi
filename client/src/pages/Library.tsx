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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BookOpen, Plus, Trash2, Copy, Hash, FileText, Image, Tag, Search } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

const TYPE_ICONS: Record<string, typeof FileText> = {
  template: FileText,
  hashtag_set: Hash,
  brand_asset: Image,
  snippet: Tag,
};

const TYPE_COLORS: Record<string, string> = {
  template: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  hashtag_set: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  brand_asset: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  snippet: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function Library() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id ?? 0;
  const utils = trpc.useUtils();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ name: "", type: "template" as "template" | "hashtag_set" | "brand_asset", content: "", tags: "", platform: "" });

  const { data: items = [], isLoading } = trpc.library.list.useQuery({ workspaceId: wsId }, { enabled: !!wsId });
  const createMutation = trpc.library.create.useMutation({
    onSuccess: () => { utils.library.list.invalidate(); setShowDialog(false); toast.success("Item saved to library"); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.library.delete.useMutation({
    onSuccess: () => { utils.library.list.invalidate(); toast.success("Item deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => setForm({ name: "", type: "template", content: "", tags: "", platform: "" });

  const filteredItems = (items as any[]).filter((item: any) => {
    const matchesSearch = !search || item.name?.toLowerCase().includes(search.toLowerCase()) || item.content?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleCreate = () => {
    if (!form.name || !form.content) { toast.error("Name and content are required"); return; }
    createMutation.mutate({
      workspaceId: wsId,
      name: form.name,
      type: form.type,
      content: form.content,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      platforms: form.platform ? [form.platform] : undefined,
    });
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  const groupedByType = {
    template: filteredItems.filter((i: any) => i.type === "template"),
    hashtag_set: filteredItems.filter((i: any) => i.type === "hashtag_set"),
    snippet: filteredItems.filter((i: any) => i.type === "snippet"),
    brand_asset: filteredItems.filter((i: any) => i.type === "brand_asset"),
  };

  return (
    <AppLayout title="Library">
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Content Library</h2>
            <p className="text-muted-foreground text-sm mt-0.5">Save and reuse templates, hashtag sets, and brand snippets.</p>
          </div>
          <Button onClick={() => setShowDialog(true)} className="gap-2 shadow-sm shadow-primary/20">
            <Plus className="w-4 h-4" />Add to library
          </Button>
        </div>

        {/* Search + filter */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search library..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="template">Templates</SelectItem>
              <SelectItem value="hashtag_set">Hashtag Sets</SelectItem>
              <SelectItem value="snippet">Snippets</SelectItem>
              <SelectItem value="asset">Assets</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <BookOpen className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Library is empty</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">Save post templates, hashtag sets, and brand snippets here for quick reuse.</p>
            <Button onClick={() => setShowDialog(true)} className="gap-2"><Plus className="w-4 h-4" />Add first item</Button>
          </div>
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all" className="text-xs">All ({filteredItems.length})</TabsTrigger>
              <TabsTrigger value="template" className="text-xs">Templates ({groupedByType.template.length})</TabsTrigger>
              <TabsTrigger value="hashtag_set" className="text-xs">Hashtags ({groupedByType.hashtag_set.length})</TabsTrigger>
              <TabsTrigger value="snippet" className="text-xs">Snippets ({groupedByType.snippet.length})</TabsTrigger>
              <TabsTrigger value="brand_asset" className="text-xs">Brand Assets ({groupedByType.brand_asset.length})</TabsTrigger>
            </TabsList>

            {["all", "template", "hashtag_set", "snippet", "brand_asset"].map((tab) => {
              const tabItems = tab === "all" ? filteredItems : filteredItems.filter((i: any) => i.type === tab);
              return (
                <TabsContent key={tab} value={tab}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tabItems.map((item: any) => {
                      const Icon = TYPE_ICONS[item.type] ?? FileText;
                      return (
                        <Card key={item.id} className="border-border/60 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${TYPE_COLORS[item.type]}`}>
                                  <Icon className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{item.name}</p>
                                  {item.platform && <p className="text-[10px] text-muted-foreground capitalize">{item.platform}</p>}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleCopy(item.content)}>
                                  <Copy className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteMutation.mutate({ id: item.id, workspaceId: wsId })}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-3 mb-2">{item.content}</p>
                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {(Array.isArray(item.tags) ? item.tags : JSON.parse(item.tags ?? "[]")).slice(0, 4).map((tag: string) => (
                                  <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0">{tag}</Badge>
                                ))}
                              </div>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-2">{format(new Date(item.createdAt), "MMM d, yyyy")}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Library</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="e.g. Product launch template" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "template" | "hashtag_set" | "brand_asset" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="template">Post Template</SelectItem>
                  <SelectItem value="hashtag_set">Hashtag Set</SelectItem>
                  <SelectItem value="snippet">Text Snippet</SelectItem>
                  <SelectItem value="brand_asset">Brand Asset</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Content *</Label>
              <Textarea placeholder={form.type === "hashtag_set" ? "#hashtag1 #hashtag2 #hashtag3" : "Enter your template content..."} rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Platform (optional)</Label>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue placeholder="All platforms" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All platforms</SelectItem>
                  <SelectItem value="twitter">Twitter/X</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tags (comma-separated)</Label>
              <Input placeholder="e.g. product, launch, promo" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-2">
              <Plus className="w-4 h-4" />Save to Library
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
