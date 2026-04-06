'use client';

import type { PortfolioFile } from './types';

const KEY_PREFIX = 'trustfolio_files_';
const NETWORK_STORAGE_KEY = 'trustfolio_active_network';

function storageKey(address: string): string {
  const network = localStorage.getItem(NETWORK_STORAGE_KEY) || 'testnet';
  return `${KEY_PREFIX}${network}_${address.toLowerCase()}`;
}

/** One-time migration: move data from old network-unaware key to the new one. */
function migrateIfNeeded(address: string): void {
  const oldKey = `${KEY_PREFIX}${address.toLowerCase()}`;
  const newKey = storageKey(address);
  if (localStorage.getItem(newKey) !== null) return; // already migrated
  const old = localStorage.getItem(oldKey);
  if (old) {
    localStorage.setItem(newKey, old);
    localStorage.removeItem(oldKey);
  }
}

export function getPortfolioFiles(address: string): PortfolioFile[] {
  if (typeof window === 'undefined') return [];
  try {
    migrateIfNeeded(address);
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
