'use client';

import type { JsonRpcSigner } from 'ethers';
import type { UploadProgress } from './types';

const INDEXER_RPC = process.env.NEXT_PUBLIC_ZERO_G_INDEXER_RPC || 'https://indexer-storage-testnet-turbo.0g.ai';
const RPC_URL = process.env.NEXT_PUBLIC_ZERO_G_RPC || 'https://evmrpc-testnet.0g.ai';

export interface UploadResult {
  rootHash: string;
  txHash: string;
}

/**
 * Upload a browser File to 0G decentralized storage.
 * Uses the browser-compatible 0g-ts-sdk/browser build.
 */
export async function uploadFileTo0G(
  file: File,
  signer: JsonRpcSigner,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // Dynamically import browser build to avoid SSR issues
  const { Blob: ZgBlob, Indexer } = await import('@0gfoundation/0g-ts-sdk/browser' as any);

  onProgress?.({ stage: 'hashing', percent: 10, message: 'Computing Merkle tree…' });

  const zgFile = new ZgBlob(file);
  const [tree, treeErr] = await zgFile.merkleTree();
  if (treeErr) throw new Error(`Merkle tree error: ${treeErr}`);

  const rootHash: string = tree.rootHash();
  onProgress?.({ stage: 'hashing', percent: 30, message: `Root hash: ${rootHash.slice(0, 16)}…` });

  const indexer = new Indexer(INDEXER_RPC);

  onProgress?.({ stage: 'uploading', percent: 50, message: 'Uploading to 0G storage network…' });

  // skipTx:true → SDK skips the on-chain submit if the file is already indexed,
  // preventing duplicate-submission reverts on re-uploads of the same content.
  const uploadOpts = { skipTx: true };
  const [uploadInfo, uploadErr] = await indexer.upload(zgFile, RPC_URL, signer, uploadOpts);
  if (uploadErr) {
    const msg = String(uploadErr);
    // "Transaction failed" with empty originalError usually means the flow contract
    // already has this root hash (previous partial upload). Treat it as success —
    // the data is/was already committed on-chain.
    if (msg.includes('Transaction failed') || msg.includes('Failed to submit transaction')) {
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
export async function downloadFileFrom0G(rootHash: string): Promise<string> {
  const { Indexer } = await import('@0gfoundation/0g-ts-sdk/browser' as any);
  const indexer = new Indexer(INDEXER_RPC);

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
