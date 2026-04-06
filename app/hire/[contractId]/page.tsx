'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import {
  ArrowLeft, Briefcase, Clock, CheckCircle,
  XCircle, AlertTriangle, DollarSign, Calendar,
  User, ExternalLink,
} from 'lucide-react';
import { ethers } from 'ethers';
import type { HiringRequest, HiringStatus, HiringStatus as HS } from '@/lib/types';
import { useTxFlow } from '@/hooks/useTxFlow';
import { TxStatus } from '@/components/TxStatus';
import type { TxType } from '@/lib/tx-history';
import { useNetwork } from '@/lib/network-context';
import { HIRING_ESCROW_ABI, isConfigured } from '@/lib/contracts';
import { format, formatDistanceToNow } from 'date-fns';

const HIRING_STATUS_MAP: HS[] = [
  'pending', 'accepted', 'completed', 'released', 'disputed', 'cancelled', 'declined',
];

function getAutoReleaseAt(req: HiringRequest): number | null {
  if (req.status !== 'completed' || !req.completedAt) return null;
  return req.completedAt + 7 * 24 * 60 * 60;
}
function isAutoReleaseReady(req: HiringRequest): boolean {
  const at = getAutoReleaseAt(req);
  return at !== null && Date.now() / 1000 >= at;
}

const STATUS_STYLES: Record<HiringStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending Response', color: '#f59e0b', icon: <Clock size={14} />           },
  accepted:  { label: 'In Progress',      color: '#06b6d4', icon: <CheckCircle size={14} />     },
  completed: { label: 'Awaiting Release', color: '#a855f7', icon: <CheckCircle size={14} />     },
  released:  { label: 'Payment Released', color: '#10b981', icon: <CheckCircle size={14} />     },
  disputed:  { label: 'Disputed',         color: '#ef4444', icon: <AlertTriangle size={14} />   },
  cancelled: { label: 'Cancelled',        color: '#6b7280', icon: <XCircle size={14} />         },
  declined:  { label: 'Declined',         color: '#6b7280', icon: <XCircle size={14} />         },
};

