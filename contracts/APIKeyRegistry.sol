// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title APIKeyRegistry
 * @notice On-chain API key management for TrustFolio backend services.
 *
 * Keys are stored as keccak256 hashes — raw keys are NEVER stored on-chain.
 *
 * Tiers:
 *   0 = Free  (100 calls / day,   free registration)
 *   1 = Paid  (10 000 calls / day, 0.01 0G upgrade fee)
 *
 * One key per address maximum.
 */
contract APIKeyRegistry is Ownable, ReentrancyGuard {
    // ─── Constants ──────────────────────────────────────────────────────────
    uint256 public constant FREE_DAILY_LIMIT = 100;
    uint256 public constant PAID_DAILY_LIMIT = 10_000;
    uint256 public constant UPGRADE_FEE      = 0.01 ether;  // 0.01 0G
    uint256 public constant SECONDS_PER_DAY  = 86_400;

    // ─── Structs ─────────────────────────────────────────────────────────────
    struct KeyRecord {
        address owner;
        bytes32 keyHash;
        uint256 tier;           // 0 = Free, 1 = Paid
        uint256 dailyLimit;
        uint256 usageToday;
        uint256 lastUsedDay;    // block.timestamp / 86400
        bool    active;
        uint256 registeredAt;
    }

    // ─── State ───────────────────────────────────────────────────────────────
    /// @dev keyHash → KeyRecord
    mapping(bytes32 => KeyRecord) private _keys;

    /// @dev owner address → their keyHash (one per address)
    mapping(address => bytes32) private _ownerKey;

    uint256 public totalKeys;
    uint256 public collectedFees;

    // ─── Events ──────────────────────────────────────────────────────────────
    event KeyRegistered(address indexed owner, bytes32 indexed keyHash, uint256 tier);
    event KeyUpgraded(address indexed owner, bytes32 indexed keyHash);
    event KeyRevoked(address indexed owner, bytes32 indexed keyHash);
    event KeyUsed(bytes32 indexed keyHash, uint256 usageToday, uint256 day);

    // ─── Constructor ─────────────────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ─── Registration ────────────────────────────────────────────────────────

    /**
     * @notice Register a free-tier API key.
     * @param keyHash keccak256 hash of the raw API key string.
     */
    function registerKey(bytes32 keyHash) external {
        require(keyHash != bytes32(0),              "APIKeyRegistry: empty hash");
        require(_ownerKey[msg.sender] == bytes32(0),"APIKeyRegistry: already has key");
        require(!_keys[keyHash].active,             "APIKeyRegistry: hash already used");
        require(_keys[keyHash].registeredAt == 0,  "APIKeyRegistry: hash already registered");

        _keys[keyHash] = KeyRecord({
            owner:        msg.sender,
            keyHash:      keyHash,
            tier:         0,
            dailyLimit:   FREE_DAILY_LIMIT,
            usageToday:   0,
            lastUsedDay:  0,
            active:       true,
            registeredAt: block.timestamp
        });

        _ownerKey[msg.sender] = keyHash;
        totalKeys++;

        emit KeyRegistered(msg.sender, keyHash, 0);
    }

    /**
     * @notice Upgrade an existing free-tier key to paid tier.
     *         Requires payment of exactly UPGRADE_FEE (0.01 0G).
     * @param keyHash The hash of the key to upgrade.
     */
    function upgradeKey(bytes32 keyHash) external payable nonReentrant {
        require(msg.value == UPGRADE_FEE,        "APIKeyRegistry: wrong fee");
        KeyRecord storage rec = _keys[keyHash];
        require(rec.active,                      "APIKeyRegistry: key not active");
        require(rec.owner == msg.sender,         "APIKeyRegistry: not owner");
        require(rec.tier == 0,                   "APIKeyRegistry: already paid tier");

        rec.tier       = 1;
        rec.dailyLimit = PAID_DAILY_LIMIT;
        collectedFees += msg.value;

        emit KeyUpgraded(msg.sender, keyHash);
    }

    /**
     * @notice Revoke (deactivate) a key.  Only the key owner can revoke their own key.
     * @param keyHash The hash of the key to revoke.
     */
    function revokeKey(bytes32 keyHash) external {
        KeyRecord storage rec = _keys[keyHash];
        require(rec.owner == msg.sender, "APIKeyRegistry: not owner");
        require(rec.active,              "APIKeyRegistry: already revoked");

        rec.active = false;
        _ownerKey[msg.sender] = bytes32(0);

        emit KeyRevoked(msg.sender, keyHash);
    }

    // ─── Backend validation ──────────────────────────────────────────────────

    /**
     * @notice Validate a key and increment its daily usage counter.
     *         Reverts if the key is inactive or has exceeded its daily limit.
     *         Called by the TrustFolio backend on each API request.
     * @param keyHash keccak256 hash of the presented API key.
     */
    function validateAndCount(bytes32 keyHash) external {
        KeyRecord storage rec = _keys[keyHash];
        require(rec.active, "APIKeyRegistry: key not active");

        uint256 today = _today();

        // Reset counter if this is a new day
        if (rec.lastUsedDay < today) {
            rec.usageToday  = 0;
            rec.lastUsedDay = today;
        }

        require(
            rec.usageToday < rec.dailyLimit,
            "APIKeyRegistry: daily limit exceeded"
        );

        rec.usageToday++;

        emit KeyUsed(keyHash, rec.usageToday, today);
    }

    // ─── View functions ──────────────────────────────────────────────────────

    /**
     * @notice Returns the full KeyRecord for `keyHash`.
     */
    function getKey(bytes32 keyHash) external view returns (KeyRecord memory) {
        require(_keys[keyHash].registeredAt > 0, "APIKeyRegistry: key not found");
        return _keys[keyHash];
    }

    /**
     * @notice Returns the keyHash registered by `owner`.
     */
    function getOwnerKey(address owner) external view returns (bytes32) {
        bytes32 h = _ownerKey[owner];
        require(h != bytes32(0), "APIKeyRegistry: no key for owner");
        return h;
    }

    // ─── Owner: withdraw fees ────────────────────────────────────────────────

    /**
     * @notice Withdraw accumulated upgrade fees to owner.
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = collectedFees;
        require(amount > 0, "APIKeyRegistry: no fees");
        collectedFees = 0;
        (bool ok, ) = owner().call{value: amount}("");
        require(ok, "APIKeyRegistry: transfer failed");
    }

    // ─── Internal ────────────────────────────────────────────────────────────

    function _today() internal view returns (uint256) {
        return block.timestamp / SECONDS_PER_DAY;
    }
}
