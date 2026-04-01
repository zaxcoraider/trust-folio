'use client';

/**
 * settings-store.ts
 * Client-side localStorage store for per-wallet user settings.
 * Key: trustfolio_settings_{walletAddress}
 */

import type { UserSettings, ProfileVisibility, HiringAvailability } from './types';

const KEY_PREFIX = 'trustfolio_settings_';

// ── Storage key helper ────────────────────────────────────────────────────────

function storageKey(address: string): string {
  return `${KEY_PREFIX}${address.toLowerCase()}`;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

function defaultSettings(address: string): UserSettings {
  return {
    walletAddress:    address.toLowerCase(),
    displayName:      '',
    title:            '',
    bio:              '',
    avatarHash:       undefined,
    location:         '',
    website:          '',
    github:           '',
    twitter:          '',
    portfolioUrl:     '',
    skills:           [],
    skillCategories:  {},
    expertiseLevels:  {},
    hiringStatus:     'not-available' as HiringAvailability,
    profileRootHash:  undefined,
    visibility:       'public' as ProfileVisibility,
    notifications:    {
      verifications: true,
      sales:         true,
      hires:         true,
      governance:    true,
      rewards:       true,
    },
    updatedAt: Math.floor(Date.now() / 1000),
  };
}

// ── Read ──────────────────────────────────────────────────────────────────────

export function getUserSettings(address: string): UserSettings {
  if (typeof window === 'undefined') return defaultSettings(address);
  try {
    const raw = localStorage.getItem(storageKey(address));
    if (!raw) return defaultSettings(address);
    // Deep-merge stored settings with defaults to handle schema additions
    const stored: Partial<UserSettings> = JSON.parse(raw);
    const defaults = defaultSettings(address);
    return {
      ...defaults,
      ...stored,
      notifications: {
        ...defaults.notifications,
        ...(stored.notifications ?? {}),
      },
      expertiseLevels:  stored.expertiseLevels  ?? {},
      skillCategories:  stored.skillCategories  ?? {},
      skills:           stored.skills           ?? [],
    };
  } catch {
    return defaultSettings(address);
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

export function saveUserSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') return;
  try {
    const withTimestamp: UserSettings = {
      ...settings,
      walletAddress: settings.walletAddress.toLowerCase(),
      updatedAt:     Math.floor(Date.now() / 1000),
    };
    localStorage.setItem(storageKey(settings.walletAddress), JSON.stringify(withTimestamp));
  } catch { /* quota */ }
}

export function updateUserSettings(
  address: string,
  patch: Partial<UserSettings>
): UserSettings {
  const current = getUserSettings(address);
  const updated: UserSettings = {
    ...current,
    ...patch,
    walletAddress: address.toLowerCase(),
    notifications: {
      ...current.notifications,
      ...(patch.notifications ?? {}),
    },
    updatedAt: Math.floor(Date.now() / 1000),
  };
  saveUserSettings(updated);
  return updated;
}
