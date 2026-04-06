'use client';

import type { VerificationRecord } from './types';

const KEY_PREFIX    = 'trustfolio_verifications_';
const NETWORK_KEY   = 'trustfolio_active_network';

function activeNetwork(): string {
  if (typeof window === 'undefined') return 'testnet';
  return localStorage.getItem(NETWORK_KEY) || 'testnet';
}

function storageKey(address: string): string {
  return `${KEY_PREFIX}${activeNetwork()}_${address.toLowerCase()}`;
}

export function getVerificationHistory(address: string): VerificationRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(address));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveVerificationRecord(address: string, record: VerificationRecord): void {
  if (typeof window === 'undefined') return;
  const existing = getVerificationHistory(address);
  // Deduplicate by fileRootHash — keep latest
  const updated = [record, ...existing.filter((r) => r.fileRootHash !== record.fileRootHash)];
  localStorage.setItem(storageKey(address), JSON.stringify(updated));
}

export function updateVerificationRecord(
  address: string,
  fileRootHash: string,
  patch: Partial<VerificationRecord>
): void {
  if (typeof window === 'undefined') return;
  const existing = getVerificationHistory(address);
  const updated = existing.map((r) =>
    r.fileRootHash === fileRootHash ? { ...r, ...patch } : r
  );
  localStorage.setItem(storageKey(address), JSON.stringify(updated));
}

export function getVerificationByFileHash(
  address: string,
  fileRootHash: string
): VerificationRecord | undefined {
  return getVerificationHistory(address).find((r) => r.fileRootHash === fileRootHash);
}
