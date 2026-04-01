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
 */

import { NextRequest, NextResponse } from 'next/server';
import type { VerificationTier } from '@/lib/types';

export const dynamic = 'force-dynamic';

// ── API key validation ────────────────────────────────────────────────────────

async function validateKey(rawKey: string): Promise<boolean> {
  if (!rawKey || !rawKey.startsWith('tf_live_') || rawKey.length < 40) return false;
  // TODO: validate against API_KEY_REGISTRY contract on 0G Galileo Testnet
  return true;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchResult {
  wallet:        string;
  displayName?:  string;
  score:         number;
  tier:          VerificationTier;
  skills:        string[];
  badges:        string[];
  topCredential: {
    skillCategory: string;
    score:         number;
    tier:          VerificationTier;
    verifiedAt:    number;
  } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Map a tier name to its minimum score for demo data generation.
 */
function tierToMinScore(tier: VerificationTier): number {
  switch (tier) {
    case 'diamond': return 90;
    case 'gold':    return 75;
    case 'silver':  return 50;
    case 'bronze':  return 1;
    default:        return 0;
  }
}

function getTierFromScore(score: number): VerificationTier {
  if (score >= 90) return 'diamond';
  if (score >= 75) return 'gold';
  if (score >= 50) return 'silver';
  return 'bronze';
}

/**
 * Build a deterministic score from an address string (for demo catalogue).
 */
function deterministicScore(address: string, salt = 0): number {
  let h = salt;
  for (let i = 0; i < address.length; i++) {
    h = (h * 31 + address.charCodeAt(i)) & 0x7fffffff;
  }
  return 50 + (h % 50); // range 50-99
}

// ── Demo catalogue ────────────────────────────────────────────────────────────
// A static set of verified talent profiles for search results.
// In production this would be indexed from on-chain SBT data + 0G Storage.

const DEMO_SKILL_MAP: Record<string, string[]> = {
  '0x1234567890123456789012345678901234567890': ['Solidity', 'EVM', 'Hardhat', 'TypeScript'],
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd': ['Figma', 'UI/UX', 'Illustrator', 'Tailwind'],
  '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef': ['Technical Writing', 'Markdown', 'Documentation'],
  '0xcafecafecafecafecafecafecafecafecafecafe': ['React', 'Next.js', 'TypeScript', 'Solidity'],
  '0xf00df00df00df00df00df00df00df00df00df00d': ['Python', 'Data Analysis', 'Pandas', 'SQL'],
  '0xbabe0000babe0000babe0000babe0000babe0000': ['Figma', 'Motion Design', 'After Effects', 'Blender'],
  '0x1111111111111111111111111111111111111111': ['Rust', 'WebAssembly', 'Systems Programming'],
  '0x2222222222222222222222222222222222222222': ['Go', 'gRPC', 'Docker', 'Kubernetes'],
  '0x3333333333333333333333333333333333333333': ['Solidity', 'Foundry', 'DeFi', 'Security Auditing'],
  '0x4444444444444444444444444444444444444444': ['React Native', 'iOS', 'Android', 'TypeScript'],
};

const DEMO_DISPLAY_NAMES: Record<string, string> = {
  '0x1234567890123456789012345678901234567890': 'BlockDev',
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd': 'PixelCraft',
  '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef': 'WordSmith',
  '0xcafecafecafecafecafecafecafecafecafecafe': 'FullStacker',
  '0xf00df00df00df00df00df00df00df00df00df00d': 'DataMage',
  '0xbabe0000babe0000babe0000babe0000babe0000': 'MotionArtist',
  '0x1111111111111111111111111111111111111111': 'RustChampion',
  '0x2222222222222222222222222222222222222222': 'CloudNative',
  '0x3333333333333333333333333333333333333333': 'AuditExpert',
  '0x4444444444444444444444444444444444444444': 'MobileDev',
};

function buildDemoCatalogue(): SearchResult[] {
  return Object.entries(DEMO_SKILL_MAP).map(([address, skills]) => {
    const score = deterministicScore(address);
    const tier  = getTierFromScore(score);
    const badges: string[] = [];
    if (tier === 'diamond') badges.push('Diamond Portfolio');
    else if (tier === 'gold') badges.push('Gold Portfolio');
    else if (tier === 'silver') badges.push('Silver Portfolio');
    if (skills.some((s) => ['Solidity', 'Rust', 'Go', 'TypeScript', 'React'].includes(s)))
      badges.push('Verified Developer');
    if (skills.some((s) => ['Figma', 'UI/UX', 'Motion Design'].includes(s)))
      badges.push('Verified Designer');

    return {
      wallet:       address,
      displayName:  DEMO_DISPLAY_NAMES[address],
      score,
      tier,
      skills,
      badges,
      topCredential: {
        skillCategory: skills.some((s) => s === 'Figma' || s === 'UI/UX') ? 'design' : 'code',
        score,
        tier,
        verifiedAt: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 30) * 86400,
      },
    };
  });
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const rawKey = req.headers.get('x-api-key') ?? '';
    if (!(await validateKey(rawKey))) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // ── Parse query params ────────────────────────────────────────────────────
    const { searchParams } = new URL(req.url);

    const skillsParam = searchParams.get('skills') ?? '';
    const skills      = skillsParam
      ? skillsParam.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];

    const minScore = Math.max(0,   Math.min(100, parseInt(searchParams.get('minScore') ?? '0',   10)));
    const maxScore = Math.max(0,   Math.min(100, parseInt(searchParams.get('maxScore') ?? '100', 10)));
    const tierParam = (searchParams.get('tier') ?? '').toLowerCase() as VerificationTier | '';
    const limit     = Math.max(1,  Math.min(100, parseInt(searchParams.get('limit')  ?? '20', 10)));
    const offset    = Math.max(0,              parseInt(searchParams.get('offset') ?? '0',  10));

    // ── Filter ────────────────────────────────────────────────────────────────
    let results = buildDemoCatalogue();

    if (skills.length > 0) {
      results = results.filter((r) =>
        skills.some((sk) =>
          r.skills.some((rs) => rs.toLowerCase().includes(sk))
        )
      );
    }

    if (minScore > 0 || maxScore < 100) {
      results = results.filter((r) => r.score >= minScore && r.score <= maxScore);
    }

    if (tierParam && ['bronze', 'silver', 'gold', 'diamond'].includes(tierParam)) {
      const min = tierToMinScore(tierParam as VerificationTier);
      results   = results.filter((r) => r.score >= min);
      if (tierParam !== 'bronze') {
        const nextMin = tierToMinScore(
          tierParam === 'diamond' ? 'diamond' :
          tierParam === 'gold'    ? 'diamond' :
          tierParam === 'silver'  ? 'gold'    : 'silver'
        );
        if (tierParam !== 'diamond') {
          results = results.filter((r) => r.score < nextMin);
        }
      }
    }

    // ── Sort by score desc ────────────────────────────────────────────────────
    results.sort((a, b) => b.score - a.score);

    const total   = results.length;
    const paged   = results.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: {
        results: paged,
        total,
        limit,
        offset,
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
