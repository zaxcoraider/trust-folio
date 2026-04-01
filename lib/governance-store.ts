'use client';

/**
 * governance-store.ts
 * Client-side localStorage store for governance proposals and votes.
 * Key: trustfolio_governance
 */

import type { Proposal, VoteChoice, ProposalStatus, ProposalType } from './types';

const STORAGE_KEY  = 'trustfolio_governance';
const VOTES_KEY    = 'trustfolio_governance_votes'; // separate map: proposalId -> voter -> choice

// ── Internal vote map type ────────────────────────────────────────────────────

type VoteMap = Record<string, Record<string, VoteChoice>>;

function getVoteMap(): VoteMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(VOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveVoteMap(map: VoteMap): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VOTES_KEY, JSON.stringify(map));
  } catch { /* quota */ }
}

// ── Read ──────────────────────────────────────────────────────────────────────

export function getProposals(): Proposal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      seedDemoProposals();
      return getProposals();
    }
    const proposals: Proposal[] = JSON.parse(raw);
    if (proposals.length === 0) {
      seedDemoProposals();
      return getProposals();
    }
    return proposals;
  } catch {
    return [];
  }
}

export function getProposal(id: string): Proposal | null {
  return getProposals().find((p) => p.id === id) ?? null;
}

// ── Write ─────────────────────────────────────────────────────────────────────

function saveProposals(proposals: Proposal[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(proposals));
  } catch { /* quota */ }
}

export function saveProposal(proposal: Proposal): void {
  const existing = getProposals().filter((p) => p.id !== proposal.id);
  saveProposals([proposal, ...existing]);
}

export function updateProposal(id: string, patch: Partial<Proposal>): void {
  const proposals = getProposals();
  const updated = proposals.map((p) => (p.id === id ? { ...p, ...patch } : p));
  saveProposals(updated);
}

// ── Voting ────────────────────────────────────────────────────────────────────

/**
 * Cast a vote on a proposal. Updates vote counts and records the voter's choice.
 * Each voter can only vote once per proposal.
 */
export function castVote(
  proposalId:  string,
  voter:       string,
  choice:      VoteChoice,
  votingPower: number
): void {
  const proposal = getProposal(proposalId);
  if (!proposal) throw new Error(`Proposal ${proposalId} not found`);
  if (proposal.status !== 'active') throw new Error('Proposal is not active');

  const voteMap = getVoteMap();
  const voterKey = voter.toLowerCase();

  if (voteMap[proposalId]?.[voterKey]) {
    throw new Error('Already voted on this proposal');
  }

  // Record voter's choice
  if (!voteMap[proposalId]) voteMap[proposalId] = {};
  voteMap[proposalId][voterKey] = choice;
  saveVoteMap(voteMap);

  // Update proposal vote counts
  const patch: Partial<Proposal> = {};
  if (choice === 'for')     patch.votesFor     = proposal.votesFor     + votingPower;
  if (choice === 'against') patch.votesAgainst = proposal.votesAgainst + votingPower;
  if (choice === 'abstain') patch.votesAbstain = proposal.votesAbstain + votingPower;
  updateProposal(proposalId, patch);
}

export function getUserVote(proposalId: string, voter: string): VoteChoice | null {
  const voteMap = getVoteMap();
  return voteMap[proposalId]?.[voter.toLowerCase()] ?? null;
}

// ── Seed data ─────────────────────────────────────────────────────────────────

export function seedDemoProposals(): void {
  if (typeof window === 'undefined') return;

  const existing = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Proposal[]) : [];
    } catch {
      return [];
    }
  })();

  if (existing.length > 0) return;

  const now = Math.floor(Date.now() / 1000);
  const DAY = 86400;

  const demos: Proposal[] = [
    // 1. Active — fee change
    {
      id:           'prop_001',
      proposalId:   '1',
      type:         'FeeChange' as ProposalType,
      title:        'Reduce marketplace fee from 2.5% to 2%',
      description:
        'This proposal aims to reduce the marketplace transaction fee from 2.5% to 2% to incentivize more trades and grow platform volume. The fee reduction is expected to increase activity by at least 20%, partially offsetting the revenue impact. Treasury currently holds sufficient reserves to absorb the short-term reduction.',
      proposer:     '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      status:       'active' as ProposalStatus,
      votesFor:     45000,
      votesAgainst: 12000,
      votesAbstain: 3000,
      quorum:       40000,
      startTime:    now - DAY * 2,
      endTime:      now + DAY * 3,
      createdAt:    now - DAY * 2,
      targets:      ['0xB765b6d8d828897F47Defd0132cb359Cc6d4EDff'],
      values:       ['0'],
      calldatas:    ['0x'],
    },
    // 2. Passed — skill category
    {
      id:           'prop_002',
      proposalId:   '2',
      type:         'SkillCategory' as ProposalType,
      title:        'Add AI/ML skill category',
      description:
        'Introduce a dedicated AI/ML skill category to the verification system. This will enable more precise scoring for machine learning portfolios, model cards, research papers, and AI-generated artefact attestations. The new category will include sub-skills: Computer Vision, NLP, Reinforcement Learning, and MLOps.',
      proposer:     '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      status:       'passed' as ProposalStatus,
      votesFor:     89000,
      votesAgainst: 5000,
      votesAbstain: 2000,
      quorum:       40000,
      startTime:    now - DAY * 10,
      endTime:      now - DAY * 2,
      createdAt:    now - DAY * 10,
    },
    // 3. Active — treasury spend (currently failing quorum)
    {
      id:           'prop_003',
      proposalId:   '3',
      type:         'TreasurySpend' as ProposalType,
      title:        'Treasury grant for ecosystem development — 500 0G',
      description:
        'Allocate 500 0G from the TrustFolio treasury to fund three ecosystem development grants: (1) 200 0G for a third-party SDK integration, (2) 150 0G for educational content creation, (3) 150 0G for a bug-bounty programme. All recipients must provide bi-weekly progress reports to the DAO.',
      proposer:     '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      status:       'active' as ProposalStatus,
      votesFor:     23000,
      votesAgainst: 31000,
      votesAbstain: 1500,
      quorum:       40000,
      startTime:    now - DAY * 1,
      endTime:      now + DAY * 5,
      createdAt:    now - DAY * 1,
      targets:      ['0x0000000000000000000000000000000000000000'],
      values:       ['500000000000000000000'],
      calldatas:    ['0x'],
    },
    // 4. Executed — contract upgrade
    {
      id:            'prop_004',
      proposalId:    '4',
      type:          'ContractUpgrade' as ProposalType,
      title:         'Upgrade verification scoring algorithm',
      description:
        'Upgrade the on-chain verification scoring algorithm to v2. The new algorithm incorporates four independent metrics (originality, quality, complexity, authenticity) with weighted averaging, replacing the single-score approach. This aligns smart-contract scoring with the AI evaluation pipeline already in production.',
      proposer:      '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      status:        'executed' as ProposalStatus,
      votesFor:      76000,
      votesAgainst:  4000,
      votesAbstain:  1000,
      quorum:        40000,
      startTime:     now - DAY * 21,
      endTime:       now - DAY * 14,
      executionTime: now - DAY * 7,
      createdAt:     now - DAY * 21,
    },
  ];

  saveProposals(demos);
}
