'use client';

import type { PortfolioFile } from './types';

const KEY_PREFIX          = 'trustfolio_files_';
const NETWORK_STORAGE_KEY = 'trustfolio_active_network';

function storageKey(address: string): string {
  const network = localStorage.getItem(NETWORK_STORAGE_KEY) || 'testnet';
  return `${KEY_PREFIX}${network}_${address.toLowerCase()}`;
}

/**
 * Consolidate all past migration attempts into one correct pass.
 * Runs every call but short-circuits after first clean execution.
 *
 * Priority: all historical data belongs on testnet.
 *
 * Cases handled:
 *   A) Old network-unaware key exists → copy to testnet, delete old key
 *   B) Mainnet key has data but testnet key is empty → bad previous migration,
 *      move mainnet data → testnet key, clear mainnet key
 *   C) Both have data OR testnet already has data → leave as-is
 */
function fixMigration(address: string): void {
  const addr       = address.toLowerCase();
  const oldKey     = `${KEY_PREFIX}${addr}`;
  const testnetKey = `${KEY_PREFIX}testnet_${addr}`;
  const mainnetKey = `${KEY_PREFIX}mainnet_${addr}`;

  // Case A: old unversioned key still exists
  const oldData = localStorage.getItem(oldKey);
  if (oldData) {
    if (!localStorage.getItem(testnetKey)) {
      localStorage.setItem(testnetKey, oldData);
    }
    localStorage.removeItem(oldKey);
  }

  // Case B: testnet empty but mainnet has data (result of earlier bad migration)
  const testnetData = localStorage.getItem(testnetKey);
  const mainnetData = localStorage.getItem(mainnetKey);
  if (!testnetData && mainnetData) {
    localStorage.setItem(testnetKey, mainnetData);
    localStorage.removeItem(mainnetKey);
  }
}

export function getPortfolioFiles(address: string): PortfolioFile[] {
  if (typeof window === 'undefined') return [];
  try {
    fixMigration(address);
    const raw = localStorage.getItem(storageKey(address));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePortfolioFile(address: string, file: PortfolioFile): void {
  if (typeof window === 'undefined') return;
  const existing = getPortfolioFiles(address);
  const updated  = [file, ...existing.filter((f) => f.id !== file.id)];
  localStorage.setItem(storageKey(address), JSON.stringify(updated));
}

export function updatePortfolioFile(
  address: string,
  id: string,
  updates: Partial<PortfolioFile>,
): void {
  if (typeof window === 'undefined') return;
  const existing = getPortfolioFiles(address);
  const updated  = existing.map((f) => (f.id === id ? { ...f, ...updates } : f));
  localStorage.setItem(storageKey(address), JSON.stringify(updated));
}

export function deletePortfolioFile(address: string, id: string): void {
  if (typeof window === 'undefined') return;
  const existing = getPortfolioFiles(address);
  const updated  = existing.filter((f) => f.id !== id);
  localStorage.setItem(storageKey(address), JSON.stringify(updated));
}
