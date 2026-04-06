'use client';

import { ethers } from 'ethers';
import { SOULBOUND_ABI } from './contract-abi';
import type { SoulBoundToken, VerificationTier } from './types';
import { getTier } from './types';
import type { NetworkConfig } from '@/config/networks';
import { NETWORKS } from '@/config/networks';

function getReadOnlyContract(networkConfig: NetworkConfig): ethers.Contract | null {
  const address = networkConfig.contracts.soulbound;
  if (!address) return null;
  try {
    const provider = new ethers.JsonRpcProvider(networkConfig.rpc);
    return new ethers.Contract(address, SOULBOUND_ABI, provider);
  } catch {
    return null;
  }
}

function tokenFromRaw(
  tokenId: number,
  cred: { recipient: string; skillCategory: string; score: bigint; originalityScore: bigint; qualityScore: bigint; complexityScore: bigint; authenticityScore: bigint; proofRootHash: string; fileRootHash: string; metadataURI: string },
  contractAddress: string,
): SoulBoundToken {
  const score = Number(cred.score);
  return {
    tokenId,
    recipient:         cred.recipient,
    skillCategory:     cred.skillCategory,
    score,
    originalityScore:  Number(cred.originalityScore),
    qualityScore:      Number(cred.qualityScore),
    complexityScore:   Number(cred.complexityScore),
    authenticityScore: Number(cred.authenticityScore),
    proofRootHash:     cred.proofRootHash,
    fileRootHash:      cred.fileRootHash,
    timestamp:         0,
    metadataURI:       cred.metadataURI,
    tier:              getTier(score) as VerificationTier,
    contractAddress,
  };
}

/**
 * Fetch all soul-bound tokens for a wallet from the active network's contract.
 */
export async function getWalletCredentials(
  walletAddress: string,
  networkConfig?: NetworkConfig,
): Promise<SoulBoundToken[]> {
  const cfg     = networkConfig ?? NETWORKS.testnet;
  const contract = getReadOnlyContract(cfg);
  if (!contract) return [];

  try {
    const tokenIds: bigint[] = await contract.getWalletTokens(walletAddress);
    if (!tokenIds.length) return [];

    const credentials = await Promise.all(
      tokenIds.map(async (tokenId) => {
        try {
          const cred = await contract.getCredential(tokenId);
          return tokenFromRaw(Number(tokenId), cred, cfg.contracts.soulbound);
        } catch {
          return null;
        }
      })
    );

    return credentials.filter((c): c is SoulBoundToken => c !== null);
  } catch {
    return [];
  }
}

/**
 * Check if a file already has a soul-bound credential on the active network.
 */
export async function getTokenForFile(
  fileRootHash: string,
  networkConfig?: NetworkConfig,
): Promise<number | null> {
  const contract = getReadOnlyContract(networkConfig ?? NETWORKS.testnet);
  if (!contract) return null;
  try {
    const tokenId: bigint = await contract.getTokenByFileHash(fileRootHash);
    return tokenId > 0n ? Number(tokenId) : null;
  } catch {
    return null;
  }
}

/**
 * Fetch a single credential by token ID from the active network.
 */
export async function getCredentialById(
  tokenId: number,
  networkConfig?: NetworkConfig,
): Promise<SoulBoundToken | null> {
  const cfg      = networkConfig ?? NETWORKS.testnet;
  const contract = getReadOnlyContract(cfg);
  if (!contract) return null;
  try {
    const cred = await contract.getCredential(tokenId);
    return tokenFromRaw(tokenId, cred, cfg.contracts.soulbound);
  } catch {
    return null;
  }
}
