'use client';

import { useState } from 'react';
import { X, Briefcase, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { INFTMetadata } from '@/lib/types';
import { createHiringRequest } from '@/lib/hiring-store';

interface HiringRequestModalProps {
  talent:    INFTMetadata;
  employer:  string;
  onClose:   () => void;
  onSuccess: (requestId: string) => void;
}

type Step = 'form' | 'processing' | 'success' | 'error';

export function HiringRequestModal({
  talent, employer, onClose, onSuccess,
}: HiringRequestModalProps) {
  const [step,        setStep]        = useState<Step>('form');
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [amount,      setAmount]      = useState('');
  const [deadline,    setDeadline]    = useState('');
  const [requestId,   setRequestId]   = useState('');
  const [errMsg,      setErrMsg]      = useState('');

  const validate = () => {
    if (!title.trim())       { setErrMsg('Title is required'); return false; }
    if (!description.trim()) { setErrMsg('Description is required'); return false; }
    if (!amount || parseFloat(amount) <= 0) { setErrMsg('Payment amount required'); return false; }
    if (!deadline)           { setErrMsg('Deadline is required'); return false; }
    const dl = new Date(deadline).getTime() / 1000;
    if (dl <= Date.now() / 1000) { setErrMsg('Deadline must be in the future'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    setErrMsg('');
    if (!validate()) return;

    setStep('processing');
    try {
      await new Promise((r) => setTimeout(r, 1800));

      const deadlineTs = Math.floor(new Date(deadline).getTime() / 1000);
      const req = createHiringRequest(
        employer,
        talent.owner,
        amount,
        title.trim(),
        description.trim(),
        deadlineTs
      );

      setRequestId(req.requestId);
      setStep('success');
      onSuccess(req.requestId);
    } catch (err: unknown) {
      setErrMsg((err as { message?: string })?.message || 'Failed to send request');
      setStep('error');
    }
  };

  const minDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-neon-purple/30 bg-bg-card overflow-hidden shadow-neon-purple">
        <div className="h-1 bg-gradient-to-r from-neon-purple/60 via-neon-purple to-neon-cyan/60" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-mono text-lg font-bold text-white flex items-center gap-2">
            <Briefcase size={18} className="text-neon-purple" />
            Hire This Talent
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          {step === 'form' && (
            <>
              {/* Talent info */}
              <div className="rounded-xl border border-neon-purple/20 bg-neon-purple/5 p-3 mb-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neon-purple/20 flex items-center justify-center text-lg border border-neon-purple/30">
                  {talent.skillCategory === 'code' ? '⌨️' :
                   talent.skillCategory === 'design' ? '🎨' :
                   talent.skillCategory === 'writing' ? '✍️' : '📄'}
                </div>
                <div>
                  <div className="font-mono text-sm font-bold text-white">
                    {talent.owner.slice(0, 8)}…{talent.owner.slice(-6)}
                  </div>
                  <div className="text-xs text-gray-400 font-mono capitalize">
                    {talent.skillCategory} · {talent.score}/100 verified
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-5">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5">Job Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Smart Contract Developer for DeFi Protocol"
                    className="w-full bg-bg-secondary border border-neon-purple/20 rounded-lg px-4 py-2.5 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/60 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5">Description *</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Describe the job, requirements, deliverables, and timeline..."
                    className="w-full bg-bg-secondary border border-neon-purple/20 rounded-lg px-4 py-2.5 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/60 transition-colors resize-none"
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
                        placeholder="0.00"
                        min="0"
                        step="0.001"
                        className="w-full bg-bg-secondary border border-neon-purple/20 rounded-lg px-4 py-2.5 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/60 transition-colors"
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
                      min={minDate}
                      className="w-full bg-bg-secondary border border-neon-purple/20 rounded-lg px-4 py-2.5 font-mono text-sm text-white focus:outline-none focus:border-neon-purple/60 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {errMsg && (
                <div className="mb-4 text-xs font-mono text-red-400 flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  {errMsg}
                </div>
              )}

              <p className="text-[11px] text-gray-500 font-mono mb-5">
                Payment is held in escrow on 0G Chain. Released when talent confirms completion,
                or auto-released after 7 days. 2.5% platform fee on release.
              </p>

              <div className="flex gap-3">
                <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-gray-400 font-mono text-sm">
                  Cancel
                </button>
                <button onClick={handleSubmit}
                  className="flex-1 py-2.5 rounded-lg font-mono text-sm font-bold bg-gradient-to-r from-neon-purple to-neon-cyan text-bg-primary shadow-neon-purple hover:opacity-90 transition-opacity">
                  Send Request
                </button>
              </div>
            </>
          )}

          {step === 'processing' && (
            <div className="py-10 text-center">
              <Loader2 size={40} className="animate-spin mx-auto mb-4 text-neon-purple" />
              <div className="font-mono text-white font-bold">Sending hiring request…</div>
              <div className="text-xs text-gray-500 font-mono mt-1">Depositing escrow on 0G Chain</div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-6 text-center">
              <CheckCircle size={40} className="mx-auto mb-4 text-neon-cyan" />
              <div className="font-mono text-white font-bold text-lg mb-2">Request Sent!</div>
              <div className="text-xs text-gray-400 font-mono mb-2">
                Talent will receive your hiring request and payment is secured in escrow.
              </div>
              <div className="text-[10px] text-gray-600 font-mono mb-6">
                Request ID: {requestId}
              </div>
              <button onClick={onClose}
                className="w-full py-2.5 rounded-lg border border-neon-purple/30 text-neon-purple font-mono text-sm font-bold">
                Done
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="py-6 text-center">
              <AlertCircle size={40} className="mx-auto mb-4 text-red-400" />
              <div className="font-mono text-white font-bold mb-2">Request Failed</div>
              <div className="text-xs text-red-400 font-mono mb-5">{errMsg}</div>
              <div className="flex gap-3">
                <button onClick={() => setStep('form')}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-gray-400 font-mono text-sm">
                  Try Again
                </button>
                <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-white font-mono text-sm">
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
