// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

/**
 * @title TrustGovernor
 * @notice On-chain governance for TrustFolio using OpenZeppelin Governor v5.
 *
 * Parameters:
 *   Voting delay   : 7 200 blocks  (~1 day at 12 s/block)
 *   Voting period  : 36 000 blocks (~5 days)
 *   Proposal threshold: 1 000 TRUST
 *   Quorum         : 4 % of total supply
 *   Timelock delay : set in TimeLock (2 days)
 */
contract TrustGovernor is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    // ─── Proposal types ──────────────────────────────────────────────────────
    enum ProposalType {
        FeeChange,
        VerificationFee,
        SkillCategory,
        TreasurySpend,
        ContractUpgrade
    }

    // ─── Events ──────────────────────────────────────────────────────────────
    event TrustProposalCreated(
        uint256 indexed proposalId,
        ProposalType    proposalType,
        address         proposer,
        string          description
    );

    // ─── Constructor ─────────────────────────────────────────────────────────
    constructor(
        IVotes            _token,
        TimelockController _timelock
    )
        Governor("TrustGovernor")
        GovernorSettings(
            7_200,               // voting delay  (blocks)
            36_000,              // voting period (blocks)
            1_000 * 1e18         // proposal threshold
        )
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4) // 4 %
        GovernorTimelockControl(_timelock)
    {}

    // ─── Custom proposal wrapper ──────────────────────────────────────────────

    /**
     * @notice Create a TrustFolio-typed governance proposal.
     * @param pType       Category of the proposal.
     * @param targets     Target contract addresses.
     * @param values      ETH values for each call.
     * @param calldatas   Encoded function calls.
     * @param description Human-readable description (used as proposal key).
     * @return proposalId The newly created proposal ID.
     */
    function createTrustProposal(
        ProposalType      pType,
        address[] calldata targets,
        uint256[] calldata values,
        bytes[]   calldata calldatas,
        string    calldata description
    ) external returns (uint256 proposalId) {
        proposalId = propose(targets, values, calldatas, description);
        emit TrustProposalCreated(proposalId, pType, msg.sender, description);
    }

    // ─── Required overrides (OZ Governor v5) ────────────────────────────────

    function votingDelay()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(Governor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function proposalNeedsQueuing(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.proposalNeedsQueuing(proposalId);
    }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[]   memory calldatas,
        bytes32   descriptionHash
    )
        internal
        override(Governor, GovernorTimelockControl)
        returns (uint48)
    {
        return super._queueOperations(
            proposalId, targets, values, calldatas, descriptionHash
        );
    }

    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[]   memory calldatas,
        bytes32   descriptionHash
    )
        internal
        override(Governor, GovernorTimelockControl)
    {
        super._executeOperations(
            proposalId, targets, values, calldatas, descriptionHash
        );
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[]   memory calldatas,
        bytes32   descriptionHash
    )
        internal
        override(Governor, GovernorTimelockControl)
        returns (uint256)
    {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }
}
