import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { SOULBOUND_ABI } from '@/lib/contract-abi';

export const dynamic = 'force-dynamic';

/**
 * POST /api/mint
 * Server-side soul-bound credential minting.
 * mintCredential() is onlyOwner — the platform owner wallet signs the tx.
 *
 * Body: { address, skillCategory, score, breakdown, proofRootHash, fileRootHash, metadataURI }
 */
export async function POST(req: Request) {
  try {
    const {
      address,
      skillCategory,
      score,
      breakdown,
      proofRootHash,
      fileRootHash,
      metadataURI,
    } = await req.json();

    if (!address || !skillCategory || score === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const privateKey       = process.env.PRIVATE_KEY;
    const contractAddress  = process.env.CREDENTIAL_CONTRACT || process.env.NEXT_PUBLIC_CREDENTIAL_CONTRACT;
    const rpcUrl           = process.env.NEXT_PUBLIC_ZERO_G_RPC || 'https://evmrpc-testnet.0g.ai';

    if (!privateKey) {
      return NextResponse.json({ error: 'Minting service not configured (PRIVATE_KEY missing)' }, { status: 503 });
    }
    if (!contractAddress) {
      return NextResponse.json({ error: 'Contract address not configured' }, { status: 503 });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer   = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, SOULBOUND_ABI as unknown as string[], signer);

    const tx = await contract.mintCredential(
      address,
      skillCategory,
      score,
      breakdown?.originality  ?? 0,
      breakdown?.quality      ?? 0,
      breakdown?.complexity   ?? 0,
      breakdown?.authenticity ?? 0,
      proofRootHash  || '',
      fileRootHash   || '',
      metadataURI    || '',
    );

    const receipt = await tx.wait();

    // Parse tokenId from CredentialMinted event
    let tokenId = 0;
    const iface = new ethers.Interface(SOULBOUND_ABI as unknown as string[]);
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed?.name === 'CredentialMinted') {
          tokenId = Number(parsed.args[0]);
          break;
        }
      } catch { /* skip */ }
    }

    return NextResponse.json({ txHash: tx.hash, tokenId });
  } catch (err: unknown) {
    const msg = (err as { reason?: string; shortMessage?: string; message?: string })?.reason
      || (err as { shortMessage?: string })?.shortMessage
      || (err as { message?: string })?.message
      || 'Minting failed';
    console.error('[mint]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
