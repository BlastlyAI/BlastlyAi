import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { X, Calendar, ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LeadInfo {
  name:  string;
  phone?: string;
  email?: string;
}

interface Props {
  workspaceId: number;
  lead: LeadInfo;
  onClose: () => void;
  onBooked: (appointmentId: number, startAt: number) => void;
  isDark?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LeadBookingSheet({ workspaceId, lead, onClose, onBooked, isDark = true }: Props) {
  const T = {
    bg:      isDark ? "#0f1117" : "#ffffff",
    panel:   isDark ? "#1a1d27" : "#f9fafb",
    border:  isDark ? "#2d3148" : "#e5e7eb",
    text:    isDark ? "#f1f5f9" : "#111827",
    muted:   isDark ? "#8b95b0" : "#6b7280",
    green:   "#16a34a",
    blue:    "#3b82f6",
    accent:  "#7c3aed",
  };

  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ startAt: number; endAt: number } | null>(null);
  const [booked, setBooked] = useState(false);
  const [bookedTime, setBookedTime] = useState<number | null>(null);

  // Load services
  const servicesQuery = trpc.appointments.listServices.useQuery(
    { workspaceId },
    { enabled: !!workspaceId }
  );
  const services = servicesQuery.data ?? [];

  // Auto-select first service
  const effectiveServiceId = selectedServiceId ?? (services[0]?.id ?? null);

  // Load available slots
  const dateStr = toDateStr(selectedDate);
  const slotsQuery = trpc.appointments.getInternalAvailableSlots.useQuery(
    { workspaceId, serviceId: effectiveServiceId!, date: dateStr },
    { enabled: !!workspaceId && !!effectiveServiceId }
  );
  const slots = slotsQuery.data?.slots ?? [];

  // Book mutation
  const bookMutation = trpc.appointments.bookFromLead.useMutation({
    onSuccess: (data) => {
      setBooked(true);
      setBookedTime(selectedSlot!.startAt);
      toast.success(`Booked! SMS confirmation sent to ${lead.name}`);
      setTimeout(() => onBooked(data.id, selectedSlot!.startAt), 1800);
    },
    onError: (err) => {
      toast.error(err.message || "Booking failed — please try again");
    },
  });

  function handleBook() {
    if (!selectedSlot || !effectiveServiceId) return;
    bookMutation.mutate({
      workspaceId,
      serviceId:   effectiveServiceId,
      startAt:     selectedSlot.startAt,
      endAt:       selectedSlot.endAt,
      clientName:  lead.name,
      clientPhone: lead.phone,
      clientEmail: lead.email,
      notes:       "Booked via Command Centre lead",
    });
  }

  // Day strip — today + 6 days
  const dayStrip = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl flex flex-col"
        style={{ background: T.bg, maxHeight: "88vh" }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: T.border }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: T.border }}>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: T.muted }}>Book Appointment</p>
            <p className="text-base font-bold mt-0.5" style={{ color: T.text }}>{lead.name}</p>
            {lead.phone && <p className="text-xs" style={{ color: T.muted }}>{lead.phone}</p>}
          </div>
          <button onClick={onClose} style={{ color: T.muted }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Service selector */}
          {services.length > 1 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: T.muted }}>Service</p>
              <div className="flex flex-wrap gap-2">
                {services.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedServiceId(s.id); setSelectedSlot(null); }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                    style={{
                      background: effectiveServiceId === s.id ? T.accent : "transparent",
                      borderColor: effectiveServiceId === s.id ? T.accent : T.border,
                      color:       effectiveServiceId === s.id ? "#fff" : T.muted,
                    }}
                  >
                    {s.name} · {s.durationMinutes}min
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Day strip */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: T.muted }}>
                <Calendar className="w-3 h-3 inline mr-1" />
                {fmtDate(selectedDate)}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => { setSelectedDate(d => addDays(d, -1)); setSelectedSlot(null); }}
                  disabled={toDateStr(selectedDate) === toDateStr(today)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30"
                  style={{ background: T.panel, color: T.muted }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setSelectedDate(d => addDays(d, 1)); setSelectedSlot(null); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: T.panel, color: T.muted }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {dayStrip.map(d => {
                const isSelected = toDateStr(d) === toDateStr(selectedDate);
                const isToday    = toDateStr(d) === toDateStr(today);
                return (
                  <button
                    key={toDateStr(d)}
                    onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                    className="flex-shrink-0 flex flex-col items-center justify-center w-12 h-14 rounded-2xl text-center transition-all"
                    style={{
                      background:  isSelected ? T.accent : T.panel,
                      border:      `1px solid ${isSelected ? T.accent : T.border}`,
                      color:       isSelected ? "#fff" : T.text,
                    }}
                  >
                    <span className="text-[9px] font-bold uppercase">
                      {isToday ? "Today" : d.toLocaleDateString("en-AU", { weekday: "short" })}
                    </span>
                    <span className="text-lg font-bold leading-tight">{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Available slots */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: T.muted }}>Available Times</p>
            {slotsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: T.muted }} />
              </div>
            ) : slots.length === 0 ? (
              <div
                className="rounded-2xl p-4 text-center text-sm"
                style={{ background: T.panel, color: T.muted }}
              >
                No availability on this day.<br />
                <span className="text-xs">Try a different day or service.</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map(slot => {
                  const isSelected = selectedSlot?.startAt === slot.startAt;
                  return (
                    <button
                      key={slot.startAt}
                      onClick={() => setSelectedSlot(isSelected ? null : slot)}
                      className="py-2.5 rounded-2xl text-sm font-semibold border transition-all"
                      style={{
                        background:  isSelected ? T.green : T.panel,
                        borderColor: isSelected ? T.green : T.border,
                        color:       isSelected ? "#fff" : T.text,
                        boxShadow:   isSelected ? `0 0 0 2px ${T.green}40` : "none",
                      }}
                    >
                      {fmtTime(slot.startAt)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* No services configured */}
          {!servicesQuery.isLoading && services.length === 0 && (
            <div
              className="rounded-2xl p-4 text-center text-sm"
              style={{ background: T.panel, color: T.muted }}
            >
              No services set up yet.<br />
              <span className="text-xs">Add services in Appointments → Service Menu.</span>
            </div>
          )}
        </div>

        {/* Footer — confirm button */}
        <div className="px-5 pb-8 pt-3 border-t" style={{ borderColor: T.border }}>
          {booked ? (
            <div
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white"
              style={{ background: T.green }}
            >
              <CheckCircle2 className="w-5 h-5" />
              Booked — {bookedTime ? fmtTime(bookedTime) : ""} · SMS sent ✓
            </div>
          ) : (
            <button
              onClick={handleBook}
              disabled={!selectedSlot || !effectiveServiceId || bookMutation.isPending}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-40 transition-all"
              style={{ background: selectedSlot ? T.green : T.panel, border: `1px solid ${selectedSlot ? T.green : T.border}`, color: selectedSlot ? "#fff" : T.muted }}
            >
              {bookMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Booking…</>
              ) : selectedSlot ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm {fmtDate(selectedDate)} at {fmtTime(selectedSlot.startAt)}
                </>
              ) : (
                "Select a time to confirm"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
