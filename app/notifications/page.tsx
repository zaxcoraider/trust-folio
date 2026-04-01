'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, CheckCircle2, ShoppingBag, Briefcase, Zap, Vote,
  CheckCheck, Filter
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { NeonCard } from '@/components/NeonCard';
import {
  getNotifications, markRead, markAllRead, seedDemoNotifications
} from '@/lib/notification-store';
import type { AppNotification, NotificationType } from '@/lib/types';

type FilterTab = 'all' | 'unread' | 'verifications' | 'sales' | 'governance';

function NotifIcon({ type, size = 18 }: { type: NotificationType; size?: number }) {
  switch (type) {
    case 'verification_complete': return <CheckCircle2 size={size} className="text-neon-cyan" />;
    case 'inft_sold':             return <ShoppingBag size={size} className="text-neon-pink" />;
    case 'offer_received':        return <ShoppingBag size={size} className="text-amber-400" />;
    case 'hire_request':          return <Briefcase size={size} className="text-neon-purple" />;
    case 'escrow_released':       return <Briefcase size={size} className="text-neon-cyan" />;
    case 'governance_proposal':   return <Vote size={size} className="text-neon-purple" />;
    case 'staking_reward':        return <Zap size={size} className="text-amber-400" />;
    case 'trust_earned':          return <Zap size={size} className="text-neon-cyan" />;
    default:                      return <Bell size={size} className="text-gray-400" />;
  }
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function matchesFilter(n: AppNotification, filter: FilterTab): boolean {
  if (filter === 'all') return true;
  if (filter === 'unread') return !n.read;
  if (filter === 'verifications') return n.type === 'verification_complete';
  if (filter === 'sales') return n.type === 'inft_sold' || n.type === 'offer_received';
  if (filter === 'governance') return n.type === 'governance_proposal';
  return true;
}

export default function NotificationsPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');

  const refresh = useCallback(() => {
    if (address) setNotifications(getNotifications(address));
  }, [address]);

  useEffect(() => {
    if (address) {
      seedDemoNotifications(address);
      refresh();
    }
  }, [address, refresh]);

  const handleMarkAllRead = () => {
    if (!address) return;
    markAllRead(address);
    refresh();
  };

  const handleClick = (notif: AppNotification) => {
    if (!address) return;
    markRead(address, notif.id);
    refresh();
    if (notif.link) router.push(notif.link);
  };

  const filtered = notifications.filter((n) => matchesFilter(n, filter));
  const unreadCount = notifications.filter((n) => !n.read).length;

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: `Unread (${unreadCount})` },
    { key: 'verifications', label: 'Verifications' },
    { key: 'sales', label: 'Sales' },
    { key: 'governance', label: 'Governance' },
  ];

  return (
    <div className="relative min-h-screen bg-bg-primary px-4 py-10 page-enter">
      <div className="fixed inset-0 bg-grid opacity-100 pointer-events-none" />

      <div className="relative max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neon-purple/10 border border-neon-purple/20 relative">
              <Bell size={22} className="text-neon-purple" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-neon-pink text-white font-mono text-[10px] font-bold px-1">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="font-mono text-2xl font-bold text-gray-100">Notifications</h1>
              <p className="font-mono text-sm text-gray-500">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 font-mono text-xs px-3 py-1.5 rounded-lg border border-neon-cyan/30 bg-neon-cyan/5 text-neon-cyan hover:bg-neon-cyan/15 transition-all"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
        </div>

        {!isConnected ? (
          <NeonCard glow="purple" className="p-10 text-center">
            <Bell size={36} className="text-gray-600 mx-auto mb-3" />
            <p className="font-mono text-gray-500">Connect your wallet to view notifications.</p>
          </NeonCard>
        ) : (
          <>
            {/* Filter tabs */}
            <div className="flex gap-1 mb-6 border-b border-white/10 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`font-mono text-xs px-4 py-2 -mb-px border-b-2 whitespace-nowrap transition-all duration-200
                    ${filter === tab.key
                      ? 'text-neon-purple border-neon-purple'
                      : 'text-gray-500 border-transparent hover:text-gray-300'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Notification list */}
            {filtered.length === 0 ? (
              <NeonCard glow="none" className="p-12 text-center">
                <Bell size={36} className="text-gray-700 mx-auto mb-3" />
                <p className="font-mono text-gray-600 text-sm">No notifications</p>
                {filter !== 'all' && (
                  <button
                    onClick={() => setFilter('all')}
                    className="font-mono text-xs text-neon-purple hover:underline mt-2 block mx-auto"
                  >
                    View all notifications
                  </button>
                )}
              </NeonCard>
            ) : (
              <div className="space-y-2">
                {filtered.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={`
                      relative flex items-start gap-4 p-4 rounded-xl border cursor-pointer
                      transition-all duration-200 hover:bg-white/3
                      ${notif.read
                        ? 'bg-bg-card border-white/5'
                        : 'bg-neon-purple/5 border-neon-purple/30 border-l-2 border-l-neon-purple'
                      }
                    `}
                  >
                    {/* Unread indicator */}
                    {!notif.read && (
                      <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-neon-purple shadow-neon-purple" />
                    )}

                    {/* Icon */}
                    <div className={`p-2 rounded-lg shrink-0 ${notif.read ? 'bg-white/5' : 'bg-neon-purple/10'}`}>
                      <NotifIcon type={notif.type} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <p className={`font-mono text-sm font-semibold ${notif.read ? 'text-gray-400' : 'text-gray-100'}`}>
                          {notif.title}
                        </p>
                        <span className="font-mono text-xs text-gray-600 shrink-0">{timeAgo(notif.timestamp)}</span>
                      </div>
                      <p className={`font-mono text-xs leading-relaxed ${notif.read ? 'text-gray-600' : 'text-gray-400'}`}>
                        {notif.message}
                      </p>
                      {notif.amount && (
                        <p className="font-mono text-xs text-neon-cyan mt-1">
                          +{notif.amount} TRUST
                        </p>
                      )}
                      {notif.link && (
                        <p className="font-mono text-xs text-neon-purple/60 mt-1">
                          {notif.link}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
