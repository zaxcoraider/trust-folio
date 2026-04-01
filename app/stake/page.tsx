'use client';

import { useState, useEffect, useCallback } from 'react';
import { Zap, TrendingUp, Lock, Gift, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useAccount } from 'wagmi';
import { NeonCard } from '@/components/NeonCard';
import {
  getTrustState,
  stakeTrust,
  unstakeTrust,
  claimRewards,
  accrueDailyRewards,
  getTrustTokenStats,
  getBoostTier,
} from '@/lib/trust-store';

type StakeTab = 'stake' | 'unstake' | 'rewards';

const BOOST_TIERS = [
  { tier: 'none', label: 'No Boost', min: 0, color: 'text-gray-500', border: 'border-gray-700/50', bg: 'bg-gray-700/10' },
  { tier: 'bronze', label: 'Bronze', min: 100, color: 'text-amber-600', border: 'border-amber-600/30', bg: 'bg-amber-600/10' },
  { tier: 'silver', label: 'Silver', min: 500, color: 'text-neon-cyan', border: 'border-neon-cyan/30', bg: 'bg-neon-cyan/10' },
  { tier: 'gold', label: 'Gold', min: 2000, color: 'text-amber-400', border: 'border-amber-400/30', bg: 'bg-amber-400/10' },
  { tier: 'diamond', label: 'Diamond', min: 10000, color: 'text-white', border: 'border-white/30', bg: 'bg-white/5' },
];

const BOOST_PERKS: Record<string, string[]> = {
  none: ['Basic platform access', 'Standard verification speed'],
  bronze: ['2x marketplace visibility', 'Priority verification queue', 'Early access to new features'],
  silver: ['5x marketplace visibility', 'Premium AI verification', 'Governance voting rights', 'Reduced fees (0.1%)'],
  gold: ['10x marketplace visibility', 'Ultra-fast AI processing', 'Full governance rights', 'Zero fees', 'Featured profile badge'],
  diamond: ['Maximum visibility boost', 'Dedicated AI pipeline', 'Protocol revenue share', 'Council voting seat', 'VIP support'],
};

