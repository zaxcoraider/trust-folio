'use client';

import { useState } from 'react';
import { X, ShoppingCart, AlertCircle, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';
import type { MarketplaceListing } from '@/lib/types';
import { TIER_CONFIG } from '@/lib/types';
import { completeSale } from '@/lib/marketplace-store';
import { updateINFTOwner } from '@/lib/inft-store';

interface BuyModalProps {
  listing:  MarketplaceListing;
  buyer:    string;
  onClose:  () => void;
  onSuccess: (txHash: string) => void;
}

type Step = 'confirm' | 'processing' | 'success' | 'error';

export function BuyModal({ listing, buyer, onClose, onSuccess }: BuyModalProps) {
  const [step,    setStep]    = useState<Step>('confirm');
  const [txHash,  setTxHash]  = useState('');
  const [errMsg,  setErrMsg]  = useState('');

  const cfg      = TIER_CONFIG[listing.inft.tier] ?? TIER_CONFIG.silver;
  const fee      = (parseFloat(listing.priceEther) * 0.025).toFixed(4);
  const receives = (parseFloat(listing.priceEther) * 0.975).toFixed(4);

  const handleBuy = async () => {
    setStep('processing');
    try {
      // On-chain buy would call Marketplace.buyListing() via wagmi here.
      // For now, simulate the flow and update localStorage.
      await new Promise((r) => setTimeout(r, 2000));

      const hash = `0xtx${Date.now().toString(16)}buy`;
      setTxHash(hash);

      // Update local state
      completeSale(listing.listingId, buyer);
      updateINFTOwner(listing.tokenId, buyer);

      setStep('success');
      onSuccess(hash);
    } catch (err: unknown) {
      setErrMsg((err as { message?: string })?.message || 'Transaction failed');
      setStep('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="relative w-full max-w-md rounded-2xl border bg-bg-card overflow-hidden"
        style={{ borderColor: cfg.border, boxShadow: `0 0 40px ${cfg.glow}66` }}
      >
        {/* Top band */}
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})` }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-mono text-lg font-bold text-white flex items-center gap-2">
            <ShoppingCart size={18} style={{ color: cfg.color }} />
            Buy INFT
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          {step === 'confirm' && (
            <>
              {/* INFT preview */}
              <div
                className="rounded-xl border p-4 mb-5"
                style={{ borderColor: cfg.border, background: cfg.bg }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-xl border"
                    style={{ borderColor: cfg.border, background: cfg.bg }}
                  >
                    {cfg.emoji}
                  </div>
                  <div>
                    <div className="font-mono font-bold text-white">
                      {cfg.label} INFT #{listing.inft.tokenId}
                    </div>
                    <div className="text-xs text-gray-400 font-mono capitalize">
                      {listing.inft.skillCategory} · {listing.inft.score}/100
                    </div>
                  </div>
                </div>
              </div>

              {/* Price breakdown */}
              <div className="space-y-2 mb-5 font-mono text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Listing price</span>
                  <span className="text-white">{listing.priceEther} 0G</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Marketplace fee (2.5%)</span>
                  <span className="text-yellow-400">- {fee} 0G</span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex justify-between font-bold">
                  <span className="text-gray-300">Seller receives</span>
                  <span style={{ color: cfg.color }}>{receives} 0G</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-1">
                  <span className="text-white">You pay</span>
                  <span style={{ color: cfg.color }}>{listing.priceEther} 0G</span>
                </div>
              </div>

              <p className="text-[11px] text-gray-500 font-mono mb-5">
                By purchasing, the INFT transfers to your wallet. Encrypted metadata
                will be re-associated with your address on 0G Network.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white font-mono text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBuy}
                  className="flex-1 py-2.5 rounded-lg font-mono text-sm font-bold transition-all hover:opacity-90 active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color})`,
                    color:      '#0a0a0f',
                    boxShadow:  `0 0 20px ${cfg.glow}`,
                  }}
                >
                  Confirm Purchase
                </button>
              </div>
            </>
          )}

          {step === 'processing' && (
            <div className="py-8 text-center">
              <Loader2 size={40} className="animate-spin mx-auto mb-4" style={{ color: cfg.color }} />
              <div className="font-mono text-white font-bold mb-2">Processing transaction…</div>
              <div className="text-xs text-gray-500 font-mono">Confirm in your wallet</div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-6 text-center">
              <CheckCircle size={40} className="mx-auto mb-4" style={{ color: cfg.color }} />
              <div className="font-mono text-white font-bold text-lg mb-2">Purchase Complete!</div>
              <div className="text-xs text-gray-400 font-mono mb-5">
                INFT #{listing.inft.tokenId} is now in your wallet
              </div>
              {txHash && (
                <a
                  href={`https://chainscan-galileo.0g.ai/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-mono mb-5 hover:underline"
                  style={{ color: cfg.color }}
                >
                  View transaction <ExternalLink size={10} />
                </a>
              )}
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-lg font-mono text-sm font-bold"
                style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
              >
                Done
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="py-6 text-center">
              <AlertCircle size={40} className="mx-auto mb-4 text-red-400" />
              <div className="font-mono text-white font-bold mb-2">Transaction Failed</div>
              <div className="text-xs text-red-400 font-mono mb-5">{errMsg}</div>
              <div className="flex gap-3">
                <button onClick={() => setStep('confirm')}
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
