'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import {
  Shield, Upload, Zap, Globe, Lock, TrendingUp,
  ArrowRight, CheckCircle2, Database, Cpu
} from 'lucide-react';
import { NeonCard } from '@/components/NeonCard';

const features = [
  {
    icon: Upload,
    title: 'Decentralized Storage',
    description: 'Upload portfolios to 0G permanent storage. Your files live on-chain forever with verifiable root hashes.',
    color: 'neon-purple',
    glow: 'purple' as const,
  },
  {
    icon: Zap,
    title: 'AI Verification',
    description: 'Get quality scores powered by 0G Compute — completeness, clarity, professionalism, and more.',
    color: 'neon-cyan',
    glow: 'cyan' as const,
  },
  {
    icon: Shield,
    title: 'Trust Layer',
    description: 'Every file gets a Merkle root hash — a cryptographic proof that your portfolio is authentic and unmodified.',
    color: 'neon-pink',
    glow: 'pink' as const,
  },
  {
    icon: Globe,
    title: 'Always Accessible',
    description: 'Download your portfolio anywhere using just the root hash. No central server, no downtime.',
    color: 'neon-purple',
    glow: 'purple' as const,
  },
  {
    icon: Lock,
    title: 'Wallet-Gated Identity',
    description: 'Your identity is your wallet. Connect once, own your portfolio data across the decentralized web.',
    color: 'neon-cyan',
    glow: 'cyan' as const,
  },
  {
    icon: TrendingUp,
    title: 'Verification Badges',
    description: 'Earn trust badges as you upload and verify more work. Show the world your portfolio is legit.',
    color: 'neon-pink',
    glow: 'pink' as const,
  },
];

const stats = [
  { label: 'Storage Cost', value: '~0.01 0G', sub: 'per file upload' },
  { label: 'AI Models', value: '2+', sub: 'on 0G Compute' },
  { label: 'Network', value: '0G Galileo', sub: 'Testnet' },
  { label: 'File Types', value: '20+', sub: 'supported formats' },
];

