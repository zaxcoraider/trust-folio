'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { X, Gavel, CheckCircle, ExternalLink } from 'lucide-react';
import type { INFTMetadata } from '@/lib/types';
import { TIER_CONFIG } from '@/lib/types';
import { useTxFlow } from '@/hooks/useTxFlow';
import { TxStatus } from './TxStatus';
import { useNetwork } from '@/lib/network-context';
import { MARKETPLACE_ABI } from '@/lib/contracts';

interface OfferModalProps {
  inft:      INFTMetadata;
  buyer:     string;
  onClose:   () => void;
  onSuccess: (txHash: string) => void;
}

export function OfferModal({ inft, buyer, onClose, onSuccess }: OfferModalProps) {
  const [amount,   setAmount]   = useState('');
  const [duration, setDuration] = useState('72');
  const [errMsg,   setErrMsg]   = useState('');

  const { state, execute, reset } = useTxFlow();
  const { networkConfig } = useNetwork();
  const cfg = TIER_CONFIG[inft.tier] ?? TIER_CONFIG.silver;

  const marketplaceAddress =
    networkConfig.contracts.marketplace ||
    process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT ||
    '';

  const isProcessing = state.status === 'wallet_pending' || state.status === 'tx_pending';
  const isDone       = state.status === 'confirmed' || state.status === 'error';

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) {
      setErrMsg('Please enter a valid offer amount');
      return;
    }
    if (!marketplaceAddress) {
      setErrMsg('Marketplace contract not configured');
      return;
    }
    setErrMsg('');

    const durationSecs = parseInt(duration) * 3600;

    execute({
      type:        'make_offer',
      description: `Offer ${amount} 0G for INFT #${inft.tokenId}`,
      preflight: async (provider) => {
        const contract = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI as unknown as string[], provider);
        const value    = ethers.parseEther(amount);
        await contract.makeOffer.staticCall(inft.tokenId, durationSecs, { value, from: buyer });
      },
      fn: async (signer) => {
        const contract = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI as unknown as string[], signer);
        const value    = ethers.parseEther(amount);
        return contract.makeOffer(inft.tokenId, durationSecs, { value });
      },
      onSuccess: (txHash) => {
        onSuccess(txHash);
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="relative w-full max-w-md rounded-2xl border bg-bg-card overflow-hidden"
        style={{ borderColor: cfg.border, boxShadow: `0 0 40px ${cfg.glow}66` }}
      >
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})` }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-mono text-lg font-bold text-white flex items-center gap-2">
            <Gavel size={18} style={{ color: cfg.color }} />
            Make an Offer
          </h2>
          <button onClick={onClose} disabled={isProcessing}
            className="text-gray-400 hover:text-white transition-colors p-1 disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* INFT info */}
          <div className="rounded-xl border p-3 flex items-center gap-3"
            style={{ borderColor: cfg.border, background: cfg.bg }}>
            <span className="text-2xl">{cfg.emoji}</span>
            <div>
              <div className="font-mono text-sm font-bold text-white">
                {cfg.label} INFT #{inft.tokenId}
              </div>
              <div className="text-xs text-gray-400 font-mono capitalize">
                {inft.skillCategory} · Score {inft.score}/100
              </div>
            </div>
          </div>

          {/* Form — hidden once submitted */}
          {!isDone && (
            <>
              {/* Amount input */}
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1.5">
                  Offer Amount (0G tokens)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setErrMsg(''); }}
                    placeholder="0.00"
                    min="0"
                    step="0.001"
                    disabled={isProcessing}
                    className="w-full bg-bg-secondary border rounded-lg px-4 py-2.5 font-mono text-white placeholder-gray-600 focus:outline-none transition-colors disabled:opacity-50"
                    style={{ borderColor: cfg.border + '66' }}
                    onFocus={(e) => (e.target.style.borderColor = cfg.color)}
                    onBlur={(e)  => (e.target.style.borderColor = cfg.border + '66')}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">
                    0G
                  </span>
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1.5">
                  Offer valid for
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  disabled={isProcessing}
                  className="w-full bg-bg-secondary border rounded-lg px-4 py-2.5 font-mono text-white focus:outline-none transition-colors disabled:opacity-50"
                  style={{ borderColor: cfg.border + '66' }}
                >
                  <option value="24">24 hours</option>
                  <option value="48">48 hours</option>
                  <option value="72">3 days</option>
                  <option value="168">7 days</option>
                  <option value="336">14 days</option>
                  <option value="720">30 days</option>
                </select>
              </div>

              {errMsg && (
                <p className="text-xs font-mono text-red-400">{errMsg}</p>
              )}

              {!marketplaceAddress && (
                <p className="text-amber-400/70 font-mono text-xs text-center">
                  Marketplace contract not configured
                </p>
              )}

              <p className="text-[11px] text-gray-500 font-mono">
                Your offer amount is sent on-chain and held until accepted, rejected, or expired.
              </p>
            </>
          )}

          <TxStatus state={state} />

          {/* Confirmed view */}
          {state.status === 'confirmed' && (
            <div className="text-center space-y-3">
              <CheckCircle size={36} className="mx-auto" style={{ color: cfg.color }} />
              <p className="font-mono text-white font-bold">Offer Submitted!</p>
              <p className="text-xs text-gray-400 font-mono">
                Your offer of <span style={{ color: cfg.color }}>{amount} 0G</span> is now active.
              </p>
              {state.explorerUrl && (
                <a href={state.explorerUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-mono hover:underline"
                  style={{ color: cfg.color }}>
                  <ExternalLink size={11} />
                  View transaction on 0G Explorer
                </a>
              )}
            </div>
          )}

          {/* Actions */}
          {!isDone && (
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} disabled={isProcessing}
                className="flex-1 py-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white font-mono text-sm transition-colors disabled:opacity-40">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isProcessing || !marketplaceAddress || !amount}
                className="flex-1 py-2.5 rounded-lg font-mono text-sm font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color})`,
                  color:      '#0a0a0f',
                  boxShadow:  `0 0 20px ${cfg.glow}66`,
                }}
              >
                {isProcessing ? 'Processing…' : 'Submit Offer'}
              </button>
            </div>
          )}

          {isDone && (
            <button onClick={state.status === 'error' ? reset : onClose}
              className="w-full py-2.5 rounded-lg font-mono text-sm border border-white/10 text-gray-300 hover:text-white transition-colors">
              {state.status === 'error' ? 'Try Again' : 'Done'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
