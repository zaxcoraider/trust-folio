// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IERC5192 — Minimal Soulbound NFTs
 * @dev https://eips.ethereum.org/EIPS/eip-5192
 */
interface IERC5192 {
    /// @notice Emitted when the locking status is changed to locked.
    event Locked(uint256 tokenId);
    /// @notice Emitted when the locking status is changed to unlocked.
    event Unlocked(uint256 tokenId);
    /// @notice Returns the locking status of an Soulbound Token
    function locked(uint256 tokenId) external view returns (bool);
}

/**
 * @title SoulBoundCredential
 * @notice Non-transferable ERC-721 credential tokens (ERC-5192 compliant).
 *         Deployed on 0G Chain (chainId 16602, evm-version cancun).
 *         Each token represents an AI-verified portfolio credential stored
 *         on 0G decentralized storage with a cryptographic Merkle root hash.
 *
 * Tier system:
 *   Diamond: score 90-100 (neon white)
 *   Gold:    score 75-89  (neon amber)
 *   Silver:  score 50-74  (neon cyan)
 *   Bronze:  score 0-49   (neon purple) — not minted, only displayed
 */
contract SoulBoundCredential is ERC721, IERC5192, Ownable {

    // ── Storage ───────────────────────────────────────────────────────────

    uint256 private _nextTokenId;

    struct Credential {
        address  recipient;
        string   skillCategory;      // "code" | "design" | "writing" | "document" | "other"
        uint256  score;              // 0-100 overall
        uint256  originalityScore;
        uint256  qualityScore;
        uint256  complexityScore;
        uint256  authenticityScore;
        string   proofRootHash;      // 0G Storage hash of the full verification JSON
        string   fileRootHash;       // 0G Storage hash of the portfolio file
        uint256  timestamp;          // block.timestamp at mint
        string   metadataURI;        // on-chain metadata URI (JSON)
    }

    mapping(uint256 => Credential)   public  credentials;
    mapping(address  => uint256[])   private _walletTokens;
    mapping(string   => uint256)     private _fileHashToToken;  // fileRootHash → tokenId (0 = not minted)

    // ── Events ────────────────────────────────────────────────────────────

    event CredentialMinted(
        uint256 indexed tokenId,
        address indexed recipient,
        string          skillCategory,
        uint256         score,
        string          proofRootHash,
        string          fileRootHash
    );

    // ── Errors ────────────────────────────────────────────────────────────

    error SoulBoundNonTransferable();
    error ScoreTooLow(uint256 score, uint256 minimum);
    error AlreadyMinted(string fileRootHash, uint256 existingTokenId);
    error TokenDoesNotExist(uint256 tokenId);

    // ── Constructor ───────────────────────────────────────────────────────

    constructor() ERC721("TrustFolio Credential", "TFCRED") Ownable(msg.sender) {
        _nextTokenId = 1;
    }

    // ── ERC-5192 ──────────────────────────────────────────────────────────

    /// @notice All TrustFolio credentials are permanently locked (soul-bound).
    function locked(uint256 /*tokenId*/) external pure override returns (bool) {
        return true;
    }

    // ── Transfer override (OZ v5 pattern) ─────────────────────────────────

    /**
     * @dev Block all transfers except minting (from == address(0)).
     *      Uses the OZ v5 _update hook.
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0)) {
            revert SoulBoundNonTransferable();
        }
        return super._update(to, tokenId, auth);
    }

    // ── Minting ───────────────────────────────────────────────────────────

    /**
     * @notice Mint a soul-bound credential to a recipient.
     * @dev    Only callable by contract owner (TrustFolio server wallet).
     *         Requires score >= 50 (Silver tier or above).
     *         Each fileRootHash can only be minted once.
     */
    function mintCredential(
        address recipient,
        string  memory skillCategory,
        uint256 score,
        uint256 originalityScore,
        uint256 qualityScore,
        uint256 complexityScore,
        uint256 authenticityScore,
        string  memory proofRootHash,
        string  memory fileRootHash,
        string  memory metadataURI
    ) external onlyOwner returns (uint256) {
        if (score < 50) revert ScoreTooLow(score, 50);

        uint256 existing = _fileHashToToken[fileRootHash];
        if (existing != 0) revert AlreadyMinted(fileRootHash, existing);

        uint256 tokenId = _nextTokenId++;

        _safeMint(recipient, tokenId);
        emit Locked(tokenId);

        credentials[tokenId] = Credential({
            recipient:          recipient,
            skillCategory:      skillCategory,
            score:              score,
            originalityScore:   originalityScore,
            qualityScore:       qualityScore,
            complexityScore:    complexityScore,
            authenticityScore:  authenticityScore,
            proofRootHash:      proofRootHash,
            fileRootHash:       fileRootHash,
            timestamp:          block.timestamp,
            metadataURI:        metadataURI
        });

        _walletTokens[recipient].push(tokenId);
        _fileHashToToken[fileRootHash] = tokenId;

        emit CredentialMinted(tokenId, recipient, skillCategory, score, proofRootHash, fileRootHash);

        return tokenId;
    }

    // ── View functions ────────────────────────────────────────────────────

    function getCredential(uint256 tokenId) external view returns (Credential memory) {
        if (tokenId == 0 || tokenId >= _nextTokenId) revert TokenDoesNotExist(tokenId);
        return credentials[tokenId];
    }

    function getWalletTokens(address wallet) external view returns (uint256[] memory) {
        return _walletTokens[wallet];
    }

    function getTokenByFileHash(string memory fileRootHash) external view returns (uint256) {
        return _fileHashToToken[fileRootHash];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (tokenId == 0 || tokenId >= _nextTokenId) revert TokenDoesNotExist(tokenId);
        return credentials[tokenId].metadataURI;
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    // ── supportsInterface ─────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721)
        returns (bool)
    {
        // ERC-5192 interface ID: 0xb45a3c0e
        return interfaceId == 0xb45a3c0e || super.supportsInterface(interfaceId);
    }
}
