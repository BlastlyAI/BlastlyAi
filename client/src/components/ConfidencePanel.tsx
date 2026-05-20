import { useState } from "react";
import { ShieldCheck, Info, ChevronDown, ChevronUp, CheckCircle2, TrendingUp, BarChart2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ─── Types (mirrors shared/confidence.ts) ────────────────────────────────────
export type ConfidenceLevel = "verified" | "high" | "estimated" | "approximate";

export interface ConfidenceItem {
  label: string;
  level: ConfidenceLevel;
  method: string;
  pct?: number;
}

export interface ScanConfidence {
  overallPct: number;
  summary: string;
  items: ConfidenceItem[];
  scannedAt: string;
  methodology: string;
}

// ─── Level metadata ───────────────────────────────────────────────────────────
const LEVEL_META: Record<ConfidenceLevel, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  dotClass: string;
  pct: number;
}> = {
  verified: {
    label: "Verified",
    icon: CheckCircle2,
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    dotClass: "bg-emerald-400",
    pct: 98,
  },
  high: {
    label: "High Confidence",
    icon: TrendingUp,
    badgeClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    dotClass: "bg-blue-400",
    pct: 85,
  },
  estimated: {
    label: "Estimated",
    icon: BarChart2,
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    dotClass: "bg-amber-400",
    pct: 70,
  },
  approximate: {
    label: "Approximate",
    icon: AlertCircle,
    badgeClass: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    dotClass: "bg-orange-400",
    pct: 55,
  },
};

// ─── Inline confidence badge ──────────────────────────────────────────────────
export function ConfidenceBadge({ level, size = "sm" }: { level: ConfidenceLevel; size?: "xs" | "sm" }) {
  const meta = LEVEL_META[level];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${meta.badgeClass} ${
        size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
      }`}
    >
      <Icon className={size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      {meta.label}
    </span>
  );
}

// ─── Overall confidence score ring ───────────────────────────────────────────
function ConfidenceRing({ pct }: { pct: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 85 ? "#34d399" : pct >= 70 ? "#60a5fa" : pct >= 55 ? "#fbbf24" : "#fb923c";

  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={radius} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-white leading-none">{pct}%</span>
        <span className="text-[8px] text-white/50 uppercase tracking-wide mt-0.5">Confidence</span>
      </div>
    </div>
  );
}

// ─── Breakdown row ────────────────────────────────────────────────────────────
function BreakdownRow({ item }: { item: ConfidenceItem }) {
  const meta = LEVEL_META[item.level];
  const pct = item.pct ?? meta.pct;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${meta.dotClass}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-white/80">{item.label}</span>
          <ConfidenceBadge level={item.level} size="xs" />
        </div>
        <p className="text-[10px] text-white/40 mt-0.5 leading-relaxed">{item.method}</p>
      </div>
      <span className="text-xs font-semibold shrink-0" style={{ color: meta.dotClass.replace("bg-", "").includes("emerald") ? "#34d399" : meta.dotClass.includes("blue") ? "#60a5fa" : meta.dotClass.includes("amber") ? "#fbbf24" : "#fb923c" }}>
        {pct}%
      </span>
    </div>
  );
}

// ─── Main ConfidencePanel component ──────────────────────────────────────────
export function ConfidencePanel({ confidence }: { confidence: ScanConfidence }) {
  const [expanded, setExpanded] = useState(false);

  const counts = {
    verified: confidence.items.filter(i => i.level === "verified").length,
    high: confidence.items.filter(i => i.level === "high").length,
    estimated: confidence.items.filter(i => i.level === "estimated").length,
    approximate: confidence.items.filter(i => i.level === "approximate").length,
  };

  const scannedDate = new Date(confidence.scannedAt).toLocaleString();

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        background: "linear-gradient(135deg, oklch(0.14 0.025 265 / 0.9), oklch(0.12 0.020 265 / 0.9))",
        borderColor: "oklch(0.25 0.030 265 / 0.5)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 p-4">
        <ConfidenceRing pct={confidence.overallPct} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">Scan Confidence Report</span>
            <Dialog>
              <DialogTrigger asChild>
                <button className="ml-auto p-1 rounded-lg hover:bg-white/10 transition-colors">
                  <Info className="w-3.5 h-3.5 text-white/40" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-lg" style={{ background: "oklch(0.12 0.020 265)", borderColor: "oklch(0.25 0.030 265 / 0.5)", color: "white" }}>
                <DialogHeader>
                  <DialogTitle className="text-white">How Blastly Calculates Confidence</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm text-white/70 leading-relaxed whitespace-pre-line">
                  {confidence.methodology}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-[11px] text-white/40">Scanned at: {scannedDate}</p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">{confidence.summary}</p>
          {/* Level pills */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {counts.verified > 0 && (
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-2.5 h-2.5" />{counts.verified} Verified
              </span>
            )}
            {counts.high > 0 && (
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                <TrendingUp className="w-2.5 h-2.5" />{counts.high} High
              </span>
            )}
            {counts.estimated > 0 && (
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <BarChart2 className="w-2.5 h-2.5" />{counts.estimated} Estimated
              </span>
            )}
            {counts.approximate > 0 && (
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">
                <AlertCircle className="w-2.5 h-2.5" />{counts.approximate} Approximate
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expandable breakdown */}
      <div className="border-t border-white/5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-white/50 hover:text-white/80 hover:bg-white/5 rounded-none h-auto"
        >
          <span>View per-data-point breakdown ({confidence.items.length} items)</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </Button>
        {expanded && (
          <div className="px-4 pb-3 max-h-80 overflow-y-auto">
            {confidence.items.map((item, i) => (
              <BreakdownRow key={i} item={item} />
            ))}
            <p className="text-[10px] text-white/30 mt-3 pt-3 border-t border-white/5">
              Scanned at {scannedDate}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Compact inline version for use inside cards ──────────────────────────────
export function ConfidenceInline({ confidence, className = "" }: { confidence: ScanConfidence; className?: string }) {
  const color = confidence.overallPct >= 85 ? "text-emerald-400" : confidence.overallPct >= 70 ? "text-blue-400" : confidence.overallPct >= 55 ? "text-amber-400" : "text-orange-400";
  const bgColor = confidence.overallPct >= 85 ? "bg-emerald-500/10 border-emerald-500/20" : confidence.overallPct >= 70 ? "bg-blue-500/10 border-blue-500/20" : confidence.overallPct >= 55 ? "bg-amber-500/10 border-amber-500/20" : "bg-orange-500/10 border-orange-500/20";

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${bgColor} ${color} ${className}`}>
      <ShieldCheck className="w-3 h-3" />
      {confidence.overallPct}% Confidence
    </span>
  );
}
