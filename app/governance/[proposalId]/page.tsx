'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Shield, Clock, Users, TrendingUp, TrendingDown, Minus,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { NeonCard } from '@/components/NeonCard';
import { getProposal, castVote, getUserVote } from '@/lib/governance-store';
import { getTrustState } from '@/lib/trust-store';
import type { Proposal, VoteChoice } from '@/lib/types';

const TYPE_COLORS: Record<string, string> = {
  FeeChange: 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10',
  VerificationFee: 'text-neon-purple border-neon-purple/30 bg-neon-purple/10',
  SkillCategory: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
  TreasurySpend: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
  ContractUpgrade: 'text-neon-pink border-neon-pink/30 bg-neon-pink/10',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10' },
  passed: { label: 'Passed', color: 'text-neon-purple border-neon-purple/30 bg-neon-purple/10' },
  failed: { label: 'Failed', color: 'text-neon-pink border-neon-pink/30 bg-neon-pink/10' },
  queued: { label: 'Queued', color: 'text-amber-400 border-amber-400/30 bg-amber-400/10' },
  executed: { label: 'Executed', color: 'text-gray-400 border-gray-400/30 bg-gray-400/10' },
  cancelled: { label: 'Cancelled', color: 'text-gray-500 border-gray-500/30 bg-gray-500/10' },
};

