/**
 * phase4-abis.ts
 * Human-readable ABI arrays for all Phase 4 contracts.
 * Import individual ABIs or PHASE4_ADDRESSES as needed.
 */

// ── TRUST ERC-20 + ERC-Votes Token ────────────────────────────────────────────

export const TRUST_TOKEN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function delegates(address account) view returns (address)',
  'function delegate(address delegatee)',
  'function getVotes(address account) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
] as const;

// ── Staking Contract ──────────────────────────────────────────────────────────

export const STAKING_ABI = [
  'function stake(uint256 amount)',
  'function unstake(uint256 amount)',
  'function claimRewards()',
  'function getStakeInfo(address user) view returns (uint256 stakedAmount, uint256 pendingRewards, uint256 stakedAt)',
  'function getPendingRewards(address user) view returns (uint256)',
  'function getTotalStaked() view returns (uint256)',
  'function getBoostTier(address user) view returns (uint8)',
  'function depositRewards(uint256 amount)',
  'event Staked(address indexed user, uint256 amount)',
  'event Unstaked(address indexed user, uint256 amount)',
  'event RewardsClaimed(address indexed user, uint256 amount)',
] as const;

// ── Governor Contract ─────────────────────────────────────────────────────────

export const TRUST_GOVERNOR_ABI = [
  'function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) returns (uint256)',
  'function castVote(uint256 proposalId, uint8 support) returns (uint256)',
  'function castVoteWithReason(uint256 proposalId, uint8 support, string reason) returns (uint256)',
  'function state(uint256 proposalId) view returns (uint8)',
  'function proposalVotes(uint256 proposalId) view returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)',
  'function getVotes(address account, uint256 blockNumber) view returns (uint256)',
  'function quorum(uint256 blockNumber) view returns (uint256)',
  'function votingDelay() view returns (uint256)',
  'function votingPeriod() view returns (uint256)',
  'function proposalThreshold() view returns (uint256)',
  'event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, bytes[] calldatas, string description)',
  'event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)',
] as const;

// ── API Key Registry ──────────────────────────────────────────────────────────

export const API_KEY_REGISTRY_ABI = [
  'function registerKey(bytes32 keyHash)',
  'function upgradeKey(bytes32 keyHash) payable',
  'function revokeKey(bytes32 keyHash)',
  'function validateAndCount(bytes32 keyHash)',
  'function getKey(bytes32 keyHash) view returns (address owner, uint256 tier, uint256 dailyLimit, uint256 usageToday, bool active)',
  'function getOwnerKey(address owner) view returns (bytes32)',
  'event KeyRegistered(address indexed owner, bytes32 keyHash)',
  'event KeyUpgraded(address indexed owner, bytes32 keyHash)',
  'event KeyRevoked(address indexed owner, bytes32 keyHash)',
] as const;

// ── Cross-chain Verifier ──────────────────────────────────────────────────────

export const CROSS_CHAIN_VERIFIER_ABI = [
  'function publishProof(string rootHash, address signer, uint256 score, string tier, string skillCategory)',
  'function verifyProof(string rootHash) view returns (address signer, uint256 score, string tier, string skillCategory, uint256 timestamp, bool valid)',
  'function exportProof(string rootHash) view returns (bytes)',
  'function invalidateProof(string rootHash)',
  'function getProofCount() view returns (uint256)',
  'event ProofPublished(string indexed rootHash, address signer, uint256 score)',
] as const;

// ── Contract Addresses ────────────────────────────────────────────────────────

/**
 * Phase 4 contract addresses populated from environment variables.
 * Set these in .env.local before deploying Phase 4 contracts.
 *
 * Existing Phase 1-3 addresses (already deployed):
 *   SoulBound    = 0xA4948e4512dC57Da24d7367FEb6e2f54aF0C200E
 *   INFT         = 0xb5aA5d6Ef8eC7a6B2DD32dA223Db79114f92F19E
 *   Marketplace  = 0xB765b6d8d828897F47Defd0132cb359Cc6d4EDff
 *   HiringEscrow = 0xb627Eac1A6f55EDD851763FFBF1206F64F676513
 */
export const PHASE4_ADDRESSES = {
  trustToken:         process.env.NEXT_PUBLIC_TRUST_TOKEN_CONTRACT          || '',
  staking:            process.env.NEXT_PUBLIC_STAKING_CONTRACT              || '',
  rewardsDistributor: process.env.NEXT_PUBLIC_REWARDS_DISTRIBUTOR_CONTRACT  || '',
  trustGovernor:      process.env.NEXT_PUBLIC_TRUST_GOVERNOR_CONTRACT       || '',
  timeLock:           process.env.NEXT_PUBLIC_TIMELOCK_CONTRACT              || '',
  treasury:           process.env.NEXT_PUBLIC_TREASURY_CONTRACT             || '',
  crossChainVerifier: process.env.NEXT_PUBLIC_CROSS_CHAIN_VERIFIER_CONTRACT || '',
  apiKeyRegistry:     process.env.NEXT_PUBLIC_API_KEY_REGISTRY_CONTRACT     || '',
} as const;

// ── Boost tier decoder ────────────────────────────────────────────────────────

/**
 * Decode the uint8 boost tier returned by Staking.getBoostTier() into a label.
 */
export function decodeBoostTier(
  tier: number
): 'none' | 'bronze' | 'silver' | 'gold' | 'diamond' {
  switch (tier) {
    case 1:  return 'bronze';
    case 2:  return 'silver';
    case 3:  return 'gold';
    case 4:  return 'diamond';
    default: return 'none';
  }
}

/**
 * Decode the uint8 proposal state returned by Governor.state() into a label.
 * Matches OpenZeppelin GovernorTimelockControl states.
 */
export function decodeProposalState(
  state: number
): 'pending' | 'active' | 'cancelled' | 'failed' | 'passed' | 'queued' | 'expired' | 'executed' {
  switch (state) {
    case 0:  return 'pending';
    case 1:  return 'active';
    case 2:  return 'cancelled';
    case 3:  return 'failed';
    case 4:  return 'passed';
    case 5:  return 'queued';
    case 6:  return 'expired';
    case 7:  return 'executed';
    default: return 'pending';
  }
}
