'use client';

import type { JsonRpcSigner } from 'ethers';
import { uploadFileTo0G, downloadFileFrom0G } from './storage';
import type { UploadProgress, UserSettings } from './types';

const PROFILE_HASH_KEY    = 'trustfolio_profile_hash_';
const AVATAR_CACHE_PREFIX = 'trustfolio_avatar_cache_';

// ── Local hash ────────────────────────────────────────────────────────────────

export function getLocalProfileHash(address: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`${PROFILE_HASH_KEY}${address.toLowerCase()}`) ?? null;
}

export function setLocalProfileHash(address: string, hash: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${PROFILE_HASH_KEY}${address.toLowerCase()}`, hash);
}

// ── Remote hash (server-side in-memory store) ─────────────────────────────────

export async function getRemoteProfileHash(address: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/profile-hash?wallet=${address.toLowerCase()}`);
    if (!res.ok) return null;
    const { hash } = await res.json();
    return hash ?? null;
  } catch {
    return null;
  }
}

export async function setRemoteProfileHash(address: string, hash: string): Promise<void> {
  try {
    await fetch('/api/profile-hash', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ wallet: address.toLowerCase(), hash }),
    });
  } catch { /* silent — non-critical */ }
}

// ── Avatar cache ──────────────────────────────────────────────────────────────

export function getCachedAvatarDataUrl(avatarHash: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`${AVATAR_CACHE_PREFIX}${avatarHash}`) ?? null;
}

export function setCachedAvatarDataUrl(avatarHash: string, dataUrl: string): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(`${AVATAR_CACHE_PREFIX}${avatarHash}`, dataUrl); } catch { /* quota */ }
}

// ── 0G Storage: save full profile ────────────────────────────────────────────

export async function saveProfileTo0G(
  settings:   UserSettings,
  signer:     JsonRpcSigner,
  onProgress?: (p: UploadProgress) => void,
): Promise<string> {
  const profileData = {
    version:         '1.0',
    walletAddress:   settings.walletAddress,
    displayName:     settings.displayName,
    title:           settings.title       ?? '',
    bio:             settings.bio,
    avatarHash:      settings.avatarHash,
    location:        settings.location    ?? '',
    website:         settings.website     ?? '',
    github:          settings.github      ?? '',
    twitter:         settings.twitter     ?? '',
    portfolioUrl:    settings.portfolioUrl ?? '',
    skills:          settings.skills,
    skillCategories: settings.skillCategories ?? {},
    expertiseLevels: settings.expertiseLevels,
    hiringStatus:    settings.hiringStatus ?? 'not-available',
    visibility:      settings.visibility,
    savedAt:         Date.now(),
  };

  const file = new File(
    [JSON.stringify(profileData)],
    'trustfolio-profile.json',
    { type: 'application/json' },
  );

  const { rootHash } = await uploadFileTo0G(file, signer, onProgress);
  setLocalProfileHash(settings.walletAddress, rootHash);
  await setRemoteProfileHash(settings.walletAddress, rootHash);
  return rootHash;
}

// ── 0G Storage: load full profile ────────────────────────────────────────────

export async function loadProfileFrom0G(rootHash: string): Promise<Record<string, unknown> | null> {
  try {
    const blobUrl = await downloadFileFrom0G(rootHash);
    const resp    = await fetch(blobUrl);
    const data    = await resp.json();
    URL.revokeObjectURL(blobUrl);
    return data as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ── 0G Storage: load avatar ───────────────────────────────────────────────────

export async function loadAvatarFrom0G(avatarHash: string): Promise<string | null> {
  try {
    const blobUrl = await downloadFileFrom0G(avatarHash);
    // Convert to data URL so it can be cached in localStorage
    const resp   = await fetch(blobUrl);
    const blob   = await resp.blob();
    URL.revokeObjectURL(blobUrl);
    return await new Promise<string>((resolve, reject) => {
      const reader      = new FileReader();
      reader.onloadend  = () => resolve(reader.result as string);
      reader.onerror    = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
