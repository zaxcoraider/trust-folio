'use client';

import { useEffect, useState } from 'react';
import type { VerificationTier } from '@/lib/types';
import { TIER_CONFIG } from '@/lib/types';

interface CircularScoreProps {
  score: number;
  tier: VerificationTier;
  size?: number;
  animate?: boolean;
}

export function CircularScore({ score, tier, size = 140, animate = true }: CircularScoreProps) {
  const [displayed, setDisplayed] = useState(animate ? 0 : score);
  const cfg   = TIER_CONFIG[tier];
  const r     = (size / 2) * 0.72;
  const circ  = 2 * Math.PI * r;
  const pct   = displayed / 100;
  const offset = circ - pct * circ;

  // Count-up animation
  useEffect(() => {
    if (!animate) return;
    let frame: number;
    const start = performance.now();
    const duration = 1200;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(score * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score, animate]);

  const tierLabel = tier === 'diamond' ? '💎 DIAMOND'
                  : tier === 'gold'    ? '🥇 GOLD'
                  : tier === 'silver'  ? '🥈 SILVER'
                  : tier === 'bronze'  ? '🥉 BRONZE'
                  : '— UNVERIFIED';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={size * 0.07}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={cfg.color}
            strokeWidth={size * 0.07}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 8px ${cfg.glow}) drop-shadow(0 0 16px ${cfg.glow})`,
              transition: animate ? 'none' : 'stroke-dashoffset 0.8s ease-out',
            }}
          />
        </svg>

        {/* Center number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono font-bold leading-none tabular-nums"
            style={{
              fontSize: size * 0.24,
              color: cfg.color,
              textShadow: `0 0 12px ${cfg.glow}`,
            }}
          >
            {displayed}
          </span>
          <span
            className="font-mono leading-none"
            style={{ fontSize: size * 0.09, color: cfg.color, opacity: 0.55 }}
          >
            /100
          </span>
        </div>
      </div>

      {/* Tier badge below */}
      <div
        className="px-3 py-1 rounded-full font-mono text-xs font-bold tracking-wider"
        style={{
          color:       cfg.color,
          border:      `1px solid ${cfg.border}`,
          background:  cfg.bg,
          boxShadow:   `0 0 12px ${cfg.glow}`,
        }}
      >
        {tierLabel}
      </div>
    </div>
  );
}