export default function StakePage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<StakeTab>('stake');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [stats, setStats] = useState({
    totalStaked: '12,450,000',
    stakingAPY: 8,
    yourBalance: '0.00',
    yourStaked: '0.00',
    yourPendingRewards: '0.000000',
    totalSupply: '100,000,000',
    circulatingSupply: '87,550,000',
  });
  const [boostTier, setBoostTier] = useState<string>('none');
  const [staked, setStaked] = useState(0);

  const refresh = useCallback(() => {
    if (!address) return;
    accrueDailyRewards(address);
    const tokenStats = getTrustTokenStats(address);
    setStats(tokenStats);
    setBoostTier(getBoostTier(address));
    const state = getTrustState(address);
    setStaked(state.staked);
  }, [address]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleAction = async () => {
    if (!address || !amount) return;
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (activeTab === 'stake') {
        stakeTrust(address, amtNum);
        setSuccess(`Successfully staked ${amtNum} TRUST`);
      } else if (activeTab === 'unstake') {
        unstakeTrust(address, amtNum);
        setSuccess(`Successfully unstaked ${amtNum} TRUST`);
      }
      setAmount('');
      refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const claimed = claimRewards(address);
      if (claimed > 0) {
        setSuccess(`Claimed ${claimed.toFixed(6)} TRUST rewards`);
      } else {
        setError('No rewards to claim yet');
      }
      refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Claim failed');
    } finally {
      setLoading(false);
    }
  };

  const currentTierConfig = BOOST_TIERS.find((t) => t.tier === boostTier) ?? BOOST_TIERS[0];
  const maxStaked = 12450000;
  const stakedNum = parseFloat(stats.yourStaked) || 0;
  const gaugePct = Math.min(100, (stakedNum / Math.max(stakedNum + 1000, 10000)) * 100);

  return (
    <div className="relative min-h-screen bg-bg-primary px-4 py-10 page-enter">
      <div className="fixed inset-0 bg-grid opacity-100 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-neon-purple/10 border border-neon-purple/20">
            <Zap size={22} className="text-neon-purple" />
          </div>
          <div>
            <h1 className="font-mono text-2xl font-bold text-gray-100">Stake TRUST</h1>
            <p className="font-mono text-sm text-gray-500">
              Earn 8% APY and unlock platform boosts by staking TRUST tokens
            </p>
          </div>
        </div>

        {/* Token Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {[
            { label: 'Total Staked', value: stats.totalStaked, unit: 'TRUST', glow: 'text-neon-purple' },
            { label: 'Staking APY', value: `${stats.stakingAPY}%`, unit: '', glow: 'text-neon-cyan' },
            { label: 'Your Balance', value: stats.yourBalance, unit: 'TRUST', glow: 'text-gray-200' },
            { label: 'Your Staked', value: stats.yourStaked, unit: 'TRUST', glow: 'text-neon-purple' },
            { label: 'Pending Rewards', value: stats.yourPendingRewards, unit: 'TRUST', glow: 'text-amber-400' },
          ].map((s) => (
            <NeonCard key={s.label} glow="none" className="p-3 text-center">
              <p className="font-mono text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`font-mono text-sm font-bold ${s.glow}`}>
                {isConnected ? s.value : (s.label.startsWith('Your') || s.label === 'Pending' ? '--' : s.value)}
              </p>
              {s.unit && <p className="font-mono text-xs text-gray-600">{s.unit}</p>}
            </NeonCard>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main staking card */}
          <div className="space-y-6">
            <NeonCard glow="purple" className="p-6">
              {/* Gauge */}
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <svg width="160" height="160" viewBox="0 0 160 160">
                    {/* Background ring */}
                    <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(168,85,247,0.1)" strokeWidth="12" />
                    {/* Progress ring */}
                    <circle
                      cx="80" cy="80" r="68"
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 68}`}
                      strokeDashoffset={`${2 * Math.PI * 68 * (1 - gaugePct / 100)}`}
                      transform="rotate(-90 80 80)"
                      style={{ filter: 'drop-shadow(0 0 6px rgba(168,85,247,0.8))', transition: 'stroke-dashoffset 1s ease' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="font-mono text-xs text-gray-500">Staked</p>
                    <p className="font-mono text-lg font-bold text-neon-purple">
                      {isConnected ? parseFloat(stats.yourStaked).toFixed(0) : '0'}
                    </p>
                    <p className="font-mono text-xs text-gray-600">TRUST</p>
                  </div>
                </div>
              </div>

              {/* Boost Tier badge */}
              <div className={`flex items-center justify-center gap-2 mb-5 p-2 rounded-lg border ${currentTierConfig.bg} ${currentTierConfig.border}`}>
                <Zap size={14} className={currentTierConfig.color} />
                <span className={`font-mono text-sm font-semibold ${currentTierConfig.color}`}>
                  {currentTierConfig.label} Boost
                </span>
                {currentTierConfig.min > 0 && (
                  <span className="font-mono text-xs text-gray-500">
                    ({currentTierConfig.min.toLocaleString()} TRUST min)
                  </span>
                )}
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-5 border-b border-white/10">
                {(['stake', 'unstake', 'rewards'] as StakeTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setError(null); setSuccess(null); setAmount(''); }}
                    className={`font-mono text-xs px-3 py-2 -mb-px border-b-2 capitalize transition-all duration-200
                      ${activeTab === tab
                        ? 'text-neon-purple border-neon-purple'
                        : 'text-gray-500 border-transparent hover:text-gray-300'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {!isConnected ? (
                <div className="text-center py-6">
                  <AlertCircle size={32} className="text-gray-600 mx-auto mb-2" />
                  <p className="font-mono text-sm text-gray-500">Connect wallet to stake</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-neon-pink/10 border border-neon-pink/30 flex items-center gap-2">
                      <AlertCircle size={14} className="text-neon-pink" />
                      <p className="font-mono text-xs text-neon-pink">{error}</p>
                    </div>
                  )}
                  {success && (
                    <div className="p-3 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-neon-cyan" />
                      <p className="font-mono text-xs text-neon-cyan">{success}</p>
                    </div>
                  )}

                  {activeTab === 'rewards' ? (
                    <div className="space-y-3">
                      <div className="p-4 rounded-lg bg-amber-400/5 border border-amber-400/20 text-center">
                        <p className="font-mono text-xs text-gray-500 mb-1">Pending Rewards</p>
                        <p className="font-mono text-2xl font-bold text-amber-400">
                          {stats.yourPendingRewards}
                        </p>
                        <p className="font-mono text-xs text-gray-600">TRUST</p>
                      </div>
                      <div className="p-3 rounded-lg bg-neon-cyan/5 border border-neon-cyan/20">
                        <div className="flex items-start gap-2">
                          <Info size={13} className="text-neon-cyan mt-0.5 shrink-0" />
                          <p className="font-mono text-xs text-gray-400">
                            Rewards accrue at 8% APY on your staked amount.
                            Source: 2.5% marketplace fees redistributed to stakers.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleClaimRewards}
                        disabled={loading || parseFloat(stats.yourPendingRewards) <= 0}
                        className="w-full font-mono text-sm py-3 rounded-lg border border-amber-400/40 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                        ) : (
                          <Gift size={16} />
                        )}
                        Claim Rewards
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex justify-between text-xs font-mono text-gray-500 mb-1.5">
                          <span>Amount (TRUST)</span>
                          <button
                            onClick={() => setAmount(activeTab === 'stake' ? stats.yourBalance : stats.yourStaked)}
                            className="text-neon-purple hover:underline"
                          >
                            Max: {activeTab === 'stake' ? stats.yourBalance : stats.yourStaked}
                          </button>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0"
                          className="w-full bg-bg-primary border border-white/10 rounded-lg px-4 py-2.5 font-mono text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-neon-purple/50 transition-colors"
                        />
                      </div>

                      <button
                        onClick={handleAction}
                        disabled={loading || !amount || parseFloat(amount) <= 0}
                        className="w-full font-mono text-sm py-3 rounded-lg border border-neon-purple/40 bg-neon-purple/10 text-neon-purple hover:bg-neon-purple/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <div className="w-4 h-4 border-2 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
                        ) : activeTab === 'stake' ? (
                          <><Zap size={16} /> Stake TRUST</>
                        ) : (
                          <><Lock size={16} /> Unstake TRUST</>
                        )}
                      </button>

                      <p className="font-mono text-xs text-gray-500 text-center flex items-center justify-center gap-1">
                        <Info size={11} />
                        No lock period — unstake anytime. APY: 8%
                      </p>
                    </>
                  )}
                </div>
              )}
            </NeonCard>

            {/* APY info */}
            <NeonCard glow="cyan" className="p-4">
              <div className="flex items-start gap-3">
                <TrendingUp size={18} className="text-neon-cyan mt-0.5 shrink-0" />
                <div>
                  <p className="font-mono text-sm font-semibold text-neon-cyan mb-1">8% Annual APY</p>
                  <p className="font-mono text-xs text-gray-400">
                    Funded by 2.5% marketplace transaction fees redistributed to all active stakers.
                    Rewards accrue continuously and can be claimed at any time.
                    No minimum lock period.
                  </p>
                </div>
              </div>
            </NeonCard>
          </div>

          {/* Right: Boost tiers + perks */}
          <div className="space-y-6">
            {/* Boost tiers */}
            <NeonCard glow="none" className="p-6">
              <h2 className="font-mono text-sm font-semibold text-gray-300 mb-4">Boost Tier Thresholds</h2>
              <div className="space-y-2">
                {BOOST_TIERS.map((t) => (
                  <div
                    key={t.tier}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all
                      ${boostTier === t.tier ? `${t.bg} ${t.border} ring-1 ${t.border}` : 'border-white/5 bg-white/2'}`}
                  >
                    <div className="flex items-center gap-2">
                      <Zap size={14} className={t.color} />
                      <span className={`font-mono text-sm font-semibold ${t.color}`}>{t.label}</span>
                      {boostTier === t.tier && (
                        <span className={`font-mono text-xs ${t.color} opacity-70`}>← current</span>
                      )}
                    </div>
                    <span className="font-mono text-xs text-gray-500">
                      {t.min === 0 ? 'No stake' : `${t.min.toLocaleString()}+ TRUST`}
                    </span>
                  </div>
                ))}
              </div>
            </NeonCard>

            {/* Boost perks */}
            <NeonCard glow="none" className="p-6">
              <h2 className="font-mono text-sm font-semibold text-gray-300 mb-4">
                {currentTierConfig.label} Perks
              </h2>
              <ul className="space-y-2">
                {BOOST_PERKS[boostTier]?.map((perk, i) => (
                  <li key={i} className="flex items-center gap-2 font-mono text-xs text-gray-400">
                    <CheckCircle2 size={13} className={currentTierConfig.color} />
                    {perk}
                  </li>
                ))}
              </ul>

              {boostTier !== 'diamond' && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="font-mono text-xs text-gray-500">
                    Next tier:{' '}
                    <span className={BOOST_TIERS[(BOOST_TIERS.findIndex(t => t.tier === boostTier) + 1)]?.color}>
                      {BOOST_TIERS[(BOOST_TIERS.findIndex(t => t.tier === boostTier) + 1)]?.label}
                    </span>
                    {' '}at{' '}
                    <span className="text-neon-cyan">
                      {BOOST_TIERS[(BOOST_TIERS.findIndex(t => t.tier === boostTier) + 1)]?.min.toLocaleString()} TRUST
                    </span>
                  </p>
                </div>
              )}
            </NeonCard>

            {/* Network stats */}
            <NeonCard glow="none" className="p-4">
              <h2 className="font-mono text-xs font-semibold text-gray-500 mb-3">Network Staking Stats</h2>
              <div className="space-y-2">
                {[
                  { label: 'Total Supply', value: `${stats.totalSupply} TRUST` },
                  { label: 'Total Staked', value: `${stats.totalStaked} TRUST` },
                  { label: 'Staking Ratio', value: `${((12450000 / 100000000) * 100).toFixed(1)}%` },
                  { label: 'APY Source', value: '2.5% marketplace fees' },
                ].map((s) => (
                  <div key={s.label} className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="font-mono text-xs text-gray-500">{s.label}</span>
                    <span className="font-mono text-xs text-gray-300">{s.value}</span>
                  </div>
                ))}
              </div>
            </NeonCard>
          </div>
        </div>
      </div>
    </div>
  );
}
