'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  Sparkles, Shield, CheckCircle, AlertCircle,
  ExternalLink, Loader2, ChevronRight, Lock, Zap, Clock,
} from 'lucide-react';
import type { PortfolioFile, VerificationTier } from '@/lib/types';
import { TIER_CONFIG, getTier } from '@/lib/types';
import { getPortfolioFiles } from '@/lib/portfolio-store';
import { saveINFT, getINFTByFileHash, buildBadges } from '@/lib/inft-store';
import { walletClientToSigner } from '@/lib/wallet-to-signer';
import { uploadFileTo0G } from '@/lib/storage';
import { isConfigured, INFT_ABI } from '@/lib/contracts';
import { useNetwork } from '@/lib/network-context';
import { ListINFTModal } from '@/components/ListINFTModal';
import { getINFT } from '@/lib/inft-store';
import type { INFTMetadata } from '@/lib/types';
import { ethers } from 'ethers';

type MintStep = 'select' | 'uploading' | 'minting' | 'success' | 'error';

interface MintResult {
  tokenId: number;
  txHash:  string;
  explorerUrl: string;
  tier: VerificationTier;
}

function buildMetadataURI(
  tier: VerificationTier,
  score: number,
  skillCategory: string,
  badges: string[],
  networkName = '0G Network',
): string {
  const tierColors: Record<string, { accent: string; emoji: string }> = {
    diamond:    { accent: '#e2e8f0', emoji: '💎' },
    gold:       { accent: '#f59e0b', emoji: '🥇' },
    silver:     { accent: '#06b6d4', emoji: '🥈' },
    bronze:     { accent: '#a855f7', emoji: '🥉' },
    unverified: { accent: '#4b5563', emoji: '⬜' },
  };
  const c = tierColors[tier] ?? tierColors.silver;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="480" viewBox="0 0 400 480"><defs><radialGradient id="bg" cx="50%" cy="40%" r="70%"><stop offset="0%" stop-color="${c.accent}" stop-opacity="0.18"/><stop offset="100%" stop-color="#0a0a0f"/></radialGradient><filter id="glow"><feGaussianBlur stdDeviation="5" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter></defs><rect width="400" height="480" fill="#0a0a0f"/><rect width="400" height="480" fill="url(#bg)"/><rect x="8" y="8" width="384" height="464" rx="18" fill="none" stroke="${c.accent}" stroke-width="1.5" stroke-opacity="0.5"/><text x="200" y="90" font-family="monospace" font-size="56" text-anchor="middle" filter="url(#glow)">${c.emoji}</text><text x="200" y="175" font-family="monospace" font-size="80" font-weight="bold" text-anchor="middle" fill="${c.accent}" filter="url(#glow)">${score}</text><text x="200" y="205" font-family="monospace" font-size="14" text-anchor="middle" fill="${c.accent}" opacity="0.6">/100 VERIFIED SCORE</text><text x="200" y="255" font-family="monospace" font-size="22" font-weight="bold" text-anchor="middle" fill="${c.accent}">${tier.toUpperCase()} INFT</text><text x="200" y="285" font-family="monospace" font-size="13" text-anchor="middle" fill="${c.accent}" opacity="0.6">${skillCategory.toUpperCase()}</text><text x="200" y="450" font-family="monospace" font-size="10" text-anchor="middle" fill="${c.accent}" opacity="0.3">TrustFolio · 0G Chain · ERC-7857</text></svg>`;

  const meta = JSON.stringify({
    name:        `TrustFolio ${tier.charAt(0).toUpperCase() + tier.slice(1)} INFT`,
    description: `An Intelligent NFT (ERC-7857) issued by TrustFolio. AI-verified ${skillCategory} portfolio scoring ${score}/100.`,
    image:       `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`,
    attributes: [
      { trait_type: 'Tier',        value: tier.charAt(0).toUpperCase() + tier.slice(1) },
      { trait_type: 'Score',       value: score },
      { trait_type: 'Skill',       value: skillCategory },
      { trait_type: 'Badge Count', value: badges.length },
      { trait_type: 'Network',     value: networkName },
      { trait_type: 'Standard',    value: 'ERC-7857' },
    ],
    external_url: 'https://trustfolio.app',
  });

  return `data:application/json;base64,${btoa(unescape(encodeURIComponent(meta)))}`;
}

export default function MintPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient }   = useWalletClient();
  const { networkConfig, activeNetwork } = useNetwork();

  const [files,      setFiles]      = useState<PortfolioFile[]>([]);
  const [selected,   setSelected]   = useState<PortfolioFile | null>(null);
  const [step,       setStep]       = useState<MintStep>('select');
  const [statusMsg,  setStatusMsg]  = useState('');
  const [result,     setResult]     = useState<MintResult | null>(null);
  const [errMsg,     setErrMsg]     = useState('');
  const [showListModal, setShowListModal] = useState(false);

  const inftAddress = networkConfig.contracts.inft;
  const contractReady = isConfigured(inftAddress);

  useEffect(() => {
    if (!address) return;
    const all = getPortfolioFiles(address);
    const eligible = all.filter(
      (f) => (f.verificationScore ?? 0) >= 60 && !getINFTByFileHash(f.rootHash || '')
    );
    setFiles(eligible);
  }, [address, activeNetwork]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMint = useCallback(async () => {
    if (!selected || !address || !walletClient || !inftAddress) return;

    const breakdown = selected.verificationBreakdown ?? {
      originality: 75, quality: 75, complexity: 75, authenticity: 75, summary: '',
    };
    const score    = selected.verificationScore ?? 60;
    const tier     = getTier(score);
    const category = (selected.skillCategory || 'other') as 'code' | 'design' | 'writing' | 'document' | 'other';
    const badges   = buildBadges(score, category, breakdown);

    try {
      // Step 1: Upload encrypted metadata to 0G Storage
      setStep('uploading');
      setStatusMsg('Waiting for wallet approval to upload metadata to 0G Storage…');

      const metadataPayload = {
        version:      '2.0',
        tier,
        score,
        skillCategory: category,
        badges,
        breakdown,
        fileRootHash: selected.rootHash || '',
        proofRootHash: selected.proofRootHash || '',
        owner:        address,
        mintedAt:     Date.now(),
        network:      networkConfig.name,
      };

      const metadataBlob = new Blob(
        [JSON.stringify(metadataPayload, null, 2)],
        { type: 'application/json' }
      );
      const metadataFile = new File(
        [metadataBlob],
        `inft-metadata-${Date.now()}.json`,
        { type: 'application/json' }
      );

      const signer = await walletClientToSigner(walletClient);

      let encryptedMetadataHash = '';
      try {
        const { rootHash } = await uploadFileTo0G(
          metadataFile,
          signer,
          (p) => setStatusMsg(p.message || 'Uploading metadata…'),
          { rpcUrl: networkConfig.rpc, indexerUrl: networkConfig.storageIndexer }
        );
        encryptedMetadataHash = rootHash;
        setStatusMsg('Metadata uploaded to 0G Storage ✓');
      } catch (storageErr) {
        // Non-fatal: proceed without storage hash
        console.warn('[mint] metadata upload failed:', storageErr);
        setStatusMsg('Proceeding without storage upload…');
      }

      // Step 2: Mint INFT directly from user's wallet
      setStep('minting');
      setStatusMsg('Check your wallet — approve the mint transaction…');

      // Full metadata URI for localStorage display
      const metadataURI = buildMetadataURI(tier, score, category, badges, networkConfig.name);

      // On-chain tokenURI must be a resolvable URL so explorers (0G, OpenSea) can display it.
      // We serve metadata from our API endpoint; the image is generated server-side as SVG.
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trustfolio.space';
      const imageUrl = `${baseUrl}/api/nft-image?score=${score}&tier=${tier}&skill=${category}`;
      const onChainMeta = JSON.stringify({
        name:         `TrustFolio ${tier.charAt(0).toUpperCase() + tier.slice(1)} INFT`,
        description:  `AI-verified ${category} portfolio on 0G Network. Score: ${score}/100.`,
        image:        imageUrl,
        external_url: `${baseUrl}`,
        attributes: [
          { trait_type: 'Score',   value: score },
          { trait_type: 'Tier',    value: tier.charAt(0).toUpperCase() + tier.slice(1) },
          { trait_type: 'Skill',   value: category },
          { trait_type: 'Network', value: networkConfig.name },
          { trait_type: 'Standard',value: 'ERC-7857' },
          ...(encryptedMetadataHash ? [{ trait_type: '0G Storage', value: encryptedMetadataHash }] : []),
        ],
      });
      const onChainURI = `data:application/json;base64,${btoa(unescape(encodeURIComponent(onChainMeta)))}`;


      // Unique fileRootHash fallback if 0G upload didn't happen
      const safeFileHash = selected.rootHash || `local_${address.toLowerCase()}_${Date.now()}`;

      const contract    = new ethers.Contract(inftAddress, INFT_ABI as unknown as string[], signer);
      const mintingFee: bigint = await contract.mintingFee().catch(() => ethers.parseEther('0.001'));

      const tx = await contract.mintINFT(
        address,
        category,
        score,
        breakdown.originality,
        breakdown.quality,
        breakdown.complexity,
        breakdown.authenticity,
        encryptedMetadataHash || '',
        selected.proofRootHash || '',
        safeFileHash,
        badges,
        onChainURI,
        { value: mintingFee },
      );

      setStatusMsg('Transaction submitted — waiting for confirmation…');
      const receipt = await tx.wait();

      // Parse tokenId from INFTMinted event
      let tokenId = 0;
      const iface = new ethers.Interface(INFT_ABI as unknown as string[]);
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
          if (parsed?.name === 'INFTMinted') { tokenId = Number(parsed.args[0]); break; }
        } catch { /* skip */ }
      }

      setStatusMsg('Transaction confirmed ✓');
      const txHash = tx.hash;

      // Save to local store
      const inft: INFTMetadata = {
        tokenId,
        owner:                 address,
        originalOwner:         address,
        skillCategory:         category,
        score,
        originalityScore:      breakdown.originality,
        qualityScore:          breakdown.quality,
        complexityScore:       breakdown.complexity,
        authenticityScore:     breakdown.authenticity,
        encryptedMetadataHash,
        proofRootHash:         selected.proofRootHash || '',
        fileRootHash:          selected.rootHash || '',
        badges,
        mintedAt:              Math.floor(Date.now() / 1000),
        tier,
        metadataURI,
        contractAddress:       inftAddress,
        txHash,
      };
      saveINFT(inft);

      setResult({
        tokenId,
        txHash,
        explorerUrl: `${networkConfig.explorer}/tx/${txHash}`,
        tier,
      });
      setStep('success');
    } catch (err: unknown) {
      const e = err as {
        reason?: string; shortMessage?: string; message?: string;
        revert?: { name: string; args: unknown[] };
      };
      let msg = 'Minting failed';
      if (e.revert?.name) {
        const args = e.revert.args?.length ? ` (${e.revert.args.join(', ')})` : '';
        msg = `${e.revert.name}${args}`;
      } else {
        msg = e.reason || e.shortMessage || e.message || 'Minting failed';
      }
      console.error('[mintINFT] error:', e);
      setErrMsg(
        msg.includes('user rejected') || msg.includes('ACTION_REJECTED')
          ? 'Transaction cancelled — you rejected the wallet prompt.'
          : msg
      );
      setStep('error');
    }
  }, [selected, address, walletClient, inftAddress, networkConfig]);

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

        {/* Contract not deployed notice */}
        {!contractReady && (
          <div className="mb-8 rounded-xl border border-amber-400/30 bg-amber-400/5 p-5 text-center">
            <Clock size={28} className="mx-auto mb-2 text-amber-400" />
            <p className="font-mono text-amber-400 font-bold mb-1">Smart contracts deploying soon</p>
            <p className="font-mono text-amber-400/70 text-xs">
              INFT minting will be available shortly. Set NEXT_PUBLIC_TESTNET_INFT_ADDRESS to enable.
            </p>
          </div>
        )}

        {/* Step: Select */}
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
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg border"
                              style={{ borderColor: cfg.border, background: cfg.bg }}>
                              {cfg.emoji}
                            </div>
                            <div>
                              <div className="font-mono text-sm font-bold text-white line-clamp-1">{file.name}</div>
                              <div className="text-xs font-mono text-gray-500 capitalize">{file.skillCategory} · {cfg.label}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-xl font-black" style={{ color: cfg.color }}>
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
                  <div className="text-gray-600 font-mono text-sm">Select a portfolio to preview your INFT</div>
                </div>
              ) : (() => {
                const tier = getTier(selected.verificationScore ?? 60);
                const cfg  = TIER_CONFIG[tier];
                const breakdown = selected.verificationBreakdown ?? {
                  originality: 75, quality: 75, complexity: 75, authenticity: 75, summary: '',
                };
                const score  = selected.verificationScore ?? 60;
                const badges = buildBadges(
                  score,
                  selected.skillCategory as 'code' | 'design' | 'writing' | 'document' | 'other',
                  breakdown
                );
                return (
                  <div>
                    <div className="rounded-2xl border p-6 mb-4 relative overflow-hidden"
                      style={{ borderColor: cfg.border, background: `linear-gradient(135deg, ${cfg.bg}, #12121f)`, boxShadow: `0 0 32px ${cfg.glow}44` }}>
                      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: cfg.color }} />
                      <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-bold"
                            style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}>
                            {cfg.emoji} {cfg.label.toUpperCase()} INFT
                          </div>
                          <Lock size={14} className="text-gray-600" />
                        </div>
                        <div className="text-6xl font-mono font-black mb-1"
                          style={{ color: cfg.color, textShadow: `0 0 24px ${cfg.glow}` }}>
                          {score}
                        </div>
                        <div className="text-xs text-gray-500 font-mono mb-4">/ 100 AI Verification Score</div>
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
                                <div className="h-full rounded-full"
                                  style={{ width: `${val}%`, background: `linear-gradient(90deg, ${cfg.color}66, ${cfg.color})` }} />
                              </div>
                              <span className="text-[10px] font-mono text-gray-600 w-6 text-right">{val}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {badges.map((b) => (
                            <span key={b} className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                              style={{ color: cfg.color, borderColor: `${cfg.color}44`, background: `${cfg.color}11` }}>
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-neon-purple/15 bg-bg-card p-4 mb-5 space-y-2">
                      {[
                        ['Step 1', 'Upload metadata to 0G Storage (wallet signs)'],
                        ['Step 2', 'Sign mintINFT() from your wallet (+ 0.001 0G fee)'],
                        ['Standard', 'ERC-7857 Intelligent NFT'],
                        ['Network', `${networkConfig.name} · Chain ${networkConfig.chainId}`],
                      ].map(([label, value]) => (
                        <div key={label as string} className="flex justify-between text-xs font-mono">
                          <span className="text-gray-500">{label as string}</span>
                          <span className="text-gray-300 text-right max-w-[60%]">{value as string}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleMint}
                      disabled={!contractReady}
                      className="w-full py-3 rounded-xl font-mono font-bold text-bg-primary text-base transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color})`, boxShadow: `0 0 24px ${cfg.glow}88` }}
                    >
                      <Zap size={16} />
                      {contractReady ? 'Mint as INFT' : 'Contracts deploying soon…'}
                      {contractReady && <ChevronRight size={16} />}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Step: Uploading metadata */}
        {step === 'uploading' && (
          <div className="max-w-lg mx-auto">
            <div className="rounded-2xl border border-neon-cyan/30 bg-bg-card p-8 text-center">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-neon-cyan/20" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-neon-cyan animate-spin" style={{ animationDuration: '1s' }} />
                <div className="absolute inset-3 rounded-full bg-neon-cyan/10 flex items-center justify-center">
                  <Shield size={28} className="text-neon-cyan" />
                </div>
              </div>
              <h2 className="font-mono text-xl font-bold text-white mb-2">Uploading to 0G Storage…</h2>
              <p className="text-neon-cyan font-mono text-sm">{statusMsg}</p>
            </div>
          </div>
        )}

        {/* Step: Minting */}
        {step === 'minting' && (
          <div className="max-w-lg mx-auto">
            <div className="rounded-2xl border border-neon-purple/30 bg-bg-card p-8 text-center">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-neon-purple/20" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-neon-purple animate-spin" style={{ animationDuration: '1s' }} />
                <div className="absolute inset-3 rounded-full bg-neon-purple/10 flex items-center justify-center">
                  <Sparkles size={28} className="text-neon-purple" />
                </div>
              </div>
              <h2 className="font-mono text-xl font-bold text-white mb-2">Minting Your INFT…</h2>
              <p className="text-neon-purple font-mono text-sm">{statusMsg}</p>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && result && (() => {
          const cfg = TIER_CONFIG[result.tier] ?? TIER_CONFIG.silver;
          return (
            <div className="max-w-lg mx-auto text-center">
              <div className="rounded-2xl border p-8"
                style={{ borderColor: cfg.border, boxShadow: `0 0 48px ${cfg.glow}66`, background: cfg.bg }}>
                <div className="text-6xl mb-4">{cfg.emoji}</div>
                <h2 className="font-mono text-2xl font-bold text-white mb-2">INFT Minted Successfully!</h2>
                <p className="text-gray-400 font-mono text-sm mb-6">
                  Your {cfg.label} INFT #{result.tokenId} is now on 0G Chain
                </p>
                <div className="rounded-xl border p-4 mb-6 text-left space-y-2" style={{ borderColor: cfg.border }}>
                  {[
                    ['Token ID', `#${result.tokenId}`],
                    ['Tier',     cfg.label],
                    ['Tx Hash',  `${result.txHash.slice(0, 16)}…`],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between text-xs font-mono">
                      <span className="text-gray-500">{label as string}</span>
                      <span style={{ color: cfg.color }}>{value as string}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-lg border font-mono text-sm flex items-center justify-center gap-1.5 hover:opacity-80"
                    style={{ borderColor: cfg.border, color: cfg.color, background: cfg.bg }}>
                    <ExternalLink size={13} />
                    View on Explorer
                  </a>
                  <button
                    onClick={() => setShowListModal(true)}
                    className="flex-1 py-2.5 rounded-lg font-mono text-sm font-bold flex items-center justify-center gap-1.5"
                    style={{ background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color})`, color: '#0a0a0f' }}>
                    List on Market →
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Step: Error */}
        {step === 'error' && (
          <div className="max-w-lg mx-auto text-center">
            <div className="rounded-2xl border border-red-500/30 bg-bg-card p-8">
              <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
              <h2 className="font-mono text-xl font-bold text-white mb-2">Minting Failed</h2>
              <p className="text-red-400 font-mono text-sm mb-6">{errMsg}</p>
              <div className="flex gap-3">
                <button onClick={() => { setStep('select'); setErrMsg(''); }}
                  className="flex-1 px-6 py-2.5 rounded-lg border border-neon-purple/30 text-neon-purple font-mono text-sm hover:bg-neon-purple/10">
                  ← Go Back
                </button>
                <button onClick={handleMint}
                  className="flex-1 px-6 py-2.5 rounded-lg bg-neon-purple/20 border border-neon-purple/30 text-neon-purple font-mono text-sm hover:bg-neon-purple/30">
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* List INFT modal — opens after successful mint */}
      {showListModal && result && (() => {
        const inft = getINFT(result.tokenId);
        if (!inft) return null;
        return (
          <ListINFTModal
            inft={inft}
            onClose={() => setShowListModal(false)}
            onSuccess={() => {
              setShowListModal(false);
              window.location.href = '/marketplace';
            }}
          />
        );
      })()}
    </div>
  );
}
