// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Staking
 * @notice TRUST token staking contract with 8% APY reward pool fed by marketplace fees.
 *
 * Boost tiers (profile-visibility):
 *   Bronze  ≥    100 TRUST
 *   Silver  ≥    500 TRUST
 *   Gold    ≥  2 000 TRUST
 *   Diamond ≥ 10 000 TRUST
 */
contract Staking is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ─── Constants ──────────────────────────────────────────────────────────
    uint256 public constant APY_BPS            = 800;   // 8 % expressed in basis points
    uint256 public constant BPS_DENOMINATOR    = 10_000;
    uint256 public constant SECONDS_PER_YEAR   = 365 days;

    uint256 public constant BRONZE_THRESHOLD   =    100 * 1e18;
    uint256 public constant SILVER_THRESHOLD   =    500 * 1e18;
    uint256 public constant GOLD_THRESHOLD     =  2_000 * 1e18;
    uint256 public constant DIAMOND_THRESHOLD  = 10_000 * 1e18;

    // ─── State ───────────────────────────────────────────────────────────────
    IERC20 public immutable trustToken;

    struct StakeInfo {
        uint256 amount;          // tokens staked
        uint256 rewardDebt;      // already-accounted reward (scaled)
        uint256 lastUpdateTime;  // timestamp of last interaction
        uint256 pendingRewards;  // accumulated but unclaimed rewards
    }

    mapping(address => StakeInfo) private _stakes;
    mapping(address => bool) public hasBoost;

    uint256 public totalStaked;
    uint256 public totalRewardsPool;     // available reward tokens in this contract

    // ─── Events ──────────────────────────────────────────────────────────────
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardsDeposited(address indexed by, uint256 amount);

    // ─── Constructor ─────────────────────────────────────────────────────────
    constructor(address _trustToken) Ownable(msg.sender) {
        require(_trustToken != address(0), "Staking: zero token");
        trustToken = IERC20(_trustToken);
    }

    // ─── Internal reward accounting ──────────────────────────────────────────

    /**
     * @dev Snapshot any accrued rewards for `user` into pendingRewards.
     */
    function _updateRewards(address user) internal {
        StakeInfo storage info = _stakes[user];
        if (info.amount > 0 && info.lastUpdateTime > 0) {
            uint256 elapsed = block.timestamp - info.lastUpdateTime;
            // reward = staked * APY * elapsed / (seconds_per_year * 10000)
            uint256 accrued = (info.amount * APY_BPS * elapsed) /
                (SECONDS_PER_YEAR * BPS_DENOMINATOR);
            info.pendingRewards += accrued;
        }
        info.lastUpdateTime = block.timestamp;
    }

    // ─── External functions ──────────────────────────────────────────────────

    /**
     * @notice Deposit TRUST tokens as rewards (called by owner with marketplace fees).
     */
    function depositRewards(uint256 amount) external onlyOwner {
        require(amount > 0, "Staking: zero amount");
        trustToken.safeTransferFrom(msg.sender, address(this), amount);
        totalRewardsPool += amount;
        emit RewardsDeposited(msg.sender, amount);
    }

    /**
     * @notice Stake TRUST tokens.
     */
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Staking: zero amount");

        _updateRewards(msg.sender);

        trustToken.safeTransferFrom(msg.sender, address(this), amount);

        _stakes[msg.sender].amount += amount;
        totalStaked += amount;

        _updateBoost(msg.sender);

        emit Staked(msg.sender, amount);
    }

    /**
     * @notice Unstake TRUST tokens (rewards not auto-claimed — call claimRewards separately).
     */
    function unstake(uint256 amount) external nonReentrant {
        StakeInfo storage info = _stakes[msg.sender];
        require(amount > 0, "Staking: zero amount");
        require(info.amount >= amount, "Staking: insufficient stake");

        _updateRewards(msg.sender);

        info.amount  -= amount;
        totalStaked  -= amount;

        _updateBoost(msg.sender);

        trustToken.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    /**
     * @notice Claim all pending rewards.
     */
    function claimRewards() external nonReentrant {
        _updateRewards(msg.sender);

        StakeInfo storage info = _stakes[msg.sender];
        uint256 pending = info.pendingRewards;
        require(pending > 0, "Staking: no rewards");
        require(totalRewardsPool >= pending, "Staking: rewards pool empty");

        info.pendingRewards  = 0;
        totalRewardsPool    -= pending;

        trustToken.safeTransfer(msg.sender, pending);

        emit RewardsClaimed(msg.sender, pending);
    }

    // ─── Internal boost helper ───────────────────────────────────────────────

    function _updateBoost(address user) internal {
        hasBoost[user] = _stakes[user].amount >= BRONZE_THRESHOLD;
    }

    // ─── View functions ──────────────────────────────────────────────────────

    /**
     * @notice Returns the staked amount and pending rewards for `user`.
     */
    function getStakeInfo(address user)
        external
        view
        returns (uint256 stakedAmount, uint256 pending)
    {
        StakeInfo storage info = _stakes[user];
        stakedAmount = info.amount;
        pending      = _computePending(user);
    }

    /**
     * @notice Returns only the pending (unclaimed) rewards for `user`.
     */
    function getPendingRewards(address user) external view returns (uint256) {
        return _computePending(user);
    }

    /**
     * @notice Returns total TRUST currently staked across all users.
     */
    function getTotalStaked() external view returns (uint256) {
        return totalStaked;
    }

    /**
     * @notice Returns the boost tier string for `user`.
     */
    function getBoostTier(address user) external view returns (string memory) {
        uint256 amount = _stakes[user].amount;
        if (amount >= DIAMOND_THRESHOLD) return "Diamond";
        if (amount >= GOLD_THRESHOLD)    return "Gold";
        if (amount >= SILVER_THRESHOLD)  return "Silver";
        if (amount >= BRONZE_THRESHOLD)  return "Bronze";
        return "None";
    }

    // ─── Internal view ───────────────────────────────────────────────────────

    function _computePending(address user) internal view returns (uint256) {
        StakeInfo storage info = _stakes[user];
        uint256 pending = info.pendingRewards;
        if (info.amount > 0 && info.lastUpdateTime > 0) {
            uint256 elapsed = block.timestamp - info.lastUpdateTime;
            pending += (info.amount * APY_BPS * elapsed) /
                (SECONDS_PER_YEAR * BPS_DENOMINATOR);
        }
        return pending;
    }
}
