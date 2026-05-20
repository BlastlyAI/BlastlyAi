import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Star, Gift, Bell, Save, ToggleLeft, ToggleRight,
  DollarSign, Repeat, Users, ChevronDown, ChevronUp, Info,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeTokens(dark: boolean) {
  return {
    BG:         dark ? "#0f1117" : "#f8fafc",
    CARD:       dark ? "#1a1d27" : "#ffffff",
    BORDER:     dark ? "#2d3148" : "#e5e7eb",
    TEXT:       dark ? "#f1f5f9" : "#111827",
    MUTED:      dark ? "#8b95b0" : "#6b7280",
    BLUE:       "#3b82f6",
    AMBER:      "#d97706",
    AMBER_SOFT: dark ? "#451a03" : "#fffbeb",
    GREEN:      "#16a34a",
    GREEN_SOFT: dark ? "#14532d" : "#f0fdf4",
  };
}

function SliderInput({
  label, value, min, max, step, unit, description, onChange, isDark,
}: {
  label: string; value: number; min: number; max: number; step: number;
  unit: string; description: string; onChange: (v: number) => void; isDark: boolean;
}) {
  const T = makeTokens(isDark);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold" style={{ color: T.TEXT }}>{label}</label>
        <span className="text-sm font-bold px-2.5 py-1 rounded-lg" style={{ background: T.AMBER_SOFT, color: T.AMBER }}>
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: T.AMBER }}
      />
      <div className="flex justify-between text-[10px]" style={{ color: T.MUTED }}>
        <span>{min} {unit}</span>
        <span style={{ color: T.MUTED, fontStyle: "italic" }}>{description}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}

