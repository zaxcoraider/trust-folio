import { NextRequest, NextResponse } from 'next/server';
import type { VerifyResponse, VerificationBreakdown, VerificationTier, SkillCategory } from '@/lib/types';
import { getTier, detectSkillCategory } from '@/lib/types';

export const dynamic  = 'force-dynamic';
export const maxDuration = 60;

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const COMPUTE_MODEL = process.env.COMPUTE_MODEL || 'qwen-2.5-7b-instruct';

const NETWORK_COMPUTE: Record<string, { rpcUrl: string; providerAddr: string | undefined }> = {
  testnet: {
    rpcUrl:       process.env.NEXT_PUBLIC_ZERO_G_RPC         || 'https://evmrpc-testnet.0g.ai',
    providerAddr: process.env.COMPUTE_PROVIDER_ADDRESS,
  },
  mainnet: {
    rpcUrl:       process.env.NEXT_PUBLIC_MAINNET_RPC         || 'https://evmrpc.0g.ai',
    providerAddr: process.env.MAINNET_COMPUTE_PROVIDER_ADDRESS || process.env.COMPUTE_PROVIDER_ADDRESS,
  },
};

// ── Simulation fallback ───────────────────────────────────────────────────────

function simulateBreakdown(
  fileName: string,
  fileType: string,
  fileSize: number,
  rootHash: string,
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
  const skillCategory = detectSkillCategory(fileName, fileType);

  const summaries: Record<string, string[]> = {
    code:     ['Code exhibits solid architectural patterns with good separation of concerns.', 'Strong technical implementation with complex logic well-handled.'],
    design:   ['Visual composition shows strong design principles and professional polish.', 'Design work demonstrates high originality and creative problem-solving.'],
    writing:  ['Writing demonstrates clear structure and persuasive flow.', 'Compelling narrative with well-supported arguments.'],
    document: ['Document shows comprehensive coverage with professional formatting.', 'Well-structured content with clear executive summary.'],
    other:    ['Portfolio item demonstrates strong skill indicators across evaluated dimensions.', 'Work quality meets professional standards with notable originality.'],
  };
  const pool    = summaries[skillCategory] || summaries.other;
  const summary = pool[seed % pool.length];

  return {
    originality:  Math.min(100, rand(62, 88)    + sizeBonus),
    quality:      Math.min(100, rand(65, 90, 7)  + Math.floor(sizeBonus * 0.8)),
    complexity:   Math.min(100, rand(55, 85, 13)),
    authenticity: Math.min(100, rand(68, 94, 29)),
    summary,
  };
}

// ── 0G Compute inference ──────────────────────────────────────────────────────

async function runZGCompute(prompt: string, network = 'testnet'): Promise<VerificationBreakdown | null> {
  if (!PRIVATE_KEY) return null;

  const cfg = NETWORK_COMPUTE[network] ?? NETWORK_COMPUTE.testnet;

  try {
    const { ethers }                       = await import('ethers');
    const { createZGComputeNetworkBroker } = await import('@0glabs/0g-serving-broker');

    const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
    const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
    const broker   = await createZGComputeNetworkBroker(wallet);

    // Pick provider: use env var if set, otherwise auto-select first available
    let providerAddr = cfg.providerAddr;
    if (!providerAddr) {
      const services = await broker.inference.listService();
      if (!services || services.length === 0) {
        console.warn('[verify] No 0G Compute providers available');
        return null;
      }
      // Prefer a provider serving a chat/LLM model
      const chatProvider = services.find((s: any) =>
        s.serviceType === 'inference' || s.model?.toLowerCase().includes('qwen') || s.model?.toLowerCase().includes('llm')
      ) || services[0];
      providerAddr = chatProvider.provider || chatProvider.providerAddress;
    }

    if (!providerAddr) { console.warn('[verify] No provider address resolved'); return null; }

    console.log('[verify] Using provider:', providerAddr, 'network:', network);

    // Acknowledge provider (no-op if already done)
    try {
      await broker.inference.acknowledgeProviderSigner(providerAddr);
      console.log('[verify] Provider acknowledged');
    } catch (e) {
      console.warn('[verify] acknowledgeProviderSigner error (continuing):', e);
    }

    // Get endpoint + model from provider metadata
    const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddr);
    console.log('[verify] endpoint:', endpoint, 'model:', model);

    // Generate billing headers
    const headers = await broker.inference.getRequestHeaders(providerAddr, prompt);
    console.log('[verify] headers generated');

    const res = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        model: model || COMPUTE_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens:  500,
        stream: false,
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      console.warn('[verify] 0G Compute returned', res.status, await res.text());
      return null;
    }

    const data    = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const match   = content.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]);
    if (
      typeof parsed.originality  !== 'number' ||
      typeof parsed.quality      !== 'number' ||
      typeof parsed.complexity   !== 'number' ||
      typeof parsed.authenticity !== 'number'
    ) return null;

    return {
      originality:  Math.min(100, Math.max(0, parsed.originality)),
      quality:      Math.min(100, Math.max(0, parsed.quality)),
      complexity:   Math.min(100, Math.max(0, parsed.complexity)),
      authenticity: Math.min(100, Math.max(0, parsed.authenticity)),
      summary:      parsed.summary || '',
    };
  } catch (err) {
    console.warn('[verify] 0G Compute error, falling back to simulation:', err);
    return null;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fileName, fileType, fileSize, rootHash, walletAddress, description, network,
    } = body as {
      fileName:       string;
      fileType:       string;
      fileSize:       number;
      rootHash:       string;
      walletAddress?: string;
      description?:   string;
      network?:       string;
    };

    const skillCategory: SkillCategory = detectSkillCategory(fileName, fileType);

    const prompt = `You are an expert portfolio evaluator for AI-powered credential verification.

Evaluate this portfolio file and return ONLY a JSON object — no markdown, no extra text.

File: ${fileName}
Type: ${fileType}
Size: ${(fileSize / 1024).toFixed(1)} KB
Root Hash: ${rootHash}
${description ? `Description: ${description}` : ''}

Scoring criteria:
- originality (0-100): How unique and non-templated the work appears
- quality (0-100): Technical quality, polish, and professionalism
- complexity (0-100): Depth, sophistication, and mastery demonstrated
- authenticity (0-100): Confidence this is genuine original work

Return EXACTLY this JSON:
{
  "originality": <number 0-100>,
  "quality": <number 0-100>,
  "complexity": <number 0-100>,
  "authenticity": <number 0-100>,
  "summary": "<2-3 sentence professional evaluation>"
}`;

    let breakdown:  VerificationBreakdown;
    let powered_by: 'real' | 'simulated' = 'simulated';

    const zgResult = await runZGCompute(prompt, network || 'testnet');
    if (zgResult) {
      breakdown  = zgResult;
      powered_by = 'real';
      console.log('[verify] ✓ Powered by 0G Compute');
    } else {
      breakdown = simulateBreakdown(fileName, fileType, fileSize, rootHash);
      console.log('[verify] Using simulation fallback');
    }

    const score: number         = Math.round(
      breakdown.originality  * 0.25 +
      breakdown.quality      * 0.30 +
      breakdown.complexity   * 0.25 +
      breakdown.authenticity * 0.20,
    );
    const tier: VerificationTier = getTier(score);

    return NextResponse.json({
      score,
      tier,
      skillCategory,
      breakdown,
      proofRootHash: null,
      powered_by,
    } satisfies VerifyResponse);

  } catch (err) {
    console.error('[verify] unexpected error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
