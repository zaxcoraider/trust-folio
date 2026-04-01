// ── Portfolio ────────────────────────────────────────────────────────────────

export interface PortfolioFile {
  id: string;
  name: string;
  size: number;
  type: string;
  rootHash: string;
  txHash: string;
  uploadedAt: number;
  walletAddress: string;
  verified: boolean;
  verificationScore?: number;
  verificationBreakdown?: VerificationBreakdown;
  proofRootHash?: string;         // 0G Storage hash of the proof JSON
  soulBoundTokenId?: number;      // ERC-5192 token ID if minted
  soulBoundTxHash?: string;
  skillCategory?: SkillCategory;
  tier?: VerificationTier;
}

// ── Verification ─────────────────────────────────────────────────────────────

export type SkillCategory = 'code' | 'design' | 'writing' | 'document' | 'other';

export type VerificationTier = 'diamond' | 'gold' | 'silver' | 'bronze' | 'unverified';

export interface VerificationBreakdown {
  // Phase 2 metrics
  originality: number;
  quality: number;
  complexity: number;
  authenticity: number;
  summary: string;
  // Phase 1 metrics (kept for backward-compat with stored data)
  completeness?: number;
  clarity?: number;
  professionalism?: number;
  technicalDepth?: number;
}

export interface VerifyRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  rootHash: string;
  walletAddress?: string;
  description?: string;
}

export interface VerifyResponse {
  score: number;
  tier: VerificationTier;
  skillCategory: SkillCategory;
  breakdown: VerificationBreakdown;
  proofRootHash: string | null;   // null when storage upload is skipped
  powered_by: 'real' | 'simulated';
}

// ── Verification History ─────────────────────────────────────────────────────

export interface VerificationRecord {
  id: string;
  walletAddress: string;
  fileName: string;
  fileType: string;
  fileRootHash: string;
  proofRootHash: string | null;
  score: number;
  tier: VerificationTier;
  skillCategory: SkillCategory;
  breakdown: VerificationBreakdown;
  soulBoundTokenId?: number;
  soulBoundTxHash?: string;
  contractAddress?: string;
  verifiedAt: number;
  powered_by: 'real' | 'simulated';
}

// ── Soul-Bound Tokens ────────────────────────────────────────────────────────

export interface SoulBoundToken {
  tokenId: number;
  recipient: string;
  skillCategory: SkillCategory;
  score: number;
  originalityScore: number;
  qualityScore: number;
  complexityScore: number;
  authenticityScore: number;
  proofRootHash: string;
  fileRootHash: string;
  timestamp: number;
  metadataURI: string;
  tier: VerificationTier;
  contractAddress: string;
  txHash?: string;
}

// ── Upload ───────────────────────────────────────────────────────────────────

export interface UploadProgress {
  stage: 'hashing' | 'uploading' | 'confirming' | 'verifying' | 'done' | 'error';
  percent: number;
  message: string;
}

// ── Proof (public check) ─────────────────────────────────────────────────────

export interface VerificationProof {
  version: string;
  trustfolio: true;
  wallet: string;
  fileName: string;
  fileRootHash: string;
  proofRootHash: string;
  score: number;
  tier: VerificationTier;
  skillCategory: SkillCategory;
  breakdown: VerificationBreakdown;
  aiModel: string;
  verifiedAt: number;
  network: string;
  chainId: number;
}

// ── INFT (Phase 3) ────────────────────────────────────────────────────────────

export interface INFTMetadata {
  tokenId:               number;
  owner:                 string;
  originalOwner:         string;
  skillCategory:         SkillCategory;
  score:                 number;
  originalityScore:      number;
  qualityScore:          number;
  complexityScore:       number;
  authenticityScore:     number;
  encryptedMetadataHash: string;
  proofRootHash:         string;
  fileRootHash:          string;
  badges:                string[];
  mintedAt:              number;
  tier:                  VerificationTier;
  metadataURI:           string;
  contractAddress:       string;
  txHash?:               string;
}

// ── Marketplace (Phase 3) ─────────────────────────────────────────────────────

export interface MarketplaceListing {
  listingId:    string;
  tokenId:      number;
  seller:       string;
  price:        string;        // wei as string
  priceEther:   string;        // human-readable 0G amount
  listedAt:     number;
  active:       boolean;
  views:        number;
  inft:         INFTMetadata;
}

export interface MarketplaceOffer {
  offerId:      string;
  tokenId:      number;
  buyer:        string;
  amount:       string;        // wei as string
  amountEther:  string;
  createdAt:    number;
  expiresAt:    number;
  active:       boolean;
  status:       'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
}

