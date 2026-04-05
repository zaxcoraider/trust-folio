'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import {
  ArrowLeft, Shield, ExternalLink, Tag, Eye,
  ShoppingCart, Gavel, Briefcase, Clock, Star,
  CheckCircle, User, Copy, Check, XCircle,
} from 'lucide-react';
import { ethers } from 'ethers';
import { BuyModal } from '@/components/BuyModal';
import { OfferModal } from '@/components/OfferModal';
import { HiringRequestModal } from '@/components/HiringRequestModal';
import { TxStatus } from '@/components/TxStatus';
import type { MarketplaceListing, MarketplaceOffer, INFTMetadata } from '@/lib/types';
import { TIER_CONFIG } from '@/lib/types';
import { getListing, getListingByTokenId, getOffersForToken, incrementListingViews, cancelListing as cancelLocalListing } from '@/lib/marketplace-store';
import { getINFT } from '@/lib/inft-store';
import { fetchMarketplaceListings, fetchAllINFTs } from '@/lib/chain-reader';
import { useTxFlow } from '@/hooks/useTxFlow';
import { useNetwork } from '@/lib/network-context';
import { MARKETPLACE_ABI, isConfigured } from '@/lib/contracts';
import { formatDistanceToNow, format } from 'date-fns';

export default function INFTDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id     = params?.id as string;
  const { address, isConnected } = useAccount();

  const [listing,     setListing]     = useState<MarketplaceListing | null>(null);
  const [unlistedINFT, setUnlistedINFT] = useState<INFTMetadata | null>(null);
  const [offers,      setOffers]      = useState<MarketplaceOffer[]>([]);
  const [modal,       setModal]       = useState<'buy' | 'offer' | 'hire' | null>(null);
  const [copied,      setCopied]      = useState<string | null>(null);

  const { state: cancelState, execute: cancelExecute, reset: cancelReset } = useTxFlow();
  const { networkConfig } = useNetwork();
  const marketplaceAddress = networkConfig.contracts.marketplace;
  const marketplaceReady   = isConfigured(marketplaceAddress);
  const cancelPending = cancelState.status === 'wallet_pending' || cancelState.status === 'tx_pending';

  useEffect(() => {
    if (!id) return;

    async function load() {
      // 1. Local store — instant if data was cached from a previous visit
      let l = getListing(id);
      if (!l) l = getListingByTokenId(Number(id));

      if (l) {
        setListing(l);
        setOffers(getOffersForToken(l.tokenId));
        incrementListingViews(l.listingId);
        return;
      }

      // 2. Chain — look for a marketplace listing matching this tokenId or listingId
      const chainListings = await fetchMarketplaceListings(networkConfig);
      const matched = chainListings.find(
        (cl) => cl.listingId === id || cl.tokenId === Number(id)
      );
      if (matched) {
        setListing(matched);
        return;
      }

      // 3. INFT exists but isn't listed — show hire-only view
      // Try local store first, then chain
      const localINFT = getINFT(Number(id));
      if (localINFT) { setUnlistedINFT(localINFT); return; }

      const allINFTs = await fetchAllINFTs(networkConfig);
      const chainINFT = allINFTs.find((t) => t.tokenId === Number(id));
      setUnlistedINFT(chainINFT ?? null);
    }

    load();
  }, [id, networkConfig]);

  if (!listing) {
    // INFT exists but not listed — show hire-only view
    if (unlistedINFT) {
      const cfg    = TIER_CONFIG[unlistedINFT.tier] ?? TIER_CONFIG.silver;
      const isSelf = address?.toLowerCase() === unlistedINFT.owner.toLowerCase();
      return (
        <div className="min-h-screen pt-24 pb-16 px-4">
          <div className="max-w-lg mx-auto">
            <Link href="/hire" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-neon-purple font-mono text-sm mb-6 transition-colors">
              <ArrowLeft size={14} />
              Hiring Portal
            </Link>
            <div className="rounded-2xl border p-8 text-center"
              style={{ borderColor: cfg.border, background: `linear-gradient(160deg, ${cfg.bg}, #12121f)`, boxShadow: `0 0 48px ${cfg.glow}33` }}>
              <div className="text-5xl mb-3">{cfg.emoji}</div>
              <div className="font-mono text-xl font-bold text-white mb-1">
                {cfg.label} INFT #{unlistedINFT.tokenId}
              </div>
              <div className="font-mono text-4xl font-black mb-1" style={{ color: cfg.color }}>{unlistedINFT.score}</div>
              <div className="text-xs text-gray-500 font-mono mb-2">/ 100 · {unlistedINFT.skillCategory}</div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-mono mb-6"
                style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}>
                Not listed for sale
              </div>
              {!isConnected ? (
                <div className="flex justify-center"><ConnectButton /></div>
              ) : !isSelf ? (
                <>
                  <button
                    onClick={() => setModal('hire')}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-mono text-sm font-bold transition-all hover:opacity-90"
                    style={{ background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color})`, color: '#0a0a0f', boxShadow: `0 0 20px ${cfg.glow}66` }}
                  >
                    <Briefcase size={14} />
                    Contact for Hire
                  </button>
                  {modal === 'hire' && (
                    <HiringRequestModal
                      talent={unlistedINFT}
                      employer={address!}
                      onClose={() => setModal(null)}
                      onSuccess={() => router.push('/hire')}
                    />
                  )}
                </>
              ) : (
                <div className="text-xs font-mono text-gray-600">This is your INFT</div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Neither listing nor INFT found
    return (
      <div className="min-h-screen pt-24 px-4 text-center">
        <div className="font-mono text-gray-500 mt-20">INFT not found</div>
        <Link href="/marketplace" className="mt-4 inline-flex items-center gap-1.5 text-neon-purple font-mono text-sm hover:underline">
          <ArrowLeft size={14} />
          Back to marketplace
        </Link>
      </div>
    );
  }

  const { inft } = listing;
  const cfg       = TIER_CONFIG[inft.tier] ?? TIER_CONFIG.silver;
  const isOwner   = address?.toLowerCase() === listing.seller.toLowerCase();
  const isSelf    = address?.toLowerCase() === inft.owner.toLowerCase();

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCancelListing = () => {
    if (!listing) return;
    // Always cancel in local store; if marketplace contract is live and tokenId matches
    // on-chain listingId, the tx will cancel on-chain too.
    if (marketplaceReady) {
      cancelExecute({
        type: 'cancel_listing',
        description: `Cancel listing for INFT #${listing.tokenId}`,
        fn: async (signer) => {
          const contract = new ethers.Contract(marketplaceAddress!, MARKETPLACE_ABI as unknown as string[], signer);
          // Use stored on-chain listingId, or look it up from the contract
          let onChainId: number | bigint | undefined = listing.onChainListingId;
          if (onChainId === undefined) {
            onChainId = await contract.tokenToActiveListing(listing.tokenId);
          }
          return contract.cancelListing(onChainId);
        },
        onSuccess: () => {
          cancelLocalListing(listing.listingId);
          setListing((prev) => prev ? { ...prev, active: false } : prev);
        },
      });
    } else {
      cancelLocalListing(listing.listingId);
      setListing((prev) => prev ? { ...prev, active: false } : prev);
    }
  };

  const SKILL_ICONS: Record<string, string> = {
    code: '⌨️', design: '🎨', writing: '✍️', document: '📄', other: '🔮',
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Back */}
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-neon-purple font-mono text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          Marketplace
        </Link>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left: INFT card (2 cols) */}
          <div className="lg:col-span-2">
            {/* Main card */}
            <div
              className="rounded-2xl border overflow-hidden mb-4"
              style={{
                borderColor: cfg.border,
                boxShadow:   `0 0 48px ${cfg.glow}44`,
                background:  `linear-gradient(160deg, ${cfg.bg}, #12121f)`,
              }}
            >
              <div className="h-2" style={{ background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color}, ${cfg.color}88)` }} />

              <div className="p-6">
                {/* Tier + skill */}
                <div className="flex items-center justify-between mb-6">
                  <div
                    className="flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-bold"
                    style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}
                  >
                    {cfg.emoji} {cfg.label.toUpperCase()} INFT
                  </div>
                  <span className="text-lg">{SKILL_ICONS[inft.skillCategory]}</span>
                </div>

                {/* Score */}
                <div
                  className="text-7xl font-mono font-black mb-1"
                  style={{ color: cfg.color, textShadow: `0 0 32px ${cfg.glow}` }}
                >
                  {inft.score}
                </div>
                <div className="text-xs text-gray-500 font-mono mb-6">/ 100 AI Verification Score</div>

                {/* AI breakdown */}
                <div className="space-y-2.5 mb-6">
                  {[
                    ['Originality',  inft.originalityScore],
                    ['Quality',      inft.qualityScore],
                    ['Complexity',   inft.complexityScore],
                    ['Authenticity', inft.authenticityScore],
                  ].map(([label, val]) => (
                    <div key={label as string}>
                      <div className="flex justify-between text-[11px] font-mono text-gray-500 mb-1">
                        <span>{label as string}</span>
                        <span style={{ color: cfg.color }}>{val}/100</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${val}%`, background: `linear-gradient(90deg, ${cfg.color}66, ${cfg.color})` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {inft.badges.map((badge) => (
                    <span
                      key={badge}
                      className="text-[10px] font-mono px-2 py-1 rounded-full border flex items-center gap-1"
                      style={{ color: cfg.color, borderColor: `${cfg.color}44`, background: `${cfg.color}11` }}
                    >
                      <Star size={8} />
                      {badge}
                    </span>
                  ))}
                </div>

                {/* Views */}
                <div className="flex items-center gap-1.5 text-xs font-mono text-gray-600">
                  <Eye size={12} />
                  {listing.views} views
                </div>
              </div>
            </div>

            {/* Proof links */}
            <div className="rounded-xl border border-neon-purple/15 bg-bg-card p-4 space-y-3">
              <div className="text-xs font-mono text-gray-500 font-bold flex items-center gap-1.5 mb-2">
                <Shield size={12} className="text-neon-cyan" />
                Verification Proofs
              </div>

              {[
                {
                  label: '0G Storage Proof',
                  value: inft.proofRootHash || 'Not available',
                  href:  inft.proofRootHash
                    ? `${process.env.NEXT_PUBLIC_ZERO_G_STORAGE_EXPLORER || 'https://storagescan-galileo.0g.ai'}/file/${inft.proofRootHash}`
                    : null,
                  copyKey: 'proof',
                },
                {
                  label: 'Portfolio File Hash',
                  value: inft.fileRootHash,
                  href:  null,
                  copyKey: 'file',
                },
                {
                  label: 'INFT Contract',
                  value: `${inft.contractAddress.slice(0, 10)}…${inft.contractAddress.slice(-8)}`,
                  href:  `https://chainscan-galileo.0g.ai/address/${inft.contractAddress}`,
                  copyKey: 'contract',
                },
              ].map(({ label, value, href, copyKey }) => (
                <div key={label}>
                  <div className="text-[10px] font-mono text-gray-600 mb-0.5">{label}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono text-gray-400 truncate flex-1">{value.slice(0, 30)}{value.length > 30 ? '…' : ''}</span>
                    <button
                      onClick={() => copy(value, copyKey)}
                      className="text-gray-600 hover:text-neon-cyan transition-colors"
                    >
                      {copied === copyKey ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                    {href && (
                      <a href={href} target="_blank" rel="noopener noreferrer"
                        className="text-gray-600 hover:text-neon-cyan transition-colors">
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: details (3 cols) */}
          <div className="lg:col-span-3 space-y-5">

            {/* Title + actions */}
            <div>
              <h1 className="font-mono text-2xl font-black text-white mb-1">
                {cfg.label} Portfolio INFT #{inft.tokenId}
              </h1>
              <div className="flex items-center gap-2 text-xs font-mono text-gray-500 mb-4">
                <User size={11} />
                Owner: {inft.owner.slice(0, 8)}…{inft.owner.slice(-6)}
                {isOwner && (
                  <span className="text-neon-purple">(you)</span>
                )}
              </div>

              {/* Price + buy */}
              {listing.active && (
                <div
                  className="rounded-xl border p-4 mb-4"
                  style={{ borderColor: cfg.border, background: cfg.bg }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <div className="text-xs font-mono text-gray-500 mb-1 flex items-center gap-1">
                        <Tag size={11} />
                        Listed price
                      </div>
                      <div
                        className="font-mono text-3xl font-black"
                        style={{ color: cfg.color, textShadow: `0 0 12px ${cfg.glow}` }}
                      >
                        {listing.priceEther} <span className="text-lg">0G</span>
                      </div>
                      <div className="text-[10px] text-gray-600 font-mono mt-0.5">
                        Listed {formatDistanceToNow(listing.listedAt * 1000, { addSuffix: true })}
                      </div>
                    </div>

                    {!isOwner && (
                      <div className="flex flex-col gap-2">
                        {!isConnected ? (
                          <ConnectButton />
                        ) : (
                          <>
                            <button
                              onClick={() => setModal('buy')}
                              className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-mono text-sm font-bold transition-all hover:opacity-90"
                              style={{
                                background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color})`,
                                color:      '#0a0a0f',
                                boxShadow:  `0 0 20px ${cfg.glow}66`,
                              }}
                            >
                              <ShoppingCart size={14} />
                              Buy Now
                            </button>
                            <button
                              onClick={() => setModal('offer')}
                              className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-mono text-sm border transition-all hover:bg-white/5"
                              style={{ borderColor: cfg.border, color: cfg.color }}
                            >
                              <Gavel size={14} />
                              Make Offer
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    {isOwner && isConnected && (
                      <div className="flex flex-col gap-2">
                        <TxStatus state={cancelState} />
                        {cancelState.status !== 'confirmed' && (
                          <button
                            onClick={handleCancelListing}
                            disabled={cancelPending}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-mono text-sm border border-red-500/30 text-red-400 hover:bg-red-500/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <XCircle size={14} />
                            {cancelPending ? 'Cancelling…' : 'Cancel Listing'}
                          </button>
                        )}
                        {cancelState.status === 'error' && (
                          <button onClick={cancelReset} className="text-xs font-mono text-gray-500 hover:text-gray-300 transition-colors">
                            ← Try again
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hire button (always shown, not for owner) */}
              {!isSelf && isConnected && (
                <button
                  onClick={() => setModal('hire')}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-mono text-sm border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10 transition-colors"
                >
                  <Briefcase size={14} />
                  Contact for Hire
                </button>
              )}
            </div>

            {/* Portfolio details */}
            <div className="rounded-xl border border-neon-purple/15 bg-bg-card p-5">
              <h2 className="font-mono font-bold text-white mb-4 flex items-center gap-2">
                <Shield size={15} className="text-neon-purple" />
                AI Verification Details
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Overall Score',    value: `${inft.score}/100`,         color: cfg.color },
                  { label: 'Skill Category',   value: inft.skillCategory,          color: '#e5e7eb' },
                  { label: 'Tier',             value: `${cfg.emoji} ${cfg.label}`, color: cfg.color },
                  { label: 'Minted',           value: format(inft.mintedAt * 1000, 'MMM d, yyyy'), color: '#e5e7eb' },
                  { label: 'Original Owner',   value: `${inft.originalOwner.slice(0, 8)}…`, color: '#9ca3af' },
                  { label: 'Standard',         value: 'ERC-7857',                  color: '#9ca3af' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-bg-secondary rounded-lg p-3">
                    <div className="text-[10px] font-mono text-gray-600 mb-1">{label}</div>
                    <div className="font-mono text-sm font-bold capitalize" style={{ color }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active offers */}
            {offers.length > 0 && (
              <div className="rounded-xl border border-neon-purple/15 bg-bg-card p-5">
                <h2 className="font-mono font-bold text-white mb-4 flex items-center gap-2">
                  <Gavel size={15} className="text-neon-purple" />
                  Active Offers ({offers.length})
                </h2>
                <div className="space-y-2">
                  {offers.map((offer) => (
                    <div
                      key={offer.offerId}
                      className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary border border-white/5"
                    >
                      <div>
                        <div className="font-mono text-sm font-bold text-white">{offer.amountEther} 0G</div>
                        <div className="text-[10px] font-mono text-gray-600">
                          From {offer.buyer.slice(0, 8)}…{offer.buyer.slice(-4)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-mono text-gray-600 flex items-center gap-1 justify-end">
                          <Clock size={9} />
                          Expires {formatDistanceToNow(offer.expiresAt * 1000, { addSuffix: true })}
                        </div>
                        {isOwner && (
                          <button className="text-[10px] font-mono text-neon-cyan hover:underline mt-0.5">
                            Accept
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Badges showcase */}
            <div className="rounded-xl border border-neon-purple/15 bg-bg-card p-5">
              <h2 className="font-mono font-bold text-white mb-4 flex items-center gap-2">
                <Star size={15} className="text-neon-purple" />
                Soul-Bound Credentials & Badges
              </h2>
              <div className="flex flex-wrap gap-2">
                {inft.badges.map((badge) => (
                  <div
                    key={badge}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                    style={{ color: cfg.color, borderColor: `${cfg.color}33`, background: `${cfg.color}08` }}
                  >
                    <CheckCircle size={12} style={{ color: cfg.color }} />
                    <span className="text-xs font-mono font-bold">{badge}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal === 'buy' && (
        <BuyModal
          listing={listing}
          buyer={address!}
          onClose={() => setModal(null)}
          onSuccess={() => {
            setModal(null);
            setListing((prev) => prev ? { ...prev, active: false } : prev);
          }}
        />
      )}
      {modal === 'offer' && (
        <OfferModal
          inft={inft}
          buyer={address!}
          onClose={() => setModal(null)}
          onSuccess={() => {
            setModal(null);
            setOffers(getOffersForToken(inft.tokenId));
          }}
        />
      )}
      {modal === 'hire' && (
        <HiringRequestModal
          talent={inft}
          employer={address!}
          onClose={() => setModal(null)}
          onSuccess={() => router.push('/hire')}
        />
      )}
    </div>
  );
}
