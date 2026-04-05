'use client';

import type { JsonRpcSigner } from 'ethers';
import type { UploadProgress } from './types';

const DEFAULT_INDEXER_RPC = process.env.NEXT_PUBLIC_ZERO_G_INDEXER_RPC || 'https://indexer-storage-testnet-turbo.0g.ai';
const DEFAULT_RPC_URL = process.env.NEXT_PUBLIC_ZERO_G_RPC || 'https://evmrpc-testnet.0g.ai';

export interface UploadResult {
  rootHash: string;
  txHash: string;
}

export interface StorageNetworkOpts {
  rpcUrl?: string;
  indexerUrl?: string;
}

/**
 * Upload a browser File to 0G decentralized storage.
 * Uses the browser-compatible 0g-ts-sdk/browser build.
 * Pass `opts` to override the RPC / indexer for the active network.
 */
export async function uploadFileTo0G(
  file: File,
  signer: JsonRpcSigner,
  onProgress?: (progress: UploadProgress) => void,
  opts?: StorageNetworkOpts
): Promise<UploadResult> {
  const INDEXER_RPC = opts?.indexerUrl ?? DEFAULT_INDEXER_RPC;
  const RPC_URL     = opts?.rpcUrl    ?? DEFAULT_RPC_URL;
  // Dynamically import browser build to avoid SSR issues
  const { Blob: ZgBlob, Indexer } = await import('@0gfoundation/0g-ts-sdk/browser' as any);

  onProgress?.({ stage: 'hashing', percent: 10, message: 'Computing Merkle tree…' });

  const zgFile = new ZgBlob(file);
  const [tree, treeErr] = await zgFile.merkleTree();
  if (treeErr) throw new Error(`Merkle tree error: ${treeErr}`);

  const rootHash: string = tree.rootHash();
  onProgress?.({ stage: 'hashing', percent: 30, message: `Root hash: ${rootHash.slice(0, 16)}…` });

  const indexer = new Indexer(INDEXER_RPC);

  // Signal that we're about to request wallet approval
  onProgress?.({ stage: 'wallet', percent: 40, message: 'Waiting for wallet approval…' });

  // Upload — wallet popup appears here when the SDK submits the storage tx.
  // skipTx:false (default) ensures the tx is always submitted so the wallet prompts.
  const [uploadInfo, uploadErr] = await indexer.upload(zgFile, RPC_URL, signer);
  if (uploadErr) {
    const msg = String(uploadErr);
    // User rejected the wallet transaction
    if (
      msg.includes('user rejected') ||
      msg.includes('User rejected') ||
      msg.includes('User denied') ||
      msg.includes('4001') ||
      msg.includes('ACTION_REJECTED')
    ) {
      throw new Error('WALLET_REJECTED');
    }
    // File already on-chain — treat as success
    if (msg.includes('Transaction failed') || msg.includes('Failed to submit transaction') || msg.includes('already')) {
      onProgress?.({ stage: 'confirming', percent: 85, message: 'File already on-chain, confirming…' });
      await new Promise((r) => setTimeout(r, 1000));
      onProgress?.({ stage: 'done', percent: 100, message: 'Upload complete!' });
      return { rootHash, txHash: '' };
    }
    throw new Error(`Upload error: ${uploadErr}`);
  }

  // SDK returns { txHash, rootHash } for single-file uploads
  const txHash: string = (uploadInfo as any)?.txHash || '';

  onProgress?.({ stage: 'confirming', percent: 85, message: 'Confirming on-chain…' });

  // Small delay to let the indexer propagate
  await new Promise((r) => setTimeout(r, 1500));

  onProgress?.({ stage: 'done', percent: 100, message: 'Upload complete!' });

  return { rootHash, txHash };
}

/**
 * Download a file from 0G storage by root hash.
 * Returns a Blob URL for the browser to trigger download.
 */
export async function downloadFileFrom0G(rootHash: string, opts?: StorageNetworkOpts): Promise<string> {
  const { Indexer } = await import('@0gfoundation/0g-ts-sdk/browser' as any);
  const indexer = new Indexer(opts?.indexerUrl ?? DEFAULT_INDEXER_RPC);

  // downloadFileAsStream returns a ReadableStream
  const stream = await indexer.downloadFileAsStream(rootHash);

  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  const blob = new Blob(chunks as BlobPart[]);
  return URL.createObjectURL(blob);
}
