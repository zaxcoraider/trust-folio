'use client';

import type { PortfolioFile } from './types';

const KEY_PREFIX = 'trustfolio_files_';
const NETWORK_STORAGE_KEY = 'trustfolio_active_network';

function storageKey(address: string): string {
  const network = localStorage.getItem(NETWORK_STORAGE_KEY) || 'testnet';
  return `${KEY_PREFIX}${network}_${address.toLowerCase()}`;
}

/** One-time migration: move data from old network-unaware key to the testnet key.
 *  Historical data was always uploaded on testnet, so it belongs there. */
function migrateIfNeeded(address: string): void {
  const oldKey     = `${KEY_PREFIX}${address.toLowerCase()}`;
  const old        = localStorage.getItem(oldKey);
  if (!old) return; // nothing to migrate

  const testnetKey = `${KEY_PREFIX}testnet_${address.toLowerCase()}`;
  // Only write to testnet key if it doesn't already have data
  if (localStorage.getItem(testnetKey) === null) {
    localStorage.setItem(testnetKey, old);
  }
  localStorage.removeItem(oldKey); // always remove the old key
}

/** One-time cleanup: remove the wrongly-populated mainnet key if it's identical
 *  to the testnet key (meaning the bad migration ran and duplicated data there). */
function cleanupBadMainnetKey(address: string): void {
  const doneKey    = `trustfolio_files_migration_v2_${address.toLowerCase()}`;
  if (localStorage.getItem(doneKey)) return;

  const mainnetKey = `${KEY_PREFIX}mainnet_${address.toLowerCase()}`;
  const testnetKey = `${KEY_PREFIX}testnet_${address.toLowerCase()}`;
  const mainnetVal = localStorage.getItem(mainnetKey);
  const testnetVal = localStorage.getItem(testnetKey);

  // If mainnet key has data AND it matches testnet (bad dup), remove it
  if (mainnetVal && mainnetVal === testnetVal) {
    localStorage.removeItem(mainnetKey);
  }
  localStorage.setItem(doneKey, '1');
}

export function getPortfolioFiles(address: string): PortfolioFile[] {
  if (typeof window === 'undefined') return [];
  try {
    migrateIfNeeded(address);
    cleanupBadMainnetKey(address);
    const raw = localStorage.getItem(storageKey(address));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePortfolioFile(address: string, file: PortfolioFile): void {
  if (typeof window === 'undefined') return;
  const existing = getPortfolioFiles(address);
  const updated = [file, ...existing.filter((f) => f.id !== file.id)];
  localStorage.setItem(storageKey(address), JSON.stringify(updated));
}

export function updatePortfolioFile(
  address: string,
  id: string,
  updates: Partial<PortfolioFile>
): void {
  if (typeof window === 'undefined') return;
  const existing = getPortfolioFiles(address);
  const updated = existing.map((f) => (f.id === id ? { ...f, ...updates } : f));
  localStorage.setItem(storageKey(address), JSON.stringify(updated));
}

export function deletePortfolioFile(address: string, id: string): void {
  if (typeof window === 'undefined') return;
  const existing = getPortfolioFiles(address);
  const updated = existing.filter((f) => f.id !== id);
  localStorage.setItem(storageKey(address), JSON.stringify(updated));
}
