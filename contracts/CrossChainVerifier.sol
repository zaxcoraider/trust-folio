// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CrossChainVerifier
 * @notice Stores and exports credential proofs that can be verified on other EVM chains.
 *
 * A proof bundle is identified by a `rootHash` string (e.g. IPFS CID or Merkle root).
 * Any other chain can call verifyProof / decode the exported ABI bundle to confirm
 * the credential without needing access to 0G Chain state.
 */
contract CrossChainVerifier is Ownable {
    // ─── Structs ─────────────────────────────────────────────────────────────
    struct ProofRecord {
        address signer;
        uint256 score;
        string  tier;
        string  skillCategory;
        uint256 timestamp;
        bool    valid;
    }

    // ─── State ───────────────────────────────────────────────────────────────
    /// @dev rootHash (string) → ProofRecord
    mapping(bytes32 => ProofRecord) private _proofs;

    /// @dev store raw string rootHash for enumeration / export
    mapping(bytes32 => string) private _rootHashStrings;

    uint256 public proofCount;

    // ─── Events ──────────────────────────────────────────────────────────────
    event ProofPublished(
        string  indexed rootHash,
        address indexed signer,
        uint256         score,
        string          tier,
        string          skillCategory,
        uint256         timestamp
    );
    event ProofInvalidated(string indexed rootHash, uint256 timestamp);

    // ─── Constructor ─────────────────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ─── Owner functions ─────────────────────────────────────────────────────

    /**
     * @notice Publish a new credential proof.
     * @param rootHash      Unique identifier (e.g. Merkle root or IPFS CID).
     * @param signer        Address that attested the credential.
     * @param score         Numeric trust score (0–1000).
     * @param tier          Tier string: "Bronze" | "Silver" | "Gold" | "Diamond".
     * @param skillCategory E.g. "Solidity", "React", "DevOps".
     */
    function publishProof(
        string calldata rootHash,
        address         signer,
        uint256         score,
        string calldata tier,
        string calldata skillCategory
    ) external onlyOwner {
        require(bytes(rootHash).length > 0,      "CrossChainVerifier: empty rootHash");
        require(signer != address(0),            "CrossChainVerifier: zero signer");
        require(bytes(tier).length > 0,          "CrossChainVerifier: empty tier");
        require(bytes(skillCategory).length > 0, "CrossChainVerifier: empty skill");

        bytes32 key = keccak256(bytes(rootHash));
        require(!_proofs[key].valid, "CrossChainVerifier: proof already exists");

        _proofs[key] = ProofRecord({
            signer:        signer,
            score:         score,
            tier:          tier,
            skillCategory: skillCategory,
            timestamp:     block.timestamp,
            valid:         true
        });

        _rootHashStrings[key] = rootHash;
        proofCount++;

        emit ProofPublished(rootHash, signer, score, tier, skillCategory, block.timestamp);
    }

    /**
     * @notice Invalidate an existing proof (e.g. credential revoked).
     */
    function invalidateProof(string calldata rootHash) external onlyOwner {
        bytes32 key = keccak256(bytes(rootHash));
        require(_proofs[key].timestamp > 0, "CrossChainVerifier: proof not found");
        require(_proofs[key].valid,         "CrossChainVerifier: already invalid");

        _proofs[key].valid = false;
        emit ProofInvalidated(rootHash, block.timestamp);
    }

    // ─── Public view functions ───────────────────────────────────────────────

    /**
     * @notice Returns the ProofRecord for `rootHash`.
     */
    function verifyProof(string calldata rootHash)
        external
        view
        returns (ProofRecord memory)
    {
        bytes32 key = keccak256(bytes(rootHash));
        require(_proofs[key].timestamp > 0, "CrossChainVerifier: proof not found");
        return _proofs[key];
    }

    /**
     * @notice Returns an ABI-encoded proof bundle suitable for cross-chain verification.
     *         The receiving chain can abi.decode(bundle, (address, uint256, string, string, uint256, bool)).
     */
    function exportProof(string calldata rootHash)
        external
        view
        returns (bytes memory bundle)
    {
        bytes32 key = keccak256(bytes(rootHash));
        require(_proofs[key].timestamp > 0, "CrossChainVerifier: proof not found");

        ProofRecord storage p = _proofs[key];
        bundle = abi.encode(
            p.signer,
            p.score,
            p.tier,
            p.skillCategory,
            p.timestamp,
            p.valid
        );
    }

    /**
     * @notice Returns total number of proofs published (including invalidated).
     */
    function getProofCount() external view returns (uint256) {
        return proofCount;
    }
}
