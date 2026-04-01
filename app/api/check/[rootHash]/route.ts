import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

const INDEXER_RPC = process.env.NEXT_PUBLIC_ZERO_G_INDEXER_RPC || 'https://indexer-storage-testnet-turbo.0g.ai';

export async function GET(
  _req: NextRequest,
  { params }: { params: { rootHash: string } }
) {
  const { rootHash } = params;

  if (!rootHash || rootHash.length < 10) {
    return NextResponse.json({ error: 'Invalid root hash' }, { status: 400 });
  }

  // Temp file path for the downloaded proof
  const tmpFile = path.join(os.tmpdir(), `trustfolio-proof-${Date.now()}.json`);

  try {
    // Dynamic import to avoid SSR/webpack issues with the 0G SDK
    const { Indexer } = await import('@0gfoundation/0g-ts-sdk');

    const indexer = new Indexer(INDEXER_RPC);

    // download(rootHash, filePath, withProof?) → Error | null
    const err = await indexer.download(rootHash, tmpFile, false);
    if (err) {
      return NextResponse.json(
        { error: 'Root hash not found in 0G Storage. It may not have been uploaded yet.' },
        { status: 404 }
      );
    }

    if (!fs.existsSync(tmpFile)) {
      return NextResponse.json({ error: 'Empty file or not found' }, { status: 404 });
    }

    const text = fs.readFileSync(tmpFile, 'utf-8');

    // Parse and validate it's a TrustFolio proof
    let proof: Record<string, unknown>;
    try {
      proof = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Not a valid JSON proof' }, { status: 422 });
    }

    if (!proof.trustfolio) {
      return NextResponse.json(
        { error: 'This root hash does not point to a TrustFolio verification proof.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ proof, rootHash });

  } catch (err: any) {
    console.error('[check] download error:', err);

    const msg = err?.message || '';
    if (msg.includes('not found') || msg.includes('404') || msg.includes('unavailable')) {
      return NextResponse.json(
        { error: 'Root hash not found in 0G Storage. It may not have been uploaded yet.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Could not retrieve proof from 0G Storage.' },
      { status: 502 }
    );
  } finally {
    // Clean up temp file
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}
