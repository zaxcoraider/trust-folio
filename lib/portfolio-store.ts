'use client';

import type { PortfolioFile } from './types';

const KEY_PREFIX = 'trustfolio_files_';

function storageKey(address: string): string {
  return `${KEY_PREFIX}${address.toLowerCase()}`;
}

export function getPortfolioFiles(address: string): PortfolioFile[] {
  if (typeof window === 'undefined') return [];
  try {
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
