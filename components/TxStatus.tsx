'use client';

/**
 * components/TxStatus.tsx
 *
 * Reusable inline transaction status block.
 * Shows: wallet pending → tx pending → confirmed/error
 */

import { Loader2, CheckCircle2, XCircle, ExternalLink, Wallet } from 'lucide-react';
import type { TxState } from '@/hooks/useTxFlow';

interface TxStatusProps {
  state: TxState;
  className?: string;
}

function short(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export function TxStatus({ state, className = '' }: TxStatusProps) {
  if (state.status === 'idle') return null;

  const base = `rounded-xl border p-4 font-mono text-sm ${className}`;

  if (state.status === 'wallet_pending') {
    return (
      <div className={base} style={{ background: 'rgba(168,85,247,0.06)', borderColor: 'rgba(168,85,247,0.3)' }}>
        <div className="flex items-center gap-3">
          <Wallet size={16} className="text-neon-purple shrink-0 animate-pulse" />
          <div>
            <p className="text-neon-purple font-semibold text-xs">Waiting for wallet approval…</p>
            <p className="text-gray-500 text-xs mt-0.5">Check your wallet and confirm the transaction</p>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'tx_pending') {
    return (
      <div className={base} style={{ background: 'rgba(6,182,212,0.06)', borderColor: 'rgba(6,182,212,0.3)' }}>
        <div className="flex items-start gap-3">
          <Loader2 size={16} className="text-neon-cyan shrink-0 animate-spin mt-0.5" />
          <div className="min-w-0">
            <p className="text-neon-cyan font-semibold text-xs">Transaction pending…</p>
            {state.txHash && (
              <a
                href={state.explorerUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-neon-cyan/70 text-xs mt-1 hover:text-neon-cyan transition-colors"
              >
                <ExternalLink size={10} />
                {short(state.txHash)} — View on Explorer
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'confirmed') {
    return (
      <div className={base} style={{ background: 'rgba(52,211,153,0.06)', borderColor: 'rgba(52,211,153,0.3)' }}>
        <div className="flex items-start gap-3">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-emerald-400 font-semibold text-xs">Transaction confirmed!</p>
            {state.txHash && (
              <a
                href={state.explorerUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-emerald-400/70 text-xs mt-1 hover:text-emerald-400 transition-colors"
              >
                <ExternalLink size={10} />
                {short(state.txHash)} — View on Explorer
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className={base} style={{ background: 'rgba(236,72,153,0.06)', borderColor: 'rgba(236,72,153,0.3)' }}>
        <div className="flex items-start gap-3">
          <XCircle size={16} className="text-neon-pink shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-neon-pink font-semibold text-xs">
              {state.error || 'Transaction failed'}
            </p>
            {state.txHash && (
              <a
                href={state.explorerUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-neon-pink/70 text-xs mt-1 hover:text-neon-pink transition-colors"
              >
                <ExternalLink size={10} />
                {short(state.txHash)} — View on Explorer
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
