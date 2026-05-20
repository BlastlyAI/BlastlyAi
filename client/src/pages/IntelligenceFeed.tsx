import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  MessageCircle, Phone, Mail, Calendar, Star, TrendingUp,
  DollarSign, Globe, AlertTriangle, CheckCircle2, Clock,
  ChevronDown, ChevronUp, Send, X, Zap, Bell, Info,
  Instagram, Facebook, Youtube, RefreshCw
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type FeedItem = {
  id: number;
  workspaceId: number;
  priority: number;
  itemType: string;
  channel: string | null;
  senderName: string | null;
  senderAvatar: string | null;
  messageSnippet: string | null;
  aiContextLine: string | null;
  aiDraftReply: string | null;
  scheduledAt: Date | null;
  metadata: Record<string, unknown> | null;
  status: string;
  actionedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getChannelIcon(channel: string | null) {
  switch (channel) {
    case "instagram": return <Instagram className="w-4 h-4" />;
    case "facebook": return <Facebook className="w-4 h-4" />;
    case "youtube": return <Youtube className="w-4 h-4" />;
    case "sms": return <Phone className="w-4 h-4" />;
    case "email": return <Mail className="w-4 h-4" />;
    case "calendar": return <Calendar className="w-4 h-4" />;
    case "google": return <Star className="w-4 h-4" />;
    case "square": return <DollarSign className="w-4 h-4" />;
    case "ads": return <Zap className="w-4 h-4" />;
    default: return <Globe className="w-4 h-4" />;
  }
}

function getItemIcon(itemType: string) {
  if (itemType.startsWith("appointment")) return <Calendar className="w-5 h-5" />;
  if (itemType.startsWith("lead") || itemType === "booking_request") return <Bell className="w-5 h-5" />;
  if (itemType.startsWith("message")) return <MessageCircle className="w-5 h-5" />;
  if (itemType === "post_approval") return <CheckCircle2 className="w-5 h-5" />;
  if (itemType === "review_negative") return <Star className="w-5 h-5" />;
  if (itemType === "traction_post") return <TrendingUp className="w-5 h-5" />;
  if (itemType === "budget_low") return <AlertTriangle className="w-5 h-5" />;
  if (itemType === "invoice_paid") return <DollarSign className="w-5 h-5" />;
  return <Info className="w-5 h-5" />;
}

function getChannelLabel(channel: string | null) {
  const labels: Record<string, string> = {
    instagram: "Instagram", facebook: "Facebook", youtube: "YouTube",
    sms: "SMS", email: "Email", calendar: "Calendar", google: "Google",
    square: "Square", ads: "Ads", website: "Website",
  };
  return channel ? (labels[channel] ?? channel) : "";
}

function formatTime(date: Date | null) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function timeUntil(date: Date | null) {
  if (!date) return "";
  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return "Now";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

// ─── Feed Card ────────────────────────────────────────────────────────────────
function FeedCard({
  item,
  onAction,
  onDismiss,
}: {
  item: FeedItem;
  onAction: (id: number, reply?: string) => void;
  onDismiss: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState(item.aiDraftReply ?? "");
  const [sending, setSending] = useState(false);

  const isUrgent = item.priority <= 3;
  const isAppointment = item.itemType.startsWith("appointment");
  const isMessage = item.itemType.startsWith("message") || item.itemType === "lead_new";
  const isReview = item.itemType === "review_negative";
  const isApproval = item.itemType === "post_approval";
  const isAwareness = item.priority === 6;

  const urgentBorder = item.priority === 1
    ? "border-l-4 border-l-blue-500"
    : item.priority <= 3
    ? "border-l-4 border-l-amber-500"
    : "border-l-4 border-l-slate-300";

  async function handleSend() {
    setSending(true);
    await new Promise(r => setTimeout(r, 400));
    onAction(item.id, replyText);
    setSending(false);
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 ${urgentBorder} overflow-hidden transition-all`}>
      {/* Card header */}
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
          ${isAppointment ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" :
            isMessage ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" :
            isReview ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400" :
            isApproval ? "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400" :
            "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
          {getItemIcon(item.itemType)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {item.senderName && (
              <span className="font-semibold text-slate-900 dark:text-white text-sm">
                {item.senderName}
              </span>
            )}
            {item.channel && (
              <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                {getChannelIcon(item.channel)}
                {getChannelLabel(item.channel)}
              </span>
            )}
            {isAppointment && item.scheduledAt && (
              <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300">
                <Clock className="w-3 h-3 mr-1" />
                {formatTime(item.scheduledAt)} · {timeUntil(item.scheduledAt)}
              </Badge>
            )}
          </div>

          {item.messageSnippet && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
              {item.messageSnippet}
            </p>
          )}

          {item.aiContextLine && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic">
              {item.aiContextLine}
            </p>
          )}
        </div>

        {/* Expand toggle for messages/reviews */}
        {(isMessage || isReview) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Inline reply box */}
      {(isMessage || isReview) && expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-slate-100 dark:border-slate-700 pt-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            AI-drafted reply — edit before sending
          </p>
          <Textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            rows={3}
            className="text-sm resize-none"
            placeholder="Type your reply..."
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending || !replyText.trim()}
              className="flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              {sending ? "Sending…" : "Send Reply"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDismiss(item.id)}
              className="text-slate-500"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Appointment actions */}
      {isAppointment && (
        <div className="flex gap-2 px-4 pb-4">
          <Button size="sm" onClick={() => onAction(item.id)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Confirm
          </Button>
          <Button size="sm" variant="outline" onClick={() => onAction(item.id)}>
            Reschedule
          </Button>
          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => onDismiss(item.id)}>
            Cancel
          </Button>
        </div>
      )}

      {/* Post approval actions */}
      {isApproval && (
        <div className="flex gap-2 px-4 pb-4">
          <Button size="sm" onClick={() => onAction(item.id)} className="bg-green-600 hover:bg-green-700 text-white">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="outline">Edit</Button>
          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => onDismiss(item.id)}>
            Reject
          </Button>
        </div>
      )}

      {/* Awareness actions */}
      {isAwareness && (
        <div className="flex gap-2 px-4 pb-4">
          {item.itemType === "traction_post" && (
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
              <Zap className="w-3 h-3 mr-1" /> Boost Post
            </Button>
          )}
          {item.itemType === "budget_low" && (
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
              <DollarSign className="w-3 h-3 mr-1" /> Top Up
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-slate-500" onClick={() => onDismiss(item.id)}>
            <X className="w-3 h-3 mr-1" /> Got it
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function IntelligenceFeed() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id ?? 0;

  const { data: items = [], isLoading, refetch, isFetching } = trpc.intelligence.list.useQuery(
    { workspaceId: wsId },
    { enabled: !!wsId, refetchInterval: 30000 }
  );

  const actionItem = trpc.intelligence.action.useMutation({
    onSuccess: () => { refetch(); },
    onError: () => toast.error("Failed to action item"),
  });

  const dismissItem = trpc.intelligence.dismiss.useMutation({
    onSuccess: () => { refetch(); },
    onError: () => toast.error("Failed to dismiss item"),
  });

  const seedDemo = trpc.intelligence.seedDemo.useMutation({
    onSuccess: (data) => {
      toast.success(`Demo feed loaded — ${data.count} items added`);
      refetch();
    },
  });

  function handleAction(id: number, reply?: string) {
    actionItem.mutate({ workspaceId: wsId, itemId: id, replyText: reply });
  }

  function handleDismiss(id: number) {
    dismissItem.mutate({ workspaceId: wsId, itemId: id });
  }

  // Split into two sections
  const urgentItems = items.filter(i => i.priority <= 5);
  const awarenessItems = items.filter(i => i.priority === 6);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Intelligence Feed</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Live updates — everything happening in your business
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className={`p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-transform ${isFetching ? "animate-spin" : ""}`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Demo seed button (shown when feed is empty) */}
      {!isLoading && items.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
            <Bell className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">Your feed is empty</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Connect your channels to start seeing live updates
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => seedDemo.mutate({ workspaceId: wsId })}
            disabled={seedDemo.isPending}
          >
            Load demo feed
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Section 1: Needs Attention */}
      {urgentItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Needs Attention
            </h2>
            <Badge variant="destructive" className="text-xs px-1.5 py-0">
              {urgentItems.length}
            </Badge>
          </div>
          <div className="space-y-3">
            {urgentItems.map(item => (
              <FeedCard
                key={item.id}
                item={item}
                onAction={handleAction}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        </section>
      )}

      {/* All clear state for Section 1 */}
      {!isLoading && urgentItems.length === 0 && items.length > 0 && (
        <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-400 font-medium">
            All clear — nothing needs your attention right now
          </p>
        </div>
      )}

      {/* Divider */}
      {urgentItems.length > 0 && awarenessItems.length > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-700" />
      )}

      {/* Section 2: Your Business */}
      {awarenessItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Your Business
            </h2>
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {awarenessItems.length}
            </Badge>
          </div>
          <div className="space-y-3">
            {awarenessItems.map(item => (
              <FeedCard
                key={item.id}
                item={item}
                onAction={handleAction}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
