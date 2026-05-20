/**
 * HumanVerifiedBadge — circular badge with:
 *   "HUMAN" in white text at the top inside the circle
 *   Shield + checkmark icon in the centre
 *   "VERIFIED" in white text at the bottom inside the circle
 *
 * Props:
 *   size  — "sm" | "md" | "lg"  (default "md")
 */
import React from "react";

interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { outer: 72,  inner: 46, fontSize: 7,   iconSize: 18, strokeW: 1.5 },
  md: { outer: 108, inner: 68, fontSize: 9,   iconSize: 26, strokeW: 2   },
  lg: { outer: 148, inner: 94, fontSize: 11,  iconSize: 36, strokeW: 2.5 },
};

export default function HumanVerifiedBadge({ size = "md", className = "" }: Props) {
  const s = SIZES[size];
  const r = s.outer / 2;
  const ir = s.inner / 2;
  const glowId = `hv-glow-${size}`;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: s.outer, height: s.outer }}
    >
      <svg
        width={s.outer}
        height={s.outer}
        viewBox={`0 0 ${s.outer} ${s.outer}`}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <defs>
          <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer dashed ring */}
        <circle
          cx={r} cy={r} r={r - 2}
          fill="none"
          stroke="oklch(0.52 0.22 145 / 0.45)"
          strokeWidth={s.strokeW}
          strokeDasharray="3 4"
        />

        {/* Inner filled circle */}
        <circle
          cx={r} cy={r} r={ir}
          fill="oklch(0.14 0.025 145)"
          stroke="oklch(0.65 0.22 145 / 0.70)"
          strokeWidth={s.strokeW}
          filter={`url(#${glowId})`}
        />

        {/* "HUMAN" — white text at the top inside the inner circle */}
        <text
          x={r}
          y={r - ir * 0.40}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={s.fontSize}
          fontWeight="800"
          fontFamily="'Space Grotesk', 'Inter', ui-sans-serif, sans-serif"
          letterSpacing="2"
          fill="white"
        >
          HUMAN
        </text>

        {/* "VERIFIED" — white text at the bottom inside the inner circle */}
        <text
          x={r}
          y={r + ir * 0.40}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={s.fontSize}
          fontWeight="800"
          fontFamily="'Space Grotesk', 'Inter', ui-sans-serif, sans-serif"
          letterSpacing="2"
          fill="white"
        >
          VERIFIED
        </text>
      </svg>

      {/* Centre shield icon with checkmark */}
      <svg
        width={s.iconSize}
        height={s.iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="oklch(0.82 0.22 145)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          position: "relative",
          zIndex: 1,
          filter: "drop-shadow(0 0 7px oklch(0.52 0.22 145 / 0.70))",
        }}
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    </div>
  );
}
