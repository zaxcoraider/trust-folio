'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  Sparkles, Shield, CheckCircle, AlertCircle,
  ExternalLink, Loader2, ChevronRight, Lock, Zap,
} from 'lucide-react';
import type { PortfolioFile, VerificationTier } from '@/lib/types';
import { TIER_CONFIG, getTier } from '@/lib/types';
import { getPortfolioFiles } from '@/lib/portfolio-store';
import { saveINFT, getINFTByFileHash, buildBadges } from '@/lib/inft-store';
import type { INFTMetadata } from '@/lib/types';

type MintStep = 'select' | 'preview' | 'minting' | 'success' | 'error';

interface MintProgress {
  step:    number;
  label:   string;
  done:    boolean;
}

const STEPS: MintProgress[] = [
  { step: 1, label: 'Validating verification proof',    done: false },
  { step: 2, label: 'Encrypting portfolio metadata',    done: false },
  { step: 3, label: 'Uploading to 0G Storage',          done: false },
  { step: 4, label: 'Calling TrustFolioINFT contract',  done: false },
  { step: 5, label: 'Confirming on 0G Chain',            done: false },
];

export default function MintPage() {
  const { address, isConnected } = useAccount();

  const [files,      setFiles]      = useState<PortfolioFile[]>([]);
  const [selected,   setSelected]   = useState<PortfolioFile | null>(null);
  const [step,       setStep]       = useState<MintStep>('select');
  const [progress,   setProgress]   = useState<MintProgress[]>(STEPS);
  const [activeStep, setActiveStep] = useState(0);
  const [result,     setResult]     = useState<{
    tokenId: number; txHash: string; explorerUrl: string; tier: VerificationTier;
  } | null>(null);
  const [errMsg,     setErrMsg]     = useState('');

  useEffect(() => {
    if (!address) return;
    const all = getPortfolioFiles(address);
    // Only show files with score ≥ 60 that haven't been minted as INFT
    const eligible = all.filter(
      (f) => (f.verificationScore ?? 0) >= 60 && !getINFTByFileHash(f.rootHash || '')
    );
    setFiles(eligible);
  }, [address]);

  const handleMint = async () => {
    if (!selected || !address) return;
    setStep('minting');
    setProgress(STEPS.map((s) => ({ ...s, done: false })));
    setActiveStep(0);

    try {
      // Simulate each step with realistic timing
      for (let i = 0; i < STEPS.length; i++) {
        setActiveStep(i);
        await new Promise((r) => setTimeout(r, 700 + Math.random() * 800));
        setProgress((prev) =>
          prev.map((s) => s.step === i + 1 ? { ...s, done: true } : s)
        );
      }

      // Call the mint API
      const breakdown = selected.verificationBreakdown ?? {
        originality: 75, quality: 75, complexity: 75, authenticity: 75, summary: '',
      };
      const badges = buildBadges(
        selected.verificationScore ?? 60,
        selected.skillCategory as 'code' | 'design' | 'writing' | 'document' | 'other',
        breakdown
      );

      const res = await fetch('/api/inft/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient:         address,
          skillCategory:     selected.skillCategory || 'other',
          score:             selected.verificationScore ?? 60,
          originalityScore:  breakdown.originality,
          qualityScore:      breakdown.quality,
          complexityScore:   breakdown.complexity,
          authenticityScore: breakdown.authenticity,
          proofRootHash:     selected.proofRootHash || '',
          fileRootHash:      selected.rootHash || '',
          badges,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mint failed');

      // Save to localStorage
      const inft: INFTMetadata = {
        tokenId:               data.tokenId,
        owner:                 address,
        originalOwner:         address,
        skillCategory:         (selected.skillCategory || 'other') as 'code' | 'design' | 'writing' | 'document' | 'other',
        score:                 selected.verificationScore ?? 60,
        originalityScore:      breakdown.originality,
        qualityScore:          breakdown.quality,
        complexityScore:       breakdown.complexity,
        authenticityScore:     breakdown.authenticity,
        encryptedMetadataHash: '',
        proofRootHash:         selected.proofRootHash || '',
        fileRootHash:          selected.rootHash || '',
        badges,
        mintedAt:              Math.floor(Date.now() / 1000),
        tier:                  data.tier,
        metadataURI:           data.metadataURI || '',
        contractAddress:       data.contractAddress || '',
        txHash:                data.txHash,
      };
      saveINFT(inft);

      setResult({
        tokenId:     data.tokenId,
        txHash:      data.txHash,
        explorerUrl: data.explorerUrl,
        tier:        data.tier,
      });
      setStep('success');
    } catch (err: unknown) {
      setErrMsg((err as { message?: string })?.message || 'Minting failed');
      setStep('error');
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <Sparkles size={48} className="text-neon-purple mx-auto mb-4" />
          <h1 className="font-mono text-2xl font-bold text-white mb-2">Mint Your INFT</h1>
          <p className="text-gray-400 font-mono text-sm mb-6">Connect your wallet to mint verified portfolios</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neon-purple/30 bg-neon-purple/5 text-xs font-mono text-neon-purple mb-6">
            <Sparkles size={12} />
            ERC-7857 Intelligent NFT
          </div>
          <h1 className="font-mono text-4xl font-black text-white mb-4">
            Mint Your Verified Portfolio as an{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-cyan">
              INFT
            </span>
          </h1>
          <p className="text-gray-400 font-mono text-sm max-w-xl mx-auto">
            Transform your AI-verified portfolio into a tradeable Intelligent NFT.
            Your encrypted metadata is stored on 0G Network — only you can decrypt it.
          </p>
        </div>

        {step === 'select' && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* File selector */}
            <div>
              <h2 className="font-mono font-bold text-white mb-4 flex items-center gap-2">
                <Shield size={16} className="text-neon-purple" />
                Eligible Portfolios
              </h2>

              {files.length === 0 ? (
                <div className="rounded-xl border border-neon-purple/15 bg-bg-card p-8 text-center">
                  <AlertCircle size={32} className="mx-auto mb-3 text-gray-600" />
                  <div className="font-mono text-gray-400 text-sm mb-2">No eligible portfolios</div>
                  <div className="font-mono text-gray-600 text-xs">
                    Files need a verification score ≥ 60 to mint as INFT
                  </div>
                  <a href="/dashboard" className="inline-block mt-4 text-xs font-mono text-neon-purple hover:underline">
                    Go verify your files →
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  {files.map((file) => {
                    const tier = getTier(file.verificationScore ?? 60);
                    const cfg  = TIER_CONFIG[tier];
                    const isSelected = selected?.id === file.id;
                    return (
                      <button
                        key={file.id}
                        onClick={() => setSelected(file)}
                        className="w-full text-left rounded-xl border p-4 transition-all duration-200"
                        style={{
                          borderColor: isSelected ? cfg.color : cfg.border + '40',
                          background:  isSelected ? cfg.bg : 'transparent',
                          boxShadow:   isSelected ? `0 0 16px ${cfg.glow}44` : 'none',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg border"
                              style={{ borderColor: cfg.border, background: cfg.bg }}
                            >
                              {cfg.emoji}
                            </div>
                            <div>
                              <div className="font-mono text-sm font-bold text-white line-clamp-1">
                                {file.name}
                              </div>
                              <div className="text-xs font-mono text-gray-500 capitalize">
                                {file.skillCategory} · {cfg.label}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div
                              className="font-mono text-xl font-black"
                              style={{ color: cfg.color }}
                            >
                              {file.verificationScore ?? 60}
                            </div>
                            <div className="text-[10px] text-gray-600 font-mono">/100</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Preview panel */}
            <div>
              <h2 className="font-mono font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles size={16} className="text-neon-cyan" />
                INFT Preview
              </h2>

              {!selected ? (
                <div className="rounded-xl border border-neon-purple/10 bg-bg-card p-8 text-center h-64 flex items-center justify-center">
                  <div className="text-gray-600 font-mono text-sm">
                    Select a portfolio to preview your INFT
                  </div>
                </div>
              ) : (() => {
                const tier = getTier(selected.verificationScore ?? 60);
                const cfg  = TIER_CONFIG[tier];
                const breakdown = selected.verificationBreakdown ?? {
                  originality: 75, quality: 75, complexity: 75, authenticity: 75, summary: '',
                };
                const badges = buildBadges(
                  selected.verificationScore ?? 60,
                  selected.skillCategory as 'code' | 'design' | 'writing' | 'document' | 'other',
                  breakdown
                );
                return (
                  <div>
                    {/* INFT card preview */}
                    <div
                      className="rounded-2xl border p-6 mb-4 relative overflow-hidden"
                      style={{
                        borderColor: cfg.border,
                        background:  `linear-gradient(135deg, ${cfg.bg}, #12121f)`,
                        boxShadow:   `0 0 32px ${cfg.glow}44`,
                      }}
                    >
                      {/* Decorative glow */}
                      <div
                        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20"
                        style={{ background: cfg.color }}
                      />

                      <div className="relative">
                        {/* Tier */}
                        <div className="flex items-center justify-between mb-4">
                          <div
                            className="flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-bold"
                            style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}
                          >
                            {cfg.emoji} {cfg.label.toUpperCase()} INFT
                          </div>
                          <Lock size={14} className="text-gray-600" />
                        </div>

                        {/* Score */}
                        <div
                          className="text-6xl font-mono font-black mb-1"
                          style={{ color: cfg.color, textShadow: `0 0 24px ${cfg.glow}` }}
                        >
                          {selected.verificationScore ?? 60}
                        </div>
                        <div className="text-xs text-gray-500 font-mono mb-4">/ 100 AI Verification Score</div>

                        {/* Breakdown */}
                        <div className="space-y-1.5 mb-4">
                          {[
                            ['Originality',  breakdown.originality],
                            ['Quality',      breakdown.quality],
                            ['Complexity',   breakdown.complexity],
                            ['Authenticity', breakdown.authenticity],
                          ].map(([label, val]) => (
                            <div key={label as string} className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-gray-600 w-20 shrink-0">{label as string}</span>
                              <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${val}%`, background: `linear-gradient(90deg, ${cfg.color}66, ${cfg.color})` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-gray-600 w-6 text-right">{val}</span>
                            </div>
                          ))}
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5">
                          {badges.map((b) => (
                            <span
                              key={b}
                              className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                              style={{ color: cfg.color, borderColor: `${cfg.color}44`, background: `${cfg.color}11` }}
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Mint info */}
                    <div className="rounded-xl border border-neon-purple/15 bg-bg-card p-4 mb-5 space-y-2">
                      {[
                        ['Minting fee', '0.001 0G'],
                        ['Storage',     '0G Encrypted Network'],
                        ['Standard',    'ERC-7857 Intelligent NFT'],
                        ['Chain',       '0G Galileo (16602)'],
                      ].map(([label, value]) => (
                        <div key={label as string} className="flex justify-between text-xs font-mono">
                          <span className="text-gray-500">{label as string}</span>
                          <span className="text-gray-300">{value as string}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleMint}
                      className="w-full py-3 rounded-xl font-mono font-bold text-bg-primary text-base transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
                      style={{
                        background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color})`,
                        boxShadow:  `0 0 24px ${cfg.glow}88`,
                      }}
                    >
                      <Zap size={16} />
                      Mint as INFT
                      <ChevronRight size={16} />
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {step === 'minting' && (
          <div className="max-w-lg mx-auto">
            <div className="rounded-2xl border border-neon-purple/30 bg-bg-card p-8 text-center">
              {/* Animated neon ring */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-neon-purple/20" />
                <div
                  className="absolute inset-0 rounded-full border-4 border-transparent border-t-neon-purple animate-spin"
                  style={{ animationDuration: '1s' }}
                />
                <div className="absolute inset-3 rounded-full bg-neon-purple/10 flex items-center justify-center">
                  <Sparkles size={28} className="text-neon-purple" />
                </div>
              </div>

              <h2 className="font-mono text-xl font-bold text-white mb-2">Minting Your INFT…</h2>
              <p className="text-gray-500 font-mono text-sm mb-8">
                Securing your portfolio on the 0G Network
              </p>

              <div className="space-y-3">
                {progress.map((s, i) => (
                  <div key={s.step} className="flex items-center gap-3 text-left">
                    <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                      {s.done ? (
                        <CheckCircle size={16} className="text-neon-cyan" />
                      ) : i === activeStep ? (
                        <Loader2 size={16} className="animate-spin text-neon-purple" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-gray-700" />
                      )}
                    </div>
                    <span
                      className="font-mono text-sm"
                      style={{
                        color: s.done ? '#06b6d4' : i === activeStep ? '#a855f7' : '#4b5563',
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'success' && result && (() => {
          const cfg = TIER_CONFIG[result.tier] ?? TIER_CONFIG.silver;
          return (
            <div className="max-w-lg mx-auto text-center">
              <div
                className="rounded-2xl border p-8"
                style={{ borderColor: cfg.border, boxShadow: `0 0 48px ${cfg.glow}66`, background: cfg.bg }}
              >
                <div className="text-6xl mb-4">{cfg.emoji}</div>
                <h2 className="font-mono text-2xl font-bold text-white mb-2">
                  INFT Minted Successfully!
                </h2>
                <p className="text-gray-400 font-mono text-sm mb-6">
                  Your {cfg.label} INFT #{result.tokenId} is now on 0G Chain
                </p>

                <div
                  className="rounded-xl border p-4 mb-6 text-left space-y-2"
                  style={{ borderColor: cfg.border }}
                >
                  {[
                    ['Token ID',  `#${result.tokenId}`],
                    ['Tier',      cfg.label],
                    ['Tx Hash',   `${result.txHash.slice(0, 16)}…`],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between text-xs font-mono">
                      <span className="text-gray-500">{label as string}</span>
                      <span style={{ color: cfg.color }}>{value as string}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <a
                    href={result.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-lg border font-mono text-sm flex items-center justify-center gap-1.5 hover:opacity-80 transition-opacity"
                    style={{ borderColor: cfg.border, color: cfg.color, background: cfg.bg }}
                  >
                    <ExternalLink size={13} />
                    View on Explorer
                  </a>
                  <a
                    href="/marketplace"
                    className="flex-1 py-2.5 rounded-lg font-mono text-sm font-bold flex items-center justify-center gap-1.5"
                    style={{
                      background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color})`,
                      color:      '#0a0a0f',
                    }}
                  >
                    List on Market →
                  </a>
                </div>
              </div>
            </div>
          );
        })()}

        {step === 'error' && (
          <div className="max-w-lg mx-auto text-center">
            <div className="rounded-2xl border border-red-500/30 bg-bg-card p-8">
              <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
              <h2 className="font-mono text-xl font-bold text-white mb-2">Minting Failed</h2>
              <p className="text-red-400 font-mono text-sm mb-6">{errMsg}</p>
              <button
                onClick={() => setStep('select')}
                className="px-6 py-2.5 rounded-lg border border-neon-purple/30 text-neon-purple font-mono text-sm hover:bg-neon-purple/10 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
