'use client';

import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '@/lib/wagmi-config';
import { NetworkProvider } from '@/lib/network-context';
import { useState, useEffect } from 'react';

// Suppress WalletConnect WebSocket noise at module load — before React hydrates
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason?.message?.includes('Connection interrupted')) e.preventDefault();
  });
  window.addEventListener('error', (e) => {
    if (e.message?.includes('Connection interrupted')) e.preventDefault();
  });
}

// Unconditionally wipe all app data on this version bump — clears any leftover demo/test data
const PURGE_DONE_KEY = 'trustfolio_purged_v3';

const PURGE_KEYS = [
  'trustfolio_all_infts',
  'trustfolio_listings',
  'trustfolio_governance',
  'trustfolio_governance_votes',
  'trustfolio_hiring_requests',
];

function purgeDemoData() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(PURGE_DONE_KEY)) return;
  for (const key of PURGE_KEYS) {
    localStorage.removeItem(key);
  }
  // Wipe all per-wallet INFT keys (trustfolio_inft_<tokenId>)
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('trustfolio_inft_') || key.startsWith('trustfolio_notifications_')) {
      localStorage.removeItem(key);
    }
  }
  localStorage.setItem(PURGE_DONE_KEY, '1');
}

import '@rainbow-me/rainbowkit/styles.css';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => { purgeDemoData(); }, []);


  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#a855f7',
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
          modalSize="compact"
        >
          <NetworkProvider>
            {children}
          </NetworkProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
