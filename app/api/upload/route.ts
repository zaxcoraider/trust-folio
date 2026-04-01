import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Allow up to 50MB uploads
export const maxDuration = 60;

const RPC_URL     = process.env.NEXT_PUBLIC_ZERO_G_RPC      || 'https://evmrpc-testnet.0g.ai';
const INDEXER_RPC = process.env.NEXT_PUBLIC_ZERO_G_INDEXER_RPC || 'https://indexer-storage-testnet-turbo.0g.ai';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

export async function POST(req: NextRequest) {
  if (!PRIVATE_KEY) {
    return NextResponse.json({ error: 'Server wallet not configured' }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const { ZgFile, Indexer } = await import('@0gfoundation/0g-ts-sdk');
    const { ethers } = await import('ethers');
    const os   = await import('os');
    const path = await import('path');
    const fs   = await import('fs/promises');

    // Write file to temp path (ZgFile requires a file path)
    const buffer = Buffer.from(await file.arrayBuffer());
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

      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const signer   = new ethers.Wallet(PRIVATE_KEY, provider);
      const indexer  = new Indexer(INDEXER_RPC);

      const [, uploadErr] = await indexer.upload(zgFile, RPC_URL, signer, { skipTx: true });
      await zgFile.close();

      if (uploadErr) {
        const msg = String(uploadErr);
        // Already on-chain — treat as success
        if (msg.includes('Transaction failed') || msg.includes('Failed to submit transaction') || msg.includes('already')) {
          return NextResponse.json({ rootHash, txHash: '' });
        }
        return NextResponse.json({ error: `Upload error: ${uploadErr}` }, { status: 500 });
      }

      return NextResponse.json({ rootHash, txHash: '' });
    } finally {
      await fs.unlink(tmpPath).catch(() => {});
    }

  } catch (err: any) {
    console.error('[upload] error:', err);
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 });
  }
}
