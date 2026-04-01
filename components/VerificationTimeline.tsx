'use client';

import { ExternalLink, Shield, Clock, Filter } from 'lucide-react';
import { format } from 'date-fns';
import type { VerificationRecord, SkillCategory } from '@/lib/types';
import { TIER_CONFIG } from '@/lib/types';
import { NeonCard } from './NeonCard';
import { BadgeCard } from './BadgeCard';

const CATEGORY_ICONS: Record<SkillCategory, string> = {
  code:     '⚡',
  design:   '🎨',
  writing:  '✍️',
  document: '📋',
  other:    '📁',
};

interface VerificationTimelineProps {
  records: VerificationRecord[];
  filterCategory?: SkillCategory | 'all';
}

export function VerificationTimeline({
  records,
  filterCategory = 'all',
}: VerificationTimelineProps) {
  const filtered = filterCategory === 'all'
    ? records
    : records.filter((r) => r.skillCategory === filterCategory);

  const sorted = [...filtered].sort((a, b) => b.verifiedAt - a.verifiedAt);

  if (sorted.length === 0) {
    return (
      <NeonCard className="p-10 text-center" glow="none">
        <Shield size={32} className="mx-auto mb-3 text-gray-800" />
        <p className="text-gray-600 font-mono text-sm">No verification records yet.</p>
        <p className="text-gray-700 font-mono text-xs mt-1">
          Upload and verify portfolio items to build your history.
        </p>
      </NeonCard>
    );
  }

  return (
    <div className="relative">
      {/* Neon accent line */}
      <div className="absolute left-5 top-0 bottom-0 w-px"
        style={{ background: 'linear-gradient(to bottom, rgba(168,85,247,0.5), rgba(6,182,212,0.3), transparent)' }} />

      <div className="space-y-4 pl-12">
        {sorted.map((record, i) => {
          const cfg = TIER_CONFIG[record.tier];
          const storageExp = 'https://storagescan-galileo.0g.ai';
          const chainExp   = 'https://chainscan-galileo.0g.ai';

          return (
            <div key={record.id} className="relative">
              {/* Timeline dot */}
              <div
                className="absolute -left-[2.65rem] w-5 h-5 rounded-full border-2 flex items-center justify-center"
                style={{
                  background:    cfg.bg,
                  borderColor:   cfg.color,
                  boxShadow:     `0 0 8px ${cfg.glow}`,
                }}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
              </div>

              <NeonCard
                className="p-5"
                glow={record.tier === 'diamond' ? 'none' : record.tier === 'gold' ? 'none' : record.tier === 'silver' ? 'cyan' : 'purple'}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{CATEGORY_ICONS[record.skillCategory]}</span>
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-medium text-gray-200 truncate">{record.fileName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs text-gray-600 flex items-center gap-1">
                          <Clock size={10} />
                          {format(new Date(record.verifiedAt), 'MMM d, yyyy HH:mm')}
                        </span>
                        <span className="font-mono text-xs text-gray-700 capitalize">
                          {record.skillCategory}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Score + tier badge */}
                  <div className="shrink-0">
                    <div
                      className="px-2.5 py-1 rounded-lg font-mono text-sm font-bold"
                      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
                        boxShadow: `0 0 8px ${cfg.glow}` }}
                    >
                      {cfg.emoji} {record.score}
                    </div>
                  </div>
                </div>

                {/* AI Summary */}
                {record.breakdown.summary && (
                  <p className="text-gray-500 font-mono text-xs leading-relaxed mb-3 border-l-2 pl-3"
                    style={{ borderColor: cfg.color + '40' }}>
                    {record.breakdown.summary}
                  </p>
                )}

                {/* Score bars (compact) */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: 'Orig',  value: record.breakdown.originality },
                    { label: 'Qual',  value: record.breakdown.quality },
                    { label: 'Cmpl',  value: record.breakdown.complexity },
                    { label: 'Auth',  value: record.breakdown.authenticity },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <div className="font-mono text-xs text-gray-600 mb-1">{label}</div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${value}%`, background: cfg.color }} />
                      </div>
                      <div className="font-mono text-xs mt-1" style={{ color: cfg.color }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Links row */}
                <div className="flex flex-wrap items-center gap-3">
                  {record.proofRootHash && (
                    <a href={`/check?hash=${record.proofRootHash}`}
                      className="flex items-center gap-1 font-mono text-xs text-neon-purple hover:text-neon-purple/80 transition-colors">
                      <Shield size={11} /> Proof
                    </a>
                  )}
                  {record.proofRootHash && (
                    <a href={`${storageExp}/file?hash=${record.proofRootHash}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 font-mono text-xs text-gray-600 hover:text-neon-cyan transition-colors">
                      <ExternalLink size={11} /> 0G Storage
                    </a>
                  )}
                  {record.soulBoundTxHash && (
                    <a href={`${chainExp}/tx/${record.soulBoundTxHash}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 font-mono text-xs text-gray-600 hover:text-neon-cyan transition-colors">
                      <ExternalLink size={11} /> On-chain
                    </a>
                  )}
                  {record.soulBoundTokenId != null && (
                    <span className="font-mono text-xs text-gray-700">Token #{record.soulBoundTokenId}</span>
                  )}
                  <span className="ml-auto font-mono text-xs px-2 py-0.5 rounded"
                    style={{ color: cfg.color, opacity: 0.5, background: cfg.bg }}>
                    {record.powered_by === 'real' ? '0G Compute' : 'Demo'}
                  </span>
                </div>
              </NeonCard>
            </div>
          );
        })}
      </div>
    </div>
  );
}