function timeRemaining(endTime: number): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const diff = endTime - nowSec;
  if (diff <= 0) return 'Voting ended';
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ProposalDetailPage() {
  const params = useParams();
  const proposalId = params?.proposalId as string;
  const { address, isConnected } = useAccount();

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [userVote, setUserVote] = useState<VoteChoice | null>(null);
  const [votingPower, setVotingPower] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadProposal = useCallback(() => {
    if (!proposalId) return;
    const p = getProposal(proposalId);
    setProposal(p);
    if (p && address) {
      const vote = getUserVote(p.id, address);
      setUserVote(vote);
      const state = getTrustState(address);
      setVotingPower(state.staked + state.balance);
    }
  }, [proposalId, address]);

  useEffect(() => {
    loadProposal();
  }, [loadProposal]);

  const handleVote = async (choice: VoteChoice) => {
    if (!proposal || !address) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      castVote(proposal.id, address, choice, Math.max(1, Math.floor(votingPower)));
      setSuccess(`You voted "${choice}" on this proposal.`);
      loadProposal();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cast vote');
    } finally {
      setLoading(false);
    }
  };

  if (!proposal) {
    return (
      <div className="relative min-h-screen bg-bg-primary px-4 py-10 page-enter">
        <div className="fixed inset-0 bg-grid opacity-100 pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center pt-24">
          <AlertCircle size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="font-mono text-gray-500">Proposal not found.</p>
          <Link href="/governance" className="font-mono text-neon-purple hover:underline text-sm mt-4 block">
            ← Back to Governance
          </Link>
        </div>
      </div>
    );
  }

  const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
  const forPct = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;
  const againstPct = totalVotes > 0 ? (proposal.votesAgainst / totalVotes) * 100 : 0;
  const abstainPct = totalVotes > 0 ? (proposal.votesAbstain / totalVotes) * 100 : 0;
  const quorumPct = Math.min(100, (totalVotes / proposal.quorum) * 100);

  const statusCfg = STATUS_CONFIG[proposal.status] ?? STATUS_CONFIG.active;
  const typeColor = TYPE_COLORS[proposal.type] ?? TYPE_COLORS.FeeChange;
  const isActive = proposal.status === 'active';
  const canVote = isConnected && isActive && !userVote;

  return (
    <div className="relative min-h-screen bg-bg-primary px-4 py-10 page-enter">
      <div className="fixed inset-0 bg-grid opacity-100 pointer-events-none" />

      <div className="relative max-w-3xl mx-auto">
        {/* Back */}
        <Link
          href="/governance"
          className="inline-flex items-center gap-2 font-mono text-sm text-gray-500 hover:text-neon-purple transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to Governance
        </Link>

        {/* Title card */}
        <NeonCard glow={isActive ? 'cyan' : 'none'} className="p-6 mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`font-mono text-xs px-2 py-0.5 rounded border ${typeColor}`}>
              {proposal.type}
            </span>
            <span className={`font-mono text-xs px-2 py-0.5 rounded border ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
            {userVote && (
              <span className="font-mono text-xs px-2 py-0.5 rounded border border-neon-purple/30 bg-neon-purple/10 text-neon-purple">
                You voted: {userVote}
              </span>
            )}
          </div>

          <h1 className="font-mono text-xl font-bold text-gray-100 mb-2">{proposal.title}</h1>

          <div className="flex flex-wrap gap-4 text-xs font-mono text-gray-500 mb-4">
            <span>Proposed by {truncateAddress(proposal.proposer)}</span>
            <span>ID #{proposal.proposalId}</span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {isActive ? timeRemaining(proposal.endTime) : `Ended ${formatDate(proposal.endTime)}`}
            </span>
          </div>

          <p className="font-mono text-sm text-gray-400 leading-relaxed whitespace-pre-line">
            {proposal.description}
          </p>
        </NeonCard>

        {/* Vote stats */}
        <NeonCard glow="purple" className="p-6 mb-6">
          <h2 className="font-mono text-sm font-semibold text-gray-300 mb-5 flex items-center gap-2">
            <Users size={16} className="text-neon-purple" />
            Voting Results
          </h2>

          {/* Big numbers */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 rounded-lg bg-neon-cyan/5 border border-neon-cyan/20">
              <p className="font-mono text-2xl font-bold text-neon-cyan">
                {proposal.votesFor.toLocaleString()}
              </p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingUp size={12} className="text-neon-cyan" />
                <p className="font-mono text-xs text-gray-500">For</p>
              </div>
              <p className="font-mono text-xs text-neon-cyan/70 mt-0.5">{forPct.toFixed(1)}%</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-neon-pink/5 border border-neon-pink/20">
              <p className="font-mono text-2xl font-bold text-neon-pink">
                {proposal.votesAgainst.toLocaleString()}
              </p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingDown size={12} className="text-neon-pink" />
                <p className="font-mono text-xs text-gray-500">Against</p>
              </div>
              <p className="font-mono text-xs text-neon-pink/70 mt-0.5">{againstPct.toFixed(1)}%</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="font-mono text-2xl font-bold text-gray-400">
                {proposal.votesAbstain.toLocaleString()}
              </p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Minus size={12} className="text-gray-500" />
                <p className="font-mono text-xs text-gray-500">Abstain</p>
              </div>
              <p className="font-mono text-xs text-gray-500/70 mt-0.5">{abstainPct.toFixed(1)}%</p>
            </div>
          </div>

          {/* Visual bars */}
          <div className="space-y-3 mb-5">
            <div>
              <div className="flex justify-between text-xs font-mono text-gray-500 mb-1">
                <span className="flex items-center gap-1 text-neon-cyan">
                  <TrendingUp size={11} /> For
                </span>
                <span>{proposal.votesFor.toLocaleString()} · {forPct.toFixed(1)}%</span>
              </div>
              <div className="bg-white/5 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-neon-cyan to-neon-cyan/70 rounded-full transition-all duration-1000"
                  style={{ width: `${forPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-mono text-gray-500 mb-1">
                <span className="flex items-center gap-1 text-neon-pink">
                  <TrendingDown size={11} /> Against
                </span>
                <span>{proposal.votesAgainst.toLocaleString()} · {againstPct.toFixed(1)}%</span>
              </div>
              <div className="bg-white/5 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-neon-pink to-neon-pink/70 rounded-full transition-all duration-1000"
                  style={{ width: `${againstPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-mono text-gray-500 mb-1">
                <span className="flex items-center gap-1">
                  <Minus size={11} /> Abstain
                </span>
                <span>{proposal.votesAbstain.toLocaleString()} · {abstainPct.toFixed(1)}%</span>
              </div>
              <div className="bg-white/5 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gray-500 rounded-full transition-all duration-1000"
                  style={{ width: `${abstainPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quorum */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-xs text-gray-500">
                Quorum {quorumPct >= 100 ? '✓ Reached' : 'Progress'}
              </span>
              <span className="font-mono text-xs text-gray-400">
                {totalVotes.toLocaleString()} / {proposal.quorum.toLocaleString()} required
              </span>
            </div>
            <div className="bg-white/5 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${quorumPct >= 100 ? 'bg-neon-purple' : 'bg-neon-purple/50'}`}
                style={{ width: `${quorumPct}%` }}
              />
            </div>
            <p className="font-mono text-xs text-gray-500 mt-1">{quorumPct.toFixed(1)}% of required quorum</p>
          </div>
        </NeonCard>

        {/* Voting buttons */}
        {isActive && (
          <NeonCard glow="purple" className="p-6 mb-6">
            <h2 className="font-mono text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <Shield size={16} className="text-neon-purple" />
              Cast Your Vote
            </h2>

            {!isConnected ? (
              <p className="font-mono text-sm text-gray-500 text-center py-4">
                Connect your wallet to vote on this proposal.
              </p>
            ) : userVote ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-neon-purple/10 border border-neon-purple/30">
                <CheckCircle2 size={20} className="text-neon-purple" />
                <div>
                  <p className="font-mono text-sm text-neon-purple font-semibold">
                    You voted: {userVote}
                  </p>
                  <p className="font-mono text-xs text-gray-500">
                    Voting power used: {Math.floor(votingPower)} TRUST
                  </p>
                </div>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-neon-pink/10 border border-neon-pink/30 flex items-center gap-2">
                    <AlertCircle size={16} className="text-neon-pink" />
                    <p className="font-mono text-sm text-neon-pink">{error}</p>
                  </div>
                )}
                {success && (
                  <div className="mb-4 p-3 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-neon-cyan" />
                    <p className="font-mono text-sm text-neon-cyan">{success}</p>
                  </div>
                )}

                <p className="font-mono text-xs text-gray-500 mb-4">
                  Your voting power: <span className="text-neon-cyan">{votingPower.toFixed(0)} TRUST</span>
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleVote('for')}
                    disabled={loading || !canVote}
                    className="flex items-center justify-center gap-2 font-mono text-sm py-3 px-4 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 hover:border-neon-cyan/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <TrendingUp size={16} />
                    Vote For
                  </button>
                  <button
                    onClick={() => handleVote('against')}
                    disabled={loading || !canVote}
                    className="flex items-center justify-center gap-2 font-mono text-sm py-3 px-4 rounded-lg border border-neon-pink/40 bg-neon-pink/10 text-neon-pink hover:bg-neon-pink/20 hover:border-neon-pink/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <TrendingDown size={16} />
                    Against
                  </button>
                  <button
                    onClick={() => handleVote('abstain')}
                    disabled={loading || !canVote}
                    className="flex items-center justify-center gap-2 font-mono text-sm py-3 px-4 rounded-lg border border-gray-600/40 bg-gray-600/10 text-gray-400 hover:bg-gray-600/20 hover:border-gray-500/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <Minus size={16} />
                    Abstain
                  </button>
                </div>
              </>
            )}
          </NeonCard>
        )}

        {/* Metadata */}
        <NeonCard glow="none" className="p-6">
          <h2 className="font-mono text-sm font-semibold text-gray-300 mb-4">Proposal Metadata</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-gray-500">Created</span>
              <span className="text-gray-300">{formatDate(proposal.createdAt)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-gray-500">Start</span>
              <span className="text-gray-300">{formatDate(proposal.startTime)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-gray-500">End</span>
              <span className="text-gray-300">{formatDate(proposal.endTime)}</span>
            </div>
            {proposal.executionTime && (
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-500">Executed</span>
                <span className="text-gray-300">{formatDate(proposal.executionTime)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-gray-500">Voting Period</span>
              <span className="text-gray-300">5 days</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-gray-500">Timelock</span>
              <span className="text-gray-300">2 days</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-gray-500">Proposal Threshold</span>
              <span className="text-gray-300">1,000 TRUST</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-gray-500">Quorum Required</span>
              <span className="text-gray-300">{proposal.quorum.toLocaleString()} TRUST</span>
            </div>
          </div>
        </NeonCard>
      </div>
    </div>
  );
}
