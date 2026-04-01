'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useDisconnect } from 'wagmi';
import { zgTestnet } from '@/lib/wagmi-config';
import { useState, useEffect, useRef } from 'react';
import { Menu, X, Bell, ChevronDown, Copy, ExternalLink, LogOut, Check } from 'lucide-react';
import { getUnreadCount } from '@/lib/notification-store';

const mainLinks = [
  { href: '/',            label: 'Home'        },
  { href: '/dashboard',   label: 'Dashboard'   },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/hire',        label: 'Hire'        },
  { href: '/governance',  label: 'Governance'  },
];

const moreLinks = [
  { href: '/verify',    label: 'AI Verify' },
  { href: '/stake',     label: 'Stake'     },
  { href: '/stats',     label: 'Stats'     },
  { href: '/upload',    label: 'Upload'    },
  { href: '/history',   label: 'History'   },
  { href: '/admin',     label: 'Admin'     },
  { href: '/settings',  label: 'Settings'  },
];

function shortAddr(addr: string) {
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address, chainId: zgTestnet.id });
  const { disconnect } = useDisconnect();
  const [unreadCount, setUnreadCount] = useState(0);
  const moreRef = useRef<HTMLDivElement>(null);
  const walletRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!address) { setUnreadCount(0); return; }
    const update = () => setUnreadCount(getUnreadCount(address));
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, [address]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
      if (walletRef.current && !walletRef.current.contains(e.target as Node)) setWalletOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  function copyAddress() {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const explorerUrl = zgTestnet.blockExplorers?.default?.url;
  const isMoreActive = moreLinks.some(l => pathname === l.href || pathname?.startsWith(l.href + '/'));

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: 'rgba(10,10,15,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(168,85,247,0.3)',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-6">

            {/* ── Logo ── */}
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <div className="relative w-8 h-8">
                <Image
                  src="/logo.png"
                  alt="TrustFolio logo"
                  fill
                  className="object-contain"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.6))' }}
                />
              </div>
              <span className="font-mono text-lg font-bold tracking-tight">
                <span className="text-neon-purple" style={{ textShadow: '0 0 12px rgba(168,85,247,0.6)' }}>Trust</span>
                <span className="text-neon-cyan"   style={{ textShadow: '0 0 12px rgba(6,182,212,0.6)' }}>Folio</span>
              </span>
            </Link>

            {/* ── Desktop Nav ── */}
            <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
              {mainLinks.map((link) => {
                const active = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href + '/'));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative px-3.5 py-2 text-xs font-mono font-medium transition-all duration-200 rounded-md
                      ${active ? 'text-neon-purple' : 'text-gray-400 hover:text-neon-cyan'}`}
                  >
                    {link.label}
                    {active && (
                      <span
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-px"
                        style={{ background: 'rgba(168,85,247,0.9)', boxShadow: '0 0 6px rgba(168,85,247,0.7)' }}
                      />
                    )}
                  </Link>
                );
              })}

              {/* More dropdown */}
              <div className="relative" ref={moreRef}>
                <button
                  onClick={() => setMoreOpen(v => !v)}
                  className={`flex items-center gap-1 px-3.5 py-2 text-xs font-mono font-medium transition-all duration-200 rounded-md
                    ${isMoreActive ? 'text-neon-purple' : 'text-gray-400 hover:text-neon-cyan'}`}
                >
                  More
                  <ChevronDown size={11} className={`transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} />
                </button>
                {moreOpen && (
                  <div
                    className="absolute top-full left-0 mt-2 w-44 rounded-xl overflow-hidden z-50"
                    style={{
                      background: 'rgba(10,10,20,0.96)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(168,85,247,0.25)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 16px rgba(168,85,247,0.08)',
                    }}
                  >
                    {moreLinks.map((link) => {
                      const active = pathname === link.href || pathname?.startsWith(link.href + '/');
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMoreOpen(false)}
                          className={`flex items-center px-4 py-2.5 text-xs font-mono transition-all duration-150 border-l-2
                            ${active
                              ? 'text-neon-purple bg-neon-purple/10 border-neon-purple'
                              : 'text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/5 border-transparent'
                            }`}
                        >
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Mint INFT CTA */}
              <Link
                href="/mint"
                className={`ml-3 px-4 py-1.5 text-xs font-mono font-semibold rounded-md transition-all duration-200
                  ${pathname === '/mint'
                    ? 'text-neon-purple bg-neon-purple/20 border border-neon-purple/60'
                    : 'text-neon-purple border border-neon-purple/40 bg-neon-purple/5 hover:text-neon-pink hover:border-neon-pink/50 hover:bg-neon-pink/8'
                  }`}
                style={{ boxShadow: '0 0 12px rgba(168,85,247,0.2)' }}
              >
                ✦ Mint INFT
              </Link>
            </nav>

            {/* ── Right: Bell + Wallet ── */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">

              {/* Notification Bell */}
              {isConnected && (
                <Link
                  href="/notifications"
                  className="relative p-2 rounded-md text-gray-500 hover:text-neon-purple hover:bg-neon-purple/10 transition-all border border-transparent hover:border-neon-purple/20"
                >
                  <Bell size={17} className={unreadCount > 0 ? 'animate-pulse' : ''} />
                  {unreadCount > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 min-w-[15px] h-3.5 flex items-center justify-center rounded-full bg-neon-pink font-mono text-[8px] font-bold px-1 text-white"
                      style={{ boxShadow: '0 0 6px rgba(236,72,153,0.6)' }}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Wallet: custom when connected, RainbowKit when not */}
              {isConnected && address ? (
                <div className="relative" ref={walletRef}>
                  <button
                    onClick={() => setWalletOpen(v => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md font-mono text-xs transition-all duration-200 border"
                    style={{
                      background: 'rgba(168,85,247,0.07)',
                      borderColor: walletOpen ? 'rgba(168,85,247,0.5)' : 'rgba(168,85,247,0.25)',
                      boxShadow: walletOpen ? '0 0 14px rgba(168,85,247,0.2)' : 'none',
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
                      style={{ boxShadow: '0 0 5px rgba(52,211,153,0.9)' }}
                    />
                    <span className="text-gray-300">{shortAddr(address)}</span>
                    {balance && (
                      <>
                        <span className="text-gray-600">·</span>
                        <span className="text-neon-cyan">{parseFloat(balance.formatted).toFixed(3)} 0G</span>
                      </>
                    )}
                    <ChevronDown size={11} className={`text-gray-500 transition-transform duration-200 ${walletOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {walletOpen && (
                    <div
                      className="absolute top-full right-0 mt-2 w-60 rounded-xl overflow-hidden z-50"
                      style={{
                        background: 'rgba(10,10,20,0.97)',
                        backdropFilter: 'blur(24px)',
                        border: '1px solid rgba(168,85,247,0.25)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 16px rgba(168,85,247,0.1)',
                      }}
                    >
                      {/* Info header */}
                      <div className="px-4 py-3 border-b border-neon-purple/10">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="w-2 h-2 rounded-full bg-emerald-400"
                            style={{ boxShadow: '0 0 5px rgba(52,211,153,0.9)' }}
                          />
                          <span className="font-mono text-[10px] text-emerald-400 tracking-wide">Connected · 0G Testnet</span>
                        </div>
                        <p className="font-mono text-xs text-gray-300 truncate">{address}</p>
                        {balance && (
                          <p className="font-mono text-xs text-neon-cyan mt-1">
                            {parseFloat(balance.formatted).toFixed(6)} 0G
                          </p>
                        )}
                      </div>
                      {/* Actions */}
                      <div className="py-1">
                        <button
                          onClick={copyAddress}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-mono text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/5 transition-all"
                        >
                          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                          {copied ? 'Copied!' : 'Copy Address'}
                        </button>
                        {explorerUrl && (
                          <a
                            href={`${explorerUrl}/address/${address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-mono text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/5 transition-all"
                          >
                            <ExternalLink size={13} />
                            View on Explorer
                          </a>
                        )}
                        <button
                          onClick={() => { disconnect(); setWalletOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-mono text-red-400/80 hover:text-red-400 hover:bg-red-400/5 transition-all border-t border-neon-purple/10 mt-1"
                        >
                          <LogOut size={13} />
                          Disconnect
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <ConnectButton chainStatus="none" accountStatus="address" showBalance={false} />
              )}
            </div>

            {/* ── Mobile toggle ── */}
            <div className="lg:hidden flex items-center gap-1.5">
              {isConnected && (
                <Link href="/notifications" className="relative p-2 text-gray-400 hover:text-neon-purple transition-colors">
                  <Bell size={19} className={unreadCount > 0 ? 'animate-pulse' : ''} />
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[13px] h-3.5 flex items-center justify-center rounded-full bg-neon-pink font-mono text-[8px] font-bold px-0.5 text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              )}
              <button
                onClick={() => setMobileOpen(v => !v)}
                className="p-2 text-gray-400 hover:text-neon-purple transition-colors"
              >
                {mobileOpen ? <X size={21} /> : <Menu size={21} />}
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* ── Mobile backdrop ── */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300
          ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* ── Mobile slide-out panel ── */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-72 lg:hidden flex flex-col transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          background: 'rgba(10,10,18,0.98)',
          backdropFilter: 'blur(24px)',
          borderLeft: '1px solid rgba(168,85,247,0.2)',
        }}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neon-purple/15">
          <span className="font-mono text-sm font-bold">
            <span className="text-neon-purple" style={{ textShadow: '0 0 10px rgba(168,85,247,0.5)' }}>Trust</span>
            <span className="text-neon-cyan"   style={{ textShadow: '0 0 10px rgba(6,182,212,0.5)' }}>Folio</span>
          </span>
          <button onClick={() => setMobileOpen(false)} className="p-1.5 text-gray-400 hover:text-neon-purple transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {mainLinks.map((link) => {
            const active = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href + '/'));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center px-4 py-2.5 rounded-md text-sm font-mono transition-all border
                  ${active
                    ? 'text-neon-purple bg-neon-purple/10 border-neon-purple/30'
                    : 'text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/5 border-transparent'
                  }`}
              >
                {link.label}
                {active && <span className="ml-auto w-1 h-1 rounded-full bg-neon-purple" />}
              </Link>
            );
          })}

          {/* Mint INFT */}
          <Link
            href="/mint"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center px-4 py-2.5 rounded-md text-sm font-mono font-semibold transition-all border mt-1
              ${pathname === '/mint'
                ? 'text-neon-purple bg-neon-purple/20 border-neon-purple/60'
                : 'text-neon-purple border-neon-purple/40 bg-neon-purple/5 hover:text-neon-pink hover:border-neon-pink/50 hover:bg-neon-pink/5'
              }`}
            style={{ boxShadow: '0 0 8px rgba(168,85,247,0.15)' }}
          >
            ✦ Mint INFT
          </Link>

          {/* Divider + More section */}
          <div className="pt-3 pb-1">
            <div className="border-t border-neon-purple/10 pt-3">
              <p className="px-4 pb-1 font-mono text-[10px] text-gray-600 uppercase tracking-widest">More</p>
            </div>
          </div>

          {moreLinks.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center px-4 py-2.5 rounded-md text-sm font-mono transition-all border
                  ${active
                    ? 'text-neon-purple bg-neon-purple/10 border-neon-purple/30'
                    : 'text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/5 border-transparent'
                  }`}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Notifications */}
          <Link
            href="/notifications"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-mono transition-all border
              ${pathname === '/notifications'
                ? 'text-neon-purple bg-neon-purple/10 border-neon-purple/30'
                : 'text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/5 border-transparent'
              }`}
          >
            <Bell size={14} />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-auto min-w-[18px] h-4 flex items-center justify-center rounded-full bg-neon-pink font-mono text-[9px] font-bold px-1 text-white">
                {unreadCount}
              </span>
            )}
          </Link>
        </div>

        {/* Wallet info at bottom */}
        <div className="px-4 py-4 border-t border-neon-purple/15">
          {isConnected && address ? (
            <div className="space-y-2">
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-md border"
                style={{ background: 'rgba(168,85,247,0.05)', borderColor: 'rgba(168,85,247,0.2)' }}
              >
                <span
                  className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"
                  style={{ boxShadow: '0 0 5px rgba(52,211,153,0.9)' }}
                />
                <div className="min-w-0">
                  <p className="font-mono text-xs text-gray-300">{shortAddr(address)}</p>
                  {balance && (
                    <p className="font-mono text-[10px] text-neon-cyan mt-0.5">
                      {parseFloat(balance.formatted).toFixed(4)} 0G
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => { disconnect(); setMobileOpen(false); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md font-mono text-xs text-red-400/80 border border-red-400/20 hover:text-red-400 hover:bg-red-400/5 transition-all"
              >
                <LogOut size={13} />
                Disconnect
              </button>
            </div>
          ) : (
            <ConnectButton chainStatus="none" accountStatus="address" showBalance={false} />
          )}
        </div>
      </div>
    </>
  );
}
