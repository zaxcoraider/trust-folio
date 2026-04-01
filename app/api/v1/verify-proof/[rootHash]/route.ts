/**
 * GET /api/v1/verify-proof/[rootHash]
 * Public endpoint — no API key required.
 * Fetches and validates a TrustFolio verification proof from 0G Storage.
 *
 * Response:
 *   200: { success: true, data: { rootHash, score, tier, skillCategory, breakdown, wallet, verifiedAt, onChainProof } }
 *   400: { success: false, error: 'Invalid root hash' }
 *   404: { success: false, error: 'Proof not found' }
 *   422: { success: false, error: 'Not a valid TrustFolio proof' }
 *   502: { success: false, error: 'Could not retrieve proof from 0G Storage' }
 */

import { NextRequest, NextResponse } from 'next/server';
import os   from 'os';
import path from 'path';
import fs   from 'fs';

export const dynamic = 'force-dynamic';

const INDEXER_RPC = process.env.NEXT_PUBLIC_ZERO_G_INDEXER_RPC || 'https://indexer-storage-testnet-turbo.0g.ai';

// ── Internal proof shape ──────────────────────────────────────────────────────

interface TrustFolioProof {
  version:       string;
  trustfolio:    boolean;
  wallet?:       string;
  fileName?:     string;
  fileRootHash?: string;
  score?:        number;
  tier?:         string;
  skillCategory?: string;
  breakdown?:    {
    originality:  number;
    quality:      number;
    complexity:   number;
    authenticity: number;
    summary:      string;
  };
  aiModel?:      string;
  verifiedAt?:   number;
  network?:      string;
  chainId?:      number;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { rootHash: string } }
) {
  const { rootHash } = params;

  if (!rootHash || rootHash.length < 10) {
    return NextResponse.json(
      { success: false, error: 'Invalid root hash' },
      { status: 400 }
    );
  }

  const tmpFile = path.join(os.tmpdir(), `trustfolio-v1-check-${Date.now()}.json`);

  try {
    // ── Download proof from 0G Storage ────────────────────────────────────────
    const { Indexer } = await import('@0gfoundation/0g-ts-sdk');
    const indexer     = new Indexer(INDEXER_RPC);

    const dlErr = await indexer.download(rootHash, tmpFile, false);
    if (dlErr) {
      return NextResponse.json(
        {
          success: false,
          error:   'Proof not found in 0G Storage. It may not have been uploaded yet.',
        },
        { status: 404 }
      );
    }

    if (!fs.existsSync(tmpFile)) {
      return NextResponse.json(
        { success: false, error: 'Empty or missing proof file' },
        { status: 404 }
      );
    }

    // ── Parse ─────────────────────────────────────────────────────────────────
    const text = fs.readFileSync(tmpFile, 'utf-8');
    let proof: TrustFolioProof;

    try {
      proof = JSON.parse(text) as TrustFolioProof;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Not a valid JSON proof' },
        { status: 422 }
      );
    }

    if (!proof.trustfolio) {
      return NextResponse.json(
        {
          success: false,
          error:   'This root hash does not point to a TrustFolio verification proof.',
        },
        { status: 422 }
      );
    }

    // ── Build normalised response ─────────────────────────────────────────────
    const score         = typeof proof.score === 'number' ? proof.score : null;
    const tier          = proof.tier          ?? 'unverified';
    const skillCategory = proof.skillCategory ?? 'other';
    const wallet        = proof.wallet        ?? null;
    const verifiedAt    = proof.verifiedAt    ?? null;
    const breakdown     = proof.breakdown     ?? null;

    return NextResponse.json({
      success: true,
      data: {
        rootHash,
        score,
        tier,
        skillCategory,
        breakdown,
        wallet,
        fileName:     proof.fileName     ?? null,
        fileRootHash: proof.fileRootHash ?? null,
        verifiedAt,
        network:      proof.network      ?? '0G-Galileo-Testnet',
        chainId:      proof.chainId      ?? 16602,
        aiModel:      proof.aiModel      ?? null,
        version:      proof.version      ?? '1.0',
        onChainProof: true,
      },
    });

  } catch (err: unknown) {
    console.error('[v1/verify-proof] error:', err);
    const msg = err instanceof Error ? err.message : '';

    if (
      msg.includes('not found') ||
      msg.includes('404')       ||
      msg.includes('unavailable')
    ) {
      return NextResponse.json(
        {
          success: false,
          error:   'Proof not found in 0G Storage. It may not have been uploaded yet.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Could not retrieve proof from 0G Storage.' },
      { status: 502 }
    );

  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}