export default function HiringContractPage() {
  const params = useParams();
  const id     = params?.contractId as string;
  const { address } = useAccount();

  const [request, setRequest] = useState<HiringRequest | null>(null);

  const { state, execute, reset } = useTxFlow();
  const { networkConfig }         = useNetwork();

  const hiringAddress  = networkConfig.contracts.hiring;
  const contractReady  = isConfigured(hiringAddress);
  const isProcessing   = state.status === 'wallet_pending' || state.status === 'tx_pending';

  useEffect(() => {
    if (!id || !hiringAddress) return;
    const numId = parseInt(id);
    if (isNaN(numId)) return;
    const provider = new ethers.JsonRpcProvider(networkConfig.rpc);
    const escrow   = new ethers.Contract(hiringAddress, HIRING_ESCROW_ABI as unknown as string[], provider);
    escrow.getRequest(numId).then((raw: { requestId: bigint; employer: string; talent: string; amount: bigint; title: string; description: string; deadline: bigint; createdAt: bigint; acceptedAt: bigint; completedAt: bigint; status: number; talentConfirmed: boolean; employerReleased: boolean }) => {
      setRequest({
        requestId:        raw.requestId.toString(),
        onChainId:        Number(raw.requestId),
        employer:         raw.employer,
        talent:           raw.talent,
        amount:           raw.amount.toString(),
        amountEther:      ethers.formatEther(raw.amount),
        title:            raw.title,
        description:      raw.description,
        deadline:         Number(raw.deadline),
        createdAt:        Number(raw.createdAt),
        acceptedAt:       Number(raw.acceptedAt) || undefined,
        completedAt:      Number(raw.completedAt) || undefined,
        status:           HIRING_STATUS_MAP[raw.status] ?? 'pending',
        talentConfirmed:  raw.talentConfirmed,
        employerReleased: raw.employerReleased,
        contractAddress:  hiringAddress,
      });
    }).catch(() => { /* not found */ });
  }, [id, hiringAddress, networkConfig.rpc]);

  if (!request) {
    return (
      <div className="min-h-screen pt-24 px-4 text-center">
        <div className="font-mono text-gray-500 mt-20">Hiring contract not found</div>
        <Link href="/hire" className="mt-4 inline-flex items-center gap-1.5 text-neon-purple font-mono text-sm hover:underline">
          <ArrowLeft size={14} />
          Back to Hiring Portal
        </Link>
      </div>
    );
  }

  const isEmployer    = address?.toLowerCase() === request.employer.toLowerCase();
  const isTalent      = address?.toLowerCase() === request.talent.toLowerCase();
  const st            = STATUS_STYLES[request.status];
  const autoRelAt     = getAutoReleaseAt(request);
  const autoRelReady  = isAutoReleaseReady(request);

  // Attempt on-chain call if contract is deployed and we have an on-chain requestId;
  // otherwise fall back to local state update only.
  const doContractAction = (
    type: TxType,
    contractMethod: string,
    newStatus: HiringStatus,
    extraFields?: Partial<HiringRequest>,
  ) => {
    execute({
      type,
      description: `${contractMethod} request #${request.onChainId}`,
      // Preflight: simulate the call to surface a decoded revert reason before
      // sending to the wallet. Works for all non-payable escrow actions.
      preflight: async (provider) => {
        const contract = new ethers.Contract(hiringAddress!, HIRING_ESCROW_ABI as unknown as string[], provider);
        await (contract as any)[contractMethod].staticCall(request.onChainId!, { from: address });
      },
      fn: async (signer) => {
        const contract = new ethers.Contract(hiringAddress!, HIRING_ESCROW_ABI as unknown as string[], signer);
        return (contract as any)[contractMethod](request.onChainId!);
      },
      onSuccess: () => {
        setRequest((prev) => prev ? { ...prev, status: newStatus, ...extraFields } : prev);
      },
    });
  };

  const fee    = (parseFloat(request.amountEther) * 0.025).toFixed(4);
  const netAmt = (parseFloat(request.amountEther) * 0.975).toFixed(4);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">

        <Link href="/hire" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-neon-purple font-mono text-sm mb-6 transition-colors">
          <ArrowLeft size={14} />
          Hiring Portal
        </Link>

        {/* Header */}
        <div className="rounded-2xl border border-neon-purple/20 bg-bg-card overflow-hidden mb-6">
          <div className="h-1 bg-gradient-to-r from-neon-purple/60 via-neon-purple to-neon-cyan/60" />
          <div className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center shrink-0">
                  <Briefcase size={20} className="text-neon-purple" />
                </div>
                <div>
                  <h1 className="font-mono text-xl font-bold text-white mb-1">{request.title}</h1>
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border"
                    style={{ color: st.color, borderColor: `${st.color}44`, background: `${st.color}10` }}
                  >
                    {st.icon}
                    {st.label}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-2xl font-black text-neon-purple">
                  {request.amountEther} 0G
                </div>
                <div className="text-xs text-gray-600 font-mono">Escrowed amount</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: details */}
          <div className="lg:col-span-2 space-y-5">

            {/* Description */}
            <div className="rounded-xl border border-neon-purple/15 bg-bg-card p-5">
              <h2 className="font-mono font-bold text-white mb-3 text-sm">Job Description</h2>
              <p className="text-gray-400 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {request.description}
              </p>
            </div>

            {/* Timeline */}
            <div className="rounded-xl border border-neon-purple/15 bg-bg-card p-5">
              <h2 className="font-mono font-bold text-white mb-4 text-sm flex items-center gap-2">
                <Clock size={14} className="text-neon-purple" />
                Timeline
              </h2>
              <div className="space-y-3">
                {([
                  {
                    label: 'Request Created',
                    time:  request.createdAt,
                    done:  true,
                  },
                  {
                    label: request.status === 'declined' ? 'Declined by Talent' : 'Accepted by Talent',
                    time:  request.acceptedAt,
                    done:  !!request.acceptedAt,
                  },
                  {
                    label: 'Completion Confirmed',
                    time:  request.completedAt,
                    done:  !!request.completedAt,
                  },
                  {
                    label: 'Payment Released',
                    time:  request.releasedAt,
                    done:  !!request.releasedAt,
                  },
                ] as { label: string; time?: number; done: boolean }[]).map(({ label, time, done }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                      {done ? (
                        <CheckCircle size={14} className="text-neon-cyan" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full border border-gray-700" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`font-mono text-xs ${done ? 'text-white' : 'text-gray-600'}`}>
                        {label}
                      </div>
                      {time && (
                        <div className="text-[10px] font-mono text-gray-600">
                          {format(time * 1000, 'MMM d, yyyy HH:mm')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Auto-release info */}
              {autoRelAt && request.status === 'completed' && (
                <div className={`mt-4 p-3 rounded-lg border ${
                  autoRelReady
                    ? 'border-neon-cyan/30 bg-neon-cyan/5 text-neon-cyan'
                    : 'border-yellow-500/20 bg-yellow-500/5 text-yellow-400'
                } text-xs font-mono`}>
                  {autoRelReady
                    ? '✓ Auto-release is now available — anyone can trigger it'
                    : `Auto-release: ${formatDistanceToNow(autoRelAt * 1000, { addSuffix: true })}`}
                </div>
              )}
            </div>

            {/* Payment breakdown */}
            <div className="rounded-xl border border-neon-purple/15 bg-bg-card p-5">
              <h2 className="font-mono font-bold text-white mb-4 text-sm flex items-center gap-2">
                <DollarSign size={14} className="text-neon-purple" />
                Payment Breakdown
              </h2>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Escrowed amount</span>
                  <span className="text-white">{request.amountEther} 0G</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Platform fee (2.5%)</span>
                  <span className="text-yellow-400">- {fee} 0G</span>
                </div>
                <div className="h-px bg-white/5 my-2" />
                <div className="flex justify-between font-bold">
                  <span className="text-gray-300">Talent receives</span>
                  <span className="text-neon-cyan">{netAmt} 0G</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: participants + actions */}
          <div className="space-y-5">

            {/* Participants */}
            <div className="rounded-xl border border-neon-purple/15 bg-bg-card p-5">
              <h2 className="font-mono font-bold text-white mb-4 text-sm">Participants</h2>

              {[
                { label: 'Employer', addr: request.employer, isYou: isEmployer },
                { label: 'Talent',   addr: request.talent,   isYou: isTalent  },
              ].map(({ label, addr, isYou }) => (
                <div key={label} className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center">
                    <User size={13} className="text-neon-purple" />
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 font-mono">
                      {label} {isYou && <span className="text-neon-purple">(you)</span>}
                    </div>
                    <div className="font-mono text-xs text-white">
                      {addr.slice(0, 8)}…{addr.slice(-6)}
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-3 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-600">
                  <Calendar size={9} />
                  Deadline: {format(request.deadline * 1000, 'MMM d, yyyy')}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="rounded-xl border border-neon-purple/15 bg-bg-card p-5">
              <h2 className="font-mono font-bold text-white mb-4 text-sm">Actions</h2>

              <TxStatus state={state} />

              {state.status === 'error' && (
                <button onClick={reset} className="w-full mb-3 py-1.5 font-mono text-xs text-gray-500 hover:text-gray-300 transition-colors">
                  ← Try again
                </button>
              )}

              {state.status === 'confirmed' && (
                <div className="mb-3 p-3 rounded-lg bg-neon-cyan/5 border border-neon-cyan/20 text-neon-cyan text-xs font-mono flex items-center gap-1.5">
                  <CheckCircle size={12} />
                  Transaction confirmed on-chain
                </div>
              )}

              {!isProcessing && (
                <div className="space-y-2">
                  {/* Talent actions on Pending */}
                  {isTalent && request.status === 'pending' && (
                    <>
                      <button
                        onClick={() => doContractAction('hire_accept', 'acceptRequest', 'accepted', { acceptedAt: Math.floor(Date.now()/1000) })}
                        className="w-full py-2.5 rounded-lg font-mono text-sm font-bold bg-gradient-to-r from-neon-cyan to-neon-purple text-bg-primary"
                      >
                        ✓ Accept Request
                      </button>
                      <button
                        onClick={() => doContractAction('hire_decline', 'declineRequest', 'declined')}
                        className="w-full py-2.5 rounded-lg font-mono text-sm border border-red-500/30 text-red-400 hover:bg-red-500/5"
                      >
                        ✗ Decline
                      </button>
                    </>
                  )}

                  {/* Talent actions on Accepted */}
                  {isTalent && request.status === 'accepted' && (
                    <>
                      <button
                        onClick={() => doContractAction('hire_complete', 'confirmCompletion', 'completed', { completedAt: Math.floor(Date.now()/1000), talentConfirmed: true })}
                        className="w-full py-2.5 rounded-lg font-mono text-sm font-bold bg-gradient-to-r from-neon-purple to-neon-cyan text-bg-primary"
                      >
                        ✓ Mark as Complete
                      </button>
                      <button
                        onClick={() => doContractAction('hire_dispute', 'raiseDispute', 'disputed')}
                        className="w-full py-2.5 rounded-lg font-mono text-sm border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/5"
                      >
                        ⚠ Raise Dispute
                      </button>
                    </>
                  )}

                  {/* Employer actions on Accepted/Completed */}
                  {isEmployer && (request.status === 'accepted' || request.status === 'completed') && (
                    <>
                      <button
                        onClick={() => doContractAction('hire_release', 'releasePayment', 'released')}
                        className="w-full py-2.5 rounded-lg font-mono text-sm font-bold bg-gradient-to-r from-neon-cyan to-neon-purple text-bg-primary"
                      >
                        💸 Release Payment
                      </button>
                      <button
                        onClick={() => doContractAction('hire_dispute', 'raiseDispute', 'disputed')}
                        className="w-full py-2.5 rounded-lg font-mono text-sm border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/5"
                      >
                        ⚠ Raise Dispute
                      </button>
                    </>
                  )}

                  {/* Employer can cancel Pending */}
                  {isEmployer && request.status === 'pending' && (
                    <button
                      onClick={() => doContractAction('hire_cancel', 'cancelRequest', 'cancelled')}
                      className="w-full py-2.5 rounded-lg font-mono text-sm border border-red-500/30 text-red-400 hover:bg-red-500/5"
                    >
                      ✗ Cancel & Refund
                    </button>
                  )}

                  {/* Auto-release (anyone) */}
                  {autoRelReady && request.status === 'completed' && (
                    <button
                      onClick={() => doContractAction('hire_release', 'autoRelease', 'released')}
                      className="w-full py-2.5 rounded-lg font-mono text-sm border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/5"
                    >
                      ⏱ Trigger Auto-Release
                    </button>
                  )}

                  {/* Terminal states */}
                  {['released', 'cancelled', 'declined'].includes(request.status) && (
                    <div className="text-center text-xs font-mono text-gray-600 py-2">
                      No further actions available
                    </div>
                  )}

                  {request.status === 'disputed' && (
                    <div className="text-center text-xs font-mono text-yellow-400 py-2">
                      Dispute under review by admin
                    </div>
                  )}
                </div>
              )}

              {/* On-chain notice */}
              {!contractReady && (
                <p className="mt-3 text-[10px] font-mono text-amber-400/60 text-center">
                  Actions update local state only — escrow contract not yet deployed
                </p>
              )}
              {contractReady && request.onChainId === undefined && (
                <p className="mt-3 text-[10px] font-mono text-gray-600 text-center">
                  Legacy record — on-chain ID unavailable
                </p>
              )}
            </div>

            {/* Contract info */}
            {request.contractAddress !== '0x0000000000000000000000000000000000000000' && (
              <div className="rounded-xl border border-neon-purple/10 bg-bg-card p-4">
                <div className="text-[10px] text-gray-600 font-mono mb-1">Escrow Contract</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-400">
                    {request.contractAddress.slice(0, 16)}…
                  </span>
                  <a
                    href={`${networkConfig.explorer}/address/${request.contractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neon-cyan hover:text-neon-purple transition-colors"
                  >
                    <ExternalLink size={11} />
                  </a>
                </div>
                <div className="text-[10px] text-gray-600 font-mono mt-1">
                  {request.onChainId !== undefined
                    ? `On-chain ID: #${request.onChainId}`
                    : `Local ID: ${request.requestId}`}
                </div>
                {state.explorerUrl && (
                  <a
                    href={state.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-neon-cyan hover:underline"
                  >
                    <ExternalLink size={9} />
                    View last tx on explorer
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
