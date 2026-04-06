'use client';

/**
 * notification-store.ts
 * Client-side localStorage store for per-wallet app notifications.
 * Key: trustfolio_notifications_{walletAddress}
 */

import type { AppNotification, NotificationType } from './types';

const KEY_PREFIX  = 'trustfolio_notifications_';
const NETWORK_KEY = 'trustfolio_active_network';

// ── Storage key helper ────────────────────────────────────────────────────────

function activeNetwork(): string {
  if (typeof window === 'undefined') return 'testnet';
  return localStorage.getItem(NETWORK_KEY) || 'testnet';
}

function storageKey(address: string): string {
  return `${KEY_PREFIX}${activeNetwork()}_${address.toLowerCase()}`;
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
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
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

