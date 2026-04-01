'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  BarChart3, Coins, TrendingUp, Users,
  ShoppingCart, Briefcase, RefreshCw, Shield, Lock,
} from 'lucide-react';
import { getAllINFTs } from '@/lib/inft-store';
import { getActiveListings, getSaleHistory } from '@/lib/marketplace-store';
import { getAllHiringRequests, getHiringStats } from '@/lib/hiring-store';
import type { AdminStats } from '@/lib/types';

// Owner wallet — should match PRIVATE_KEY owner
const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();

interface StatCard {
  label:    string;
  value:    string | number;
  subtitle: string;
  icon:     React.ReactNode;
  color:    string;
}

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const [stats,     setStats]     = useState<AdminStats | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const isAdmin = isConnected && (
    !ADMIN_ADDRESS || address?.toLowerCase() === ADMIN_ADDRESS
  );

  const loadStats = async () => {
    setLoading(true);
    try {
      // Load from localStorage (client-side)
      const allINFTs    = getAllINFTs();
      const allListings = getActiveListings();
      const sales       = getSaleHistory();
      const allHiring   = getAllHiringRequests();
      const hiringStats = getHiringStats();

      // Try on-chain stats
      let onChain = null;
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) onChain = await res.json();
      } catch { /* fallback to local */ }

      const totalVolWei  = sales.reduce((acc, s) => acc + BigInt(s.price), BigInt(0));
      const marketFeeWei = (totalVolWei * BigInt(250)) / BigInt(10000);
      const hiringFeeWei = (BigInt(Math.round(parseFloat(hiringStats.totalVolume) * 1e18)) * BigInt(250)) / BigInt(10000);

      const formatBigEth = (wei: bigint) =>
        (Number(wei) / 1e18).toFixed(4);

      const recentActivity = [
        ...sales.slice(0, 5).map((s) => ({
          type:      'sale' as const,
          summary:   `INFT #${s.tokenId} sold for ${s.priceEther} 0G`,
          amount:    s.priceEther,
          timestamp: s.timestamp,
        })),
        ...allHiring
          .filter((r) => r.status === 'released')
          .slice(0, 3)
          .map((r) => ({
            type:      'hire' as const,
            summary:   `Hiring: "${r.title}" — ${r.amountEther} 0G`,
            amount:    r.amountEther,
            timestamp: r.releasedAt ?? r.createdAt,
          })),
        ...allINFTs.slice(0, 3).map((i) => ({
          type:      'mint' as const,
          summary:   `INFT #${i.tokenId} minted (${i.tier}, ${i.score}/100)`,
          timestamp: i.mintedAt,
        })),
      ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

      setStats({
        totalINFTsMinted:     onChain?.totalINFTsMinted ?? allINFTs.length,
        totalListings:        onChain?.totalListings    ?? allListings.length,
        totalSales:           onChain?.totalSales       ?? sales.length,
        totalVolume:          onChain?.totalVolume      ?? formatBigEth(totalVolWei),
        totalMarketplaceFees: onChain?.totalMarketplaceFees ?? formatBigEth(marketFeeWei),
        totalHiringContracts: onChain?.totalHiringContracts ?? allHiring.length,
        totalHiringVolume:    onChain?.totalHiringVolume ?? hiringStats.totalVolume,
        totalHiringFees:      onChain?.totalHiringFees  ?? formatBigEth(hiringFeeWei),
        recentActivity,
      });

      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadStats();
  }, [isAdmin]);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <BarChart3 size={48} className="text-neon-purple mx-auto mb-4" />
          <h1 className="font-mono text-2xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-400 font-mono text-sm mb-6">Connect your wallet to access revenue stats</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <Lock size={48} className="text-red-400 mx-auto mb-4" />
          <h1 className="font-mono text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-500 font-mono text-sm">This dashboard is restricted to the contract owner</p>
        </div>
      </div>
    );
  }

  const statCards: StatCard[] = stats ? [
    {
      label:    'INFTs Minted',
      value:    stats.totalINFTsMinted,
      subtitle: 'Total ERC-7857 tokens',
      icon:     <Shield size={18} />,
      color:    '#a855f7',
    },
    {
      label:    'Active Listings',
      value:    stats.totalListings,
      subtitle: `${stats.totalSales} total sales`,
      icon:     <ShoppingCart size={18} />,
      color:    '#06b6d4',
    },
    {
      label:    'Marketplace Volume',
      value:    `${parseFloat(stats.totalVolume).toFixed(3)} 0G`,
      subtitle: `${parseFloat(stats.totalMarketplaceFees).toFixed(4)} 0G fees`,
      icon:     <Coins size={18} />,
      color:    '#f59e0b',
    },
    {
      label:    'Hiring Contracts',
      value:    stats.totalHiringContracts,
      subtitle: `${parseFloat(stats.totalHiringVolume).toFixed(3)} 0G volume`,
      icon:     <Briefcase size={18} />,
      color:    '#10b981',
    },
    {
      label:    'Marketplace Fees',
      value:    `${parseFloat(stats.totalMarketplaceFees).toFixed(4)} 0G`,
      subtitle: '2.5% of all sales',
      icon:     <TrendingUp size={18} />,
      color:    '#ec4899',
    },
    {
      label:    'Hiring Fees',
      value:    `${parseFloat(stats.totalHiringFees).toFixed(4)} 0G`,
      subtitle: '2.5% of escrow released',
      icon:     <Users size={18} />,
      color:    '#8b5cf6',
    },
  ] : [];

  const ACTIVITY_ICONS: Record<string, string> = {
    sale:    '💱',
    mint:    '✨',
    hire:    '🤝',
    listing: '📋',
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={20} className="text-neon-purple" />
              <h1 className="font-mono text-2xl font-black text-white">Revenue Dashboard</h1>
            </div>
            <p className="text-gray-500 font-mono text-xs">
              TrustFolio platform metrics · All values in 0G tokens
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-[10px] font-mono text-gray-600">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={loadStats}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-neon-purple/30 text-neon-purple font-mono text-sm hover:bg-neon-purple/5 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stat cards */}
        {loading && !stats ? (
          <div className="text-center py-20 text-neon-purple font-mono animate-pulse">
            Loading stats…
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border border-neon-purple/15 bg-bg-card p-5 relative overflow-hidden"
                >
                  {/* Glow dot */}
                  <div
                    className="absolute top-4 right-4 w-8 h-8 rounded-full blur-xl opacity-40"
                    style={{ background: card.color }}
                  />

                  <div className="flex items-start justify-between mb-3">
                    <div style={{ color: card.color }}>{card.icon}</div>
                  </div>
                  <div className="font-mono text-2xl font-black text-white mb-0.5">
                    {card.value}
                  </div>
                  <div className="font-mono text-xs text-white font-bold mb-0.5">{card.label}</div>
                  <div className="font-mono text-[10px] text-gray-600">{card.subtitle}</div>
                </div>
              ))}
            </div>

            {/* Total revenue highlight */}
            <div className="rounded-2xl border border-neon-purple/20 bg-gradient-to-r from-neon-purple/5 to-neon-cyan/5 p-6 mb-8">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="text-xs font-mono text-gray-500 mb-1">Total Platform Revenue</div>
                  <div className="font-mono text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-cyan">
                    {(parseFloat(stats.totalMarketplaceFees) + parseFloat(stats.totalHiringFees)).toFixed(4)} 0G
                  </div>
                  <div className="text-xs text-gray-600 font-mono mt-1">
                    Marketplace fees + Hiring fees combined
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-gray-500 mb-1">Total Platform Volume</div>
                  <div className="font-mono text-2xl font-bold text-white">
                    {(parseFloat(stats.totalVolume) + parseFloat(stats.totalHiringVolume)).toFixed(4)} 0G
                  </div>
                </div>
              </div>
            </div>

            {/* Recent activity */}
            <div className="rounded-xl border border-neon-purple/15 bg-bg-card p-5">
              <h2 className="font-mono font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={15} className="text-neon-purple" />
                Recent Activity
              </h2>

              {stats.recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-600 font-mono text-sm">
                  No recent activity — get started by minting an INFT!
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.recentActivity.map((activity, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg shrink-0">
                          {ACTIVITY_ICONS[activity.type] ?? '•'}
                        </span>
                        <div>
                          <div className="font-mono text-xs text-white">{activity.summary}</div>
                          <div className="text-[10px] font-mono text-gray-600">
                            {new Date(activity.timestamp * 1000).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {activity.amount && (
                        <span className="font-mono text-xs text-neon-purple font-bold shrink-0">
                          {activity.amount} 0G
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
