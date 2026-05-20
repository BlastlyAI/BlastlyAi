import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  X, Phone, Mail, Clock, FileText,
  CheckCircle2, Send, DollarSign,
  MessageSquare, QrCode, Banknote, CreditCard,
  Star, Gift, Bell,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type AppointmentItem = {
  id: number;
  workspaceId: number;
  title: string;
  clientName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  serviceId: number | null;
  startAt: number;
  endAt: number;
  notes: string | null;
  status: string;
  paymentMethod: string | null;
  amountCents: number | null;
  loyaltyPointsEarned: number | null;
  loyaltyPointsRedeemed: number | null;
  confirmationSent: boolean;
  reminder24Sent: boolean;
  reminder2Sent: boolean;
  reviewSent: boolean;
  bookingToken: string | null;
  source: string | null;
  contactId?: number | null;
};

function makeTokens(dark: boolean) {
  return {
    BG:         dark ? "#0f1117" : "#ffffff",
    PANEL:      dark ? "#1a1d27" : "#f9fafb",
    BORDER:     dark ? "#2d3148" : "#e5e7eb",
    TEXT:       dark ? "#f1f5f9" : "#111827",
    MUTED:      dark ? "#8b95b0" : "#6b7280",
    BLUE:       "#3b82f6",
    BLUE_SOFT:  dark ? "#1e3a5f" : "#eff6ff",
    GREEN:      "#16a34a",
    GREEN_SOFT: dark ? "#14532d" : "#f0fdf4",
    RED:        "#ef4444",
    AMBER:      "#d97706",
    AMBER_SOFT: dark ? "#451a03" : "#fffbeb",
    SHADOW_MD:  dark ? "0 4px 16px rgba(0,0,0,0.5)" : "0 4px 12px rgba(0,0,0,0.08)",
  };
}

/** White pill section header — same style as CommandCentreBI mobile tabs */
function SectionPill({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide"
        style={{
          background: "#ffffff",
          color: "#111827",
          boxShadow: "0 0 0 2px #ffffff",
        }}
      >
        {icon}
        {label}
      </div>
    </div>
  );
}

function SmsRow({ label, sent, onSend, loading }: { label: string; sent: boolean; onSend: () => void; loading: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2">
        {sent
          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
          : <MessageSquare className="w-4 h-4 text-gray-400" />}
        <span className="text-sm" style={{ color: sent ? "#16a34a" : "var(--text)" }}>{label}</span>
        {sent && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Sent ✓</span>}
      </div>
      {!sent && (
        <button
          onClick={onSend}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-50"
          style={{ background: "#3b82f6" }}>
          <Send className="w-3 h-3" />
          {loading ? "Sending…" : "Send"}
        </button>
      )}
    </div>
  );
}

