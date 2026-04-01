'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Zap, Shield, AlertCircle, ChevronDown } from 'lucide-react';
import { NeonCard } from '@/components/NeonCard';
import { VerificationPanel } from '@/components/VerificationPanel';
import { getPortfolioFiles } from '@/lib/portfolio-store';
import type { PortfolioFile } from '@/lib/types';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function VerifyPage() {
  const { address, isConnected } = useAccount();
  const [selectedFile, setSelectedFile] = useState<PortfolioFile | null>(null);

  const files = address ? getPortfolioFiles(address) : [];

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
        <div className="fixed inset-0 bg-grid pointer-events-none" />
        <NeonCard className="p-10 text-center max-w-sm w-full" glow="purple">
          <Shield size={40} className="mx-auto mb-4 text-neon-purple/40" />
          <p className="text-gray-300 font-mono text-sm mb-6">Connect wallet to use AI Verification</p>
          <ConnectButton />
        </NeonCard>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-bg-primary px-4 py-10 page-enter">
      <div className="fixed inset-0 bg-grid pointer-events-none" />

      <div className="relative mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <Zap size={24} className="text-neon-cyan" />
            <h1 className="font-mono text-2xl font-bold text-gray-100">AI Verification</h1>
          </div>
          <p className="text-gray-500 font-mono text-sm">
            0G Compute analyzes your portfolio files and returns a quality score with detailed breakdown.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* File selector */}
          <div className="space-y-4">
            <h2 className="font-mono text-sm font-semibold text-gray-400">Select File to Verify</h2>

            {files.length === 0 ? (
              <NeonCard className="p-8 text-center" glow="none">
                <AlertCircle size={28} className="mx-auto mb-3 text-gray-700" />
                <p className="text-gray-600 font-mono text-sm">No uploaded files found.</p>
                <p className="text-gray-700 font-mono text-xs mt-1">Upload files first from the Upload page.</p>
              </NeonCard>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200
                      ${selectedFile?.id === file.id
                        ? 'border-neon-purple/50 bg-neon-purple/10 shadow-neon-subtle'
                        : 'border-white/10 bg-bg-card hover:border-neon-purple/25 hover:bg-neon-purple/5'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm text-gray-200 truncate">{file.name}</p>
                        <p className="font-mono text-xs text-gray-600 truncate mt-0.5">{file.rootHash.slice(0, 24)}…</p>
                      </div>
                      <div className="ml-3 flex items-center gap-2 shrink-0">
                        {file.verified ? (
                          <span className="font-mono text-xs text-neon-cyan border border-neon-cyan/25 px-2 py-0.5 rounded">
                            {file.verificationScore}/100
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-gray-700 border border-white/10 px-2 py-0.5 rounded">
                            Unverified
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* How scoring works */}
            <NeonCard className="p-5" glow="none">
              <h3 className="font-mono text-xs font-semibold text-gray-500 mb-3">How Scoring Works</h3>
              <div className="space-y-2">
                {[
                  { label: 'Completeness', desc: 'How thorough and complete the portfolio is' },
                  { label: 'Clarity', desc: 'How clear and well-structured the content is' },
                  { label: 'Professionalism', desc: 'Formatting, presentation quality' },
                  { label: 'Technical Depth', desc: 'Level of technical detail and expertise shown' },
                  { label: 'Originality', desc: 'Uniqueness and creativity indicators' },
                ].map((item) => (
                  <div key={item.label} className="flex gap-3">
                    <span className="text-neon-purple/60 font-mono text-xs shrink-0 w-28">{item.label}</span>
                    <span className="text-gray-700 font-mono text-xs">{item.desc}</span>
                  </div>
                ))}
              </div>
            </NeonCard>
          </div>

          {/* Verification panel */}
          <div>
            <h2 className="font-mono text-sm font-semibold text-gray-400 mb-4">Verification Results</h2>
            <VerificationPanel
              file={selectedFile || undefined}
              walletAddress={address}
              onComplete={(updated) => {
                setSelectedFile(updated);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
