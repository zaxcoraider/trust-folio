'use client';

import { useState } from 'react';
import { X, Gavel, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { INFTMetadata } from '@/lib/types';
import { TIER_CONFIG } from '@/lib/types';
import { createOffer } from '@/lib/marketplace-store';

interface OfferModalProps {
  inft:      INFTMetadata;
  buyer:     string;
  onClose:   () => void;
  onSuccess: (offerId: string) => void;
}

type Step = 'form' | 'processing' | 'success' | 'error';

export function OfferModal({ inft, buyer, onClose, onSuccess }: OfferModalProps) {
  const [step,     setStep]     = useState<Step>('form');
  const [amount,   setAmount]   = useState('');
  const [duration, setDuration] = useState('72');
  const [offerId,  setOfferId]  = useState('');
  const [errMsg,   setErrMsg]   = useState('');

  const cfg = TIER_CONFIG[inft.tier] ?? TIER_CONFIG.silver;

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setErrMsg('Please enter a valid offer amount');
      return;
    }
    setErrMsg('');
    setStep('processing');

    try {
      await new Promise((r) => setTimeout(r, 1500));
      const offer = createOffer(inft.tokenId, buyer, amount, parseInt(duration));
      setOfferId(offer.offerId);
      setStep('success');
      onSuccess(offer.offerId);
    } catch (err: unknown) {
      setErrMsg((err as { message?: string })?.message || 'Failed to submit offer');
      setStep('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="relative w-full max-w-md rounded-2xl border bg-bg-card overflow-hidden"
        style={{ borderColor: cfg.border, boxShadow: `0 0 40px ${cfg.glow}66` }}
      >
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})` }} />

        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-mono text-lg font-bold text-white flex items-center gap-2">
            <Gavel size={18} style={{ color: cfg.color }} />
            Make an Offer
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          {step === 'form' && (
            <>
              {/* INFT info */}
              <div
                className="rounded-xl border p-3 mb-5 flex items-center gap-3"
                style={{ borderColor: cfg.border, background: cfg.bg }}
              >
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

              {/* Amount input */}
              <div className="mb-4">
                <label className="block text-xs font-mono text-gray-400 mb-1.5">
                  Offer Amount (0G tokens)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.001"
                    className="w-full bg-bg-secondary border rounded-lg px-4 py-2.5 font-mono text-white placeholder-gray-600 focus:outline-none focus:border-opacity-100 transition-colors"
                    style={{ borderColor: cfg.border + '66' }}
                    onFocus={(e) => (e.target.style.borderColor = cfg.color)}
                    onBlur={(e) => (e.target.style.borderColor = cfg.border + '66')}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">
                    0G
                  </span>
                </div>
              </div>

              {/* Duration */}
              <div className="mb-5">
                <label className="block text-xs font-mono text-gray-400 mb-1.5">
                  Offer valid for
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-bg-secondary border rounded-lg px-4 py-2.5 font-mono text-white focus:outline-none transition-colors"
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
                <div className="mb-4 text-xs font-mono text-red-400 flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  {errMsg}
                </div>
              )}

              <p className="text-[11px] text-gray-500 font-mono mb-5">
                Your offer amount will be held in escrow until accepted, rejected, or expires.
              </p>

              <div className="flex gap-3">
                <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-gray-400 font-mono text-sm">
                  Cancel
                </button>
                <button onClick={handleSubmit}
                  className="flex-1 py-2.5 rounded-lg font-mono text-sm font-bold transition-all hover:opacity-90"
                  style={{
                    background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color})`,
                    color:      '#0a0a0f',
                    boxShadow:  `0 0 20px ${cfg.glow}66`,
                  }}
                >
                  Submit Offer
                </button>
              </div>
            </>
          )}

          {step === 'processing' && (
            <div className="py-10 text-center">
              <Loader2 size={40} className="animate-spin mx-auto mb-4" style={{ color: cfg.color }} />
              <div className="font-mono text-white font-bold">Submitting offer…</div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-6 text-center">
              <CheckCircle size={40} className="mx-auto mb-4" style={{ color: cfg.color }} />
              <div className="font-mono text-white font-bold text-lg mb-2">Offer Submitted!</div>
              <div className="text-xs text-gray-400 font-mono mb-2">
                Your offer of <span style={{ color: cfg.color }}>{amount} 0G</span> is now active.
              </div>
              <div className="text-[10px] text-gray-600 font-mono mb-6">
                Offer ID: {offerId}
              </div>
              <button onClick={onClose}
                className="w-full py-2.5 rounded-lg font-mono text-sm font-bold"
                style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                Done
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="py-6 text-center">
              <AlertCircle size={40} className="mx-auto mb-4 text-red-400" />
              <div className="font-mono text-white font-bold mb-2">Offer Failed</div>
              <div className="text-xs text-red-400 font-mono mb-5">{errMsg}</div>
              <div className="flex gap-3">
                <button onClick={() => setStep('form')}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-gray-400 font-mono text-sm">
                  Try Again
                </button>
                <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-white font-mono text-sm">
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
