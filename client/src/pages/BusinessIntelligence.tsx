import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getAppLoginPath } from "@/const";
import { toast } from "sonner";
import {
  Camera, CheckCircle2, X, Calendar,
  Bell, DollarSign, Send, Phone, Mail,
  Zap, LayoutDashboard, FileText, MessageSquare,
  ChevronDown, ChevronUp, Star,
} from "lucide-react";
import { Link } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────
type FeedItem = {
  id: number;
  workspaceId: number;
  priority: number;
  itemType: string;
  channel: string | null;
  senderName: string | null;
  messageSnippet: string | null;
  aiContextLine: string | null;
  aiDraftReply: string | null;
  scheduledAt: Date | null;
  metadata: Record<string, unknown> | null;
  status: string;
};

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG       = "oklch(0.13 0.012 245)";
const PANEL    = "oklch(0.18 0.010 245)";
const PANEL_HO = "oklch(0.21 0.010 245)";
const BORDER   = "oklch(0.26 0.008 245)";
const MUTED    = "oklch(0.48 0.03 245)";
const WHITE    = "oklch(0.96 0.005 245)";
const BLUE     = "oklch(0.52 0.18 220)";
const BLUE_DIM = "oklch(0.52 0.18 220 / 0.15)";

// ─── Status pill config ───────────────────────────────────────────────────────
function pillConfig(type: string): { label: string; bg: string; color: string } {
  switch (type) {
    case "appointment_upcoming": return { label: "APPOINTMENT", bg: "oklch(0.52 0.18 220 / 0.18)", color: "oklch(0.72 0.14 220)" };
    case "booking_request":      return { label: "BOOKING REQUEST", bg: "oklch(0.52 0.18 220 / 0.18)", color: "oklch(0.72 0.14 220)" };
    case "lead_new":             return { label: "NEW LEAD", bg: "oklch(0.48 0.16 165 / 0.18)", color: "oklch(0.72 0.14 165)" };
    case "lead_quote":           return { label: "QUOTE REQUEST", bg: "oklch(0.48 0.16 165 / 0.18)", color: "oklch(0.72 0.14 165)" };
    case "message_dm":           return { label: "DIRECT MESSAGE", bg: BLUE_DIM, color: "oklch(0.72 0.14 220)" };
    case "message_email":        return { label: "EMAIL", bg: BLUE_DIM, color: "oklch(0.72 0.14 220)" };
    case "message_sms":          return { label: "SMS", bg: BLUE_DIM, color: "oklch(0.72 0.14 220)" };
    case "review_negative":      return { label: "REVIEW", bg: "oklch(0.52 0.20 20 / 0.18)", color: "oklch(0.72 0.16 20)" };
    case "post_approval":        return { label: "NEEDS APPROVAL", bg: BLUE_DIM, color: "oklch(0.72 0.14 220)" };
    case "traction_post":        return { label: "POST TRACTION", bg: BLUE_DIM, color: "oklch(0.72 0.14 220)" };
    case "budget_low":           return { label: "AD BUDGET", bg: "oklch(0.55 0.16 55 / 0.18)", color: "oklch(0.78 0.14 55)" };
    case "invoice_paid":         return { label: "PAYMENT RECEIVED", bg: "oklch(0.48 0.16 165 / 0.18)", color: "oklch(0.72 0.14 165)" };
    default:                     return { label: "NOTIFICATION", bg: BLUE_DIM, color: "oklch(0.72 0.14 220)" };
  }
}

function channelIcon(channel: string | null) {
  const ch = (channel || "").toLowerCase();
  if (ch === "instagram") return "📸";
  if (ch === "facebook")  return "👥";
  if (ch === "email")     return "✉️";
  if (ch === "sms")       return "💬";
  if (ch === "google")    return "⭐";
  if (ch === "calendar")  return "📅";
  if (ch === "square" || ch === "stripe") return "💳";
  return "🔔";
}

