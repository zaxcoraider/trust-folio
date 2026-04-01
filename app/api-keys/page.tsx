'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Key, Plus, Copy, CheckCircle2, AlertCircle, Trash2, TrendingUp,
  Eye, EyeOff, ExternalLink, Shield
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { NeonCard } from '@/components/NeonCard';
import {
  getAPIKeys, createAPIKey, revokeAPIKey, upgradeAPIKey
} from '@/lib/api-keys-store';
import type { APIKeyRecord } from '@/lib/types';

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 rounded-md text-gray-500 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-all ${className}`}
    >
      {copied ? <CheckCircle2 size={13} className="text-neon-cyan" /> : <Copy size={13} />}
    </button>
  );
}

export default function APIKeysPage() {
  const { address, isConnected } = useAccount();
  const [keys, setKeys] = useState<APIKeyRecord[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealedKey, setRevealedKey] = useState<{ id: string; rawKey: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (address) setKeys(getAPIKeys(address));
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = () => {
    if (!address || !newKeyName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const result = createAPIKey(address, newKeyName.trim());
      setRevealedKey({ id: result.id, rawKey: result.rawKey });
      setNewKeyName('');
      setShowCreateForm(false);
      refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = (keyId: string) => {
    if (!address) return;
    revokeAPIKey(address, keyId);
    setConfirmRevoke(null);
    refresh();
  };

  const handleUpgrade = (keyId: string) => {
    if (!address) return;
    upgradeAPIKey(address, keyId);
    refresh();
  };

  if (!isConnected) {
    return (
      <div className="relative min-h-screen bg-bg-primary px-4 py-10 page-enter">
        <div className="fixed inset-0 bg-grid opacity-100 pointer-events-none" />
        <div className="relative max-w-2xl mx-auto text-center pt-24">
          <Shield size={40} className="text-gray-600 mx-auto mb-3" />
          <h1 className="font-mono text-xl font-bold text-gray-100 mb-2">Connect Wallet</h1>
          <p className="font-mono text-sm text-gray-500">Connect your wallet to manage API keys.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-bg-primary px-4 py-10 page-enter">
      <div className="fixed inset-0 bg-grid opacity-100 pointer-events-none" />

      <div className="relative max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-neon-purple/10 border border-neon-purple/20">
                <Key size={22} className="text-neon-purple" />
              </div>
              <h1 className="font-mono text-2xl font-bold text-gray-100">API Keys</h1>
            </div>
            <p className="font-mono text-sm text-gray-500">
              Integrate TrustFolio into your platform.{' '}
              <Link href="/docs" className="text-neon-purple hover:underline inline-flex items-center gap-1">
                View docs <ExternalLink size={11} />
              </Link>
            </p>
          </div>
          <button
            onClick={() => { setShowCreateForm(true); setRevealedKey(null); }}
            className="flex items-center gap-2 font-mono text-sm px-4 py-2.5 rounded-lg border border-neon-purple/40 bg-neon-purple/10 text-neon-purple hover:bg-neon-purple/20 transition-all"
          >
            <Plus size={16} />
            Generate New Key
          </button>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <NeonCard glow="purple" className="p-5 mb-6">
            <h2 className="font-mono text-sm font-semibold text-gray-300 mb-4">New API Key</h2>
            {error && (
              <div className="mb-3 p-3 rounded-lg bg-neon-pink/10 border border-neon-pink/30 flex items-center gap-2">
                <AlertCircle size={14} className="text-neon-pink" />
                <p className="font-mono text-xs text-neon-pink">{error}</p>
              </div>
            )}
            <div className="flex gap-3">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g., My App)"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="flex-1 bg-bg-primary border border-white/10 rounded-lg px-4 py-2.5 font-mono text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-neon-purple/50 transition-colors"
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newKeyName.trim()}
                className="flex items-center gap-2 font-mono text-sm px-4 py-2.5 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 disabled:opacity-40 transition-all"
              >
                {creating ? <div className="w-4 h-4 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" /> : <Plus size={14} />}
                Create
              </button>
              <button
                onClick={() => { setShowCreateForm(false); setError(null); }}
                className="font-mono text-sm px-3 py-2.5 rounded-lg border border-white/10 text-gray-500 hover:text-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </NeonCard>
        )}

        {/* Revealed key (shown once) */}
        {revealedKey && (
          <NeonCard glow="cyan" className="p-5 mb-6 border-neon-cyan/50">
            <div className="flex items-start gap-3 mb-3">
              <CheckCircle2 size={18} className="text-neon-cyan mt-0.5 shrink-0" />
              <div>
                <p className="font-mono text-sm font-semibold text-neon-cyan">API Key Created Successfully</p>
                <p className="font-mono text-xs text-neon-pink mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> This key will only be shown once. Copy it now!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-bg-primary rounded-lg border border-neon-cyan/30">
              <code className="flex-1 font-mono text-xs text-neon-cyan break-all">{revealedKey.rawKey}</code>
              <CopyButton text={revealedKey.rawKey} />
            </div>
            <button
              onClick={() => setRevealedKey(null)}
              className="mt-3 font-mono text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              I have saved this key ✓
            </button>
          </NeonCard>
        )}

        {/* Keys list */}
        {keys.length === 0 ? (
          <NeonCard glow="none" className="p-10 text-center mb-8">
            <Key size={36} className="text-gray-600 mx-auto mb-3" />
            <p className="font-mono text-gray-500 mb-2">No API keys yet</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="font-mono text-sm text-neon-purple hover:underline"
            >
              Generate your first key →
            </button>
          </NeonCard>
        ) : (
          <div className="space-y-3 mb-8">
            {keys.map((key) => (
              <NeonCard
                key={key.id}
                glow={key.active ? 'none' : 'none'}
                className={`p-5 ${!key.active ? 'opacity-50' : ''}`}
              >
                {confirmRevoke === key.id && (
                  <div className="mb-4 p-3 rounded-lg bg-neon-pink/10 border border-neon-pink/30">
                    <p className="font-mono text-xs text-neon-pink mb-2">Revoke this key? This cannot be undone.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="font-mono text-xs px-3 py-1.5 rounded border border-neon-pink/40 bg-neon-pink/10 text-neon-pink hover:bg-neon-pink/20 transition-all"
                      >
                        Yes, Revoke
                      </button>
                      <button
                        onClick={() => setConfirmRevoke(null)}
                        className="font-mono text-xs px-3 py-1.5 rounded border border-white/10 text-gray-500 hover:text-gray-300 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="font-mono text-sm font-semibold text-gray-200">{key.name}</p>
                      <span className={`font-mono text-xs px-2 py-0.5 rounded border ${
                        key.tier === 'paid'
                          ? 'text-neon-purple border-neon-purple/30 bg-neon-purple/10'
                          : 'text-gray-500 border-gray-600/30 bg-gray-600/10'
                      }`}>
                        {key.tier === 'paid' ? 'Paid' : 'Free'}
                      </span>
                      {!key.active && (
                        <span className="font-mono text-xs px-2 py-0.5 rounded border text-neon-pink border-neon-pink/30 bg-neon-pink/10">
                          Revoked
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <code className="font-mono text-xs text-gray-500">{key.keyPreview}</code>
                      <CopyButton text={key.keyPreview} />
                    </div>

                    <div className="flex flex-wrap gap-4 font-mono text-xs text-gray-500">
                      <span>Daily limit: <span className="text-gray-300">{key.dailyLimit.toLocaleString()}</span></span>
                      <span>Usage today: <span className="text-neon-cyan">{key.usageToday}</span></span>
                      <span>Total: <span className="text-gray-300">{key.usageTotal.toLocaleString()}</span></span>
                      <span>Created: <span className="text-gray-300">{new Date(key.createdAt * 1000).toLocaleDateString()}</span></span>
                    </div>
                  </div>

                  {key.active && (
                    <div className="flex items-center gap-2 shrink-0">
                      {key.tier === 'free' && (
                        <button
                          onClick={() => handleUpgrade(key.id)}
                          className="flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded-lg border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 transition-all"
                        >
                          <TrendingUp size={12} />
                          Upgrade (0.01 0G)
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmRevoke(key.id)}
                        className="flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded-lg border border-neon-pink/30 bg-neon-pink/5 text-neon-pink hover:bg-neon-pink/15 transition-all"
                      >
                        <Trash2 size={12} />
                        Revoke
                      </button>
                    </div>
                  )}
                </div>

                {/* Usage bar */}
                {key.active && (
                  <div className="mt-3">
                    <div className="flex justify-between font-mono text-xs text-gray-600 mb-1">
                      <span>Daily usage</span>
                      <span>{key.usageToday} / {key.dailyLimit}</span>
                    </div>
                    <div className="bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-neon-purple rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (key.usageToday / key.dailyLimit) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </NeonCard>
            ))}
          </div>
        )}

        {/* Tier comparison */}
        <h2 className="font-mono text-base font-semibold text-gray-300 mb-4">Tier Comparison</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <NeonCard glow="none" className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Key size={18} className="text-gray-400" />
              <h3 className="font-mono text-sm font-semibold text-gray-400">Free Tier</h3>
            </div>
            <ul className="space-y-2">
              {['100 requests / day', '10 requests / minute', 'All 5 API endpoints', 'Standard response time', 'Community support'].map((f) => (
                <li key={f} className="flex items-center gap-2 font-mono text-xs text-gray-400">
                  <CheckCircle2 size={13} className="text-gray-600" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="font-mono text-xs text-gray-600 mt-4 pt-4 border-t border-white/5">Free forever</p>
          </NeonCard>

          <NeonCard glow="purple" className="p-5 border-neon-purple/40">
            <div className="flex items-center gap-2 mb-4">
              <Key size={18} className="text-neon-purple" />
              <h3 className="font-mono text-sm font-semibold text-neon-purple">Paid Tier</h3>
              <span className="ml-auto font-mono text-xs text-amber-400">0.01 0G/month</span>
            </div>
            <ul className="space-y-2">
              {[
                '10,000 requests / day',
                '100 requests / minute',
                'All 5 API endpoints',
                'Priority processing',
                'Webhook notifications',
                'Dedicated support',
                '$0.001 per request (overage)',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 font-mono text-xs text-gray-300">
                  <CheckCircle2 size={13} className="text-neon-purple" />
                  {f}
                </li>
              ))}
            </ul>
          </NeonCard>
        </div>

        {/* Usage chart placeholder */}
        <NeonCard glow="none" className="p-5">
          <h2 className="font-mono text-sm font-semibold text-gray-500 mb-3">Usage by Endpoint (last 7 days)</h2>
          <div className="grid grid-cols-5 gap-2">
            {[
              { endpoint: '/verify', calls: 42 },
              { endpoint: '/profile', calls: 28 },
              { endpoint: '/search', calls: 19 },
              { endpoint: '/hire', calls: 7 },
              { endpoint: '/verify-proof', calls: 4 },
            ].map((e) => (
              <div key={e.endpoint} className="text-center">
                <div className="h-20 flex items-end justify-center mb-2">
                  <div
                    className="w-8 bg-neon-purple/40 rounded-t-sm transition-all duration-700"
                    style={{ height: `${(e.calls / 42) * 80}px` }}
                  />
                </div>
                <p className="font-mono text-xs text-gray-500 truncate">{e.endpoint}</p>
                <p className="font-mono text-xs text-neon-cyan">{e.calls}</p>
              </div>
            ))}
          </div>
        </NeonCard>
      </div>
    </div>
  );
}
