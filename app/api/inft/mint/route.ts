import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { INFT_ABI } from '@/lib/contracts';

export const dynamic = 'force-dynamic';

/**
 * POST /api/inft/mint
 * Server-side INFT minting.
 * mintINFT() is onlyOwner — the platform owner wallet signs the tx.
 *
 * Body: { address, skillCategory, score, breakdown, encryptedMetadataHash,
 *         proofRootHash, fileRootHash, badges, metadataURI }
 */
export async function POST(req: Request) {
  try {
    const {
      address,
      skillCategory,
      score,
      breakdown,
      encryptedMetadataHash,
      proofRootHash,
      fileRootHash,
      badges,
      metadataURI,
    } = await req.json();

    if (!address || !skillCategory || score === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const privateKey      = process.env.PRIVATE_KEY;
    const contractAddress = process.env.INFT_CONTRACT || process.env.NEXT_PUBLIC_INFT_CONTRACT;
    const rpcUrl          = process.env.NEXT_PUBLIC_ZERO_G_RPC || 'https://evmrpc-testnet.0g.ai';

    if (!privateKey) {
      return NextResponse.json({ error: 'Minting service not configured (PRIVATE_KEY missing)' }, { status: 503 });
    }
    if (!contractAddress) {
      return NextResponse.json({ error: 'INFT contract address not configured' }, { status: 503 });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer   = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, INFT_ABI as unknown as string[], signer);

    const mintingFee: bigint = await contract.mintingFee().catch(() => 0n);

    const tx = await contract.mintINFT(
      address,
      skillCategory,
      score,
      breakdown?.originality  ?? 0,
      breakdown?.quality      ?? 0,
      breakdown?.complexity   ?? 0,
      breakdown?.authenticity ?? 0,
      encryptedMetadataHash || '',
      proofRootHash         || '',
      fileRootHash          || `nohash_${address.toLowerCase()}_${Date.now()}`,
      badges                || [],
      metadataURI           || '',
      { value: mintingFee, gasLimit: 500000n },
    );

    const receipt = await tx.wait();

    // Parse tokenId from INFTMinted event
    let tokenId = 0;
    const iface = new ethers.Interface(INFT_ABI as unknown as string[]);
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed?.name === 'INFTMinted') {
          tokenId = Number(parsed.args[0]);
          break;
        }
      } catch { /* skip non-matching logs */ }
    }

    return NextResponse.json({ txHash: tx.hash, tokenId });
  } catch (err: unknown) {
    const e = err as {
      reason?: string;
      shortMessage?: string;
      message?: string;
      revert?: { name: string; args: unknown[] };
      data?: string;
      info?: { error?: { message?: string; data?: string } };
    };

    // Try to get the most specific error info
    let msg = 'Minting failed';
    if (e.revert?.name) {
      msg = `${e.revert.name}(${JSON.stringify(e.revert.args)})`;
    } else if (e.reason) {
      msg = e.reason;
    } else if (e.shortMessage) {
      msg = e.shortMessage;
    } else if (e.info?.error?.message) {
      msg = e.info.error.message;
    } else if (e.message) {
      msg = e.message;
    }

    console.error('[inft/mint] revert detail:', JSON.stringify({
      msg,
      revert: e.revert,
      data: e.data,
      reason: e.reason,
      shortMessage: e.shortMessage,
      infoError: e.info?.error,
    }, null, 2));

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
