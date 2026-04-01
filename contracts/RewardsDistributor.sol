// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RewardsDistributor
 * @notice Verify-to-earn: distributes TRUST tokens to users after AI credential verification.
 *
 * Tier rewards:
 *   Diamond = 100 TRUST
 *   Gold    =  50 TRUST
 *   Silver  =  25 TRUST
 *   Bronze  =  10 TRUST
 *
 * Daily cap per user: 500 TRUST (resets every UTC day, keyed by block.timestamp / 86400).
 */

interface ITrustToken {
    function mint(address to, uint256 amount) external;
}

contract RewardsDistributor is Ownable {
    // ─── Constants ──────────────────────────────────────────────────────────
    uint256 public constant DIAMOND_REWARD = 100 * 1e18;
    uint256 public constant GOLD_REWARD    =  50 * 1e18;
    uint256 public constant SILVER_REWARD  =  25 * 1e18;
    uint256 public constant BRONZE_REWARD  =  10 * 1e18;
    uint256 public constant DAILY_CAP      = 500 * 1e18;
    uint256 public constant SECONDS_PER_DAY = 86_400;

    // ─── State ───────────────────────────────────────────────────────────────
    ITrustToken public immutable trustToken;

    /// @dev verifier address → approved flag
    mapping(address => bool) public isVerifier;

    /// @dev day-index → user → total earned that day
    mapping(uint256 => mapping(address => uint256)) private _dailyEarned;

    // ─── Events ──────────────────────────────────────────────────────────────
    event VerifierRegistered(address indexed verifier);
    event VerifierRemoved(address indexed verifier);
    event RewardDistributed(
        address indexed user,
        string  tier,
        uint256 amount,
        uint256 day
    );
    event DailyCapped(address indexed user, uint256 day, uint256 attempted);

    // ─── Constructor ─────────────────────────────────────────────────────────
    constructor(address _trustToken) Ownable(msg.sender) {
        require(_trustToken != address(0), "RewardsDistributor: zero token");
        trustToken = ITrustToken(_trustToken);
    }

    // ─── Owner: verifier management ──────────────────────────────────────────

    function registerVerifier(address verifier) external onlyOwner {
        require(verifier != address(0), "RewardsDistributor: zero address");
        isVerifier[verifier] = true;
        emit VerifierRegistered(verifier);
    }

    function removeVerifier(address verifier) external onlyOwner {
        isVerifier[verifier] = false;
        emit VerifierRemoved(verifier);
    }

    // ─── Core: distribute reward ─────────────────────────────────────────────

    /**
     * @notice Mints TRUST to `user` based on their verification `tier`.
     * @dev    Called by a registered verifier (backend AI oracle).
     * @param  user  Recipient of the reward.
     * @param  tier  One of "Diamond", "Gold", "Silver", "Bronze" (case-sensitive).
     */
    function distributeVerifyReward(address user, string calldata tier)
        external
    {
        require(isVerifier[msg.sender], "RewardsDistributor: not a verifier");
        require(user != address(0), "RewardsDistributor: zero user");

        uint256 reward = _tierReward(tier);
        require(reward > 0, "RewardsDistributor: unknown tier");

        uint256 day   = _today();
        uint256 earned = _dailyEarned[day][user];

        if (earned >= DAILY_CAP) {
            emit DailyCapped(user, day, reward);
            return;
        }

        // Cap at remaining daily allowance
        uint256 remaining = DAILY_CAP - earned;
        uint256 toMint    = reward > remaining ? remaining : reward;

        _dailyEarned[day][user] += toMint;
        trustToken.mint(user, toMint);

        emit RewardDistributed(user, tier, toMint, day);

        if (_dailyEarned[day][user] >= DAILY_CAP) {
            emit DailyCapped(user, day, 0);
        }
    }

    // ─── View functions ──────────────────────────────────────────────────────

    /**
     * @notice Returns the total TRUST earned today by `user`.
     */
    function getDailyEarned(address user) external view returns (uint256) {
        return _dailyEarned[_today()][user];
    }

    /**
     * @notice Returns today's day-index (block.timestamp / 86400).
     */
    function todayIndex() external view returns (uint256) {
        return _today();
    }

    // ─── Internal helpers ────────────────────────────────────────────────────

    function _today() internal view returns (uint256) {
        return block.timestamp / SECONDS_PER_DAY;
    }

    function _tierReward(string calldata tier) internal pure returns (uint256) {
        bytes32 h = keccak256(bytes(tier));
        if (h == keccak256("Diamond")) return DIAMOND_REWARD;
        if (h == keccak256("Gold"))    return GOLD_REWARD;
        if (h == keccak256("Silver"))  return SILVER_REWARD;
        if (h == keccak256("Bronze"))  return BRONZE_REWARD;
        return 0;
    }
}
