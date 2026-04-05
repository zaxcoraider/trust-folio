import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * File uploads to 0G Storage are now handled client-side.
 * FileUploader calls uploadFileTo0G() directly using the user's connected wallet
 * (via useWalletClient + walletClientToSigner). No server wallet (PRIVATE_KEY) needed.
 *
 * This route is intentionally disabled.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Upload is now handled client-side. Use the FileUploader component which calls 0G Storage directly from the connected wallet.' },
    { status: 410 }
  );
}
