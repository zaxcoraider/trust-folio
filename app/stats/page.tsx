'use client';

import { useState, useEffect } from 'react';
import { BarChart2, Award, Zap, ShoppingBag, Briefcase, TrendingUp, Users } from 'lucide-react';
import { NeonCard } from '@/components/NeonCard';
import { getAllINFTs } from '@/lib/inft-store';
import { getActiveListings, getSaleHistory } from '@/lib/marketplace-store';
import { getAllHiringRequests } from '@/lib/hiring-store';
import type { INFTMetadata } from '@/lib/types';

interface StatCard {
  label:  string;
  value:  string | number;
  icon:   React.ElementType;
  color:  string;
  glow:   'purple' | 'cyan' | 'pink' | 'none';
}

function deriveStats(infts: INFTMetadata[]) {
  const tierCounts = { diamond: 0, gold: 0, silver: 0, bronze: 0 };
  const skillCounts: Record<string, number> = {};
  for (const inft of infts) {
    if (inft.tier in tierCounts) tierCounts[inft.tier as keyof typeof tierCounts]++;
    skillCounts[inft.skillCategory] = (skillCounts[inft.skillCategory] ?? 0) + 1;
  }
  return { tierCounts, skillCounts };
}

export default function StatsPage() {
  const [infts,    setInfts]    = useState<INFTMetadata[]>([]);
  const [listings, setListings] = useState(0);
  const [sales,    setSales]    = useState(0);
  const [hires,    setHires]    = useState(0);
  const [volume,   setVolume]   = useState(0);
  const [loaded,   setLoaded]   = useState(false);

  useEffect(() => {
    const allInfts    = getAllINFTs();
    const allListings = getActiveListings();
    const allSales    = getSaleHistory();
    const allHires    = getAllHiringRequests();

    setInfts(allInfts);
    setListings(allListings.length);
    setSales(allSales.length);
    setHires(allHires.length);
    setVolume(
      allSales.reduce((sum, s) => sum + parseFloat(s.priceEther ?? '0'), 0)
    );
    setLoaded(true);
  }, []);

  const { tierCounts, skillCounts } = deriveStats(infts);
  const totalINFTs = infts.length;

  const STAT_CARDS: StatCard[] = [
    { label: 'Total INFTs Minted',    value: totalINFTs,              icon: Zap,         color: 'text-neon-purple', glow: 'purple' },
    { label: 'Active Listings',       value: listings,                icon: ShoppingBag, color: 'text-neon-cyan',   glow: 'cyan'   },
    { label: 'Completed Sales',       value: sales,                   icon: TrendingUp,  color: 'text-neon-pink',   glow: 'pink'   },
    { label: 'Hiring Contracts',      value: hires,                   icon: Briefcase,   color: 'text-neon-purple', glow: 'purple' },
    { label: 'Marketplace Volume',    value: `${volume.toFixed(2)} 0G`, icon: Award,     color: 'text-neon-cyan',   glow: 'cyan'   },
    { label: 'Diamond Credentials',  value: tierCounts.diamond,       icon: Users,       color: 'text-gray-300',    glow: 'none'   },
  ];

  const TIER_ROWS = [
    { label: 'Diamond', count: tierCounts.diamond, color: '#e2e8f0' },
    { label: 'Gold',    count: tierCounts.gold,    color: '#f59e0b' },
    { label: 'Silver',  count: tierCounts.silver,  color: '#06b6d4' },
    { label: 'Bronze',  count: tierCounts.bronze,  color: '#a855f7' },
  ];

  const SKILL_ROWS = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([skill, count]) => ({ skill, count }));

  const topINFTs = [...infts]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neon-purple animate-pulse font-mono">Loading stats…</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-bg-primary px-4 py-10">
      <div className="fixed inset-0 bg-grid opacity-100 pointer-events-none" />
      <div className="relative max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20">
            <BarChart2 size={22} className="text-neon-cyan" />
          </div>
          <div>
            <h1 className="font-mono text-2xl font-bold text-gray-100">Platform Analytics</h1>
            <p className="font-mono text-sm text-gray-500">Live data from localStorage · On-chain indexer coming soon</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {STAT_CARDS.map((s) => (
            <NeonCard key={s.label} glow={s.glow} className="p-4">
              <div className="flex items-start gap-3">
                <s.icon size={20} className={`${s.color} mt-0.5 shrink-0`} />
                <div>
                  <p className="font-mono text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className={`font-mono text-xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              </div>
            </NeonCard>
          ))}
        </div>

        {totalINFTs === 0 ? (
          <NeonCard glow="purple" className="p-12 text-center">
            <BarChart2 size={40} className="mx-auto mb-4 text-gray-700" />
            <p className="font-mono text-gray-400 text-lg mb-2">No data yet</p>
            <p className="font-mono text-gray-600 text-sm">
              Stats will populate as users mint INFTs, list on the marketplace, and complete hires.
            </p>
          </NeonCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Tier breakdown */}
            <NeonCard glow="purple" className="p-5">
              <h2 className="font-mono text-sm font-semibold text-gray-300 mb-4">Tier Breakdown</h2>
              <div className="space-y-3">
                {TIER_ROWS.map(({ label, count, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs font-mono text-gray-500 mb-1">
                      <span style={{ color }}>{label}</span>
                      <span>{count} ({totalINFTs > 0 ? ((count / totalINFTs) * 100).toFixed(0) : 0}%)</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${totalINFTs > 0 ? (count / totalINFTs) * 100 : 0}%`, background: color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </NeonCard>

            {/* Skill breakdown */}
            <NeonCard glow="cyan" className="p-5">
              <h2 className="font-mono text-sm font-semibold text-gray-300 mb-4">Skill Distribution</h2>
              {SKILL_ROWS.length === 0 ? (
                <p className="font-mono text-gray-600 text-sm">No skills data yet</p>
              ) : (
                <div className="space-y-3">
                  {SKILL_ROWS.map(({ skill, count }) => (
                    <div key={skill}>
                      <div className="flex justify-between text-xs font-mono text-gray-500 mb-1">
                        <span className="capitalize">{skill}</span>
                        <span>{count}</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-neon-cyan transition-all duration-700"
                          style={{ width: `${(count / totalINFTs) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </NeonCard>

            {/* Top INFTs by score */}
            <NeonCard glow="none" className="p-5 lg:col-span-2">
              <h2 className="font-mono text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <Award size={16} className="text-neon-purple" />
                Top Verified Portfolios
              </h2>
              {topINFTs.length === 0 ? (
                <p className="font-mono text-gray-600 text-sm">No INFTs yet</p>
              ) : (
                <table className="w-full font-mono text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-white/5">
                      <th className="text-left py-2 pr-4">Rank</th>
                      <th className="text-left py-2 pr-4">Owner</th>
                      <th className="text-left py-2 pr-4">Score</th>
                      <th className="text-left py-2 pr-4">Skill</th>
                      <th className="text-left py-2">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topINFTs.map((inft, i) => (
                      <tr key={inft.tokenId} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                        <td className="py-2.5 pr-4">
                          <span className={`font-bold ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                            #{i + 1}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-gray-300">
                          {inft.owner.slice(0, 8)}…{inft.owner.slice(-6)}
                        </td>
                        <td className="py-2.5 pr-4 text-neon-cyan">{inft.score}</td>
                        <td className="py-2.5 pr-4 text-gray-400 capitalize">{inft.skillCategory}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-xs border capitalize ${
                            inft.tier === 'diamond' ? 'text-white border-white/30 bg-white/5' :
                            inft.tier === 'gold'    ? 'text-amber-400 border-amber-400/30 bg-amber-400/10' :
                            'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10'
                          }`}>{inft.tier}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </NeonCard>
          </div>
        )}
      </div>
    </div>
  );
}
