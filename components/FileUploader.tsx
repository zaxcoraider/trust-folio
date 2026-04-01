'use client';

import { useState, useCallback, useRef } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { Upload, File, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { uploadFileTo0G } from '@/lib/storage';
import { walletClientToSigner } from '@/lib/wallet-to-signer';
import { savePortfolioFile } from '@/lib/portfolio-store';
import type { PortfolioFile, UploadProgress } from '@/lib/types';
import { NeonCard } from './NeonCard';

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'text/plain', 'text/markdown', 'text/html', 'text/css', 'text/javascript',
  'application/json', 'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];
const MAX_SIZE_MB = 50;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fileIcon(type: string): string {
  if (type.startsWith('image/')) return '🖼️';
  if (type === 'application/pdf') return '📄';
  if (type.startsWith('text/')) return '📝';
  if (type === 'application/json') return '🔧';
  if (type === 'application/zip') return '📦';
  return '📁';
}

export function FileUploader({ onUploaded }: { onUploaded?: (file: PortfolioFile) => void }) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [result, setResult] = useState<{ rootHash: string; txHash: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);
    setResult(null);
    setProgress(null);
    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(ts|tsx|js|jsx|py|go|rs|sol|md|txt)$/)) {
      setError('Unsupported file type.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File exceeds ${MAX_SIZE_MB}MB limit.`);
      return;
    }
    setSelectedFile(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile || !walletClient || !address) return;
    setError(null);
    setResult(null);

    try {
      const signer = await walletClientToSigner(walletClient);
      const uploadResult = await uploadFileTo0G(selectedFile, signer, setProgress);

      const portfolioFile: PortfolioFile = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type || 'application/octet-stream',
        rootHash: uploadResult.rootHash,
        txHash: uploadResult.txHash,
        uploadedAt: Date.now(),
        walletAddress: address,
        verified: false,
      };

      savePortfolioFile(address, portfolioFile);
      setResult(uploadResult);
      onUploaded?.(portfolioFile);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setProgress(null);
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setProgress(null);
    setResult(null);
    setError(null);
  };

  if (!isConnected) {
    return (
      <NeonCard className="p-8 text-center" glow="purple">
        <Upload size={40} className="mx-auto mb-3 text-neon-purple/40" />
        <p className="text-gray-400 font-mono text-sm">Connect your wallet to upload files</p>
      </NeonCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {!result && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !selectedFile && inputRef.current?.click()}
          className={`relative rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer
            ${dragging
              ? 'border-neon-cyan bg-neon-cyan/5 shadow-neon-cyan'
              : selectedFile
                ? 'border-neon-purple/50 bg-neon-purple/5'
                : 'border-neon-purple/20 hover:border-neon-purple/40 hover:bg-neon-purple/5'
            }
          `}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {!selectedFile ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <Upload size={48} className={`mb-4 transition-colors ${dragging ? 'text-neon-cyan' : 'text-neon-purple/50'}`} />
              <p className="text-gray-300 font-mono text-sm mb-1">
                Drop file here or <span className="text-neon-purple">click to browse</span>
              </p>
              <p className="text-gray-600 text-xs font-mono">
                PDF, Images, Code, Docs — up to {MAX_SIZE_MB}MB
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-4 p-5">
              <span className="text-3xl">{fileIcon(selectedFile.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-gray-200 font-mono text-sm truncate">{selectedFile.name}</p>
                <p className="text-gray-500 font-mono text-xs">{formatBytes(selectedFile.size)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="text-gray-600 hover:text-neon-pink transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Progress */}
      {progress && progress.stage !== 'done' && (
        <NeonCard className="p-4" glow="cyan">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 size={16} className="text-neon-cyan animate-spin" />
            <span className="font-mono text-sm text-neon-cyan">{progress.message}</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan rounded-full transition-all duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="mt-1 text-right font-mono text-xs text-gray-500">{progress.percent}%</div>
        </NeonCard>
      )}

      {/* Success result */}
      {result && (
        <NeonCard className="p-5" glow="cyan">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="text-neon-cyan mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-neon-cyan font-mono text-sm font-semibold mb-2">Upload Successful!</p>
              <div className="space-y-2">
                <div>
                  <span className="text-gray-500 font-mono text-xs">Root Hash</span>
                  <p className="text-gray-200 font-mono text-xs break-all bg-white/5 rounded p-2 mt-1">
                    {result.rootHash}
                  </p>
                </div>
                {result.txHash && (
                  <div>
                    <span className="text-gray-500 font-mono text-xs">TX Hash</span>
                    <p className="text-gray-200 font-mono text-xs break-all bg-white/5 rounded p-2 mt-1">
                      {result.txHash}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={reset}
                  className="px-4 py-2 rounded-lg text-xs font-mono bg-neon-purple/10 border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/20 transition-all"
                >
                  Upload Another
                </button>
                <a
                  href="/dashboard"
                  className="px-4 py-2 rounded-lg text-xs font-mono bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/20 transition-all"
                >
                  View Dashboard
                </a>
              </div>
            </div>
          </div>
        </NeonCard>
      )}

      {/* Error */}
      {error && (
        <NeonCard className="p-4" glow="pink">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-neon-pink mt-0.5 shrink-0" />
            <div>
              <p className="text-neon-pink font-mono text-sm">{error}</p>
              <p className="text-gray-500 font-mono text-xs mt-1">
                Make sure you&apos;re on 0G Testnet and have 0G tokens for gas.
              </p>
            </div>
          </div>
        </NeonCard>
      )}

      {/* Upload button */}
      {selectedFile && !progress && !result && (
        <button
          onClick={handleUpload}
          className="w-full py-3 px-6 rounded-xl font-mono text-sm font-semibold
            bg-gradient-to-r from-neon-purple to-neon-cyan text-white
            hover:from-neon-purple-dim hover:to-neon-cyan-dim
            shadow-neon-purple hover:shadow-neon-cyan
            transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Upload to 0G Storage
        </button>
      )}
    </div>
  );
}
