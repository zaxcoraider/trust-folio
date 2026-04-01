'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Shield, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useAccount } from 'wagmi';
import { NeonCard } from '@/components/NeonCard';
import { saveProposal } from '@/lib/governance-store';
import { getTrustState } from '@/lib/trust-store';
import type { ProposalType, Proposal } from '@/lib/types';

const PROPOSAL_TYPES: { value: ProposalType; label: string; description: string }[] = [
  { value: 'FeeChange', label: 'Fee Change', description: 'Modify marketplace or platform fees' },
  { value: 'VerificationFee', label: 'Verification Fee', description: 'Adjust AI verification costs' },
  { value: 'SkillCategory', label: 'Skill Category', description: 'Add or modify skill categories' },
  { value: 'TreasurySpend', label: 'Treasury Spend', description: 'Allocate funds from DAO treasury' },
  { value: 'ContractUpgrade', label: 'Contract Upgrade', description: 'Upgrade smart contract logic' },
];

function genId(): string {
  return `prop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function CreateProposalPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [trustBalance, setTrustBalance] = useState(0);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ProposalType>('FeeChange');
  const [description, setDescription] = useState('');
  const [newFee, setNewFee] = useState('');
  const [treasuryAmount, setTreasuryAmount] = useState('');
  const [treasuryRecipient, setTreasuryRecipient] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (address) {
      const state = getTrustState(address);
      setTrustBalance(state.staked + state.balance);
    }
  }, [address]);

  const canCreate = isConnected && trustBalance >= 1000;
  const descriptionValid = description.length >= 100;
  const titleValid = title.trim().length >= 5;

  const formValid =
    canCreate &&
    titleValid &&
    descriptionValid &&
    (type !== 'FeeChange' || (newFee !== '' && parseFloat(newFee) >= 0 && parseFloat(newFee) <= 10)) &&
    (type !== 'TreasurySpend' || (treasuryAmount !== '' && treasuryRecipient.startsWith('0x')));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid || !address) return;
    setSubmitting(true);
    setError(null);

    try {
      const now = Math.floor(Date.now() / 1000);
      const DAY = 86400;

      const proposal: Proposal = {
        id: genId(),
        proposalId: String(Math.floor(Math.random() * 9000) + 1000),
        type,
        title: title.trim(),
        description: description.trim(),
        proposer: address,
        status: 'active',
        votesFor: 0,
        votesAgainst: 0,
        votesAbstain: 0,
        quorum: 40000,
        startTime: now,
        endTime: now + DAY * 5,
        createdAt: now,
        targets: [],
        values: [],
        calldatas: [],
      };

      saveProposal(proposal);
      setSuccess(true);
      setTimeout(() => router.push('/governance'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create proposal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-bg-primary px-4 py-10 page-enter">
      <div className="fixed inset-0 bg-grid opacity-100 pointer-events-none" />

      <div className="relative max-w-2xl mx-auto">
        {/* Back */}
        <Link
          href="/governance"
          className="inline-flex items-center gap-2 font-mono text-sm text-gray-500 hover:text-neon-purple transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to Governance
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-neon-purple/10 border border-neon-purple/20">
            <Shield size={22} className="text-neon-purple" />
          </div>
          <div>
            <h1 className="font-mono text-2xl font-bold text-gray-100">Create Proposal</h1>
            <p className="font-mono text-sm text-gray-500">Submit a governance proposal for community vote</p>
          </div>
        </div>

        {/* Requirements info */}
        <NeonCard glow="none" className="p-4 mb-6 border-neon-purple/20 bg-neon-purple/5">
          <div className="flex items-start gap-3">
            <Info size={16} className="text-neon-purple mt-0.5 shrink-0" />
            <div className="font-mono text-xs text-gray-400 space-y-1">
              <p><span className="text-neon-purple">Min 1,000 TRUST</span> required to create a proposal</p>
              <p><span className="text-neon-cyan">5-day</span> voting period after submission</p>
              <p><span className="text-amber-400">2-day timelock</span> after a proposal passes before execution</p>
            </div>
          </div>
        </NeonCard>

        {!isConnected ? (
          <NeonCard glow="purple" className="p-8 text-center">
            <Shield size={36} className="text-gray-600 mx-auto mb-3" />
            <p className="font-mono text-gray-400">Connect your wallet to create a proposal.</p>
          </NeonCard>
        ) : !canCreate ? (
          <NeonCard glow="pink" className="p-6 text-center">
            <AlertCircle size={36} className="text-neon-pink mx-auto mb-3" />
            <p className="font-mono text-neon-pink font-semibold mb-1">Insufficient TRUST Balance</p>
            <p className="font-mono text-sm text-gray-500 mb-4">
              You need at least 1,000 TRUST. You have{' '}
              <span className="text-neon-cyan">{trustBalance.toFixed(0)} TRUST</span>.
            </p>
            <Link
              href="/stake"
              className="inline-block font-mono text-sm px-4 py-2 rounded-lg border border-neon-purple/40 bg-neon-purple/10 text-neon-purple hover:bg-neon-purple/20 transition-all"
            >
              Stake TRUST to qualify →
            </Link>
          </NeonCard>
        ) : success ? (
          <NeonCard glow="cyan" className="p-8 text-center">
            <CheckCircle2 size={40} className="text-neon-cyan mx-auto mb-3" />
            <p className="font-mono text-neon-cyan font-semibold text-lg mb-1">Proposal Submitted!</p>
            <p className="font-mono text-sm text-gray-500">Redirecting to governance page...</p>
          </NeonCard>
        ) : (
          <NeonCard glow="purple" className="p-6">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-neon-pink/10 border border-neon-pink/30 flex items-center gap-2">
                <AlertCircle size={16} className="text-neon-pink" />
                <p className="font-mono text-sm text-neon-pink">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div>
                <label className="block font-mono text-sm text-gray-300 mb-1.5">
                  Proposal Title <span className="text-neon-pink">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Reduce marketplace fee from 2.5% to 2%"
                  className="w-full bg-bg-primary border border-white/10 rounded-lg px-4 py-2.5 font-mono text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-neon-purple/50 transition-colors"
                />
                {title.length > 0 && !titleValid && (
                  <p className="font-mono text-xs text-neon-pink mt-1">Title must be at least 5 characters</p>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block font-mono text-sm text-gray-300 mb-1.5">
                  Proposal Type <span className="text-neon-pink">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ProposalType)}
                  className="w-full bg-bg-primary border border-white/10 rounded-lg px-4 py-2.5 font-mono text-sm text-gray-200 focus:outline-none focus:border-neon-purple/50 transition-colors"
                >
                  {PROPOSAL_TYPES.map((pt) => (
                    <option key={pt.value} value={pt.value}>
                      {pt.label} — {pt.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block font-mono text-sm text-gray-300 mb-1.5">
                  Description <span className="text-neon-pink">*</span>
                  <span className="text-gray-500 ml-1">(min 100 chars)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  placeholder="Provide a detailed explanation of the proposal, its motivation, expected impact, and any technical specifics..."
                  className="w-full bg-bg-primary border border-white/10 rounded-lg px-4 py-2.5 font-mono text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-neon-purple/50 transition-colors resize-none"
                />
                <div className="flex justify-between mt-1">
                  {description.length < 100 && description.length > 0 && (
                    <p className="font-mono text-xs text-neon-pink">
                      {100 - description.length} more characters needed
                    </p>
                  )}
                  {description.length >= 100 && (
                    <p className="font-mono text-xs text-neon-cyan flex items-center gap-1">
                      <CheckCircle2 size={11} /> Valid
                    </p>
                  )}
                  <p className={`font-mono text-xs ml-auto ${description.length >= 100 ? 'text-gray-500' : 'text-gray-600'}`}>
                    {description.length} chars
                  </p>
                </div>
              </div>

              {/* Fee Change fields */}
              {type === 'FeeChange' && (
                <div>
                  <label className="block font-mono text-sm text-gray-300 mb-1.5">
                    New Fee Percentage (0–10%) <span className="text-neon-pink">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={newFee}
                    onChange={(e) => setNewFee(e.target.value)}
                    placeholder="e.g., 2.0"
                    className="w-full bg-bg-primary border border-white/10 rounded-lg px-4 py-2.5 font-mono text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-neon-purple/50 transition-colors"
                  />
                  <p className="font-mono text-xs text-gray-500 mt-1">Current fee: 2.5%</p>
                </div>
              )}

              {/* Treasury Spend fields */}
              {type === 'TreasurySpend' && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-mono text-sm text-gray-300 mb-1.5">
                      Amount (0G) <span className="text-neon-pink">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={treasuryAmount}
                      onChange={(e) => setTreasuryAmount(e.target.value)}
                      placeholder="e.g., 500"
                      className="w-full bg-bg-primary border border-white/10 rounded-lg px-4 py-2.5 font-mono text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-neon-purple/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-sm text-gray-300 mb-1.5">
                      Recipient Address <span className="text-neon-pink">*</span>
                    </label>
                    <input
                      type="text"
                      value={treasuryRecipient}
                      onChange={(e) => setTreasuryRecipient(e.target.value)}
                      placeholder="0x..."
                      className="w-full bg-bg-primary border border-white/10 rounded-lg px-4 py-2.5 font-mono text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-neon-purple/50 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Voting power notice */}
              <div className="p-3 rounded-lg bg-neon-cyan/5 border border-neon-cyan/20">
                <p className="font-mono text-xs text-gray-400">
                  Your voting power: <span className="text-neon-cyan">{trustBalance.toFixed(0)} TRUST</span>
                  {' '}· Voting period: <span className="text-neon-cyan">5 days</span>
                  {' '}· Timelock: <span className="text-amber-400">2 days</span>
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!formValid || submitting}
                className="w-full font-mono text-sm py-3 rounded-lg border border-neon-purple/40 bg-neon-purple/10 text-neon-purple hover:bg-neon-purple/20 hover:border-neon-purple/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Shield size={16} />
                    Submit Proposal
                  </>
                )}
              </button>
            </form>
          </NeonCard>
        )}
      </div>
    </div>
  );
}
