'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Clock, ExternalLink, CheckCircle2, XCircle, Download, Filter, Trash2 } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { NeonCard } from '@/components/NeonCard';
import { VerificationTimeline } from '@/components/VerificationTimeline';
import { getTxHistory, clearTxHistory, type TxRecord, type TxType } from '@/lib/tx-history';
import { getVerificationHistory } from '@/lib/verification-store';
import type { VerificationRecord, SkillCategory } from '@/lib/types';
import { TIER_CONFIG } from '@/lib/types';
import { useNetwork } from '@/lib/network-context';

type PageTab = 'transactions' | 'verifications';

const TX_TYPE_COLORS: Record<TxType, string> = {
  upload:         'text-neon-cyan   border-neon-cyan/30   bg-neon-cyan/5',
  verify_proof:   'text-neon-purple border-neon-purple/30 bg-neon-purple/5',
  mint_sbt:       'text-amber-400   border-amber-400/30   bg-amber-400/5',
  mint_inft:      'text-amber-400   border-amber-400/30   bg-amber-400/5',
  list_inft:      'text-neon-cyan   border-neon-cyan/30   bg-neon-cyan/5',
  cancel_listing: 'text-gray-400    border-gray-400/30    bg-gray-400/5',
  buy_inft:       'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
  make_offer:     'text-neon-purple border-neon-purple/30 bg-neon-purple/5',
  accept_offer:   'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
  cancel_offer:   'text-gray-400    border-gray-400/30    bg-gray-400/5',
  hire_create:    'text-neon-cyan   border-neon-cyan/30   bg-neon-cyan/5',
  hire_accept:    'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
  hire_decline:   'text-neon-pink   border-neon-pink/30   bg-neon-pink/5',
  hire_complete:  'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
  hire_release:   'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
  hire_cancel:    'text-gray-400    border-gray-400/30    bg-gray-400/5',
  hire_dispute:   'text-amber-400   border-amber-400/30   bg-amber-400/5',
  stake:          'text-neon-purple border-neon-purple/30 bg-neon-purple/5',
  unstake:        'text-amber-400   border-amber-400/30   bg-amber-400/5',
  claim_rewards:  'text-amber-400   border-amber-400/30   bg-amber-400/5',
  delegate:       'text-neon-cyan   border-neon-cyan/30   bg-neon-cyan/5',
  vote:           'text-neon-purple border-neon-purple/30 bg-neon-purple/5',
  propose:        'text-neon-pink   border-neon-pink/30   bg-neon-pink/5',
};

const SKILL_FILTERS: Array<{ value: SkillCategory | 'all'; label: string }> = [
  { value: 'all',      label: 'All' },
  { value: 'code',     label: 'Code' },
  { value: 'design',   label: 'Design' },
  { value: 'writing',  label: 'Writing' },
  { value: 'document', label: 'Documents' },
];

