'use client';

import { ExternalLink } from 'lucide-react';
import type { VerificationTier } from '@/lib/types';
import { TIER_CONFIG } from '@/lib/types';
import { useNetwork } from '@/lib/network-context';

interface BadgeCardProps {
  tier: VerificationTier;
  score: number;
  skillCategory: string;
  proofRootHash?: string | null;
  tokenId?: number | null;
  contractAddress?: string;
  fileName?: string;
  compact?: boolean;
}

export function BadgeCard({
  tier, score, skillCategory, proofRootHash, tokenId,
  contractAddress, fileName, compact = false,
}: BadgeCardProps) {
  const cfg    = TIER_CONFIG[tier];
  const { networkConfig } = useNetwork();
  const exp      = networkConfig.storageExplorer;
  const chainExp = networkConfig.explorer;

  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs font-bold"
        style={{
          color:      cfg.color,
          border:     `1px solid ${cfg.border}`,
          background: cfg.bg,
          boxShadow:  `0 0 8px ${cfg.glow}`,
        }}
      >
        <span>{cfg.emoji}</span>
        <span>{cfg.label}</span>
        <span style={{ opacity: 0.7 }}>{score}/100</span>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-xl p-5 transition-all duration-300"
      style={{
        background: `linear-gradient(135deg, ${cfg.bg}, rgba(10,10,15,0.9))`,
        border:     `1px solid ${cfg.border}`,
        boxShadow:  `0 0 20px ${cfg.glow}, 0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 ${cfg.border}`,
      }}
    >
      {/* Top shine */}
      <div
        className="absolute top-0 left-6 right-6 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}50, transparent)` }}
      />

      <div className="flex items-center gap-4">
        {/* Big emoji */}
        <div
          className="text-4xl w-16 h-16 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            filter: `drop-shadow(0 0 10px ${cfg.glow})`,
          }}
        >
          {cfg.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="font-mono text-base font-bold tracking-wide"
              style={{ color: cfg.color, textShadow: `0 0 8px ${cfg.glow}` }}
            >
              {cfg.label.toUpperCase()} CREDENTIAL
            </span>
          </div>

          {fileName && (
            <p className="font-mono text-xs text-gray-500 truncate mb-1">{fileName}</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span
              className="font-mono text-sm font-bold tabular-nums"
              style={{ color: cfg.color }}
            >
              {score}/100
            </span>
            <span className="font-mono text-xs text-gray-600 capitalize">{skillCategory}</span>

            {tokenId != null && (
              <span className="font-mono text-xs px-2 py-0.5 rounded-full"
                style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                Token #{tokenId}
              </span>
            )}
          </div>

          {/* Proof links */}
          <div className="flex items-center gap-3 mt-2">
            {proofRootHash && (
              <a
                href={`${exp}/file?hash=${proofRootHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-xs transition-opacity hover:opacity-80"
                style={{ color: cfg.color, opacity: 0.7 }}
              >
                <ExternalLink size={10} />
                Proof
              </a>
            )}
            {tokenId != null && contractAddress && (
              <a
                href={`${chainExp}/token/${contractAddress}?a=${tokenId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-xs transition-opacity hover:opacity-80"
                style={{ color: cfg.color, opacity: 0.7 }}
              >
                <ExternalLink size={10} />
                On-chain
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
