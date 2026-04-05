'use client';

import { ethers } from 'ethers';
import { X, ShoppingCart, AlertCircle, ExternalLink, Loader2, CheckCircle, Wallet } from 'lucide-react';
import type { MarketplaceListing } from '@/lib/types';
import { TIER_CONFIG } from '@/lib/types';
import { useTxFlow } from '@/hooks/useTxFlow';
import { TxStatus } from './TxStatus';
import { useNetwork } from '@/lib/network-context';
import { MARKETPLACE_ABI } from '@/lib/contracts';

interface BuyModalProps {
  listing:   MarketplaceListing;
  buyer:     string;
  onClose:   () => void;
  onSuccess: (txHash: string) => void;
}

export function BuyModal({ listing, buyer, onClose, onSuccess }: BuyModalProps) {
  const { state, execute, reset } = useTxFlow();
  const { networkConfig } = useNetwork();
  const cfg = TIER_CONFIG[listing.inft.tier] ?? TIER_CONFIG.silver;

  const marketplaceAddress =
    networkConfig.contracts.marketplace ||
    process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT ||
    '';

  const fee      = (parseFloat(listing.priceEther) * 0.025).toFixed(4);
  const receives = (parseFloat(listing.priceEther) * 0.975).toFixed(4);

  const handleBuy = () => {
    if (!marketplaceAddress) return;

    execute({
      type:        'buy_inft',
      description: `Buy INFT #${listing.inft.tokenId} for ${listing.priceEther} 0G`,
      fn: async (signer) => {
        const contract = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI as unknown as string[], signer);
        const price    = ethers.parseEther(listing.priceEther);

        // Resolve the on-chain listingId (stored at list time, or read from contract)
        let onChainId: number | bigint | undefined = listing.onChainListingId;
        if (onChainId === undefined) {
          onChainId = await contract.tokenToActiveListing(listing.tokenId);
          if (!onChainId || onChainId === 0n) {
            throw new Error('This listing is no longer active on-chain. It may have been cancelled or sold.');
          }
        }

        return contract.buyListing(onChainId, { value: price });
      },
      onSuccess: (txHash) => {
        onSuccess(txHash);
      },
    });
  };

  const isProcessing = state.status === 'wallet_pending' || state.status === 'tx_pending';
  const isDone       = state.status === 'confirmed' || state.status === 'error';

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
            <ShoppingCart size={18} style={{ color: cfg.color }} />
            Buy INFT
          </h2>
          <button onClick={onClose} disabled={isProcessing}
            className="text-gray-400 hover:text-white transition-colors p-1 disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* INFT preview */}
          <div className="rounded-xl border p-4" style={{ borderColor: cfg.border, background: cfg.bg }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl border"
                style={{ borderColor: cfg.border, background: cfg.bg }}>
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
          <div className="space-y-2 font-mono text-sm">
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

          {!marketplaceAddress && (
            <p className="text-amber-400/70 font-mono text-xs text-center">
              Marketplace contract not configured
            </p>
          )}

          <TxStatus state={state} />

          {/* Confirmed view */}
          {state.status === 'confirmed' && (
            <div className="text-center space-y-3">
              <CheckCircle size={36} className="mx-auto" style={{ color: cfg.color }} />
              <p className="font-mono text-white font-bold">Purchase Complete!</p>
              <p className="text-xs text-gray-400 font-mono">
                INFT #{listing.inft.tokenId} is now in your wallet
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
                onClick={handleBuy}
                disabled={isProcessing || !marketplaceAddress}
                className="flex-1 py-2.5 rounded-lg font-mono text-sm font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color})`,
                  color:      '#0a0a0f',
                  boxShadow:  `0 0 20px ${cfg.glow}`,
                }}
              >
                {state.status === 'wallet_pending' ? (
                  <><Wallet size={14} /> Waiting…</>
                ) : state.status === 'tx_pending' ? (
                  <><Loader2 size={14} className="animate-spin" /> Pending…</>
                ) : (
                  'Confirm Purchase'
                )}
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
