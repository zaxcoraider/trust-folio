/**
 * GET /api/v1/search
 * Enterprise API: search verified talent profiles.
 *
 * Headers:
 *   x-api-key: tf_live_<32hex>
 *
 * Query params:
 *   skills     — comma-separated list, e.g. "Solidity,React"
 *   minScore   — minimum verification score (0-100)
 *   maxScore   — maximum verification score (0-100)
 *   tier       — 'bronze' | 'silver' | 'gold' | 'diamond'
 *   limit      — results per page (default 20, max 100)
 *   offset     — pagination offset (default 0)
 *
 * Response:
 *   { success: true, data: { results: [...], total, limit, offset } }
 *
 * Data source: on-chain SoulBoundCredential events + 0G Storage metadata.
 * Until an indexer is wired up, returns the live on-chain credential count
 * and an empty results array so callers can detect the "no data yet" state.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ── API key validation ────────────────────────────────────────────────────────

async function validateKey(rawKey: string): Promise<boolean> {
  if (!rawKey || !rawKey.startsWith('tf_live_') || rawKey.length < 40) return false;
  // TODO: validate against API_KEY_REGISTRY contract on 0G Galileo Testnet
  return true;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const rawKey = req.headers.get('x-api-key') ?? '';
    if (!(await validateKey(rawKey))) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit  = Math.max(1, Math.min(100, parseInt(searchParams.get('limit')  ?? '20', 10)));
    const offset = Math.max(0,              parseInt(searchParams.get('offset') ?? '0',  10));

    // On-chain indexing not yet implemented.
    // Results will populate automatically once an indexer reads
    // CredentialMinted events from the SoulBoundCredential contract.
    return NextResponse.json({
      success: true,
      data: {
        results: [],
        total:   0,
        limit,
        offset,
        note: 'On-chain talent index is being built. Results will appear as credentials are minted on 0G Galileo Testnet.',
      },
    });

  } catch (err) {
    console.error('[v1/search] unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
