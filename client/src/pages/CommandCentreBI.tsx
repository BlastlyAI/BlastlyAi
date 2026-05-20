import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AppointmentDrawer } from "@/components/AppointmentDrawer";
import ClientContactModal from "@/components/ClientContactModal";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  Camera, CheckCircle2, X, Calendar,
  DollarSign, Send, Phone, Mail,
  Zap, LayoutDashboard, FileText, MessageSquare,
  Star, Plus, Sun, Moon, Users, Mic, MicOff,
  ChevronRight, Archive, Reply, Trash2, ShieldCheck,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import LeadBookingSheet from "@/components/LeadBookingSheet";

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

// ─── Design tokens factory ────────────────────────────────────────────────────
function makeTokens(dark: boolean) {
  return {
    BG:          dark ? "#0f1117" : "#ffffff",
    PANEL:       dark ? "#1a1d27" : "#f9fafb",
    PANEL_HO:    dark ? "#22263a" : "#f3f4f6",
    BORDER:      dark ? "#2d3148" : "#e5e7eb",
    BORDER_DARK: dark ? "#4a5080" : "#9ca3af",
    TEXT:        dark ? "#f1f5f9" : "#111827",
    MUTED:       dark ? "#8b95b0" : "#6b7280",
    BLUE:        "#3b82f6",
    BLUE_SOFT:   dark ? "#1e3a5f" : "#eff6ff",
    GREEN:       "#16a34a",
    GREEN_SOFT:  dark ? "#14532d" : "#f0fdf4",
    RED:         "#ef4444",
    RED_SOFT:    dark ? "#450a0a" : "#fef2f2",
    AMBER:       "#d97706",
    AMBER_SOFT:  dark ? "#451a03" : "#fffbeb",
    SHADOW_SM:   dark ? "0 1px 4px rgba(0,0,0,0.4)" : "0 1px 3px rgba(0,0,0,0.07)",
    SHADOW_MD:   dark ? "0 4px 16px rgba(0,0,0,0.5)" : "0 4px 12px rgba(0,0,0,0.08)",
  };
}

