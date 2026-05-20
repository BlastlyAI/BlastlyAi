import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bell, BellOff, Clock, Calendar, Smartphone, CheckCircle2 } from "lucide-react";

const DAYS = [
  { id: 0, label: "Sun" },
  { id: 1, label: "Mon" },
  { id: 2, label: "Tue" },
  { id: 3, label: "Wed" },
  { id: 4, label: "Thu" },
  { id: 5, label: "Fri" },
  { id: 6, label: "Sat" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 || 12;
  const ampm = i < 12 ? "AM" : "PM";
  return { value: i, label: `${h}:00 ${ampm}` };
});

export default function ReminderSettings() {
  const { user } = useAuth();
  const { data: workspaces } = trpc.workspace.list.useQuery(undefined, { enabled: !!user });
  const workspaceId = workspaces?.[0]?.id;

  const { data: settings, refetch } = trpc.quickCapture.getReminderSettings.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const [enabled, setEnabled] = useState(true);
  const [days, setDays] = useState<number[]>([2, 5]); // Tue, Fri
  const [hour, setHour] = useState(9);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled ?? true);
      setDays((settings.reminderDays as number[]) ?? [2, 5]);
      setHour(settings.reminderHour ?? 9);
    }
  }, [settings]);

  const saveMutation = trpc.quickCapture.saveReminderSettings.useMutation({
    onSuccess: () => {
      toast.success("Reminder schedule saved");
      refetch();
    },
    onError: (err) => toast.error(err.message || "Failed to save"),
  });

  const toggleDay = (dayId: number) => {
    setDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId].sort()
    );
  };

  const handleSave = () => {
    if (!workspaceId) return;
    saveMutation.mutate({ workspaceId, enabled, reminderDays: days, reminderHour: hour });
  };

  const selectedDayLabels = DAYS.filter((d) => days.includes(d.id)).map((d) => d.label);
  const hourLabel = HOURS.find((h) => h.value === hour)?.label || "9:00 AM";

  return (
    <div className="min-h-screen bg-[#0a0f1e] px-5 pt-10 pb-16">
      {/* Header */}
      <div className="mb-8">
        <div className="w-12 h-12 rounded-2xl bg-violet-600/20 flex items-center justify-center mb-4">
          <Bell className="w-6 h-6 text-violet-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Content Reminders</h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          We will send you a reminder to take a quick photo or voice note. It only takes 2 minutes — we handle the rest.
        </p>
      </div>

      {/* Enable toggle */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {enabled ? (
              <Bell className="w-5 h-5 text-violet-400" />
            ) : (
              <BellOff className="w-5 h-5 text-slate-500" />
            )}
            <div>
              <p className="text-white font-medium">Reminders</p>
              <p className="text-xs text-slate-400">
                {enabled ? "You will receive reminders on your chosen days" : "Reminders are off"}
              </p>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            className="data-[state=checked]:bg-violet-600"
          />
        </div>
      </div>

      {enabled && (
        <>
          {/* Day picker */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-slate-400" />
              <p className="text-sm font-medium text-white">Reminder days</p>
            </div>
            <div className="flex gap-2">
              {DAYS.map((day) => {
                const selected = days.includes(day.id);
                return (
                  <button
                    key={day.id}
                    onClick={() => toggleDay(day.id)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      selected
                        ? "bg-violet-600 text-white"
                        : "bg-white/5 text-slate-400 border border-white/10"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            {days.length === 0 && (
              <p className="text-xs text-amber-400 mt-2">Select at least one day</p>
            )}
          </div>

          {/* Time picker */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-slate-400" />
              <p className="text-sm font-medium text-white">Reminder time</p>
            </div>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {HOURS.map((h) => (
                <button
                  key={h.value}
                  onClick={() => setHour(h.value)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${
                    hour === h.value
                      ? "bg-violet-600 text-white"
                      : "bg-white/5 text-slate-400 border border-white/10"
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 mb-6">
            <div className="flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-white mb-1">Your reminder schedule</p>
                <p className="text-sm text-slate-300">
                  Every{" "}
                  <span className="text-violet-300 font-medium">
                    {selectedDayLabels.length > 0 ? selectedDayLabels.join(" & ") : "—"}
                  </span>{" "}
                  at{" "}
                  <span className="text-violet-300 font-medium">{hourLabel}</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  You will receive a notification: "Time to share what's happening at your business — just 2 minutes!"
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* What happens section */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-6">
        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-3">
          How it works
        </p>
        <div className="space-y-3">
          {[
            { icon: "📱", text: "You get a reminder notification on your phone" },
            { icon: "📸", text: "Tap it, take a quick photo or voice note (2 min)" },
            { icon: "🤖", text: "Our AI writes the captions for all your platforms" },
            { icon: "✅", text: "We review and approve before anything goes live" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-lg leading-none mt-0.5">{item.icon}</span>
              <p className="text-sm text-slate-300">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saveMutation.isPending || (enabled && days.length === 0)}
        className="w-full h-12 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-2xl"
      >
        {saveMutation.isPending ? "Saving…" : "Save reminder schedule"}
      </Button>
    </div>
  );
}
