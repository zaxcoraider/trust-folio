'use client';

import { useState, useRef, useEffect } from 'react';
import { useSwitchChain } from 'wagmi';
import { ChevronDown, CheckCircle } from 'lucide-react';
import { useNetwork } from '@/lib/network-context';
import { NETWORKS, type NetworkKey } from '@/config/networks';

export function NetworkSwitcher() {
  const { activeNetwork, setNetwork } = useNetwork();
  const { switchChain, isPending } = useSwitchChain();

  const [open, setOpen]         = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleNetworkSelect(key: NetworkKey) {
    setOpen(false);
    if (key === activeNetwork) return;

    setSwitching(true);
    try {
      // Ask MetaMask/wallet to switch chain directly — no intermediate dialog.
      await switchChain({ chainId: NETWORKS[key].chainId });
      // network-context auto-syncs from chainId change, but set immediately
      // for instant UI feedback.
      setNetwork(key);
    } catch {
      // User rejected or wallet error — silently ignore, stay on current network.
    } finally {
      setSwitching(false);
    }
  }

  const isLoading = switching || isPending;
  const isMainnet = activeNetwork === 'mainnet';
  const dotColor  = isMainnet ? '#10b981' : '#f59e0b';
  const dotGlow   = isMainnet
    ? '0 0 5px rgba(16,185,129,0.8)'
    : '0 0 5px rgba(245,158,11,0.8)';
  const label      = isMainnet ? '0G Mainnet' : 'Galileo Testnet';
  const borderOpen = isMainnet ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)';
  const bgOpen     = isMainnet ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-mono text-[11px] font-medium transition-all duration-200 border disabled:opacity-60"
        style={{
          background:  open ? bgOpen : 'rgba(255,255,255,0.03)',
          borderColor: open ? borderOpen : 'rgba(255,255,255,0.1)',
        }}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLoading ? 'animate-pulse' : ''}`}
          style={{ background: dotColor, boxShadow: isLoading ? 'none' : dotGlow }}
        />
        <span style={{ color: dotColor }}>
          {isLoading ? 'Switching…' : label}
        </span>
        <ChevronDown
          size={10}
          style={{ color: dotColor }}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-2 w-52 rounded-xl overflow-hidden z-50"
          style={{
            background:    'rgba(10,10,20,0.97)',
            backdropFilter:'blur(20px)',
            border:        '1px solid rgba(168,85,247,0.2)',
            boxShadow:     '0 8px 32px rgba(0,0,0,0.5), 0 0 16px rgba(168,85,247,0.08)',
          }}
        >
          <div className="px-3 py-2 border-b border-white/5">
            <p className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">
              Select Network
            </p>
          </div>

          {(['testnet', 'mainnet'] as NetworkKey[]).map((key) => {
            const net      = NETWORKS[key];
            const isActive = activeNetwork === key;
            const color    = key === 'mainnet' ? '#10b981' : '#f59e0b';
            const activeBg = key === 'mainnet' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)';
            const hoverBg  = key === 'mainnet' ? 'rgba(16,185,129,0.05)' : 'rgba(245,158,11,0.05)';

            return (
              <button
                key={key}
                onClick={() => handleNetworkSelect(key)}
                disabled={isLoading}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 disabled:opacity-50"
                style={{ background: isActive ? activeBg : 'transparent' }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: color,
                    boxShadow:  isActive ? `0 0 6px ${color}cc` : 'none',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs font-medium" style={{ color: isActive ? color : '#9ca3af' }}>
                    {net.name}
                  </p>
                  <p className="font-mono text-[9px] text-gray-600">
                    Chain ID {net.chainId}
                  </p>
                </div>
                {isActive && <CheckCircle size={12} style={{ color, flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
