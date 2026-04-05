/**
 * lib/contracts.ts
 * Single source of truth for all contract ABIs.
 * Addresses come from config/networks.ts via useNetwork().
 */

// ── INFT (ERC-7857 Intelligent NFT) ──────────────────────────────────────────

export const INFT_ABI = [
  'function mintINFT(address to, string skillCategory, uint256 score, uint256 originalityScore, uint256 qualityScore, uint256 complexityScore, uint256 authenticityScore, string encryptedMetadataHash, string proofRootHash, string fileRootHash, string[] badges, string metadataURI) payable returns (uint256)',
  'function mintingFee() view returns (uint256)',
  'function getINFT(uint256 tokenId) view returns (tuple(address originalOwner, string skillCategory, uint256 score, uint256 originalityScore, uint256 qualityScore, uint256 complexityScore, uint256 authenticityScore, string encryptedMetadataHash, string proofRootHash, string fileRootHash, string[] badges, uint256 mintedAt, string tier, string metadataURI))',
  'function getTokenByFileHash(string fileRootHash) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function getWalletTokens(address wallet) view returns (uint256[])',
  'event INFTMinted(uint256 indexed tokenId, address indexed owner, string skillCategory, uint256 score, string tier)',

  // Custom errors
  'error ScoreTooLow(uint256 score, uint256 minimum)',
  'error AlreadyMinted(string fileRootHash, uint256 existingTokenId)',
  'error TokenDoesNotExist(uint256 tokenId)',
  'error InsufficientFee(uint256 provided, uint256 required)',
  'error TransferFailed()',
  // OZ Ownable v5 errors
  'error OwnableUnauthorizedAccount(address account)',
  'error OwnableInvalidOwner(address owner)',
  // OZ ERC721 v5 errors
  'error ERC721InvalidOwner(address owner)',
  'error ERC721NonexistentToken(uint256 tokenId)',
  'error ERC721IncorrectOwner(address sender, uint256 tokenId, address owner)',
  'error ERC721InvalidReceiver(address receiver)',
  'error ERC721InvalidApprover(address approver)',
  'error ERC721InvalidOperator(address operator)',
  'error ERC721InvalidSender(address sender)',
  // OZ ReentrancyGuard v5
  'error ReentrancyGuardReentrantCall()',
] as const;

// ── Marketplace ───────────────────────────────────────────────────────────────

export const MARKETPLACE_ABI = [
  'function createListing(uint256 tokenId, uint256 price) returns (uint256 listingId)',
  'function buyListing(uint256 listingId) payable',
  'function cancelListing(uint256 listingId)',
  'function makeOffer(uint256 tokenId, uint256 durationSeconds) payable returns (uint256 offerId)',
  'function acceptOffer(uint256 offerId)',
  'function cancelOffer(uint256 offerId)',
  'function getListing(uint256 listingId) view returns (tuple(uint256 listingId, uint256 tokenId, address seller, uint256 price, uint256 listedAt, bool active))',
  'function getOffer(uint256 offerId) view returns (tuple(uint256 offerId, uint256 tokenId, address buyer, uint256 amount, uint256 expiresAt, bool active))',
  'function tokenToActiveListing(uint256 tokenId) view returns (uint256)',
  'function activeListingCount() view returns (uint256)',
  'function getActiveListings() view returns (tuple(uint256 listingId, uint256 tokenId, address seller, uint256 price, uint256 listedAt, bool active)[])',
  'event Listed(uint256 indexed listingId, uint256 indexed tokenId, address indexed seller, uint256 price)',
  'event Sale(uint256 indexed listingId, uint256 indexed tokenId, address seller, address indexed buyer, uint256 price, uint256 fee)',
  'event ListingCancelled(uint256 indexed listingId, uint256 indexed tokenId)',
  'event OfferMade(uint256 indexed offerId, uint256 indexed tokenId, address indexed buyer, uint256 amount, uint256 expiresAt)',
  'event OfferAccepted(uint256 indexed offerId, uint256 indexed tokenId, address seller, address indexed buyer, uint256 amount, uint256 fee)',
  'event OfferCancelled(uint256 indexed offerId)',
  // Custom errors
  'error InvalidPrice()',
  'error InvalidDuration()',
  'error NotTokenOwner()',
  'error TokenAlreadyListed(uint256 tokenId, uint256 existingListingId)',
  'error ListingNotActive(uint256 listingId)',
  'error NotSeller(address caller, address seller)',
  'error NotBuyer(address caller, address buyer)',
  'error InsufficientPayment(uint256 sent, uint256 required)',
  'error OfferExpired(uint256 offerId)',
  'error OfferNotActive(uint256 offerId)',
  'error TransferFailed()',
  'error OwnableUnauthorizedAccount(address account)',
  'error ReentrancyGuardReentrantCall()',
] as const;

