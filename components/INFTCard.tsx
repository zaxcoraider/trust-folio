'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Shield, Star, Eye, Tag, User } from 'lucide-react';
import type { INFTMetadata, MarketplaceListing } from '@/lib/types';
import { TIER_CONFIG } from '@/lib/types';

interface INFTCardProps {
  inft:     INFTMetadata;
  listing?: MarketplaceListing;
  href?:    string;
}

const SKILL_ICONS: Record<string, string> = {
  code:     '⌨️',
  design:   '🎨',
  writing:  '✍️',
  document: '📄',
  other:    '🔮',
};

export function INFTCard({ inft, listing, href }: INFTCardProps) {
  const cfg = TIER_CONFIG[inft.tier] ?? TIER_CONFIG.silver;
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // ── 3D tilt on mouse move ──────────────────────────────────────────────────
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width  / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: dy * -10, y: dx * 10 });
  };
  const resetTilt = () => setTilt({ x: 0, y: 0 });

  const shortAddr = (addr: string) =>
    `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  const card = (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetTilt}
      className="relative group cursor-pointer select-none"
      style={{ perspective: '1000px' }}
    >
      {/* Animated outer glow */}
      <div
        className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"
        style={{ background: `linear-gradient(135deg, ${cfg.glow}, transparent, ${cfg.glow})` }}
      />

      {/* Card body */}
      <div
        className="relative rounded-2xl border bg-bg-card overflow-hidden transition-all duration-200"
        style={{
          borderColor:  cfg.border,
          boxShadow:    `0 0 0 1px ${cfg.border}, 0 4px 32px ${cfg.glow}44`,
          transform:    `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition:   'transform 0.15s ease, box-shadow 0.3s ease',
        }}
      >
        {/* Top color band */}
        <div
          className="h-1.5 w-full"
          style={{ background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color}, ${cfg.color}88)` }}
        />

        {/* Avatar + tier badge */}
        <div className="px-5 pt-4 pb-2 flex items-start justify-between">
          <div className="relative">
            {/* Avatar placeholder (gradient circle) */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2 font-bold"
              style={{
                borderColor:     cfg.border,
                background:      `radial-gradient(circle at 35% 35%, ${cfg.color}33, ${cfg.bg})`,
                boxShadow:       `0 0 16px ${cfg.glow}66`,
              }}
            >
              {SKILL_ICONS[inft.skillCategory] ?? '🔮'}
            </div>
          </div>

          {/* Tier badge */}
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border"
            style={{
              color:       cfg.color,
              borderColor: cfg.border,
              background:  cfg.bg,
              boxShadow:   `0 0 8px ${cfg.glow}66`,
            }}
          >
            <span>{cfg.emoji}</span>
            <span>{cfg.label.toUpperCase()}</span>
          </div>
        </div>

        {/* Score ring + info */}
        <div className="px-5 pb-4">
          {/* Score */}
          <div className="flex items-center gap-3 mb-3">
            <div
              className="text-3xl font-mono font-black"
              style={{ color: cfg.color, textShadow: `0 0 12px ${cfg.glow}` }}
            >
              {inft.score}
            </div>
            <div className="text-xs text-gray-500 font-mono">/ 100 score</div>
          </div>

          {/* Skill + category */}
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-xs text-gray-400 capitalize">
              {SKILL_ICONS[inft.skillCategory]} {inft.skillCategory}
            </span>
          </div>

          {/* Badges (top 3) */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {inft.badges.slice(0, 3).map((badge) => (
              <span
                key={badge}
                className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                style={{ color: cfg.color, borderColor: `${cfg.color}44`, background: `${cfg.color}11` }}
              >
                {badge}
              </span>
            ))}
            {inft.badges.length > 3 && (
              <span className="text-[10px] font-mono text-gray-500">
                +{inft.badges.length - 3}
              </span>
            )}
          </div>

          {/* Owner */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-500 mb-4">
            <User size={10} />
            <span>{shortAddr(inft.owner)}</span>
          </div>

          {/* Score breakdown bar */}
          <div className="space-y-1 mb-4">
            {[
              ['Originality',  inft.originalityScore],
              ['Quality',      inft.qualityScore],
              ['Complexity',   inft.complexityScore],
              ['Authenticity', inft.authenticityScore],
            ].map(([label, val]) => (
              <div key={label as string} className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-gray-600 w-16 shrink-0">{label as string}</span>
                <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width:      `${val}%`,
                      background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})`,
                    }}
                  />
                </div>
                <span className="text-[9px] font-mono text-gray-600 w-6 text-right">{val}</span>
              </div>
            ))}
          </div>

          {/* Price / listing info */}
          {listing ? (
            <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: cfg.border + '44' }}>
              <div className="flex items-center gap-1.5">
                <Tag size={12} style={{ color: cfg.color }} />
                <span className="font-mono font-bold text-sm" style={{ color: cfg.color }}>
                  {listing.priceEther} 0G
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-600 font-mono">
                <Eye size={9} />
                {listing.views}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 pt-3 border-t" style={{ borderColor: cfg.border + '44' }}>
              <Shield size={11} className="text-gray-600" />
              <span className="text-[10px] font-mono text-gray-600">Verified INFT #{inft.tokenId}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    );
  }

  return card;
}
