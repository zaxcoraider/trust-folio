'use client';

/**
 * lib/network-context.tsx
 * React context that tracks the active 0G network (testnet / mainnet).
 *
 * Source-of-truth priority:
 *  1. When wallet is connected and on a known 0G chain → follow the wallet.
 *  2. Otherwise → use localStorage preference (or DEFAULT_NETWORK).
 *
 * Wrap the app inside <NetworkProvider> (done in Providers.tsx).
 * Consume with useNetwork() in any client component.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useChainId, useAccount } from 'wagmi';
import {
  NETWORKS,
  CHAIN_ID_TO_NETWORK,
  getNetworkConfig,
  DEFAULT_NETWORK,
  type NetworkKey,
  type NetworkConfig,
} from '@/config/networks';

const STORAGE_KEY = 'trustfolio_active_network';

interface NetworkContextValue {
  activeNetwork: NetworkKey;
  networkConfig: NetworkConfig;
  setNetwork: (network: NetworkKey) => void;
  isMainnet: boolean;
  isTestnet: boolean;
}

const NetworkContext = createContext<NetworkContextValue>({
  activeNetwork: DEFAULT_NETWORK,
  networkConfig: NETWORKS[DEFAULT_NETWORK],
  setNetwork: () => {},
  isMainnet: DEFAULT_NETWORK === 'mainnet',
  isTestnet: DEFAULT_NETWORK === 'testnet',
});

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [activeNetwork, setActiveNetworkState] = useState<NetworkKey>(DEFAULT_NETWORK);
  const chainId = useChainId();
  const { isConnected } = useAccount();

  // Hydrate from localStorage on first render
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as NetworkKey | null;
    if (stored === 'testnet' || stored === 'mainnet') {
      setActiveNetworkState(stored);
    }
  }, []);

  // When wallet is connected and on a known 0G chain, sync context to wallet
  useEffect(() => {
    if (!isConnected) return;
    const networkKey = CHAIN_ID_TO_NETWORK[chainId];
    if (networkKey) {
      setActiveNetworkState(networkKey);
      localStorage.setItem(STORAGE_KEY, networkKey);
    }
  }, [chainId, isConnected]);

  const setNetwork = useCallback((network: NetworkKey) => {
    setActiveNetworkState(network);
    localStorage.setItem(STORAGE_KEY, network);
  }, []);

  const value: NetworkContextValue = {
    activeNetwork,
    networkConfig: getNetworkConfig(activeNetwork),
    setNetwork,
    isMainnet: activeNetwork === 'mainnet',
    isTestnet: activeNetwork === 'testnet',
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
