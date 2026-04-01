/**
 * GET  /api/profile-hash?wallet=0x...  → { hash: string | null }
 * POST /api/profile-hash               ← { wallet, hash }  → { success: true }
 *
 * Simple in-memory store mapping wallet addresses to their 0G profile root hashes.
 * Data persists for the duration of a Node.js process / serverless warm period.
 * For production persistence, swap the Map for a DB or on-chain contract.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Module-level Map — shared across requests within the same process instance
const profileHashes = new Map<string, string>();

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet')?.toLowerCase();
  if (!wallet) {
    return NextResponse.json({ error: 'Missing wallet param' }, { status: 400 });
  }
  return NextResponse.json({ hash: profileHashes.get(wallet) ?? null });
}

export async function POST(req: NextRequest) {
  let body: { wallet?: string; hash?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { wallet, hash } = body;
  if (!wallet || !hash) {
    return NextResponse.json({ error: 'Missing wallet or hash' }, { status: 400 });
  }
  if (!/^0x[0-9a-fA-F]{40}$/i.test(wallet)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
  }

  profileHashes.set(wallet.toLowerCase(), hash);
  return NextResponse.json({ success: true });
}
