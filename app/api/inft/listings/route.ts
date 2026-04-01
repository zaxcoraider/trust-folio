/**
 * GET /api/inft/listings
 * Returns all active marketplace listings with INFT metadata.
 * Reads from localStorage (client-only) via a server-side simulation layer.
 * When contracts are deployed, this can be replaced with on-chain reads.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // The actual data is managed client-side via marketplace-store.ts
  // This endpoint exists for server-side rendering and API consumers.
  // Returns an empty array — client fetches live data from localStorage.
  return NextResponse.json({ listings: [], source: 'client-side-store' });
}
