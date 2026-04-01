'use client';

import { useState, useEffect, useCallback } from 'react';
import { Share2, CheckCircle2, AlertCircle, Download, Copy, ExternalLink, Shield, FileCheck } from 'lucide-react';
import { useAccount, useSignMessage } from 'wagmi';
import { NeonCard } from '@/components/NeonCard';
import type { PortableCredential } from '@/lib/types';

// We read from verification-store and inft-store
type CredentialSource = {
  id: string;
  tokenId?: number;
  fileName: string;
  skillCategory: string;
  score: number;
  tier: string;
  proofRootHash: string;
  fileRootHash: string;
  verifiedAt: number;
  badges: string[];
  contractAddress: string;
};

const TIER_COLORS: Record<string, string> = {
  diamond: 'text-white border-white/30 bg-white/5',
  gold: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
  silver: 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10',
  bronze: 'text-neon-purple border-neon-purple/30 bg-neon-purple/10',
  unverified: 'text-gray-500 border-gray-600/30 bg-gray-600/10',
};

const SUPPORTED_CHAINS = [
  { name: 'Ethereum', logo: '⟠', color: 'text-blue-400' },
  { name: 'Polygon', logo: '⬡', color: 'text-purple-400' },
  { name: 'Arbitrum', logo: '◈', color: 'text-sky-400' },
  { name: 'BNB Chain', logo: '◉', color: 'text-amber-400' },
];

function loadCredentialSources(address: string): CredentialSource[] {
  if (typeof window === 'undefined') return [];
  const sources: CredentialSource[] = [];

  // From verification store
  try {
    const raw = localStorage.getItem('trustfolio_verifications');
    if (raw) {
      const records = JSON.parse(raw) as Array<{
        id: string; walletAddress: string; fileName: string; skillCategory: string;
        score: number; tier: string; proofRootHash: string | null; fileRootHash: string;
        verifiedAt: number; soulBoundTokenId?: number; contractAddress?: string;
      }>;
      records
        .filter((r) => r.walletAddress?.toLowerCase() === address.toLowerCase() && r.proofRootHash)
        .forEach((r) => {
          sources.push({
            id: r.id,
            tokenId: r.soulBoundTokenId,
            fileName: r.fileName,
            skillCategory: r.skillCategory,
            score: r.score,
            tier: r.tier,
            proofRootHash: r.proofRootHash!,
            fileRootHash: r.fileRootHash,
            verifiedAt: r.verifiedAt,
            badges: [r.tier],
            contractAddress: r.contractAddress ?? '0x0000000000000000000000000000000000000000',
          });
        });
    }
  } catch { /* skip */ }

  // From INFT store
  try {
    const raw = localStorage.getItem('trustfolio_infts');
    if (raw) {
      const infts = JSON.parse(raw) as Array<{
        owner: string; tokenId: number; skillCategory: string; score: number; tier: string;
        proofRootHash: string; fileRootHash: string; mintedAt: number; badges: string[]; contractAddress: string;
        metadataURI: string;
      }>;
      infts
        .filter((n) => n.owner?.toLowerCase() === address.toLowerCase())
        .forEach((n) => {
          if (!sources.find((s) => s.proofRootHash === n.proofRootHash)) {
            sources.push({
              id: `inft_${n.tokenId}`,
              tokenId: n.tokenId,
              fileName: `INFT #${n.tokenId}`,
              skillCategory: n.skillCategory,
              score: n.score,
              tier: n.tier,
              proofRootHash: n.proofRootHash,
              fileRootHash: n.fileRootHash,
              verifiedAt: n.mintedAt,
              badges: n.badges ?? [n.tier],
              contractAddress: n.contractAddress,
            });
          }
        });
    }
  } catch { /* skip */ }

  return sources;
}

