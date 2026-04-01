'use client';

import { useState } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { NeonCard } from '@/components/NeonCard';
import { VerificationPanel } from '@/components/VerificationPanel';
import { useAccount } from 'wagmi';
import { Upload, Info, ExternalLink, Shield } from 'lucide-react';
import type { PortfolioFile } from '@/lib/types';

export default function UploadPage() {
  const { address, isConnected } = useAccount();
  const [uploadedFile, setUploadedFile] = useState<PortfolioFile | null>(null);

  return (
    <div className="relative min-h-screen bg-bg-primary px-4 py-10 page-enter">
      <div className="fixed inset-0 bg-grid opacity-100 pointer-events-none" />

      <div className="relative mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <Upload size={24} className="text-neon-purple" />
            <h1 className="font-mono text-2xl font-bold text-gray-100">Upload Portfolio</h1>
          </div>
          <p className="text-gray-500 font-mono text-sm">
            Upload files to 0G decentralized storage. Get a permanent Merkle root hash as proof.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main upload area */}
          <div className="lg:col-span-2 space-y-6">
            <FileUploader onUploaded={setUploadedFile} />

            {/* Info card */}
            <NeonCard className="p-5" glow="none">
              <div className="flex gap-3">
                <Info size={16} className="text-gray-600 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-gray-500 font-mono text-xs leading-relaxed">
                    Files are uploaded to 0G Storage Network via Indexer RPC. You&apos;ll pay a small gas fee in 0G tokens.
                    The root hash is a Merkle tree proof of your file — save it to retrieve the file later.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <a
                      href="https://faucet.0g.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-mono text-xs text-neon-cyan hover:text-neon-cyan/80 transition-colors"
                    >
                      <ExternalLink size={11} />
                      Get 0G testnet tokens
                    </a>
                    <a
                      href="https://storagescan-galileo.0g.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-mono text-xs text-neon-purple hover:text-neon-purple/80 transition-colors"
                    >
                      <ExternalLink size={11} />
                      Storage Explorer
                    </a>
                  </div>
                </div>
              </div>
            </NeonCard>

            {/* Supported formats */}
            <NeonCard className="p-5" glow="none">
              <p className="font-mono text-xs text-gray-500 mb-3">Supported File Types</p>
              <div className="flex flex-wrap gap-2">
                {['PDF', 'PNG/JPG/GIF', 'SVG', 'TXT/MD', 'HTML/CSS/JS', 'TS/TSX', 'PY/GO/RS', 'SOL', 'JSON', 'DOCX', 'ZIP'].map((fmt) => (
                  <span key={fmt} className="px-2 py-1 rounded font-mono text-xs bg-white/5 border border-white/10 text-gray-500">
                    {fmt}
                  </span>
                ))}
              </div>
            </NeonCard>
          </div>

          {/* Sidebar: AI Verify after upload */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={16} className="text-neon-purple" />
              <span className="font-mono text-sm font-medium text-gray-300">AI Verification</span>
            </div>
            <VerificationPanel
              file={uploadedFile || undefined}
              walletAddress={address}
              onComplete={setUploadedFile}
            />
            {!uploadedFile && (
              <NeonCard className="p-4 text-center" glow="none">
                <p className="text-gray-700 font-mono text-xs">Upload a file first to run AI verification</p>
              </NeonCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
