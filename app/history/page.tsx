'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Clock, Filter, Download } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { NeonCard } from '@/components/NeonCard';
import { VerificationTimeline } from '@/components/VerificationTimeline';
import { getVerificationHistory } from '@/lib/verification-store';
import type { VerificationRecord, SkillCategory } from '@/lib/types';
import { TIER_CONFIG } from '@/lib/types';

const SKILL_FILTERS: Array<{ value: SkillCategory | 'all'; label: string; emoji: string }> = [
  { value: 'all',      label: 'All',       emoji: '📋' },
  { value: 'code',     label: 'Code',      emoji: '⚡' },
  { value: 'design',   label: 'Design',    emoji: '🎨' },
  { value: 'writing',  label: 'Writing',   emoji: '✍️' },
  { value: 'document', label: 'Documents', emoji: '📋' },
];

export default function HistoryPage() {
  const { address, isConnected } = useAccount();
  const [records, setRecords]   = useState<VerificationRecord[]>([]);
  const [filter, setFilter]     = useState<SkillCategory | 'all'>('all');

  useEffect(() => {
    if (address) setRecords(getVerificationHistory(address));
  }, [address]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
        <div className="fixed inset-0 bg-grid pointer-events-none" />
        <NeonCard className="p-10 text-center max-w-sm w-full" glow="purple">
          <Clock size={40} className="mx-auto mb-4 text-neon-purple/40" />
          <p className="text-gray-300 font-mono text-sm mb-6">Connect wallet to view verification history</p>
          <ConnectButton />
        </NeonCard>
      </div>
    );
  }

  // Tier distribution stats
  const tierCounts = records.reduce(
    (acc, r) => { acc[r.tier] = (acc[r.tier] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  const exportHistory = () => {
    const data = JSON.stringify(records, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trustfolio-history-${address?.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative min-h-screen bg-bg-primary px-4 py-10 page-enter">
      <div className="fixed inset-0 bg-grid pointer-events-none" />

      <div className="relative mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Clock size={22} className="text-neon-purple" />
              <h1 className="font-mono text-2xl font-bold text-gray-100">Verification History</h1>
            </div>
            <p className="text-gray-600 font-mono text-xs">{records.length} verification{records.length !== 1 ? 's' : ''} recorded</p>
          </div>
          {records.length > 0 && (
            <button onClick={exportHistory}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs
                border border-neon-purple/25 text-neon-purple hover:bg-neon-purple/10 transition-all">
              <Download size={14} /> Export JSON
            </button>
          )}
        </div>

        {/* Tier stats */}
        {records.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-8">
            {(['diamond', 'gold', 'silver', 'bronze'] as const).map((tier) => {
              const cfg = TIER_CONFIG[tier];
              const count = tierCounts[tier] || 0;
              return (
                <NeonCard key={tier} className="p-3 text-center" glow="none"
                  style={{ border: `1px solid ${cfg.border}`, boxShadow: count > 0 ? `0 0 10px ${cfg.glow}` : undefined } as any}>
                  <p className="text-lg mb-1">{cfg.emoji}</p>
                  <p className="font-mono text-xl font-bold" style={{ color: cfg.color }}>{count}</p>
                  <p className="font-mono text-xs text-gray-600">{cfg.label}</p>
                </NeonCard>
              );
            })}
          </div>
        )}

        {/* Skill filters */}
        {records.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <Filter size={14} className="text-gray-600 mt-2" />
            {SKILL_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs transition-all
                  ${filter === f.value
                    ? 'text-neon-purple bg-neon-purple/15 border border-neon-purple/40'
                    : 'text-gray-500 border border-white/10 hover:text-neon-purple/70 hover:border-neon-purple/25'
                  }`}
              >
                <span>{f.emoji}</span>
                {f.label}
                <span className="text-gray-700 ml-0.5">
                  ({f.value === 'all' ? records.length : records.filter(r => r.skillCategory === f.value).length})
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Timeline */}
        <VerificationTimeline records={records} filterCategory={filter} />
      </div>
    </div>
  );
}
