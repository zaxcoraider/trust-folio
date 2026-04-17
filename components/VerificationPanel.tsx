'use client';

import { useState } from 'react';
import { Shield, Zap, Loader2, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { NeonCard } from './NeonCard';
import { CircularScore } from './CircularScore';
import { ScoreBreakdown } from './ScoreBreakdown';
import { MintButton } from './MintButton';
import type { PortfolioFile, VerifyResponse, VerificationTier, SkillCategory } from '@/lib/types';
import { TIER_CONFIG, getTier } from '@/lib/types';
import { updatePortfolioFile } from '@/lib/portfolio-store';
import { saveVerificationRecord } from '@/lib/verification-store';
import { useNetwork } from '@/lib/network-context';

interface VerificationPanelProps {
  file?: PortfolioFile;
  walletAddress?: string;
  onComplete?: (file: PortfolioFile) => void;
}

export function VerificationPanel({ file, walletAddress, onComplete }: VerificationPanelProps) {
  const { networkConfig } = useNetwork();
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [result, setResult]     = useState<VerifyResponse | null>(() => {
    if (file?.verified && file.verificationScore !== undefined && file.verificationBreakdown) {
      return {
        score:        file.verificationScore,
        tier:         file.tier || getTier(file.verificationScore),
        skillCategory: file.skillCategory || 'other',
        breakdown:    file.verificationBreakdown,
        proofRootHash: file.proofRootHash || null,
        powered_by:   'simulated',
      };
    }
    return null;
  });

  const [mintedTokenId, setMintedTokenId] = useState<number | null>(
    file?.soulBoundTokenId ?? null
  );

  const handleVerify = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName:      file.name,
          fileType:      file.type,
          fileSize:      file.size,
          rootHash:      file.rootHash,
          walletAddress: walletAddress || '',
          network:       networkConfig.key,
        }),
      });

      if (!res.ok) throw new Error('Verification request failed');
      const data: VerifyResponse = await res.json();
      setResult(data);

      // Persist to portfolio store
      if (walletAddress) {
        const patch = {
          verified:             true,
          verificationScore:    data.score,
          verificationBreakdown: data.breakdown,
          proofRootHash:        data.proofRootHash || undefined,
          skillCategory:        data.skillCategory,
          tier:                 data.tier,
        };
        updatePortfolioFile(walletAddress, file.id, patch);

        // Save to verification history
        saveVerificationRecord(walletAddress, {
          id:            `${file.id}_${Date.now()}`,
          walletAddress,
          fileName:      file.name,
          fileType:      file.type,
          fileRootHash:  file.rootHash,
          proofRootHash: data.proofRootHash,
          score:         data.score,
          tier:          data.tier,
          skillCategory: data.skillCategory,
          breakdown:     data.breakdown,
          verifiedAt:    Date.now(),
          powered_by:    data.powered_by,
        });

        onComplete?.({ ...file, ...patch });
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (!file) {
    return (
      <NeonCard className="p-8 text-center" glow="purple">
        <Shield size={36} className="mx-auto mb-3 text-neon-purple/30" />
        <p className="text-gray-500 font-mono text-sm">Select a file to verify</p>
      </NeonCard>
    );
  }

  const cfg = result ? TIER_CONFIG[result.tier] : TIER_CONFIG.unverified;

  return (
    <div className="space-y-4">
      {/* File info */}
      <NeonCard className="p-4" glow="purple">
        <div className="flex items-center gap-3">
          <Shield size={18} className="text-neon-purple shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-gray-300 font-mono text-sm font-medium truncate">{file.name}</p>
            <p className="text-gray-700 font-mono text-xs truncate">{file.rootHash.slice(0, 28)}…</p>
          </div>
        </div>
      </NeonCard>

      {/* Idle */}
      {!result && !loading && (
        <NeonCard className="p-6 text-center" glow="purple">
          <Zap size={28} className="mx-auto mb-3 text-neon-purple/50" />
          <p className="text-gray-400 font-mono text-sm mb-1">0G Compute AI Analysis</p>
          <p className="text-gray-700 font-mono text-xs mb-5">
            Evaluates originality, quality, complexity and authenticity
          </p>
          <button
            onClick={handleVerify}
            className="px-6 py-2.5 rounded-xl font-mono text-sm font-bold
              bg-gradient-to-r from-neon-purple to-neon-pink text-white
              shadow-neon-purple hover:shadow-neon-pink
              transition-all duration-300 hover:scale-105 active:scale-95"
          >
            Run AI Verification
          </button>
        </NeonCard>
      )}

      {/* Loading */}
      {loading && (
        <NeonCard className="p-8 text-center" glow="cyan">
          <Loader2 size={32} className="mx-auto mb-3 text-neon-cyan animate-spin" />
          <p className="text-neon-cyan font-mono text-sm">Analysing with 0G Compute…</p>
          <p className="text-gray-700 font-mono text-xs mt-1">{networkConfig.isTestnet ? 'qwen/qwen-2.5-7b-instruct' : 'openai/gpt-5.4-mini'}</p>
          <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan rounded-full animate-shimmer"
              style={{ backgroundSize: '200% 100%', width: '60%' }} />
          </div>
        </NeonCard>
      )}

      {/* Error */}
      {error && (
        <NeonCard className="p-4" glow="pink">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-neon-pink mt-0.5 shrink-0" />
            <p className="text-neon-pink font-mono text-xs">{error}</p>
          </div>
        </NeonCard>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Score circle + breakdown */}
          <NeonCard className="p-6" glow="none"
            style={{ border: `1px solid ${cfg.border}`, boxShadow: `0 0 24px ${cfg.glow}30, 0 4px 32px rgba(0,0,0,0.4)` } as any}>
            {/* Score */}
            <div className="flex justify-center mb-6">
              <CircularScore score={result.score} tier={result.tier} size={150} />
            </div>

            {/* Breakdown bars */}
            <ScoreBreakdown breakdown={result.breakdown} tier={result.tier} />
          </NeonCard>

          {/* Summary */}
          {result.breakdown.summary && (
            <NeonCard className="p-4" glow="none">
              <div className="flex gap-2">
                <Info size={14} className="text-gray-600 shrink-0 mt-0.5" />
                <p className="text-gray-400 font-mono text-xs leading-relaxed">{result.breakdown.summary}</p>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-xs text-gray-700 capitalize">{result.skillCategory}</span>
                <span className="font-mono text-xs"
                  style={{ color: cfg.color, opacity: 0.5 }}>
                  {result.powered_by === 'real' ? '⚡ 0G Compute' : '○ Demo score'}
                </span>
              </div>
            </NeonCard>
          )}

          {/* Proof hash */}
          {result.proofRootHash && (
            <NeonCard className="p-4" glow="none">
              <p className="text-gray-600 font-mono text-xs mb-1">Proof stored on 0G Storage</p>
              <p className="text-neon-purple/60 font-mono text-xs break-all bg-white/5 rounded px-2 py-1.5">
                {result.proofRootHash}
              </p>
            </NeonCard>
          )}

          {/* Mint button (score >= 50) */}
          {walletAddress && result.score >= 50 && (
            <MintButton
              walletAddress={walletAddress}
              fileRootHash={file.rootHash}
              proofRootHash={result.proofRootHash}
              score={result.score}
              tier={result.tier}
              skillCategory={result.skillCategory}
              breakdown={result.breakdown}
              alreadyMinted={mintedTokenId != null}
              tokenId={mintedTokenId}
              onMinted={(tokenId, txHash) => {
                setMintedTokenId(tokenId);
                if (walletAddress) {
                  updatePortfolioFile(walletAddress, file.id, {
                    soulBoundTokenId: tokenId,
                    soulBoundTxHash:  txHash,
                  });
                  saveVerificationRecord(walletAddress, {
                    id:               `${file.id}_${Date.now()}`,
                    walletAddress,
                    fileName:         file.name,
                    fileType:         file.type,
                    fileRootHash:     file.rootHash,
                    proofRootHash:    result.proofRootHash,
                    score:            result.score,
                    tier:             result.tier,
                    skillCategory:    result.skillCategory,
                    breakdown:        result.breakdown,
                    soulBoundTokenId: tokenId,
                    soulBoundTxHash:  txHash,
                    verifiedAt:       Date.now(),
                    powered_by:       result.powered_by,
                  });
                }
              }}
            />
          )}

          {/* Re-run */}
          <button onClick={handleVerify}
            className="w-full py-2 rounded-xl font-mono text-xs border border-white/10 text-gray-600
              hover:border-neon-purple/25 hover:text-neon-purple transition-all flex items-center justify-center gap-2">
            <RefreshCw size={12} /> Re-analyse
          </button>
        </div>
      )}
    </div>
  );
}
