import type { ReactNode } from "react";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  glow?: boolean;
};

export function GlassCard({ children, className = "", glow = false }: GlassCardProps) {
  return (
    <div className={`rounded-2xl ${glow ? "glass-card-glow" : "glass-card"} ${className}`}>
      {children}
    </div>
  );
}

export function DetectedBadge({ label = "Detected from audit" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      {label}
    </span>
  );
}
