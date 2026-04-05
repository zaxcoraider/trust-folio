'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Zap, TrendingUp, Lock, Gift, AlertCircle, CheckCircle2, Info, ExternalLink } from 'lucide-react';
import { useAccount } from 'wagmi';
import { NeonCard } from '@/components/NeonCard';
import { TxStatus } from '@/components/TxStatus';
import { useTxFlow } from '@/hooks/useTxFlow';
import { useNetwork } from '@/lib/network-context';

type StakeTab = 'stake' | 'unstake' | 'rewards';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

const STAKING_ABI = [
  'function stake(uint256 amount)',
  'function unstake(uint256 amount)',
  'function claimRewards()',
  'function stakedBalanceOf(address) view returns (uint256)',
  'function pendingRewards(address) view returns (uint256)',
  'function totalStaked() view returns (uint256)',
  'function apy() view returns (uint256)',
];

const BOOST_TIERS = [
  { tier: 'none',    label: 'No Boost', min: 0,     color: 'text-gray-500',  border: 'border-gray-700/50',  bg: 'bg-gray-700/10' },
  { tier: 'bronze',  label: 'Bronze',   min: 100,   color: 'text-amber-600', border: 'border-amber-600/30', bg: 'bg-amber-600/10' },
  { tier: 'silver',  label: 'Silver',   min: 500,   color: 'text-neon-cyan', border: 'border-neon-cyan/30',  bg: 'bg-neon-cyan/10' },
  { tier: 'gold',    label: 'Gold',     min: 2000,  color: 'text-amber-400', border: 'border-amber-400/30', bg: 'bg-amber-400/10' },
  { tier: 'diamond', label: 'Diamond',  min: 10000, color: 'text-white',     border: 'border-white/30',     bg: 'bg-white/5' },
];

const BOOST_PERKS: Record<string, string[]> = {
  none:    ['Basic platform access', 'Standard verification speed'],
  bronze:  ['2x marketplace visibility', 'Priority verification queue', 'Early access to new features'],
  silver:  ['5x marketplace visibility', 'Premium AI verification', 'Governance voting rights', 'Reduced fees (0.1%)'],
  gold:    ['10x marketplace visibility', 'Ultra-fast AI processing', 'Full governance rights', 'Zero fees', 'Featured profile badge'],
  diamond: ['Maximum visibility boost', 'Dedicated AI pipeline', 'Protocol revenue share', 'Council voting seat', 'VIP support'],
};

function getBoostTier(staked: number): string {
  if (staked >= 10000) return 'diamond';
  if (staked >= 2000)  return 'gold';
  if (staked >= 500)   return 'silver';
  if (staked >= 100)   return 'bronze';
  return 'none';
}

function fmt(val: bigint, decimals = 18, places = 2): string {
  const s = ethers.formatUnits(val, decimals);
  return parseFloat(s).toLocaleString(undefined, { maximumFractionDigits: places, minimumFractionDigits: places });
}

