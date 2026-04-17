'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount, useBalance } from 'wagmi';
import { zgTestnet } from '@/lib/wagmi-config';
import { getPortfolioFiles } from '@/lib/portfolio-store';
import { getVerificationHistory } from '@/lib/verification-store';
import { getWalletCredentials } from '@/lib/credential-contract';
import { getUserSettings } from '@/lib/settings-store';
import { getLocalProfileHash, getRemoteProfileHash, loadProfileFrom0G } from '@/lib/profile-store';
import { fetchAllINFTs } from '@/lib/chain-reader';
import { useNetwork } from '@/lib/network-context';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { PortfolioCard } from '@/components/PortfolioCard';
import { BadgeCard } from '@/components/BadgeCard';
import { NeonCard } from '@/components/NeonCard';
import { INFTCard } from '@/components/INFTCard';
import {
  Github, Globe, Twitter, MapPin, Briefcase, Link2, Copy, Check,
  ExternalLink, Share2, Loader2, User, Upload, Star, Shield, Zap,
  CheckCircle2, Award, Lock,
} from 'lucide-react';
import type { PortfolioFile, SoulBoundToken, UserSettings, INFTMetadata } from '@/lib/types';
import { TIER_CONFIG } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PublicProfile extends Partial<UserSettings> {
  walletAddress: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const SKILL_COLORS: Record<string, { color: string; border: string; bg: string; glow: string }> = {
  development: { color: '#06b6d4', border: 'rgba(6,182,212,0.4)',   bg: 'rgba(6,182,212,0.08)',   glow: 'rgba(6,182,212,0.4)'   },
  design:      { color: '#ec4899', border: 'rgba(236,72,153,0.4)',  bg: 'rgba(236,72,153,0.08)',  glow: 'rgba(236,72,153,0.4)'  },
  writing:     { color: '#a855f7', border: 'rgba(168,85,247,0.4)',  bg: 'rgba(168,85,247,0.08)',  glow: 'rgba(168,85,247,0.4)'  },
  blockchain:  { color: '#f59e0b', border: 'rgba(245,158,11,0.4)',  bg: 'rgba(245,158,11,0.08)',  glow: 'rgba(245,158,11,0.4)'  },
  aiml:        { color: '#22c55e', border: 'rgba(34,197,94,0.4)',   bg: 'rgba(34,197,94,0.08)',   glow: 'rgba(34,197,94,0.4)'   },
  custom:      { color: '#94a3b8', border: 'rgba(148,163,184,0.3)', bg: 'rgba(148,163,184,0.06)', glow: 'rgba(148,163,184,0.3)' },
};

const HIRING_DISPLAY = {
  available:       { label: 'Available for Hire',  color: '#22c55e', dot: 'bg-emerald-400' },
  'open-to-offers':{ label: 'Open to Offers',      color: '#f59e0b', dot: 'bg-amber-400'   },
  'not-available': { label: 'Not Available',        color: '#6b7280', dot: 'bg-gray-500'    },
};

const BADGES = [
  { id: 'first_upload',  label: 'First Upload',     icon: Upload,       color: 'neon-purple', condition: (f: PortfolioFile[]) => f.length >= 1             },
  { id: 'verified',      label: 'AI Verified',       icon: CheckCircle2, color: 'neon-cyan',   condition: (f: PortfolioFile[]) => f.some(x => x.verified)   },
  { id: 'five_files',    label: 'Portfolio Builder', icon: Star,         color: 'neon-pink',   condition: (f: PortfolioFile[]) => f.length >= 5             },
  { id: 'high_score',    label: 'Top Scorer',        icon: Award,        color: 'neon-cyan',   condition: (f: PortfolioFile[]) => f.some(x => (x.verificationScore ?? 0) >= 80) },
  { id: 'soul_bound',    label: 'Credential Holder', icon: Zap,          color: 'neon-purple', condition: (f: PortfolioFile[]) => f.some(x => x.soulBoundTokenId != null) },
  { id: 'ten_files',     label: 'Pro Creator',       icon: Star,         color: 'neon-pink',   condition: (f: PortfolioFile[]) => f.length >= 10            },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function PublicProfilePage({
  params,
}: {
  params: { walletAddress: string };
}) {
  const targetAddr    = params.walletAddress.toLowerCase();
  const { address }   = useAccount();
  const { networkConfig } = useNetwork();
  const isOwnProfile  = address?.toLowerCase() === targetAddr;
  const searchParams  = useSearchParams();
  const urlHash       = searchParams.get('hash');

  const { data: balance0G } = useBalance({
    address: targetAddr as `0x${string}`,
    chainId: zgTestnet.id,
  });

  const [profile, setProfile]       = useState<PublicProfile | null>(null);
  const [loading, setLoading]       = useState(true);
  const [notFound, setNotFound]     = useState(false);
  const [files, setFiles]           = useState<PortfolioFile[]>([]);
  const [tokens, setTokens]         = useState<SoulBoundToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [infts, setInfts]           = useState<INFTMetadata[]>([]);
  const [loadingInfts, setLoadingInfts] = useState(false);
  const [copied, setCopied]         = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // ── Load profile ────────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);

      // 1. Own profile: always available from localStorage
      if (isOwnProfile && address) {
        const local = getUserSettings(address);
        setProfile(local);
        setLoading(false);
        return;
      }

      // 2. Try hash from URL param (most reliable — included in shared link)
      let rootHash = urlHash || null;

      // 3. Try local hash cache
      if (!rootHash) rootHash = getLocalProfileHash(targetAddr);

      // 4. Try server-side hash store
      if (!rootHash) rootHash = await getRemoteProfileHash(targetAddr);

      // 4. Load from 0G Storage
      if (rootHash) {
        const data = await loadProfileFrom0G(rootHash);
        if (data) {
          setProfile({ walletAddress: targetAddr, ...(data as Partial<UserSettings>) });
          setLoading(false);
          return;
        }
      }

      // 5. No profile found
      setNotFound(true);
      setProfile({ walletAddress: targetAddr });
      setLoading(false);
    }

    loadProfile();
  }, [targetAddr, isOwnProfile, address, urlHash]);

  // ── Load portfolio + credentials ────────────────────────────────────────────

  useEffect(() => {
    if (isOwnProfile && address) {
      setFiles(getPortfolioFiles(address));
    }
    setLoadingTokens(true);
    getWalletCredentials(targetAddr, networkConfig)
      .then(setTokens)
      .finally(() => setLoadingTokens(false));
  }, [targetAddr, isOwnProfile, address, networkConfig]);

  // ── Load INFTs from chain ────────────────────────────────────────────────────

  useEffect(() => {
    setLoadingInfts(true);
    fetchAllINFTs(networkConfig)
      .then((all) => setInfts(all.filter((t) => t.originalOwner.toLowerCase() === targetAddr)))
      .finally(() => setLoadingInfts(false));
  }, [targetAddr, networkConfig]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  function copyAddress() {
    navigator.clipboard.writeText(targetAddr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyProfileLink() {
    const hash = (profile as UserSettings)?.profileRootHash;
    const url  = hash
      ? `${window.location.origin}/profile/${targetAddr}?hash=${hash}`
      : window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const verifiedFiles = files.filter((f) => f.verified);
  const avgScore = verifiedFiles.length > 0
    ? Math.round(verifiedFiles.reduce((s, f) => s + (f.verificationScore ?? 0), 0) / verifiedFiles.length)
    : 0;

  const bestINFTScore = infts.length > 0 ? Math.max(...infts.map((t) => t.score)) : null;
  const topINFTTier   = infts.find((t) => t.score === bestINFTScore)?.tier ?? null;

  const history = isOwnProfile && address ? getVerificationHistory(address) : [];
  const tierDist = history.reduce((acc, r) => {
    acc[r.tier] = (acc[r.tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const earnedBadges  = BADGES.filter((b) => b.condition(files));
  const explorerUrl   = `${networkConfig.explorer}/address/${targetAddr}`;
  const hiringInfo    = profile?.hiringStatus
    ? HIRING_DISPLAY[profile.hiringStatus as keyof typeof HIRING_DISPLAY]
    : null;
  const isPrivate     = profile?.visibility === 'private' && !isOwnProfile;
  const isVerifiedOnly = profile?.visibility === 'verified-only' && !isOwnProfile && tokens.length === 0;

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="fixed inset-0 bg-grid pointer-events-none" />
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="text-neon-purple animate-spin" />
          <p className="font-mono text-xs text-gray-600">Loading profile…</p>
        </div>
      </div>
    );
  }

  // ── Private / restricted ──────────────────────────────────────────────────

  if (isPrivate || isVerifiedOnly) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
        <div className="fixed inset-0 bg-grid pointer-events-none" />
        <NeonCard className="p-10 text-center max-w-sm w-full" glow="purple">
          <Lock size={32} className="mx-auto mb-4 text-gray-600" />
          <h1 className="font-mono text-lg font-bold text-gray-300 mb-2">
            {isPrivate ? 'Private Profile' : 'Verified Users Only'}
          </h1>
          <p className="font-mono text-xs text-gray-600">
            {isPrivate
              ? 'This profile is private and not visible to the public.'
              : 'This profile is only visible to users with verified credentials.'
            }
          </p>
        </NeonCard>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen bg-bg-primary px-4 py-10 page-enter">
      <div className="fixed inset-0 bg-grid pointer-events-none" />

      <div className="relative mx-auto max-w-5xl">

        {/* ── Profile header card ── */}
        <NeonCard className="overflow-hidden mb-6" glow="purple">
          {/* Banner */}
          <div
            className="h-28"
            style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.35), rgba(6,182,212,0.2), rgba(236,72,153,0.15))' }}
          />

          {/* Content */}
          <div className="px-6 pb-6">
            {/* Avatar row */}
            <div className="flex items-end justify-between -mt-10 mb-4 flex-wrap gap-3">
              <ProfileAvatar
                address={targetAddr}
                avatarHash={profile?.avatarHash}
                size={80}
                showGlow
                className="ring-4 ring-bg-primary"
              />
              <div className="flex items-center gap-2 flex-wrap">
                {isOwnProfile && (
                  <a
                    href="/settings"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs
                      border border-neon-purple/25 text-neon-purple hover:bg-neon-purple/10 transition-all"
                  >
                    Edit Profile
                  </a>
                )}
                {hiringInfo && profile?.hiringStatus === 'available' && !isOwnProfile && (
                  <a
                    href="/hire"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs
                      border text-emerald-400 transition-all"
                    style={{ borderColor: 'rgba(34,197,94,0.35)', background: 'rgba(34,197,94,0.08)' }}
                  >
                    Contact for Hire
                  </a>
                )}
                <button
                  onClick={copyProfileLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs
                    border border-white/8 text-gray-500 hover:text-gray-300 hover:border-white/15 transition-all"
                >
                  {copiedLink ? <Check size={12} className="text-emerald-400" /> : <Share2 size={12} />}
                  {copiedLink ? 'Copied!' : 'Share'}
                </button>
              </div>
            </div>

            {/* Name + title */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="font-mono text-xl font-bold text-gray-100">
                  {profile?.displayName || shortAddr(targetAddr)}
                </h1>
                {profile?.title && (
                  <p className="font-mono text-sm text-neon-purple mt-0.5">{profile.title}</p>
                )}

                {/* Address row */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="font-mono text-xs text-gray-600">{shortAddr(targetAddr)}</span>
                  <button
                    onClick={copyAddress}
                    className="flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs
                      border border-white/8 text-gray-600 hover:text-neon-purple hover:border-neon-purple/20 transition-all"
                  >
                    {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs
                      border border-white/8 text-gray-600 hover:text-neon-cyan hover:border-neon-cyan/20 transition-all"
                  >
                    <ExternalLink size={10} />
                    Explorer
                  </a>
                </div>
              </div>

              {/* Hiring status badge */}
              {hiringInfo && (
                <span
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-xs border"
                  style={{ color: hiringInfo.color, borderColor: hiringInfo.color + '44', background: hiringInfo.color + '11' }}
                >
                  <span className={`w-2 h-2 rounded-full ${hiringInfo.dot}`}
                    style={{ boxShadow: `0 0 5px ${hiringInfo.color}` }} />
                  {hiringInfo.label}
                </span>
              )}
            </div>

            {/* Bio */}
            {profile?.bio && (
              <p className="font-mono text-sm text-gray-400 mt-4 leading-relaxed max-w-2xl">
                {profile.bio}
              </p>
            )}

            {/* Social links */}
            {(profile?.website || profile?.github || profile?.twitter || profile?.location || profile?.portfolioUrl) && (
              <div className="flex flex-wrap gap-4 mt-4">
                {profile?.location && (
                  <span className="flex items-center gap-1.5 font-mono text-xs text-gray-500">
                    <MapPin size={12} />{profile.location}
                  </span>
                )}
                {profile?.website && (
                  <a
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 font-mono text-xs text-neon-cyan/70 hover:text-neon-cyan transition-colors"
                  >
                    <Globe size={12} />
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                {profile?.github && (
                  <a
                    href={`https://github.com/${profile.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 font-mono text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <Github size={12} />{profile.github}
                  </a>
                )}
                {profile?.twitter && (
                  <a
                    href={`https://x.com/${profile.twitter.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 font-mono text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <Twitter size={12} />@{profile.twitter.replace(/^@/, '')}
                  </a>
                )}
                {profile?.portfolioUrl && (
                  <a
                    href={profile.portfolioUrl.startsWith('http') ? profile.portfolioUrl : `https://${profile.portfolioUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 font-mono text-xs text-neon-purple/60 hover:text-neon-purple transition-colors"
                  >
                    <Link2 size={12} />Portfolio
                  </a>
                )}
              </div>
            )}

            {/* Skills */}
            {profile?.skills && profile.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {profile.skills.map((skill) => {
                  const cat = (profile.skillCategories as Record<string, string>)?.[skill] ?? 'custom';
                  const cfg = SKILL_COLORS[cat] ?? SKILL_COLORS.custom;
                  const lvl = (profile.expertiseLevels as Record<string, string>)?.[skill];
                  return (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-full font-mono text-xs"
                      style={{
                        color:      cfg.color,
                        border:     `1px solid ${cfg.border}`,
                        background: cfg.bg,
                        boxShadow:  lvl === 'expert' ? `0 0 8px ${cfg.glow}` : undefined,
                      }}
                    >
                      {skill}
                      {lvl === 'expert' && ' ✦'}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </NeonCard>

        {/* "No profile on 0G" notice for other wallets */}
        {notFound && !isOwnProfile && (
          <NeonCard glow="none" className="p-4 mb-6 border-amber-400/15 bg-amber-400/4">
            <p className="font-mono text-xs text-amber-400/70">
              This wallet hasn&apos;t saved a profile to 0G Storage yet. On-chain credentials below are still visible.
            </p>
          </NeonCard>
        )}

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            {
              label: 'INFTs Minted',
              value: loadingInfts ? '…' : infts.length,
              color: 'neon-purple', glow: 'purple' as const,
            },
            {
              label: 'Best Score',
              value: loadingInfts ? '…' : (bestINFTScore !== null ? bestINFTScore : '—'),
              color: 'neon-cyan', glow: 'cyan' as const,
            },
            {
              label: 'Top Tier',
              value: loadingInfts ? '…' : (topINFTTier ? topINFTTier.charAt(0).toUpperCase() + topINFTTier.slice(1) : '—'),
              color: 'neon-pink', glow: 'pink' as const,
            },
            {
              label: 'Credentials',
              value: tokens.length > 0 ? tokens.length : (loadingTokens ? '…' : '0'),
              color: 'neon-purple', glow: 'purple' as const,
            },
          ].map((stat) => (
            <NeonCard key={stat.label} className="p-4 text-center" glow={stat.glow}>
              <p className={`font-mono text-2xl font-bold text-${stat.color}`}>{stat.value}</p>
              <p className="font-mono text-xs text-gray-600 mt-1">{stat.label}</p>
            </NeonCard>
          ))}
        </div>

        {/* ── Tier distribution (own profile only) ── */}
        {isOwnProfile && history.length > 0 && (
          <div className="mb-6">
            <p className="font-mono text-xs font-semibold text-gray-500 mb-3 uppercase tracking-widest">
              Tier Distribution
            </p>
            <div className="grid grid-cols-4 gap-3">
              {(['diamond', 'gold', 'silver', 'bronze'] as const).map((tier) => {
                const cfg   = TIER_CONFIG[tier];
                const count = tierDist[tier] || 0;
                return (
                  <div
                    key={tier}
                    className="p-3 rounded-xl text-center transition-all"
                    style={{
                      border:     `1px solid ${cfg.border}`,
                      background: cfg.bg,
                      boxShadow:  count > 0 ? `0 0 12px ${cfg.glow}` : undefined,
                    }}
                  >
                    <p className="text-xl mb-1">{cfg.emoji}</p>
                    <p className="font-mono text-lg font-bold" style={{ color: cfg.color }}>{count}</p>
                    <p className="font-mono text-xs text-gray-600">{cfg.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Soul-bound credentials ── */}
        {(tokens.length > 0 || loadingTokens) && (
          <div className="mb-6">
            <p className="font-mono text-xs font-semibold text-gray-500 mb-4 uppercase tracking-widest">
              Soul-Bound Credentials ({tokens.length})
            </p>
            {loadingTokens ? (
              <NeonCard className="p-6 text-center" glow="none">
                <Loader2 size={16} className="mx-auto text-gray-600 animate-spin" />
              </NeonCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tokens.map((token) => (
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

        {/* ── Achievement badges (own profile) ── */}
        {isOwnProfile && (
          <div className="mb-6">
            <p className="font-mono text-xs font-semibold text-gray-500 mb-4 uppercase tracking-widest">
              Achievements
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {BADGES.map((badge) => {
                const earned = badge.condition(files);
                const Icon   = badge.icon;
                return (
                  <NeonCard
                    key={badge.id}
                    className={`p-4 text-center ${earned ? '' : 'opacity-20 grayscale'}`}
                    glow={earned ? (badge.color.replace('neon-', '') as any) : 'none'}
                  >
                    <div className={`inline-flex p-2 rounded-full mb-2 ${earned
                      ? `bg-${badge.color}/10 border border-${badge.color}/25`
                      : 'bg-white/5 border border-white/8'}`}
                    >
                      <Icon size={16} className={earned ? `text-${badge.color}` : 'text-gray-700'} />
                    </div>
                    <p className={`font-mono text-[10px] font-semibold ${earned ? 'text-gray-300' : 'text-gray-700'}`}>
                      {badge.label}
                    </p>
                  </NeonCard>
                );
              })}
            </div>
          </div>
        )}

        {/* ── INFTs (on-chain — visible for everyone) ── */}
        <div className="mb-6">
          <p className="font-mono text-xs font-semibold text-gray-500 mb-4 uppercase tracking-widest">
            Intelligent NFTs · On-Chain Portfolio
          </p>
          {loadingInfts ? (
            <NeonCard className="p-8 text-center" glow="none">
              <Loader2 size={18} className="mx-auto text-gray-600 animate-spin" />
            </NeonCard>
          ) : infts.length === 0 ? (
            <NeonCard className="p-8 text-center" glow="none">
              <Star size={24} className="mx-auto mb-3 text-gray-800" />
              <p className="font-mono text-gray-700 text-sm">No INFTs minted yet</p>
              {isOwnProfile && (
                <a
                  href="/mint"
                  className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-lg font-mono text-xs
                    bg-gradient-to-r from-neon-purple to-neon-cyan text-bg-primary font-bold"
                >
                  Mint Your First INFT
                </a>
              )}
            </NeonCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {infts.map((inft) => (
                <INFTCard
                  key={inft.tokenId}
                  inft={inft}
                  href={`/marketplace/${inft.tokenId}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Portfolio (own profile only — others' files are not accessible client-side) ── */}
        {isOwnProfile && (
          <div>
            <p className="font-mono text-xs font-semibold text-gray-500 mb-4 uppercase tracking-widest">
              Portfolio ({files.length})
            </p>
            {files.length === 0 ? (
              <NeonCard className="p-10 text-center" glow="none">
                <Upload size={24} className="mx-auto mb-3 text-gray-800" />
                <p className="text-gray-700 font-mono text-sm">No portfolio items yet</p>
              </NeonCard>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {files.map((file) => <PortfolioCard key={file.id} file={file} />)}
              </div>
            )}
          </div>
        )}

        {/* 0G storage attribution */}
        {profile?.profileRootHash && (
          <p className="font-mono text-[9px] text-gray-800 text-center mt-8">
            Profile stored on 0G · {profile.profileRootHash.slice(0, 12)}…{profile.profileRootHash.slice(-8)}
          </p>
        )}
      </div>
    </div>
  );
}
