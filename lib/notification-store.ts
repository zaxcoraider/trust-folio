'use client';

/**
 * notification-store.ts
 * Client-side localStorage store for per-wallet app notifications.
 * Key: trustfolio_notifications_{walletAddress}
 */

import type { AppNotification, NotificationType } from './types';

const KEY_PREFIX = 'trustfolio_notifications_';

// ── Storage key helper ────────────────────────────────────────────────────────

function storageKey(address: string): string {
  return `${KEY_PREFIX}${address.toLowerCase()}`;
}

// ── ID generator ──────────────────────────────────────────────────────────────

function genId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Read ──────────────────────────────────────────────────────────────────────

export function getNotifications(address: string): AppNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(address));
    if (!raw) {
      seedDemoNotifications(address);
      return getNotifications(address);
    }
    return JSON.parse(raw) as AppNotification[];
  } catch {
    return [];
  }
}

export function getUnreadCount(address: string): number {
  return getNotifications(address).filter((n) => !n.read).length;
}

// ── Write ─────────────────────────────────────────────────────────────────────

function saveNotifications(address: string, notifications: AppNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(address), JSON.stringify(notifications));
  } catch { /* quota */ }
}

export function addNotification(
  address: string,
  notif: Omit<AppNotification, 'id' | 'read' | 'walletAddress'>
): AppNotification {
  const full: AppNotification = {
    ...notif,
    id:            genId(),
    read:          false,
    walletAddress: address.toLowerCase(),
  };
  const existing = getNotifications(address);
  // Prepend newest, keep max 100
  const updated = [full, ...existing].slice(0, 100);
  saveNotifications(address, updated);
  return full;
}

export function markRead(address: string, id: string): void {
  const notifications = getNotifications(address).map((n) =>
    n.id === id ? { ...n, read: true } : n
  );
  saveNotifications(address, notifications);
}

export function markAllRead(address: string): void {
  const notifications = getNotifications(address).map((n) => ({ ...n, read: true }));
  saveNotifications(address, notifications);
}

export function deleteNotification(address: string, id: string): void {
  const notifications = getNotifications(address).filter((n) => n.id !== id);
  saveNotifications(address, notifications);
}

// ── Seed ──────────────────────────────────────────────────────────────────────

export function seedDemoNotifications(address: string): void {
  if (typeof window === 'undefined') return;
  const existing = (() => {
    try {
      const raw = localStorage.getItem(storageKey(address));
      return raw ? (JSON.parse(raw) as AppNotification[]) : [];
    } catch {
      return [];
    }
  })();

  if (existing.length > 0) return;

  const now = Math.floor(Date.now() / 1000);

  const demos: AppNotification[] = [
    {
      id:            'demo_notif_1',
      type:          'verification_complete' as NotificationType,
      title:         'Verification Complete',
      message:       'Your portfolio file "smart-contract.sol" has been verified with a Diamond score of 92.',
      timestamp:     now - 3600,
      read:          false,
      walletAddress: address.toLowerCase(),
      link:          '/dashboard',
      amount:        '50',
    },
    {
      id:            'demo_notif_2',
      type:          'governance_proposal' as NotificationType,
      title:         'New Governance Proposal',
      message:       'A new proposal "Reduce marketplace fee from 2.5% to 2%" is now open for voting.',
      timestamp:     now - 86400,
      read:          false,
      walletAddress: address.toLowerCase(),
      link:          '/governance',
    },
    {
      id:            'demo_notif_3',
      type:          'trust_earned' as NotificationType,
      title:         'TRUST Tokens Earned',
      message:       'You earned 30 TRUST tokens for completing a Gold-tier verification.',
      timestamp:     now - 172800,
      read:          true,
      walletAddress: address.toLowerCase(),
      link:          '/trust',
      amount:        '30',
    },
  ];

  saveNotifications(address, demos);
}
