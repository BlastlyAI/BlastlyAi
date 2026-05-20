import { useState, useEffect } from "react";
import HumanVerifiedBadge from "@/components/HumanVerifiedBadge";

// ─── Frequency add-ons ────────────────────────────────────────────────────────
const FREQUENCY_OPTIONS = [
  { id: "3x", label: "3× per week", posts: "~13 posts/month", extraCost: 0 },
  { id: "5x", label: "5× per week", posts: "~22 posts/month", extraCost: 50 },
  { id: "7x", label: "7× per week", posts: "~30 posts/month", extraCost: 100 },
];

// Budget slider stops (AUD per month)
const BUDGET_STOPS = [300, 350, 400, 500, 600, 700, 800, 900, 1000];

// ─── Props ────────────────────────────────────────────────────────────────────
interface AdSpendSliderProps {
  initialIndex?: number;
  industry?: string;
  workspaceId?: number;
  onCheckoutReady?: (url: string, adSpend: number, mgmtFee: number) => void;
  onBudgetChange?: (totalMonthlyAud: number) => void;
}

export default function AdSpendSlider({ initialIndex = 0, onBudgetChange }: AdSpendSliderProps) {
  const [budgetIdx, setBudgetIdx] = useState(initialIndex);
  const [frequency, setFrequency] = useState("3x");
  const budget = BUDGET_STOPS[budgetIdx];
  const freqOption = FREQUENCY_OPTIONS.find(f => f.id === frequency) ?? FREQUENCY_OPTIONS[0];
  const totalMonthly = budget + freqOption.extraCost;

  // Notify parent whenever budget changes
  useEffect(() => {
    onBudgetChange?.(totalMonthly);
  }, [totalMonthly, onBudgetChange]);

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">

      {/* ── Budget Slider ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
            Monthly budget
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-white">A${totalMonthly}</span>
            <span className="text-xs text-slate-500">/month</span>
          </div>
        </div>

        {/* Slider track */}
        <div className="relative pt-1">
          <input
            type="range"
            min={0}
            max={BUDGET_STOPS.length - 1}
            step={1}
            value={budgetIdx}
            onChange={e => setBudgetIdx(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, oklch(0.52 0.22 145) 0%, oklch(0.52 0.22 145) ${(budgetIdx / (BUDGET_STOPS.length - 1)) * 100}%, oklch(0.25 0.015 245) ${(budgetIdx / (BUDGET_STOPS.length - 1)) * 100}%, oklch(0.25 0.015 245) 100%)`,
            }}
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-[9px] text-slate-600">A$300</span>
            <span className="text-[9px] text-slate-600">A$1,000</span>
          </div>
        </div>

      </div>

      {/* ── Posting frequency tick-boxes ── */}
      <div className="space-y-2">
        <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
          Posting frequency
        </p>
        <div className="flex flex-col gap-2">
          {FREQUENCY_OPTIONS.map(opt => {
            const isSelected = frequency === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFrequency(opt.id)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition-all ${
                  isSelected
                    ? "border-emerald-500/60 bg-emerald-500/10"
                    : "border-white/8 bg-white/3 hover:border-white/16"
                }`}
              >
                {/* Tick circle */}
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  isSelected ? "border-emerald-400 bg-emerald-400" : "border-white/25"
                }`}>
                  {isSelected && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4L3.5 6L6.5 2" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-semibold ${isSelected ? "text-emerald-300" : "text-white/80"}`}>
                    {opt.label}
                  </span>
                  <span className="text-[11px] text-slate-500 ml-2">{opt.posts}</span>
                </div>
                <span className={`text-xs font-semibold shrink-0 ${isSelected ? "text-emerald-400" : "text-slate-500"}`}>
                  {opt.extraCost === 0 ? "included" : `+A$${opt.extraCost}/mo`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Human-verified badge ── */}
      <div className="flex justify-center">
        <HumanVerifiedBadge size="lg" />
      </div>


    </div>
  );
}

// Keep exports for any files that import them
const TOTAL_STOPS = [297, 350, 400, 500, 600, 700, 800, 900, 1000];
function splitBudget(total: number) {
  const rawMgmt = Math.round(total * 0.20 / 5) * 5;
  const mgmtFee = Math.max(97, rawMgmt);
  return { adSpend: Math.max(0, total - mgmtFee), mgmtFee };
}
export { TOTAL_STOPS, splitBudget };