// ── Hiring Escrow ─────────────────────────────────────────────────────────────

export const HIRING_ESCROW_ABI = [
  'function createRequest(address talent, string title, string description, uint256 deadline) payable returns (uint256 requestId)',
  'function acceptRequest(uint256 requestId)',
  'function declineRequest(uint256 requestId)',
  'function confirmCompletion(uint256 requestId)',
  'function releasePayment(uint256 requestId)',
  'function cancelRequest(uint256 requestId)',
  'function raiseDispute(uint256 requestId)',
  'function autoRelease(uint256 requestId)',
  'function autoReleaseReadyAt(uint256 requestId) view returns (uint256)',
  'function getRequest(uint256 requestId) view returns (tuple(uint256 requestId, address employer, address talent, uint256 amount, string title, string description, uint256 deadline, uint256 createdAt, uint256 acceptedAt, uint256 completedAt, uint8 status, bool talentConfirmed, bool employerReleased))',
  'function getEmployerRequests(address employer) view returns (uint256[])',
  'function getTalentRequests(address talent) view returns (uint256[])',
  'function totalRequestsCount() view returns (uint256)',
  'event RequestCreated(uint256 indexed requestId, address indexed employer, address indexed talent, uint256 amount, string title)',
  'event RequestAccepted(uint256 indexed requestId, address talent)',
  'event RequestDeclined(uint256 indexed requestId, address talent)',
  'event CompletionConfirmed(uint256 indexed requestId, address confirmedBy)',
  'event PaymentReleased(uint256 indexed requestId, address indexed talent, uint256 amount, uint256 fee)',
  'event RequestCancelled(uint256 indexed requestId, address indexed by)',
  'event DisputeRaised(uint256 indexed requestId, address indexed raisedBy)',
  'event DisputeResolved(uint256 indexed requestId, bool releasedToTalent)',
  // Custom errors
  'error RequestNotFound(uint256 requestId)',
  'error InvalidStatus(uint256 requestId, uint8 current)',
  'error NotAuthorized()',
  'error InvalidTalentAddress()',
  'error DeadlineMustBeFuture()',
  'error PaymentRequired()',
  'error TitleRequired()',
  'error AutoReleaseNotReady(uint256 readyAt)',
  'error TransferFailed()',
  'error OwnableUnauthorizedAccount(address account)',
  'error ReentrancyGuardReentrantCall()',
] as const;

// ── Soul-bound Credential (re-export from contract-abi.ts) ────────────────────

export { SOULBOUND_ABI } from '@/lib/contract-abi';

// ── ERC-721 Approval (needed for marketplace listings) ───────────────────────

export const ERC721_ABI = [
  'function approve(address to, uint256 tokenId)',
  'function setApprovalForAll(address operator, bool approved)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function getApproved(uint256 tokenId) view returns (address)',
  'function ownerOf(uint256 tokenId) view returns (address)',
] as const;

// ── Helper: check if a contract address is configured ────────────────────────

export function isConfigured(address: string | undefined | null): boolean {
  return !!address && address.length > 0 && address !== '0x0000000000000000000000000000000000000000';
}
