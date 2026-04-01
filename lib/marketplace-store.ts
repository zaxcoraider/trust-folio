/**
 * marketplace-store.ts
 * Client-side localStorage store for marketplace listings and offers.
 */

import type { MarketplaceListing, MarketplaceOffer, INFTMetadata } from './types';
import { ethers } from 'ethers';

const LISTINGS_KEY = 'trustfolio_listings';
const OFFERS_KEY   = 'trustfolio_offers';
const SALES_KEY    = 'trustfolio_sales';

// ── Listings ──────────────────────────────────────────────────────────────────

export function getAllListings(): MarketplaceListing[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LISTINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function getActiveListings(): MarketplaceListing[] {
  return getAllListings().filter((l) => l.active);
}

export function getListing(listingId: string): MarketplaceListing | null {
  return getAllListings().find((l) => l.listingId === listingId) ?? null;
}

export function getListingByTokenId(tokenId: number): MarketplaceListing | null {
  return getActiveListings().find((l) => l.tokenId === tokenId) ?? null;
}

export function saveListing(listing: MarketplaceListing): void {
  if (typeof window === 'undefined') return;
  const all = getAllListings().filter((l) => l.listingId !== listing.listingId);
  all.unshift(listing);
  localStorage.setItem(LISTINGS_KEY, JSON.stringify(all));
}

export function createListing(
  inft: INFTMetadata,
  seller: string,
  priceEther: string
): MarketplaceListing {
  const priceWei = ethers.parseEther(priceEther).toString();
  const listing: MarketplaceListing = {
    listingId: `lst_${Date.now()}_${inft.tokenId}`,
    tokenId:   inft.tokenId,
    seller,
    price:     priceWei,
    priceEther,
    listedAt:  Math.floor(Date.now() / 1000),
    active:    true,
    views:     0,
    inft:      { ...inft, owner: seller },
  };
  saveListing(listing);
  return listing;
}

export function cancelListing(listingId: string): void {
  const listing = getListing(listingId);
  if (!listing) return;
  saveListing({ ...listing, active: false });
}

export function completeSale(listingId: string, buyer: string): void {
  const listing = getListing(listingId);
  if (!listing) return;
  saveListing({ ...listing, active: false, inft: { ...listing.inft, owner: buyer } });

  // Record sale event
  const sales = getSaleHistory();
  sales.unshift({
    listingId,
    tokenId:   listing.tokenId,
    seller:    listing.seller,
    buyer,
    price:     listing.price,
    priceEther: listing.priceEther,
    timestamp: Math.floor(Date.now() / 1000),
  });
  localStorage.setItem(SALES_KEY, JSON.stringify(sales));
}

export function incrementListingViews(listingId: string): void {
  const listing = getListing(listingId);
  if (!listing) return;
  saveListing({ ...listing, views: listing.views + 1 });
}

// ── Offers ────────────────────────────────────────────────────────────────────

export function getAllOffers(): MarketplaceOffer[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function getOffersForToken(tokenId: number): MarketplaceOffer[] {
  return getAllOffers().filter(
    (o) => o.tokenId === tokenId && o.active && o.expiresAt > Date.now() / 1000
  );
}

export function saveOffer(offer: MarketplaceOffer): void {
  if (typeof window === 'undefined') return;
  const all = getAllOffers().filter((o) => o.offerId !== offer.offerId);
  all.unshift(offer);
  localStorage.setItem(OFFERS_KEY, JSON.stringify(all));
}

export function createOffer(
  tokenId: number,
  buyer: string,
  amountEther: string,
  durationHours: number
): MarketplaceOffer {
  const now = Math.floor(Date.now() / 1000);
  const offer: MarketplaceOffer = {
    offerId:     `off_${Date.now()}_${tokenId}`,
    tokenId,
    buyer,
    amount:      ethers.parseEther(amountEther).toString(),
    amountEther,
    createdAt:   now,
    expiresAt:   now + durationHours * 3600,
    active:      true,
    status:      'pending',
  };
  saveOffer(offer);
  return offer;
}

export function acceptOffer(offerId: string): void {
  const offer = getAllOffers().find((o) => o.offerId === offerId);
  if (!offer) return;
  saveOffer({ ...offer, active: false, status: 'accepted' });
}

export function cancelOffer(offerId: string): void {
  const offer = getAllOffers().find((o) => o.offerId === offerId);
  if (!offer) return;
  saveOffer({ ...offer, active: false, status: 'cancelled' });
}

// ── Sales history ─────────────────────────────────────────────────────────────

export function getSaleHistory(): Array<{
  listingId:   string;
  tokenId:     number;
  seller:      string;
  buyer:       string;
  price:       string;
  priceEther:  string;
  timestamp:   number;
}> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SALES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── Demo seed listings ─────────────────────────────────────────────────────────

export function seedDemoListings(infts: INFTMetadata[]): void {
  if (typeof window === 'undefined') return;
  if (getActiveListings().length > 0) return;

  const prices = ['2.5', '5.0', '1.8', '0.75', '3.2', '12.0'];

  infts.slice(0, prices.length).forEach((inft, i) => {
    createListing(inft, inft.owner, prices[i]);
  });
}
