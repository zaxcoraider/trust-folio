'use client';

import { useEffect, useState } from 'react';
import type { VerificationBreakdown, VerificationTier } from '@/lib/types';
import { TIER_CONFIG } from '@/lib/types';

interface BarProps {
  label: string;
  value: number;
  color: string;
  glow: string;
  delay?: number;
}

function AnimatedBar({ label, value, color, glow, delay = 0 }: BarProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  const grade = value >= 90 ? 'S' : value >= 80 ? 'A' : value >= 70 ? 'B' : value >= 60 ? 'C' : 'D';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-xs text-gray-400">{label}</span>
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-xs font-bold w-4 text-center"
            style={{ color }}
          >
            {grade}
          </span>
          <span className="font-mono text-sm font-bold tabular-nums" style={{ color }}>
            {value}
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-white/5">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            boxShadow: `0 0 8px ${glow}`,
          }}
        />
      </div>
    </div>
  );
}

interface ScoreBreakdownProps {
  breakdown: VerificationBreakdown;
  tier: VerificationTier;
}

export function ScoreBreakdown({ breakdown, tier }: ScoreBreakdownProps) {
  const cfg = TIER_CONFIG[tier];

  const bars = [
    { label: 'Originality',  value: breakdown.originality,  color: '#a855f7', glow: 'rgba(168,85,247,0.5)' },
    { label: 'Quality',      value: breakdown.quality,      color: cfg.color, glow: cfg.glow },
    { label: 'Complexity',   value: breakdown.complexity,   color: '#06b6d4', glow: 'rgba(6,182,212,0.5)' },
    { label: 'Authenticity', value: breakdown.authenticity, color: '#ec4899', glow: 'rgba(236,72,153,0.5)' },
  ];

  return (
    <div className="space-y-3">
      {bars.map((bar, i) => (
        <AnimatedBar key={bar.label} {...bar} delay={i * 120} />
      ))}
    </div>
  );
}
