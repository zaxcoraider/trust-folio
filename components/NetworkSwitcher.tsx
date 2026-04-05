'use client';

import { useState, useRef, useEffect } from 'react';
import { useSwitchChain, useAccount } from 'wagmi';
import { ChevronDown, AlertTriangle, X, CheckCircle } from 'lucide-react';
import { useNetwork } from '@/lib/network-context';
import { NETWORKS, type NetworkKey } from '@/config/networks';

export function NetworkSwitcher() {
  const { activeNetwork, setNetwork } = useNetwork();
  const { isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  const [open, setOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingNetwork, setPendingNetwork] = useState<NetworkKey | null>(null);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleNetworkSelect(key: NetworkKey) {
    setOpen(false);
    if (key === activeNetwork) return;
    if (key === 'mainnet') {
      setPendingNetwork('mainnet');
      setShowWarning(true);
      return;
    }
    doSwitch(key);
  }

  async function doSwitch(key: NetworkKey) {
    setSwitching(true);
    try {
      if (isConnected) {
        await switchChain({ chainId: NETWORKS[key].chainId });
      }
      setNetwork(key);
    } catch {
      // User rejected or wallet error — silently ignore
    } finally {
      setSwitching(false);
      setPendingNetwork(null);
      setShowWarning(false);
    }
  }

  function confirmMainnetSwitch() {
    if (pendingNetwork) doSwitch(pendingNetwork);
  }

  const isLoading = switching || isPending;
  const isMainnet = activeNetwork === 'mainnet';
  const dotColor = isMainnet ? '#10b981' : '#f59e0b';
  const dotGlow = isMainnet
    ? '0 0 5px rgba(16,185,129,0.8)'
    : '0 0 5px rgba(245,158,11,0.8)';
  const label = isMainnet ? '0G Mainnet' : 'Galileo Testnet';
  const borderOpen = isMainnet ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)';
  const bgOpen = isMainnet ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)';

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-mono text-[11px] font-medium transition-all duration-200 border"
          style={{
            background: open ? bgOpen : 'rgba(255,255,255,0.03)',
            borderColor: open ? borderOpen : 'rgba(255,255,255,0.1)',
          }}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLoading ? 'animate-pulse' : ''}`}
            style={{ background: dotColor, boxShadow: isLoading ? 'none' : dotGlow }}
          />
          <span style={{ color: dotColor }}>{label}</span>
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
              background: 'rgba(10,10,20,0.97)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(168,85,247,0.2)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 16px rgba(168,85,247,0.08)',
            }}
          >
            <div className="px-3 py-2 border-b border-white/5">
              <p className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">
                Select Network
              </p>
            </div>

            {(['testnet', 'mainnet'] as NetworkKey[]).map((key) => {
              const net = NETWORKS[key];
              const isActive = activeNetwork === key;
              const green = key === 'mainnet';
              const color = green ? '#10b981' : '#f59e0b';
              const activeBg = green ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)';
              const hoverBg = green ? 'rgba(16,185,129,0.05)' : 'rgba(245,158,11,0.05)';

              return (
                <button
                  key={key}
                  onClick={() => handleNetworkSelect(key)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150"
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
                      boxShadow: isActive ? `0 0 6px ${color}cc` : 'none',
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-mono text-xs font-medium"
                      style={{ color: isActive ? color : '#9ca3af' }}
                    >
                      {net.name}
                    </p>
                    <p className="font-mono text-[9px] text-gray-600">
                      Chain ID {net.chainId}
                    </p>
                  </div>
                  {isActive && (
                    <CheckCircle size={12} style={{ color, flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Mainnet switch warning modal ── */}
      {showWarning && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowWarning(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(10,10,20,0.98)',
              border: '1px solid rgba(16,185,129,0.3)',
              boxShadow: '0 0 40px rgba(16,185,129,0.1), 0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      background: 'rgba(16,185,129,0.1)',
                      border: '1px solid rgba(16,185,129,0.2)',
                    }}
                  >
                    <AlertTriangle size={18} style={{ color: '#10b981' }} />
                  </div>
                  <h3 className="font-mono text-sm font-bold text-white">
                    Switching to Mainnet
                  </h3>
                </div>
                <button
                  onClick={() => setShowWarning(false)}
                  className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="font-mono text-xs text-gray-400 leading-relaxed mb-5">
                You&apos;re switching to{' '}
                <span className="text-emerald-400 font-semibold">0G Mainnet</span>.
                All transactions will use{' '}
                <span className="text-white font-semibold">real 0G tokens</span> and
                cannot be undone. Make sure you have mainnet funds before proceeding.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowWarning(false)}
                  className="flex-1 py-2 rounded-lg font-mono text-xs text-gray-400 border border-white/10 hover:border-white/20 hover:text-gray-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmMainnetSwitch}
                  className="flex-1 py-2 rounded-lg font-mono text-xs font-semibold transition-all"
                  style={{
                    background: 'rgba(16,185,129,0.15)',
                    border: '1px solid rgba(16,185,129,0.4)',
                    color: '#10b981',
                    boxShadow: '0 0 12px rgba(16,185,129,0.15)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'rgba(16,185,129,0.25)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'rgba(16,185,129,0.15)';
                  }}
                >
                  Switch to Mainnet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
