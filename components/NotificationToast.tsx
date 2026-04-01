'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, CheckCircle2, ShoppingBag, Briefcase, Zap, Bell, Vote } from 'lucide-react';
import type { AppNotification, NotificationType } from '@/lib/types';
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead as markAllReadStore,
  addNotification,
  seedDemoNotifications,
} from '@/lib/notification-store';
import { useAccount } from 'wagmi';

// ── Notification icon map ────────────────────────────────────────────────────

function NotifIcon({ type }: { type: NotificationType }) {
  const cls = 'shrink-0';
  switch (type) {
    case 'verification_complete': return <CheckCircle2 size={18} className={`text-neon-cyan ${cls}`} />;
    case 'inft_sold':             return <ShoppingBag size={18} className={`text-neon-pink ${cls}`} />;
    case 'offer_received':        return <ShoppingBag size={18} className={`text-amber-400 ${cls}`} />;
    case 'hire_request':          return <Briefcase size={18} className={`text-neon-purple ${cls}`} />;
    case 'escrow_released':       return <Briefcase size={18} className={`text-neon-cyan ${cls}`} />;
    case 'governance_proposal':   return <Vote size={18} className={`text-neon-purple ${cls}`} />;
    case 'staking_reward':        return <Zap size={18} className={`text-amber-400 ${cls}`} />;
    case 'trust_earned':          return <Zap size={18} className={`text-neon-cyan ${cls}`} />;
    default:                      return <Bell size={18} className={`text-gray-400 ${cls}`} />;
  }
}

// ── Single Toast ─────────────────────────────────────────────────────────────

interface ToastProps {
  notification: AppNotification;
  onDismiss: () => void;
}

export function NotificationToast({ notification, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Animate in
    const show = setTimeout(() => setVisible(true), 50);

    // Progress bar countdown (5 seconds)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - (100 / 50); // 100 steps over 5s = 100ms/step
      });
    }, 100);

    // Auto-dismiss after 5s
    const dismiss = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 5000);

    return () => {
      clearTimeout(show);
      clearTimeout(dismiss);
      clearInterval(interval);
    };
  }, [onDismiss]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  const glowColor =
    notification.type === 'verification_complete' || notification.type === 'trust_earned' || notification.type === 'escrow_released'
      ? 'border-neon-cyan/50 shadow-neon-cyan'
      : notification.type === 'inft_sold' || notification.type === 'offer_received'
      ? 'border-neon-pink/50 shadow-neon-pink'
      : 'border-neon-purple/50 shadow-neon-purple';

  const progressColor =
    notification.type === 'verification_complete' || notification.type === 'trust_earned'
      ? 'bg-neon-cyan'
      : notification.type === 'inft_sold'
      ? 'bg-neon-pink'
      : 'bg-neon-purple';

  return (
    <div
      className={`
        relative w-80 rounded-xl border bg-bg-card backdrop-blur-sm overflow-hidden
        transition-all duration-300
        ${glowColor}
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
      `}
    >
      {/* Top glow line */}
      <div className={`absolute top-0 left-0 right-0 h-px ${progressColor} opacity-50`} />

      <div className="p-4">
        <div className="flex items-start gap-3">
          <NotifIcon type={notification.type} />
          <div className="flex-1 min-w-0">
            <p className="font-mono text-sm font-semibold text-gray-100 truncate">
              {notification.title}
            </p>
            <p className="font-mono text-xs text-gray-400 mt-0.5 line-clamp-2">
              {notification.message}
            </p>
            {notification.amount && (
              <p className="font-mono text-xs text-neon-cyan mt-1">
                +{notification.amount} TRUST
              </p>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-white/5">
        <div
          className={`h-full ${progressColor} transition-all duration-100 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ── Toast Container ───────────────────────────────────────────────────────────

interface ToastContainerProps {
  toasts: AppNotification[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <NotificationToast
            notification={toast}
            onDismiss={() => onDismiss(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}

// ── useNotifications hook ─────────────────────────────────────────────────────

export function useNotifications() {
  const { address } = useAccount();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastQueue, setToastQueue] = useState<AppNotification[]>([]);

  const refresh = useCallback(() => {
    if (!address) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    const notifs = getNotifications(address);
    setNotifications(notifs);
    setUnreadCount(getUnreadCount(address));
  }, [address]);

  useEffect(() => {
    if (address) {
      seedDemoNotifications(address);
    }
    refresh();
  }, [address, refresh]);

  const showToast = useCallback(
    (notif: Omit<AppNotification, 'id' | 'read' | 'walletAddress'>) => {
      if (!address) return;
      const full = addNotification(address, notif);
      setToastQueue((prev) => [...prev, full].slice(-3)); // max 3
      refresh();
    },
    [address, refresh]
  );

  const dismissToast = useCallback((id: string) => {
    setToastQueue((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const markReadById = useCallback(
    (id: string) => {
      if (!address) return;
      markRead(address, id);
      refresh();
    },
    [address, refresh]
  );

  const markAllReadFn = useCallback(() => {
    if (!address) return;
    markAllReadStore(address);
    refresh();
  }, [address, refresh]);

  return {
    notifications,
    unreadCount,
    toastQueue,
    showToast,
    dismissToast,
    markRead: markReadById,
    markAllRead: markAllReadFn,
    refresh,
  };
}
