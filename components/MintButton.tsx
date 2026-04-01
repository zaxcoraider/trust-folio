'use client';

import { useState } from 'react';
import { Zap, CheckCircle2, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import type { VerificationTier, SkillCategory, VerificationBreakdown } from '@/lib/types';
import { TIER_CONFIG } from '@/lib/types';

interface MintResult {
  tokenId: number;
  txHash: string;
  contractAddress: string;
  explorerUrl: string;
}

interface MintButtonProps {
  walletAddress: string;
  fileRootHash: string;
  proofRootHash: string | null;
  score: number;
  tier: VerificationTier;
  skillCategory: SkillCategory;
  breakdown: VerificationBreakdown;
  onMinted?: (result: MintResult) => void;
  alreadyMinted?: boolean;
  tokenId?: number | null;
}

export function MintButton({
  walletAddress, fileRootHash, proofRootHash, score, tier, skillCategory,
  breakdown, onMinted, alreadyMinted = false, tokenId,
}: MintButtonProps) {
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<MintResult | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const cfg = TIER_CONFIG[tier];

  const handleMint = async () => {
    if (score < 50) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient:          walletAddress,
          skillCategory,
          score,
          originalityScore:   breakdown.originality,
          qualityScore:       breakdown.quality,
          complexityScore:    breakdown.complexity,
          authenticityScore:  breakdown.authenticity,
          proofRootHash:      proofRootHash || '',
          fileRootHash,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Minting failed');

      const mintResult: MintResult = {
        tokenId:         data.tokenId,
        txHash:          data.txHash,
        contractAddress: data.contractAddress,
        explorerUrl:     data.explorerUrl,
      };
      setResult(mintResult);
      onMinted?.(mintResult);
    } catch (err: any) {
      setError(err.message || 'Minting failed');
    } finally {
      setLoading(false);
    }
  };

  if (score < 50) {
    return (
      <p className="text-gray-700 font-mono text-xs text-center">
        Score must be ≥ 50 to mint a credential
      </p>
    );
  }

  if (alreadyMinted && tokenId) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-sm"
        style={{ color: cfg.color, border: `1px solid ${cfg.border}`, background: cfg.bg }}>
        <CheckCircle2 size={16} />
        Credential Minted · Token #{tokenId}
      </div>
    );
  }

  if (result) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-sm"
          style={{ color: cfg.color, border: `1px solid ${cfg.border}`, background: cfg.bg,
            boxShadow: `0 0 12px ${cfg.glow}` }}>
          <CheckCircle2 size={16} />
          Soul-bound Token #{result.tokenId} Minted!
        </div>
        <a
          href={result.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg font-mono text-xs"
          style={{ color: cfg.color, opacity: 0.7 }}
        >
          <ExternalLink size={12} />
          View on 0G Explorer
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleMint}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-mono text-sm font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          color:      '#0a0a0f',
          background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)`,
          boxShadow:  `0 0 20px ${cfg.glow}, 0 4px 16px rgba(0,0,0,0.4)`,
        }}
      >
        {loading ? (
          <><Loader2 size={16} className="animate-spin" /> Minting on 0G Chain…</>
        ) : (
          <><Zap size={16} /> Claim {cfg.label} Credential</>
        )}
      </button>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/25">
          <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-red-400 font-mono text-xs">{error}</p>
        </div>
      )}

      <p className="text-gray-700 font-mono text-xs text-center">
        Free mint · Server pays gas · Soul-bound ERC-5192
      </p>
    </div>
  );
}
