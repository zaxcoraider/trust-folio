/**
 * lib/chain-reader.ts
 * Read marketplace listings, INFTs, and hiring requests directly from on-chain contracts.
 * This replaces localStorage-based stores so data is globally visible across all wallets/devices.
 */

import { ethers } from 'ethers';
import { INFT_ABI, MARKETPLACE_ABI, HIRING_ESCROW_ABI } from './contracts';
import type { NetworkConfig } from '@/config/networks';
import type { INFTMetadata, MarketplaceListing, HiringRequest, HiringStatus, SkillCategory, VerificationTier } from './types';

const HIRING_STATUS_MAP: HiringStatus[] = [
  'pending', 'accepted', 'completed', 'released', 'disputed', 'cancelled', 'declined',
];

function getProvider(networkConfig: NetworkConfig) {
  return new ethers.JsonRpcProvider(networkConfig.rpc);
}

function parseINFT(
  tokenId: number,
  owner: string,
  contractAddress: string,
  raw: { originalOwner: string; skillCategory: string; score: bigint; originalityScore: bigint; qualityScore: bigint; complexityScore: bigint; authenticityScore: bigint; encryptedMetadataHash: string; proofRootHash: string; fileRootHash: string; badges: string[]; mintedAt: bigint; tier: string; metadataURI: string },
): INFTMetadata {
  return {
    tokenId,
    owner,
    originalOwner:         raw.originalOwner,
    skillCategory:         raw.skillCategory as SkillCategory,
    score:                 Number(raw.score),
    originalityScore:      Number(raw.originalityScore),
    qualityScore:          Number(raw.qualityScore),
    complexityScore:       Number(raw.complexityScore),
    authenticityScore:     Number(raw.authenticityScore),
    encryptedMetadataHash: raw.encryptedMetadataHash,
    proofRootHash:         raw.proofRootHash,
    fileRootHash:          raw.fileRootHash,
    badges:                [...raw.badges],
    mintedAt:              Number(raw.mintedAt),
    tier:                  raw.tier as VerificationTier,
    metadataURI:           raw.metadataURI,
    contractAddress,
  };
}

function parseHiringRequest(
  raw: { requestId: bigint; employer: string; talent: string; amount: bigint; title: string; description: string; deadline: bigint; createdAt: bigint; acceptedAt: bigint; completedAt: bigint; status: number; talentConfirmed: boolean; employerReleased: boolean },
  contractAddress: string,
): HiringRequest {
  return {
    requestId:        raw.requestId.toString(),
    onChainId:        Number(raw.requestId),
    employer:         raw.employer,
    talent:           raw.talent,
    amount:           raw.amount.toString(),
    amountEther:      ethers.formatEther(raw.amount),
    title:            raw.title,
    description:      raw.description,
    deadline:         Number(raw.deadline),
    createdAt:        Number(raw.createdAt),
    acceptedAt:       Number(raw.acceptedAt) || undefined,
    completedAt:      Number(raw.completedAt) || undefined,
    status:           HIRING_STATUS_MAP[raw.status] ?? 'pending',
    talentConfirmed:  raw.talentConfirmed,
    employerReleased: raw.employerReleased,
    contractAddress,
  };
}

// ── Marketplace ───────────────────────────────────────────────────────────────

export async function fetchMarketplaceListings(
  networkConfig: NetworkConfig,
): Promise<MarketplaceListing[]> {
  const { marketplace: marketplaceAddress, inft: inftAddress } = networkConfig.contracts;
  if (!marketplaceAddress || !inftAddress) return [];

  try {
    const provider    = getProvider(networkConfig);
    const marketplace = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI as unknown as string[], provider);
    const inft        = new ethers.Contract(inftAddress,        INFT_ABI        as unknown as string[], provider);

    const rawListings = await marketplace.getActiveListings();
    if (!rawListings || rawListings.length === 0) return [];

    const listings = await Promise.all(
      rawListings.map(async (lst: { listingId: bigint; tokenId: bigint; seller: string; price: bigint; listedAt: bigint; active: boolean }) => {
        const tokenId = Number(lst.tokenId);
        try {
          const raw     = await inft.getINFT(tokenId);
          const inftData = parseINFT(tokenId, lst.seller, inftAddress, raw);

          const listing: MarketplaceListing = {
            listingId:        lst.listingId.toString(),
            onChainListingId: Number(lst.listingId),
            tokenId,
            seller:           lst.seller,
            price:            lst.price.toString(),
            priceEther:       ethers.formatEther(lst.price),
            listedAt:         Number(lst.listedAt),
            active:           lst.active,
            views:            0,
            inft:             inftData,
          };
          return listing;
        } catch {
          return null;
        }
      }),
    );

    return listings.filter((x): x is MarketplaceListing => x !== null);
  } catch (err) {
    console.error('[chain-reader] fetchMarketplaceListings error:', err);
    return [];
  }
}