// ─── Pill config ──────────────────────────────────────────────────────────────
function pillConfig(type: string, isDark = false) {
  const T = makeTokens(isDark);
  switch (type) {
    case "appointment_upcoming":
    case "booking_request":  return { label: type === "booking_request" ? "BOOKING" : "APPT", bg: T.BLUE_SOFT,  color: T.BLUE,  leftBorder: T.BLUE  };
    case "lead_new":         return { label: "LEAD",     bg: T.GREEN_SOFT, color: T.GREEN, leftBorder: T.GREEN };
    case "lead_quote":       return { label: "QUOTE",    bg: T.GREEN_SOFT, color: T.GREEN, leftBorder: T.GREEN };
    case "message_dm":       return { label: "DM",       bg: T.BLUE_SOFT,  color: T.BLUE,  leftBorder: T.BLUE  };
    case "message_email":    return { label: "EMAIL",    bg: T.BLUE_SOFT,  color: T.BLUE,  leftBorder: T.BLUE  };
    case "message_sms":      return { label: "SMS",      bg: T.BLUE_SOFT,  color: T.BLUE,  leftBorder: T.BLUE  };
    case "review_negative":  return { label: "REVIEW",   bg: T.RED_SOFT,   color: T.RED,   leftBorder: T.RED   };
    case "post_approval":    return { label: "APPROVAL", bg: T.AMBER_SOFT, color: T.AMBER, leftBorder: T.AMBER };
    case "traction_post":    return { label: "TRACTION", bg: T.BLUE_SOFT,  color: T.BLUE,  leftBorder: T.BLUE  };
    case "budget_low":       return { label: "BUDGET",   bg: T.AMBER_SOFT, color: T.AMBER, leftBorder: T.AMBER };
    case "invoice_paid":     return { label: "PAYMENT",  bg: T.GREEN_SOFT, color: T.GREEN, leftBorder: T.GREEN };
    default:                 return { label: "INFO",     bg: T.BLUE_SOFT,  color: T.BLUE,  leftBorder: T.BLUE  };
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
  lead_quote:           ["Thanks! I'll prepare a quote and send it shortly.", "Can you tell me more about the job?"],
  message_dm:           ["Thanks for your message! I'll get back to you shortly.", "Great question — let me check and come back to you."],
  message_email:        ["Thanks for your email. I'll respond in full shortly.", "Received — I'll look into this and get back to you today."],
  message_sms:          ["Got your message, thanks! I'll call you shortly.", "Thanks — I'll get back to you within the hour."],
  booking_request:      ["Confirmed! See you then.", "Thanks — I'll check availability and confirm shortly."],
  review_negative:      ["Thank you for your feedback. I'm sorry to hear about your experience — please contact us directly so we can make this right."],
  appointment_upcoming: ["Looking forward to seeing you!", "Just confirming your appointment — see you soon."],
};

// ─── Compact Feed Card with swipe-left actions ────────────────────────────────
function CompactFeedCard({ item, onAction, onDismiss, onReply }: {
  item: FeedItem;
  onAction: (id: number, reply?: string) => void;
  onDismiss: (id: number) => void;
  onReply: (item: FeedItem) => void;
}) {
  const { theme } = useTheme();
  const T = makeTokens(theme === "dark");
  const isDark = theme === "dark";
  const pill = pillConfig(item.itemType, isDark);

  // Swipe state
  const [swipeX, setSwipeX] = useState(0);
  const [swiped, setSwiped] = useState(false);
  const startX = useRef(0);
  const isDragging = useRef(false);

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0) setSwipeX(Math.max(dx, -120));
  }
  function onTouchEnd() {
    isDragging.current = false;
    if (swipeX < -60) setSwiped(true);
    else { setSwipeX(0); setSwiped(false); }
  }

  // Mouse swipe for desktop testing
  function onMouseDown(e: React.MouseEvent) {
    startX.current = e.clientX;
    isDragging.current = true;
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging.current) return;
    const dx = e.clientX - startX.current;
    if (dx < 0) setSwipeX(Math.max(dx, -120));
  }
  function onMouseUp() {
    isDragging.current = false;
    if (swipeX < -60) setSwiped(true);
    else { setSwipeX(0); setSwiped(false); }
  }

  const translateX = swiped ? -112 : swipeX;

  const isUrgent = item.priority <= 2 || item.itemType === "review_negative";
  const isApprove = item.itemType === "post_approval";

  return (
    <div className="relative overflow-hidden rounded-xl" style={{ boxShadow: T.SHADOW_SM }}>
      {/* Swipe-reveal action buttons (behind the card) */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center gap-1 pr-2"
        style={{ background: isDark ? "#1a1d27" : "#f3f4f6" }}>
        <button
          onClick={() => { onReply(item); setSwiped(false); setSwipeX(0); }}
          className="flex flex-col items-center justify-center w-10 h-10 rounded-xl text-white text-[9px] font-bold gap-0.5"
          style={{ background: T.BLUE }}>
          <Reply className="w-3.5 h-3.5" />
          Reply
        </button>
        {isApprove && (
          <button
            onClick={() => { onAction(item.id); setSwiped(false); setSwipeX(0); }}
            className="flex flex-col items-center justify-center w-10 h-10 rounded-xl text-white text-[9px] font-bold gap-0.5"
            style={{ background: T.GREEN }}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            OK
          </button>
        )}
        <button
          onClick={() => { onDismiss(item.id); setSwiped(false); setSwipeX(0); }}
          className="flex flex-col items-center justify-center w-10 h-10 rounded-xl text-[9px] font-bold gap-0.5"
          style={{ background: T.PANEL, color: T.MUTED, border: `1px solid ${T.BORDER}` }}>
          <Archive className="w-3.5 h-3.5" />
          Done
        </button>
      </div>

      {/* Card face */}
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer select-none"
        style={{
          background: T.BG,
          borderTop: `1px solid ${T.BORDER}`,
          borderRight: `1px solid ${T.BORDER}`,
          borderBottom: `1px solid ${T.BORDER}`,
          borderLeft: `3px solid ${pill.leftBorder}`,
          borderRadius: "0.75rem",
          transform: `translateX(${translateX}px)`,
          transition: isDragging.current ? "none" : "transform 0.2s ease",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onClick={() => {
          if (Math.abs(swipeX) < 5 && !swiped) onReply(item);
        }}
      >
        {/* Channel icon */}
        <span className="text-base leading-none flex-shrink-0">{channelIcon(item.channel)}</span>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: pill.bg, color: pill.color }}>{pill.label}</span>
            <span className="text-xs font-semibold truncate" style={{ color: T.TEXT }}>
              {item.senderName || "Unknown"}
            </span>
            {isUrgent && (
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: T.RED }} />
            )}
          </div>
          <p className="text-[11px] truncate mt-0.5" style={{ color: T.MUTED }}>
            {item.messageSnippet}
          </p>
        </div>

        {/* Time + chevron */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {item.scheduledAt && (
            <span className="text-[9px]" style={{ color: T.MUTED }}>
              {new Date(item.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <ChevronRight className="w-3 h-3" style={{ color: T.MUTED }} />
        </div>
      </div>
    </div>
  );
}

// ─── Reply Panel (opens to the right of the feed) ────────────────────────────
function ReplyPanel({ item, onClose, onSend, onDismiss, isDark, workspaceId, onBookAppointment }: {
  item: FeedItem;
  onClose: () => void;
  onSend: (id: number, reply: string) => void;
  onDismiss: (id: number) => void;
  isDark: boolean;
  workspaceId?: number;
  onBookAppointment?: (lead: { name: string; phone?: string; email?: string }) => void;
}) {
  const T = makeTokens(isDark);
  const pill = pillConfig(item.itemType, isDark);
  const [reply, setReply] = useState(item.aiDraftReply || "");
  const [listening, setListening] = useState(false);
  const [sending, setSending] = useState(false);
  const [channel, setChannel] = useState<"sms" | "email" | "social">("sms");
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const templates = QUICK_REPLIES[item.itemType] || [];

  function startListening() {
    type SR = { new(): { continuous: boolean; interimResults: boolean; lang: string; onresult: ((e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void; }; };
    const w = window as unknown as Record<string, unknown>;
    const SRClass = (w["SpeechRecognition"] || w["webkitSpeechRecognition"]) as SR | undefined;
    if (!SRClass) { toast.error("Voice input not supported in this browser"); return; }
    const rec = new SRClass();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-AU";
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setReply(prev => prev ? prev + " " + transcript : transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function handleSend() {
    if (!reply.trim()) return;
    setSending(true);
    setTimeout(() => {
      onSend(item.id, reply);
      toast.success("Reply sent");
      setSending(false);
      onClose();
    }, 600);
  }

  const isApprove = item.itemType === "post_approval";

  return (
    <div className="flex flex-col h-full" style={{ background: T.BG }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: T.BORDER }}>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: pill.bg, color: pill.color }}>{pill.label}</span>
          <span className="text-sm font-bold" style={{ color: T.TEXT }}>{item.senderName}</span>
        </div>
        <button onClick={onClose} style={{ color: T.MUTED }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Client info */}
      <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: T.BORDER, background: T.PANEL }}>
        <p className="text-xs font-semibold mb-1" style={{ color: T.MUTED }}>MESSAGE</p>
        <p className="text-sm" style={{ color: T.TEXT }}>{item.messageSnippet}</p>
        {item.aiContextLine && (
          <p className="text-[11px] mt-1.5 italic" style={{ color: T.BLUE }}>✦ {item.aiContextLine}</p>
        )}
        {item.scheduledAt && (
          <p className="text-[11px] mt-1" style={{ color: T.MUTED }}>
            📅 {new Date(item.scheduledAt).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      {/* Channel selector */}
      <div className="flex-shrink-0 flex gap-1.5 px-4 pt-3 pb-1">
        <p className="text-[10px] font-bold uppercase tracking-widest self-center mr-1" style={{ color: T.MUTED }}>Reply via</p>
        {(["sms", "email", "social"] as const).map(ch => (
          <button key={ch} onClick={() => setChannel(ch)}
            className="flex-1 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wide border transition-all"
            style={{
              background: channel === ch ? T.BLUE : "transparent",
              borderColor: channel === ch ? T.BLUE : T.BORDER,
              color: channel === ch ? "#fff" : T.MUTED,
            }}>
            {ch === "sms" ? "💬 SMS" : ch === "email" ? "✉️ Email" : "📱 Social"}
          </button>
        ))}
      </div>

      {/* Reply area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Quick reply chips */}
        {templates.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: T.MUTED }}>Quick replies</p>
            <div className="flex flex-col gap-1.5">
              {templates.map((t, i) => (
                <button key={i}
                  className="text-left text-xs px-3 py-2 rounded-xl border transition-colors hover:opacity-80"
                  style={{ background: T.BLUE_SOFT, borderColor: "#bfdbfe", color: T.BLUE }}
                  onClick={() => setReply(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Book Appointment — shown for leads and booking requests */}
        {(item.itemType === "lead_new" || item.itemType === "lead_quote" || item.itemType === "booking_request") && onBookAppointment && (
          <button
            onClick={() => onBookAppointment({
              name:  item.senderName || "New Lead",
              phone: (item.metadata?.phone as string) || undefined,
              email: (item.metadata?.email as string) || undefined,
            })}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #16a34a, #15803d)" }}>
            <Calendar className="w-4 h-4" />Book Appointment
          </button>
        )}

        {/* Approve action */}
        {isApprove && (
          <button
            onClick={() => { onSend(item.id, "Approved"); onClose(); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: T.GREEN }}>
            <CheckCircle2 className="w-4 h-4" />Approve Post
          </button>
        )}
      </div>

      {/* Voice + text reply bar */}
      <div className="px-4 pb-4 pt-2 space-y-2 flex-shrink-0 border-t" style={{ borderColor: T.BORDER }}>
        <div className="flex items-end gap-2">
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={2}
            className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none resize-none border"
            style={{ background: T.PANEL, borderColor: T.BORDER, color: T.TEXT }}
            placeholder="Type or speak your reply…"
          />
          {/* Voice button */}
          <button
            onMouseDown={startListening}
            onMouseUp={stopListening}
            onTouchStart={startListening}
            onTouchEnd={stopListening}
            className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: listening
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : "linear-gradient(135deg, #7c3aed, #6d28d9)",
              boxShadow: listening ? "0 0 12px rgba(239,68,68,0.5)" : "0 2px 8px rgba(124,58,237,0.35)",
            }}
            title="Hold to speak">
            {listening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-white" />}
          </button>
        </div>
        {listening && (
          <p className="text-[11px] text-center animate-pulse" style={{ color: T.RED }}>
            🎙 Listening… release to stop
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleSend}
            disabled={sending || !reply.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-opacity"
            style={{ background: T.BLUE }}>
            <Send className="w-3.5 h-3.5" />
            {sending ? "Sending…" : "Send Reply"}
          </button>
          <button
            onClick={() => { onDismiss(item.id); onClose(); }}
            className="px-4 py-2.5 rounded-xl text-sm border transition-colors"
            style={{ borderColor: T.BORDER, color: T.MUTED }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Rotating Awareness Ticker ────────────────────────────────────────────────
function AwarenessTicker({ items, onPin, isDark }: {
  items: FeedItem[];
  onPin: (item: FeedItem) => void;
  isDark: boolean;
}) {
  const T = makeTokens(isDark);
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setIndex(i => (i + 1) % items.length);
        setAnimating(false);
      }, 300);
    }, 20_000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;

  const current = items[index];
  const pill = pillConfig(current.itemType, isDark);

  return (
    <div className="flex-shrink-0 border-t" style={{ borderColor: T.BORDER }}>
      {/* Section label */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: T.MUTED }}>
          Awareness · {index + 1}/{items.length}
        </span>
        <div className="flex gap-0.5">
          {items.map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full transition-all"
              style={{ background: i === index ? T.BLUE : T.BORDER }} />
          ))}
        </div>
      </div>

      {/* Rotating card */}
      <div
        className="mx-3 mb-2 rounded-xl px-3 py-2 flex items-center gap-2.5 cursor-pointer transition-all"
        style={{
          background: T.PANEL,
          borderTop: `1px solid ${T.BORDER}`,
          borderRight: `1px solid ${T.BORDER}`,
          borderBottom: `1px solid ${T.BORDER}`,
          borderLeft: `3px solid ${pill.leftBorder}`,
          opacity: animating ? 0 : 1,
          transform: animating ? "translateY(4px)" : "translateY(0)",
          transition: "opacity 0.3s ease, transform 0.3s ease",
        }}
        onClick={() => onPin(current)}
      >
        <span className="text-sm leading-none flex-shrink-0">{channelIcon(current.channel)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-full"
              style={{ background: pill.bg, color: pill.color }}>{pill.label}</span>
            <span className="text-xs font-semibold truncate" style={{ color: T.TEXT }}>{current.senderName}</span>
          </div>
          <p className="text-[11px] truncate mt-0.5" style={{ color: T.MUTED }}>{current.messageSnippet}</p>
        </div>
        <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: T.MUTED }} />
      </div>
    </div>
  );
}

// ─── Urgent Pop-up Notification ──────────────────────────────────────────────
function UrgentPopup({ item, onReply, onDismiss }: {
  item: FeedItem | null;
  onReply: (item: FeedItem) => void;
  onDismiss: (id: number) => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const T = makeTokens(isDark);
  const [countdown, setCountdown] = useState(30);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!item) { setVisible(false); setCountdown(30); return; }
    setVisible(true);
    setCountdown(30);
    const tick = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(tick);
          setVisible(false);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [item?.id]);

  if (!item || !visible) return null;

  const pill = pillConfig(item.itemType, isDark);
  const isLead = item.itemType.startsWith("lead");
  const isBooking = item.itemType.startsWith("booking");
  const accentColor = isLead ? T.GREEN : isBooking ? T.BLUE : T.RED;

  return (
    <div
      className="fixed top-4 left-1/2 z-[9999] w-[min(420px,90vw)]"
      style={{
        transform: "translateX(-50%)",
        animation: "urgentSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
      }}
    >
      <style>{`
        @keyframes urgentSlideIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-24px) scale(0.94); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)    scale(1); }
        }
        @keyframes urgentPulse {
          0%, 100% { box-shadow: 0 0 0 0 ${accentColor}55, 0 8px 32px rgba(0,0,0,0.35); }
          50%       { box-shadow: 0 0 0 6px ${accentColor}22, 0 8px 32px rgba(0,0,0,0.35); }
        }
      `}</style>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: isDark ? "#12141f" : "#ffffff",
          border: `2px solid ${accentColor}`,
          animation: "urgentPulse 1.8s ease-in-out infinite",
        }}
      >
        {/* Coloured top bar */}
        <div className="px-4 py-2 flex items-center justify-between"
          style={{ background: accentColor }}>
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-black tracking-wide">
              {isLead ? "📥 NEW LEAD" : isBooking ? "📅 BOOKING REQUEST" : "⚠️ URGENT"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/80 text-xs font-mono">{countdown}s</span>
            <button onClick={() => { setVisible(false); onDismiss(item.id); }}
              className="text-white/70 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
              style={{ background: pill.bg }}>
              {channelIcon(item.channel)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold text-sm" style={{ color: T.TEXT }}>{item.senderName}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: pill.bg, color: pill.color }}>{pill.label}</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: T.MUTED }}>{item.messageSnippet}</p>
            </div>
          </div>
        </div>
        {/* Action buttons */}
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={() => { setVisible(false); onReply(item); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: accentColor }}>
            <MessageSquare className="w-4 h-4" />
            Reply Now
          </button>
          <button
            onClick={() => { setVisible(false); onDismiss(item.id); }}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-opacity-10"
            style={{ borderColor: T.BORDER, color: T.MUTED }}>
            Dismiss
          </button>
        </div>
        {/* Countdown bar */}
        <div className="h-1" style={{ background: T.BORDER }}>
          <div
            className="h-full transition-all"
            style={{
              width: `${(countdown / 30) * 100}%`,
              background: accentColor,
              transition: "width 1s linear",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Demo appointment type ──────────────────────────────────────────────────
type DemoAppt = { time: string; name: string; service: string; status: string };

// ─── Day Calendar ─────────────────────────────────────────────────────────────
const ALL_SLOTS = ["8:00 AM","8:30 AM","9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM","5:30 PM"];
const DEMO_APPOINTMENTS = [
  { time: "9:00 AM",  name: "Sarah M.",  service: "Colour + Cut",     status: "confirmed" },
  { time: "11:00 AM", name: "Emma T.",   service: "Blow Dry",          status: "pending"   },
  { time: "1:30 PM",  name: "James K.",  service: "Quote — Hot Water", status: "lead"      },
  { time: "3:00 PM",  name: "Mia R.",    service: "Full Colour",       status: "confirmed" },
  { time: "5:00 PM",  name: "David H.",  service: "Trim",              status: "confirmed" },
];

function statusBadge(status: string, T: ReturnType<typeof makeTokens>) {
  if (status === "confirmed") return { label: "Confirmed", color: T.BLUE,  bg: T.BLUE_SOFT  };
  if (status === "pending")   return { label: "Pending",   color: T.AMBER, bg: T.AMBER_SOFT };
  return                             { label: "Lead",      color: T.GREEN, bg: T.GREEN_SOFT };
}

function DayCalendar({ isDark, wsId, onSelectAppointment }: { isDark: boolean; wsId?: number; onSelectAppointment: (appt: DemoAppt) => void }) {
  const T = makeTokens(isDark);
  const today = new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" });
  const bookedTimes = new Set(DEMO_APPOINTMENTS.map(a => a.time));
  return (
    <div className="rounded-2xl overflow-hidden flex-shrink-0" style={{ background: T.BG, border: `2px solid ${T.BORDER_DARK}`, boxShadow: T.SHADOW_MD }}>
      <div className="px-3 py-2.5 flex items-center justify-between"
        style={{ background: isDark ? "#1e2030" : "#1e293b" }}>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-white" />
          <span className="text-xs font-bold text-white">Today's Schedule</span>
        </div>
        <span className="text-[10px] text-white/70">{today}</span>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
        {ALL_SLOTS.map((slot, i) => {
          const appt = DEMO_APPOINTMENTS.find(a => a.time === slot);
          const isBooked = bookedTimes.has(slot);
          const s = appt ? statusBadge(appt.status, T) : null;
          return (
            <div key={i}
              className={`flex items-center gap-2 px-3 py-1.5 border-b ${isBooked ? "cursor-pointer hover:opacity-80" : ""}`}
              style={{ borderColor: T.BORDER, background: isBooked ? (isDark ? "#1e3a5f22" : "#eff6ff") : "transparent" }}
              onClick={() => isBooked && appt && onSelectAppointment(appt)}>
              <span className="text-[10px] font-mono w-12 flex-shrink-0" style={{ color: T.MUTED }}>{slot}</span>
              {isBooked && appt ? (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate" style={{ color: T.TEXT }}>{appt.name}</p>
                    <p className="text-[10px] truncate" style={{ color: T.MUTED }}>{appt.service}</p>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: s!.bg, color: s!.color }}>{s!.label}</span>
                </>
              ) : (
                <button
                  className="flex-1 flex items-center justify-between cursor-pointer group"
                  onClick={() => onSelectAppointment({ time: slot, name: "", service: "Available", status: "free" })}>
                  <span className="text-[10px] italic" style={{ color: isDark ? "#4b5563" : "#9ca3af" }}>Available</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: T.GREEN_SOFT, color: T.GREEN }}>+ Book</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Invoices & Payments ──────────────────────────────────────────────────────
const DEMO_PAYMENTS = [
  { time: "8:42 AM",  name: "Sarah M.",   amount: 185, source: "Square"  },
  { time: "10:15 AM", name: "Tom W.",     amount: 320, source: "Invoice" },
  { time: "12:30 PM", name: "Clinic Co.", amount: 840, source: "Stripe"  },
];

function InvoicesPayments({ onNewInvoice, isDark }: { onNewInvoice: () => void; isDark: boolean }) {
  const T = makeTokens(isDark);
  const total = DEMO_PAYMENTS.reduce((s, p) => s + p.amount, 0);
  return (
    <div className="rounded-2xl overflow-hidden flex-shrink-0" style={{ background: T.BG, border: `2px solid ${T.BORDER_DARK}`, boxShadow: T.SHADOW_MD }}>
      <div className="px-3 py-2.5 flex items-center justify-between"
        style={{ background: isDark ? "#1e2030" : "#1e293b" }}>
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-white" />
          <span className="text-xs font-bold text-white">Invoices &amp; Payments</span>
        </div>
        <span className="text-[10px] font-bold" style={{ color: "#4ade80" }}>${total.toLocaleString()} today</span>
      </div>
      <div className="divide-y" style={{ borderColor: T.BORDER }}>
        {DEMO_PAYMENTS.map((p, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2">
            <span className="text-[10px] font-mono w-14 flex-shrink-0" style={{ color: T.MUTED }}>{p.time}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: T.TEXT }}>{p.name}</p>
              <p className="text-[10px]" style={{ color: T.MUTED }}>{p.source}</p>
            </div>
            <span className="text-xs font-bold" style={{ color: T.GREEN }}>${p.amount}</span>
          </div>
        ))}
      </div>
      <div className="px-3 py-2.5 border-t" style={{ borderColor: T.BORDER }}>
        <button onClick={onNewInvoice}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", boxShadow: "0 2px 8px rgba(22,163,74,0.3)" }}>
          <Plus className="w-3.5 h-3.5" />New Invoice
        </button>
      </div>
    </div>
  );
}

// ─── Right Panel (stacked: Calendar on top, Invoices below) ───────────────────────────────────────────────
function RightPanel({
  isDark, wsId, onSelectAppointment, onNewInvoice, mobileTab, T
}: {
  isDark: boolean;
  wsId: number | undefined;
  onSelectAppointment: (appt: { time: string; name: string; service: string; status: string }) => void;
  onNewInvoice: () => void;
  mobileTab: "feed" | "day";
  T: ReturnType<typeof makeTokens>;
}) {
  return (
    <div className={`w-full md:w-72 lg:w-80 flex-shrink-0 flex flex-col border-l overflow-y-auto ${mobileTab === "feed" ? "hidden md:flex" : "flex"}`}
      style={{ borderColor: T.BORDER, background: T.BG }}>
      {/* Calendar section */}
      <div className="flex-shrink-0 px-3 py-3">
        <DayCalendar isDark={isDark} wsId={wsId} onSelectAppointment={onSelectAppointment} />
      </div>
      {/* Divider */}
      <div className="flex-shrink-0 h-px mx-3" style={{ background: T.BORDER }} />
      {/* Invoices section directly below */}
      <div className="flex-shrink-0 px-3 py-3">
        <InvoicesPayments onNewInvoice={onNewInvoice} isDark={isDark} />
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────────────────────
function Modal({ show, onClose, title, children, isDark }: { show: boolean; onClose: () => void; title: string; children: React.ReactNode; isDark: boolean }) {
  const T = makeTokens(isDark);
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-5 space-y-3 shadow-xl"
        style={{ background: T.BG, border: `1px solid ${T.BORDER}` }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-base" style={{ color: T.TEXT }}>{title}</h3>
          <button onClick={onClose} style={{ color: T.MUTED }}><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CommandCentreBI() {
  const { user, loading: authLoading } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const T = makeTokens(isDark);
  const [, navigate] = useLocation();
  const wsId = currentWorkspace?.id;
  const planTier = (currentWorkspace as Record<string, unknown>)?.planTier as string | null | undefined;
  const isFreePlan = !planTier || planTier === "snap_and_post" || planTier === "free";

  const [mobileTab, setMobileTab]         = useState<"feed" | "day">("feed");
  const [showEmail, setShowEmail]         = useState(false);
  const [showInvoice, setShowInvoice]     = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [replyItem, setReplyItem]         = useState<FeedItem | null>(null);
  const [selectedAppt, setSelectedAppt]   = useState<DemoAppt | null>(null);
  const [urgentPopupItem, setUrgentPopupItem] = useState<FeedItem | null>(null);
  const [bookingLead, setBookingLead] = useState<{ name: string; phone?: string; email?: string } | null>(null);
  const seenPopupIds = useRef<Set<number>>(new Set());

  const feedQuery   = trpc.intelligence.list.useQuery({ workspaceId: wsId! }, { enabled: !!wsId, refetchInterval: 30_000 });
  const actionItem  = trpc.intelligence.action.useMutation({ onSuccess: () => feedQuery.refetch() });
  const dismissItem = trpc.intelligence.dismiss.useMutation({ onSuccess: () => feedQuery.refetch() });
  const seedDemo    = trpc.intelligence.seedDemo.useMutation({ onSuccess: () => feedQuery.refetch() });
  // Scheduled posts — smart post reminders
  const postsQuery    = trpc.scheduledPosts.list.useQuery({ workspaceId: wsId! }, { enabled: !!wsId, refetchInterval: 60_000 });
  const ensureSlots   = trpc.scheduledPosts.ensureWeeklySlots.useMutation();
  const generateDraft = trpc.scheduledPosts.generateDraft.useMutation({ onSuccess: () => postsQuery.refetch() });
  const approvePost   = trpc.scheduledPosts.approve.useMutation({ onSuccess: () => { postsQuery.refetch(); toast.success("Post approved — publishing now!"); } });
  const skipPost      = trpc.scheduledPosts.skip.useMutation({ onSuccess: () => postsQuery.refetch() });
  const ensureSlotsRef = useRef(false);
  useEffect(() => {
    if (wsId && !ensureSlotsRef.current) {
      ensureSlotsRef.current = true;
      ensureSlots.mutate({ workspaceId: wsId });
    }
  }, [wsId]);

  // Trigger urgent popup for new lead/booking items
  useEffect(() => {
    const items = feedQuery.data ?? [];
    const popupTypes = ["lead_new", "lead_quote", "booking_request"];
    const newItem = items.find(
      i => popupTypes.includes(i.itemType) && !seenPopupIds.current.has(i.id)
    );
    if (newItem) {
      seenPopupIds.current.add(newItem.id);
      setUrgentPopupItem(newItem);
    }
  }, [feedQuery.data]);

  // Convert scheduled posts to FeedItems — MUST be before early returns (hooks rule)
  const items = feedQuery.data ?? [];
  const scheduledPostItems: FeedItem[] = useMemo(() => {
    const posts = postsQuery.data ?? [];
    return posts
      .filter(p => p.status !== "skipped" && p.status !== "approved")
      .map(p => {
        const hoursUntilDue = (p.dueAt - Date.now()) / 3600000;
        const isUrgent = hoursUntilDue < 4 || p.status === "awaiting_approval";
        const dueLabel = hoursUntilDue < 1 ? "due in < 1 hr" :
          hoursUntilDue < 24 ? `due in ${Math.round(hoursUntilDue)}h` :
          `due ${new Date(p.dueAt).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}`;
        return {
          id: -p.id,
          workspaceId: p.workspaceId,
          priority: isUrgent ? 2 : 4,
          itemType: isUrgent && p.status === "awaiting_approval" ? "post_approval" : "traction_post",
          channel: "instagram",
          senderName: isUrgent && p.status === "awaiting_approval" ? "Post ready for approval" : "Scheduled Post",
          messageSnippet: p.draftContent
            ? p.draftContent.slice(0, 80) + (p.draftContent.length > 80 ? "\u2026" : "")
            : `Post ${dueLabel} \u2014 tap to draft with AI`,
          aiContextLine: p.status === "awaiting_approval" ? "AI has drafted this post \u2014 tap Proceed to publish" : `${dueLabel} \u2014 we've pre-drafted it for you`,
          aiDraftReply: p.draftContent ?? null,
          scheduledAt: new Date(p.dueAt),
          metadata: { scheduledPostId: p.id, status: p.status } as Record<string, unknown>,
          status: p.status,
        } satisfies FeedItem;
      });
  }, [postsQuery.data]);

  const URGENT_TYPES = ["lead_new","lead_quote","message_dm","message_email","message_sms","booking_request","review_negative","post_approval","appointment_upcoming"];
  const allItems = useMemo(() => [...items, ...scheduledPostItems], [items, scheduledPostItems]);
  const urgentItems    = allItems.filter(i => i.priority <= 2 || URGENT_TYPES.includes(i.itemType));
  const awarenessItems = allItems.filter(i => !urgentItems.includes(i));

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: T.BG }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#3b82f6" }} />
      </div>
    );
  }
  if (!user) {
    window.location.replace(getLoginUrl());
    return null;
  }

  const actionCount  = urgentItems.length;
  const businessName = currentWorkspace?.name || user?.name || "there";
  const ws = currentWorkspace as Record<string, unknown>;
  const tagline = ws?.tagline as string | undefined;
  const industry = currentWorkspace?.industry;
  const locationCity = ws?.locationCity as string | undefined;
  const subline = tagline || (industry ? `${industry}${locationCity ? ` · ${locationCity}` : ""}` : new Date().toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" }));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";

  // Reply panel: show inline in feed column when replyItem is set
  const showReplyPanel = !!replyItem;

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: T.BG, fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── Free plan upgrade banner ── */}
      {isFreePlan && (
        <UpgradePrompt variant="banner" />
      )}

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b"
        style={{ background: T.BG, borderColor: T.BORDER }}>
        {/* Logo: B icon + Blastly wordmark */}
        <a href="/" className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity">
          <img
            src="/manus-storage/blastly-icon-512_d2809e7c.png"
            alt="Blastly"
            className="h-10 w-10 rounded-xl object-cover flex-shrink-0"
          />
          <span className="text-xl font-black tracking-tight flex-shrink-0" style={{ color: T.TEXT }}>Blastly</span>
        </a>
        <div className="flex-1 min-w-0 pl-1">
          <p className="text-xs font-semibold leading-tight truncate" style={{ color: isDark ? "#94a3b8" : "#64748b" }}>{businessName}</p>
          <p className="text-[10px] truncate" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>{subline}</p>
        </div>
        {/* AI greeting badge removed per user request */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={toggleTheme}
            className="flex items-center justify-center w-7 h-7 rounded-full transition-all hover:opacity-80"
            style={{ background: T.PANEL, border: `1px solid ${T.BORDER}`, color: T.MUTED }}>
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <Link href="/dashboard">
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-full cursor-pointer transition-all hover:opacity-90"
              style={{ background: "#111827", color: "#fff" }}>
              <LayoutDashboard className="w-3 h-3" />Dashboard
            </span>
          </Link>
        </div>
      </div>

      {/* ── Mobile Tab Switcher ── */}
      <div className="flex-shrink-0 flex md:hidden items-center gap-2 px-3 py-2 border-b" style={{ borderColor: T.BORDER, background: T.BG }}>
        {(["feed", "day"] as const).map(tab => {
          const isActive = mobileTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className="flex-1 py-2 rounded-full text-xs font-bold tracking-wide transition-all ring-2"
              style={{
                background: isActive ? (isDark ? "#ffffff" : "#111827") : "transparent",
                color: isActive ? (isDark ? "#111827" : "#ffffff") : (isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)"),
                boxShadow: isActive
                  ? `0 0 0 2px ${isDark ? "#ffffff" : "#111827"}`
                  : `0 0 0 2px ${isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)"}`,
              }}
            >
              {tab === "feed" ? "Live Feed" : "My Day"}
            </button>
          );
        })}
      </div>

      {/* ── Two-column body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — Feed + Reply panel */}
        <div className={`flex-1 flex overflow-hidden ${mobileTab === "day" ? "hidden md:flex" : "flex"}`}>

          {/* Feed list */}
          <div className={`flex flex-col transition-all ${showReplyPanel ? "w-1/2 border-r" : "flex-1"}`}
            style={{ borderColor: T.BORDER, background: isDark ? "#0f1117" : "#f8fafc", height: "100%", overflow: "hidden" }}>

            {/* Urgent section label */}
            <div className="flex-shrink-0 flex items-center justify-between px-3 pt-2.5 pb-1">
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: T.MUTED }}>
                {urgentItems.length > 0 ? `Urgent · ${urgentItems.length}` : "All clear"}
              </span>
              {urgentItems.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: T.RED }} />
              )}
            </div>

            {/* Urgent cards — natural height, scrollable only if > ~6 cards */}
            <div className="overflow-y-auto px-3 space-y-1.5 pb-2" style={{ maxHeight: "calc(100vh - 230px)" }}>
              {feedQuery.isLoading && (
                <div className="text-center py-8" style={{ color: T.MUTED }}>
                  <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-2" style={{ borderColor: T.BLUE }} />
                  Loading…
                </div>
              )}

              {!feedQuery.isLoading && items.length === 0 && (
                <div className="text-center py-8 space-y-2">
                  <p className="text-xl">✅</p>
                  <p className="text-xs font-semibold" style={{ color: T.TEXT }}>All clear — great work!</p>
                  <button onClick={() => wsId && seedDemo.mutate({ workspaceId: wsId })}
                    className="text-[11px] px-3 py-1.5 rounded-xl border transition-colors hover:bg-gray-100"
                    style={{ borderColor: T.BORDER, color: T.MUTED }}>
                    Load demo items
                  </button>
                </div>
              )}

              {urgentItems.map(item => (
                <CompactFeedCard key={item.id} item={item}
                  onAction={(id, _r) => {
                    // Negative IDs are scheduled posts
                    if (id < 0) {
                      const postId = -id;
                      const meta = item.metadata as { status?: string } | null;
                      if (meta?.status === "awaiting_approval") {
                        approvePost.mutate({ postId });
                      } else {
                        generateDraft.mutate({ postId, businessName: currentWorkspace?.name ?? undefined, industry: currentWorkspace?.industry ?? undefined });
                        toast.info("AI is drafting your post…");
                      }
                    } else {
                      actionItem.mutate({ workspaceId: wsId!, itemId: id });
                    }
                  }}
                  onDismiss={id => {
                    if (id < 0) {
                      skipPost.mutate({ postId: -id });
                    } else {
                      dismissItem.mutate({ workspaceId: wsId!, itemId: id });
                    }
                  }}
                  onReply={setReplyItem}
                />
              ))}
            </div>

            {/* Divider between urgent and awareness */}
            {awarenessItems.length > 0 && (
              <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1" style={{ borderTop: `1px solid ${T.BORDER}` }}>
                <div className="flex-1 h-px" style={{ background: T.BORDER }} />
                <span className="text-[9px] font-bold uppercase tracking-widest flex-shrink-0" style={{ color: T.MUTED }}>Awareness</span>
                <div className="flex-1 h-px" style={{ background: T.BORDER }} />
              </div>
            )}

            {/* Rotating awareness ticker — immediately below urgent cards */}
            <AwarenessTicker
              items={awarenessItems}
              onPin={setReplyItem}
              isDark={isDark}
            />

            {/* Spacer — fills remaining space so action strip stays at bottom */}
            <div className="flex-1" />

            {/* Compact action strip — pinned to bottom */}
            <div className="flex-shrink-0 flex gap-1.5 px-3 py-2 border-t" style={{ borderColor: T.BORDER, background: T.BG }}>
              {([
                { icon: Users,       label: "Client Contact", action: () => setShowContactModal(true),                                                  accent: "#3b82f6" },
                { icon: Camera,      label: "Quick Post",      action: () => navigate("/dashboard/quick-capture"),                                         accent: "#7c3aed" },
                { icon: ShieldCheck, label: "Admin Panel",     action: () => window.open("/admin", "_blank", "noopener,noreferrer"),                       accent: "#10b981" },
              ] as { icon: React.ElementType; label: string; action: () => void; accent: string }[]).map(({ icon: Icon, label, action, accent }) => (
                <button key={label} onClick={action}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl border transition-all hover:shadow-sm active:scale-95"
                  style={{ background: T.BG, borderColor: T.BORDER }}>
                  <Icon style={{ color: accent, width: 13, height: 13 }} />
                  <span className="text-[10px] font-semibold" style={{ color: T.TEXT }}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reply panel — desktop: slides in to the right; mobile: full-screen overlay */}
          {showReplyPanel && replyItem && (
            <>
              {/* Desktop side panel (md+) */}
              <div className="hidden md:flex w-1/2 flex-col overflow-hidden border-l" style={{ borderColor: T.BORDER }}>
                <ReplyPanel
                  item={replyItem}
                  isDark={isDark}
                  workspaceId={wsId}
                  onClose={() => setReplyItem(null)}
                  onSend={(id, r) => actionItem.mutate({ workspaceId: wsId!, itemId: id, replyText: r })}
                  onDismiss={id => dismissItem.mutate({ workspaceId: wsId!, itemId: id })}
                  onBookAppointment={lead => { setReplyItem(null); setBookingLead(lead); }}
                />
              </div>
              {/* Mobile full-screen slide-up overlay */}
              <div
                className="md:hidden fixed inset-0 z-50 flex flex-col"
                style={{ background: T.BG }}
              >
                <ReplyPanel
                  item={replyItem}
                  isDark={isDark}
                  workspaceId={wsId}
                  onClose={() => setReplyItem(null)}
                  onSend={(id, r) => actionItem.mutate({ workspaceId: wsId!, itemId: id, replyText: r })}
                  onDismiss={id => dismissItem.mutate({ workspaceId: wsId!, itemId: id })}
                  onBookAppointment={lead => { setReplyItem(null); setBookingLead(lead); }}
                />
              </div>
            </>
          )}
        </div>

        {/* RIGHT — Tabbed: Calendar | Invoices */}
        <RightPanel isDark={isDark} wsId={wsId} onSelectAppointment={setSelectedAppt} onNewInvoice={() => setShowInvoice(true)} mobileTab={mobileTab} T={T} />
      </div>

      {/* ── Appointment Drawer ── */}
      {selectedAppt && (
        <AppointmentDrawer
          appointment={{
            id: 0,
            workspaceId: wsId ?? 0,
            title: selectedAppt.service,
            clientName: selectedAppt.name,
            clientPhone: "+61 400 000 000",
            clientEmail: null,
            serviceId: null,
            startAt: Date.now(),
            endAt: Date.now() + 60 * 60000,
            notes: "Demo appointment — connect real data via appointments router",
            status: selectedAppt.status,
            paymentMethod: null,
            amountCents: null,
            loyaltyPointsEarned: null,
            loyaltyPointsRedeemed: null,
            confirmationSent: false,
            reminder24Sent: false,
            reminder2Sent: false,
            reviewSent: false,
            bookingToken: null,
            source: "manual",
          }}
          isDark={isDark}
          onClose={() => setSelectedAppt(null)}
          onUpdated={() => { /* refetch when real data is wired */ }}
        />
      )}

      {/* ── Email Modal ── */}
      <Modal show={showEmail} onClose={() => setShowEmail(false)} title="Send Email" isDark={isDark}>
        <input placeholder="To" className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border"
          style={{ background: T.PANEL, borderColor: T.BORDER, color: T.TEXT }} />
        <input placeholder="Subject" className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border"
          style={{ background: T.PANEL, borderColor: T.BORDER, color: T.TEXT }} />
        <textarea placeholder="Message…" rows={4} className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border resize-none"
          style={{ background: T.PANEL, borderColor: T.BORDER, color: T.TEXT }} />
        <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: T.BLUE }}
          onClick={() => { toast.success("Email sent"); setShowEmail(false); }}>
          <Send className="w-4 h-4" />Send Email
        </button>
      </Modal>

      {/* ── Client Contact Modal ── */}
      {showContactModal && wsId && (
        <ClientContactModal workspaceId={wsId} onClose={() => setShowContactModal(false)} />
      )}

      {/* ── Urgent Pop-up Notification ── */}
      <UrgentPopup
        item={urgentPopupItem}
        onReply={item => { setUrgentPopupItem(null); setReplyItem(item); }}
        onDismiss={id => { setUrgentPopupItem(null); if (id > 0) dismissItem.mutate({ workspaceId: wsId!, itemId: id }); }}
      />

      {/* ── Lead Booking Sheet ── */}
      {bookingLead && wsId && (
        <LeadBookingSheet
          workspaceId={wsId}
          lead={bookingLead}
          isDark={isDark}
          onClose={() => setBookingLead(null)}
          onBooked={(_id, startAt) => {
            setBookingLead(null);
            toast.success(`Appointment booked for ${new Date(startAt).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`);
          }}
        />
      )}

      {/* ── Invoice Modal ── */}
      <Modal show={showInvoice} onClose={() => setShowInvoice(false)} title="Raise Invoice" isDark={isDark}>
        <input placeholder="Client name or email" className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border"
          style={{ background: T.PANEL, borderColor: T.BORDER, color: T.TEXT }} />
        <input placeholder="Description of work" className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border"
          style={{ background: T.PANEL, borderColor: T.BORDER, color: T.TEXT }} />
        <input placeholder="Amount ($)" type="number" className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border"
          style={{ background: T.PANEL, borderColor: T.BORDER, color: T.TEXT }} />
        <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: "linear-gradient(135deg, #16a34a, #15803d)" }}
          onClick={() => { toast.success("Invoice raised and sent"); setShowInvoice(false); }}>
          <FileText className="w-4 h-4" />Send Invoice
        </button>
      </Modal>
    </div>
  );
}
