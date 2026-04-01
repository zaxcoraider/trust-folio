'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { LayoutGrid, List, Filter, Search, Upload, RefreshCw, Database } from 'lucide-react';
import { PortfolioCard } from '@/components/PortfolioCard';
import { NeonCard } from '@/components/NeonCard';
import { VerificationPanel } from '@/components/VerificationPanel';
import { getPortfolioFiles, deletePortfolioFile } from '@/lib/portfolio-store';
import type { PortfolioFile } from '@/lib/types';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

type SortKey = 'date' | 'name' | 'size' | 'score';
type FilterType = 'all' | 'verified' | 'unverified';

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [files, setFiles] = useState<PortfolioFile[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [verifyTarget, setVerifyTarget] = useState<PortfolioFile | null>(null);

  const loadFiles = useCallback(() => {
    if (address) setFiles(getPortfolioFiles(address));
  }, [address]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const handleDelete = (id: string) => {
    if (!address) return;
    deletePortfolioFile(address, id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleVerifyComplete = (updated: PortfolioFile) => {
    setFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    setVerifyTarget(null);
  };

  // Filter + sort
  const displayed = files
    .filter((f) => {
      if (filterType === 'verified') return f.verified;
      if (filterType === 'unverified') return !f.verified;
      return true;
    })
    .filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'date') return b.uploadedAt - a.uploadedAt;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'size') return b.size - a.size;
      if (sortBy === 'score') return (b.verificationScore ?? -1) - (a.verificationScore ?? -1);
      return 0;
    });

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const verifiedCount = files.filter((f) => f.verified).length;
  const avgScore = verifiedCount > 0
    ? Math.round(files.filter((f) => f.verified && f.verificationScore).reduce((s, f) => s + (f.verificationScore ?? 0), 0) / verifiedCount)
    : 0;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
        <div className="fixed inset-0 bg-grid opacity-100 pointer-events-none" />
        <NeonCard className="p-10 text-center max-w-sm w-full" glow="purple">
          <Database size={40} className="mx-auto mb-4 text-neon-purple/40" />
          <p className="text-gray-300 font-mono text-sm mb-6">Connect your wallet to view your portfolio dashboard</p>
          <ConnectButton />
        </NeonCard>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-bg-primary px-4 py-10 page-enter">
      <div className="fixed inset-0 bg-grid opacity-100 pointer-events-none" />

      <div className="relative mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-mono text-2xl font-bold text-gray-100">Portfolio Dashboard</h1>
            <p className="text-gray-600 font-mono text-xs mt-1 break-all">{address}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadFiles} className="p-2 text-gray-600 hover:text-neon-cyan transition-colors">
              <RefreshCw size={16} />
            </button>
            <Link
              href="/upload"
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm
                bg-gradient-to-r from-neon-purple to-neon-cyan text-white
                shadow-neon-subtle hover:shadow-neon-cyan transition-all duration-300 hover:scale-105"
            >
              <Upload size={14} />
              Upload
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total Files', value: files.length, color: 'neon-purple' },
            { label: 'Verified', value: verifiedCount, color: 'neon-cyan' },
            { label: 'Avg Score', value: verifiedCount ? `${avgScore}/100` : '—', color: 'neon-pink' },
            { label: 'Total Size', value: totalSize > 1024 * 1024 ? `${(totalSize / (1024 * 1024)).toFixed(1)}MB` : `${(totalSize / 1024).toFixed(0)}KB`, color: 'neon-purple' },
          ].map((stat) => (
            <NeonCard key={stat.label} className="p-4 text-center" glow={stat.color.replace('neon-', '') as any}>
              <p className={`font-mono text-2xl font-bold text-${stat.color}`}>{stat.value}</p>
              <p className="font-mono text-xs text-gray-600 mt-1">{stat.label}</p>
            </NeonCard>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File list */}
          <div className="lg:col-span-2 space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="text"
                  placeholder="Search files…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-bg-card border border-white/10 focus:border-neon-purple/40 outline-none font-mono text-sm text-gray-300 placeholder-gray-700 transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="px-3 py-2.5 rounded-lg bg-bg-card border border-white/10 font-mono text-xs text-gray-400 outline-none cursor-pointer"
                >
                  <option value="date">Sort: Date</option>
                  <option value="name">Sort: Name</option>
                  <option value="size">Sort: Size</option>
                  <option value="score">Sort: Score</option>
                </select>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as FilterType)}
                  className="px-3 py-2.5 rounded-lg bg-bg-card border border-white/10 font-mono text-xs text-gray-400 outline-none cursor-pointer"
                >
                  <option value="all">All</option>
                  <option value="verified">Verified</option>
                  <option value="unverified">Unverified</option>
                </select>
                <div className="flex border border-white/10 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-neon-purple/20 text-neon-purple' : 'text-gray-600 hover:text-gray-400'}`}
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-neon-purple/20 text-neon-purple' : 'text-gray-600 hover:text-gray-400'}`}
                  >
                    <List size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Files */}
            {displayed.length === 0 ? (
              <NeonCard className="p-12 text-center" glow="none">
                <Database size={36} className="mx-auto mb-3 text-gray-800" />
                <p className="text-gray-600 font-mono text-sm">
                  {files.length === 0 ? 'No files uploaded yet' : 'No files match your filter'}
                </p>
                {files.length === 0 && (
                  <Link href="/upload" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg font-mono text-xs text-neon-purple border border-neon-purple/25 hover:bg-neon-purple/10 transition-all">
                    <Upload size={12} /> Upload your first file
                  </Link>
                )}
              </NeonCard>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-3'}>
                {displayed.map((file) => (
                  <PortfolioCard
                    key={file.id}
                    file={file}
                    onDelete={handleDelete}
                    onVerify={(f) => setVerifyTarget(f)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Verify panel */}
          <div>
            <div className="sticky top-24">
              <p className="font-mono text-sm font-medium text-gray-400 mb-3">
                {verifyTarget ? `Verifying: ${verifyTarget.name}` : 'AI Verification'}
              </p>
              <VerificationPanel
                file={verifyTarget || undefined}
                walletAddress={address}
                onComplete={handleVerifyComplete}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
