'use client';

import { useState } from 'react';
import { Download, Shield, Trash2, ExternalLink, Clock, HardDrive, CheckCircle2, Loader2 } from 'lucide-react';
import { NeonCard } from './NeonCard';
import { BadgeCard } from './BadgeCard';
import type { PortfolioFile, VerificationTier } from '@/lib/types';
import { TIER_CONFIG, getTier } from '@/lib/types';
import { downloadFileFrom0G } from '@/lib/storage';
import { format } from 'date-fns';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fileEmoji(type: string): string {
  if (type.startsWith('image/')) return '🖼️';
  if (type === 'application/pdf') return '📄';
  if (type.startsWith('text/')) return '📝';
  if (type === 'application/json') return '🔧';
  if (type === 'application/zip') return '📦';
  return '📁';
}

interface PortfolioCardProps {
  file: PortfolioFile;
  onDelete?: (id: string) => void;
  onVerify?: (file: PortfolioFile) => void;
}

export function PortfolioCard({ file, onDelete, onVerify }: PortfolioCardProps) {
  const [downloading, setDownloading]   = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const tier: VerificationTier = file.tier || (file.verificationScore !== undefined ? getTier(file.verificationScore) : 'unverified');
  const cfg = TIER_CONFIG[tier];
  const isVerified = file.verified && file.verificationScore !== undefined;
  const storageExp = process.env.NEXT_PUBLIC_ZERO_G_STORAGE_EXPLORER || 'https://storagescan-galileo.0g.ai';

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const url = await downloadFileFrom0G(file.rootHash);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      setDownloadError('Download failed — file may not be available yet.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <NeonCard
      className="p-5 group"
      glow={isVerified ? (tier === 'gold' || tier === 'diamond' ? 'none' : tier === 'silver' ? 'cyan' : 'purple') : 'purple'}
      style={isVerified ? {
        border: `1px solid ${cfg.border}`,
        boxShadow: `0 0 12px ${cfg.glow}30, 0 4px 16px rgba(0,0,0,0.3)`,
      } as any : undefined}
    >
      {/* Tier badge strip */}
      {isVerified && (
        <div className="flex justify-end mb-3">
          <BadgeCard
            tier={tier}
            score={file.verificationScore!}
            skillCategory={file.skillCategory || 'other'}
            proofRootHash={file.proofRootHash}
            tokenId={file.soulBoundTokenId}
            compact
          />
        </div>
      )}

      {/* File info */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl shrink-0">{fileEmoji(file.type)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-gray-200 font-mono text-sm font-medium truncate" title={file.name}>
            {file.name}
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-gray-500 font-mono text-xs flex items-center gap-1">
              <HardDrive size={10} /> {formatBytes(file.size)}
            </span>
            <span className="text-gray-500 font-mono text-xs flex items-center gap-1">
              <Clock size={10} /> {format(new Date(file.uploadedAt), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
      </div>

      {/* Root hash */}
      <div className="mb-4">
        <p className="text-gray-600 font-mono text-xs mb-1">Root Hash</p>
        <div className="flex items-center gap-2">
          <p className="text-neon-purple/70 font-mono text-xs truncate bg-neon-purple/5 border border-neon-purple/15 rounded px-2 py-1.5 flex-1">
            {file.rootHash}
          </p>
          {/* Link rootHash to storage file viewer */}
          <a href={`${storageExp}/file?hash=${file.rootHash}`} target="_blank" rel="noopener noreferrer"
            className="text-gray-600 hover:text-neon-cyan transition-colors shrink-0">
            <ExternalLink size={14} />
          </a>
        </div>
        {/* Chain TX link if available */}
        {file.txHash && typeof file.txHash === 'string' && (
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-700 font-mono text-xs truncate bg-white/5 rounded px-2 py-1 flex-1">
              tx: {file.txHash.slice(0, 18)}…
            </p>
            <a href={`https://chainscan-galileo.0g.ai/tx/${file.txHash}`} target="_blank" rel="noopener noreferrer"
              className="text-gray-600 hover:text-neon-purple transition-colors shrink-0">
              <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>

      {downloadError && (
        <p className="text-neon-pink font-mono text-xs mb-3">{downloadError}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono
            border border-neon-cyan/25 text-neon-cyan bg-neon-cyan/5
            hover:bg-neon-cyan/15 hover:border-neon-cyan/50 hover:shadow-neon-cyan
            transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          Download
        </button>

        {!isVerified && onVerify && (
          <button onClick={() => onVerify(file)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono
              border border-neon-purple/25 text-neon-purple bg-neon-purple/5
              hover:bg-neon-purple/15 hover:border-neon-purple/50 hover:shadow-neon-subtle transition-all">
            <Shield size={12} /> AI Verify
          </button>
        )}

        {isVerified && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono
            border border-neon-cyan/20 text-neon-cyan/60 bg-neon-cyan/5 cursor-default">
            <CheckCircle2 size={12} /> Verified
          </span>
        )}

        {file.soulBoundTokenId != null && (
          <span className="font-mono text-xs px-2 py-1.5 rounded-lg"
            style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
            #{file.soulBoundTokenId}
          </span>
        )}

        <button onClick={() => onDelete?.(file.id)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono
            border border-transparent text-gray-700
            hover:border-neon-pink/25 hover:text-neon-pink hover:bg-neon-pink/5 transition-all">
          <Trash2 size={12} />
        </button>
      </div>
    </NeonCard>
  );
}
