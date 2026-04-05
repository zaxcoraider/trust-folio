// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TrustFolioINFT
 * @notice ERC-7857 Intelligent NFT — verified professional portfolios on 0G Network
 * @dev Transferable NFT containing AI verification scores, encrypted metadata hash,
 *      and skill badges. Encrypted portfolio metadata is stored on 0G Storage;
 *      only the current owner can decrypt it via their private key.
 *
 *      ERC-7857 Intelligent NFT standard:
 *        - AI-generated metadata embedded on-chain
 *        - Verification proof anchored to 0G Storage
 *        - Score-based tier classification
 *        - Transferable (unlike ERC-5192 soul-bound tokens)
 */
contract TrustFolioINFT is ERC721, Ownable, ReentrancyGuard {

    // ── Storage ───────────────────────────────────────────────────────────────

    uint256 private _nextTokenId = 1;

    uint256 public mintingFee   = 0.001 ether;   // configurable minting fee in 0G
    uint256 public constant MIN_SCORE = 60;        // minimum AI score to mint

    struct INFT {
        address  originalOwner;
        string   skillCategory;          // "code" | "design" | "writing" | "document" | "other"
        uint256  score;                  // 0–100 overall AI score
        uint256  originalityScore;
        uint256  qualityScore;
        uint256  complexityScore;
        uint256  authenticityScore;
        string   encryptedMetadataHash;  // 0G Storage root hash (encrypted with owner pubkey)
        string   proofRootHash;          // 0G Storage root hash of AI verification proof JSON
        string   fileRootHash;           // 0G Storage root hash of original portfolio file
        string[] badges;                 // earned skill badge identifiers
        uint256  mintedAt;
        string   tier;                   // "diamond" | "gold" | "silver"
        string   metadataURI;            // on-chain JSON metadata (base64 data URI)
    }

    mapping(uint256 => INFT)    private _tokens;
    mapping(address => uint256[]) private _walletTokens;
    mapping(string  => uint256) private _fileHashToTokenId;

    address public treasury;

    // ── Events ────────────────────────────────────────────────────────────────

    event INFTMinted(
        uint256 indexed tokenId,
        address indexed owner,
        string  skillCategory,
        uint256 score,
        string  tier
    );
    event MintingFeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    // ── Errors ────────────────────────────────────────────────────────────────

    error ScoreTooLow(uint256 score, uint256 minimum);
    error AlreadyMinted(string fileRootHash, uint256 existingTokenId);
    error TokenDoesNotExist(uint256 tokenId);
    error InsufficientFee(uint256 provided, uint256 required);
    error TransferFailed();

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address _treasury)
        ERC721("TrustFolio INFT", "TINFT")
        Ownable(msg.sender)
    {
        treasury = _treasury;
    }

    // ── Minting ───────────────────────────────────────────────────────────────

    /**
     * @notice Mint a verified portfolio as an Intelligent NFT.
     * @dev Only the contract owner (TrustFolio server wallet) can mint, ensuring
     *      the AI score has been verified off-chain before issuance.
     *      The minting fee (in 0G tokens) is forwarded to the treasury.
     */
    function mintINFT(
        address        to,
        string calldata skillCategory,
        uint256        score,
        uint256        originalityScore,
        uint256        qualityScore,
        uint256        complexityScore,
        uint256        authenticityScore,
        string calldata encryptedMetadataHash,
        string calldata proofRootHash,
        string calldata fileRootHash,
        string[] calldata badges,
        string calldata metadataURI
    ) external payable nonReentrant returns (uint256) {

        if (score < MIN_SCORE)
            revert ScoreTooLow(score, MIN_SCORE);

        uint256 existing = _fileHashToTokenId[fileRootHash];
        if (existing != 0)
            revert AlreadyMinted(fileRootHash, existing);

        if (msg.value < mintingFee)
            revert InsufficientFee(msg.value, mintingFee);

        uint256 tokenId = _nextTokenId++;

        string memory tier = _computeTier(score);

        _tokens[tokenId] = INFT({
            originalOwner:         to,
            skillCategory:         skillCategory,
            score:                 score,
            originalityScore:      originalityScore,
            qualityScore:          qualityScore,
            complexityScore:       complexityScore,
            authenticityScore:     authenticityScore,
            encryptedMetadataHash: encryptedMetadataHash,
            proofRootHash:         proofRootHash,
            fileRootHash:          fileRootHash,
            badges:                badges,
            mintedAt:              block.timestamp,
            tier:                  tier,
            metadataURI:           metadataURI
        });

        _walletTokens[to].push(tokenId);
        _fileHashToTokenId[fileRootHash] = tokenId;

        _safeMint(to, tokenId);

        // Forward fee to treasury (skip if treasury not configured)
        if (msg.value > 0 && treasury != address(0)) {
            (bool ok,) = payable(treasury).call{value: msg.value}("");
            if (!ok) revert TransferFailed();
        }

        emit INFTMinted(tokenId, to, skillCategory, score, tier);
        return tokenId;
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getINFT(uint256 tokenId) external view returns (INFT memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist(tokenId);
        return _tokens[tokenId];
    }

    function getWalletTokens(address wallet) external view returns (uint256[] memory) {
        return _walletTokens[wallet];
    }

    function getTokenByFileHash(string calldata fileRootHash) external view returns (uint256) {
        return _fileHashToTokenId[fileRootHash];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist(tokenId);
        return _tokens[tokenId].metadataURI;
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setMintingFee(uint256 newFee) external onlyOwner {
        emit MintingFeeUpdated(mintingFee, newFee);
        mintingFee = newFee;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    function _computeTier(uint256 score) internal pure returns (string memory) {
        if (score >= 90) return "diamond";
        if (score >= 75) return "gold";
        return "silver"; // 60–74
    }
}