// ─── Live Preview Card ─────────────────────────────────────────────────────────
function LivePreview({
  pointsPerDollar, dollarsPerPoint, isDark,
}: { pointsPerDollar: number; dollarsPerPoint: number; isDark: boolean }) {
  const T = makeTokens(isDark);
  const exampleSpend = 80;
  const ptsEarned = exampleSpend * pointsPerDollar;
  const visitsToReward = Math.ceil(dollarsPerPoint / (exampleSpend * pointsPerDollar / dollarsPerPoint));
  const rewardValue = (dollarsPerPoint / dollarsPerPoint).toFixed(2);

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: T.BORDER, background: T.CARD }}>
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: T.BORDER, background: T.AMBER_SOFT }}>
        <Star className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-bold text-amber-700">Live Preview — How clients see it</span>
      </div>
      <div className="px-4 py-4 space-y-3">
        {/* Example transaction */}
        <div className="rounded-xl p-3 space-y-2" style={{ background: isDark ? "#1e2030" : "#f9fafb", border: `1px solid ${T.BORDER}` }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: T.MUTED }}>Example: $80 appointment</p>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: T.TEXT }}>Points earned</span>
            <span className="text-sm font-bold text-amber-600">+{ptsEarned} pts</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: T.TEXT }}>Points needed for $1 reward</span>
            <span className="text-sm font-bold" style={{ color: T.TEXT }}>{dollarsPerPoint} pts</span>
          </div>
        </div>

        {/* SMS preview */}
        <div className="rounded-xl p-3" style={{ background: isDark ? "#1a2035" : "#eff6ff", border: `1px solid #bfdbfe` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#3b82f6" }}>
            SMS your client receives
          </p>
          <p className="text-xs leading-relaxed" style={{ color: T.TEXT }}>
            "Hi Sarah! You have <strong>{ptsEarned * 3} loyalty points</strong> with us — that's worth{" "}
            <strong>${((ptsEarned * 3) / dollarsPerPoint).toFixed(2)} off</strong> your next visit.
            Book now and redeem: blastly.ai/book/your-salon 🌟"
          </p>
        </div>

        {/* Checkout preview */}
        <div className="rounded-xl p-3" style={{ background: T.GREEN_SOFT, border: `1px solid #bbf7d0` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-green-700">
            At checkout — client can redeem
          </p>
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-green-700">
              Redeem {dollarsPerPoint} pts = <strong>$1.00 off</strong> this visit
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Client Leaderboard ───────────────────────────────────────────────────────
function ClientLeaderboard({ workspaceId, isDark }: { workspaceId: number; isDark: boolean }) {
  const T = makeTokens(isDark);
  const [expanded, setExpanded] = useState(false);

  const balancesQ = trpc.appointments.listLoyaltyBalances.useQuery(
    { workspaceId },
    { enabled: !!workspaceId }
  );

  const balances = balancesQ.data ?? [];

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: T.BORDER, background: T.CARD }}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-3 flex items-center justify-between border-b transition-colors hover:opacity-80"
        style={{ borderColor: T.BORDER, background: isDark ? "#1e2030" : "#f9fafb" }}
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: T.MUTED }} />
          <span className="text-sm font-bold" style={{ color: T.TEXT }}>Client Points Balances</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.AMBER_SOFT, color: T.AMBER }}>
            {balances.length} clients
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" style={{ color: T.MUTED }} /> : <ChevronDown className="w-4 h-4" style={{ color: T.MUTED }} />}
      </button>

      {expanded && (
        <div className="divide-y" style={{ borderColor: T.BORDER }}>
          {balancesQ.isLoading ? (
            <div className="px-4 py-6 text-center text-sm" style={{ color: T.MUTED }}>Loading…</div>
          ) : balances.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <Star className="w-8 h-8 mx-auto mb-2 text-amber-300" />
              <p className="text-sm font-semibold" style={{ color: T.TEXT }}>No points earned yet</p>
              <p className="text-xs mt-1" style={{ color: T.MUTED }}>Points will appear here after clients complete appointments.</p>
            </div>
          ) : (
            balances.slice(0, 20).map((b: {
              id: number; contactId: number; pointsBalance: number;
              totalEarned: number; totalRedeemed: number; contactName?: string;
            }, i: number) => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs font-bold w-5 text-center" style={{ color: T.MUTED }}>#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: T.TEXT }}>
                    {b.contactName ?? `Client #${b.contactId}`}
                  </p>
                  <p className="text-[10px]" style={{ color: T.MUTED }}>
                    {b.totalEarned} earned · {b.totalRedeemed} redeemed
                  </p>
                </div>
                <span className="text-sm font-bold text-amber-600 flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  {b.pointsBalance} pts
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LoyaltySettingsPage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id ?? 0;
  const isDark = document.documentElement.classList.contains("dark");
  const T = makeTokens(isDark);

  const settingsQ = trpc.appointments.getLoyaltySettings.useQuery(
    { workspaceId: wsId },
    { enabled: !!wsId }
  );

  const saveMutation = trpc.appointments.saveLoyaltySettings.useMutation({
    onSuccess: () => {
      toast.success("Loyalty settings saved!");
      settingsQ.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  // Local state — initialised from DB
  const [isEnabled,        setIsEnabled]        = useState(false);
  const [pointsPerDollar,  setPointsPerDollar]  = useState(2);
  const [dollarsPerPoint,  setDollarsPerPoint]  = useState(10);
  const [smsFrequencyDays, setSmsFrequencyDays] = useState(30);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settingsQ.data) {
      setIsEnabled(settingsQ.data.isEnabled ?? false);
      setPointsPerDollar(settingsQ.data.pointsPerDollar ?? 2);
      setDollarsPerPoint(settingsQ.data.dollarsPerPoint ?? 10);
      setSmsFrequencyDays(settingsQ.data.smsFrequencyDays ?? 30);
      setDirty(false);
    }
  }, [settingsQ.data]);

  function markDirty() { setDirty(true); }

  function handleSave() {
    saveMutation.mutate({ workspaceId: wsId, isEnabled, pointsPerDollar, dollarsPerPoint, smsFrequencyDays });
    setDirty(false);
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto space-y-6" style={{ background: T.BG }}>

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: T.TEXT }}>
              <Star className="w-5 h-5 text-amber-500" />
              Loyalty Rewards
            </h1>
            <p className="text-sm mt-1" style={{ color: T.MUTED }}>
              Reward repeat clients automatically — points earned at every appointment, redeemable at checkout.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={!dirty || saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all hover:opacity-90 flex-shrink-0"
            style={{ background: dirty ? "#16a34a" : "#64748b" }}
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>

        {/* ── Enable / Disable toggle ── */}
        <div className="rounded-2xl border p-4 flex items-center justify-between gap-4"
          style={{ borderColor: T.BORDER, background: T.CARD }}>
          <div>
            <p className="text-sm font-bold" style={{ color: T.TEXT }}>Enable Loyalty Program</p>
            <p className="text-xs mt-0.5" style={{ color: T.MUTED }}>
              When on, clients earn points at every appointment close-out and can redeem at checkout.
            </p>
          </div>
          <button
            onClick={() => { setIsEnabled(v => !v); markDirty(); }}
            className="flex-shrink-0 transition-all hover:opacity-80"
          >
            {isEnabled
              ? <ToggleRight className="w-10 h-10 text-green-500" />
              : <ToggleLeft className="w-10 h-10" style={{ color: T.MUTED }} />}
          </button>
        </div>

        {/* ── Settings (only shown when enabled) ── */}
        {isEnabled && (
          <>
            {/* Earn rate */}
            <div className="rounded-2xl border p-5 space-y-5" style={{ borderColor: T.BORDER, background: T.CARD }}>
              <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: T.BORDER }}>
                <DollarSign className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold" style={{ color: T.TEXT }}>Earn Rate</span>
              </div>

              <SliderInput
                label="Points earned per $1 spent"
                value={pointsPerDollar}
                min={1}
                max={20}
                step={1}
                unit="pts / $1"
                description={`$80 visit = ${80 * pointsPerDollar} pts`}
                onChange={v => { setPointsPerDollar(v); markDirty(); }}
                isDark={isDark}
              />

              <SliderInput
                label="Points needed for $1 reward"
                value={dollarsPerPoint}
                min={5}
                max={100}
                step={5}
                unit="pts = $1"
                description={`${dollarsPerPoint} pts = $1.00 off`}
                onChange={v => { setDollarsPerPoint(v); markDirty(); }}
                isDark={isDark}
              />

              {/* Info callout */}
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ background: T.AMBER_SOFT }}>
                <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  At these rates: a client spending <strong>$80/visit</strong> earns{" "}
                  <strong>{80 * pointsPerDollar} pts</strong> and needs{" "}
                  <strong>{Math.ceil(dollarsPerPoint / (80 * pointsPerDollar / dollarsPerPoint))} visits</strong> to earn their first $1 reward.
                </p>
              </div>
            </div>

            {/* SMS reminders */}
            <div className="rounded-2xl border p-5 space-y-4" style={{ borderColor: T.BORDER, background: T.CARD }}>
              <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: T.BORDER }}>
                <Bell className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-bold" style={{ color: T.TEXT }}>Balance Reminder SMS</span>
              </div>

              <SliderInput
                label="Send SMS balance reminder every"
                value={smsFrequencyDays}
                min={7}
                max={90}
                step={7}
                unit="days"
                description="Only sent when client has a balance"
                onChange={v => { setSmsFrequencyDays(v); markDirty(); }}
                isDark={isDark}
              />

              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ background: isDark ? "#1a2035" : "#eff6ff", border: "1px solid #bfdbfe" }}>
                <Bell className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs" style={{ color: isDark ? "#93c5fd" : "#1d4ed8" }}>
                  SMS is only sent to clients who have a points balance. Clients with 0 points won't be messaged.
                </p>
              </div>
            </div>

            {/* Redemption summary */}
            <div className="rounded-2xl border p-5 space-y-3" style={{ borderColor: T.BORDER, background: T.CARD }}>
              <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: T.BORDER }}>
                <Gift className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold" style={{ color: T.TEXT }}>Redemption Summary</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Pts per $1", value: `${pointsPerDollar}`, sub: "earned" },
                  { label: "Pts for $1 off", value: `${dollarsPerPoint}`, sub: "to redeem" },
                  { label: "SMS every", value: `${smsFrequencyDays}d`, sub: "reminder" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: T.AMBER_SOFT }}>
                    <p className="text-lg font-black text-amber-600">{s.value}</p>
                    <p className="text-[10px] font-bold text-amber-700">{s.label}</p>
                    <p className="text-[9px] text-amber-500">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Live preview */}
            <LivePreview pointsPerDollar={pointsPerDollar} dollarsPerPoint={dollarsPerPoint} isDark={isDark} />

            {/* Client leaderboard */}
            <ClientLeaderboard workspaceId={wsId} isDark={isDark} />
          </>
        )}

        {/* Disabled state */}
        {!isEnabled && (
          <div className="rounded-2xl border p-8 text-center" style={{ borderColor: T.BORDER, background: T.CARD }}>
            <Star className="w-12 h-12 mx-auto mb-3 text-amber-300 opacity-50" />
            <p className="text-base font-bold" style={{ color: T.TEXT }}>Loyalty program is off</p>
            <p className="text-sm mt-2 max-w-sm mx-auto" style={{ color: T.MUTED }}>
              Turn it on to start rewarding repeat clients. Points are awarded automatically every time you close out a payment.
            </p>
          </div>
        )}

        {/* Save button (bottom) */}
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", boxShadow: "0 2px 12px rgba(22,163,74,0.35)" }}
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Saving…" : "Save Loyalty Settings"}
          </button>
        )}

      </div>
    </DashboardLayout>
  );
}
