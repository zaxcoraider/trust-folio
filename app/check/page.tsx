'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Shield, CheckCircle2, XCircle, Loader2, ExternalLink, Lock } from 'lucide-react';
import { NeonCard } from '@/components/NeonCard';
import { CircularScore } from '@/components/CircularScore';
import { ScoreBreakdown } from '@/components/ScoreBreakdown';
import { BadgeCard } from '@/components/BadgeCard';
import type { VerificationProof } from '@/lib/types';
import { TIER_CONFIG, getTier } from '@/lib/types';
import { format } from 'date-fns';
import { Suspense } from 'react';
import { useNetwork } from '@/lib/network-context';

function CheckPageInner() {
  const searchParams = useSearchParams();
  const { networkConfig } = useNetwork();
  const [hash, setHash]       = useState(searchParams.get('hash') || '');
  const [loading, setLoading] = useState(false);
  const [proof, setProof]     = useState<VerificationProof | null>(null);
  const [error, setError]     = useState<string | null>(null);

  // Auto-run if hash in URL
  useEffect(() => {
    const h = searchParams.get('hash');
    if (h) { setHash(h); handleCheck(h); }
  }, []);  // eslint-disable-line

  const handleCheck = async (rootHash?: string) => {
    const target = (rootHash || hash).trim();
    if (!target) return;

    setLoading(true);
    setError(null);
    setProof(null);

    try {
      const res = await fetch(`/api/check/${encodeURIComponent(target)}?network=${networkConfig.key}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Not found');
      setProof(data.proof as VerificationProof);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tier = proof ? getTier(proof.score) : 'unverified';
  const cfg  = TIER_CONFIG[tier];

  return (
    <div className="relative min-h-screen bg-bg-primary px-4 py-10 page-enter">
      <div className="fixed inset-0 bg-grid pointer-events-none" />

      <div className="relative mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neon-cyan/25 bg-neon-cyan/10 mb-5">
            <Lock size={13} className="text-neon-cyan" />
            <span className="font-mono text-xs text-neon-cyan">No wallet required — read-only</span>
          </div>
          <h1 className="font-mono text-3xl font-bold gradient-text mb-2">Verify a Credential</h1>
          <p className="text-gray-500 font-mono text-sm">
            Paste a TrustFolio proof root hash to verify its authenticity on 0G Storage.
          </p>
        </div>

        {/* Input */}
        <NeonCard className="p-6 mb-6" glow="purple">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block font-mono text-xs text-gray-500 mb-2">Proof Root Hash</label>
              <input
                type="text"
                value={hash}
                onChange={(e) => setHash(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                placeholder="0x1a2b3c4d… or paste full proof hash"
                className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-neon-purple/25 focus:border-neon-purple/60 outline-none
                  font-mono text-sm text-gray-200 placeholder-gray-700 transition-colors"
              />
            </div>
            <button
              onClick={() => handleCheck()}
              disabled={loading || !hash.trim()}
              className="mt-6 px-5 py-3 rounded-xl font-mono text-sm font-bold
                bg-gradient-to-r from-neon-purple to-neon-cyan text-white
                shadow-neon-purple hover:shadow-neon-cyan
                transition-all hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            </button>
          </div>
          <p className="text-gray-700 font-mono text-xs mt-3">
            The proof root hash is provided after AI verification and links to an immutable JSON proof on 0G Storage.
          </p>
        </NeonCard>

        {/* Loading */}
        {loading && (
          <NeonCard className="p-8 text-center" glow="cyan">
            <Loader2 size={32} className="mx-auto mb-3 text-neon-cyan animate-spin" />
            <p className="text-neon-cyan font-mono text-sm">Downloading proof from 0G Storage…</p>
          </NeonCard>
        )}

        {/* Error */}
        {error && (
          <NeonCard className="p-6" glow="pink">
            <div className="flex items-start gap-3">
              <XCircle size={20} className="text-neon-pink shrink-0 mt-0.5" />
              <div>
                <p className="text-neon-pink font-mono text-sm font-semibold mb-1">Verification Failed</p>
                <p className="text-gray-400 font-mono text-xs">{error}</p>
                <p className="text-gray-600 font-mono text-xs mt-2">
                  Make sure you're using a <strong className="text-gray-400">proof root hash</strong> (not a file root hash).
                  Proofs are only stored when PRIVATE_KEY is configured on the server.
                </p>
              </div>
            </div>
          </NeonCard>
        )}

        {/* Valid proof result */}
        {proof && (
          <div className="space-y-5">
            {/* Header banner */}
            <div className="rounded-xl p-5 flex items-center gap-4"
              style={{ background: `linear-gradient(135deg, ${cfg.bg}, rgba(10,10,15,0.95))`,
                border: `1px solid ${cfg.border}`, boxShadow: `0 0 24px ${cfg.glow}` }}>
              <CheckCircle2 size={28} style={{ color: cfg.color, flexShrink: 0 }} />
              <div>
                <p className="font-mono text-base font-bold" style={{ color: cfg.color }}>
                  Verified TrustFolio Credential
                </p>
                <p className="font-mono text-xs text-gray-500 mt-0.5">
                  Proof found on 0G Storage · {proof.network}
                </p>
              </div>
            </div>

            {/* Score */}
            <div className="flex justify-center">
              <CircularScore score={proof.score} tier={tier} size={160} animate />
            </div>

            {/* Badge */}
            <BadgeCard
              tier={tier}
              score={proof.score}
              skillCategory={proof.skillCategory}
              proofRootHash={proof.proofRootHash}
              fileName={proof.fileName}
            />

            {/* Details */}
            <NeonCard className="p-5" glow="none">
              <div className="space-y-3">
                {[
                  { label: 'Wallet',        value: proof.wallet },
                  { label: 'File',          value: proof.fileName },
                  { label: 'Skill',         value: proof.skillCategory.charAt(0).toUpperCase() + proof.skillCategory.slice(1) },
                  { label: 'Verified At',   value: format(new Date(proof.verifiedAt), 'PPpp') },
                  { label: 'AI Model',      value: proof.aiModel },
                  { label: 'Chain ID',      value: proof.chainId.toString() },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start gap-4">
                    <span className="font-mono text-xs text-gray-600 w-24 shrink-0">{label}</span>
                    <span className="font-mono text-xs text-gray-300 break-all">{value}</span>
                  </div>
                ))}
              </div>
            </NeonCard>

            {/* Breakdown */}
            <NeonCard className="p-5" glow="none">
              <p className="font-mono text-xs text-gray-500 mb-4">Score Breakdown</p>
              <ScoreBreakdown breakdown={proof.breakdown} tier={tier} />
            </NeonCard>

            {/* Summary */}
            {proof.breakdown.summary && (
              <NeonCard className="p-4" glow="none">
                <p className="text-gray-400 font-mono text-xs leading-relaxed">{proof.breakdown.summary}</p>
              </NeonCard>
            )}

            {/* File hash */}
            <NeonCard className="p-4" glow="none">
              <p className="font-mono text-xs text-gray-600 mb-1">File Root Hash (0G Storage)</p>
              <div className="flex items-center gap-2">
                <p className="text-neon-purple/60 font-mono text-xs break-all bg-white/5 rounded px-2 py-1.5 flex-1">
                  {proof.fileRootHash}
                </p>
                <a href={`${networkConfig.storageExplorer}/file?hash=${proof.fileRootHash}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-gray-600 hover:text-neon-cyan transition-colors shrink-0">
                  <ExternalLink size={14} />
                </a>
              </div>
            </NeonCard>
          </div>
        )}

        {/* How it works */}
        {!proof && !loading && !error && (
          <NeonCard className="p-5 mt-4" glow="none">
            <p className="font-mono text-xs text-gray-500 mb-3">How verification works</p>
            <div className="space-y-2">
              {[
                { step: '01', text: 'Upload a portfolio file → 0G decentralized storage assigns a unique Merkle root hash' },
                { step: '02', text: 'AI verification runs on 0G Compute → results stored as a JSON proof on 0G Storage' },
                { step: '03', text: 'The proof root hash links to an immutable record — paste it here to verify authenticity' },
              ].map(({ step, text }) => (
                <div key={step} className="flex gap-3">
                  <span className="font-mono text-xs text-neon-purple/40 shrink-0 w-6">{step}</span>
                  <span className="font-mono text-xs text-gray-600">{text}</span>
                </div>
              ))}
            </div>
          </NeonCard>
        )}
      </div>
    </div>
  );
}

export default function CheckPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-primary" />}>
      <CheckPageInner />
    </Suspense>
  );
}
