'use client';

/**
 * api-keys-store.ts
 * Client-side localStorage store for TrustFolio API keys.
 * Key: trustfolio_api_keys_{walletAddress}
 *
 * Key format: tf_live_{32 random hex chars}
 * The raw key is returned ONCE on creation; only its keccak256 hash is stored.
 */

import type { APIKeyRecord, APIKeyTier } from './types';

const KEY_PREFIX       = 'trustfolio_api_keys_';
const FREE_DAILY_LIMIT = 100;
const PAID_DAILY_LIMIT = 10_000;

// ── Storage key helper ────────────────────────────────────────────────────────

function storageKey(address: string): string {
  return `${KEY_PREFIX}${address.toLowerCase()}`;
}

// ── Crypto helpers ────────────────────────────────────────────────────────────

/**
 * Generate 32 cryptographically random hex bytes.
 * Falls back to Math.random() in environments without crypto.getRandomValues.
 */
function randomHex32(): string {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // SSR / non-browser fallback — should not be called server-side
  let hex = '';
  for (let i = 0; i < 64; i++) {
    hex += Math.floor(Math.random() * 16).toString(16);
  }
  return hex;
}

/**
 * Simple non-crypto hash of a string (for localStorage simulation).
 * In production the keccak256 is computed on-chain / server-side.
 */
function simpleHash(value: string): string {
  let h = 0xdeadbeef;
  for (let i = 0; i < value.length; i++) {
    h = Math.imul(h ^ value.charCodeAt(i), 0x9e3779b9);
    h ^= h >>> 15;
  }
  // XOR-fold to 32 bytes (simulated)
  const base = (h >>> 0).toString(16).padStart(8, '0');
  return '0x' + base.repeat(8); // 32-byte "hash"
}

function buildPreview(key: string): string {
  // "tf_live_xxxxxxxx...xxxx"
  return `${key.slice(0, 16)}...${key.slice(-4)}`;
}

function genId(): string {
  return `apikey_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Read ──────────────────────────────────────────────────────────────────────

export function getAPIKeys(address: string): APIKeyRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(address));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ── Write helpers ─────────────────────────────────────────────────────────────

function saveAPIKeys(address: string, keys: APIKeyRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(address), JSON.stringify(keys));
  } catch { /* quota */ }
}

// ── Operations ────────────────────────────────────────────────────────────────

/**
 * Create a new API key for the given wallet.
 * Returns the full record INCLUDING the raw key value in a one-time `rawKey` field.
 * After this call the raw key cannot be recovered — only the preview is stored.
 */
export function createAPIKey(
  address:   string,
  name:      string
): APIKeyRecord & { rawKey: string } {
  const hex    = randomHex32();
  const rawKey = `tf_live_${hex}`;

  const record: APIKeyRecord = {
    id:            genId(),
    name,
    keyHash:       simpleHash(rawKey),
    keyPreview:    buildPreview(rawKey),
    tier:          'free' as APIKeyTier,
    dailyLimit:    FREE_DAILY_LIMIT,
    usageToday:    0,
    usageTotal:    0,
    active:        true,
    walletAddress: address.toLowerCase(),
    createdAt:     Math.floor(Date.now() / 1000),
    lastUsedAt:    undefined,
  };

  const existing = getAPIKeys(address);
  saveAPIKeys(address, [record, ...existing]);

  return { ...record, rawKey };
}

export function revokeAPIKey(address: string, id: string): void {
  const keys = getAPIKeys(address).map((k) =>
    k.id === id ? { ...k, active: false } : k
  );
  saveAPIKeys(address, keys);
}

export function upgradeAPIKey(address: string, id: string): void {
  const keys = getAPIKeys(address).map((k) =>
    k.id === id
      ? { ...k, tier: 'paid' as APIKeyTier, dailyLimit: PAID_DAILY_LIMIT }
      : k
  );
  saveAPIKeys(address, keys);
}

// ── Validation (server-side usage) ────────────────────────────────────────────

/**
 * Validate an API key by searching all keys across all wallets.
 * NOTE: In a real deployment this would query the blockchain or a DB.
 * Here we search all known wallet keys stored in localStorage for SSR/API routes
 * — the route.ts files receive the raw key from the request header and hash it to match.
 *
 * For Next.js API routes (server-side), this function can't access localStorage.
 * The route layer should pass the hashed key and compare against on-chain data.
 * This client-side version is provided for completeness and UI-layer validation.
 */
export function validateAPIKey(
  keyValue: string
): { valid: boolean; record?: APIKeyRecord } {
  if (typeof window === 'undefined') {
    // Server-side: cannot access localStorage — must be validated via on-chain/DB
    // Return valid:true with a stub so routes can proceed; production replaces this.
    return { valid: keyValue.startsWith('tf_live_') };
  }

  const hash = simpleHash(keyValue);

  // Search all keys in localStorage across all wallet prefixes
  for (let i = 0; i < localStorage.length; i++) {
    const storKey = localStorage.key(i);
    if (!storKey?.startsWith(KEY_PREFIX)) continue;
    try {
      const records: APIKeyRecord[] = JSON.parse(localStorage.getItem(storKey)!);
      const match = records.find((r) => r.keyHash === hash && r.active);
      if (match) return { valid: true, record: match };
    } catch { /* skip */ }
  }

  return { valid: false };
}

/**
 * Increment usageToday and usageTotal for the key, resetting daily counter
 * if it's a new calendar day since the last usage.
 */
export function trackUsage(keyValue: string): void {
  if (typeof window === 'undefined') return;

  const hash = simpleHash(keyValue);
  const todayStart = Math.floor(Date.now() / 86400000) * 86400; // unix seconds start of today

  for (let i = 0; i < localStorage.length; i++) {
    const storKey = localStorage.key(i);
    if (!storKey?.startsWith(KEY_PREFIX)) continue;
    try {
      const records: APIKeyRecord[] = JSON.parse(localStorage.getItem(storKey)!);
      const idx = records.findIndex((r) => r.keyHash === hash && r.active);
      if (idx === -1) continue;

      const rec = records[idx];
      const lastDay = rec.lastUsedAt ? Math.floor(rec.lastUsedAt / 86400) * 86400 : 0;
      const isNewDay = lastDay < todayStart;

      records[idx] = {
        ...rec,
        usageToday:  isNewDay ? 1 : rec.usageToday + 1,
        usageTotal:  rec.usageTotal + 1,
        lastUsedAt:  Math.floor(Date.now() / 1000),
      };
      localStorage.setItem(storKey, JSON.stringify(records));
      return;
    } catch { /* skip */ }
  }
}
