// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TrustFolioMarketplace
 * @notice Custodial marketplace for buying, selling, and making offers on TrustFolio INFTs.
 * @dev INFTs are transferred to this contract when listed (custodial model).
 *      A 2.5% platform fee is deducted from every sale and forwarded to treasury.
 *
 *      Flow:
 *        Seller: approve INFT → createListing → (wait for buyer)
 *        Buyer:  buyListing (pays price) | makeOffer → seller acceptOffer
 *        Seller: cancelListing (returns INFT)
 *        Buyer:  cancelOffer (refunds offer amount)
 */
contract TrustFolioMarketplace is Ownable, ReentrancyGuard {

    // ── Constants ─────────────────────────────────────────────────────────────

    uint256 public constant FEE_BPS = 250;    // 2.5% platform fee
    uint256 public constant BPS     = 10_000;
    uint256 public constant MAX_OFFER_DURATION = 30 days;

    // ── Storage ───────────────────────────────────────────────────────────────

    uint256 private _nextListingId = 1;
    uint256 private _nextOfferId   = 1;

    IERC721 public immutable inftContract;
    address public treasury;

    struct Listing {
        uint256 listingId;
        uint256 tokenId;
        address seller;
        uint256 price;      // in wei (0G tokens)
        uint256 listedAt;
        bool    active;
    }

    struct Offer {
        uint256 offerId;
        uint256 tokenId;
        address buyer;
        uint256 amount;     // in wei (0G tokens) — held in escrow
        uint256 expiresAt;
        bool    active;
    }

    mapping(uint256 => Listing)   public listings;
    mapping(uint256 => Offer)     public offers;
    mapping(uint256 => uint256)   public tokenToActiveListing; // tokenId → listingId (0 = none)
    mapping(uint256 => uint256[]) public tokenOffers;          // tokenId → offerId[]

    uint256[] private _activeListingIds;

    uint256 public totalVolume;  // cumulative sales volume in wei
    uint256 public totalSales;   // number of completed sales
    uint256 public totalFees;    // cumulative fees collected

    // ── Events ────────────────────────────────────────────────────────────────

    event Listed(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    event ListingCancelled(uint256 indexed listingId, uint256 indexed tokenId);
    event Sale(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address seller,
        address indexed buyer,
        uint256 price,
        uint256 fee
    );
    event OfferMade(
        uint256 indexed offerId,
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 amount,
        uint256 expiresAt
    );
    event OfferAccepted(
        uint256 indexed offerId,
        uint256 indexed tokenId,
        address seller,
        address indexed buyer,
        uint256 amount,
        uint256 fee
    );
    event OfferCancelled(uint256 indexed offerId);
    event TreasuryUpdated(address indexed newTreasury);

    // ── Errors ────────────────────────────────────────────────────────────────

    error ListingNotActive(uint256 listingId);
    error NotSeller(address caller, address seller);
    error NotBuyer(address caller, address buyer);
    error InsufficientPayment(uint256 sent, uint256 required);
    error OfferExpired(uint256 offerId);
    error OfferNotActive(uint256 offerId);
    error TokenAlreadyListed(uint256 tokenId, uint256 existingListingId);
    error NotTokenOwner();
    error TransferFailed();
    error InvalidPrice();
    error InvalidDuration();

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address _inftContract, address _treasury)
        Ownable(msg.sender)
    {
        inftContract = IERC721(_inftContract);
        treasury     = _treasury;
    }

    // ── Listing ───────────────────────────────────────────────────────────────

    /**
     * @notice List an INFT for sale. Caller must have approved this contract first.
     * @param tokenId Token to list.
     * @param price   Sale price in wei (0G tokens).
     */
    function createListing(uint256 tokenId, uint256 price)
        external
        nonReentrant
        returns (uint256)
    {
        if (price == 0) revert InvalidPrice();
        if (inftContract.ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (tokenToActiveListing[tokenId] != 0)
            revert TokenAlreadyListed(tokenId, tokenToActiveListing[tokenId]);

        // Pull NFT into marketplace escrow
        inftContract.transferFrom(msg.sender, address(this), tokenId);

        uint256 listingId = _nextListingId++;
        listings[listingId] = Listing({
            listingId: listingId,
            tokenId:   tokenId,
            seller:    msg.sender,
            price:     price,
            listedAt:  block.timestamp,
            active:    true
        });

        tokenToActiveListing[tokenId] = listingId;
        _activeListingIds.push(listingId);

        emit Listed(listingId, tokenId, msg.sender, price);
        return listingId;
    }

    /**
     * @notice Cancel a listing. Returns INFT to the seller.
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage lst = listings[listingId];
        if (!lst.active) revert ListingNotActive(listingId);
        if (lst.seller != msg.sender && owner() != msg.sender)
            revert NotSeller(msg.sender, lst.seller);

        lst.active = false;
        tokenToActiveListing[lst.tokenId] = 0;
        _removeActiveListingId(listingId);

        inftContract.transferFrom(address(this), lst.seller, lst.tokenId);

        emit ListingCancelled(listingId, lst.tokenId);
    }

    // ── Buying ────────────────────────────────────────────────────────────────

    /**
     * @notice Buy a listed INFT at the asking price.
     *         Excess 0G tokens are refunded.
     */
    function buyListing(uint256 listingId) external payable nonReentrant {
        Listing storage lst = listings[listingId];
        if (!lst.active) revert ListingNotActive(listingId);
        if (msg.value < lst.price) revert InsufficientPayment(msg.value, lst.price);

        lst.active = false;
        tokenToActiveListing[lst.tokenId] = 0;
        _removeActiveListingId(listingId);

        uint256 fee       = (lst.price * FEE_BPS) / BPS;
        uint256 sellerAmt = lst.price - fee;

        totalVolume += lst.price;
        totalFees   += fee;
        totalSales++;

        // Transfer INFT to buyer
        inftContract.transferFrom(address(this), msg.sender, lst.tokenId);

        // Pay seller
        _send(lst.seller, sellerAmt);

        // Platform fee
        if (fee > 0) _send(treasury, fee);

        // Refund overpayment
        if (msg.value > lst.price)
            _send(msg.sender, msg.value - lst.price);

        emit Sale(listingId, lst.tokenId, lst.seller, msg.sender, lst.price, fee);
    }

    // ── Offers ────────────────────────────────────────────────────────────────

    /**
     * @notice Make an offer on any INFT (listed or unlisted).
     *         Offer amount is held in contract escrow until accepted/cancelled/expired.
     * @param tokenId         Target INFT.
     * @param durationSeconds Offer validity window (max 30 days).
     */
    function makeOffer(uint256 tokenId, uint256 durationSeconds)
        external
        payable
        nonReentrant
        returns (uint256)
    {
        if (msg.value == 0) revert InvalidPrice();
        if (durationSeconds == 0 || durationSeconds > MAX_OFFER_DURATION)
            revert InvalidDuration();

        uint256 offerId = _nextOfferId++;
        uint256 expires = block.timestamp + durationSeconds;

        offers[offerId] = Offer({
            offerId:   offerId,
            tokenId:   tokenId,
            buyer:     msg.sender,
            amount:    msg.value,
            expiresAt: expires,
            active:    true
        });
        tokenOffers[tokenId].push(offerId);

        emit OfferMade(offerId, tokenId, msg.sender, msg.value, expires);
        return offerId;
    }

    /**
     * @notice Accept a pending offer. Caller must own the INFT (directly or via listing).
     */
    function acceptOffer(uint256 offerId) external nonReentrant {
        Offer storage ofr = offers[offerId];
        if (!ofr.active) revert OfferNotActive(offerId);
        if (block.timestamp > ofr.expiresAt) revert OfferExpired(offerId);

        ofr.active = false;

        uint256 fee       = (ofr.amount * FEE_BPS) / BPS;
        uint256 sellerAmt = ofr.amount - fee;

        totalVolume += ofr.amount;
        totalFees   += fee;
        totalSales++;

        // Determine if token is held in marketplace escrow
        uint256 listingId = tokenToActiveListing[ofr.tokenId];
        if (listingId != 0 && listings[listingId].seller == msg.sender) {
            // Seller has active listing — close it and transfer from escrow
            listings[listingId].active = false;
            tokenToActiveListing[ofr.tokenId] = 0;
            _removeActiveListingId(listingId);
            inftContract.transferFrom(address(this), ofr.buyer, ofr.tokenId);
        } else {
            // Token is with seller directly
            if (inftContract.ownerOf(ofr.tokenId) != msg.sender) revert NotTokenOwner();
            inftContract.transferFrom(msg.sender, ofr.buyer, ofr.tokenId);
        }

        _send(msg.sender, sellerAmt);
        if (fee > 0) _send(treasury, fee);

        emit OfferAccepted(offerId, ofr.tokenId, msg.sender, ofr.buyer, ofr.amount, fee);
    }

    /**
     * @notice Cancel your own offer and receive a full refund.
     */
    function cancelOffer(uint256 offerId) external nonReentrant {
        Offer storage ofr = offers[offerId];
        if (!ofr.active) revert OfferNotActive(offerId);
        if (ofr.buyer != msg.sender) revert NotBuyer(msg.sender, ofr.buyer);

        ofr.active = false;
        _send(msg.sender, ofr.amount);

        emit OfferCancelled(offerId);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getActiveListings() external view returns (Listing[] memory) {
        uint256 len = _activeListingIds.length;
        Listing[] memory result = new Listing[](len);
        for (uint256 i; i < len; ++i) {
            result[i] = listings[_activeListingIds[i]];
        }
        return result;
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    function getOffer(uint256 offerId) external view returns (Offer memory) {
        return offers[offerId];
    }

    function getTokenOffers(uint256 tokenId) external view returns (Offer[] memory) {
        uint256[] memory ids = tokenOffers[tokenId];
        Offer[] memory result = new Offer[](ids.length);
        for (uint256 i; i < ids.length; ++i) {
            result[i] = offers[ids[i]];
        }
        return result;
    }

    function activeListingCount() external view returns (uint256) {
        return _activeListingIds.length;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setTreasury(address newTreasury) external onlyOwner {
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    function _send(address to, uint256 amount) internal {
        (bool ok,) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function _removeActiveListingId(uint256 listingId) internal {
        uint256 len = _activeListingIds.length;
        for (uint256 i; i < len; ++i) {
            if (_activeListingIds[i] == listingId) {
                _activeListingIds[i] = _activeListingIds[len - 1];
                _activeListingIds.pop();
                break;
            }
        }
    }
}
