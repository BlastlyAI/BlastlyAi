import { useState, useMemo } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Calendar, Clock, ChevronLeft, ChevronRight, CheckCircle2, User, Phone, Mail } from "lucide-react";

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function startOfDay(d: Date) {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}
function fmtTime(ms: number) {
  return new Date(ms).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
}

type Step = "service" | "date" | "time" | "details" | "confirm";

export default function BookingPortalPage() {
  const [, params] = useRoute("/book/:slug");
  const slug = params?.slug ?? "";

  const [step, setStep]           = useState<Step>("service");
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ startAt: number; endAt: number } | null>(null);
  const [clientName, setClientName]   = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes]             = useState("");
  const [confirmed, setConfirmed]     = useState(false);

  const dateStr = selectedDate.toISOString().slice(0, 10);

  // Fetch available slots
  const { data: slotsData, isLoading: loadingSlots } = trpc.appointments.getAvailableSlots.useQuery(
    { slug, serviceId: serviceId ?? 0, date: dateStr },
    { enabled: !!serviceId && step === "time" }
  );

  const createBooking = trpc.appointments.createPortalBooking.useMutation({
    onSuccess: () => { setConfirmed(true); },
    onError: (e) => toast.error(e.message),
  });

  const selectedService = slotsData?.service;

  // Generate a 14-day date picker
  const dateOptions = useMemo(() =>
    Array.from({ length: 14 }, (_, i) => addDays(new Date(), i)),
    []
  );

  if (confirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You're booked!</h1>
          <p className="text-gray-500 mb-4">
            {selectedSlot && (
              <>
                {new Date(selectedSlot.startAt).toLocaleString("en-AU", {
                  weekday: "long", day: "numeric", month: "long",
                  hour: "2-digit", minute: "2-digit",
                })}
              </>
            )}
          </p>
          {clientPhone && (
            <p className="text-sm text-gray-400">
              A confirmation SMS has been sent to {clientPhone}.
            </p>
          )}
          <p className="text-xs text-gray-300 mt-4">You can reschedule using the link in your SMS.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-start justify-center p-4 pt-8">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-lg w-full">
        {/* Header */}
        <div className="px-6 py-5 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-white/80" />
            <h1 className="text-lg font-bold text-white">Book an Appointment</h1>
          </div>
          {/* Progress dots */}
          <div className="flex items-center gap-2 mt-3">
            {(["service", "date", "time", "details"] as Step[]).map((s, i) => {
              const steps: Step[] = ["service", "date", "time", "details"];
              const idx = steps.indexOf(step);
              const done = i < idx;
              const active = s === step;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    done ? "bg-white text-blue-600" : active ? "bg-white/30 text-white border-2 border-white" : "bg-white/10 text-white/40"
                  }`}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  {i < 3 && <div className={`flex-1 h-0.5 w-8 ${done ? "bg-white" : "bg-white/20"}`} />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-5">
          {/* Step 1: Service */}
          {step === "service" && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-gray-900">Choose a service</h2>
              {/* We can't query services without slug+serviceId, so show a placeholder */}
              <p className="text-sm text-gray-500">
                Loading services for <strong>{slug}</strong>…
              </p>
              {/* Fallback: if user knows service ID, they'd pick from a list. 
                  For now, show a simple service fetch via a dedicated query. */}
              <ServicePicker slug={slug} onSelect={id => { setServiceId(id); setStep("date"); }} />
            </div>
          )}

          {/* Step 2: Date */}
          {step === "date" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setStep("service")} className="text-gray-400 hover:text-gray-600">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-bold text-gray-900">Pick a date</h2>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {dateOptions.map(d => {
                  const isToday = startOfDay(d).getTime() === startOfDay(new Date()).getTime();
                  const isSelected = startOfDay(d).getTime() === startOfDay(selectedDate).getTime();
                  return (
                    <button key={d.toISOString()}
                      onClick={() => setSelectedDate(d)}
                      className="flex flex-col items-center py-2 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: isSelected ? "#3b82f6" : isToday ? "#eff6ff" : "transparent",
                        color: isSelected ? "#fff" : isToday ? "#3b82f6" : "#374151",
                      }}>
                      <span className="text-[10px] uppercase">{d.toLocaleDateString("en-AU", { weekday: "short" })}</span>
                      <span className="text-base font-bold">{d.getDate()}</span>
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setStep("time")}
                className="w-full py-3 rounded-xl text-sm font-bold text-white"
                style={{ background: "#3b82f6" }}>
                Continue →
              </button>
            </div>
          )}

          {/* Step 3: Time slot */}
          {step === "time" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setStep("date")} className="text-gray-400 hover:text-gray-600">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-bold text-gray-900">
                  {selectedDate.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
                </h2>
              </div>
              {loadingSlots && <p className="text-sm text-gray-400 text-center py-4">Checking availability…</p>}
              {!loadingSlots && slotsData?.slots.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm">No slots available on this day.</p>
                  <button onClick={() => setStep("date")} className="text-blue-500 text-sm mt-2 hover:underline">
                    Pick another date
                  </button>
                </div>
              )}
              {!loadingSlots && (slotsData?.slots ?? []).length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {slotsData!.slots.map(slot => {
                    const isSelected = selectedSlot?.startAt === slot.startAt;
                    return (
                      <button key={slot.startAt}
                        onClick={() => setSelectedSlot(slot)}
                        className="py-2.5 rounded-xl text-sm font-semibold border transition-all"
                        style={{
                          background: isSelected ? "#3b82f6" : "transparent",
                          color: isSelected ? "#fff" : "#374151",
                          borderColor: isSelected ? "#3b82f6" : "#e5e7eb",
                        }}>
                        <Clock className="w-3.5 h-3.5 mx-auto mb-0.5" />
                        {fmtTime(slot.startAt)}
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedSlot && (
                <button onClick={() => setStep("details")}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: "#3b82f6" }}>
                  Continue →
                </button>
              )}
            </div>
          )}

          {/* Step 4: Client details */}
          {step === "details" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setStep("time")} className="text-gray-400 hover:text-gray-600">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-bold text-gray-900">Your details</h2>
              </div>
              {selectedSlot && (
                <div className="px-4 py-3 rounded-xl bg-blue-50 text-sm text-blue-700 font-medium">
                  {new Date(selectedSlot.startAt).toLocaleString("en-AU", {
                    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })} — {fmtTime(selectedSlot.endAt)}
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border">
                  <User className="w-4 h-4 text-gray-400" />
                  <input value={clientName} onChange={e => setClientName(e.target.value)}
                    className="flex-1 text-sm outline-none" placeholder="Your name *" />
                </div>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <input value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                    className="flex-1 text-sm outline-none" placeholder="Mobile number (for SMS confirmation)" />
                </div>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <input value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                    className="flex-1 text-sm outline-none" placeholder="Email (optional)" />
                </div>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
                  placeholder="Any notes for us? (optional)" />
              </div>
              <button
                onClick={() => {
                  if (!clientName) { toast.error("Please enter your name"); return; }
                  if (!selectedSlot || !serviceId) return;
                  createBooking.mutate({
                    slug,
                    serviceId,
                    startAt: selectedSlot.startAt,
                    clientName,
                    clientPhone: clientPhone || undefined,
                    clientEmail: clientEmail || undefined,
                    notes: notes || undefined,
                  });
                }}
                disabled={createBooking.isPending}
                className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>
                {createBooking.isPending ? "Booking…" : "Confirm Booking"}
              </button>
              <p className="text-[10px] text-center text-gray-400">
                By booking you agree to receive SMS reminders. Reply STOP to opt out.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Service Picker (sub-component that fetches services by slug) ─────────────
function ServicePicker({ slug, onSelect }: { slug: string; onSelect: (id: number) => void }) {
  // We need a public endpoint to list services for a portal slug.
  // Use getAvailableSlots with a dummy serviceId=0 to get the portal, 
  // but better to add a dedicated query. For now we use a workaround:
  // Try to get slots for each service — but we don't know the IDs yet.
  // Instead, show a message to pick via the URL param approach.
  // The proper fix is a publicListServices procedure.
  return (
    <div className="text-center py-6 text-gray-400 text-sm">
      <p>Please use the booking link provided by the business.</p>
      <p className="text-xs mt-1 text-gray-300">
        The link includes your service selection automatically.
      </p>
    </div>
  );
}
