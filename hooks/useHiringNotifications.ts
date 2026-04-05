'use client';

/**
 * hooks/useHiringNotifications.ts
 *
 * Polls the hiring contract for requests involving the connected wallet.
 * Generates per-wallet localStorage notifications for new events so that
 * both employer and talent get notified on their own devices.
 *
 * Seen-IDs are stored per wallet so repeat visits don't re-notify.
 */

import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useNetwork } from '@/lib/network-context';
import { fetchHiringRequestsForAddress } from '@/lib/chain-reader';
import { addNotification, getNotifications } from '@/lib/notification-store';

const SEEN_KEY_PREFIX = 'trustfolio_seen_hire_';
const POLL_INTERVAL_MS = 20_000; // re-check every 20s

function seenKey(address: string): string {
  return `${SEEN_KEY_PREFIX}${address.toLowerCase()}`;
}

function getSeenIds(address: string): Set<string> {
  try {
    const raw = localStorage.getItem(seenKey(address));
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenIds(address: string, ids: Set<string>): void {
  try {
    localStorage.setItem(seenKey(address), JSON.stringify([...ids]));
  } catch { /* quota */ }
}

export function useHiringNotifications() {
  const { address, isConnected } = useAccount();
  const { networkConfig }        = useNetwork();
  const timerRef                 = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isConnected || !address) return;

    async function poll() {
      if (!address) return;

      try {
        const { employerRequests, talentRequests } = await fetchHiringRequestsForAddress(
          networkConfig,
          address,
        );

        const seen = getSeenIds(address);
        const newSeen = new Set(seen);

        // ── Talent: notify on new pending hire requests ───────────────────────
        for (const req of talentRequests) {
          const key = `hire_${req.requestId}`;
          if (!seen.has(key) && req.status === 'pending') {
            addNotification(address, {
              type:      'hire_request',
              title:     'New Hire Request',
              message:   `"${req.title}" — ${parseFloat(req.amountEther).toFixed(3)} 0G in escrow`,
              timestamp: Math.floor(Date.now() / 1000),
              link:      `/hire/${req.requestId}`,
            });
            newSeen.add(key);
          }
          // mark non-pending requests as seen so we don't notify about them later
          if (!seen.has(key)) newSeen.add(key);
        }

        // ── Employer: notify when talent accepts ─────────────────────────────
        for (const req of employerRequests) {
          const key = `accepted_${req.requestId}`;
          if (!seen.has(key) && (req.status === 'accepted' || req.status === 'completed' || req.status === 'released')) {
            addNotification(address, {
              type:      'escrow_released',
              title:     req.status === 'released' ? 'Payment Released' : 'Offer Accepted',
              message:   req.status === 'released'
                ? `"${req.title}" — payment released from escrow`
                : `"${req.title}" — talent accepted your offer`,
              timestamp: Math.floor(Date.now() / 1000),
              link:      `/hire/${req.requestId}`,
            });
            newSeen.add(key);
          }
        }

        // ── Talent: notify when employer releases payment ─────────────────────
        for (const req of talentRequests) {
          const key = `released_${req.requestId}`;
          if (!seen.has(key) && req.status === 'released') {
            addNotification(address, {
              type:      'escrow_released',
              title:     'Payment Released!',
              message:   `"${req.title}" — ${parseFloat(req.amountEther).toFixed(3)} 0G sent to your wallet`,
              timestamp: Math.floor(Date.now() / 1000),
              link:      `/hire/${req.requestId}`,
            });
            newSeen.add(key);
          }
        }

        saveSeenIds(address, newSeen);
      } catch {
        // Non-fatal — contract may not be deployed yet
      }
    }

    // Run immediately, then poll
    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [address, isConnected, networkConfig]);
}
