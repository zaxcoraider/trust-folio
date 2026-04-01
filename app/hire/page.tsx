'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import {
  Briefcase, Users, Search, Building2, Star,
  ChevronRight, Clock, CheckCircle, AlertCircle,
} from 'lucide-react';
import { HiringCard } from '@/components/HiringCard';
import { INFTCard } from '@/components/INFTCard';
import type { HiringRequest, INFTMetadata } from '@/lib/types';
import {
  getEmployerRequests,
  getTalentRequests,
  getAllHiringRequests,
  getHiringStats,
} from '@/lib/hiring-store';
import { getAllINFTs, seedDemoINFTs } from '@/lib/inft-store';

type Tab = 'browse' | 'employer' | 'talent';

export default function HirePage() {
  const { address, isConnected } = useAccount();
  const [tab,           setTab]           = useState<Tab>('browse');
  const [infts,         setInfts]         = useState<INFTMetadata[]>([]);
  const [empRequests,   setEmpRequests]   = useState<HiringRequest[]>([]);
  const [talRequests,   setTalRequests]   = useState<HiringRequest[]>([]);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [filterSkill,   setFilterSkill]   = useState('');
  const [stats,         setStats]         = useState({ total: 0, pending: 0, active: 0, completed: 0, totalVolume: '0' });

  useEffect(() => {
    seedDemoINFTs();
    setInfts(getAllINFTs());
    setStats(getHiringStats());
  }, []);

  useEffect(() => {
    if (!address) return;
    setEmpRequests(getEmployerRequests(address));
    setTalRequests(getTalentRequests(address));
  }, [address]);

  const filteredINFTs = infts.filter((inft) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      inft.owner.toLowerCase().includes(q) ||
      inft.skillCategory.toLowerCase().includes(q) ||
      inft.badges.some((b) => b.toLowerCase().includes(q));
    const matchSkill = !filterSkill || inft.skillCategory === filterSkill;
    return matchSearch && matchSkill;
  });

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase size={20} className="text-neon-purple" />
            <h1 className="font-mono text-2xl font-black text-white">Hiring Portal</h1>
          </div>
          <p className="text-gray-500 font-mono text-xs">
            Connect with AI-verified talent · On-chain escrow agreements · Trustless payments
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Active Contracts', value: stats.active,       color: '#06b6d4', icon: <CheckCircle size={14} /> },
            { label: 'Pending Requests', value: stats.pending,      color: '#f59e0b', icon: <Clock size={14} /> },
            { label: 'Completed Jobs',   value: stats.completed,    color: '#10b981', icon: <Star size={14} /> },
            { label: 'Total Volume',     value: `${parseFloat(stats.totalVolume).toFixed(2)} 0G`, color: '#a855f7', icon: <AlertCircle size={14} /> },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="rounded-xl border border-neon-purple/15 bg-bg-card p-4 flex items-center gap-3">
              <div style={{ color }}>{icon}</div>
              <div>
                <div className="font-mono font-black text-white text-lg leading-none">{value}</div>
                <div className="text-[10px] text-gray-600 font-mono mt-0.5">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-neon-purple/10 pb-0">
          {([
            { id: 'browse',   label: 'Browse Talent',    icon: <Users size={14} />     },
            { id: 'employer', label: 'My Requests',      icon: <Building2 size={14} /> },
            { id: 'talent',   label: 'Received Offers',  icon: <Briefcase size={14} /> },
          ] as const).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-lg font-mono text-sm border-b-2 transition-all duration-150 ${
                tab === id
                  ? 'border-neon-purple text-neon-purple bg-neon-purple/5'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {icon}
              {label}
              {id === 'employer' && empRequests.length > 0 && (
                <span className="text-[10px] bg-neon-purple/20 text-neon-purple px-1.5 py-0.5 rounded-full">
                  {empRequests.length}
                </span>
              )}
              {id === 'talent' && talRequests.length > 0 && (
                <span className="text-[10px] bg-neon-cyan/20 text-neon-cyan px-1.5 py-0.5 rounded-full">
                  {talRequests.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'browse' && (
          <div>
            {/* Search + filter */}
            <div className="flex gap-3 mb-6 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by wallet, skill, badge…"
                  className="w-full bg-bg-card border border-neon-purple/20 rounded-lg pl-9 pr-4 py-2.5 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/60 transition-colors"
                />
              </div>
              <select
                value={filterSkill}
                onChange={(e) => setFilterSkill(e.target.value)}
                className="bg-bg-card border border-neon-purple/20 rounded-lg px-3 py-2.5 font-mono text-sm text-white focus:outline-none focus:border-neon-purple/60"
              >
                <option value="">All Skills</option>
                <option value="code">⌨️ Developer</option>
                <option value="design">🎨 Designer</option>
                <option value="writing">✍️ Writer</option>
                <option value="document">📄 Analyst</option>
                <option value="other">🔮 Other</option>
              </select>
            </div>

            <p className="text-xs text-gray-600 font-mono mb-4">
              {filteredINFTs.length} verified talent profiles — click to hire
            </p>

            {filteredINFTs.length === 0 ? (
              <div className="text-center py-20 text-gray-600 font-mono">
                No talent profiles match your search
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredINFTs.map((inft) => (
                  <div key={inft.tokenId} className="group relative">
                    <INFTCard inft={inft} />
                    {/* Hire overlay */}
                    {isConnected && address?.toLowerCase() !== inft.owner.toLowerCase() && (
                      <div className="absolute inset-0 rounded-2xl bg-bg-primary/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center">
                        <Link
                          href={`/marketplace/${inft.tokenId}`}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-neon-purple to-neon-cyan text-bg-primary font-mono text-sm font-bold shadow-neon-purple"
                        >
                          <Briefcase size={14} />
                          Contact for Hire
                          <ChevronRight size={14} />
                        </Link>
                      </div>
                    )}
                    {!isConnected && (
                      <div className="absolute inset-0 rounded-2xl bg-bg-primary/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center">
                        <ConnectButton />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'employer' && (
          <div>
            {!isConnected ? (
              <div className="text-center py-16">
                <Building2 size={40} className="mx-auto mb-4 text-gray-700" />
                <div className="font-mono text-gray-500 mb-4">Connect wallet to view your hiring requests</div>
                <ConnectButton />
              </div>
            ) : empRequests.length === 0 ? (
              <div className="text-center py-16">
                <Briefcase size={40} className="mx-auto mb-4 text-gray-700" />
                <div className="font-mono text-gray-500 mb-2">No hiring requests yet</div>
                <p className="text-gray-700 font-mono text-xs mb-6">
                  Browse verified talent and send your first hiring request
                </p>
                <button
                  onClick={() => setTab('browse')}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-neon-purple to-neon-cyan text-bg-primary font-mono text-sm font-bold mx-auto"
                >
                  <Users size={14} />
                  Browse Talent
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {empRequests.map((req) => (
                  <HiringCard key={req.requestId} request={req} role="employer" />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'talent' && (
          <div>
            {!isConnected ? (
              <div className="text-center py-16">
                <Briefcase size={40} className="mx-auto mb-4 text-gray-700" />
                <div className="font-mono text-gray-500 mb-4">Connect wallet to view hiring offers</div>
                <ConnectButton />
              </div>
            ) : talRequests.length === 0 ? (
              <div className="text-center py-16">
                <Star size={40} className="mx-auto mb-4 text-gray-700" />
                <div className="font-mono text-gray-500 mb-2">No hiring offers yet</div>
                <p className="text-gray-700 font-mono text-xs mb-6">
                  Mint and list your portfolio as an INFT to get discovered by employers
                </p>
                <Link
                  href="/mint"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-neon-purple to-neon-cyan text-bg-primary font-mono text-sm font-bold"
                >
                  <Star size={14} />
                  Mint Your INFT
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {talRequests.map((req) => (
                  <HiringCard key={req.requestId} request={req} role="talent" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
