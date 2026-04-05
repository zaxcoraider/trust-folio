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
    return raw ? (JSON.parse(raw) as Proposal[]) : [];
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

