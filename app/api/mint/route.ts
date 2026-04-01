import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { SOULBOUND_ABI } from '@/lib/contract-abi';
import type { SkillCategory } from '@/lib/types';

export const dynamic = 'force-dynamic';

const RPC_URL           = process.env.NEXT_PUBLIC_ZERO_G_RPC || 'https://evmrpc-testnet.0g.ai';
const PRIVATE_KEY       = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS  = process.env.CREDENTIAL_CONTRACT;

export async function POST(req: NextRequest) {
  if (!PRIVATE_KEY || !CONTRACT_ADDRESS) {
    return NextResponse.json(
      { error: 'Soul-bound minting not configured. Set PRIVATE_KEY and CREDENTIAL_CONTRACT in .env.local.' },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const {
      recipient,
      skillCategory,
      score,
      originalityScore,
      qualityScore,
      complexityScore,
      authenticityScore,
      proofRootHash,
      fileRootHash,
    } = body as {
      recipient:          string;
      skillCategory:      SkillCategory;
      score:              number;
      originalityScore:   number;
      qualityScore:       number;
      complexityScore:    number;
      authenticityScore:  number;
      proofRootHash:      string;
      fileRootHash:       string;
    };

    // Validate required fields
    if (!ethers.isAddress(recipient)) {
      return NextResponse.json({ error: 'Invalid recipient address' }, { status: 400 });
    }
    if (score < 50) {
      return NextResponse.json({ error: 'Score must be ≥ 50 to mint a credential' }, { status: 400 });
    }

    // Build metadata URI (on-chain JSON)
    const tier = score >= 90 ? 'Diamond' : score >= 75 ? 'Gold' : 'Silver';
    const metadataJson = JSON.stringify({
      name:        `TrustFolio ${tier} Credential`,
      description: `A soul-bound credential issued by TrustFolio on 0G Chain. Score: ${score}/100.`,
      image:       `data:image/svg+xml;base64,${Buffer.from(buildSVG(tier, score)).toString('base64')}`,
      attributes: [
        { trait_type: 'Tier',         value: tier },
        { trait_type: 'Score',        value: score },
        { trait_type: 'Skill',        value: skillCategory },
        { trait_type: 'Originality',  value: originalityScore },
        { trait_type: 'Quality',      value: qualityScore },
        { trait_type: 'Complexity',   value: complexityScore },
        { trait_type: 'Authenticity', value: authenticityScore },
        { trait_type: 'Network',      value: '0G Galileo Testnet' },
        { trait_type: 'Proof Hash',   value: proofRootHash || 'N/A' },
      ],
      external_url: 'https://trustfolio.app',
    });

    const metadataURI = `data:application/json;base64,${Buffer.from(metadataJson).toString('base64')}`;

    // Connect to 0G Chain
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer   = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, SOULBOUND_ABI, signer);

    // Estimate gas first
    let gasEstimate: bigint;
    try {
      gasEstimate = await contract.mintCredential.estimateGas(
        recipient, skillCategory, score,
        originalityScore, qualityScore, complexityScore, authenticityScore,
        proofRootHash || '', fileRootHash, metadataURI
      );
    } catch (gasErr: any) {
      // Likely "Already minted" or "Score too low"
      const msg = gasErr?.reason || gasErr?.message || 'Gas estimation failed';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Send transaction
    const tx = await contract.mintCredential(
      recipient, skillCategory, score,
      originalityScore, qualityScore, complexityScore, authenticityScore,
      proofRootHash || '', fileRootHash, metadataURI,
      { gasLimit: (gasEstimate * 130n) / 100n } // 30% buffer
    );

    const receipt = await tx.wait();

    // Extract tokenId from CredentialMinted event
    let tokenId: number | null = null;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed?.name === 'CredentialMinted') {
          tokenId = Number(parsed.args[0]);
          break;
        }
      } catch { /* skip unparseable logs */ }
    }

    return NextResponse.json({
      success:         true,
      tokenId,
      txHash:          receipt.hash,
      contractAddress: CONTRACT_ADDRESS,
      blockNumber:     receipt.blockNumber,
      explorerUrl:     `https://chainscan-galileo.0g.ai/tx/${receipt.hash}`,
    });

  } catch (err: any) {
    console.error('[mint] error:', err);
    const message = err?.reason || err?.message || 'Minting failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── On-chain SVG for token metadata ──────────────────────────────────────────

function buildSVG(tier: string, score: number): string {
  const colors: Record<string, { bg: string; accent: string; glow: string }> = {
    Diamond: { bg: '#0a0a0f', accent: '#e2e8f0', glow: 'rgba(226,232,240,0.6)' },
    Gold:    { bg: '#0a0a0f', accent: '#f59e0b', glow: 'rgba(245,158,11,0.6)' },
    Silver:  { bg: '#0a0a0f', accent: '#06b6d4', glow: 'rgba(6,182,212,0.6)' },
  };
  const c = colors[tier] || colors.Silver;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="${c.accent}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${c.bg}"/>
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <rect width="400" height="400" fill="${c.bg}"/>
  <rect width="400" height="400" fill="url(#bg)"/>
  <rect x="10" y="10" width="380" height="380" rx="16" fill="none" stroke="${c.accent}" stroke-width="2" stroke-opacity="0.4"/>
  <text x="200" y="120" font-family="monospace" font-size="64" text-anchor="middle" fill="${c.accent}" filter="url(#glow)">${tier === 'Diamond' ? '💎' : tier === 'Gold' ? '🥇' : '🥈'}</text>
  <text x="200" y="200" font-family="monospace" font-size="72" font-weight="bold" text-anchor="middle" fill="${c.accent}" filter="url(#glow)">${score}</text>
  <text x="200" y="235" font-family="monospace" font-size="16" text-anchor="middle" fill="${c.accent}" opacity="0.6">/100</text>
  <text x="200" y="280" font-family="monospace" font-size="20" font-weight="bold" text-anchor="middle" fill="${c.accent}">${tier.toUpperCase()} CREDENTIAL</text>
  <text x="200" y="310" font-family="monospace" font-size="12" text-anchor="middle" fill="${c.accent}" opacity="0.5">TrustFolio · 0G Chain</text>
  <text x="200" y="370" font-family="monospace" font-size="10" text-anchor="middle" fill="${c.accent}" opacity="0.3">Soulbound · ERC-5192</text>
</svg>`;
}
