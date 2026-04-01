/**
 * GET /api/v1/profile/[wallet]
 * Enterprise API: fetch full verified profile for a wallet address.
 *
 * Headers:
 *   x-api-key: tf_live_<32hex>
 *
 * Response:
 *   200: { success: true, data: { wallet, verifications, soulBoundTokens, infts, stats } }
 *   401: { success: false, error: 'Invalid API key' }
 *   404: { success: false, error: 'Wallet not found' }
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ── API key validation (server-side) ─────────────────────────────────────────

async function validateKey(rawKey: string): Promise<boolean> {
  if (!rawKey || !rawKey.startsWith('tf_live_') || rawKey.length < 40) return false;
  // TODO: validate against API_KEY_REGISTRY contract on 0G Galileo Testnet
  return true;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { wallet: string } }
) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const rawKey = req.headers.get('x-api-key') ?? '';
    if (!(await validateKey(rawKey))) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // ── Validate wallet ───────────────────────────────────────────────────────
    const { wallet } = params;
    if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    const walletLower = wallet.toLowerCase();

    // ── Fetch verification records from 0G Storage via check route ────────────
    // NOTE: In production this reads from the on-chain SoulBound contract +
    // verification-store localStorage (client-side). The API route serves as a
    // passthrough for server-side consumers; the data shown is reconstructed
    // from proof hashes stored on 0G Storage or returned as empty arrays when
    // the wallet has no on-chain activity.
    //
    // For this simulation we return a structured response with empty/stub data
    // because server-side localStorage is unavailable. The frontend queries this
    // data directly from hooks; the enterprise API is for programmatic access.

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (req.headers.get('x-forwarded-host')
          ? `https://${req.headers.get('x-forwarded-host')}`
          : 'http://localhost:3000');

    // Attempt to look up any proofs from 0G Storage via the internal check route.
    // The verification history is not queryable server-side without an index.
    // We return the wallet profile skeleton; populate on-chain data when available.

    const verifications: unknown[] = [];
    const soulBoundTokens: unknown[] = [];
    const infts: unknown[] = [];

    // If we have an on-chain index or 0G Storage indexer, query it here.
    // For now, return the wallet address with empty credential arrays.
    // A real implementation would:
    //   1. Call SoulBoundToken.balanceOf(wallet) to count tokens
    //   2. Enumerate tokenIds via SoulBoundToken.tokenOfOwnerByIndex()
    //   3. Fetch metadata from 0G Storage using the metadataURI
    //   4. Reconstruct VerificationRecord objects

    const totalVerifications = verifications.length;
    const totalINFTs         = infts.length;
    const averageScore       = 0;
    const topTier            = 'unverified';

    if (totalVerifications === 0 && totalINFTs === 0 && soulBoundTokens.length === 0) {
      // Wallet exists but has no TrustFolio activity — still return 200 with empty profile
      // (not a 404 because the wallet address itself is valid)
    }

    return NextResponse.json({
      success: true,
      data: {
        wallet:           walletLower,
        displayName:      shortAddress(wallet),
        verifications,
        soulBoundTokens,
        infts,
        stats: {
          totalVerifications,
          averageScore,
          topTier,
          totalINFTs,
        },
      },
      _note: 'Server-side profile reads are limited; use client-side hooks for full data.',
    });

  } catch (err) {
    console.error('[v1/profile] unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
