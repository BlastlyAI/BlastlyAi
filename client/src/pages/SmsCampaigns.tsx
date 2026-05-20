import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Users,
  Megaphone,
  ChevronLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Sparkles,
  Share2,
} from "lucide-react";
import { useLocation } from "wouter";

// ─── Delivery channel options ─────────────────────────────────────────────────
const CHANNELS = [
  { id: "sms",    label: "SMS only",         icon: MessageSquare, color: "blue" },
  { id: "social", label: "Social only",       icon: Share2,        color: "purple" },
  { id: "both",   label: "SMS + Social",      icon: Megaphone,     color: "green" },
] as const;

type DeliveryChannel = typeof CHANNELS[number]["id"];

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === "sent")    return <Badge className="bg-green-100 text-green-700 border-0 text-xs gap-1"><CheckCircle2 className="w-3 h-3" />Sent</Badge>;
  if (status === "sending") return <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs gap-1"><Clock className="w-3 h-3" />Sending</Badge>;
  if (status === "failed")  return <Badge className="bg-red-100 text-red-700 border-0 text-xs gap-1"><AlertCircle className="w-3 h-3" />Failed</Badge>;
  return <Badge className="bg-gray-100 text-gray-600 border-0 text-xs">Draft</Badge>;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SmsCampaigns() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: workspaces } = trpc.workspace.list.useQuery(undefined, { enabled: !!user });
  const workspaceId = workspaces?.[0]?.id ?? 0;

  // Form state
  const [name, setName]               = useState("");
  const [message, setMessage]         = useState("");
  const [tagFilter, setTagFilter]     = useState("");
  const [channel, setChannel]         = useState<DeliveryChannel>("sms");
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending]         = useState(false);

  // Tags for filter picker
  const { data: allTags = [] } = trpc.contacts.listTags.useQuery(
    { workspaceId },
    { enabled: !!workspaceId }
  );

  // Campaign history
  const { data: campaigns = [], refetch } = trpc.contacts.listCampaigns.useQuery(
    { workspaceId },
    { enabled: !!workspaceId }
  );

  // Preview query (debounced via showPreview flag)
  const { data: preview, isFetching: previewLoading } = trpc.contacts.previewCampaign.useQuery(
    { workspaceId, messageTemplate: message, tagFilter: tagFilter || undefined },
    { enabled: showPreview && !!workspaceId && !!message }
  );

  // Send mutation
  const sendMut = trpc.contacts.sendCampaign.useMutation({
    onSuccess: (r) => {
      setSending(false);
      refetch();
      toast.success(`Campaign sent to ${r.sentCount} contacts${r.failedCount > 0 ? ` (${r.failedCount} failed)` : ""}`);
      if (!r.twilioConfigured) {
        toast("Demo mode — add Twilio credentials in Settings to send real SMS", { icon: "ℹ️" });
      }
      setName("");
      setMessage("");
      setTagFilter("");
      setChannel("sms");
      setShowPreview(false);
    },
    onError: (e) => {
      setSending(false);
      toast.error(e.message || "Send failed");
    },
  });

  function handleSend() {
    if (!name.trim()) { toast.error("Give this campaign a name"); return; }
    if (!message.trim()) { toast.error("Write a message first"); return; }
    setSending(true);
    sendMut.mutate({
      workspaceId,
      name,
      messageTemplate: message,
      tagFilter: tagFilter || undefined,
      deliveryChannel: channel,
    });
  }

  // Character count
  const charCount = message.length;
  const smsCount  = Math.ceil(charCount / 160) || 1;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/command")}
          className="text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <Megaphone className="w-5 h-5 text-blue-600" />
        <h1 className="font-semibold text-gray-900 text-lg">SMS Campaigns</h1>
        <button
          onClick={() => navigate("/contacts")}
          className="ml-auto flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          <Users className="w-4 h-4" />
          Manage Contacts
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* Compose card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            New Campaign
          </h2>

          {/* Campaign name */}
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Campaign name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Winter special offer"
              className="text-sm"
            />
          </div>

          {/* Message */}
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">
              Message — use <code className="bg-gray-100 px-1 rounded">{"{name}"}</code> to personalise
            </Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Hi {name}, we have a special offer just for you this week! 🎉"
              rows={4}
              className="text-sm resize-none"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-400">{charCount} chars · {smsCount} SMS credit{smsCount > 1 ? "s" : ""} per recipient</span>
            </div>
          </div>

          {/* Tag filter */}
          <div>
            <Label className="text-xs text-gray-600 mb-1.5 block flex items-center gap-1">
              <Users className="w-3 h-3" />
              Send to <span className="font-normal text-gray-400 ml-1">(leave blank to send to all contacts)</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setTagFilter("")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  !tagFilter ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                All contacts
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tagFilter === tag ? "" : tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    tagFilter === tag ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery channel */}
          <div>
            <Label className="text-xs text-gray-600 mb-1.5 block">Deliver via</Label>
            <div className="grid grid-cols-3 gap-2">
              {CHANNELS.map(ch => {
                const Icon = ch.icon;
                const active = channel === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setChannel(ch.id)}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-xs font-medium transition-all ${
                      active
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? "text-blue-600" : "text-gray-400"}`} />
                    {ch.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview + Send */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-sm"
              onClick={() => setShowPreview(!showPreview)}
              disabled={!message}
            >
              <Eye className="w-4 h-4" />
              {showPreview ? "Hide Preview" : "Preview"}
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm"
              disabled={!name || !message || sending}
              onClick={handleSend}
            >
              <Send className="w-4 h-4" />
              {sending ? "Sending…" : "Send Campaign"}
            </Button>
          </div>

          {/* Preview panel */}
          {showPreview && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Preview — first 5 contacts
              </p>
              {previewLoading && <p className="text-xs text-gray-400">Loading…</p>}
              {preview && preview.previews.length === 0 && (
                <p className="text-xs text-gray-500">No contacts match this filter.</p>
              )}
              {preview?.previews.map((p, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-medium text-gray-700 mb-1">{p.name} · {p.phone || "no phone"}</p>
                  <p className="text-sm text-gray-800 leading-relaxed">{p.message}</p>
                </div>
              ))}
              {preview && (
                <p className="text-xs text-gray-400">
                  Total recipients: <strong>{preview.totalCount}</strong>
                  {tagFilter ? ` (filtered by "${tagFilter}")` : " (all contacts)"}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Campaign history */}
        {campaigns.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">Campaign History</h2>
            </div>
            {campaigns.map((c, i) => (
              <div
                key={c.id}
                className={`px-4 py-3 flex items-start gap-3 ${i < campaigns.length - 1 ? "border-b border-gray-100" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                    <StatusBadge status={c.status} />
                    <Badge variant="outline" className="text-xs capitalize">{c.deliveryChannel}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{c.messageTemplate}</p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    <span>{c.totalRecipients} recipients</span>
                    {c.sentCount > 0 && <span className="text-green-600">{c.sentCount} sent</span>}
                    {c.failedCount > 0 && <span className="text-red-500">{c.failedCount} failed</span>}
                    {c.sentAt && <span>{new Date(c.sentAt).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {campaigns.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No campaigns sent yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
