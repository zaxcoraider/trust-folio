/**
 * config/networks.ts
 * Central network configuration for 0G Testnet (Galileo) and 0G Mainnet.
 * All RPC URLs, explorer links, indexer endpoints, and contract addresses live here.
 */

export type NetworkKey = 'testnet' | 'mainnet';

export interface NetworkContracts {
  storageFlow: string;
  soulbound: string;
  marketplace: string;
  inft: string;
  hiring: string;
  token: string;
  staking: string;
  governor: string;
  rewardsDistributor: string;
  timeLock: string;
  treasury: string;
  crossChainVerifier: string;
  apiKeyRegistry: string;
}

export interface NetworkConfig {
  key: NetworkKey;
  chainId: number;
  name: string;
  shortName: string;
  rpc: string;
  explorer: string;
  storageIndexer: string;
  storageExplorer: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  faucet: string | null;
  isTestnet: boolean;
  contracts: NetworkContracts;
}

export const NETWORKS: Record<NetworkKey, NetworkConfig> = {
  testnet: {
    key: 'testnet',
    chainId: 16602,
    name: 'Galileo Testnet',
    shortName: 'Testnet',
    rpc: 'https://evmrpc-testnet.0g.ai',
    explorer: 'https://chainscan-galileo.0g.ai',
    storageIndexer: 'https://indexer-storage-testnet-turbo.0g.ai',
    storageExplorer: 'https://storagescan-galileo.0g.ai',
    nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
    faucet: 'https://faucet.0g.ai',
    isTestnet: true,
    contracts: {
      storageFlow:
        process.env.NEXT_PUBLIC_TESTNET_STORAGE_FLOW ||
        process.env.NEXT_PUBLIC_STORAGE_FLOW_CONTRACT ||
        '0x22E03a6A89B950F1c82ec5e74F8eCa321a105296',
      soulbound:
        process.env.NEXT_PUBLIC_TESTNET_SOULBOUND_ADDRESS ||
        process.env.NEXT_PUBLIC_CREDENTIAL_CONTRACT ||
        '',
      marketplace:
        process.env.NEXT_PUBLIC_TESTNET_MARKETPLACE_ADDRESS ||
        process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT ||
        '',
      inft:
        process.env.NEXT_PUBLIC_TESTNET_INFT_ADDRESS ||
        process.env.NEXT_PUBLIC_INFT_CONTRACT ||
        '',
      hiring:
        process.env.NEXT_PUBLIC_TESTNET_HIRING_ADDRESS ||
        process.env.NEXT_PUBLIC_HIRING_ESCROW_CONTRACT ||
        '',
      token:
        process.env.NEXT_PUBLIC_TESTNET_TOKEN_ADDRESS ||
        process.env.NEXT_PUBLIC_TRUST_TOKEN_CONTRACT ||
        '',
      staking:
        process.env.NEXT_PUBLIC_TESTNET_STAKING_ADDRESS ||
        process.env.NEXT_PUBLIC_STAKING_CONTRACT ||
        '',
      governor:
        process.env.NEXT_PUBLIC_TESTNET_GOVERNOR_ADDRESS ||
        process.env.NEXT_PUBLIC_TRUST_GOVERNOR_CONTRACT ||
        '',
      rewardsDistributor:
        process.env.NEXT_PUBLIC_TESTNET_REWARDS_DISTRIBUTOR ||
        process.env.NEXT_PUBLIC_REWARDS_DISTRIBUTOR_CONTRACT ||
        '',
      timeLock:
        process.env.NEXT_PUBLIC_TESTNET_TIMELOCK ||
        process.env.NEXT_PUBLIC_TIMELOCK_CONTRACT ||
        '',
      treasury:
        process.env.NEXT_PUBLIC_TESTNET_TREASURY ||
        process.env.NEXT_PUBLIC_TREASURY_CONTRACT ||
        '',
      crossChainVerifier:
        process.env.NEXT_PUBLIC_TESTNET_CROSS_CHAIN_VERIFIER ||
        process.env.NEXT_PUBLIC_CROSS_CHAIN_VERIFIER_CONTRACT ||
        '',
      apiKeyRegistry:
        process.env.NEXT_PUBLIC_TESTNET_API_KEY_REGISTRY ||
        process.env.NEXT_PUBLIC_API_KEY_REGISTRY_CONTRACT ||
        '',
    },
  },

  mainnet: {
    key: 'mainnet',
    chainId: 16661,
    name: '0G Mainnet',
    shortName: 'Mainnet',
    rpc: 'https://evmrpc.0g.ai',
    explorer: 'https://chainscan.0g.ai',
    storageIndexer: process.env.NEXT_PUBLIC_MAINNET_INDEXER_RPC || '',
    storageExplorer: 'https://storagescan.0g.ai',
    nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
    faucet: null,
    isTestnet: false,
    contracts: {
      storageFlow:        process.env.NEXT_PUBLIC_MAINNET_STORAGE_FLOW          || '',
      soulbound:          process.env.NEXT_PUBLIC_MAINNET_SOULBOUND_ADDRESS      || '',
      marketplace:        process.env.NEXT_PUBLIC_MAINNET_MARKETPLACE_ADDRESS    || '',
      inft:               process.env.NEXT_PUBLIC_MAINNET_INFT_ADDRESS           || '',
      hiring:             process.env.NEXT_PUBLIC_MAINNET_HIRING_ADDRESS         || '',
      token:              process.env.NEXT_PUBLIC_MAINNET_TOKEN_ADDRESS          || '',
      staking:            process.env.NEXT_PUBLIC_MAINNET_STAKING_ADDRESS        || '',
      governor:           process.env.NEXT_PUBLIC_MAINNET_GOVERNOR_ADDRESS       || '',
      rewardsDistributor: process.env.NEXT_PUBLIC_MAINNET_REWARDS_DISTRIBUTOR    || '',
      timeLock:           process.env.NEXT_PUBLIC_MAINNET_TIMELOCK               || '',
      treasury:           process.env.NEXT_PUBLIC_MAINNET_TREASURY               || '',
      crossChainVerifier: process.env.NEXT_PUBLIC_MAINNET_CROSS_CHAIN_VERIFIER   || '',
      apiKeyRegistry:     process.env.NEXT_PUBLIC_MAINNET_API_KEY_REGISTRY       || '',
    },
  },
};

/** Map chain ID → NetworkKey */
export const CHAIN_ID_TO_NETWORK: Record<number, NetworkKey> = {
  16602: 'testnet',
  16661: 'mainnet',
};

/** Accepted 0G chain IDs */
export const ZG_CHAIN_IDS = [16602, 16661] as const;

export function getNetworkByChainId(chainId: number): NetworkConfig | null {
  const key = CHAIN_ID_TO_NETWORK[chainId];
  return key ? NETWORKS[key] : null;
}

export function getNetworkConfig(key: NetworkKey): NetworkConfig {
  return NETWORKS[key];
}

export const DEFAULT_NETWORK: NetworkKey =
  (process.env.NEXT_PUBLIC_DEFAULT_NETWORK as NetworkKey | undefined) === 'mainnet'
    ? 'mainnet'
    : 'testnet';