// ── Hiring (Phase 3) ──────────────────────────────────────────────────────────

export type HiringStatus =
  | 'pending'
  | 'accepted'
  | 'completed'
  | 'released'
  | 'disputed'
  | 'cancelled'
  | 'declined';

export interface HiringRequest {
  requestId:        string;
  employer:         string;
  talent:           string;
  amount:           string;    // wei as string
  amountEther:      string;
  title:            string;
  description:      string;
  deadline:         number;
  createdAt:        number;
  acceptedAt?:      number;
  completedAt?:     number;
  releasedAt?:      number;
  status:           HiringStatus;
  talentConfirmed:  boolean;
  employerReleased: boolean;
  txHash?:          string;
  contractAddress:  string;
}

// ── Admin Stats (Phase 3) ─────────────────────────────────────────────────────

export interface AdminStats {
  totalINFTsMinted:       number;
  totalListings:          number;
  totalSales:             number;
  totalVolume:            string;    // in 0G tokens
  totalMarketplaceFees:   string;
  totalHiringContracts:   number;
  totalHiringVolume:      string;
  totalHiringFees:        string;
  recentActivity: Array<{
    type:      'sale' | 'mint' | 'hire' | 'listing';
    summary:   string;
    amount?:   string;
    timestamp: number;
    txHash?:   string;
  }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getTier(score: number): VerificationTier {
  if (score >= 90) return 'diamond';
  if (score >= 75) return 'gold';
  if (score >= 50) return 'silver';
  return 'bronze';
}

export function detectSkillCategory(fileName: string, fileType: string): SkillCategory {
  if (fileType.startsWith('image/')) return 'design';
  if (fileType === 'application/pdf') return 'document';
  if (
    fileName.match(/\.(js|ts|jsx|tsx|py|go|rs|sol|java|cpp|c|rb|php|cs|swift|kt|scala|sh|bash|vue|svelte)$/i) ||
    fileType.includes('javascript') ||
    fileType.includes('typescript')
  ) return 'code';
  if (
    fileName.match(/\.(md|txt|docx|doc|rtf|odt)$/i) ||
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType === 'application/msword'
  ) return 'writing';
  if (fileType === 'application/json') return 'code';
  return 'other';
}

export const TIER_CONFIG: Record<VerificationTier, {
  label: string;
  color: string;
  glow: string;
  border: string;
  bg: string;
  emoji: string;
}> = {
  diamond: {
    label: 'Diamond',
    color: '#e2e8f0',
    glow: 'rgba(226,232,240,0.7)',
    border: 'rgba(226,232,240,0.4)',
    bg: 'rgba(226,232,240,0.08)',
    emoji: '💎',
  },
  gold: {
    label: 'Gold',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.7)',
    border: 'rgba(245,158,11,0.4)',
    bg: 'rgba(245,158,11,0.08)',
    emoji: '🥇',
  },
  silver: {
    label: 'Silver',
    color: '#06b6d4',
    glow: 'rgba(6,182,212,0.7)',
    border: 'rgba(6,182,212,0.4)',
    bg: 'rgba(6,182,212,0.08)',
    emoji: '🥈',
  },
  bronze: {
    label: 'Bronze',
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.7)',
    border: 'rgba(168,85,247,0.4)',
    bg: 'rgba(168,85,247,0.08)',
    emoji: '🥉',
  },
  unverified: {
    label: 'Unverified',
    color: '#4b5563',
    glow: 'rgba(75,85,99,0.3)',
    border: 'rgba(75,85,99,0.2)',
    bg: 'rgba(75,85,99,0.05)',
    emoji: '⬜',
  },
};

// ─── Phase 4: TRUST Token ────────────────────────────────────────────────────
export interface TrustStakeInfo {
  stakedAmount: string;        // in TRUST (formatted, not wei)
  pendingRewards: string;      // in TRUST
  boostTier: 'none' | 'bronze' | 'silver' | 'gold' | 'diamond';
  stakedAt: number;            // timestamp
}

export interface TrustTokenStats {
  totalSupply: string;
  totalStaked: string;
  circulatingSupply: string;
  stakingAPY: number;          // 8
  yourBalance: string;
  yourStaked: string;
  yourPendingRewards: string;
}

// ─── Phase 4: Governance ─────────────────────────────────────────────────────
export type ProposalStatus = 'active' | 'passed' | 'failed' | 'queued' | 'executed' | 'cancelled';
export type ProposalType = 'FeeChange' | 'VerificationFee' | 'SkillCategory' | 'TreasurySpend' | 'ContractUpgrade';
export type VoteChoice = 'for' | 'against' | 'abstain';

