'use client';

/**
 * trust-store.ts
 * Client-side localStorage simulation of TRUST token & staking state.
 * Key: trustfolio_trust_{walletAddress}
 */

const KEY_PREFIX = 'trustfolio_trust_';

const STAKING_APY = 0.08;        // 8% annual
const DAILY_EARN_CAP = 500;      // max TRUST earned per day via verifications

// Tier earn amounts per verification by verification tier
const VERIFY_EARN: Record<string, number> = {
  diamond: 50,
  gold:    30,
  silver:  20,
  bronze:  10,
};

interface TrustState {
  balance: number;          // TRUST tokens
  staked: number;
  pendingRewards: number;
  stakedAt?: number;
  dailyEarned: number;
  lastEarnDay: number;      // unix day index (Math.floor(timestamp / 86400))
  totalEarned: number;
}

const DEFAULT_STATE: TrustState = {
  balance:        0,
  staked:         0,
  pendingRewards: 0,
  stakedAt:       undefined,
  dailyEarned:    0,
  lastEarnDay:    0,
  totalEarned:    0,
};

// ── Storage key helper ────────────────────────────────────────────────────────

function storageKey(address: string): string {
  return `${KEY_PREFIX}${address.toLowerCase()}`;
}

// ── Read / write ──────────────────────────────────────────────────────────────

export function getTrustState(address: string): TrustState {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE };
  try {
    const raw = localStorage.getItem(storageKey(address));
    if (!raw) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveTrustState(address: string, state: TrustState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(address), JSON.stringify(state));
  } catch { /* storage quota */ }
}

// ── Balance operations ────────────────────────────────────────────────────────

export function addTrustBalance(address: string, amount: number): void {
  if (amount <= 0) return;
  const state = getTrustState(address);
  state.balance += amount;
  saveTrustState(address, state);
}

// ── Staking operations ────────────────────────────────────────────────────────

/**
 * Stake TRUST tokens. Moves amount from balance to staked.
 * Accrues any pending staking rewards first (resets the accrual clock).
 */
export function stakeTrust(address: string, amount: number): TrustState {
  if (amount <= 0) throw new Error('Amount must be positive');
  accrueDailyRewards(address);
  const state = getTrustState(address);
  if (state.balance < amount) throw new Error('Insufficient TRUST balance');
  state.balance -= amount;
  state.staked += amount;
  state.stakedAt = Math.floor(Date.now() / 1000);
  saveTrustState(address, state);
  return { ...state };
}

/**
 * Unstake TRUST tokens. Moves amount from staked back to balance.
 * Accrues any pending rewards before unstaking.
 */
export function unstakeTrust(address: string, amount: number): TrustState {
  if (amount <= 0) throw new Error('Amount must be positive');
  accrueDailyRewards(address);
  const state = getTrustState(address);
  if (state.staked < amount) throw new Error('Insufficient staked balance');
  state.staked -= amount;
  state.balance += amount;
  if (state.staked === 0) state.stakedAt = undefined;
  saveTrustState(address, state);
  return { ...state };
}

/**
 * Claim pending staking rewards. Returns the claimed amount and resets pendingRewards.
 */
export function claimRewards(address: string): number {
  accrueDailyRewards(address);
  const state = getTrustState(address);
  const claimed = state.pendingRewards;
  if (claimed <= 0) return 0;
  state.balance += claimed;
  state.totalEarned += claimed;
  state.pendingRewards = 0;
  saveTrustState(address, state);
  return claimed;
}

/**
 * Calculate and add accrued 8% APY staking rewards for elapsed time since stakedAt.
 * Safe to call multiple times; uses stakedAt as the reference point and resets it.
 */
export function accrueDailyRewards(address: string): void {
  if (typeof window === 'undefined') return;
  const state = getTrustState(address);
  if (state.staked <= 0 || !state.stakedAt) return;

  const nowSec = Math.floor(Date.now() / 1000);
  const elapsedDays = (nowSec - state.stakedAt) / 86400;
  if (elapsedDays < 0.001) return; // less than ~1.5 minutes — skip

  const rewards = state.staked * STAKING_APY * (elapsedDays / 365);
  state.pendingRewards = parseFloat((state.pendingRewards + rewards).toFixed(6));
  state.stakedAt = nowSec; // reset accrual start
  saveTrustState(address, state);
}

/**
 * Earn TRUST for completing a verification. Respects 500/day cap.
 * Returns the actual amount earned (0 if cap reached).
 */
export function earnVerifyReward(address: string, tier: string): number {
  if (typeof window === 'undefined') return 0;
  const state = getTrustState(address);

  const todayIndex = Math.floor(Date.now() / 86400000); // JS ms / ms-per-day
  // Reset daily counter if we're on a new day
  if (state.lastEarnDay !== todayIndex) {
    state.dailyEarned = 0;
    state.lastEarnDay = todayIndex;
  }

  const earnAmount = VERIFY_EARN[tier.toLowerCase()] ?? VERIFY_EARN.bronze;
  const canEarn = Math.min(earnAmount, DAILY_EARN_CAP - state.dailyEarned);
  if (canEarn <= 0) {
    saveTrustState(address, state);
    return 0;
  }

  state.balance += canEarn;
  state.dailyEarned += canEarn;
  state.totalEarned += canEarn;
  saveTrustState(address, state);
  return canEarn;
}

// ── Boost tier ────────────────────────────────────────────────────────────────

/**
 * Returns the staking boost tier for a wallet based on staked amount.
 * none=0, bronze>=100, silver>=500, gold>=2000, diamond>=10000
 */
export function getBoostTier(
  address: string
): 'none' | 'bronze' | 'silver' | 'gold' | 'diamond' {
  const state = getTrustState(address);
  const staked = state.staked;
  if (staked >= 10000) return 'diamond';
  if (staked >= 2000)  return 'gold';
  if (staked >= 500)   return 'silver';
  if (staked >= 100)   return 'bronze';
  return 'none';
}

// ── Formatted stats helper ────────────────────────────────────────────────────

import type { TrustStakeInfo, TrustTokenStats } from './types';

export function getTrustStakeInfo(address: string): TrustStakeInfo {
  accrueDailyRewards(address);
  const state = getTrustState(address);
  return {
    stakedAmount:   state.staked.toFixed(2),
    pendingRewards: state.pendingRewards.toFixed(6),
    boostTier:      getBoostTier(address),
    stakedAt:       state.stakedAt ?? 0,
  };
}

export function getTrustTokenStats(address: string): TrustTokenStats {
  accrueDailyRewards(address);
  const state = getTrustState(address);

  // Platform-wide totals are simulated (in a real app, these come from on-chain)
  const TOTAL_SUPPLY  = 100_000_000;
  const TOTAL_STAKED  = 12_450_000; // simulated
  const CIRCULATING   = TOTAL_SUPPLY - TOTAL_STAKED;

  return {
    totalSupply:        TOTAL_SUPPLY.toLocaleString(),
    totalStaked:        TOTAL_STAKED.toLocaleString(),
    circulatingSupply:  CIRCULATING.toLocaleString(),
    stakingAPY:         8,
    yourBalance:        state.balance.toFixed(2),
    yourStaked:         state.staked.toFixed(2),
    yourPendingRewards: state.pendingRewards.toFixed(6),
  };
}
