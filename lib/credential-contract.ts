'use client';

import { ethers } from 'ethers';
import { SOULBOUND_ABI } from './contract-abi';
import type { SoulBoundToken, VerificationTier } from './types';
import { getTier } from './types';

const RPC_URL = process.env.NEXT_PUBLIC_ZERO_G_RPC || 'https://evmrpc-testnet.0g.ai';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CREDENTIAL_CONTRACT || '';

function getReadOnlyContract(): ethers.Contract | null {
  if (!CONTRACT_ADDRESS) return null;
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    return new ethers.Contract(CONTRACT_ADDRESS, SOULBOUND_ABI, provider);
  } catch {
    return null;
  }
}

/**
 * Fetch all soul-bound tokens for a wallet address from the contract.
 */
export async function getWalletCredentials(walletAddress: string): Promise<SoulBoundToken[]> {
  const contract = getReadOnlyContract();
  if (!contract) return [];

  try {
    const tokenIds: bigint[] = await contract.getWalletTokens(walletAddress);
    if (!tokenIds.length) return [];

    const credentials = await Promise.all(
      tokenIds.map(async (tokenId) => {
        try {
          const cred = await contract.getCredential(tokenId);
          const score = Number(cred.score);
          return {
            tokenId: Number(tokenId),
            recipient: cred.recipient,
            skillCategory: cred.skillCategory,
            score,
            originalityScore: Number(cred.originalityScore),
            qualityScore: Number(cred.qualityScore),
            complexityScore: Number(cred.complexityScore),
            authenticityScore: Number(cred.authenticityScore),
            proofRootHash: cred.proofRootHash,
            fileRootHash: cred.fileRootHash,
            timestamp: Number(cred.timestamp),
            metadataURI: cred.metadataURI,
            tier: getTier(score) as VerificationTier,
            contractAddress: CONTRACT_ADDRESS,
          } satisfies SoulBoundToken;
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
 * Check if a file (by root hash) already has a soul-bound credential minted.
 */
export async function getTokenForFile(fileRootHash: string): Promise<number | null> {
  const contract = getReadOnlyContract();
  if (!contract) return null;

  try {
    const tokenId: bigint = await contract.getTokenByFileHash(fileRootHash);
    return tokenId > 0n ? Number(tokenId) : null;
  } catch {
    return null;
  }
}

/**
 * Fetch a single credential by token ID.
 */
export async function getCredentialById(tokenId: number): Promise<SoulBoundToken | null> {
  const contract = getReadOnlyContract();
  if (!contract) return null;

  try {
    const cred = await contract.getCredential(tokenId);
    const score = Number(cred.score);
    return {
      tokenId,
      recipient: cred.recipient,
      skillCategory: cred.skillCategory,
      score,
      originalityScore: Number(cred.originalityScore),
      qualityScore: Number(cred.qualityScore),
      complexityScore: Number(cred.complexityScore),
      authenticityScore: Number(cred.authenticityScore),
      proofRootHash: cred.proofRootHash,
      fileRootHash: cred.fileRootHash,
      timestamp: Number(cred.timestamp),
      metadataURI: cred.metadataURI,
      tier: getTier(score) as VerificationTier,
      contractAddress: CONTRACT_ADDRESS,
    };
  } catch {
    return null;
  }
}