export interface Proposal {
  id: string;
  proposalId: string;          // on-chain ID
  type: ProposalType;
  title: string;
  description: string;
  proposer: string;            // wallet address
  status: ProposalStatus;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  quorum: number;              // required votes (4% of supply)
  startTime: number;
  endTime: number;
  executionTime?: number;      // if queued
  createdAt: number;
  targets?: string[];
  values?: string[];
  calldatas?: string[];
  userVote?: VoteChoice;       // current user's vote
}

export interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  totalVoters: number;
  totalVotesCast: number;
  quorumPercent: number;
  yourVotingPower: string;
  yourDelegatee?: string;
}

// ─── Phase 4: Notifications ───────────────────────────────────────────────────
export type NotificationType =
  | 'verification_complete'
  | 'inft_sold'
  | 'offer_received'
  | 'hire_request'
  | 'escrow_released'
  | 'governance_proposal'
  | 'staking_reward'
  | 'trust_earned';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  walletAddress: string;
  link?: string;
  txHash?: string;
  amount?: string;
}

// ─── Phase 4: Settings ────────────────────────────────────────────────────────
export type ProfileVisibility   = 'public' | 'private' | 'verified-only';
export type SkillLevel          = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type HiringAvailability  = 'available' | 'not-available' | 'open-to-offers';
export type SkillPillCategory   = 'development' | 'design' | 'writing' | 'blockchain' | 'aiml' | 'custom';

export interface UserSettings {
  walletAddress:    string;
  displayName:      string;
  title:            string;           // e.g. "Senior Solidity Developer"
  bio:              string;
  avatarHash?:      string;           // 0G Storage root hash of avatar image
  location?:        string;
  website?:         string;
  github?:          string;
  twitter?:         string;
  portfolioUrl?:    string;
  skills:           string[];
  skillCategories:  Record<string, SkillPillCategory>;
  expertiseLevels:  Record<string, SkillLevel>;
  hiringStatus:     HiringAvailability;
  profileRootHash?: string;           // 0G Storage root hash of profile JSON
  visibility:       ProfileVisibility;
  notifications: {
    verifications: boolean;
    sales:         boolean;
    hires:         boolean;
    governance:    boolean;
    rewards:       boolean;
  };
  updatedAt: number;
}

// ─── Phase 4: API Keys ────────────────────────────────────────────────────────
export type APIKeyTier = 'free' | 'paid';

export interface APIKeyRecord {
  id: string;
  name: string;                // user-given name
  keyHash: string;             // keccak256 of the actual key (stored on-chain)
  keyPreview: string;          // first 8 + last 4 chars: "tk_live_xxxx...xxxx"
  tier: APIKeyTier;
  dailyLimit: number;          // 100 for free, 10000 for paid
  usageToday: number;
  usageTotal: number;
  active: boolean;
  walletAddress: string;
  createdAt: number;
  lastUsedAt?: number;
}

// ─── Phase 4: Analytics ──────────────────────────────────────────────────────
export interface PlatformStats {
  totalVerifications: number;
  totalINFTs: number;
  totalMarketplaceVolume: string;  // in 0G
  totalHiringContracts: number;
  totalHiringVolume: string;       // in 0G
  totalTrustDistributed: string;
  activeStakers: number;
  dailyVerifications: Array<{ date: string; count: number }>;
  weeklyVolume: Array<{ date: string; volume: number }>;
  skillDistribution: Array<{ name: string; value: number }>;
  tierDistribution: Array<{ name: string; value: number; color: string }>;
  topTalent: Array<{ address: string; displayName?: string; score: number; tier: string }>;
  topEmployers: Array<{ address: string; displayName?: string; hires: number; volume: string }>;
}

// ─── Phase 4: Cross-chain Export ─────────────────────────────────────────────
export interface PortableCredential {
  version: '1.0';
  issuer: 'TrustFolio';
  network: '0G-Galileo-Testnet';
  chainId: 16602;
  walletAddress: string;
  displayName?: string;
  credentials: Array<{
    tokenId: string;
    skillCategory: string;
    score: number;
    tier: string;
    proofRootHash: string;
    fileRootHash: string;
    verifiedAt: number;
    badges: string[];
    contractAddress: string;
  }>;
  signature: string;           // signer's sig over keccak256(abi.encode(credentials))
  exportedAt: number;
  explorerUrl: string;
}
