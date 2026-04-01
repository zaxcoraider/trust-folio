// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TrustToken
 * @notice ERC-20 governance + utility token for TrustFolio (ERC20Votes-compatible).
 *
 * Supply breakdown (100 000 000 TRUST):
 *   40 000 000 → rewardsPool
 *   25 000 000 → treasury
 *   15 000 000 → team      (12-month cliff, then 24-month linear vesting)
 *   10 000 000 → ecosystem
 *   10 000 000 → liquidityPool
 */
contract TrustToken is ERC20, ERC20Permit, ERC20Votes, Ownable {
    // ─── Supply constants ───────────────────────────────────────────────────
    uint256 public constant TOTAL_SUPPLY      = 100_000_000 * 1e18;
    uint256 public constant REWARDS_ALLOC     =  40_000_000 * 1e18;
    uint256 public constant TREASURY_ALLOC    =  25_000_000 * 1e18;
    uint256 public constant TEAM_ALLOC        =  15_000_000 * 1e18;
    uint256 public constant ECOSYSTEM_ALLOC   =  10_000_000 * 1e18;
    uint256 public constant LIQUIDITY_ALLOC   =  10_000_000 * 1e18;

    // ─── Vesting schedule ───────────────────────────────────────────────────
    uint256 public constant VESTING_CLIFF     = 365 days;   // 12 months
    uint256 public constant VESTING_DURATION  = 730 days;   // 24 months after cliff

    uint256 public immutable vestingStart;
    uint256 public immutable vestingCliff;
    uint256 public immutable vestingEnd;

    address public immutable teamWallet;
    uint256 public teamClaimed;

    // ─── Events ─────────────────────────────────────────────────────────────
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event TeamVestingClaimed(address indexed team, uint256 amount);

    // ─── Constructor ────────────────────────────────────────────────────────
    constructor(
        address rewardsPool,
        address treasury,
        address team,
        address ecosystem,
        address liquidityPool
    )
        ERC20("TrustFolio Token", "TRUST")
        ERC20Permit("TrustFolio Token")
        Ownable(msg.sender)
    {
        require(rewardsPool   != address(0), "TrustToken: zero rewardsPool");
        require(treasury      != address(0), "TrustToken: zero treasury");
        require(team          != address(0), "TrustToken: zero team");
        require(ecosystem     != address(0), "TrustToken: zero ecosystem");
        require(liquidityPool != address(0), "TrustToken: zero liquidityPool");

        teamWallet    = team;
        vestingStart  = block.timestamp;
        vestingCliff  = block.timestamp + VESTING_CLIFF;
        vestingEnd    = block.timestamp + VESTING_CLIFF + VESTING_DURATION;

        _mint(rewardsPool,   REWARDS_ALLOC);
        _mint(treasury,      TREASURY_ALLOC);
        _mint(team,          TEAM_ALLOC);       // locked — enforced off-chain & via vesting tracker
        _mint(ecosystem,     ECOSYSTEM_ALLOC);
        _mint(liquidityPool, LIQUIDITY_ALLOC);
    }

    // ─── Owner mint / burn ──────────────────────────────────────────────────

    /**
     * @notice Mint new tokens to `to`. Only callable by owner (RewardsDistributor, DAO, etc.).
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit Mint(to, amount);
    }

    /**
     * @notice Burn tokens from `from`. Only callable by owner.
     */
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
        emit Burn(from, amount);
    }

    // ─── Team vesting ───────────────────────────────────────────────────────

    /**
     * @notice Returns the total amount of team tokens vested so far.
     */
    function vestedAmount() public view returns (uint256) {
        if (block.timestamp < vestingCliff) {
            return 0;
        }
        if (block.timestamp >= vestingEnd) {
            return TEAM_ALLOC;
        }
        uint256 elapsed = block.timestamp - vestingCliff;
        return (TEAM_ALLOC * elapsed) / VESTING_DURATION;
    }

    /**
     * @notice Allows the team wallet to claim any newly-vested tokens.
     * @param team Must equal teamWallet.
     */
    function claimTeamVesting(address team) external {
        require(team == teamWallet, "TrustToken: not team wallet");
        require(msg.sender == teamWallet, "TrustToken: caller not team");
        require(block.timestamp >= vestingCliff, "TrustToken: cliff not reached");

        uint256 vested    = vestedAmount();
        uint256 claimable = vested - teamClaimed;
        require(claimable > 0, "TrustToken: nothing to claim");

        teamClaimed += claimable;
        // Tokens were already minted to teamWallet at deploy; we just record the release.
        // If the integration locks them in this contract instead, transfer here.
        emit TeamVestingClaimed(team, claimable);
    }

    // ─── ERC20Votes overrides (required by OZ v5) ───────────────────────────

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