// ─── AppointmentDrawer ────────────────────────────────────────────────────────
export function AppointmentDrawer({
  appointment,
  isDark,
  onClose,
  onUpdated,
}: {
  appointment: AppointmentItem;
  isDark: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const T = makeTokens(isDark);
  const [amountStr, setAmountStr] = useState(
    appointment.amountCents ? (appointment.amountCents / 100).toFixed(2) : ""
  );
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qr" | "card">("cash");
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [closing, setClosing] = useState(false);

  // Fetch loyalty settings + balance for this client
  const loyaltySettingsQ = trpc.appointments.getLoyaltySettings.useQuery(
    { workspaceId: appointment.workspaceId },
    { enabled: !!(appointment.workspaceId) }
  );
  const loyaltyBalanceQ = trpc.appointments.getLoyaltyBalance.useQuery(
    { workspaceId: appointment.workspaceId, contactId: appointment.contactId ?? 0 },
    { enabled: !!(appointment.contactId) }
  );

  const loyaltySettings = loyaltySettingsQ.data;
  const loyaltyBalance = loyaltyBalanceQ.data;
  const loyaltyEnabled = loyaltySettings?.isEnabled ?? false;
  const ptsPerDollar = loyaltySettings?.pointsPerDollar ?? 2;
  const dollarsPerPoint = loyaltySettings?.dollarsPerPoint ?? 10;
  const currentBalance = loyaltyBalance?.pointsBalance ?? 0;
  const amountNum = parseFloat(amountStr || "0");
  const pointsToEarn = loyaltyEnabled ? Math.floor(amountNum * ptsPerDollar) : 0;
  const maxRedeemable = loyaltyEnabled ? Math.min(currentBalance, Math.floor(amountNum * dollarsPerPoint)) : 0;
  const redeemDollarValue = redeemPoints > 0 ? (redeemPoints / dollarsPerPoint).toFixed(2) : "0";

  const sendReminder = trpc.appointments.sendReminder.useMutation({
    onSuccess: () => { toast.success("Reminder sent!"); onUpdated(); },
    onError: (e) => toast.error(e.message),
  });

  const closeOut = trpc.appointments.closeOut.useMutation({
    onSuccess: (data) => {
      const pts = data.pointsEarned;
      toast.success(
        pts > 0
          ? `Payment recorded! ${pts} loyalty points awarded. Review SMS sent.`
          : "Payment recorded! Review SMS sent."
      );
      onUpdated();
      onClose();
    },
    onError: (e) => { toast.error(e.message); setClosing(false); },
  });

  const isCompleted = appointment.status === "completed";
  const startDate = new Date(appointment.startAt);
  const endDate = new Date(appointment.endAt);
  const durationMins = Math.round((appointment.endAt - appointment.startAt) / 60000);

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-sm shadow-2xl"
      style={{ background: T.BG, borderLeft: `1px solid ${T.BORDER}`, boxShadow: T.SHADOW_MD }}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b flex items-start justify-between"
        style={{ borderColor: T.BORDER, background: isDark ? "#1e2030" : "#111827" }}>
        <div>
          <p className="text-sm font-bold text-white">{appointment.clientName ?? "Client"}</p>
          <p className="text-xs text-white/70">{appointment.title}</p>
          <p className="text-[10px] text-white/50 mt-0.5">
            {startDate.toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            {" – "}
            {endDate.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
            {` · ${durationMins} min`}
          </p>
        </div>
        <button onClick={onClose} className="text-white/60 hover:text-white mt-0.5">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Client details */}
      <div className="flex-shrink-0 px-4 py-3 border-b space-y-1.5" style={{ borderColor: T.BORDER, background: T.PANEL }}>
        {appointment.clientPhone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: T.MUTED }} />
            <a href={`tel:${appointment.clientPhone}`} className="text-xs" style={{ color: T.BLUE }}>{appointment.clientPhone}</a>
          </div>
        )}
        {appointment.clientEmail && (
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: T.MUTED }} />
            <a href={`mailto:${appointment.clientEmail}`} className="text-xs truncate" style={{ color: T.BLUE }}>{appointment.clientEmail}</a>
          </div>
        )}
        {appointment.notes && (
          <div className="flex items-start gap-2">
            <FileText className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: T.MUTED }} />
            <span className="text-xs" style={{ color: T.MUTED }}>{appointment.notes}</span>
          </div>
        )}
        {isCompleted && (
          <div className="flex items-center gap-2 pt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs font-semibold text-green-600">Completed</span>
            {appointment.amountCents && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                ${(appointment.amountCents / 100).toFixed(2)}
              </span>
            )}
            {(appointment.loyaltyPointsEarned ?? 0) > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5" />
                {appointment.loyaltyPointsEarned} pts
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Single scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6"
        style={{ ["--border" as string]: T.BORDER, ["--text" as string]: T.TEXT }}>

        {/* ── PAYMENT & REWARDS section ── */}
        <div>
          <SectionPill label="Payment & Rewards" icon={<DollarSign className="w-3 h-3" />} />

          {isCompleted ? (
            <div className="px-4 py-4 rounded-xl text-center" style={{ background: T.GREEN_SOFT, border: `1px solid #bbf7d0` }}>
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-green-700">Payment Recorded</p>
              {appointment.amountCents && (
                <p className="text-lg font-bold text-green-800 mt-1">${(appointment.amountCents / 100).toFixed(2)}</p>
              )}
              {appointment.paymentMethod && (
                <p className="text-xs text-green-500 mt-1 capitalize">via {appointment.paymentMethod}</p>
              )}
              {(appointment.loyaltyPointsEarned ?? 0) > 0 && (
                <div className="mt-2 flex items-center justify-center gap-1 text-xs text-amber-600 font-semibold">
                  <Star className="w-3 h-3" />
                  {appointment.loyaltyPointsEarned} loyalty points earned
                </div>
              )}
              {(appointment.loyaltyPointsRedeemed ?? 0) > 0 && (
                <div className="mt-1 flex items-center justify-center gap-1 text-xs text-amber-500">
                  <Gift className="w-3 h-3" />
                  {appointment.loyaltyPointsRedeemed} points redeemed (${((appointment.loyaltyPointsRedeemed ?? 0) / dollarsPerPoint).toFixed(2)} off)
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Amount */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: T.MUTED }}>
                  Amount ($)
                </label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border" style={{ background: T.PANEL, borderColor: T.BORDER }}>
                  <DollarSign className="w-4 h-4" style={{ color: T.MUTED }} />
                  <input
                    type="number"
                    value={amountStr}
                    onChange={e => { setAmountStr(e.target.value); setRedeemPoints(0); }}
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: T.TEXT }}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: T.MUTED }}>
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: "cash" as const, label: "Cash",    icon: <Banknote className="w-4 h-4" /> },
                    { id: "qr"   as const, label: "QR Code", icon: <QrCode className="w-4 h-4" /> },
                    { id: "card" as const, label: "Card",    icon: <CreditCard className="w-4 h-4" /> },
                  ]).map(m => (
                    <button key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-bold border transition-all"
                      style={{
                        background: paymentMethod === m.id ? T.BLUE : T.BG,
                        color: paymentMethod === m.id ? "#fff" : T.TEXT,
                        borderColor: paymentMethod === m.id ? T.BLUE : T.BORDER,
                      }}>
                      {m.icon}
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Loyalty rewards panel */}
              {loyaltyEnabled && (
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: T.BORDER }}>
                  {/* Header */}
                  <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: T.AMBER_SOFT }}>
                    <Star className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-amber-700">Loyalty Rewards</span>
                    {appointment.contactId && (
                      <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
                        {currentBalance} pts balance
                      </span>
                    )}
                  </div>

                  <div className="px-3 py-2.5 space-y-2" style={{ background: T.PANEL }}>
                    {/* Points to earn on this payment */}
                    {amountNum > 0 && (
                      <div className="flex items-center justify-between text-xs" style={{ color: T.TEXT }}>
                        <span style={{ color: T.MUTED }}>Points to earn this visit</span>
                        <span className="font-bold text-amber-600">+{pointsToEarn} pts</span>
                      </div>
                    )}

                    {/* Redeem option */}
                    {appointment.contactId && currentBalance > 0 && maxRedeemable > 0 ? (
                      redeemPoints > 0 ? (
                        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
                          style={{ background: isDark ? "#451a03" : "#fef3c7", border: `1px solid #fcd34d` }}>
                          <Gift className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          <span className="text-xs text-amber-700 flex-1">
                            Redeeming {redeemPoints} pts = <strong>${redeemDollarValue} off</strong>
                          </span>
                          <button onClick={() => setRedeemPoints(0)}
                            className="text-[10px] font-bold text-amber-600 underline">Remove</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRedeemPoints(maxRedeemable)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-90"
                          style={{ background: isDark ? "#451a03" : "#fef3c7", color: "#d97706", border: `1px solid #fcd34d` }}>
                          <Gift className="w-3.5 h-3.5" />
                          Redeem {maxRedeemable} pts (${(maxRedeemable / dollarsPerPoint).toFixed(2)} off)
                        </button>
                      )
                    ) : appointment.contactId && currentBalance === 0 ? (
                      <p className="text-[10px]" style={{ color: T.MUTED }}>
                        No points balance yet — they'll earn {ptsPerDollar} pts per $1 today.
                      </p>
                    ) : !appointment.contactId ? (
                      <p className="text-[10px]" style={{ color: T.MUTED }}>
                        Link this appointment to a contact to track loyalty points.
                      </p>
                    ) : null}

                    {/* Rate reminder */}
                    <p className="text-[10px]" style={{ color: T.MUTED }}>
                      {ptsPerDollar} pts per $1 spent · {dollarsPerPoint} pts = $1 reward
                    </p>
                  </div>
                </div>
              )}

              {/* Close-out button */}
              <button
                onClick={() => {
                  const amountCents = Math.round(parseFloat(amountStr || "0") * 100);
                  if (!amountCents) { toast.error("Please enter an amount"); return; }
                  setClosing(true);
                  closeOut.mutate({
                    workspaceId:         appointment.workspaceId,
                    appointmentId:       appointment.id,
                    paymentMethod,
                    amountCents,
                    redeemLoyaltyPoints: redeemPoints,
                  });
                }}
                disabled={closing || closeOut.isPending}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all hover:opacity-90 active:scale-95"
                style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", boxShadow: "0 2px 10px rgba(22,163,74,0.4)" }}>
                <CheckCircle2 className="w-4 h-4" />
                {closing ? "Recording…" : "Record Payment & Send Review SMS"}
              </button>
              <p className="text-[10px] text-center -mt-1" style={{ color: T.MUTED }}>
                Sends thank-you + review SMS · Awards loyalty points automatically
              </p>
            </div>
          )}
        </div>

        {/* ── REMINDERS section ── */}
        <div>
          <SectionPill label="Reminders" icon={<Bell className="w-3 h-3" />} />
          <div style={{ ["--border" as string]: T.BORDER, ["--text" as string]: T.TEXT }}>
            <SmsRow
              label="Confirmation SMS"
              sent={appointment.confirmationSent}
              onSend={() => toast.info("Confirmation SMS is sent automatically on booking")}
              loading={false}
            />
            <SmsRow
              label="Day-before reminder"
              sent={appointment.reminder24Sent}
              onSend={() => sendReminder.mutate({ workspaceId: appointment.workspaceId, appointmentId: appointment.id, type: "24h" })}
              loading={sendReminder.isPending}
            />
            <SmsRow
              label="2-hour reminder"
              sent={appointment.reminder2Sent}
              onSend={() => sendReminder.mutate({ workspaceId: appointment.workspaceId, appointmentId: appointment.id, type: "2h" })}
              loading={sendReminder.isPending}
            />
            <SmsRow
              label="Review request SMS"
              sent={appointment.reviewSent}
              onSend={() => toast.info("Review SMS is sent automatically when payment is recorded")}
              loading={false}
            />
            {appointment.bookingToken && (
              <div className="mt-3 px-3 py-2.5 rounded-xl text-xs" style={{ background: T.PANEL, border: `1px solid ${T.BORDER}` }}>
                <p className="font-semibold mb-1" style={{ color: T.MUTED }}>Reschedule link</p>
                <p style={{ color: T.TEXT, wordBreak: "break-all" }}>
                  {window.location.origin}/reschedule/{appointment.bookingToken}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
