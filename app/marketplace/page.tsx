'use client';

import { useState, useEffect, useMemo } from 'react';
import { Store, Plus, Clock } from 'lucide-react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { INFTCard } from '@/components/INFTCard';
import { MarketplaceFilters, type FilterState } from '@/components/MarketplaceFilters';
import type { MarketplaceListing } from '@/lib/types';
import { getActiveListings } from '@/lib/marketplace-store';
import { useNetwork } from '@/lib/network-context';
import { isConfigured } from '@/lib/contracts';

const DEFAULT_FILTERS: FilterState = {
  search:   '',
  category: '',
  tier:     '',
  minScore: '',
  maxScore: '',
  minPrice: '',
  maxPrice: '',
  sortBy:   'newest',
};

export default function MarketplacePage() {
  const [listings,  setListings]  = useState<MarketplaceListing[]>([]);
  const [filters,   setFilters]   = useState<FilterState>(DEFAULT_FILTERS);
  const [isLoaded,  setIsLoaded]  = useState(false);
  const { networkConfig }         = useNetwork();
  const { isConnected }           = useAccount();

  const marketplaceReady = isConfigured(networkConfig.contracts.marketplace);

  useEffect(() => {
    // Load real listings from localStorage (populated by on-chain list txs)
    setListings(getActiveListings());
    setIsLoaded(true);
  }, []);

  const filtered = useMemo(() => {
    let result = [...listings];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.seller.toLowerCase().includes(q) ||
          l.inft.skillCategory.includes(q) ||
          l.inft.tier.includes(q) ||
          l.inft.badges.some((b) => b.toLowerCase().includes(q))
      );
    }
    if (filters.category) result = result.filter((l) => l.inft.skillCategory === filters.category);
    if (filters.tier)     result = result.filter((l) => l.inft.tier === filters.tier);
    if (filters.minScore) result = result.filter((l) => l.inft.score >= parseInt(filters.minScore));
    if (filters.maxScore) result = result.filter((l) => l.inft.score <= parseInt(filters.maxScore));
    if (filters.minPrice) result = result.filter((l) => parseFloat(l.priceEther) >= parseFloat(filters.minPrice));
    if (filters.maxPrice) result = result.filter((l) => parseFloat(l.priceEther) <= parseFloat(filters.maxPrice));

    switch (filters.sortBy) {
      case 'newest':     result.sort((a, b) => b.listedAt - a.listedAt); break;
      case 'oldest':     result.sort((a, b) => a.listedAt - b.listedAt); break;
      case 'score_high': result.sort((a, b) => b.inft.score - a.inft.score); break;
      case 'price_low':  result.sort((a, b) => parseFloat(a.priceEther) - parseFloat(b.priceEther)); break;
      case 'price_high': result.sort((a, b) => parseFloat(b.priceEther) - parseFloat(a.priceEther)); break;
      case 'most_viewed': result.sort((a, b) => b.views - a.views); break;
    }

    return result;
  }, [listings, filters]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neon-purple animate-pulse font-mono">Loading marketplace…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Store size={20} className="text-neon-purple" />
              <h1 className="font-mono text-2xl font-black text-white">INFT Marketplace</h1>
            </div>
            <p className="text-gray-500 font-mono text-xs">
              Browse and acquire AI-verified professional portfolios as Intelligent NFTs
            </p>
          </div>
          <Link
            href="/mint"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-mono text-sm font-bold bg-gradient-to-r from-neon-purple to-neon-cyan text-bg-primary shadow-neon-purple hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <Plus size={14} />
            Mint Your INFT
          </Link>
        </div>

        {/* Contract not deployed notice */}
        {!marketplaceReady && (
          <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 flex items-center gap-3">
            <Clock size={18} className="text-amber-400 shrink-0" />
            <div>
              <p className="font-mono text-amber-400 text-sm font-bold">Marketplace launching soon</p>
              <p className="font-mono text-amber-400/70 text-xs">
                The on-chain marketplace contract is being deployed. Listings will appear here once live.
                Set NEXT_PUBLIC_TESTNET_MARKETPLACE_ADDRESS to activate.
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6">
          <MarketplaceFilters
            filters={filters}
            onChange={setFilters}
            total={filtered.length}
          />
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Store size={48} className="mx-auto mb-4 text-gray-700" />
            <div className="font-mono text-gray-400 text-lg mb-2">
              {listings.length === 0
                ? 'No INFTs listed yet'
                : 'No INFTs match your filters'}
            </div>
            <div className="font-mono text-gray-600 text-sm mb-6">
              {listings.length === 0
                ? 'Be the first to mint and list your verified portfolio!'
                : 'Try adjusting your search filters'}
            </div>
            {listings.length === 0 && (
              <Link
                href="/mint"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-mono text-sm font-bold bg-gradient-to-r from-neon-purple to-neon-cyan text-bg-primary"
              >
                <Plus size={14} />
                Mint Your INFT
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((listing) => (
              <INFTCard
                key={listing.listingId}
                inft={listing.inft}
                listing={listing}
                href={`/marketplace/${listing.listingId}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
