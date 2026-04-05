'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { X, Briefcase, CheckCircle, AlertCircle, ExternalLink, Clock } from 'lucide-react';
import type { INFTMetadata } from '@/lib/types';
import { useTxFlow } from '@/hooks/useTxFlow';
import { TxStatus } from './TxStatus';
import { useNetwork } from '@/lib/network-context';
import { HIRING_ESCROW_ABI, isConfigured } from '@/lib/contracts';
import { createHiringRequest } from '@/lib/hiring-store';

interface HiringRequestModalProps {
  talent:    INFTMetadata;
  employer:  string;
  onClose:   () => void;
  onSuccess: (requestId: string) => void;
}

export function HiringRequestModal({
  talent, employer, onClose, onSuccess,
}: HiringRequestModalProps) {
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [amount,      setAmount]      = useState('');
  const [deadline,    setDeadline]    = useState('');
  const [validErr,    setValidErr]    = useState('');

  const { state, execute, reset } = useTxFlow();
  const { networkConfig }         = useNetwork();

  const hiringAddress   = networkConfig.contracts.hiring;
  const contractReady   = isConfigured(hiringAddress);
  const isProcessing    = state.status === 'wallet_pending' || state.status === 'tx_pending';
  const isDone          = state.status === 'confirmed' || state.status === 'error';

  const minDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const validate = (): boolean => {
    if (!title.trim())       { setValidErr('Title is required'); return false; }
    if (!description.trim()) { setValidErr('Description is required'); return false; }
    if (!amount || parseFloat(amount) <= 0) { setValidErr('Payment amount required'); return false; }
    if (!deadline)           { setValidErr('Deadline is required'); return false; }
    if (new Date(deadline).getTime() / 1000 <= Date.now() / 1000) {
      setValidErr('Deadline must be in the future'); return false;
    }
    setValidErr('');
    return true;
  };

  const handleSubmit = () => {
    if (!validate() || !contractReady) return;

    const deadlineTs = Math.floor(new Date(deadline).getTime() / 1000);
    const value      = ethers.parseEther(amount);

    execute({
      type:        'hire_create',
      description: `Hire ${talent.originalOwner.slice(0, 8)}… for "${title.trim()}"`,
      preflight: async (provider) => {
        const contract = new ethers.Contract(hiringAddress!, HIRING_ESCROW_ABI as unknown as string[], provider);
        await contract.createRequest.staticCall(
          talent.originalOwner,
          title.trim(),
          description.trim(),
          deadlineTs,
          { value, from: employer }
        );
      },
      fn: async (signer) => {
        const contract = new ethers.Contract(hiringAddress!, HIRING_ESCROW_ABI as unknown as string[], signer);
        return contract.createRequest(
          talent.originalOwner,
          title.trim(),
          description.trim(),
          deadlineTs,
          { value }
        );
      },
      onSuccess: async (txHash) => {
        // Parse on-chain requestId from RequestCreated event
        let onChainId: number | undefined;
        try {
          const provider = new ethers.JsonRpcProvider(networkConfig.rpc);
          const receipt  = await provider.getTransactionReceipt(txHash);
          if (receipt) {
            const iface = new ethers.Interface(HIRING_ESCROW_ABI as unknown as string[]);
            for (const log of receipt.logs) {
              try {
                const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
                if (parsed?.name === 'RequestCreated') {
                  onChainId = Number(parsed.args[0]);
                  break;
                }
              } catch { /* skip */ }
            }
          }
        } catch { /* non-fatal */ }

        // Mirror to local store for UI
        const req = createHiringRequest(
          employer,
          talent.originalOwner,
          amount,
          title.trim(),
          description.trim(),
          deadlineTs,
          hiringAddress!,
          onChainId,
        );
        onSuccess(req.requestId);
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-neon-purple/30 bg-bg-card overflow-hidden shadow-neon-purple">
        <div className="h-1 bg-gradient-to-r from-neon-purple/60 via-neon-purple to-neon-cyan/60" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-mono text-lg font-bold text-white flex items-center gap-2">
            <Briefcase size={18} className="text-neon-purple" />
            Hire This Talent
          </h2>
          <button onClick={onClose} disabled={isProcessing} className="text-gray-400 hover:text-white p-1 disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Contract not deployed notice */}
          {!contractReady && (
            <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 flex items-center gap-2">
              <Clock size={14} className="text-amber-400 shrink-0" />
              <p className="font-mono text-amber-400 text-xs">
                Hiring escrow launching soon — set NEXT_PUBLIC_TESTNET_HIRING_ADDRESS to activate
              </p>
            </div>
          )}

          {/* Talent info */}
          <div className="rounded-xl border border-neon-purple/20 bg-neon-purple/5 p-3 mb-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neon-purple/20 flex items-center justify-center text-lg border border-neon-purple/30">
              {talent.skillCategory === 'code' ? '⌨️' :
               talent.skillCategory === 'design' ? '🎨' :
               talent.skillCategory === 'writing' ? '✍️' : '📄'}
            </div>
            <div>
              <div className="font-mono text-sm font-bold text-white">
                {talent.originalOwner.slice(0, 8)}…{talent.originalOwner.slice(-6)}
              </div>
              <div className="text-xs text-gray-400 font-mono capitalize">
                {talent.skillCategory} · {talent.score}/100 verified
              </div>
            </div>
          </div>

          <TxStatus state={state} />

          {/* Confirmed */}
          {state.status === 'confirmed' && (
            <div className="text-center space-y-3 py-4">
              <CheckCircle size={36} className="mx-auto text-neon-cyan" />
              <p className="font-mono text-white font-bold">Hire Request Sent!</p>
              <p className="font-mono text-xs text-gray-400">
                Payment of {amount} 0G is held in escrow on-chain until the job is complete.
              </p>
              {state.explorerUrl && (
                <a href={state.explorerUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-neon-cyan hover:underline">
                  <ExternalLink size={11} />
                  View transaction on 0G Explorer
                </a>
              )}
            </div>
          )}

          {/* Form (hidden once done) */}
          {!isDone && (
            <>
              <div className="space-y-4 mb-5">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5">Job Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isProcessing}
                    placeholder="e.g. Smart Contract Developer for DeFi Protocol"
                    className="w-full bg-bg-secondary border border-neon-purple/20 rounded-lg px-4 py-2.5 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/60 transition-colors disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5">Description *</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isProcessing}
                    rows={4}
                    placeholder="Describe the job, requirements, deliverables, and timeline..."
                    className="w-full bg-bg-secondary border border-neon-purple/20 rounded-lg px-4 py-2.5 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/60 transition-colors resize-none disabled:opacity-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1.5">Payment (0G tokens) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={isProcessing}
                        placeholder="0.00"
                        min="0"
                        step="0.001"
                        className="w-full bg-bg-secondary border border-neon-purple/20 rounded-lg px-4 py-2.5 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/60 transition-colors disabled:opacity-50"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">0G</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1.5">Deadline *</label>
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      disabled={isProcessing}
                      min={minDate}
                      className="w-full bg-bg-secondary border border-neon-purple/20 rounded-lg px-4 py-2.5 font-mono text-sm text-white focus:outline-none focus:border-neon-purple/60 transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {validErr && (
                <div className="mb-4 text-xs font-mono text-red-400 flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  {validErr}
                </div>
              )}

              <p className="text-[11px] text-gray-500 font-mono mb-5">
                Payment is held in escrow on 0G Chain. Released when talent confirms completion,
                or auto-released after 7 days. 2.5% platform fee on release.
              </p>

              <div className="flex gap-3">
                <button onClick={onClose} disabled={isProcessing}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-gray-400 font-mono text-sm disabled:opacity-40">
                  Cancel
                </button>
                <button onClick={handleSubmit}
                  disabled={isProcessing || !contractReady}
                  className="flex-1 py-2.5 rounded-lg font-mono text-sm font-bold bg-gradient-to-r from-neon-purple to-neon-cyan text-bg-primary shadow-neon-purple hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
                  {isProcessing ? 'Processing…' : contractReady ? 'Send Request' : 'Coming Soon'}
                </button>
              </div>
            </>
          )}

          {isDone && (
            <button onClick={state.status === 'error' ? reset : onClose}
              className="w-full mt-4 py-2.5 rounded-lg border border-neon-purple/30 text-neon-purple font-mono text-sm hover:bg-neon-purple/10">
              {state.status === 'error' ? 'Try Again' : 'Done'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
