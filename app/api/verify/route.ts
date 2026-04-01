import { NextRequest, NextResponse } from 'next/server';
import type { VerifyResponse, VerificationBreakdown, VerificationTier, SkillCategory } from '@/lib/types';
import { getTier, detectSkillCategory } from '@/lib/types';

export const dynamic = 'force-dynamic';

const RPC_URL       = process.env.NEXT_PUBLIC_ZERO_G_RPC          || 'https://evmrpc-testnet.0g.ai';
const INDEXER_RPC   = process.env.NEXT_PUBLIC_ZERO_G_INDEXER_RPC  || 'https://indexer-storage-testnet-turbo.0g.ai';
const SERVICE_URL   = process.env.COMPUTE_SERVICE_URL;
const API_KEY       = process.env.COMPUTE_API_KEY;
const MODEL         = process.env.COMPUTE_MODEL                    || 'qwen-2.5-7b-instruct';
const PRIVATE_KEY   = process.env.PRIVATE_KEY;

// ── Simulation ────────────────────────────────────────────────────────────────

function simulateBreakdown(
  fileName: string,
  fileType: string,
  fileSize: number,
  rootHash: string
): VerificationBreakdown {
  let seed = 0;
  for (let i = 0; i < rootHash.length; i++) {
    seed = (seed * 31 + rootHash.charCodeAt(i)) & 0x7fffffff;
  }
  const rand = (min: number, max: number, salt = 0) => {
    seed = (seed * 1664525 + 1013904223 + salt) & 0x7fffffff;
    return Math.floor(min + (seed % (max - min + 1)));
  };

  const sizeMB = fileSize / (1024 * 1024);
  const sizeBonus = Math.min(12, Math.floor(sizeMB * 3));

  const skillCategory = detectSkillCategory(fileName, fileType);
  const summaries: Record<string, string[]> = {
    code: [
      'Code exhibits solid architectural patterns with good separation of concerns. Consider adding more inline documentation.',
      'Strong technical implementation with complex logic well-handled. Test coverage indicators suggest good engineering practices.',
    ],
    design: [
      'Visual composition shows strong design principles. Color usage and typography choices demonstrate professional-level skill.',
      'Design work demonstrates high originality and creative problem-solving. Layout hierarchy is well-executed.',
    ],
    writing: [
      'Writing demonstrates clear structure and persuasive flow. Vocabulary choice and tone are professionally calibrated.',
      'Compelling narrative with well-supported arguments. Style is consistent and audience-appropriate.',
    ],
    document: [
      'Document shows comprehensive coverage of the subject matter. Professional formatting and organization noted.',
      'Well-structured content with clear executive summary. Data presentation follows industry best practices.',
    ],
    other: [
      'Portfolio item demonstrates strong skill indicators across evaluated dimensions.',
      'Work quality meets professional standards with notable originality.',
    ],
  };
  const pool = summaries[skillCategory] || summaries.other;
  const summary = pool[seed % pool.length];

  return {
    originality:   Math.min(100, rand(62, 88) + sizeBonus),
    quality:       Math.min(100, rand(65, 90, 7) + Math.floor(sizeBonus * 0.8)),
    complexity:    Math.min(100, rand(55, 85, 13)),
    authenticity:  Math.min(100, rand(68, 94, 29)),
    summary,
  };
}

// ── Proof upload to 0G Storage ─────────────────────────────────────────────────

