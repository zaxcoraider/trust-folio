'use client';

import Link from 'next/link';
import { Shield, Clock, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { NeonCard } from '@/components/NeonCard';
import type { Proposal } from '@/lib/types';

interface ProposalCardProps {
  proposal: Proposal;
  userAddress?: string;
}

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
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ProposalCard({ proposal, userAddress }: ProposalCardProps) {
  const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
  const forPct = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;
  const againstPct = totalVotes > 0 ? (proposal.votesAgainst / totalVotes) * 100 : 0;
  const abstainPct = totalVotes > 0 ? (proposal.votesAbstain / totalVotes) * 100 : 0;
  const quorumPct = Math.min(100, (totalVotes / proposal.quorum) * 100);

  const statusCfg = STATUS_CONFIG[proposal.status] ?? STATUS_CONFIG.active;
  const typeColor = TYPE_COLORS[proposal.type] ?? TYPE_COLORS.FeeChange;

  const userVote = proposal.userVote;
  const isActive = proposal.status === 'active';

  return (
    <NeonCard
      glow={isActive ? 'cyan' : 'none'}
      className="p-5 hover:scale-[1.005] transition-transform duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
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
        <div className="flex items-center gap-1 text-gray-500 text-xs font-mono shrink-0">
          <Clock size={12} />
          <span>{isActive ? timeRemaining(proposal.endTime) : 'Ended'}</span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-gray-100 font-mono font-semibold text-sm mb-1 leading-snug">
        {proposal.title}
      </h3>
      <p className="text-gray-500 font-mono text-xs mb-4">
        by {truncateAddress(proposal.proposer)} · #{proposal.proposalId}
      </p>

      {/* Vote Bars */}
      <div className="space-y-2 mb-4">
        {/* For */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 w-16 shrink-0">
            <TrendingUp size={12} className="text-neon-cyan" />
            <span className="font-mono text-xs text-neon-cyan">For</span>
          </div>
          <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-neon-cyan rounded-full transition-all duration-700"
              style={{ width: `${forPct}%` }}
            />
          </div>
          <span className="font-mono text-xs text-gray-400 w-14 text-right">
            {forPct.toFixed(1)}%
          </span>
        </div>
        {/* Against */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 w-16 shrink-0">
            <TrendingDown size={12} className="text-neon-pink" />
            <span className="font-mono text-xs text-neon-pink">Against</span>
          </div>
          <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-neon-pink rounded-full transition-all duration-700"
              style={{ width: `${againstPct}%` }}
            />
          </div>
          <span className="font-mono text-xs text-gray-400 w-14 text-right">
            {againstPct.toFixed(1)}%
          </span>
        </div>
        {/* Abstain */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 w-16 shrink-0">
            <Minus size={12} className="text-gray-500" />
            <span className="font-mono text-xs text-gray-500">Abstain</span>
          </div>
          <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gray-500 rounded-full transition-all duration-700"
              style={{ width: `${abstainPct}%` }}
            />
          </div>
          <span className="font-mono text-xs text-gray-400 w-14 text-right">
            {abstainPct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Quorum bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-xs text-gray-500">Quorum</span>
          <span className="font-mono text-xs text-gray-400">
            {totalVotes.toLocaleString()} / {proposal.quorum.toLocaleString()}
          </span>
        </div>
        <div className="bg-white/5 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${quorumPct >= 100 ? 'bg-neon-purple' : 'bg-neon-purple/50'}`}
            style={{ width: `${quorumPct}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-gray-500 font-mono text-xs">
          <Users size={12} />
          <span>{totalVotes.toLocaleString()} votes</span>
        </div>
        <Link
          href={`/governance/${proposal.id}`}
          className="font-mono text-xs text-neon-purple hover:text-neon-cyan transition-colors border border-neon-purple/30 hover:border-neon-cyan/30 px-3 py-1 rounded-md bg-neon-purple/5 hover:bg-neon-cyan/5"
        >
          View Details →
        </Link>
      </div>
    </NeonCard>
  );
}
