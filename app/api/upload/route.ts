import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Allow up to 50MB uploads
export const maxDuration = 60;

const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Network-specific config
const NETWORK_CONFIG = {
  testnet: {
    rpcUrl:     process.env.NEXT_PUBLIC_ZERO_G_RPC          || 'https://evmrpc-testnet.0g.ai',
    indexerUrl: process.env.NEXT_PUBLIC_ZERO_G_INDEXER_RPC  || 'https://indexer-storage-testnet-turbo.0g.ai',
    skipTx:     true,  // testnet: skip on-chain storage tx (free)
  },
  mainnet: {
    rpcUrl:     process.env.NEXT_PUBLIC_MAINNET_RPC          || 'https://evmrpc.0g.ai',
    indexerUrl: process.env.NEXT_PUBLIC_MAINNET_INDEXER_RPC  || 'https://indexer-storage-turbo.0g.ai',
    skipTx:     false, // mainnet: server wallet pays the storage fee
  },
} as const;

export async function POST(req: NextRequest) {
  if (!PRIVATE_KEY) {
    return NextResponse.json({ error: 'Server wallet not configured' }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const file    = formData.get('file')    as File | null;
    const network = (formData.get('network') as string | null) || 'testnet';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const cfg = NETWORK_CONFIG[network as keyof typeof NETWORK_CONFIG] ?? NETWORK_CONFIG.testnet;

    const { ZgFile, Indexer } = await import('@0gfoundation/0g-ts-sdk');
    const { ethers } = await import('ethers');
    const os   = await import('os');
    const path = await import('path');
    const fs   = await import('fs/promises');

    // Write file to temp path (ZgFile requires a file path)
    const buffer  = Buffer.from(await file.arrayBuffer());
    const tmpPath = path.join(os.tmpdir(), `trustfolio-upload-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
    await fs.writeFile(tmpPath, buffer);

    try {
      const zgFile = await ZgFile.fromFilePath(tmpPath);
      const [tree, treeErr] = await zgFile.merkleTree();
      if (treeErr || !tree) {
        await zgFile.close();
        return NextResponse.json({ error: `Merkle tree error: ${treeErr}` }, { status: 500 });
      }

      const rootHash: string = tree.rootHash();

      const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
      const signer   = new ethers.Wallet(PRIVATE_KEY, provider);
      const indexer  = new Indexer(cfg.indexerUrl);

      const [, uploadErr] = await indexer.upload(zgFile, cfg.rpcUrl, signer, { skipTx: cfg.skipTx });
      await zgFile.close();

      if (uploadErr) {
        const msg = String(uploadErr);
        // File already stored on-chain — treat as success
        if (msg.includes('already')) {
          return NextResponse.json({ rootHash, txHash: '' });
        }
        // On testnet skipTx=true, tx submission errors are non-fatal
        if (cfg.skipTx && (msg.includes('Transaction failed') || msg.includes('Failed to submit transaction'))) {
          return NextResponse.json({ rootHash, txHash: '' });
        }
        return NextResponse.json({ error: `Upload error: ${msg}` }, { status: 500 });
      }

      return NextResponse.json({ rootHash, txHash: '' });
    } finally {
      await fs.unlink(tmpPath).catch(() => {});
    }

  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error('[upload] error:', e);
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 });
  }
}
