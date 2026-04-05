/**
 * GET /api/nft-image?score=77&tier=gold&skill=code
 * Returns an SVG image for an INFT — used as the `image` field in on-chain metadata.
 * This makes tokenURI-based explorers (0G, OpenSea) show a real image.
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TIER_COLORS: Record<string, { accent: string; emoji: string }> = {
  diamond:    { accent: '#e2e8f0', emoji: '💎' },
  gold:       { accent: '#f59e0b', emoji: '🥇' },
  silver:     { accent: '#06b6d4', emoji: '🥈' },
  bronze:     { accent: '#a855f7', emoji: '🥉' },
  unverified: { accent: '#4b5563', emoji: '⬜' },
};

const SKILL_ICONS: Record<string, string> = {
  code:     '⌨️',
  design:   '🎨',
  writing:  '✍️',
  document: '📄',
  other:    '🔮',
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const score = parseInt(searchParams.get('score') ?? '75', 10);
  const tier  = searchParams.get('tier')  ?? 'silver';
  const skill = searchParams.get('skill') ?? 'other';

  const c     = TIER_COLORS[tier] ?? TIER_COLORS.silver;
  const emoji = c.emoji;
  const skillIcon = SKILL_ICONS[skill] ?? '🔮';
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="${c.accent}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#0a0a0f"/>
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="5" result="b"/>
      <feComposite in="SourceGraphic" in2="b" operator="over"/>
    </filter>
  </defs>
  <rect width="400" height="400" fill="#0a0a0f"/>
  <rect width="400" height="400" fill="url(#bg)"/>
  <rect x="8" y="8" width="384" height="384" rx="18" fill="none" stroke="${c.accent}" stroke-width="1.5" stroke-opacity="0.5"/>
  <text x="200" y="90"  font-family="monospace" font-size="48" text-anchor="middle" filter="url(#glow)">${emoji}</text>
  <text x="200" y="185" font-family="monospace" font-size="80" font-weight="bold" text-anchor="middle" fill="${c.accent}" filter="url(#glow)">${score}</text>
  <text x="200" y="215" font-family="monospace" font-size="14" text-anchor="middle" fill="${c.accent}" opacity="0.6">/100 VERIFIED SCORE</text>
  <text x="200" y="265" font-family="monospace" font-size="22" font-weight="bold" text-anchor="middle" fill="${c.accent}">${tierLabel.toUpperCase()} INFT</text>
  <text x="200" y="295" font-family="monospace" font-size="13" text-anchor="middle" fill="${c.accent}" opacity="0.6">${skill.toUpperCase()} ${skillIcon}</text>
  <text x="200" y="370" font-family="monospace" font-size="11" text-anchor="middle" fill="${c.accent}" opacity="0.5">TrustFolio · 0G Chain</text>
  <text x="200" y="390" font-family="monospace" font-size="9"  text-anchor="middle" fill="${c.accent}" opacity="0.3">ERC-7857 Intelligent NFT</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type':  'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
