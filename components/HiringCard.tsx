'use client';

import { Briefcase, Clock, CheckCircle, XCircle, AlertTriangle, DollarSign } from 'lucide-react';
import Link from 'next/link';
import type { HiringRequest, HiringStatus } from '@/lib/types';
import { formatDistanceToNow, format } from 'date-fns';

interface HiringCardProps {
  request: HiringRequest;
  role:    'employer' | 'talent';
}

const STATUS_CONFIG: Record<HiringStatus, {
  label:  string;
  color:  string;
  bg:     string;
  border: string;
  icon:   React.ReactNode;
}> = {
  pending:   { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.3)',  icon: <Clock size={12} /> },
  accepted:  { label: 'Active',    color: '#06b6d4', bg: 'rgba(6,182,212,0.08)',   border: 'rgba(6,182,212,0.3)',   icon: <CheckCircle size={12} /> },
  completed: { label: 'Completed', color: '#a855f7', bg: 'rgba(168,85,247,0.08)',  border: 'rgba(168,85,247,0.3)',  icon: <CheckCircle size={12} /> },
  released:  { label: 'Released',  color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.3)',  icon: <CheckCircle size={12} /> },
  disputed:  { label: 'Disputed',  color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.3)',   icon: <AlertTriangle size={12} /> },
  cancelled: { label: 'Cancelled', color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.3)', icon: <XCircle size={12} /> },
  declined:  { label: 'Declined',  color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.3)', icon: <XCircle size={12} /> },
};

export function HiringCard({ request, role }: HiringCardProps) {
  const cfg = STATUS_CONFIG[request.status];
  const counterparty = role === 'employer' ? request.talent : request.employer;
  const counterpartyLabel = role === 'employer' ? 'Talent' : 'Employer';

  return (
    <Link href={`/hire/${request.requestId}`}>
      <div className="group rounded-xl border border-neon-purple/15 bg-bg-card hover:border-neon-purple/40 transition-all duration-200 hover:shadow-neon-purple overflow-hidden">
        {/* Status bar */}
        <div className="h-0.5" style={{ background: cfg.color }} />

        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            {/* Title + icon */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center shrink-0 mt-0.5">
                <Briefcase size={15} className="text-neon-purple" />
              </div>
              <div>
                <div className="font-mono font-bold text-white text-sm leading-tight line-clamp-1">
                  {request.title}
                </div>
                <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                  {counterpartyLabel}: {counterparty.slice(0, 6)}…{counterparty.slice(-4)}
                </div>
              </div>
            </div>

            {/* Status badge */}
            <div
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border"
              style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
            >
              {cfg.icon}
              {cfg.label}
            </div>
          </div>

          {/* Description snippet */}
          <p className="text-xs text-gray-500 font-mono line-clamp-2 mb-3">
            {request.description}
          </p>

          {/* Amount + dates */}
          <div className="flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-1 font-bold" style={{ color: cfg.color }}>
              <DollarSign size={11} />
              {request.amountEther} 0G
            </div>
            <div className="text-gray-600 flex items-center gap-1">
              <Clock size={9} />
              {formatDistanceToNow(request.createdAt * 1000, { addSuffix: true })}
            </div>
          </div>

          {/* Deadline */}
          <div className="mt-2 text-[10px] font-mono text-gray-600">
            Deadline: {format(request.deadline * 1000, 'MMM d, yyyy')}
          </div>

          {/* Progress indicator for active jobs */}
          {request.status === 'accepted' && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <div className="flex justify-between text-[10px] font-mono text-gray-600 mb-1">
                <span>Progress</span>
                <span>In progress</span>
              </div>
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-gradient-to-r from-neon-cyan/60 to-neon-cyan rounded-full animate-pulse" />
              </div>
            </div>
          )}

          {request.status === 'completed' && request.completedAt && (
            <div className="mt-3 pt-3 border-t border-white/5 text-[10px] font-mono text-neon-purple">
              ✓ Talent confirmed completion — awaiting payment release
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
