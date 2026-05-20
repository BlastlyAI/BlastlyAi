import { useState } from "react";
import { useLocation } from "wouter";
import {
  CheckCircle2, Lock, Unplug, ChevronRight, Shield,
  Phone, Mail, Calendar, Users, Star, MessageSquare,
  Facebook, Instagram, Youtube, Linkedin, Globe, Camera,
  BarChart2, Clock, TrendingUp, DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// ─── Connection card definition ───────────────────────────────────────────────
interface ConnectionCard {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  title: string;
  subtitle: string;
  category: "contacts" | "calendar" | "social" | "notifications" | "reviews";
  privacyNote: string;
  required: boolean;
  unavailable?: boolean;
  unavailableNote?: string;
}

const CONNECTIONS: ConnectionCard[] = [
  {
    id: "google_contacts",
    icon: Users,
    iconColor: "#4285F4",
    title: "Google Contacts",
    subtitle: "Import your existing client list from Google",
    category: "contacts",
    privacyNote: "Read-only. We never store your contacts — accessed live from Google.",
    required: false,
  },
  {
    id: "google_calendar",
    icon: Calendar,
    iconColor: "#0F9D58",
    title: "Google Calendar",
    subtitle: "Sync appointments and bookings automatically",
    category: "calendar",
    privacyNote: "Read-only. Calendar data is never saved to our servers.",
    required: false,
  },
  {
    id: "sms_notifications",
    icon: MessageSquare,
    iconColor: "#7c3aed",
    title: "SMS Notifications",
    subtitle: "Send appointment reminders and thank-you messages to clients",
    category: "notifications",
    privacyNote: "SMS sent via your registered business number. No message content is stored.",
    required: false,
  },
  {
    id: "email_notifications",
    icon: Mail,
    iconColor: "#3b82f6",
    title: "Email Notifications",
    subtitle: "Send invoices, confirmations, and follow-ups by email",
    category: "notifications",
    privacyNote: "Emails sent on your behalf. We never store client email content.",
    required: false,
  },
  {
    id: "google_reviews",
    icon: Star,
    iconColor: "#f59e0b",
    title: "Google Reviews",
    subtitle: "Auto-request reviews from happy clients after job completion",
    category: "reviews",
    privacyNote: "Review requests sent via SMS/email. No review data stored on our servers.",
    required: false,
  },
  {
    id: "facebook",
    icon: Facebook,
    iconColor: "#1877F2",
    title: "Facebook",
    subtitle: "Organic posts only — Facebook Ads currently unavailable",
    category: "social",
    privacyNote: "We post on your behalf only when you approve. No data stored.",
    required: false,
    unavailableNote: "Facebook Ads are currently unavailable. Use Google Ads or TikTok Ads for paid campaigns instead.",
  },
  {
    id: "instagram",
    icon: Instagram,
    iconColor: "#E1306C",
    title: "Instagram",
    subtitle: "Share photos, reels, and stories for your business",
    category: "social",
    privacyNote: "We post on your behalf only when you approve. No data stored.",
    required: false,
  },
  {
    id: "google_business",
    icon: Globe,
    iconColor: "#34A853",
    title: "Google Business Profile",
    subtitle: "Post updates and respond to reviews on Google Maps",
    category: "social",
    privacyNote: "We post on your behalf only when you approve. No data stored.",
    required: false,
  },
  {
    id: "linkedin",
    icon: Linkedin,
    iconColor: "#0A66C2",
    title: "LinkedIn",
    subtitle: "Share professional updates and build your business network",
    category: "social",
    privacyNote: "We post on your behalf only when you approve. No data stored.",
    required: false,
  },
  {
    id: "youtube",
    icon: Youtube,
    iconColor: "#FF0000",
    title: "YouTube",
    subtitle: "Publish video content and shorts for your business",
    category: "social",
    privacyNote: "We upload on your behalf only when you approve. No data stored.",
    required: false,
  },
  {
    id: "phone_contacts",
    icon: Phone,
    iconColor: "#16a34a",
    title: "Phone / Device Contacts",
    subtitle: "Access your phone's address book directly (browser permission)",
    category: "contacts",
    privacyNote: "Read-only browser access. Contacts are never uploaded or stored.",
    required: false,
  },
  {
    id: "quick_post",
    icon: Camera,
    iconColor: "#7c3aed",
    title: "Quick Post (Camera & Mic)",
    subtitle: "Capture photos and voice notes for instant social posts",
    category: "social",
    privacyNote: "Camera and mic used only when you actively record. Nothing is stored.",
    required: false,
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  contacts: "📇 Contacts",
  calendar: "📅 Calendar",
  notifications: "💬 Notifications",
  reviews: "⭐ Reviews",
  social: "📱 Social Media",
};

// ─── Main QuickSetup page ─────────────────────────────────────────────────────
export default function QuickSetup() {
  const [, navigate] = useLocation();
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [snapshotData, setSnapshotData] = useState({
    platformCount: 3,
    hoursPerWeek: 10,
    totalFollowers: 500,
    avgPostReach: 100,
    postsPerWeek: 2,
    leadsPerWeek: 3,
    monthlyRevenue: 5000,
  });
  const saveSnapshot = trpc.businessHealth.saveSnapshot.useMutation({
    onSuccess: () => { setDone(true); setTimeout(() => navigate("/command"), 1800); },
    onError: () => { setDone(true); setTimeout(() => navigate("/command"), 1800); },
  });

  function approve(id: string) {
    setApproved(prev => new Set(Array.from(prev).concat(id)));
    toast.success("Connected ✓", { duration: 1200 });
  }

  function disconnect(id: string) {
    setApproved(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast("Disconnected", { duration: 1200 });
  }

  function finish() {
    setShowSnapshot(true);
  }
  function submitSnapshot() {
    saveSnapshot.mutate({ snapshotType: "day_zero", ...snapshotData });
  }
  function skipSnapshot() {
    setDone(true);
    setTimeout(() => navigate("/command"), 1800);
  }

  const approvedCount = approved.size;
  const total = CONNECTIONS.length;

  // Group by category
  const categories = Array.from(new Set(CONNECTIONS.map(c => c.category)));

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6"
        style={{ background: "#0a0c14", fontFamily: "Inter, system-ui, sans-serif" }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}>
          <CheckCircle2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white text-center">You're all set up!</h1>
        <p className="text-sm text-slate-400 text-center max-w-xs">
          {approvedCount} connection{approvedCount !== 1 ? "s" : ""} approved. Taking you to your Command Centre…
        </p>
      </div>
    );
  }

  // Day Zero Snapshot screen
  if (showSnapshot) {
    const sliders: { key: keyof typeof snapshotData; label: string; icon: React.ElementType; min: number; max: number; step: number; unit: string; }[] = [
      { key: "platformCount",  label: "Platforms you currently use",        icon: BarChart2,    min: 1,  max: 20,    step: 1,    unit: "platforms" },
      { key: "hoursPerWeek",   label: "Hours/week on admin & social media",  icon: Clock,        min: 1,  max: 80,    step: 1,    unit: "hrs/wk" },
      { key: "totalFollowers", label: "Total social media followers",        icon: Users,        min: 0,  max: 50000, step: 100,  unit: "followers" },
      { key: "avgPostReach",   label: "Average post reach",                  icon: TrendingUp,   min: 0,  max: 10000, step: 50,   unit: "people" },
      { key: "postsPerWeek",   label: "Posts per week (currently)",          icon: MessageSquare,min: 0,  max: 21,    step: 1,    unit: "posts/wk" },
      { key: "leadsPerWeek",   label: "New leads per week",                  icon: Star,         min: 0,  max: 100,   step: 1,    unit: "leads/wk" },
      { key: "monthlyRevenue", label: "Approx. monthly revenue ($)",         icon: DollarSign,   min: 0,  max: 100000,step: 500,  unit: "$/mo" },
    ];
    return (
      <div className="min-h-screen pb-32" style={{ background: "#0a0c14", fontFamily: "Inter, system-ui, sans-serif" }}>
        <div className="sticky top-0 z-10 border-b px-4 py-4" style={{ background: "#0a0c14", borderColor: "#1e2235" }}>
          <div className="max-w-2xl mx-auto">
            <h1 className="text-xl font-bold text-white">Your Starting Point</h1>
            <p className="text-xs text-slate-400 mt-0.5">This sets your Day Zero benchmark. We'll show you how much you improve.</p>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
          <div className="rounded-2xl px-4 py-3 flex items-start gap-3" style={{ background: "#0f1a2e", border: "1px solid #1e3a5f" }}>
            <BarChart2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#3b82f6" }} />
            <p className="text-[11px] leading-relaxed" style={{ color: "#93c5fd" }}>
              <span className="font-bold">Why we ask this.</span> These numbers create your Business Health Score starting line.
              Every month we'll show you how far above the healthy benchmark you've climbed.
              It's also powerful marketing material — your own before-and-after story.
            </p>
          </div>
          {sliders.map(({ key, label, icon: Icon, min, max, step, unit }) => (
            <div key={key} className="rounded-2xl px-4 py-4" style={{ background: "#111827", border: "1px solid #1e2235" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color: "#64748b" }} />
                  <span className="text-sm font-medium text-slate-300">{label}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: "#7c3aed" }}>
                  {snapshotData[key].toLocaleString()} <span className="text-[10px] font-normal text-slate-500">{unit}</span>
                </span>
              </div>
              <input
                type="range" min={min} max={max} step={step}
                value={snapshotData[key]}
                onChange={e => setSnapshotData(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: "#7c3aed" }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-600">{min.toLocaleString()}</span>
                <span className="text-[10px] text-slate-600">{max.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="fixed bottom-0 left-0 right-0 px-4 py-4 border-t" style={{ background: "#0a0c14", borderColor: "#1e2235" }}>
          <div className="max-w-2xl mx-auto flex gap-3">
            <button onClick={skipSnapshot} className="px-5 py-3.5 rounded-2xl text-sm font-semibold border transition-all hover:opacity-80" style={{ borderColor: "#1e2235", color: "#64748b" }}>Skip</button>
            <button
              onClick={submitSnapshot}
              disabled={saveSnapshot.isPending}
              className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}>
              {saveSnapshot.isPending ? "Saving…" : "Save My Starting Point →"}
            </button>
          </div>
          <p className="text-center text-[10px] mt-2" style={{ color: "#334155" }}>You can update these any time in your Dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0a0c14", fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* Header */}
      <div className="sticky top-0 z-10 border-b px-4 py-4"
        style={{ background: "#0a0c14", borderColor: "#1e2235" }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-white">Quick Set Up</h1>
              <p className="text-xs text-slate-400 mt-0.5">Approve what you need — skip what you don't. Takes about 5 minutes.</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{approvedCount}<span className="text-slate-500 text-sm font-normal">/{total}</span></p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">approved</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1e2235" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(approvedCount / total) * 100}%`, background: "linear-gradient(90deg, #3b82f6, #7c3aed)" }} />
          </div>
        </div>
      </div>

      {/* Privacy banner */}
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-2">
        <div className="flex items-start gap-3 rounded-2xl px-4 py-3"
          style={{ background: "#0f1a2e", border: "1px solid #1e3a5f" }}>
          <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#3b82f6" }} />
          <p className="text-[11px] leading-relaxed" style={{ color: "#93c5fd" }}>
            <span className="font-bold">Your privacy is protected.</span> Blastly never stores your contacts, calendar, or social data on our servers.
            All connections are read-only and live — we access your data where it already lives.
            You can disconnect any service at any time.
          </p>
        </div>
      </div>

      {/* Connection cards grouped by category */}
      <div className="max-w-2xl mx-auto px-4 pb-32 space-y-6 pt-4">
        {categories.map(cat => {
          const cards = CONNECTIONS.filter(c => c.category === cat);
          return (
            <div key={cat}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1" style={{ color: "#64748b" }}>
                {CATEGORY_LABELS[cat]}
              </p>
              <div className="space-y-2">
                {cards.map(card => {
                  const isApproved = approved.has(card.id);
                  const Icon = card.icon;
                  return (
                    <div key={card.id}
                      className="rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-all"
                      style={{
                        background: isApproved ? "#0f1a2e" : "#111827",
                        border: isApproved ? "1px solid #1e3a5f" : "1px solid #1e2235",
                      }}>

                      {/* Icon */}
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: isApproved ? "#1e2235" : "#1a1d2e" }}>
                        <Icon className="w-4.5 h-4.5" style={{ color: isApproved ? card.iconColor : "#64748b", width: 18, height: 18 }} />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold" style={{ color: isApproved ? "#f1f5f9" : "#94a3b8" }}>
                            {card.title}
                          </p>
                          {isApproved && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: "#052e16", color: "#4ade80" }}>
                              <Lock className="w-2.5 h-2.5" />Connected
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] mt-0.5 truncate" style={{ color: "#475569" }}>{card.subtitle}</p>
                        <p className="text-[10px] mt-1 leading-snug" style={{ color: "#334155" }}>
                          🔒 {card.privacyNote}
                        </p>
                        {card.unavailableNote && (
                          <p className="text-[10px] mt-1 leading-snug font-medium" style={{ color: "#f97316" }}>
                            ⚠️ {card.unavailableNote}
                          </p>
                        )}
                      </div>

                      {/* Action button */}
                      <div className="flex-shrink-0">
                        {isApproved ? (
                          <button
                            onClick={() => disconnect(card.id)}
                            className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-xl border transition-all hover:opacity-80"
                            style={{ borderColor: "#1e2235", color: "#64748b" }}>
                            <Unplug className="w-3 h-3" />Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={() => approve(card.id)}
                            className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-xl text-white transition-all hover:opacity-90 active:scale-95"
                            style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}>
                            Approve <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 border-t"
        style={{ background: "#0a0c14", borderColor: "#1e2235" }}>
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            onClick={finish}
            className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}>
            {approvedCount === 0
              ? "Skip for now — go to Command Centre →"
              : `Done — I've approved ${approvedCount} connection${approvedCount !== 1 ? "s" : ""} →`}
          </button>
        </div>
        <p className="text-center text-[10px] mt-2" style={{ color: "#334155" }}>
          You can always add or remove connections later in Settings
        </p>
      </div>
    </div>
  );
}
