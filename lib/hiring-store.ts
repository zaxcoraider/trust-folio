/**
 * hiring-store.ts
 * Client-side localStorage store for hiring requests and escrow agreements.
 */

import type { HiringRequest, HiringStatus } from './types';
import { ethers } from 'ethers';

const HIRING_KEY = 'trustfolio_hiring_requests';

// ── Read ──────────────────────────────────────────────────────────────────────

export function getAllHiringRequests(): HiringRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HIRING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function getHiringRequest(requestId: string): HiringRequest | null {
  return getAllHiringRequests().find((r) => r.requestId === requestId) ?? null;
}

export function getEmployerRequests(employer: string): HiringRequest[] {
  return getAllHiringRequests().filter(
    (r) => r.employer.toLowerCase() === employer.toLowerCase()
  );
}

export function getTalentRequests(talent: string): HiringRequest[] {
  return getAllHiringRequests().filter(
    (r) => r.talent.toLowerCase() === talent.toLowerCase()
  );
}

export function getActiveHiringRequests(): HiringRequest[] {
  return getAllHiringRequests().filter(
    (r) => r.status === 'pending' || r.status === 'accepted' || r.status === 'completed'
  );
}

// ── Write ─────────────────────────────────────────────────────────────────────

function saveRequest(req: HiringRequest): void {
  if (typeof window === 'undefined') return;
  const all = getAllHiringRequests().filter((r) => r.requestId !== req.requestId);
  all.unshift(req);
  localStorage.setItem(HIRING_KEY, JSON.stringify(all));
}

export function createHiringRequest(
  employer: string,
  talent: string,
  amountEther: string,
  title: string,
  description: string,
  deadlineTimestamp: number,
  contractAddress = '0x0000000000000000000000000000000000000000',
  onChainId?: number,
): HiringRequest {
  const req: HiringRequest = {
    requestId:        `hire_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    employer,
    talent,
    amount:           ethers.parseEther(amountEther).toString(),
    amountEther,
    title,
    description,
    deadline:         deadlineTimestamp,
    createdAt:        Math.floor(Date.now() / 1000),
    status:           'pending',
    talentConfirmed:  false,
    employerReleased: false,
    contractAddress,
    ...(onChainId !== undefined && { onChainId }),
  };
  saveRequest(req);
  return req;
}

export function updateHiringStatus(
  requestId: string,
  status: HiringStatus,
  extraFields: Partial<HiringRequest> = {}
): HiringRequest | null {
  const req = getHiringRequest(requestId);
  if (!req) return null;
  const updated = { ...req, status, ...extraFields };
  saveRequest(updated);
  return updated;
}

export function acceptHiringRequest(requestId: string): HiringRequest | null {
  return updateHiringStatus(requestId, 'accepted', {
    acceptedAt: Math.floor(Date.now() / 1000),
  });
}

export function declineHiringRequest(requestId: string): HiringRequest | null {
  return updateHiringStatus(requestId, 'declined');
}

export function confirmHiringCompletion(requestId: string): HiringRequest | null {
  return updateHiringStatus(requestId, 'completed', {
    completedAt:    Math.floor(Date.now() / 1000),
    talentConfirmed: true,
  });
}

export function releaseHiringPayment(requestId: string): HiringRequest | null {
  return updateHiringStatus(requestId, 'released', {
    releasedAt:      Math.floor(Date.now() / 1000),
    employerReleased: true,
  });
}

export function raiseHiringDispute(requestId: string): HiringRequest | null {
  return updateHiringStatus(requestId, 'disputed');
}

export function cancelHiringRequest(requestId: string): HiringRequest | null {
  return updateHiringStatus(requestId, 'cancelled');
}

// ── Auto-release check ────────────────────────────────────────────────────────

export const AUTO_RELEASE_DAYS = 7;

export function isAutoReleaseReady(req: HiringRequest): boolean {
  if (req.status !== 'completed' || !req.completedAt) return false;
  const readyAt = req.completedAt + AUTO_RELEASE_DAYS * 86400;
  return Math.floor(Date.now() / 1000) >= readyAt;
}

export function getAutoReleaseAt(req: HiringRequest): number | null {
  if (!req.completedAt) return null;
  return req.completedAt + AUTO_RELEASE_DAYS * 86400;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export function getHiringStats(): {
  total: number;
  pending: number;
  active: number;
  completed: number;
  totalVolume: string;
} {
  const all = getAllHiringRequests();
  let totalWei = BigInt(0);
  all.forEach((r) => {
    try { totalWei += BigInt(r.amount); } catch { /* skip */ }
  });

  return {
    total:      all.length,
    pending:    all.filter((r) => r.status === 'pending').length,
    active:     all.filter((r) => r.status === 'accepted').length,
    completed:  all.filter((r) => r.status === 'released').length,
    totalVolume: ethers.formatEther(totalWei),
  };
}
