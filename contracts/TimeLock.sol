// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title TimeLock
 * @notice Thin wrapper around OpenZeppelin v5 TimelockController.
 *         Enforces a minimum 2-day (172 800 s) delay on all DAO operations.
 *
 * Constructor params:
 *   proposers  — addresses allowed to schedule operations (typically the Governor)
 *   executors  — addresses allowed to execute ready operations (address(0) = anyone)
 *   admin      — optional initial admin; set to address(0) to make the contract self-governing
 */
contract TimeLock is TimelockController {
    uint256 public constant MIN_DELAY = 2 days; // 172 800 seconds

    constructor(
        address[] memory proposers,
        address[] memory executors,
        address admin
    )
        TimelockController(MIN_DELAY, proposers, executors, admin)
    {}
}
