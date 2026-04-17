'use client';

import { useState, useEffect } from 'react';
import { getCachedAvatarDataUrl, setCachedAvatarDataUrl, loadAvatarFrom0G } from '@/lib/profile-store';
import { useNetwork } from '@/lib/network-context';

interface ProfileAvatarProps {
  address:         string;
  avatarHash?:     string;
  /** Pre-loaded data URL (e.g. local preview before 0G upload) */
  previewDataUrl?: string;
  size?:           number;
  className?:      string;
  onClick?:        () => void;
  showGlow?:       boolean;
}

// Deterministic gradient from wallet address
const GRADIENTS = [
  ['#a855f7', '#06b6d4'],  // purple → cyan
  ['#06b6d4', '#ec4899'],  // cyan   → pink
  ['#ec4899', '#a855f7'],  // pink   → purple
  ['#a855f7', '#f59e0b'],  // purple → amber
  ['#22c55e', '#06b6d4'],  // green  → cyan
];

function getGradient(address: string) {
  const idx = address ? parseInt(address.slice(2, 4), 16) % GRADIENTS.length : 0;
  return GRADIENTS[idx];
}

export function ProfileAvatar({
  address,
  avatarHash,
  previewDataUrl,
  size     = 40,
  className = '',
  onClick,
  showGlow  = false,
}: ProfileAvatarProps) {
  const { networkConfig } = useNetwork();
  const [imgUrl, setImgUrl] = useState<string | null>(previewDataUrl ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (previewDataUrl) { setImgUrl(previewDataUrl); return; }
    if (!avatarHash)    { setImgUrl(null); return; }

    // Check localStorage cache first
    const cached = getCachedAvatarDataUrl(avatarHash);
    if (cached) { setImgUrl(cached); return; }

    // Load from 0G Storage using the correct network indexer
    setLoading(true);
    loadAvatarFrom0G(avatarHash, { indexerUrl: networkConfig.storageIndexer })
      .then((dataUrl) => {
        if (dataUrl) {
          setCachedAvatarDataUrl(avatarHash, dataUrl);
          setImgUrl(dataUrl);
        }
      })
      .finally(() => setLoading(false));
  }, [avatarHash, previewDataUrl]);

  const initials  = address ? address.slice(2, 4).toUpperCase() : '??';
  const [c1, c2]  = getGradient(address ?? '0x00');
  const glowColor = 'rgba(168,85,247,0.5)';

  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 cursor-pointer select-none ${className}`}
      style={{
        width:     size,
        height:    size,
        boxShadow: showGlow ? `0 0 16px ${glowColor}, 0 0 32px rgba(168,85,247,0.2)` : undefined,
      }}
      onClick={onClick}
    >
      {imgUrl ? (
        <img
          src={imgUrl}
          alt="Profile avatar"
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
        >
          {loading ? (
            <div
              className="rounded-full border-2 border-white/40 border-t-white animate-spin"
              style={{ width: size * 0.35, height: size * 0.35 }}
            />
          ) : (
            <span
              style={{
                fontSize:   size * 0.32,
                fontFamily: 'monospace',
                fontWeight: 'bold',
                color:      'white',
                lineHeight: 1,
                letterSpacing: '0.02em',
              }}
            >
              {initials}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