function short(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function HistoryPage() {
  const { address, isConnected } = useAccount();
  const { networkConfig } = useNetwork();
  const [tab,        setTab]        = useState<PageTab>('transactions');
  const [txRecords,  setTxRecords]  = useState<TxRecord[]>([]);
  const [verRecords, setVerRecords] = useState<VerificationRecord[]>([]);
  const [skillFilter, setSkillFilter] = useState<SkillCategory | 'all'>('all');

  useEffect(() => {
    if (address) {
      setTxRecords(getTxHistory(address));
      setVerRecords(getVerificationHistory(address));
    }
  }, [address]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
        <div className="fixed inset-0 bg-grid pointer-events-none" />
        <NeonCard className="p-10 text-center max-w-sm w-full" glow="purple">
          <Clock size={40} className="mx-auto mb-4 text-neon-purple/40" />
          <p className="text-gray-300 font-mono text-sm mb-6">Connect wallet to view history</p>
          <ConnectButton />
        </NeonCard>
      </div>
    );
  }

  const tierCounts = verRecords.reduce(
    (acc, r) => { acc[r.tier] = (acc[r.tier] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  const exportTxHistory = () => {
    const blob = new Blob([JSON.stringify(txRecords, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `trustfolio-txs-${address?.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearTxHistory = () => {
    if (!address) return;
    clearTxHistory(address);
    setTxRecords([]);
  };

  return (
    <div className="relative min-h-screen bg-bg-primary px-4 py-10 page-enter">
      <div className="fixed inset-0 bg-grid pointer-events-none" />

      <div className="relative mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Clock size={22} className="text-neon-purple" />
          <div>
            <h1 className="font-mono text-2xl font-bold text-gray-100">Activity History</h1>
            <p className="font-mono text-xs text-gray-500">
              {txRecords.length} transaction{txRecords.length !== 1 ? 's' : ''} · {verRecords.length} verification{verRecords.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-white/10">
          {(['transactions', 'verifications'] as PageTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-mono text-sm px-4 py-2 -mb-px border-b-2 capitalize transition-all
                ${tab === t
                  ? 'text-neon-purple border-neon-purple'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}
            >
              {t === 'transactions' ? `Transactions (${txRecords.length})` : `Verifications (${verRecords.length})`}
            </button>
          ))}
        </div>

        {/* ── TRANSACTIONS TAB ─────────────────────────────────────────── */}
        {tab === 'transactions' && (
          <div>
            {txRecords.length > 0 && (
              <div className="flex justify-end gap-2 mb-4">
                <button onClick={exportTxHistory}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs border border-neon-purple/25 text-neon-purple hover:bg-neon-purple/10 transition-all">
                  <Download size={13} /> Export
                </button>
                <button onClick={handleClearTxHistory}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs border border-neon-pink/25 text-neon-pink/70 hover:text-neon-pink hover:bg-neon-pink/10 transition-all">
                  <Trash2 size={13} /> Clear
                </button>
              </div>
            )}

            {txRecords.length === 0 ? (
              <NeonCard className="p-10 text-center" glow="none">
                <Clock size={36} className="mx-auto mb-3 text-gray-700" />
                <p className="font-mono text-gray-500 text-sm">No transactions yet</p>
                <p className="font-mono text-gray-700 text-xs mt-1">
                  Transactions will appear here after you upload files, mint credentials, or interact with contracts.
                </p>
              </NeonCard>
            ) : (
              <div className="space-y-2">
                {txRecords.map((tx) => {
                  const colorClass = TX_TYPE_COLORS[tx.type] ?? 'text-gray-400 border-gray-400/30 bg-gray-400/5';
                  const explorerUrl = tx.explorerUrl || `${networkConfig.explorer}/tx/${tx.txHash}`;
                  return (
                    <NeonCard key={tx.id} className="p-4" glow="none">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {tx.status === 'confirmed' ? (
                            <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                          ) : (
                            <XCircle size={16} className="text-neon-pink mt-0.5 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                              <span className={`font-mono text-xs px-2 py-0.5 rounded border ${colorClass}`}>
                                {tx.label}
                              </span>
                              <span className={`font-mono text-xs ${tx.status === 'confirmed' ? 'text-emerald-400' : 'text-neon-pink'}`}>
                                {tx.status}
                              </span>
                            </div>
                            <p className="font-mono text-sm text-gray-300 truncate">{tx.description}</p>
                            <a
                              href={explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-xs text-gray-500 hover:text-neon-cyan transition-colors mt-0.5"
                            >
                              <ExternalLink size={10} />
                              {short(tx.txHash)}
                            </a>
                            {tx.storageUrl && (
                              <a
                                href={tx.storageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-mono text-xs text-gray-600 hover:text-neon-purple transition-colors mt-0.5 ml-3"
                              >
                                <ExternalLink size={10} />
                                Storage
                              </a>
                            )}
                          </div>
                        </div>
                        <span className="font-mono text-xs text-gray-600 shrink-0 mt-0.5">
                          {relativeTime(tx.timestamp)}
                        </span>
                      </div>
                    </NeonCard>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── VERIFICATIONS TAB ────────────────────────────────────────── */}
        {tab === 'verifications' && (
          <div>
            {verRecords.length > 0 && (
              <>
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {(['diamond', 'gold', 'silver', 'bronze'] as const).map((tier) => {
                    const cfg   = TIER_CONFIG[tier];
                    const count = tierCounts[tier] || 0;
                    return (
                      <NeonCard key={tier} className="p-3 text-center" glow="none"
                        style={{ border: `1px solid ${cfg.border}`, boxShadow: count > 0 ? `0 0 10px ${cfg.glow}` : undefined } as React.CSSProperties}>
                        <p className="text-lg mb-1">{cfg.emoji}</p>
                        <p className="font-mono text-xl font-bold" style={{ color: cfg.color }}>{count}</p>
                        <p className="font-mono text-xs text-gray-600">{cfg.label}</p>
                      </NeonCard>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <Filter size={14} className="text-gray-600 mt-2" />
                  {SKILL_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setSkillFilter(f.value)}
                      className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all border
                        ${skillFilter === f.value
                          ? 'text-neon-purple bg-neon-purple/15 border-neon-purple/40'
                          : 'text-gray-500 border-white/10 hover:text-neon-purple/70'
                        }`}
                    >
                      {f.label}
                      <span className="text-gray-700 ml-1">
                        ({f.value === 'all' ? verRecords.length : verRecords.filter(r => r.skillCategory === f.value).length})
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <VerificationTimeline records={verRecords} filterCategory={skillFilter} />
          </div>
        )}
      </div>
    </div>
  );
}
