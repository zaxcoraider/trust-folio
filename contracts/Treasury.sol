// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Treasury
 * @notice DAO Treasury that accumulates fees from Marketplace and HiringEscrow (native 0G).
 *         The owner (set to the TimeLock / Governor) authorises all spending.
 *
 * Fee flow:
 *   Marketplace / HiringEscrow → depositFees() → Treasury
 *   Owner (TimeLock)           → spend()        → recipient
 */
contract Treasury is Ownable, ReentrancyGuard {
    // ─── State ───────────────────────────────────────────────────────────────
    uint256 public totalReceived;
    uint256 public totalSpent;

    // ─── Events ──────────────────────────────────────────────────────────────
    event FeeDeposited(address indexed from, uint256 amount, uint256 newTotal);
    event Spent(address indexed to, uint256 amount, string reason);

    // ─── Constructor ─────────────────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ─── Receive native tokens ───────────────────────────────────────────────

    /**
     * @notice Accepts 0G deposits from marketplace and hiring contracts.
     */
    function depositFees() external payable {
        require(msg.value > 0, "Treasury: zero deposit");
        totalReceived += msg.value;
        emit FeeDeposited(msg.sender, msg.value, address(this).balance);
    }

    /**
     * @dev Plain ETH transfers also accepted.
     */
    receive() external payable {
        if (msg.value > 0) {
            totalReceived += msg.value;
            emit FeeDeposited(msg.sender, msg.value, address(this).balance);
        }
    }

    // ─── Owner spend ─────────────────────────────────────────────────────────

    /**
     * @notice Execute a DAO-approved spend.
     * @param to     Recipient address.
     * @param amount Amount in wei (0G).
     * @param reason Human-readable spend reason for on-chain audit trail.
     */
    function spend(
        address payable to,
        uint256 amount,
        string calldata reason
    ) external onlyOwner nonReentrant {
        require(to != address(0),               "Treasury: zero recipient");
        require(amount > 0,                     "Treasury: zero amount");
        require(address(this).balance >= amount,"Treasury: insufficient balance");
        require(bytes(reason).length > 0,       "Treasury: empty reason");

        totalSpent += amount;

        (bool ok, ) = to.call{value: amount}("");
        require(ok, "Treasury: transfer failed");

        emit Spent(to, amount, reason);
    }

    // ─── View helpers ────────────────────────────────────────────────────────

    /**
     * @notice Current 0G balance held in treasury.
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
