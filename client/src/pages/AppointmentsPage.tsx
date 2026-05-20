import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import {
  Plus, ChevronLeft, ChevronRight, Calendar, Clock,
  User, Phone, Mail, X, Check,
} from "lucide-react";
import { AppointmentDrawer, type AppointmentItem } from "@/components/AppointmentDrawer";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function startOfDay(d: Date) {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function fmtTime(ms: number) {
  return new Date(ms).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}
const STATUS_COLORS: Record<string, string> = {
  confirmed:  "#3b82f6",
  completed:  "#16a34a",
  cancelled:  "#ef4444",
  no_show:    "#d97706",
};

// ─── Add Appointment Modal ────────────────────────────────────────────────────
function AddAppointmentModal({
  wsId, defaultDate, services, onClose, onCreated,
}: {
  wsId: number;
  defaultDate: Date;
  services: { id: number; name: string; durationMinutes: number; priceCents: number }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle]       = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [dateStr, setDateStr]   = useState(defaultDate.toISOString().slice(0, 10));
  const [timeStr, setTimeStr]   = useState("09:00");
  const [durationMins, setDurationMins] = useState(60);
  const [notes, setNotes]       = useState("");

  const selectedService = services.find(s => s.id === serviceId);

  const create = trpc.appointments.create.useMutation({
    onSuccess: () => { toast.success("Appointment booked!"); onCreated(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit() {
    const startAt = new Date(`${dateStr}T${timeStr}`).getTime();
    const endAt   = startAt + (selectedService?.durationMinutes ?? durationMins) * 60000;
    if (!title && !selectedService) { toast.error("Enter a title or pick a service"); return; }
    create.mutate({
      workspaceId: wsId,
      title:       selectedService?.name ?? title,
      clientName:  clientName || undefined,
      clientPhone: clientPhone || undefined,
      clientEmail: clientEmail || undefined,
      serviceId:   serviceId ?? undefined,
      startAt,
      endAt,
      notes:       notes || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-800">
          <h2 className="text-base font-bold dark:text-white">New Appointment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-muted-foreground dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* Service picker */}
          {services.length > 0 && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Service</label>
              <div className="flex flex-wrap gap-2">
                {services.map(s => (
                  <button key={s.id}
                    onClick={() => { setServiceId(s.id); setTitle(s.name); setDurationMins(s.durationMinutes); }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                    style={{
                      background: serviceId === s.id ? "#3b82f6" : "transparent",
                      color: serviceId === s.id ? "#fff" : undefined,
                      borderColor: serviceId === s.id ? "#3b82f6" : undefined,
                    }}>
                    {s.name} · {s.durationMinutes}min · ${(s.priceCents / 100).toFixed(0)}
                  </button>
                ))}
                <button
                  onClick={() => setServiceId(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-dashed text-gray-400">
                  Custom
                </button>
              </div>
            </div>
          )}

          {/* Title (if no service selected) */}
          {!serviceId && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Title / Service</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm border dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none"
                placeholder="e.g. Consultation, Haircut, Plumbing call-out…" />
            </div>
          )}

          {/* Date & time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Date</label>
              <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm border dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Time</label>
              <input type="time" value={timeStr} onChange={e => setTimeStr(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm border dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none" />
            </div>
          </div>

          {/* Duration (only if no service) */}
          {!serviceId && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Duration (minutes)</label>
              <input type="number" value={durationMins} onChange={e => setDurationMins(parseInt(e.target.value) || 60)}
                className="w-full rounded-xl px-3 py-2.5 text-sm border dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none"
                min={5} step={5} />
            </div>
          )}

          {/* Client info */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Client Name</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border dark:bg-gray-800 dark:border-gray-700">
              <User className="w-4 h-4 text-gray-400" />
              <input value={clientName} onChange={e => setClientName(e.target.value)}
                className="flex-1 bg-transparent text-sm dark:text-white outline-none"
                placeholder="Jane Smith" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border dark:bg-gray-800 dark:border-gray-700">
              <Phone className="w-4 h-4 text-gray-400" />
              <input value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                className="flex-1 bg-transparent text-sm dark:text-white outline-none"
                placeholder="Phone" />
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border dark:bg-gray-800 dark:border-gray-700">
              <Mail className="w-4 h-4 text-gray-400" />
              <input value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                className="flex-1 bg-transparent text-sm dark:text-white outline-none"
                placeholder="Email" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full rounded-xl px-3 py-2.5 text-sm border dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none resize-none"
              placeholder="Any special instructions…" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t dark:border-gray-800 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border dark:border-gray-700 dark:text-gray-300">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={create.isPending}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>
            {create.isPending ? "Booking…" : "Book Appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Appointment Card ─────────────────────────────────────────────────────────
function ApptCard({ appt, onClick }: { appt: AppointmentItem; onClick: () => void }) {
  const color = STATUS_COLORS[appt.status] ?? "#6366f1";
  const durationMins = Math.round((appt.endAt - appt.startAt) / 60000);
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl px-3 py-2.5 border-l-4 transition-all hover:shadow-md active:scale-[0.98] mb-2"
      style={{
        borderLeftColor: color,
        background: `${color}12`,
        border: `1px solid ${color}30`,
        borderLeft: `4px solid ${color}`,
      }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold truncate dark:text-white">{appt.title}</p>
          {appt.clientName && (
            <p className="text-xs text-muted-foreground dark:text-gray-400 truncate">{appt.clientName}</p>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-xs font-semibold" style={{ color }}>{fmtTime(appt.startAt)}</p>
          <p className="text-[10px] text-gray-400">{durationMins}min</p>
        </div>
      </div>
      {appt.status !== "confirmed" && (
        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
          style={{ background: `${color}20`, color }}>
          {appt.status.replace("_", " ")}
        </span>
      )}
    </button>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────
function DayView({
  date, appts, onSelect, onAdd,
}: {
  date: Date;
  appts: AppointmentItem[];
  onSelect: (a: AppointmentItem) => void;
  onAdd: () => void;
}) {
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7am–8pm
  const dayStart = startOfDay(date).getTime();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="relative">
        {hours.map(h => {
          const slotStart = dayStart + h * 3600000;
          const slotEnd   = slotStart + 3600000;
          const slotAppts = appts.filter(a => a.startAt >= slotStart && a.startAt < slotEnd);
          return (
            <div key={h} className="flex border-b dark:border-gray-800 min-h-[60px]">
              <div className="w-14 flex-shrink-0 text-[11px] text-gray-400 pt-1 pr-2 text-right">
                {h % 12 || 12}{h < 12 ? "am" : "pm"}
              </div>
              <div className="flex-1 py-1 px-2">
                {slotAppts.map(a => (
                  <ApptCard key={a.id} appt={a} onClick={() => onSelect(a)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────
function WeekView({
  weekStart, appts, onSelect, onAdd,
}: {
  weekStart: Date;
  appts: AppointmentItem[];
  onSelect: (a: AppointmentItem) => void;
  onAdd: () => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = startOfDay(new Date()).getTime();

  return (
    <div className="flex-1 overflow-x-auto">
      <div className="grid grid-cols-7 min-w-[700px]">
        {days.map(d => {
          const isToday = startOfDay(d).getTime() === today;
          const dayAppts = appts.filter(a => {
            const aDay = startOfDay(new Date(a.startAt)).getTime();
            return aDay === startOfDay(d).getTime();
          });
          return (
            <div key={d.toISOString()} className="border-r dark:border-gray-800 last:border-r-0 min-h-[400px]">
              <div className={`px-2 py-2 text-center border-b dark:border-gray-800 ${isToday ? "bg-blue-50 dark:bg-blue-950" : ""}`}>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                  {d.toLocaleDateString("en-AU", { weekday: "short" })}
                </p>
                <p className={`text-lg font-bold ${isToday ? "text-blue-600" : "dark:text-white"}`}>
                  {d.getDate()}
                </p>
              </div>
              <div className="p-1.5 space-y-1">
                {dayAppts.map(a => (
                  <ApptCard key={a.id} appt={a} onClick={() => onSelect(a)} />
                ))}
                {dayAppts.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-[10px] text-gray-300 dark:text-muted-foreground">No appts</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const [view, setView]           = useState<"day" | "week">("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAdd, setShowAdd]     = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<AppointmentItem | null>(null);

  // Compute range
  const weekStart = useMemo(() => {
    const d = startOfDay(currentDate);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday start
    return addDays(d, diff);
  }, [currentDate]);

  const rangeStart = view === "day"
    ? startOfDay(currentDate).getTime()
    : weekStart.getTime();
  const rangeEnd = view === "day"
    ? rangeStart + 86400000
    : rangeStart + 7 * 86400000;

  const { data: appts = [], refetch } = trpc.appointments.listByRange.useQuery(
    { workspaceId: wsId ?? 0, rangeStart, rangeEnd },
    { enabled: !!wsId }
  );

  const { data: services = [] } = trpc.appointments.listServices.useQuery(
    { workspaceId: wsId ?? 0 },
    { enabled: !!wsId }
  );

  function navigate(dir: 1 | -1) {
    setCurrentDate(d => addDays(d, dir * (view === "day" ? 1 : 7)));
  }

  const headerLabel = view === "day"
    ? fmtDate(currentDate)
    : `${fmtDate(weekStart)} – ${fmtDate(addDays(weekStart, 6))}`;

  const todayCount = appts.filter(a => {
    const aDay = startOfDay(new Date(a.startAt)).getTime();
    return aDay === startOfDay(new Date()).getTime();
  }).length;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b dark:border-gray-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-500" />
          <div>
            <h1 className="text-base font-bold dark:text-white">Appointments</h1>
            {todayCount > 0 && (
              <p className="text-[11px] text-gray-400">{todayCount} today</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Day/Week toggle */}
          <div className="flex rounded-xl border dark:border-gray-700 overflow-hidden">
            {(["day", "week"] as const).map(v => (
              <button key={v}
                onClick={() => setView(v)}
                className="px-3 py-1.5 text-xs font-semibold capitalize transition-colors"
                style={{
                  background: view === v ? "#3b82f6" : "transparent",
                  color: view === v ? "#fff" : undefined,
                }}>
                {v}
              </button>
            ))}
          </div>

          {/* Add button */}
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b dark:border-gray-800">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ChevronLeft className="w-4 h-4 dark:text-gray-300" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold dark:text-white">{headerLabel}</p>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="text-[10px] text-blue-500 hover:underline">
            Today
          </button>
        </div>
        <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ChevronRight className="w-4 h-4 dark:text-gray-300" />
        </button>
      </div>

      {/* Summary chips */}
      {appts.length > 0 && (
        <div className="flex-shrink-0 flex gap-2 px-4 py-2 overflow-x-auto border-b dark:border-gray-800">
          {(["confirmed", "completed", "cancelled"] as const).map(s => {
            const count = appts.filter(a => a.status === s).length;
            if (!count) return null;
            return (
              <span key={s} className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize"
                style={{ background: `${STATUS_COLORS[s]}15`, color: STATUS_COLORS[s] }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[s] }} />
                {count} {s}
              </span>
            );
          })}
        </div>
      )}

      {/* Calendar view */}
      {view === "day" ? (
        <DayView date={currentDate} appts={appts as AppointmentItem[]} onSelect={setSelectedAppt} onAdd={() => setShowAdd(true)} />
      ) : (
        <WeekView weekStart={weekStart} appts={appts as AppointmentItem[]} onSelect={setSelectedAppt} onAdd={() => setShowAdd(true)} />
      )}

      {/* Add modal */}
      {showAdd && wsId && (
        <AddAppointmentModal
          wsId={wsId}
          defaultDate={currentDate}
          services={services}
          onClose={() => setShowAdd(false)}
          onCreated={() => refetch()}
        />
      )}

      {/* Appointment drawer */}
      {selectedAppt && (
        <AppointmentDrawer
          appointment={selectedAppt}
          isDark={document.documentElement.classList.contains("dark")}
          onClose={() => setSelectedAppt(null)}
          onUpdated={() => { refetch(); setSelectedAppt(null); }}
        />
      )}
    </div>
  );
}
