/**
 * inft-store.ts
 * Client-side localStorage store for minted TrustFolio INFTs.
 * Acts as the data layer for the marketplace when contracts are not yet deployed.
 */

import type { INFTMetadata, SkillCategory, VerificationTier } from './types';
import { getTier } from './types';

const PREFIX = 'trustfolio_inft_';
const ALL_KEY = 'trustfolio_all_infts';

// ── Read ──────────────────────────────────────────────────────────────────────

export function getAllINFTs(): INFTMetadata[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ALL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getINFT(tokenId: number): INFTMetadata | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}${tokenId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getWalletINFTs(walletAddress: string): INFTMetadata[] {
  return getAllINFTs().filter(
    (t) => t.owner.toLowerCase() === walletAddress.toLowerCase()
  );
}

export function getINFTByFileHash(fileRootHash: string): INFTMetadata | null {
  return getAllINFTs().find((t) => t.fileRootHash === fileRootHash) ?? null;
}

// ── Write ─────────────────────────────────────────────────────────────────────

export function saveINFT(inft: INFTMetadata): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${PREFIX}${inft.tokenId}`, JSON.stringify(inft));
    const all = getAllINFTs().filter((t) => t.tokenId !== inft.tokenId);
    all.unshift(inft);
    localStorage.setItem(ALL_KEY, JSON.stringify(all));
  } catch { /* storage full or SSR */ }
}

export function updateINFTOwner(tokenId: number, newOwner: string): void {
  const inft = getINFT(tokenId);
  if (!inft) return;
  saveINFT({ ...inft, owner: newOwner });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function buildBadges(
  score: number,
  skillCategory: SkillCategory,
  breakdown: {
    originality: number;
    quality: number;
    complexity: number;
    authenticity: number;
  }
): string[] {
  const badges: string[] = [];
  const tier: VerificationTier = getTier(score);

  if (tier === 'diamond') badges.push('Diamond Portfolio');
  if (tier === 'gold')    badges.push('Gold Portfolio');
  if (tier === 'silver')  badges.push('Silver Portfolio');

  if (skillCategory === 'code')     badges.push('Verified Developer');
  if (skillCategory === 'design')   badges.push('Verified Designer');
  if (skillCategory === 'writing')  badges.push('Verified Writer');
  if (skillCategory === 'document') badges.push('Verified Analyst');

  if (breakdown.originality  >= 80) badges.push('Highly Original');
  if (breakdown.quality      >= 80) badges.push('High Quality');
  if (breakdown.complexity   >= 80) badges.push('Complex Work');
  if (breakdown.authenticity >= 80) badges.push('Authentic');

  return badges;
}