export default function LandingPage() {
  const { isConnected } = useAccount();

  return (
    <div className="relative overflow-hidden">
      {/* Background grid */}
      <div className="fixed inset-0 bg-grid opacity-100 pointer-events-none" />

      {/* Hero radial glow */}
      <div className="fixed inset-0 bg-hero-gradient pointer-events-none" />

      {/* Hero Section */}
      <section className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-24 text-center">
        {/* Floating badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neon-purple/30 bg-neon-purple/10 mb-8 animate-float">
          <Database size={14} className="text-neon-purple" />
          <span className="font-mono text-xs text-neon-purple">Powered by 0G Decentralized Storage</span>
        </div>

        {/* Headline */}
        <h1 className="font-mono text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
          <span className="text-glow-purple text-neon-purple animate-neon-pulse block">TrustFolio</span>
          <span className="text-2xl sm:text-3xl md:text-4xl text-gray-300 font-normal block mt-2">
            Verified portfolios,{' '}
            <span className="gradient-text font-semibold">trusted everywhere</span>
          </span>
        </h1>

        <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-light">
          Upload your work to permanent decentralized storage on 0G. Get AI-powered quality scores.
          Share a root hash that proves your portfolio is real, unmodified, and yours.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {!isConnected ? (
            <div className="flex flex-col items-center gap-3">
              <ConnectButton label="Connect Wallet to Start" />
              <p className="text-gray-600 font-mono text-xs">MetaMask · WalletConnect · Coinbase · Trust · OKX · Rainbow</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/upload"
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-mono text-sm font-semibold
                  bg-gradient-to-r from-neon-purple to-neon-cyan text-white
                  shadow-neon-purple hover:shadow-neon-cyan
                  transition-all duration-300 hover:scale-105 active:scale-95"
              >
                <Upload size={16} />
                Upload Portfolio
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-mono text-sm
                  border border-neon-purple/30 text-neon-purple
                  hover:bg-neon-purple/10 hover:border-neon-purple/60
                  transition-all duration-300"
              >
                View Dashboard
              </Link>
            </div>
          )}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-px h-12 bg-gradient-to-b from-neon-purple/50 to-transparent mx-auto" />
        </div>
      </section>

      {/* Stats */}
      <section className="relative py-12 border-y border-neon-purple/10">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center py-4">
                <p className="font-mono text-2xl font-bold text-neon-cyan text-glow-cyan">{stat.value}</p>
                <p className="font-mono text-xs text-gray-500 mt-1">{stat.label}</p>
                <p className="font-mono text-xs text-gray-700">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative py-20 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="font-mono text-3xl sm:text-4xl font-bold mb-4">
              <span className="gradient-text">Why TrustFolio?</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Everything you need to make your work verifiable, permanent, and trusted.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <NeonCard key={feature.title} className="p-6" glow={feature.glow}>
                  <div className={`inline-flex p-2.5 rounded-lg bg-${feature.color}/10 border border-${feature.color}/20 mb-4`}>
                    <Icon size={22} className={`text-${feature.color}`} />
                  </div>
                  <h3 className="font-mono text-base font-semibold text-gray-200 mb-2">{feature.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
                </NeonCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative py-20 px-4 border-t border-neon-purple/10">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <h2 className="font-mono text-3xl font-bold gradient-text mb-4">How It Works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', icon: Shield, title: 'Connect Wallet', desc: 'Connect MetaMask, Trust, OKX, Coinbase, or any wallet. Auto-switches to 0G testnet.', color: 'neon-purple' },
              { step: '02', icon: Upload, title: 'Upload Files', desc: 'Drop PDFs, images, code, or docs. Files are stored on 0G with a permanent Merkle root hash.', color: 'neon-cyan' },
              { step: '03', icon: Cpu, title: 'Get Verified', desc: '0G Compute AI analyzes your portfolio and gives a trust score with detailed breakdown.', color: 'neon-pink' },
            ].map(({ step, icon: Icon, title, desc, color }) => (
              <NeonCard key={step} className="p-6 text-center" glow={color.replace('neon-', '') as any}>
                <div className={`font-mono text-xs text-${color}/50 mb-3`}>{step}</div>
                <div className={`inline-flex p-3 rounded-full bg-${color}/10 border border-${color}/20 mb-4`}>
                  <Icon size={24} className={`text-${color}`} />
                </div>
                <h3 className="font-mono text-sm font-semibold text-gray-200 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </NeonCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 px-4 border-t border-neon-purple/10">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neon-cyan/30 bg-neon-cyan/10 mb-6">
            <CheckCircle2 size={14} className="text-neon-cyan" />
            <span className="font-mono text-xs text-neon-cyan">Free on testnet — get 0G tokens at faucet.0g.ai</span>
          </div>
          <h2 className="font-mono text-3xl sm:text-4xl font-bold mb-4">
            Ready to trust your portfolio?
          </h2>
          <p className="text-gray-500 mb-8">
            Join TrustFolio and make your work verifiable on the blockchain.
          </p>
          {!isConnected ? (
            <ConnectButton label="Get Started Free" />
          ) : (
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-mono text-base font-semibold
                bg-gradient-to-r from-neon-purple via-neon-pink to-neon-cyan text-white
                shadow-neon-purple hover:shadow-neon-cyan
                transition-all duration-300 hover:scale-105 active:scale-95"
            >
              Start Uploading
              <ArrowRight size={18} />
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neon-purple/10 py-8 px-4">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="font-mono text-xs text-gray-700">
              © 2026 TrustFolio · Built on{' '}
              <a href="https://0g.ai" target="_blank" rel="noopener noreferrer" className="text-neon-purple/50 hover:text-neon-purple transition-colors">
                0G Network
              </a>
            </p>
            <a href="https://x.com/zax_raider" target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-neon-cyan transition-colors" aria-label="X (Twitter)">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://faucet.0g.ai" target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-gray-700 hover:text-neon-cyan transition-colors">Faucet</a>
            <a href="https://docs.0g.ai" target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-gray-700 hover:text-neon-cyan transition-colors">0G Docs</a>
            <a href="https://storagescan-galileo.0g.ai" target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-gray-700 hover:text-neon-cyan transition-colors">Storage Explorer</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