// ─── Quick reply templates ────────────────────────────────────────────────────
const QUICK_REPLIES: Record<string, string[]> = {
  lead_new:             ["Thanks for reaching out! When would suit you?", "Happy to help — can I get a few more details?", "We have availability this week. Shall I book you in?"],
  lead_quote:           ["Thanks! I'll prepare a quote and send it shortly.", "Can you tell me more about the job?", "Happy to provide a quote — what's the address?"],
  message_dm:           ["Thanks for your message! I'll get back to you shortly.", "Great question — let me check and come back to you.", "Thanks for reaching out 😊"],
  message_email:        ["Thanks for your email. I'll respond in full shortly.", "Received — I'll look into this and get back to you today."],
  message_sms:          ["Got your message, thanks! I'll call you shortly.", "Thanks — I'll get back to you within the hour."],
  booking_request:      ["Confirmed! See you then.", "Thanks — I'll check availability and confirm shortly.", "Unfortunately that time is taken — can you do Thursday?"],
  review_negative:      ["Thank you for your feedback. I'm sorry to hear about your experience — please contact us directly so we can make this right.", "We take all feedback seriously and would love to resolve this for you."],
  appointment_upcoming: ["Looking forward to seeing you!", "Just confirming your appointment — see you soon.", "Please let us know if you need to reschedule."],
};

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.70)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-5 space-y-3"
        style={{ background: "oklch(0.17 0.012 245)", border: `1px solid ${BORDER}` }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-base" style={{ color: WHITE }}>{title}</h3>
          <button onClick={onClose} style={{ color: MUTED }}><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Feed Card ────────────────────────────────────────────────────────────────
function FeedCard({ item, onAction, onDismiss }: {
  item: FeedItem;
  onAction: (id: number, reply?: string) => void;
  onDismiss: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reply, setReply]       = useState(item.aiDraftReply || "");
  const [sending, setSending]   = useState(false);
  const pill    = pillConfig(item.itemType);
  const isReply = ["lead_new","lead_quote","message_dm","message_email","message_sms","booking_request","review_negative","appointment_upcoming"].includes(item.itemType);
  const isApprove = item.itemType === "post_approval";
  const isAware   = item.priority >= 6;
  const templates = QUICK_REPLIES[item.itemType] || [];

  function handleSend() {
    setSending(true);
    setTimeout(() => {
      onAction(item.id, reply);
      toast.success("Reply sent");
      setSending(false);
    }, 600);
  }

  return (
    <div
      className="rounded-xl cursor-pointer transition-colors"
      style={{ background: expanded ? PANEL_HO : PANEL, border: `1px solid ${BORDER}` }}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Card header */}
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="text-lg leading-none mt-0.5 flex-shrink-0">{channelIcon(item.channel)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded-md" style={{ background: pill.bg, color: pill.color }}>{pill.label}</span>
            {item.scheduledAt && (
              <span className="text-[10px]" style={{ color: MUTED }}>
                {new Date(item.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold truncate" style={{ color: WHITE }}>{item.senderName || "Unknown"}</p>
          <p className="text-sm truncate" style={{ color: "oklch(0.72 0.02 245)" }}>{item.messageSnippet}</p>
          {item.aiContextLine && (
            <p className="text-[11px] mt-0.5 italic" style={{ color: MUTED }}>✦ {item.aiContextLine}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isAware && (
            <button className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              onClick={e => { e.stopPropagation(); onDismiss(item.id); }}
              style={{ color: MUTED }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span style={{ color: MUTED }}>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </div>
      </div>

      {/* Expanded area */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: BORDER }} onClick={e => e.stopPropagation()}>
          {isReply && (
            <div className="space-y-2 pt-3">
              {/* Quick reply templates */}
              {templates.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {templates.map((t, i) => (
                    <button key={i}
                      className="text-[11px] px-2.5 py-1 rounded-full border transition-colors hover:border-blue-400/50"
                      style={{ background: BLUE_DIM, borderColor: "oklch(0.52 0.18 220 / 0.30)", color: "oklch(0.78 0.12 220)" }}
                      onClick={() => setReply(t)}>
                      {t.length > 40 ? t.slice(0, 40) + "…" : t}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                rows={3}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none border"
                style={{ background: "oklch(0.15 0.010 245)", borderColor: BORDER, color: WHITE }}
                placeholder="Type your reply…"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSend}
                  disabled={sending || !reply.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-opacity"
                  style={{ background: BLUE }}>
                  <Send className="w-3.5 h-3.5" />{sending ? "Sending…" : "Send Reply"}
                </button>
                <button onClick={() => onDismiss(item.id)}
                  className="px-4 py-2 rounded-xl text-sm border transition-colors hover:bg-white/5"
                  style={{ borderColor: BORDER, color: MUTED }}>
                  Dismiss
                </button>
              </div>
            </div>
          )}
          {isApprove && (
            <div className="flex gap-2 pt-3">
              <button onClick={() => onAction(item.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: BLUE }}>
                <CheckCircle2 className="w-3.5 h-3.5" />Approve
              </button>
              <button className="px-4 py-2 rounded-xl text-sm border transition-colors hover:bg-white/5"
                style={{ borderColor: BORDER, color: MUTED }}>Edit</button>
              <button onClick={() => onDismiss(item.id)}
                className="px-4 py-2 rounded-xl text-sm border transition-colors hover:bg-white/5"
                style={{ borderColor: BORDER, color: MUTED }}>Reject</button>
            </div>
          )}
          {isAware && (
            <div className="flex gap-2 pt-3">
              {item.itemType === "traction_post" && (
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                  style={{ background: BLUE }}
                  onClick={() => toast.success("Opening boost options…")}>
                  <Zap className="w-3 h-3" />Boost Post
                </button>
              )}
              {item.itemType === "budget_low" && (
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                  style={{ background: BLUE }}
                  onClick={() => toast.success("Opening ad budget…")}>
                  <DollarSign className="w-3 h-3" />Top Up
                </button>
              )}
              <button onClick={() => onDismiss(item.id)}
                className="px-3 py-1.5 rounded-xl text-xs border transition-colors hover:bg-white/5"
                style={{ borderColor: BORDER, color: MUTED }}>
                Got it
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Day Calendar ─────────────────────────────────────────────────────────────
const DEMO_APPOINTMENTS = [
  { time: "9:00 AM",  name: "Sarah M.",   service: "Colour + Cut",     status: "confirmed" },
  { time: "11:00 AM", name: "Emma T.",    service: "Blow Dry",          status: "pending" },
  { time: "1:30 PM",  name: "James K.",   service: "Quote — Hot Water", status: "lead" },
  { time: "3:00 PM",  name: "Mia R.",     service: "Full Colour",       status: "confirmed" },
  { time: "5:00 PM",  name: "David H.",   service: "Trim",              status: "confirmed" },
];

function statusBadge(status: string) {
  if (status === "confirmed") return { label: "Confirmed", color: "oklch(0.72 0.14 220)", bg: "oklch(0.52 0.18 220 / 0.15)" };
  if (status === "pending")   return { label: "Pending",   color: "oklch(0.72 0.14 165)", bg: "oklch(0.48 0.16 165 / 0.15)" };
  return { label: "Lead", color: "oklch(0.78 0.14 55)", bg: "oklch(0.55 0.16 55 / 0.15)" };
}

function DayCalendar() {
  const today = new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" });
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" style={{ color: BLUE }} />
          <span className="text-sm font-bold" style={{ color: WHITE }}>Today's Schedule</span>
        </div>
        <span className="text-xs" style={{ color: MUTED }}>{today}</span>
      </div>
      <div className="divide-y" style={{ borderColor: BORDER }}>
        {DEMO_APPOINTMENTS.map((a, i) => {
          const s = statusBadge(a.status);
          return (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-xs font-mono w-16 flex-shrink-0" style={{ color: MUTED }}>{a.time}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: WHITE }}>{a.name}</p>
                <p className="text-xs truncate" style={{ color: MUTED }}>{a.service}</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: s.bg, color: s.color }}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Payments Today ───────────────────────────────────────────────────────────
const DEMO_PAYMENTS = [
  { time: "8:42 AM",  name: "Sarah M.",   amount: 185, source: "Square" },
  { time: "10:15 AM", name: "Tom W.",     amount: 320, source: "Invoice" },
  { time: "12:30 PM", name: "Clinic Co.", amount: 840, source: "Stripe" },
];

function PaymentsToday() {
  const total = DEMO_PAYMENTS.reduce((s, p) => s + p.amount, 0);
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4" style={{ color: "oklch(0.65 0.14 165)" }} />
          <span className="text-sm font-bold" style={{ color: WHITE }}>Payments Today</span>
        </div>
        <span className="text-sm font-bold" style={{ color: "oklch(0.72 0.14 165)" }}>${total.toLocaleString()}</span>
      </div>
      <div className="divide-y" style={{ borderColor: BORDER }}>
        {DEMO_PAYMENTS.map((p, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
            <span className="text-xs font-mono w-16 flex-shrink-0" style={{ color: MUTED }}>{p.time}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: WHITE }}>{p.name}</p>
              <p className="text-xs" style={{ color: MUTED }}>{p.source}</p>
            </div>
            <span className="text-sm font-bold" style={{ color: "oklch(0.72 0.14 165)" }}>${p.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main FieldView ───────────────────────────────────────────────────────────
export default function FieldView() {
  const { user }              = useAuth();
  const { currentWorkspace }  = useWorkspace();
  const wsId                  = currentWorkspace?.id;

  const [mobileTab, setMobileTab]   = useState<"feed" | "day">("feed");
  const [showEmail, setShowEmail]   = useState(false);
  const [showSMS, setShowSMS]       = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  const feedQuery   = trpc.intelligence.list.useQuery({ workspaceId: wsId! }, { enabled: !!wsId, refetchInterval: 30_000 });
  const actionItem  = trpc.intelligence.action.useMutation({ onSuccess: () => feedQuery.refetch() });
  const dismissItem = trpc.intelligence.dismiss.useMutation({ onSuccess: () => feedQuery.refetch() });
  const seedDemo    = trpc.intelligence.seedDemo.useMutation({ onSuccess: () => feedQuery.refetch() });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="text-center space-y-4">
          <p className="font-semibold" style={{ color: WHITE }}>Sign in to access your feed</p>
          <a href={getAppLoginPath()} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm"
            style={{ background: BLUE }}>Sign In</a>
        </div>
      </div>
    );
  }

  const items          = feedQuery.data ?? [];
  const leadsItems     = items.filter(i => i.itemType.startsWith("lead") || i.itemType === "booking_request");
  const urgentItems    = items.filter(i => i.priority <= 5 && !i.itemType.startsWith("lead") && i.itemType !== "booking_request");
  const awarenessItems = items.filter(i => i.priority >= 6);
  const actionCount    = leadsItems.length + urgentItems.length;

  const businessName = currentWorkspace?.name || "My Business";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG, fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b"
        style={{ background: "oklch(0.15 0.012 245 / 0.97)", borderColor: BORDER, backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-3">
          <a href="/" className="flex-shrink-0 hover:opacity-80 transition-opacity">
            <img
              src="/manus-storage/blastly-icon-512_d2809e7c.png"
              alt="Blastly"
              className="h-10 w-10 rounded-xl object-cover flex-shrink-0"
            />
          </a>
          <div>
            <p className="text-sm font-bold leading-tight" style={{ color: WHITE }}>{businessName}</p>
            <p className="text-[11px] leading-tight" style={{ color: MUTED }}>{greeting} · {new Date().toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {actionCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: "oklch(0.52 0.20 20 / 0.20)", color: "oklch(0.78 0.16 20)" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "oklch(0.65 0.20 20)" }} />
              {actionCount} action{actionCount !== 1 ? "s" : ""}
            </span>
          )}
          <button className="p-2 rounded-xl" style={{ color: MUTED }}>
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Quick Action Strip ── */}
      <div className="px-4 py-3 grid grid-cols-4 gap-2 border-b" style={{ borderColor: BORDER }}>
        {[
          { icon: Mail,        label: "Email",   action: () => setShowEmail(true) },
          { icon: MessageSquare, label: "SMS",   action: () => setShowSMS(true) },
          { icon: Camera,      label: "Post",    action: () => toast.info("Opening Quick Post…") },
          { icon: FileText,    label: "Invoice", action: () => setShowInvoice(true) },
        ].map(({ icon: Icon, label, action }) => (
          <button key={label} onClick={action}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-colors hover:border-blue-400/40"
            style={{ background: PANEL, borderColor: BORDER }}>
            <Icon className="w-5 h-5" style={{ color: BLUE }} />
            <span className="text-[11px] font-semibold" style={{ color: "oklch(0.72 0.04 245)" }}>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Mobile Tab Switcher ── */}
      <div className="flex md:hidden border-b" style={{ borderColor: BORDER }}>
        {(["feed", "day"] as const).map(tab => (
          <button key={tab} onClick={() => setMobileTab(tab)}
            className="flex-1 py-2.5 text-sm font-semibold transition-colors"
            style={{
              color: mobileTab === tab ? WHITE : MUTED,
              borderBottom: mobileTab === tab ? `2px solid ${BLUE}` : "2px solid transparent",
            }}>
            {tab === "feed" ? "Live Feed" : "My Day"}
          </button>
        ))}
      </div>

      {/* ── Two-column body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — Live Feed */}
        <div className={`flex-1 overflow-y-auto px-3 py-4 space-y-2 ${mobileTab === "day" ? "hidden md:block" : ""}`}>

          {feedQuery.isLoading && (
            <div className="text-center py-12" style={{ color: MUTED }}>Loading your feed…</div>
          )}

          {!feedQuery.isLoading && items.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm" style={{ color: MUTED }}>Your feed is clear — great work!</p>
              <button onClick={() => wsId && seedDemo.mutate({ workspaceId: wsId })}
                className="text-xs px-4 py-2 rounded-xl border transition-colors hover:bg-white/5"
                style={{ borderColor: BORDER, color: MUTED }}>
                Load demo
              </button>
            </div>
          )}

          {/* LEADS section */}
          {leadsItems.length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest px-1 pt-1" style={{ color: MUTED }}>
                New Leads &amp; Bookings
              </p>
              {leadsItems.map(item => (
                <FeedCard key={item.id} item={item}
                  onAction={(id, r) => actionItem.mutate({ workspaceId: wsId!, itemId: id, replyText: r })}
                  onDismiss={id => dismissItem.mutate({ workspaceId: wsId!, itemId: id })}
                />
              ))}
            </>
          )}

          {/* NEEDS ACTION section */}
          {urgentItems.length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest px-1 pt-2" style={{ color: MUTED }}>
                Needs Action
              </p>
              {urgentItems.map(item => (
                <FeedCard key={item.id} item={item}
                  onAction={(id, r) => actionItem.mutate({ workspaceId: wsId!, itemId: id, replyText: r })}
                  onDismiss={id => dismissItem.mutate({ workspaceId: wsId!, itemId: id })}
                />
              ))}
            </>
          )}

          {/* YOUR BUSINESS section */}
          {awarenessItems.length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest px-1 pt-2" style={{ color: MUTED }}>
                Your Business
              </p>
              {awarenessItems.map(item => (
                <FeedCard key={item.id} item={item}
                  onAction={(id, r) => actionItem.mutate({ workspaceId: wsId!, itemId: id, replyText: r })}
                  onDismiss={id => dismissItem.mutate({ workspaceId: wsId!, itemId: id })}
                />
              ))}
            </>
          )}

          {/* Office View link */}
          <div className="text-center pt-6 pb-8">
            <Link href="/dashboard">
              <span className="inline-flex items-center gap-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity" style={{ color: "oklch(0.38 0.02 245)" }}>
                <LayoutDashboard className="w-3.5 h-3.5" />Office View
              </span>
            </Link>
          </div>
        </div>

        {/* RIGHT — My Day */}
        <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 overflow-y-auto px-3 py-4 space-y-3 border-l ${mobileTab === "feed" ? "hidden md:flex md:flex-col" : "flex flex-col"}`}
          style={{ borderColor: BORDER }}>
          <DayCalendar />
          <PaymentsToday />
        </div>
      </div>

      {/* ── Email Modal ── */}
      <Modal show={showEmail} onClose={() => setShowEmail(false)} title="Send Email">
        <input placeholder="To" className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border"
          style={{ background: "oklch(0.15 0.010 245)", borderColor: BORDER, color: WHITE }} />
        <input placeholder="Subject" className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border"
          style={{ background: "oklch(0.15 0.010 245)", borderColor: BORDER, color: WHITE }} />
        <textarea placeholder="Message…" rows={4} className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border resize-none"
          style={{ background: "oklch(0.15 0.010 245)", borderColor: BORDER, color: WHITE }} />
        <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: BLUE }}
          onClick={() => { toast.success("Email sent"); setShowEmail(false); }}>
          <Send className="w-4 h-4" />Send Email
        </button>
      </Modal>

      {/* ── SMS Modal ── */}
      <Modal show={showSMS} onClose={() => setShowSMS(false)} title="Send SMS">
        <input placeholder="Phone number" className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border"
          style={{ background: "oklch(0.15 0.010 245)", borderColor: BORDER, color: WHITE }} />
        <textarea placeholder="Message…" rows={3} className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border resize-none"
          style={{ background: "oklch(0.15 0.010 245)", borderColor: BORDER, color: WHITE }} />
        <div className="flex flex-wrap gap-1.5">
          {["Thanks for reaching out!", "I'll call you shortly.", "Can you come in Thursday?"].map(t => (
            <button key={t} className="text-[11px] px-2.5 py-1 rounded-full border"
              style={{ background: BLUE_DIM, borderColor: "oklch(0.52 0.18 220 / 0.30)", color: "oklch(0.78 0.12 220)" }}>
              {t}
            </button>
          ))}
        </div>
        <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: BLUE }}
          onClick={() => { toast.success("SMS sent"); setShowSMS(false); }}>
          <Phone className="w-4 h-4" />Send SMS
        </button>
      </Modal>

      {/* ── Invoice Modal ── */}
      <Modal show={showInvoice} onClose={() => setShowInvoice(false)} title="Raise Invoice">
        <input placeholder="Client name or email" className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border"
          style={{ background: "oklch(0.15 0.010 245)", borderColor: BORDER, color: WHITE }} />
        <input placeholder="Description of work" className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border"
          style={{ background: "oklch(0.15 0.010 245)", borderColor: BORDER, color: WHITE }} />
        <input placeholder="Amount ($)" type="number" className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border"
          style={{ background: "oklch(0.15 0.010 245)", borderColor: BORDER, color: WHITE }} />
        <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: BLUE }}
          onClick={() => { toast.success("Invoice raised and sent"); setShowInvoice(false); }}>
          <FileText className="w-4 h-4" />Send Invoice
        </button>
      </Modal>
    </div>
  );
}
