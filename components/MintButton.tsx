'use client';

import { useState } from 'react';
import { Zap, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { useWalletClient } from 'wagmi';
import { ethers } from 'ethers';
import type { VerificationTier, SkillCategory, VerificationBreakdown } from '@/lib/types';
import { TIER_CONFIG } from '@/lib/types';
import { SOULBOUND_ABI } from '@/lib/contract-abi';
import { walletClientToSigner } from '@/lib/wallet-to-signer';
import { useNetwork } from '@/lib/network-context';

interface MintButtonProps {
  walletAddress:   string;
  fileRootHash:    string;
  proofRootHash:   string | null;
  score:           number;
  tier:            VerificationTier;
  skillCategory:   SkillCategory;
  breakdown:       VerificationBreakdown;
  onMinted?:       (tokenId: number, txHash: string) => void;
  alreadyMinted?:  boolean;
  tokenId?:        number | null;
}

// Build on-chain SVG metadata URI (runs in browser)
function buildMetadataURI(
  tier: VerificationTier,
  score: number,
  skillCategory: SkillCategory,
  breakdown: VerificationBreakdown,
  proofRootHash: string | null,
): string {
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const colors: Record<string, { accent: string }> = {
    diamond:    { accent: '#e2e8f0' },
    gold:       { accent: '#f59e0b' },
    silver:     { accent: '#06b6d4' },
    bronze:     { accent: '#a855f7' },
    unverified: { accent: '#4b5563' },
  };
  const c = colors[tier] ?? colors.silver;
  const emoji = tier === 'diamond' ? '💎' : tier === 'gold' ? '🥇' : tier === 'silver' ? '🥈' : tier === 'bronze' ? '🥉' : '⬜';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><defs><radialGradient id="bg" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="${c.accent}" stop-opacity="0.15"/><stop offset="100%" stop-color="#0a0a0f"/></radialGradient><filter id="glow"><feGaussianBlur stdDeviation="4" result="blur"/><feComposite in="SourceGraphic" in2="blur" operator="over"/></filter></defs><rect width="400" height="400" fill="#0a0a0f"/><rect width="400" height="400" fill="url(#bg)"/><rect x="10" y="10" width="380" height="380" rx="16" fill="none" stroke="${c.accent}" stroke-width="2" stroke-opacity="0.4"/><text x="200" y="120" font-family="monospace" font-size="64" text-anchor="middle" fill="${c.accent}" filter="url(#glow)">${emoji}</text><text x="200" y="200" font-family="monospace" font-size="72" font-weight="bold" text-anchor="middle" fill="${c.accent}" filter="url(#glow)">${score}</text><text x="200" y="235" font-family="monospace" font-size="16" text-anchor="middle" fill="${c.accent}" opacity="0.6">/100</text><text x="200" y="280" font-family="monospace" font-size="20" font-weight="bold" text-anchor="middle" fill="${c.accent}">${tierLabel.toUpperCase()} CREDENTIAL</text><text x="200" y="310" font-family="monospace" font-size="12" text-anchor="middle" fill="${c.accent}" opacity="0.5">TrustFolio · 0G Chain</text><text x="200" y="370" font-family="monospace" font-size="10" text-anchor="middle" fill="${c.accent}" opacity="0.3">Soulbound · ERC-5192</text></svg>`;

  const meta = JSON.stringify({
    name:        `TrustFolio ${tierLabel} Credential`,
    description: `A soul-bound credential issued by TrustFolio on 0G Chain. Score: ${score}/100.`,
    image:       `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`,
    attributes: [
      { trait_type: 'Tier',         value: tierLabel },
      { trait_type: 'Score',        value: score },
      { trait_type: 'Skill',        value: skillCategory },
      { trait_type: 'Originality',  value: breakdown.originality },
      { trait_type: 'Quality',      value: breakdown.quality },
      { trait_type: 'Complexity',   value: breakdown.complexity },
      { trait_type: 'Authenticity', value: breakdown.authenticity },
      { trait_type: 'Network',      value: networkConfig.name },
      { trait_type: 'Proof Hash',   value: proofRootHash || 'N/A' },
    ],
    external_url: 'https://trustfolio.app',
  });

  return `data:application/json;base64,${btoa(meta)}`;
}

type MintStatus = 'idle' | 'minting' | 'confirmed' | 'error';

export function MintButton({
  walletAddress, fileRootHash, proofRootHash, score, tier, skillCategory,
  breakdown, onMinted, alreadyMinted = false, tokenId,
}: MintButtonProps) {
  const [status,   setStatus]   = useState<MintStatus>('idle');
  const [txHash,   setTxHash]   = useState<string | null>(null);
  const [errMsg,   setErrMsg]   = useState<string | null>(null);
  const { networkConfig } = useNetwork();
  const { data: walletClient } = useWalletClient();
  const cfg = TIER_CONFIG[tier];

  const contractAddress =
    networkConfig.contracts.soulbound ||
    process.env.NEXT_PUBLIC_CREDENTIAL_CONTRACT ||
    '';

  const explorerUrl = txHash ? `${networkConfig.explorer}/tx/${txHash}` : null;

  const handleMint = async () => {
    if (score < 50 || !contractAddress || !walletClient) return;
    setStatus('minting');
    setErrMsg(null);
    setTxHash(null);

    try {
      // Short on-chain URI — keeps calldata small and gas cheap
      const onChainURI = proofRootHash
        ? `0g://${proofRootHash}`
        : `trustfolio:${tier}:${score}`;

      // Unique fileRootHash fallback if 0G upload didn't happen
      const safeFileHash = fileRootHash || `local_${walletAddress.toLowerCase()}_${Date.now()}`;

      const signer   = await walletClientToSigner(walletClient);
      const contract = new ethers.Contract(contractAddress, SOULBOUND_ABI as unknown as string[], signer);

      const tx = await contract.mintCredential(
        walletAddress,
        skillCategory,
        score,
        breakdown.originality,
        breakdown.quality,
        breakdown.complexity,
        breakdown.authenticity,
        proofRootHash  || '',
        safeFileHash,
        onChainURI,
      );

      const receipt = await tx.wait();

      // Parse tokenId from CredentialMinted event
      let mintedId = 0;
      const iface = new ethers.Interface(SOULBOUND_ABI as unknown as string[]);
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
          if (parsed?.name === 'CredentialMinted') { mintedId = Number(parsed.args[0]); break; }
        } catch { /* skip */ }
      }

      setTxHash(tx.hash);
      setStatus('confirmed');
      onMinted?.(mintedId, tx.hash);
    } catch (err: unknown) {
      const e = err as { reason?: string; shortMessage?: string; message?: string };
      const msg = e.reason || e.shortMessage || e.message || 'Minting failed';
      setErrMsg(msg.includes('user rejected') || msg.includes('ACTION_REJECTED')
        ? 'Transaction cancelled'
        : msg);
      setStatus('error');
    }
  };

  if (score < 50) {
    return (
      <p className="text-gray-700 font-mono text-xs text-center">
        Score must be ≥ 50 to mint a credential
      </p>
    );
  }

  if (!contractAddress) {
    return (
      <p className="text-amber-400/70 font-mono text-xs text-center">
        Soul-bound contract not configured — set NEXT_PUBLIC_CREDENTIAL_CONTRACT in .env
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

  if (status === 'confirmed') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-sm"
          style={{ color: cfg.color, border: `1px solid ${cfg.border}`, background: cfg.bg, boxShadow: `0 0 12px ${cfg.glow}` }}>
          <CheckCircle2 size={16} />
          Soul-bound Token Minted!
        </div>
        {explorerUrl && (
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg font-mono text-xs"
            style={{ color: cfg.color, opacity: 0.7 }}>
            <ExternalLink size={12} />
            View on 0G Explorer
          </a>
        )}
        <button onClick={() => setStatus('idle')}
          className="w-full py-1.5 font-mono text-xs text-gray-500 hover:text-gray-300 transition-colors">
          ← Back
        </button>
      </div>
    );
  }

  const isLoading = status === 'minting';

  return (
    <div className="space-y-3">
      <button
        onClick={handleMint}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-mono text-sm font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
        style={{
          color:      '#0a0a0f',
          background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)`,
          boxShadow:  `0 0 20px ${cfg.glow}, 0 4px 16px rgba(0,0,0,0.4)`,
        }}
      >
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
        {isLoading ? 'Minting…' : `Claim ${cfg.label} Credential`}
      </button>

      {status === 'error' && errMsg && (
        <div className="text-xs font-mono text-red-400 text-center px-2">{errMsg}</div>
      )}

      {status === 'error' && (
        <button onClick={() => { setStatus('idle'); setErrMsg(null); }}
          className="w-full py-1.5 font-mono text-xs text-gray-500 hover:text-gray-300 transition-colors">
          ← Try again
        </button>
      )}

      <p className="text-gray-700 font-mono text-xs text-center">
        Platform-signed · Soul-bound ERC-5192 · {networkConfig.shortName}
      </p>
    </div>
  );
}
