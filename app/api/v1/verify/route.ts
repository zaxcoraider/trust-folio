/**
 * POST /api/v1/verify
 * Enterprise API endpoint for programmatic portfolio verification.
 *
 * Headers:
 *   x-api-key: tf_live_<32hex>
 *
 * Body:
 *   { wallet: string, rootHash: string, fileName?: string, fileType?: string, fileSize?: number }
 *
 * Response:
 *   { success: true, data: { wallet, score, tier, skillCategory, breakdown, proofRootHash, verifiedAt }, usage: { today, limit } }
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  VerificationBreakdown,
  VerificationTier,
  SkillCategory,
} from '@/lib/types';
import { getTier, detectSkillCategory } from '@/lib/types';

export const dynamic = 'force-dynamic';

// ── Env vars ──────────────────────────────────────────────────────────────────

const SERVICE_URL = process.env.COMPUTE_SERVICE_URL;
const COMPUTE_KEY = process.env.COMPUTE_API_KEY;
const MODEL       = process.env.COMPUTE_MODEL || 'qwen-2.5-7b-instruct';

// ── API key validation (server-side) ─────────────────────────────────────────
// NOTE: localStorage is unavailable server-side. In production, validate the
// key hash against the API_KEY_REGISTRY contract on 0G Galileo Testnet.
// For now we validate that the key has the correct format and is non-empty.

interface KeyValidation {
  valid:      boolean;
  tier:       'free' | 'paid';
  dailyLimit: number;
  usageToday: number;
}

async function validateKey(rawKey: string): Promise<KeyValidation> {
  if (!rawKey || !rawKey.startsWith('tf_live_') || rawKey.length < 40) {
    return { valid: false, tier: 'free', dailyLimit: 0, usageToday: 0 };
  }
  // TODO: query API_KEY_REGISTRY contract once deployed
  return { valid: true, tier: 'free', dailyLimit: 100, usageToday: 0 };
}

// ── Score simulation ──────────────────────────────────────────────────────────

function simulateBreakdown(
  fileName:  string,
  fileType:  string,
  fileSize:  number,
  rootHash:  string
): VerificationBreakdown {
  let seed = 0;
  for (let i = 0; i < rootHash.length; i++) {
    seed = (seed * 31 + rootHash.charCodeAt(i)) & 0x7fffffff;
  }
  const rand = (min: number, max: number, salt = 0) => {
    seed = (seed * 1664525 + 1013904223 + salt) & 0x7fffffff;
    return Math.floor(min + (seed % (max - min + 1)));
  };
  const sizeMB    = fileSize / (1024 * 1024);
  const sizeBonus = Math.min(12, Math.floor(sizeMB * 3));
  const cat       = detectSkillCategory(fileName, fileType);
  const summaries: Record<string, string> = {
    code:     'Code exhibits solid architectural patterns with good separation of concerns.',
    design:   'Visual composition shows strong design principles and professional polish.',
    writing:  'Writing demonstrates clear structure and persuasive flow.',
    document: 'Document shows comprehensive coverage with professional formatting.',
    other:    'Portfolio item demonstrates strong skill indicators across evaluated dimensions.',
  };

  return {
    originality:  Math.min(100, rand(62, 88)       + sizeBonus),
    quality:      Math.min(100, rand(65, 90, 7)    + Math.floor(sizeBonus * 0.8)),
    complexity:   Math.min(100, rand(55, 85, 13)),
    authenticity: Math.min(100, rand(68, 94, 29)),
    summary:      summaries[cat] ?? summaries.other,
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const rawKey   = req.headers.get('x-api-key') ?? '';
    const keyCheck = await validateKey(rawKey);

    if (!keyCheck.valid) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let body: {
      wallet:    string;
      rootHash:  string;
      fileName?: string;
      fileType?: string;
      fileSize?: number;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { wallet, rootHash, fileName = 'portfolio', fileType = 'application/octet-stream', fileSize = 0 } = body;

    if (!wallet || !rootHash) {
      return NextResponse.json(
        { success: false, error: 'wallet and rootHash are required' },
        { status: 400 }
      );
    }

    // ── Scoring ───────────────────────────────────────────────────────────────
    const skillCategory: SkillCategory = detectSkillCategory(fileName, fileType);
    let   breakdown: VerificationBreakdown;
    let   powered_by: 'real' | 'simulated' = 'simulated';

    if (SERVICE_URL && COMPUTE_KEY) {
      try {
        const prompt = `Evaluate this portfolio and return ONLY JSON.
File: ${fileName} | Type: ${fileType} | Size: ${(fileSize / 1024).toFixed(1)} KB | Hash: ${rootHash}
Return: {"originality":<0-100>,"quality":<0-100>,"complexity":<0-100>,"authenticity":<0-100>,"summary":"<2-3 sentences>"}`;

        const res = await fetch(`${SERVICE_URL}/chat/completions`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${COMPUTE_KEY}` },
          body:    JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: 400 }),
          signal:  AbortSignal.timeout(30_000),
        });

        if (res.ok) {
          const data    = await res.json();
          const content = data.choices?.[0]?.message?.content ?? '';
          const match   = content.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            if (
              typeof parsed.originality  === 'number' &&
              typeof parsed.quality      === 'number' &&
              typeof parsed.complexity   === 'number' &&
              typeof parsed.authenticity === 'number'
            ) {
              breakdown = {
                originality:  Math.min(100, Math.max(0, parsed.originality)),
                quality:      Math.min(100, Math.max(0, parsed.quality)),
                complexity:   Math.min(100, Math.max(0, parsed.complexity)),
                authenticity: Math.min(100, Math.max(0, parsed.authenticity)),
                summary:      parsed.summary ?? '',
              };
              powered_by = 'real';
            }
          }
        }
      } catch {
        /* fall through to simulation */
      }
    }

    breakdown ??= simulateBreakdown(fileName, fileType, fileSize, rootHash);

    const score: number          = Math.round(
      breakdown.originality  * 0.25 +
      breakdown.quality      * 0.30 +
      breakdown.complexity   * 0.25 +
      breakdown.authenticity * 0.20
    );
    const tier: VerificationTier = getTier(score);
    const verifiedAt             = Date.now();

    // Proof upload is handled client-side — user signs the 0G Storage tx.
    const proofRootHash: string | null = null;

    return NextResponse.json({
      success: true,
      data: {
        wallet,
        score,
        tier,
        skillCategory,
        breakdown,
        proofRootHash,
        verifiedAt,
        powered_by,
      },
      usage: {
        today: keyCheck.usageToday + 1,
        limit: keyCheck.dailyLimit,
      },
    });

  } catch (err) {
    console.error('[v1/verify] unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