export default function ExportPage() {
  const { address, isConnected } = useAccount();
  const { signMessage, data: signatureData, isPending: isSigning } = useSignMessage();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sources, setSources] = useState<CredentialSource[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [credential, setCredential] = useState<PortableCredential | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (address) {
      const s = loadCredentialSources(address);
      setSources(s);
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // When signature is ready, build the credential
  useEffect(() => {
    if (signatureData && address && step === 2) {
      const selectedSources = sources.filter((s) => selected.has(s.id));
      const cred: PortableCredential = {
        version: '1.0',
        issuer: 'TrustFolio',
        network: '0G-Galileo-Testnet',
        chainId: 16602,
        walletAddress: address,
        credentials: selectedSources.map((s) => ({
          tokenId: String(s.tokenId ?? s.id),
          skillCategory: s.skillCategory,
          score: s.score,
          tier: s.tier,
          proofRootHash: s.proofRootHash,
          fileRootHash: s.fileRootHash,
          verifiedAt: s.verifiedAt,
          badges: s.badges,
          contractAddress: s.contractAddress,
        })),
        signature: signatureData,
        exportedAt: Math.floor(Date.now() / 1000),
        explorerUrl: `https://explorer.0g.ai/address/${address}`,
      };
      setCredential(cred);
      setStep(3);
    }
  }, [signatureData, address, step, sources, selected]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(sources.map((s) => s.id)));
  };

  const handleSign = () => {
    if (!address || selected.size === 0) return;
    setError(null);
    const selectedSources = sources.filter((s) => selected.has(s.id));
    const message = JSON.stringify({
      action: 'TrustFolio credential export',
      wallet: address,
      credentials: selectedSources.map((s) => s.proofRootHash),
      timestamp: Math.floor(Date.now() / 1000),
    });
    signMessage({ message });
  };

  const handleDownload = () => {
    if (!credential) return;
    const blob = new Blob([JSON.stringify(credential, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trustfolio-credential-${address?.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    if (!credential) return;
    navigator.clipboard.writeText(JSON.stringify(credential, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isConnected) {
    return (
      <div className="relative min-h-screen bg-bg-primary px-4 py-10 page-enter">
        <div className="fixed inset-0 bg-grid opacity-100 pointer-events-none" />
        <div className="relative max-w-2xl mx-auto text-center pt-24">
          <Shield size={40} className="text-gray-600 mx-auto mb-3" />
          <h1 className="font-mono text-xl font-bold text-gray-100 mb-2">Connect Wallet</h1>
          <p className="font-mono text-sm text-gray-500">Connect your wallet to export credentials.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-bg-primary px-4 py-10 page-enter">
      <div className="fixed inset-0 bg-grid opacity-100 pointer-events-none" />

      <div className="relative max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20">
            <Share2 size={22} className="text-neon-cyan" />
          </div>
          <div>
            <h1 className="font-mono text-2xl font-bold text-gray-100">Export Credential</h1>
            <p className="font-mono text-sm text-gray-500">
              Generate a portable, signed credential proof for use on other chains
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {([
            { num: 1, label: 'Select' },
            { num: 2, label: 'Sign' },
            { num: 3, label: 'Download' },
          ] as const).map((s, i) => (
            <>
              <div
                key={s.num}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs transition-all
                  ${step >= s.num
                    ? 'text-neon-cyan border-neon-cyan/40 bg-neon-cyan/10'
                    : 'text-gray-600 border-gray-700/40 bg-gray-700/10'
                  }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step > s.num ? 'bg-neon-cyan text-black' : step === s.num ? 'bg-neon-cyan/20 text-neon-cyan' : 'bg-gray-700/50 text-gray-600'}`}>
                  {step > s.num ? '✓' : s.num}
                </span>
                {s.label}
              </div>
              {i < 2 && <div className={`flex-1 h-px ${step > s.num ? 'bg-neon-cyan/40' : 'bg-white/5'}`} />}
            </>
          ))}
        </div>

        {/* Step 1: Select credentials */}
        {step === 1 && (
          <NeonCard glow="cyan" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-mono text-sm font-semibold text-gray-300">Select Credentials to Export</h2>
              <button
                onClick={selectAll}
                className="font-mono text-xs text-neon-purple hover:underline"
              >
                Select All
              </button>
            </div>

            {sources.length === 0 ? (
              <div className="text-center py-8">
                <FileCheck size={36} className="text-gray-600 mx-auto mb-3" />
                <p className="font-mono text-sm text-gray-500 mb-2">No verified credentials found.</p>
                <a href="/verify" className="font-mono text-xs text-neon-purple hover:underline">
                  Get your first verification →
                </a>
              </div>
            ) : (
              <div className="space-y-2 mb-5">
                {sources.map((src) => (
                  <label
                    key={src.id}
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all
                      ${selected.has(src.id)
                        ? 'border-neon-cyan/40 bg-neon-cyan/5'
                        : 'border-white/5 bg-white/2 hover:bg-white/5'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(src.id)}
                      onChange={() => toggleSelect(src.id)}
                      className="accent-neon-cyan"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-mono text-sm text-gray-200 truncate">{src.fileName}</p>
                        <span className={`font-mono text-xs px-1.5 py-0.5 rounded border ${TIER_COLORS[src.tier] ?? TIER_COLORS.unverified}`}>
                          {src.tier}
                        </span>
                      </div>
                      <div className="flex gap-3 font-mono text-xs text-gray-500">
                        <span>{src.skillCategory}</span>
                        <span>Score: {src.score}</span>
                        <span>{new Date(src.verifiedAt * 1000).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {selected.has(src.id) && <CheckCircle2 size={16} className="text-neon-cyan shrink-0" />}
                  </label>
                ))}
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={selected.size === 0}
              className="w-full font-mono text-sm py-3 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            >
              Continue with {selected.size} credential{selected.size !== 1 ? 's' : ''} →
            </button>
          </NeonCard>
        )}

        {/* Step 2: Sign */}
        {step === 2 && (
          <NeonCard glow="purple" className="p-6">
            <h2 className="font-mono text-sm font-semibold text-gray-300 mb-4">Sign & Generate Proof</h2>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-neon-pink/10 border border-neon-pink/30 flex items-center gap-2">
                <AlertCircle size={14} className="text-neon-pink" />
                <p className="font-mono text-xs text-neon-pink">{error}</p>
              </div>
            )}

            {/* Summary */}
            <div className="mb-5 p-4 rounded-lg bg-white/3 border border-white/5">
              <p className="font-mono text-xs text-gray-500 mb-2">Selected credentials:</p>
              {sources.filter((s) => selected.has(s.id)).map((s) => (
                <div key={s.id} className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
                  <CheckCircle2 size={13} className="text-neon-cyan" />
                  <span className="font-mono text-xs text-gray-300">{s.fileName}</span>
                  <span className={`ml-auto font-mono text-xs px-1.5 py-0.5 rounded border ${TIER_COLORS[s.tier] ?? TIER_COLORS.unverified}`}>
                    {s.tier}
                  </span>
                </div>
              ))}
            </div>

            <p className="font-mono text-xs text-gray-400 mb-5">
              Your wallet will sign a message containing the selected credential hashes.
              This signature acts as cryptographic proof that you own these credentials.
              No gas is required.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="font-mono text-sm px-4 py-3 rounded-lg border border-white/10 text-gray-500 hover:text-gray-300 transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleSign}
                disabled={isSigning}
                className="flex-1 font-mono text-sm py-3 rounded-lg border border-neon-purple/40 bg-neon-purple/10 text-neon-purple hover:bg-neon-purple/20 disabled:opacity-40 transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isSigning ? (
                  <><div className="w-4 h-4 border-2 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" /> Waiting for signature...</>
                ) : (
                  <><Shield size={16} /> Sign & Generate Proof</>
                )}
              </button>
            </div>
          </NeonCard>
        )}

        {/* Step 3: Download */}
        {step === 3 && credential && (
          <div className="space-y-5">
            <NeonCard glow="cyan" className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={18} className="text-neon-cyan" />
                <h2 className="font-mono text-sm font-semibold text-neon-cyan">Credential Ready</h2>
              </div>

              {/* JSON preview */}
              <div className="relative group mb-5">
                <pre className="bg-[#0a0a14] border border-white/10 rounded-lg p-4 overflow-auto max-h-48 font-mono text-xs text-gray-400">
                  {JSON.stringify(credential, null, 2)}
                </pre>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 font-mono text-sm px-4 py-2.5 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 transition-all"
                >
                  <Download size={15} />
                  Download JSON
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 font-mono text-sm px-4 py-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-neon-cyan hover:border-neon-cyan/30 transition-all"
                >
                  {copied ? <CheckCircle2 size={15} className="text-neon-cyan" /> : <Copy size={15} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </NeonCard>

            {/* QR placeholder */}
            <NeonCard glow="none" className="p-5">
              <h3 className="font-mono text-sm font-semibold text-gray-300 mb-4">Credential QR Code</h3>
              <div className="flex items-center justify-center p-6 rounded-lg border border-neon-purple/30 bg-neon-purple/5">
                <div className="w-40 h-40 border-2 border-neon-purple/40 rounded-lg flex items-center justify-center">
                  <div className="grid grid-cols-8 gap-0.5 opacity-40">
                    {Array.from({ length: 64 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-sm"
                        style={{ background: Math.random() > 0.4 ? '#a855f7' : 'transparent' }}
                      />
                    ))}
                  </div>
                </div>
                <p className="font-mono text-xs text-gray-600 ml-4">QR code generation<br/>coming soon</p>
              </div>
            </NeonCard>

            {/* Supported chains */}
            <NeonCard glow="none" className="p-5">
              <h3 className="font-mono text-sm font-semibold text-gray-300 mb-3">Supported Chains</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SUPPORTED_CHAINS.map((chain) => (
                  <div key={chain.name} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/3 border border-white/5">
                    <span className={`text-lg ${chain.color}`}>{chain.logo}</span>
                    <span className="font-mono text-xs text-gray-400">{chain.name}</span>
                  </div>
                ))}
              </div>
            </NeonCard>

            {/* Explorer link */}
            <div className="flex items-center justify-center">
              <a
                href={credential.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 font-mono text-sm text-neon-purple hover:text-neon-cyan transition-colors"
              >
                <ExternalLink size={14} />
                Verify on 0G Explorer
              </a>
            </div>

            {/* Start over */}
            <button
              onClick={() => { setStep(1); setSelected(new Set()); setCredential(null); }}
              className="w-full font-mono text-xs text-gray-500 hover:text-gray-300 transition-colors py-2"
            >
              Export another credential
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