// ── INFTs ─────────────────────────────────────────────────────────────────────

export async function fetchAllINFTs(
  networkConfig: NetworkConfig,
): Promise<INFTMetadata[]> {
  const { inft: inftAddress } = networkConfig.contracts;
  if (!inftAddress) return [];

  try {
    const provider = getProvider(networkConfig);
    const inft     = new ethers.Contract(inftAddress, INFT_ABI as unknown as string[], provider);

    const totalSupply = Number(await inft.totalSupply());
    if (totalSupply === 0) return [];

    const results = await Promise.all(
      Array.from({ length: totalSupply }, (_, i) => i + 1).map(async (tokenId) => {
        try {
          const [raw, owner] = await Promise.all([
            inft.getINFT(tokenId),
            inft.ownerOf(tokenId),
          ]);
          return parseINFT(tokenId, owner as string, inftAddress, raw);
        } catch {
          return null;
        }
      }),
    );

    return results.filter((x): x is INFTMetadata => x !== null);
  } catch (err) {
    console.error('[chain-reader] fetchAllINFTs error:', err);
    return [];
  }
}

// ── Hiring ────────────────────────────────────────────────────────────────────

export async function fetchHiringRequestsForAddress(
  networkConfig: NetworkConfig,
  address: string,
): Promise<{ employerRequests: HiringRequest[]; talentRequests: HiringRequest[] }> {
  const { hiring: hiringAddress } = networkConfig.contracts;
  if (!hiringAddress) return { employerRequests: [], talentRequests: [] };

  try {
    const provider = getProvider(networkConfig);
    const escrow   = new ethers.Contract(hiringAddress, HIRING_ESCROW_ABI as unknown as string[], provider);

    const [empIds, talIds]: [bigint[], bigint[]] = await Promise.all([
      escrow.getEmployerRequests(address),
      escrow.getTalentRequests(address),
    ]);

    const allIds = [...new Set([...empIds.map(Number), ...talIds.map(Number)])];
    const requestMap = new Map<number, HiringRequest>();

    await Promise.all(
      allIds.map(async (id) => {
        try {
          const raw = await escrow.getRequest(id);
          requestMap.set(id, parseHiringRequest(raw, hiringAddress));
        } catch { /* skip */ }
      }),
    );

    return {
      employerRequests: empIds.map((id) => requestMap.get(Number(id))).filter(Boolean) as HiringRequest[],
      talentRequests:   talIds.map((id) => requestMap.get(Number(id))).filter(Boolean) as HiringRequest[],
    };
  } catch (err) {
    console.error('[chain-reader] fetchHiringRequestsForAddress error:', err);
    return { employerRequests: [], talentRequests: [] };
  }
}

export async function fetchAllHiringRequests(
  networkConfig: NetworkConfig,
): Promise<HiringRequest[]> {
  const { hiring: hiringAddress } = networkConfig.contracts;
  if (!hiringAddress) return [];

  try {
    const provider = getProvider(networkConfig);
    const escrow   = new ethers.Contract(hiringAddress, HIRING_ESCROW_ABI as unknown as string[], provider);

    const total = Number(await escrow.totalRequestsCount());
    if (total === 0) return [];

    const results = await Promise.all(
      Array.from({ length: total }, (_, i) => i + 1).map(async (id) => {
        try {
          const raw = await escrow.getRequest(id);
          return parseHiringRequest(raw, hiringAddress);
        } catch {
          return null;
        }
      }),
    );

    return results.filter((x): x is HiringRequest => x !== null);
  } catch (err) {
    console.error('[chain-reader] fetchAllHiringRequests error:', err);
    return [];
  }
}