export default function StakePage() {
  const { address, isConnected } = useAccount();
  const { networkConfig } = useNetwork();
  const { state, execute, reset } = useTxFlow();

  const [activeTab, setActiveTab] = useState<StakeTab>('stake');
  const [amount,    setAmount]    = useState('');

  // On-chain data
  const [tokenBalance,    setTokenBalance]    = useState<bigint>(0n);
  const [stakedBalance,   setStakedBalance]   = useState<bigint>(0n);
  const [pendingRewards,  setPendingRewards]  = useState<bigint>(0n);
  const [totalStaked,     setTotalStaked]     = useState<bigint>(0n);
  const [apyBps,          setApyBps]          = useState<bigint>(800n); // default 8%
  const [loadingData,     setLoadingData]     = useState(false);

  const tokenAddress   = networkConfig.contracts.token;
  const stakingAddress = networkConfig.contracts.staking;

  const fetchBalances = useCallback(async () => {
    if (!address || !tokenAddress || !stakingAddress) return;
    setLoadingData(true);
    try {
      const provider = new ethers.JsonRpcProvider(networkConfig.rpc);
      const token    = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const staking  = new ethers.Contract(stakingAddress, STAKING_ABI, provider);

      const [bal, staked, rewards, total] = await Promise.all([
        token.balanceOf(address).catch(() => 0n),
        staking.stakedBalanceOf(address).catch(() => 0n),
        staking.pendingRewards(address).catch(() => 0n),
        staking.totalStaked().catch(() => 0n),
      ]);

      setTokenBalance(bal);
      setStakedBalance(staked);
      setPendingRewards(rewards);
      setTotalStaked(total);

      try {
        const apy = await staking.apy();
        setApyBps(apy);
      } catch { /* contract may not expose apy() */ }
    } catch {
      // silently fail — contracts not deployed yet
    } finally {
      setLoadingData(false);
    }
  }, [address, tokenAddress, stakingAddress, networkConfig.rpc]);

  useEffect(() => {
    fetchBalances();
    const id = setInterval(fetchBalances, 30_000);
    return () => clearInterval(id);
  }, [fetchBalances]);

  // Refresh after successful tx
  useEffect(() => {
    if (state.status === 'confirmed') {
      fetchBalances();
      setAmount('');
    }
  }, [state.status, fetchBalances]);

  const handleStake = () => {
    if (!amount || !stakingAddress || !tokenAddress) return;
    const amtWei = ethers.parseEther(amount);

    execute({
      type:        'stake',
      description: `Stake ${amount} TRUST`,
      fn: async (signer) => {
        const token   = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
        const staking = new ethers.Contract(stakingAddress, STAKING_ABI, signer);

        // Check existing allowance
        const allowance: bigint = await token.allowance(await signer.getAddress(), stakingAddress);
        if (allowance < amtWei) {
          // Approval tx — wait inline, then proceed to stake
          const approveTx = await token.approve(stakingAddress, amtWei);
          await approveTx.wait();
        }

        return staking.stake(amtWei);
      },
    });
  };

  const handleUnstake = () => {
    if (!amount || !stakingAddress) return;
    const amtWei = ethers.parseEther(amount);

    execute({
      type:        'unstake',
      description: `Unstake ${amount} TRUST`,
      fn: async (signer) => {
        const staking = new ethers.Contract(stakingAddress, STAKING_ABI, signer);
        return staking.unstake(amtWei);
      },
    });
  };

  const handleClaimRewards = () => {
    if (!stakingAddress) return;

    execute({
      type:        'claim_rewards',
      description: 'Claim TRUST staking rewards',
      fn: async (signer) => {
        const staking = new ethers.Contract(stakingAddress, STAKING_ABI, signer);
        return staking.claimRewards();
      },
    });
  };

  const stakedNum   = parseFloat(ethers.formatEther(stakedBalance));
  const boostTier   = getBoostTier(stakedNum);
  const tierConfig  = BOOST_TIERS.find((t) => t.tier === boostTier) ?? BOOST_TIERS[0];
  const gaugePct    = Math.min(100, (stakedNum / Math.max(stakedNum + 1000, 10000)) * 100);
  const apyPct      = Number(apyBps) / 100;

  const isProcessing = state.status === 'wallet_pending' || state.status === 'tx_pending';
  const contractsReady = !!tokenAddress && !!stakingAddress;

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
              Earn {apyPct}% APY and unlock platform boosts by staking TRUST tokens
            </p>
          </div>
        </div>

        {/* Token Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {[
            { label: 'Total Staked',     value: isConnected ? fmt(totalStaked) : '--',     unit: 'TRUST', glow: 'text-neon-purple' },
            { label: 'Staking APY',      value: `${apyPct}%`,                              unit: '',      glow: 'text-neon-cyan' },
            { label: 'Your Balance',     value: isConnected ? fmt(tokenBalance) : '--',    unit: 'TRUST', glow: 'text-gray-200' },
            { label: 'Your Staked',      value: isConnected ? fmt(stakedBalance) : '--',   unit: 'TRUST', glow: 'text-neon-purple' },
            { label: 'Pending Rewards',  value: isConnected ? fmt(pendingRewards, 18, 6) : '--', unit: 'TRUST', glow: 'text-amber-400' },
          ].map((s) => (
            <NeonCard key={s.label} glow="none" className="p-3 text-center">
              <p className="font-mono text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`font-mono text-sm font-bold ${s.glow}`}>{s.value}</p>
              {s.unit && <p className="font-mono text-xs text-gray-600">{s.unit}</p>}
            </NeonCard>
          ))}
        </div>

        {!contractsReady && (
          <div className="mb-6 p-4 rounded-xl border border-amber-400/30 bg-amber-400/5 font-mono text-xs text-amber-400/70 text-center">
            TRUST token or staking contract not configured — set NEXT_PUBLIC_TESTNET_TOKEN_ADDRESS and NEXT_PUBLIC_TESTNET_STAKING_ADDRESS in .env
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main staking card */}
          <div className="space-y-6">
            <NeonCard glow="purple" className="p-6">
              {/* Gauge */}
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <svg width="160" height="160" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(168,85,247,0.1)" strokeWidth="12" />
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
                      {isConnected ? stakedNum.toFixed(0) : '0'}
                    </p>
                    <p className="font-mono text-xs text-gray-600">TRUST</p>
                  </div>
                </div>
              </div>

              {/* Boost tier badge */}
              <div className={`flex items-center justify-center gap-2 mb-5 p-2 rounded-lg border ${tierConfig.bg} ${tierConfig.border}`}>
                <Zap size={14} className={tierConfig.color} />
                <span className={`font-mono text-sm font-semibold ${tierConfig.color}`}>
                  {tierConfig.label} Boost
                </span>
                {tierConfig.min > 0 && (
                  <span className="font-mono text-xs text-gray-500">
                    ({tierConfig.min.toLocaleString()} TRUST min)
                  </span>
                )}
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-5 border-b border-white/10">
                {(['stake', 'unstake', 'rewards'] as StakeTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); reset(); setAmount(''); }}
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
                  <TxStatus state={state} />

                  {state.status === 'confirmed' && (
                    <div className="text-center space-y-2">
                      <CheckCircle2 size={28} className="mx-auto text-emerald-400" />
                      <p className="font-mono text-sm text-emerald-400 font-bold">
                        {activeTab === 'stake' ? 'Staked successfully!' :
                         activeTab === 'unstake' ? 'Unstaked successfully!' :
                         'Rewards claimed!'}
                      </p>
                      {state.explorerUrl && (
                        <a href={state.explorerUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs text-emerald-400/70 hover:text-emerald-400">
                          <ExternalLink size={10} />
                          View on Explorer
                        </a>
                      )}
                    </div>
                  )}

                  {activeTab === 'rewards' ? (
                    <div className="space-y-3">
                      <div className="p-4 rounded-lg bg-amber-400/5 border border-amber-400/20 text-center">
                        <p className="font-mono text-xs text-gray-500 mb-1">Pending Rewards</p>
                        <p className="font-mono text-2xl font-bold text-amber-400">
                          {fmt(pendingRewards, 18, 6)}
                        </p>
                        <p className="font-mono text-xs text-gray-600">TRUST</p>
                      </div>
                      <div className="p-3 rounded-lg bg-neon-cyan/5 border border-neon-cyan/20">
                        <div className="flex items-start gap-2">
                          <Info size={13} className="text-neon-cyan mt-0.5 shrink-0" />
                          <p className="font-mono text-xs text-gray-400">
                            Rewards accrue at {apyPct}% APY on your staked amount.
                            Source: 2.5% marketplace fees redistributed to stakers.
                          </p>
                        </div>
                      </div>
                      {state.status !== 'confirmed' && (
                        <button
                          onClick={handleClaimRewards}
                          disabled={isProcessing || !contractsReady || pendingRewards === 0n}
                          className="w-full font-mono text-sm py-3 rounded-lg border border-amber-400/40 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          <Gift size={16} />
                          {isProcessing ? 'Processing…' : 'Claim Rewards'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {state.status !== 'confirmed' && (
                        <>
                          <div>
                            <div className="flex justify-between text-xs font-mono text-gray-500 mb-1.5">
                              <span>Amount (TRUST)</span>
                              <button
                                onClick={() => setAmount(ethers.formatEther(
                                  activeTab === 'stake' ? tokenBalance : stakedBalance
                                ))}
                                className="text-neon-purple hover:underline"
                              >
                                Max: {fmt(activeTab === 'stake' ? tokenBalance : stakedBalance)}
                              </button>
                            </div>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              placeholder="0"
                              disabled={isProcessing}
                              className="w-full bg-bg-primary border border-white/10 rounded-lg px-4 py-2.5 font-mono text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-neon-purple/50 transition-colors disabled:opacity-50"
                            />
                          </div>

                          {activeTab === 'stake' && (
                            <p className="font-mono text-[11px] text-gray-500 flex items-start gap-1">
                              <Info size={11} className="mt-0.5 shrink-0" />
                              Two wallet approvals required: first to approve TRUST spend, then to stake.
                            </p>
                          )}

                          <button
                            onClick={activeTab === 'stake' ? handleStake : handleUnstake}
                            disabled={isProcessing || !amount || parseFloat(amount) <= 0 || !contractsReady}
                            className="w-full font-mono text-sm py-3 rounded-lg border border-neon-purple/40 bg-neon-purple/10 text-neon-purple hover:bg-neon-purple/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                          >
                            {isProcessing ? (
                              <div className="w-4 h-4 border-2 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
                            ) : activeTab === 'stake' ? (
                              <><Zap size={16} /> Stake TRUST</>
                            ) : (
                              <><Lock size={16} /> Unstake TRUST</>
                            )}
                          </button>

                          <p className="font-mono text-xs text-gray-500 text-center flex items-center justify-center gap-1">
                            <Info size={11} />
                            No lock period — unstake anytime. APY: {apyPct}%
                          </p>
                        </>
                      )}

                      {state.status === 'error' && (
                        <button onClick={reset}
                          className="w-full py-1.5 font-mono text-xs text-gray-500 hover:text-gray-300 transition-colors">
                          ← Try again
                        </button>
                      )}
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
                  <p className="font-mono text-sm font-semibold text-neon-cyan mb-1">{apyPct}% Annual APY</p>
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

            <NeonCard glow="none" className="p-6">
              <h2 className="font-mono text-sm font-semibold text-gray-300 mb-4">
                {tierConfig.label} Perks
              </h2>
              <ul className="space-y-2">
                {BOOST_PERKS[boostTier]?.map((perk, i) => (
                  <li key={i} className="flex items-center gap-2 font-mono text-xs text-gray-400">
                    <CheckCircle2 size={13} className={tierConfig.color} />
                    {perk}
                  </li>
                ))}
              </ul>

              {boostTier !== 'diamond' && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  {(() => {
                    const idx  = BOOST_TIERS.findIndex((t) => t.tier === boostTier);
                    const next = BOOST_TIERS[idx + 1];
                    return next ? (
                      <p className="font-mono text-xs text-gray-500">
                        Next tier:{' '}
                        <span className={next.color}>{next.label}</span>
                        {' '}at{' '}
                        <span className="text-neon-cyan">{next.min.toLocaleString()} TRUST</span>
                      </p>
                    ) : null;
                  })()}
                </div>
              )}
            </NeonCard>

            <NeonCard glow="none" className="p-4">
              <h2 className="font-mono text-xs font-semibold text-gray-500 mb-3">Network Staking Stats</h2>
              <div className="space-y-2">
                {[
                  { label: 'Total Staked', value: `${fmt(totalStaked)} TRUST` },
                  { label: 'Staking APY',  value: `${apyPct}%` },
                  { label: 'APY Source',   value: '2.5% marketplace fees' },
                  { label: 'Network',      value: networkConfig.name },
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
