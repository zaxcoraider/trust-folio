'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, Plus, BarChart2, Users, Zap } from 'lucide-react';
import { useAccount } from 'wagmi';
import { NeonCard } from '@/components/NeonCard';
import { ProposalCard } from '@/components/ProposalCard';
import { getProposals } from '@/lib/governance-store';
import { getTrustState } from '@/lib/trust-store';
import type { Proposal } from '@/lib/types';

export default function GovernancePage() {
  const { address, isConnected } = useAccount();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'all'>('active');
  const [votingPower, setVotingPower] = useState(0);

  useEffect(() => {
    setProposals(getProposals());
    if (address) {
      const state = getTrustState(address);
      setVotingPower(state.staked + state.balance);
    }
  }, [address]);

  const activeProposals = proposals.filter((p) => p.status === 'active');
  const displayedProposals = activeTab === 'active' ? activeProposals : proposals;

  const totalVotes = proposals.reduce(
    (acc, p) => acc + p.votesFor + p.votesAgainst + p.votesAbstain,
    0
  );
  const avgQuorumPct =
    proposals.length > 0
      ? proposals.reduce((acc, p) => {
          const total = p.votesFor + p.votesAgainst + p.votesAbstain;
          return acc + Math.min(100, (total / p.quorum) * 100);
        }, 0) / proposals.length
      : 0;

  const canCreateProposal = votingPower >= 1000;

  return (
    <div className="relative min-h-screen bg-bg-primary px-4 py-10 page-enter">
      <div className="fixed inset-0 bg-grid opacity-100 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-neon-purple/10 border border-neon-purple/20">
                <Shield size={22} className="text-neon-purple" />
              </div>
              <h1 className="font-mono text-2xl font-bold text-gray-100">DAO Governance</h1>
            </div>
            <p className="font-mono text-sm text-gray-500">
              Vote on protocol changes using your TRUST tokens. Shape the future of TrustFolio.
            </p>
          </div>
          <div>
            {isConnected ? (
              <Link
                href="/governance/create"
                className={`inline-flex items-center gap-2 font-mono text-sm px-4 py-2.5 rounded-lg border transition-all duration-200
                  ${canCreateProposal
                    ? 'text-neon-purple border-neon-purple/40 bg-neon-purple/10 hover:bg-neon-purple/20 hover:border-neon-purple/60'
                    : 'text-gray-500 border-gray-500/30 bg-gray-500/5 cursor-not-allowed pointer-events-none'
                  }`}
              >
                <Plus size={16} />
                Create Proposal
              </Link>
            ) : (
              <span className="font-mono text-xs text-gray-500 border border-gray-700/50 px-3 py-2 rounded-lg">
                Connect wallet to vote
              </span>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <NeonCard glow="purple" className="p-4">
            <div className="flex items-center gap-3">
              <BarChart2 size={20} className="text-neon-purple" />
              <div>
                <p className="font-mono text-xs text-gray-500">Total Proposals</p>
                <p className="font-mono text-xl font-bold text-neon-purple">{proposals.length}</p>
              </div>
            </div>
          </NeonCard>
          <NeonCard glow="cyan" className="p-4">
            <div className="flex items-center gap-3">
              <Zap size={20} className="text-neon-cyan" />
              <div>
                <p className="font-mono text-xs text-gray-500">Your Voting Power</p>
                <p className="font-mono text-xl font-bold text-neon-cyan">
                  {isConnected ? votingPower.toFixed(0) : '--'} TRUST
                </p>
              </div>
            </div>
          </NeonCard>
          <NeonCard glow="pink" className="p-4">
            <div className="flex items-center gap-3">
              <Users size={20} className="text-neon-pink" />
              <div>
                <p className="font-mono text-xs text-gray-500">Avg Quorum</p>
                <p className="font-mono text-xl font-bold text-neon-pink">
                  {avgQuorumPct.toFixed(1)}%
                </p>
              </div>
            </div>
          </NeonCard>
        </div>

        {/* Not connected notice */}
        {!isConnected && (
          <NeonCard glow="purple" className="p-4 mb-6 border-neon-purple/30 bg-neon-purple/5">
            <p className="font-mono text-sm text-neon-purple text-center">
              Connect your wallet to cast votes and create proposals.
            </p>
          </NeonCard>
        )}

        {/* Create proposal requirement */}
        {isConnected && !canCreateProposal && (
          <NeonCard glow="none" className="p-4 mb-6 border-amber-500/20 bg-amber-500/5">
            <p className="font-mono text-sm text-amber-400">
              You need at least 1,000 TRUST tokens to create a proposal. You currently have{' '}
              <span className="text-neon-cyan">{votingPower.toFixed(0)} TRUST</span>.{' '}
              <Link href="/stake" className="text-neon-purple hover:underline">Stake to earn more →</Link>
            </p>
          </NeonCard>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-white/10">
          {(['active', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`font-mono text-sm px-4 py-2 -mb-px border-b-2 transition-all duration-200
                ${activeTab === tab
                  ? 'text-neon-purple border-neon-purple'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}
            >
              {tab === 'active' ? `Active (${activeProposals.length})` : `All (${proposals.length})`}
            </button>
          ))}
        </div>

        {/* Proposals */}
        {displayedProposals.length === 0 ? (
          <NeonCard glow="none" className="p-12 text-center">
            <Shield size={40} className="text-gray-600 mx-auto mb-3" />
            <p className="font-mono text-gray-500">No proposals found.</p>
          </NeonCard>
        ) : (
          <div className="grid gap-4">
            {displayedProposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                userAddress={address}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
