'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { useWalletClient } from 'wagmi';
import { X, Tag, CheckCircle, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import type { INFTMetadata } from '@/lib/types';
import { TIER_CONFIG } from '@/lib/types';
import { MARKETPLACE_ABI, ERC721_ABI, isConfigured } from '@/lib/contracts';
import { createListing } from '@/lib/marketplace-store';
import { walletClientToSigner } from '@/lib/wallet-to-signer';
import { useNetwork } from '@/lib/network-context';

type Step = 'form' | 'approving' | 'listing' | 'success' | 'error';

interface ListINFTModalProps {
  inft:      INFTMetadata;
  onClose:   () => void;
  onSuccess: (listingId: string) => void;
}

export function ListINFTModal({ inft, onClose, onSuccess }: ListINFTModalProps) {
  const [price,    setPrice]    = useState('');
  const [step,     setStep]     = useState<Step>('form');
  const [errMsg,   setErrMsg]   = useState('');
  const [txHash,   setTxHash]   = useState('');

  const { data: walletClient } = useWalletClient();
  const { networkConfig }      = useNetwork();

  const cfg              = TIER_CONFIG[inft.tier] ?? TIER_CONFIG.silver;
  const marketplaceAddr  = networkConfig.contracts.marketplace;
  const inftAddr         = networkConfig.contracts.inft;
  const contractReady    = isConfigured(marketplaceAddr) && isConfigured(inftAddr);

  const handleList = async () => {
    const priceFloat = parseFloat(price);
    if (!price || isNaN(priceFloat) || priceFloat <= 0) return;

    setStep('form'); // reset errors
    setErrMsg('');

    try {
      let localListingId = '';

      if (contractReady && walletClient) {
        // Step 1: Approve marketplace to transfer the INFT
        setStep('approving');
        const signer = await walletClientToSigner(walletClient);

        const inftContract = new ethers.Contract(inftAddr!, ERC721_ABI as unknown as string[], signer);
        const approveTx    = await inftContract.approve(marketplaceAddr!, inft.tokenId);
        await approveTx.wait();

        // Step 2: Create listing on-chain
        setStep('listing');
        const priceWei    = ethers.parseEther(price);
        const marketplace = new ethers.Contract(marketplaceAddr!, MARKETPLACE_ABI as unknown as string[], signer);
        const listTx      = await marketplace.createListing(inft.tokenId, priceWei);
        const receipt     = await listTx.wait();
        setTxHash(listTx.hash);

        // Parse on-chain listingId from Listed event
        let onChainListingId: number | undefined;
        const iface = new ethers.Interface(MARKETPLACE_ABI as unknown as string[]);
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
            if (parsed?.name === 'Listed') { onChainListingId = Number(parsed.args[0]); break; }
          } catch { /* skip */ }
        }

        // Save to local store with on-chain ID
        const listing  = createListing(inft, inft.owner, price, onChainListingId);
        localListingId = listing.listingId;
      } else {
        // No contract — local-only listing
        setStep('listing');
        const listing  = createListing(inft, inft.owner, price);
        localListingId = listing.listingId;
      }

      setStep('success');
      onSuccess(localListingId);
    } catch (err: unknown) {
      const e = err as { reason?: string; shortMessage?: string; message?: string };
      const msg = e?.reason || e?.shortMessage || e?.message || 'Listing failed';
      setErrMsg(
        msg.includes('user rejected') || msg.includes('ACTION_REJECTED')
          ? 'Transaction cancelled.'
          : msg,
      );
      setStep('error');
    }
  };

  const isProcessing = step === 'approving' || step === 'listing';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-neon-purple/30 bg-bg-card overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-neon-purple" />
            <span className="font-mono font-bold text-white">List INFT for Sale</span>
          </div>
          {!isProcessing && (
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="p-6">
          {/* INFT summary */}
          <div className="rounded-xl border p-4 mb-5"
            style={{ borderColor: cfg.border, background: cfg.bg }}>
            <div className="flex items-center gap-3">
              <div className="text-3xl">{cfg.emoji}</div>
              <div>
                <div className="font-mono text-sm font-bold text-white">
                  {cfg.label} INFT #{inft.tokenId}
                </div>
                <div className="font-mono text-xs capitalize" style={{ color: cfg.color }}>
                  {inft.skillCategory} · Score {inft.score}/100
                </div>
              </div>
            </div>
          </div>

          {step === 'success' ? (
            <div className="text-center py-4">
              <CheckCircle size={40} className="mx-auto mb-3 text-neon-cyan" />
              <div className="font-mono font-bold text-white mb-1">Listed Successfully!</div>
              <div className="text-xs font-mono text-gray-400 mb-4">
                Your INFT is now visible in the marketplace.
              </div>
              {txHash && (
                <a
                  href={`${networkConfig.explorer}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-neon-cyan hover:underline mb-4"
                >
                  <ExternalLink size={11} />
                  View transaction
                </a>
              )}
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-lg font-mono text-sm font-bold"
                style={{ background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color})`, color: '#0a0a0f' }}
              >
                Done
              </button>
            </div>
          ) : isProcessing ? (
            <div className="text-center py-6">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-neon-purple/20" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-neon-purple animate-spin" />
                <div className="absolute inset-3 rounded-full bg-neon-purple/10 flex items-center justify-center">
                  <Loader2 size={20} className="text-neon-purple animate-spin" />
                </div>
              </div>
              <div className="font-mono text-sm font-bold text-white mb-1">
                {step === 'approving' ? 'Approving transfer…' : 'Creating listing…'}
              </div>
              <div className="text-xs font-mono text-gray-500">
                {step === 'approving'
                  ? 'Approve the marketplace to transfer your INFT'
                  : 'Confirm the listing transaction in your wallet'}
              </div>
            </div>
          ) : (
            <>
              {/* Price input */}
              <div className="mb-5">
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Listing Price (0G)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 0.5"
                    className="w-full bg-bg-secondary border border-neon-purple/20 rounded-lg px-4 py-3 font-mono text-white text-sm focus:outline-none focus:border-neon-purple/60 transition-colors pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">0G</span>
                </div>
              </div>

              {/* Info */}
              {!contractReady && (
                <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 mb-4 text-xs font-mono text-amber-400/80">
                  Marketplace contract not configured — listing will be saved locally only.
                </div>
              )}

              {step === 'error' && errMsg && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 mb-4">
                  <AlertCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
                  <span className="text-xs font-mono text-red-400">{errMsg}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-gray-400 font-mono text-sm hover:border-white/20 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleList}
                  disabled={!price || parseFloat(price) <= 0}
                  className="flex-1 py-2.5 rounded-lg font-mono text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color})`, color: '#0a0a0f' }}
                >
                  {contractReady ? 'Approve & List' : 'List Locally'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
