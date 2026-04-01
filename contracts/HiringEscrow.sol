// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TrustFolioHiringEscrow
 * @notice Escrow-based hiring agreements between employers and TrustFolio-verified talent.
 *
 * @dev State machine per request:
 *
 *   Pending ──► Accepted ──► Completed ──► Released
 *      │                         │
 *      ├──► Declined (refund)    └──► Disputed ──► (admin resolves)
 *      └──► Cancelled (refund)                ├──► Released (to talent)
 *                                             └──► Cancelled (refund employer)
 *
 *   Auto-release: 7 days after talent marks completion, anyone can trigger auto-release.
 *   Platform fee: 2.5% of escrow amount deducted on successful release.
 */
contract TrustFolioHiringEscrow is Ownable, ReentrancyGuard {

    // ── Constants ─────────────────────────────────────────────────────────────

    uint256 public constant AUTO_RELEASE_DELAY  = 7 days;
    uint256 public constant PLATFORM_FEE_BPS    = 250;   // 2.5%
    uint256 public constant BPS                 = 10_000;

    // ── Types ─────────────────────────────────────────────────────────────────

    enum Status {
        Pending,    // 0 – request created, awaiting talent response
        Accepted,   // 1 – talent accepted, work in progress
        Completed,  // 2 – talent confirmed completion, awaiting employer release or auto-release
        Released,   // 3 – payment released to talent
        Disputed,   // 4 – dispute raised, awaiting admin resolution
        Cancelled,  // 5 – cancelled (refund to employer)
        Declined    // 6 – talent declined (refund to employer)
    }

    struct HiringRequest {
        uint256 requestId;
        address employer;
        address talent;
        uint256 amount;            // escrow amount in wei
        string  title;
        string  description;
        uint256 deadline;          // Unix timestamp (informational)
        uint256 createdAt;
        uint256 acceptedAt;
        uint256 completedAt;
        Status  status;
        bool    talentConfirmed;   // talent marked job done
        bool    employerReleased;  // employer explicitly released payment
    }

    // ── Storage ───────────────────────────────────────────────────────────────

    uint256 private _nextRequestId = 1;

    mapping(uint256 => HiringRequest) public requests;
    mapping(address => uint256[])     private _employerRequests;
    mapping(address => uint256[])     private _talentRequests;

    address public treasury;

    uint256 public totalEscrowVolume;  // cumulative amount deposited
    uint256 public totalFeesCollected;
    uint256 public totalRequestsCount;

    // ── Events ────────────────────────────────────────────────────────────────

    event RequestCreated(
        uint256 indexed requestId,
        address indexed employer,
        address indexed talent,
        uint256 amount,
        string  title
    );
    event RequestAccepted(uint256 indexed requestId, address talent);
    event RequestDeclined(uint256 indexed requestId, address talent);
    event CompletionConfirmed(uint256 indexed requestId, address confirmedBy);
    event PaymentReleased(uint256 indexed requestId, address indexed talent, uint256 amount, uint256 fee);
    event DisputeRaised(uint256 indexed requestId, address indexed raisedBy);
    event DisputeResolved(uint256 indexed requestId, bool releasedToTalent);
    event RequestCancelled(uint256 indexed requestId, address indexed by);
    event TreasuryUpdated(address indexed newTreasury);

    // ── Errors ────────────────────────────────────────────────────────────────

    error RequestNotFound(uint256 requestId);
    error InvalidStatus(uint256 requestId, Status current);
    error NotAuthorized();
    error InvalidTalentAddress();
    error DeadlineMustBeFuture();
    error PaymentRequired();
    error TitleRequired();
    error AutoReleaseNotReady(uint256 readyAt);
    error TransferFailed();

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address _treasury) Ownable(msg.sender) {
        treasury = _treasury;
    }

    // ── Employer actions ──────────────────────────────────────────────────────

    /**
     * @notice Create a hiring request and deposit escrow payment.
     * @param talent      Wallet address of the talent (INFT owner).
     * @param title       Short title of the job.
     * @param description Full job description.
     * @param deadline    Expected completion timestamp.
     */
    function createRequest(
        address talent,
        string calldata title,
        string calldata description,
        uint256 deadline
    ) external payable nonReentrant returns (uint256) {
        if (msg.value == 0) revert PaymentRequired();
        if (talent == address(0) || talent == msg.sender) revert InvalidTalentAddress();
        if (deadline <= block.timestamp) revert DeadlineMustBeFuture();
        if (bytes(title).length == 0) revert TitleRequired();

        uint256 requestId = _nextRequestId++;

        requests[requestId] = HiringRequest({
            requestId:       requestId,
            employer:        msg.sender,
            talent:          talent,
            amount:          msg.value,
            title:           title,
            description:     description,
            deadline:        deadline,
            createdAt:       block.timestamp,
            acceptedAt:      0,
            completedAt:     0,
            status:          Status.Pending,
            talentConfirmed: false,
            employerReleased: false
        });

        _employerRequests[msg.sender].push(requestId);
        _talentRequests[talent].push(requestId);

        totalEscrowVolume  += msg.value;
        totalRequestsCount++;

        emit RequestCreated(requestId, msg.sender, talent, msg.value, title);
        return requestId;
    }

    /**
     * @notice Employer cancels a pending request (refund, only before acceptance).
     */
    function cancelRequest(uint256 requestId) external nonReentrant {
        HiringRequest storage req = _load(requestId);
        if (req.employer != msg.sender) revert NotAuthorized();
        if (req.status != Status.Pending) revert InvalidStatus(requestId, req.status);

        req.status = Status.Cancelled;
        _send(req.employer, req.amount);

        emit RequestCancelled(requestId, msg.sender);
    }

    /**
     * @notice Employer explicitly releases payment after talent confirms completion.
     */
    function releasePayment(uint256 requestId) external nonReentrant {
        HiringRequest storage req = _load(requestId);
        if (req.employer != msg.sender) revert NotAuthorized();
        if (req.status != Status.Accepted && req.status != Status.Completed)
            revert InvalidStatus(requestId, req.status);

        req.employerReleased = true;
        _releaseToTalent(requestId, req);
    }

    // ── Talent actions ────────────────────────────────────────────────────────

    /**
     * @notice Accept a pending hiring request.
     */
    function acceptRequest(uint256 requestId) external nonReentrant {
        HiringRequest storage req = _load(requestId);
        if (req.talent != msg.sender) revert NotAuthorized();
        if (req.status != Status.Pending) revert InvalidStatus(requestId, req.status);

        req.status     = Status.Accepted;
        req.acceptedAt = block.timestamp;

        emit RequestAccepted(requestId, msg.sender);
    }

    /**
     * @notice Decline a pending hiring request (full refund to employer).
     */
    function declineRequest(uint256 requestId) external nonReentrant {
        HiringRequest storage req = _load(requestId);
        if (req.talent != msg.sender) revert NotAuthorized();
        if (req.status != Status.Pending) revert InvalidStatus(requestId, req.status);

        req.status = Status.Declined;
        _send(req.employer, req.amount);

        emit RequestDeclined(requestId, msg.sender);
    }

    /**
     * @notice Talent marks the job as completed.
     *         Starts the 7-day auto-release window.
     */
    function confirmCompletion(uint256 requestId) external nonReentrant {
        HiringRequest storage req = _load(requestId);
        if (req.talent != msg.sender) revert NotAuthorized();
        if (req.status != Status.Accepted) revert InvalidStatus(requestId, req.status);

        req.talentConfirmed = true;
        req.completedAt     = block.timestamp;
        req.status          = Status.Completed;

        emit CompletionConfirmed(requestId, msg.sender);
    }

    // ── Auto-release ──────────────────────────────────────────────────────────

    /**
     * @notice Anyone can trigger auto-release 7 days after talent confirmed completion.
     *         Protects talent from non-responsive employers.
     */
    function autoRelease(uint256 requestId) external nonReentrant {
        HiringRequest storage req = _load(requestId);
        if (req.status != Status.Completed) revert InvalidStatus(requestId, req.status);

        uint256 readyAt = req.completedAt + AUTO_RELEASE_DELAY;
        if (block.timestamp < readyAt)
            revert AutoReleaseNotReady(readyAt);

        _releaseToTalent(requestId, req);
    }

    // ── Dispute ───────────────────────────────────────────────────────────────

    /**
     * @notice Raise a dispute on an accepted or completed request.
     *         Either employer or talent can raise a dispute.
     *         Funds frozen until admin resolves.
     */
    function raiseDispute(uint256 requestId) external nonReentrant {
        HiringRequest storage req = _load(requestId);
        if (msg.sender != req.employer && msg.sender != req.talent) revert NotAuthorized();
        if (req.status != Status.Accepted && req.status != Status.Completed)
            revert InvalidStatus(requestId, req.status);

        req.status = Status.Disputed;
        emit DisputeRaised(requestId, msg.sender);
    }

    /**
     * @notice Admin resolves a dispute: release to talent or refund employer.
     */
    function resolveDispute(uint256 requestId, bool releaseToTalent)
        external
        onlyOwner
        nonReentrant
    {
        HiringRequest storage req = _load(requestId);
        if (req.status != Status.Disputed) revert InvalidStatus(requestId, req.status);

        emit DisputeResolved(requestId, releaseToTalent);

        if (releaseToTalent) {
            _releaseToTalent(requestId, req);
        } else {
            req.status = Status.Cancelled;
            _send(req.employer, req.amount); // full refund, no fee for failed disputes
            emit RequestCancelled(requestId, address(this));
        }
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getRequest(uint256 requestId)
        external
        view
        returns (HiringRequest memory)
    {
        return _load(requestId);
    }

    function getEmployerRequests(address employer)
        external
        view
        returns (uint256[] memory)
    {
        return _employerRequests[employer];
    }

    function getTalentRequests(address talent)
        external
        view
        returns (uint256[] memory)
    {
        return _talentRequests[talent];
    }

    function autoReleaseReadyAt(uint256 requestId)
        external
        view
        returns (uint256)
    {
        HiringRequest storage req = _load(requestId);
        if (req.status != Status.Completed) return 0;
        return req.completedAt + AUTO_RELEASE_DELAY;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setTreasury(address newTreasury) external onlyOwner {
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    function _releaseToTalent(uint256 requestId, HiringRequest storage req) internal {
        req.status = Status.Released;

        uint256 fee       = (req.amount * PLATFORM_FEE_BPS) / BPS;
        uint256 talentAmt = req.amount - fee;

        totalFeesCollected += fee;

        _send(req.talent, talentAmt);
        if (fee > 0) _send(treasury, fee);

        emit PaymentReleased(requestId, req.talent, talentAmt, fee);
    }

    function _send(address to, uint256 amount) internal {
        (bool ok,) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function _load(uint256 requestId)
        internal
        view
        returns (HiringRequest storage)
    {
        HiringRequest storage req = requests[requestId];
        if (req.requestId == 0) revert RequestNotFound(requestId);
        return req;
    }
}
