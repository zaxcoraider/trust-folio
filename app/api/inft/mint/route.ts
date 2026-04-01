import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import type { SkillCategory, VerificationTier } from '@/lib/types';
import { getTier } from '@/lib/types';

export const dynamic = 'force-dynamic';

const RPC_URL          = process.env.NEXT_PUBLIC_ZERO_G_RPC || 'https://evmrpc-testnet.0g.ai';
const PRIVATE_KEY      = process.env.PRIVATE_KEY;
const INFT_CONTRACT    = process.env.INFT_CONTRACT;
const EXPLORER         = 'https://chainscan-galileo.0g.ai';

const INFT_ABI = [
  'function mintINFT(address to, string skillCategory, uint256 score, uint256 originalityScore, uint256 qualityScore, uint256 complexityScore, uint256 authenticityScore, string encryptedMetadataHash, string proofRootHash, string fileRootHash, string[] badges, string metadataURI) payable returns (uint256)',
  'function mintingFee() view returns (uint256)',
  'function getTokenByFileHash(string fileRootHash) view returns (uint256)',
  'event INFTMinted(uint256 indexed tokenId, address indexed owner, string skillCategory, uint256 score, string tier)',
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      recipient:          string;
      skillCategory:      SkillCategory;
      score:              number;
      originalityScore:   number;
      qualityScore:       number;
      complexityScore:    number;
      authenticityScore:  number;
      proofRootHash:      string;
      fileRootHash:       string;
      badges:             string[];
    };

    const {
      recipient, skillCategory, score,
      originalityScore, qualityScore, complexityScore, authenticityScore,
      proofRootHash, fileRootHash, badges,
    } = body;

    // Validate
    if (!ethers.isAddress(recipient)) {
      return NextResponse.json({ error: 'Invalid recipient address' }, { status: 400 });
    }
    if (score < 60) {
      return NextResponse.json({ error: 'Score must be ≥ 60 to mint an INFT' }, { status: 400 });
    }

    // Build on-chain metadata URI
    const tier: VerificationTier = getTier(score);
    const metadataURI = buildMetadataURI(tier, score, skillCategory, badges);

    // If no contract configured, return simulated response
    if (!PRIVATE_KEY || !INFT_CONTRACT) {
      const mockTokenId = Math.floor(Math.random() * 9000) + 1000;
      return NextResponse.json({
        success:         true,
        tokenId:         mockTokenId,
        txHash:          `0xsimulated${Date.now().toString(16)}`,
        contractAddress: INFT_CONTRACT || '0x0000000000000000000000000000000000000000',
        blockNumber:     0,
        explorerUrl:     `${EXPLORER}/tx/0xsimulated`,
        simulated:       true,
        metadataURI,
        badges,
        tier,
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer   = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(INFT_CONTRACT, INFT_ABI, signer);

    // Check if already minted
    const existing = await contract.getTokenByFileHash(fileRootHash);
    if (existing !== 0n) {
      return NextResponse.json(
        { error: `Already minted as INFT #${existing}` },
        { status: 400 }
      );
    }

    const mintingFee = await contract.mintingFee();

    // Estimate gas
    let gasEstimate: bigint;
    try {
      gasEstimate = await contract.mintINFT.estimateGas(
        recipient, skillCategory, score,
        originalityScore, qualityScore, complexityScore, authenticityScore,
        '', proofRootHash, fileRootHash, badges, metadataURI,
        { value: mintingFee }
      );
    } catch (gasErr: unknown) {
      const msg = (gasErr as { reason?: string; message?: string })?.reason
        || (gasErr as { message?: string })?.message
        || 'Gas estimation failed';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const tx = await contract.mintINFT(
      recipient, skillCategory, score,
      originalityScore, qualityScore, complexityScore, authenticityScore,
      '', proofRootHash, fileRootHash, badges, metadataURI,
      { value: mintingFee, gasLimit: (gasEstimate * 130n) / 100n }
    );

    const receipt = await tx.wait();

    let tokenId: number | null = null;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog({
          topics: log.topics as string[],
          data:   log.data,
        });
        if (parsed?.name === 'INFTMinted') {
          tokenId = Number(parsed.args[0]);
          break;
        }
      } catch { /* skip */ }
    }

    return NextResponse.json({
      success:         true,
      tokenId,
      txHash:          receipt.hash,
      contractAddress: INFT_CONTRACT,
      blockNumber:     receipt.blockNumber,
      explorerUrl:     `${EXPLORER}/tx/${receipt.hash}`,
      simulated:       false,
      metadataURI,
      badges,
      tier,
    });

  } catch (err: unknown) {
    console.error('[inft/mint] error:', err);
    const message = (err as { reason?: string; message?: string })?.reason
      || (err as { message?: string })?.message
      || 'Minting failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Metadata builder ──────────────────────────────────────────────────────────

function buildMetadataURI(
  tier: VerificationTier,
  score: number,
  skillCategory: SkillCategory,
  badges: string[]
): string {
  const tierColors: Record<VerificationTier, { accent: string; emoji: string }> = {
    diamond:    { accent: '#e2e8f0', emoji: '💎' },
    gold:       { accent: '#f59e0b', emoji: '🥇' },
    silver:     { accent: '#06b6d4', emoji: '🥈' },
    bronze:     { accent: '#a855f7', emoji: '🥉' },
    unverified: { accent: '#4b5563', emoji: '⬜' },
  };
  const c = tierColors[tier] || tierColors.silver;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="480" viewBox="0 0 400 480">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="${c.accent}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#0a0a0f"/>
    </radialGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="5" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
  </defs>
  <rect width="400" height="480" fill="#0a0a0f"/>
  <rect width="400" height="480" fill="url(#bg)"/>
  <rect x="8" y="8" width="384" height="464" rx="18" fill="none" stroke="${c.accent}" stroke-width="1.5" stroke-opacity="0.5"/>
  <text x="200" y="90" font-family="monospace" font-size="56" text-anchor="middle" filter="url(#glow)">${c.emoji}</text>
  <text x="200" y="175" font-family="monospace" font-size="80" font-weight="bold" text-anchor="middle" fill="${c.accent}" filter="url(#glow)">${score}</text>
  <text x="200" y="205" font-family="monospace" font-size="14" text-anchor="middle" fill="${c.accent}" opacity="0.6">/100 VERIFIED SCORE</text>
  <text x="200" y="255" font-family="monospace" font-size="22" font-weight="bold" text-anchor="middle" fill="${c.accent}">${tier.toUpperCase()} INFT</text>
  <text x="200" y="285" font-family="monospace" font-size="13" text-anchor="middle" fill="${c.accent}" opacity="0.6">${skillCategory.toUpperCase()}</text>
  ${badges.slice(0, 3).map((b, i) =>
    `<text x="200" y="${330 + i * 24}" font-family="monospace" font-size="11" text-anchor="middle" fill="${c.accent}" opacity="0.7">✦ ${b}</text>`
  ).join('\n  ')}
  <text x="200" y="450" font-family="monospace" font-size="10" text-anchor="middle" fill="${c.accent}" opacity="0.3">TrustFolio · 0G Chain · ERC-7857</text>
</svg>`;

  const meta = JSON.stringify({
    name:        `TrustFolio ${tier.charAt(0).toUpperCase() + tier.slice(1)} INFT`,
    description: `An Intelligent NFT (ERC-7857) issued by TrustFolio. AI-verified ${skillCategory} portfolio scoring ${score}/100.`,
    image:       `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    attributes: [
      { trait_type: 'Tier',          value: tier.charAt(0).toUpperCase() + tier.slice(1) },
      { trait_type: 'Score',         value: score },
      { trait_type: 'Skill',         value: skillCategory },
      { trait_type: 'Badge Count',   value: badges.length },
      { trait_type: 'Network',       value: '0G Galileo Testnet' },
      { trait_type: 'Standard',      value: 'ERC-7857' },
    ],
    external_url: 'https://trustfolio.app',
  });

  return `data:application/json;base64,${Buffer.from(meta).toString('base64')}`;
}
