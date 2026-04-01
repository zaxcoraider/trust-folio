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

// ── Demo seed data (for showcase when no contracts are deployed) ───────────────

export function seedDemoINFTs(): void {
  if (typeof window === 'undefined') return;
  if (getAllINFTs().length > 0) return; // already seeded

  const demos: INFTMetadata[] = [
    {
      tokenId:               1,
      owner:                 '0x1234567890123456789012345678901234567890',
      originalOwner:         '0x1234567890123456789012345678901234567890',
      skillCategory:         'code',
      score:                 92,
      originalityScore:      90,
      qualityScore:          95,
      complexityScore:       88,
      authenticityScore:     94,
      encryptedMetadataHash: '0xabcdef1234567890demo',
      proofRootHash:         '0xproof001demo',
      fileRootHash:          '0xfile001demo',
      badges:                ['Diamond Portfolio', 'Verified Developer', 'High Quality', 'Highly Original'],
      mintedAt:              Math.floor(Date.now() / 1000) - 86400 * 3,
      tier:                  'diamond',
      metadataURI:           '',
      contractAddress:       '0x0000000000000000000000000000000000000000',
    },
    {
      tokenId:               2,
      owner:                 '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      originalOwner:         '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      skillCategory:         'design',
      score:                 82,
      originalityScore:      85,
      qualityScore:          80,
      complexityScore:       78,
      authenticityScore:     84,
      encryptedMetadataHash: '0xabcdef2234567890demo',
      proofRootHash:         '0xproof002demo',
      fileRootHash:          '0xfile002demo',
      badges:                ['Gold Portfolio', 'Verified Designer', 'Highly Original'],
      mintedAt:              Math.floor(Date.now() / 1000) - 86400 * 7,
      tier:                  'gold',
      metadataURI:           '',
      contractAddress:       '0x0000000000000000000000000000000000000000',
    },
    {
      tokenId:               3,
      owner:                 '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      originalOwner:         '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      skillCategory:         'writing',
      score:                 75,
      originalityScore:      78,
      qualityScore:          72,
      complexityScore:       70,
      authenticityScore:     80,
      encryptedMetadataHash: '0xabcdef3234567890demo',
      proofRootHash:         '0xproof003demo',
      fileRootHash:          '0xfile003demo',
      badges:                ['Gold Portfolio', 'Verified Writer'],
      mintedAt:              Math.floor(Date.now() / 1000) - 86400 * 14,
      tier:                  'gold',
      metadataURI:           '',
      contractAddress:       '0x0000000000000000000000000000000000000000',
    },
    {
      tokenId:               4,
      owner:                 '0xcafecafecafecafecafecafecafecafecafecafe',
      originalOwner:         '0xcafecafecafecafecafecafecafecafecafecafe',
      skillCategory:         'code',
      score:                 65,
      originalityScore:      68,
      qualityScore:          63,
      complexityScore:       62,
      authenticityScore:     67,
      encryptedMetadataHash: '0xabcdef4234567890demo',
      proofRootHash:         '0xproof004demo',
      fileRootHash:          '0xfile004demo',
      badges:                ['Silver Portfolio', 'Verified Developer'],
      mintedAt:              Math.floor(Date.now() / 1000) - 86400 * 21,
      tier:                  'silver',
      metadataURI:           '',
      contractAddress:       '0x0000000000000000000000000000000000000000',
    },
    {
      tokenId:               5,
      owner:                 '0xf00df00df00df00df00df00df00df00df00df00d',
      originalOwner:         '0xf00df00df00df00df00df00df00df00df00df00d',
      skillCategory:         'document',
      score:                 88,
      originalityScore:      86,
      qualityScore:          90,
      complexityScore:       85,
      authenticityScore:     91,
      encryptedMetadataHash: '0xabcdef5234567890demo',
      proofRootHash:         '0xproof005demo',
      fileRootHash:          '0xfile005demo',
      badges:                ['Gold Portfolio', 'Verified Analyst', 'High Quality', 'Authentic'],
      mintedAt:              Math.floor(Date.now() / 1000) - 86400 * 5,
      tier:                  'gold',
      metadataURI:           '',
      contractAddress:       '0x0000000000000000000000000000000000000000',
    },
    {
      tokenId:               6,
      owner:                 '0xbabe0000babe0000babe0000babe0000babe0000',
      originalOwner:         '0xbabe0000babe0000babe0000babe0000babe0000',
      skillCategory:         'design',
      score:                 95,
      originalityScore:      96,
      qualityScore:          94,
      complexityScore:       93,
      authenticityScore:     97,
      encryptedMetadataHash: '0xabcdef6234567890demo',
      proofRootHash:         '0xproof006demo',
      fileRootHash:          '0xfile006demo',
      badges:                ['Diamond Portfolio', 'Verified Designer', 'Highly Original', 'High Quality', 'Authentic', 'Complex Work'],
      mintedAt:              Math.floor(Date.now() / 1000) - 86400 * 1,
      tier:                  'diamond',
      metadataURI:           '',
      contractAddress:       '0x0000000000000000000000000000000000000000',
    },
  ];

  demos.forEach(saveINFT);
}