async function uploadProofTo0G(
  proofData: object,
  signer: import('ethers').Wallet
): Promise<string | null> {
  let tmpPath: string | null = null;
  try {
    const { ZgFile, Indexer } = await import('@0gfoundation/0g-ts-sdk');
    const os   = await import('os');
    const path = await import('path');
    const fs   = await import('fs/promises');

    // Write proof JSON to a temp file — ZgFile only supports file-based input
    tmpPath = path.join(os.tmpdir(), `trustfolio-proof-${Date.now()}.json`);
    await fs.writeFile(tmpPath, JSON.stringify(proofData), 'utf-8');

    const file = await ZgFile.fromFilePath(tmpPath);
    const [tree, treeErr] = await file.merkleTree();
    if (treeErr) { await file.close(); return null; }

    const proofRootHash = tree!.rootHash();
    const indexer = new Indexer(INDEXER_RPC);
    const [, uploadErr] = await indexer.upload(file, RPC_URL, signer);
    await file.close();

    if (uploadErr) return null;
    return proofRootHash as string;
  } catch (err) {
    console.warn('[verify] proof upload skipped:', err);
    return null;
  } finally {
    if (tmpPath) {
      const fs = await import('fs/promises');
      await fs.unlink(tmpPath).catch(() => {});
    }
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileName, fileType, fileSize, rootHash, walletAddress, description } = body as {
      fileName:      string;
      fileType:      string;
      fileSize:      number;
      rootHash:      string;
      walletAddress?: string;
      description?:  string;
    };

    const skillCategory: SkillCategory = detectSkillCategory(fileName, fileType);
    let breakdown: VerificationBreakdown;
    let powered_by: 'real' | 'simulated' = 'simulated';

    // ── Try real 0G Compute ─────────────────────────────────────────────────
    if (SERVICE_URL && API_KEY) {
      const prompt = `You are an expert portfolio evaluator specializing in AI-powered credential verification.

Evaluate this portfolio file and return ONLY a JSON object — no markdown, no extra text.

File: ${fileName}
Type: ${fileType}
Size: ${(fileSize / 1024).toFixed(1)} KB
Root Hash: ${rootHash}
${description ? `Description: ${description}` : ''}

Scoring criteria:
- originality (0-100): How unique, creative, and non-templated the work appears
- quality (0-100): Technical quality, polish, and professionalism
- complexity (0-100): Depth, sophistication, and mastery level demonstrated
- authenticity (0-100): Confidence that this is genuine original work (not plagiarized or AI-generated filler)

Return EXACTLY this JSON:
{
  "originality": <number 0-100>,
  "quality": <number 0-100>,
  "complexity": <number 0-100>,
  "authenticity": <number 0-100>,
  "summary": "<2-3 sentence professional evaluation>"
}`;

      try {
        const res = await fetch(`${SERVICE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 500,
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content || '';
          const match = content.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            if (
              typeof parsed.originality === 'number' &&
              typeof parsed.quality === 'number' &&
              typeof parsed.complexity === 'number' &&
              typeof parsed.authenticity === 'number'
            ) {
              breakdown = {
                originality:  Math.min(100, Math.max(0, parsed.originality)),
                quality:      Math.min(100, Math.max(0, parsed.quality)),
                complexity:   Math.min(100, Math.max(0, parsed.complexity)),
                authenticity: Math.min(100, Math.max(0, parsed.authenticity)),
                summary:      parsed.summary || '',
              };
              powered_by = 'real';
            }
          }
        }
      } catch (err) {
        console.warn('[verify] 0G Compute failed, falling back to simulation:', err);
      }
    }

    // ── Fallback to simulation ──────────────────────────────────────────────
    breakdown ??= simulateBreakdown(fileName, fileType, fileSize, rootHash);

    // ── Compute overall score (weighted) ────────────────────────────────────
    const score = Math.round(
      breakdown.originality  * 0.25 +
      breakdown.quality      * 0.30 +
      breakdown.complexity   * 0.25 +
      breakdown.authenticity * 0.20
    );

    const tier: VerificationTier = getTier(score);

    // ── Upload proof to 0G Storage ──────────────────────────────────────────
    let proofRootHash: string | null = null;

    if (PRIVATE_KEY && walletAddress) {
      try {
        const { ethers } = await import('ethers');
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const signer   = new ethers.Wallet(PRIVATE_KEY, provider);

        const proofPayload = {
          version:       '2.0',
          trustfolio:    true,
          wallet:        walletAddress,
          fileName,
          fileRootHash:  rootHash,
          score,
          tier,
          skillCategory,
          breakdown,
          aiModel:       powered_by === 'real' ? MODEL : 'simulation',
          verifiedAt:    Date.now(),
          network:       '0G-Galileo-Testnet',
          chainId:       16602,
        };

        proofRootHash = await uploadProofTo0G(proofPayload, signer);
      } catch (err) {
        console.warn('[verify] proof wallet setup failed:', err);
      }
    }

    return NextResponse.json({
      score,
      tier,
      skillCategory,
      breakdown,
      proofRootHash,
      powered_by,
    } satisfies VerifyResponse);

  } catch (err) {
    console.error('[verify] unexpected error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
