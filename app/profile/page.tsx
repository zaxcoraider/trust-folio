'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance, useEnsName } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { zgTestnet } from '@/lib/wagmi-config';
import { getPortfolioFiles } from '@/lib/portfolio-store';
import { getVerificationHistory } from '@/lib/verification-store';
import { getWalletCredentials } from '@/lib/credential-contract';
import { PortfolioCard } from '@/components/PortfolioCard';
import { BadgeCard } from '@/components/BadgeCard';
import { NeonCard } from '@/components/NeonCard';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { User, Upload, CheckCircle2, Star, Zap, Award, Copy, Check, ExternalLink } from 'lucide-react';
import type { PortfolioFile, SoulBoundToken } from '@/lib/types';
import { TIER_CONFIG } from '@/lib/types';

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const BADGES = [
  { id: 'first_upload',   label: 'First Upload',       icon: Upload,        color: 'neon-purple', condition: (f: PortfolioFile[]) => f.length >= 1, desc: 'Uploaded first file'          },
  { id: 'verified',       label: 'AI Verified',         icon: CheckCircle2,  color: 'neon-cyan',   condition: (f: PortfolioFile[]) => f.some(x => x.verified), desc: 'Completed AI verification' },
  { id: 'five_files',     label: 'Portfolio Builder',   icon: Star,          color: 'neon-pink',   condition: (f: PortfolioFile[]) => f.length >= 5, desc: '5+ items uploaded'            },
  { id: 'high_score',     label: 'Top Scorer',          icon: Award,         color: 'neon-cyan',   condition: (f: PortfolioFile[]) => f.some(x => (x.verificationScore ?? 0) >= 80), desc: '80+ score' },
  { id: 'soul_bound',     label: 'Credential Holder',   icon: Zap,           color: 'neon-purple', condition: (f: PortfolioFile[]) => f.some(x => x.soulBoundTokenId != null), desc: 'Minted a credential' },
  { id: 'ten_files',      label: 'Pro Creator',         icon: Star,          color: 'neon-pink',   condition: (f: PortfolioFile[]) => f.length >= 10, desc: '10+ items'                   },
];

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const [copied, setCopied]     = useState(false);
  const [files, setFiles]       = useState<PortfolioFile[]>([]);
  const [tokens, setTokens]     = useState<SoulBoundToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);

  const { data: balance0G } = useBalance({ address, chainId: zgTestnet.id });
  const { data: ensName }   = useEnsName({ address, chainId: mainnet.id });
  const history             = address ? getVerificationHistory(address) : [];

  useEffect(() => {
    if (address) {
      setFiles(getPortfolioFiles(address));
      // Load on-chain tokens
      setLoadingTokens(true);
      getWalletCredentials(address)
        .then(setTokens)
        .finally(() => setLoadingTokens(false));
    }
  }, [address]);

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
        <div className="fixed inset-0 bg-grid pointer-events-none" />
        <NeonCard className="p-10 text-center max-w-sm w-full" glow="purple">
          <User size={40} className="mx-auto mb-4 text-neon-purple/40" />
          <p className="text-gray-300 font-mono text-sm mb-6">Connect wallet to view your profile</p>
          <ConnectButton />
        </NeonCard>
      </div>
    );
  }

  const verifiedFiles = files.filter(f => f.verified);
  const avgScore = verifiedFiles.length > 0
    ? Math.round(verifiedFiles.reduce((s, f) => s + (f.verificationScore ?? 0), 0) / verifiedFiles.length)
    : 0;
  const totalSize       = files.reduce((s, f) => s + f.size, 0);
  const earnedBadges    = BADGES.filter(b => b.condition(files));
  const explorerUrl     = `https://chainscan-galileo.0g.ai/address/${address}`;

  // Tier distribution from history
  const tierDist = history.reduce((acc, r) => {
    acc[r.tier] = (acc[r.tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="relative min-h-screen bg-bg-primary px-4 py-10 page-enter">
      <div className="fixed inset-0 bg-grid pointer-events-none" />

      <div className="relative mx-auto max-w-6xl">
        {/* Profile header */}
        <NeonCard className="p-6 sm:p-8 mb-8" glow="purple">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-neon-purple via-neon-cyan to-neon-pink flex items-center justify-center shadow-neon-purple">
                <User size={36} className="text-white" />
              </div>
              {earnedBadges.length > 0 && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-neon-cyan flex items-center justify-center shadow-neon-cyan">
                  <CheckCircle2 size={14} className="text-white" />
                </div>
              )}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              {ensName && (
                <p className="font-mono text-xl font-bold text-gray-100 text-glow-purple mb-0.5">{ensName}</p>
              )}
              <p className="font-mono text-sm text-gray-400 break-all">{address}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button onClick={copyAddress}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-xs
                    border border-neon-purple/25 text-neon-purple hover:bg-neon-purple/10 transition-all">
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-xs
                    border border-neon-cyan/25 text-neon-cyan hover:bg-neon-cyan/10 transition-all">
                  <ExternalLink size={11} /> Explorer
                </a>
              </div>
            </div>

            {/* 0G Balance */}
            {balance0G && (
              <div className="text-right shrink-0">
                <p className="font-mono text-xs text-gray-600">0G Balance</p>
                <p className="font-mono text-2xl font-bold text-neon-cyan text-glow-cyan">
                  {parseFloat(balance0G.formatted).toFixed(4)}
                </p>
                <p className="font-mono text-xs text-gray-700">Galileo Testnet</p>
              </div>
            )}
          </div>
        </NeonCard>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Uploads',         value: files.length,                                                    color: 'neon-purple', glow: 'purple' as const },
            { label: 'Verifications',   value: history.length,                                                  color: 'neon-cyan',   glow: 'cyan' as const },
            { label: 'Avg AI Score',    value: avgScore > 0 ? `${avgScore}` : '—',                              color: 'neon-pink',   glow: 'pink' as const },
            { label: 'Credentials',     value: tokens.length > 0 ? tokens.length : (loadingTokens ? '…' : '0'), color: 'neon-purple', glow: 'purple' as const },
          ].map(stat => (
            <NeonCard key={stat.label} className="p-4 text-center" glow={stat.glow}>
              <p className={`font-mono text-2xl font-bold text-${stat.color}`}>{stat.value}</p>
              <p className="font-mono text-xs text-gray-600 mt-1">{stat.label}</p>
            </NeonCard>
          ))}
        </div>

        {/* Tier distribution */}
        {history.length > 0 && (
          <div className="mb-8">
            <p className="font-mono text-sm font-semibold text-gray-400 mb-3">Tier Distribution</p>
            <div className="grid grid-cols-4 gap-3">
              {(['diamond', 'gold', 'silver', 'bronze'] as const).map(tier => {
                const cfg = TIER_CONFIG[tier];
                const count = tierDist[tier] || 0;
                return (
                  <div key={tier} className="p-3 rounded-xl text-center transition-all"
                    style={{ border: `1px solid ${cfg.border}`, background: cfg.bg,
                      boxShadow: count > 0 ? `0 0 12px ${cfg.glow}` : undefined }}>
                    <p className="text-xl mb-1">{cfg.emoji}</p>
                    <p className="font-mono text-lg font-bold" style={{ color: cfg.color }}>{count}</p>
                    <p className="font-mono text-xs text-gray-600">{cfg.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Soul-bound credentials */}
        {(tokens.length > 0 || loadingTokens) && (
          <div className="mb-8">
            <p className="font-mono text-sm font-semibold text-gray-400 mb-4">
              Soul-Bound Credentials ({tokens.length})
            </p>
            {loadingTokens ? (
              <NeonCard className="p-6 text-center" glow="none">
                <p className="text-gray-600 font-mono text-xs">Loading on-chain credentials…</p>
              </NeonCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tokens.map(token => (
                  <BadgeCard
                    key={token.tokenId}
                    tier={token.tier}
                    score={token.score}
                    skillCategory={token.skillCategory}
                    proofRootHash={token.proofRootHash}
                    tokenId={token.tokenId}
                    contractAddress={token.contractAddress}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Achievement badges */}
        <div className="mb-10">
          <p className="font-mono text-sm font-semibold text-gray-400 mb-4">Achievements</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {BADGES.map(badge => {
              const earned = badge.condition(files);
              const Icon = badge.icon;
              return (
                <NeonCard key={badge.id}
                  className={`p-4 text-center ${earned ? '' : 'opacity-25 grayscale'}`}
                  glow={earned ? (badge.color.replace('neon-', '') as any) : 'none'}>
                  <div className={`inline-flex p-2 rounded-full mb-2 ${earned
                    ? `bg-${badge.color}/10 border border-${badge.color}/25`
                    : 'bg-white/5 border border-white/10'}`}>
                    <Icon size={18} className={earned ? `text-${badge.color}` : 'text-gray-700'} />
                  </div>
                  <p className={`font-mono text-xs font-semibold ${earned ? 'text-gray-300' : 'text-gray-700'}`}>
                    {badge.label}
                  </p>
                  <p className="font-mono text-xs text-gray-700 mt-0.5 leading-snug">{badge.desc}</p>
                </NeonCard>
              );
            })}
          </div>
        </div>

        {/* Portfolio grid */}
        <div>
          <p className="font-mono text-sm font-semibold text-gray-400 mb-4">Portfolio ({files.length})</p>
          {files.length === 0 ? (
            <NeonCard className="p-10 text-center" glow="none">
              <Upload size={28} className="mx-auto mb-3 text-gray-800" />
              <p className="text-gray-700 font-mono text-sm">No portfolio items yet</p>
            </NeonCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map(file => (
                <PortfolioCard key={file.id} file={file} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
