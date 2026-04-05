/**
 * ABI for SoulBoundCredential.sol (ERC-5192 soul-bound tokens on 0G Chain).
 * Human-readable format for ethers.js v6.
 */
export const SOULBOUND_ABI = [
  // ── Events ──────────────────────────────────────────────────────────────
  "event CredentialMinted(uint256 indexed tokenId, address indexed recipient, string skillCategory, uint256 score, string proofRootHash, string fileRootHash)",
  "event Locked(uint256 tokenId)",
  "event Unlocked(uint256 tokenId)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",

  // ── ERC-5192 ─────────────────────────────────────────────────────────────
  "function locked(uint256 tokenId) view returns (bool)",

  // ── ERC-721 reads ────────────────────────────────────────────────────────
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function supportsInterface(bytes4 interfaceId) view returns (bool)",

  // ── TrustFolio reads ─────────────────────────────────────────────────────
  "function totalSupply() view returns (uint256)",
  "function getWalletTokens(address wallet) view returns (uint256[])",
  "function getTokenByFileHash(string fileRootHash) view returns (uint256)",
  "function getCredential(uint256 tokenId) view returns (tuple(address recipient, string skillCategory, uint256 score, uint256 originalityScore, uint256 qualityScore, uint256 complexityScore, uint256 authenticityScore, string proofRootHash, string fileRootHash, uint256 timestamp, string metadataURI))",
  "function credentials(uint256 tokenId) view returns (address recipient, string skillCategory, uint256 score, uint256 originalityScore, uint256 qualityScore, uint256 complexityScore, uint256 authenticityScore, string proofRootHash, string fileRootHash, uint256 timestamp, string metadataURI)",

  // ── TrustFolio writes (onlyOwner) ────────────────────────────────────────
  "function mintCredential(address recipient, string skillCategory, uint256 score, uint256 originalityScore, uint256 qualityScore, uint256 complexityScore, uint256 authenticityScore, string proofRootHash, string fileRootHash, string metadataURI) returns (uint256)",

  // ── Custom errors ─────────────────────────────────────────────────────────
  "error SoulBoundNonTransferable()",
  "error ScoreTooLow(uint256 score, uint256 minimum)",
  "error AlreadyMinted(string fileRootHash, uint256 existingTokenId)",
  "error TokenDoesNotExist(uint256 tokenId)",
  // OZ Ownable v5 errors
  "error OwnableUnauthorizedAccount(address account)",
  "error OwnableInvalidOwner(address owner)",
] as const;

export const CONTRACT_ADDRESSES = {
  testnet: process.env.NEXT_PUBLIC_CREDENTIAL_CONTRACT || '',
  mainnet: '',
} as const;
