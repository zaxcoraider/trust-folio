'use client';

import { useState, useEffect } from 'react';
import { X, Droplets } from 'lucide-react';
import { useNetwork } from '@/lib/network-context';

const DISMISSED_KEY = 'trustfolio_testnet_banner_dismissed';

export function TestnetBanner() {
  const { isTestnet, networkConfig } = useNetwork();
  // Start as dismissed to avoid a flash before localStorage is read
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === '1');
  }, []);

  // Re-check dismissed state whenever the user switches back to testnet
  useEffect(() => {
    if (isTestnet) {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === '1');
    }
  }, [isTestnet]);

  if (!isTestnet || dismissed) return null;

  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-2"
      style={{
        background: 'rgba(245,158,11,0.05)',
        borderBottom: '1px solid rgba(245,158,11,0.18)',
        boxShadow: '0 0 20px rgba(245,158,11,0.04) inset',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
          style={{ background: '#f59e0b', boxShadow: '0 0 6px rgba(245,158,11,0.8)' }}
        />
        <p className="font-mono text-[11px] text-amber-400/80 truncate">
          You&apos;re on{' '}
          <span className="text-amber-400 font-semibold">Galileo Testnet</span>
          {' — '}transactions use test tokens only
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {networkConfig.faucet && (
          <a
            href={networkConfig.faucet}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[10px] font-semibold transition-all duration-200"
            style={{
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.3)',
              color: '#f59e0b',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                'rgba(245,158,11,0.2)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                'rgba(245,158,11,0.12)';
            }}
          >
            <Droplets size={10} />
            Get free tokens
          </a>
        )}
        <button
          onClick={() => {
            setDismissed(true);
            localStorage.setItem(DISMISSED_KEY, '1');
          }}
          className="p-1 text-amber-400/40 hover:text-amber-400/80 transition-colors"
          aria-label="Dismiss banner"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
