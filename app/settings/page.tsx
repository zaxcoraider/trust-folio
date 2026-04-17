'use client';

import {
  useState, useEffect, useCallback, useRef, DragEvent, ChangeEvent,
} from 'react';
import {
  Settings, User, Bell, Eye, Database, Shield, CheckCircle2,
  AlertCircle, X, Upload, Github, Globe, Twitter, MapPin,
  Briefcase, Link2, ChevronRight, Loader2, Save, ExternalLink,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { useWalletClient } from 'wagmi';
import { NeonCard } from '@/components/NeonCard';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { getUserSettings, saveUserSettings } from '@/lib/settings-store';
import { saveProfileTo0G } from '@/lib/profile-store';
import { walletClientToSigner } from '@/lib/wallet-to-signer';
import type {
  UserSettings, ProfileVisibility, SkillLevel,
  HiringAvailability, SkillPillCategory, UploadProgress,
} from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type SettingsTab = 'profile' | 'notifications' | 'privacy' | 'apikeys' | 'account';

// ── Skill catalog ─────────────────────────────────────────────────────────────

const SKILL_CATALOG: Record<Exclude<SkillPillCategory, 'custom'>, {
  label: string; color: string; border: string; bg: string; glow: string; skills: string[];
}> = {
  development: {
    label: 'Development',
    color: '#06b6d4', border: 'rgba(6,182,212,0.4)', bg: 'rgba(6,182,212,0.08)', glow: 'rgba(6,182,212,0.5)',
    skills: ['Solidity', 'JavaScript', 'TypeScript', 'Python', 'Rust', 'React', 'Next.js', 'Node.js'],
  },
  design: {
    label: 'Design',
    color: '#ec4899', border: 'rgba(236,72,153,0.4)', bg: 'rgba(236,72,153,0.08)', glow: 'rgba(236,72,153,0.5)',
    skills: ['UI/UX', 'Graphic Design', '3D Modeling', 'Motion Graphics'],
  },
  writing: {
    label: 'Writing',
    color: '#a855f7', border: 'rgba(168,85,247,0.4)', bg: 'rgba(168,85,247,0.08)', glow: 'rgba(168,85,247,0.5)',
    skills: ['Technical Writing', 'Content Creation', 'Copywriting', 'Research'],
  },
  blockchain: {
    label: 'Blockchain',
    color: '#f59e0b', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)', glow: 'rgba(245,158,11,0.5)',
    skills: ['Smart Contracts', 'DeFi', 'NFTs', 'DAOs', 'Tokenomics', 'Security Auditing'],
  },
  aiml: {
    label: 'AI/ML',
    color: '#22c55e', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)', glow: 'rgba(34,197,94,0.5)',
    skills: ['Machine Learning', 'NLP', 'Computer Vision', 'Data Science'],
  },
};

const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner:     'Beginner',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
  expert:       'Expert',
};

const HIRING_OPTIONS: { value: HiringAvailability; label: string; color: string; dot: string }[] = [
  { value: 'available',       label: 'Available',       color: '#22c55e', dot: 'bg-emerald-400' },
  { value: 'open-to-offers',  label: 'Open to Offers',  color: '#f59e0b', dot: 'bg-amber-400'   },
  { value: 'not-available',   label: 'Not Available',   color: '#6b7280', dot: 'bg-gray-500'    },
];

// ── Small components ──────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-10 h-5 rounded-full transition-all duration-300 focus:outline-none
        ${on ? 'bg-neon-purple shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'bg-white/10'}`}
    >
      <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300
        ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function InputField({
  label, value, onChange, placeholder = '', icon: Icon, maxLength, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; icon?: React.ElementType; maxLength?: number; type?: string;
}) {
  return (
    <div>
      <label className="block font-mono text-xs text-gray-400 mb-1.5">{label}</label>
      <div className="relative">
        {Icon && <Icon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`w-full bg-bg-primary border border-white/8 rounded-lg py-2.5 font-mono text-sm text-gray-200
            placeholder-gray-700 focus:outline-none focus:border-neon-purple/50
            focus:shadow-[0_0_12px_rgba(168,85,247,0.12)] transition-all
            ${Icon ? 'pl-9 pr-4' : 'px-4'}`}
        />
      </div>
    </div>
  );
}

// ── Skill pill ────────────────────────────────────────────────────────────────

function SkillPill({
  skill, category, level, onRemove, onLevelChange, dragging,
  onDragStart, onDragOver, onDragEnd,
}: {
  skill:         string;
  category:      SkillPillCategory;
  level:         SkillLevel;
  onRemove:      () => void;
  onLevelChange: (l: SkillLevel) => void;
  dragging:      boolean;
  onDragStart:   (e: DragEvent) => void;
  onDragOver:    (e: DragEvent) => void;
  onDragEnd:     () => void;
}) {
  const cfg = category !== 'custom' ? SKILL_CATALOG[category] : {
    color: '#94a3b8', border: 'rgba(148,163,184,0.3)', bg: 'rgba(148,163,184,0.06)', glow: 'rgba(148,163,184,0.3)',
  };
  const isExpert = level === 'expert';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-full font-mono text-xs cursor-grab active:cursor-grabbing
        transition-all duration-150 select-none
        ${dragging ? 'opacity-40 scale-95' : 'opacity-100'}`}
      style={{
        border:     `1px solid ${cfg.border}`,
        background: cfg.bg,
        color:      cfg.color,
        boxShadow:  isExpert ? `0 0 8px ${cfg.glow}, 0 0 16px ${cfg.glow.replace('0.5', '0.2')}` : undefined,
      }}
    >
      <span className="cursor-grab text-gray-600 text-[10px] mr-0.5">⣿</span>
      <span>{skill}</span>
      <select
        value={level}
        onChange={(e) => onLevelChange(e.target.value as SkillLevel)}
        onClick={(e) => e.stopPropagation()}
        className="bg-transparent text-[9px] uppercase tracking-wide outline-none cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
        style={{ color: cfg.color }}
      >
        {(Object.keys(SKILL_LEVEL_LABELS) as SkillLevel[]).map((l) => (
          <option key={l} value={l} className="bg-bg-primary text-gray-300">
            {SKILL_LEVEL_LABELS[l]}
          </option>
        ))}
      </select>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="ml-0.5 rounded-full hover:bg-white/10 p-0.5 transition-colors opacity-0 group-hover:opacity-100"
      >
        <X size={10} />
      </button>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ progress }: { progress: UploadProgress }) {
  const colors = {
    hashing:    '#a855f7',
    wallet:     '#a855f7',
    uploading:  '#06b6d4',
    confirming: '#f59e0b',
    verifying:  '#a855f7',
    done:       '#22c55e',
    error:      '#ef4444',
  };
  const color = colors[progress.stage] ?? '#a855f7';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-gray-500">{progress.message}</span>
        <span className="font-mono text-[10px]" style={{ color }}>{progress.percent}%</span>
      </div>
      <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress.percent}%`, background: color, boxShadow: `0 0 6px ${color}` }}
        />
      </div>
    </div>
  );
}

// ── Live preview ──────────────────────────────────────────────────────────────

function ProfilePreview({
  settings, address, avatarPreview,
}: {
  settings: UserSettings; address: string; avatarPreview: string | null;
}) {
  const hiring = HIRING_OPTIONS.find((o) => o.value === settings.hiringStatus);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(12,12,22,0.9)', border: '1px solid rgba(168,85,247,0.15)' }}
    >
      {/* Banner */}
      <div
        className="h-16"
        style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(6,182,212,0.2), rgba(236,72,153,0.15))' }}
      />

      {/* Avatar + name */}
      <div className="px-5 pb-5">
        <div className="-mt-8 mb-3">
          <ProfileAvatar
            address={address}
            avatarHash={settings.avatarHash}
            previewDataUrl={avatarPreview ?? undefined}
            size={64}
            showGlow
          />
        </div>

        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <h3 className="font-mono text-base font-bold text-gray-100">
              {settings.displayName || address.slice(0, 6) + '…' + address.slice(-4)}
            </h3>
            {settings.title && (
              <p className="font-mono text-xs text-neon-purple mt-0.5">{settings.title}</p>
            )}
          </div>
          {hiring && (
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] border"
              style={{ color: hiring.color, borderColor: hiring.color + '44', background: hiring.color + '11' }}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${hiring.dot}`} />
              {hiring.label}
            </span>
          )}
        </div>

        {settings.bio && (
          <p className="font-mono text-xs text-gray-400 mt-3 leading-relaxed line-clamp-3">
            {settings.bio}
          </p>
        )}

        {/* Skills preview */}
        {settings.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {settings.skills.slice(0, 8).map((skill) => {
              const cat = settings.skillCategories?.[skill];
              const cfg = cat && cat !== 'custom' ? SKILL_CATALOG[cat] : {
                color: '#94a3b8', border: 'rgba(148,163,184,0.3)', bg: 'rgba(148,163,184,0.06)',
              };
              const lvl = settings.expertiseLevels?.[skill];
              return (
                <span
                  key={skill}
                  className="px-2 py-0.5 rounded-full font-mono text-[10px]"
                  style={{
                    color:      cfg.color,
                    border:     `1px solid ${cfg.border}`,
                    background: cfg.bg,
                    boxShadow:  lvl === 'expert' ? `0 0 6px ${cfg.border}` : undefined,
                  }}
                >
                  {skill}
                </span>
              );
            })}
            {settings.skills.length > 8 && (
              <span className="px-2 py-0.5 rounded-full font-mono text-[10px] text-gray-600 border border-white/5">
                +{settings.skills.length - 8}
              </span>
            )}
          </div>
        )}

        {/* Social links preview */}
        <div className="flex flex-wrap gap-3 mt-3">
          {settings.website && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-neon-cyan/60">
              <Globe size={10} />{settings.website.replace(/^https?:\/\//, '')}
            </span>
          )}
          {settings.github && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-gray-500">
              <Github size={10} />{settings.github}
            </span>
          )}
          {settings.twitter && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-gray-500">
              <Twitter size={10} />@{settings.twitter.replace(/^@/, '')}
            </span>
          )}
          {settings.location && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-gray-500">
              <MapPin size={10} />{settings.location}
            </span>
          )}
        </div>

        {/* Profile hash */}
        {settings.profileRootHash && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="font-mono text-[9px] text-gray-700">
              0G Storage · {settings.profileRootHash.slice(0, 10)}…{settings.profileRootHash.slice(-8)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════

export default function SettingsPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient }   = useWalletClient();

  const [activeTab, setActiveTab]         = useState<SettingsTab>('profile');
  const [settings, setSettings]           = useState<UserSettings | null>(null);
  const [hasUnsaved, setHasUnsaved]       = useState(false);

  // Save state
  const [saving, setSaving]               = useState(false);
  const [saveProgress, setSaveProgress]   = useState<UploadProgress | null>(null);
  const [saved, setSaved]                 = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  // Avatar state
  const [avatarPreview,    setAvatarPreview]    = useState<string | null>(null);
  const [avatarFile,       setAvatarFile]       = useState<File | null>(null);
  const [compressedBlob,   setCompressedBlob]   = useState<Blob | null>(null);
  const [compressedKB,     setCompressedKB]     = useState<number | null>(null);
  const [avatarUploading,  setAvatarUploading]  = useState(false);
  const [avatarProgress,   setAvatarProgress]   = useState<UploadProgress | null>(null);
  const [isDraggingOver,   setIsDraggingOver]   = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Skills state
  const [skillsTab, setSkillsTab]         = useState<Exclude<SkillPillCategory, 'custom'>>('development');
  const [customInput, setCustomInput]     = useState('');
  const [dragSkillIdx, setDragSkillIdx]   = useState<number | null>(null);

  // Misc
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────

  const loadSettings = useCallback(() => {
    if (address) setSettings(getUserSettings(address));
  }, [address]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  // Unsaved changes warning
  useEffect(() => {
    if (!hasUnsaved) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsaved]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const update = (patch: Partial<UserSettings>) => {
    setSettings((prev) => prev ? { ...prev, ...patch } : prev);
    setHasUnsaved(true);
  };

  // ── Avatar helpers ───────────────────────────────────────────────────────────

  /** Compress an image blob to 150×150 JPEG, targeting ≤ 50 KB. */
  async function compressImage(src: string): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 150; // 150×150 — plenty for a profile pic, tiny on 0G
        const canvas = document.createElement('canvas');
        canvas.width  = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d')!;
        // Cover crop: fill the square without distorting
        const ratio = Math.max(SIZE / img.width, SIZE / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);

        // Try progressively lower quality until ≤ 50 KB or quality floor reached
        const tryQuality = (q: number) => {
          canvas.toBlob((blob) => {
            if (!blob) { reject(new Error('Compression failed')); return; }
            if (blob.size <= 50 * 1024 || q <= 0.3) {
              resolve(blob);
            } else {
              tryQuality(parseFloat((q - 0.1).toFixed(1)));
            }
          }, 'image/jpeg', q);
        };
        tryQuality(0.7);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  function processAvatarFile(file: File) {
    if (!file.type.match(/^image\/(jpeg|png|gif|webp)$/)) {
      setError('Only JPG, PNG, GIF, or WebP images allowed');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10 MB');
      return;
    }
    setError(null);
    setAvatarFile(file);
    setCompressedBlob(null);
    setCompressedKB(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      setAvatarPreview(dataUrl);
      try {
        const blob = await compressImage(dataUrl);
        setCompressedBlob(blob);
        setCompressedKB(Math.ceil(blob.size / 1024));
      } catch {
        // Non-fatal — will compress again on upload
      }
    };
    reader.readAsDataURL(file);
  }

  function handleAvatarInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processAvatarFile(file);
  }

  function handleAvatarDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processAvatarFile(file);
  }

  async function uploadAvatar() {
    if (!avatarFile || !settings) return;
    setAvatarUploading(true);
    setAvatarProgress(null);
    setError(null);
    try {
      // Re-use the already-compressed blob, or compress now if not ready yet
      let blob = compressedBlob;
      if (!blob) {
        setAvatarProgress({ stage: 'hashing', percent: 15, message: 'Compressing image…' });
        blob = await compressImage(avatarPreview!);
      }

      const compressedFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      setAvatarProgress({ stage: 'uploading', percent: 40, message: `Uploading ${Math.ceil(blob.size / 1024)} KB to 0G Storage…` });

      const formData = new FormData();
      formData.append('file', compressedFile);
      const res  = await fetch('/api/upload', { method: 'POST', body: formData });
      const text = await res.text();
      let data: { rootHash?: string; error?: string };
      try { data = JSON.parse(text); } catch { throw new Error(`Server error: ${text.slice(0, 200)}`); }
      if (!res.ok) throw new Error(data.error || 'Avatar upload failed');
      const rootHash = data.rootHash!;

      // Cache locally for fast display
      if (avatarPreview) {
        const { setCachedAvatarDataUrl } = await import('@/lib/profile-store');
        setCachedAvatarDataUrl(rootHash, avatarPreview);
      }

      setAvatarProgress({ stage: 'done', percent: 100, message: 'Avatar uploaded to 0G Storage!' });
      update({ avatarHash: rootHash });
      saveUserSettings({ ...settings, avatarHash: rootHash });
      setAvatarFile(null);
      setCompressedBlob(null);
      setCompressedKB(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Avatar upload failed');
    } finally {
      setAvatarUploading(false);
      setAvatarProgress(null);
    }
  }

  // ── Skills ──────────────────────────────────────────────────────────────────

  function addSkill(skill: string, category: SkillPillCategory) {
    if (!settings) return;
    const s = skill.trim();
    if (!s || settings.skills.includes(s)) return;
    if (settings.skills.length >= 15) {
      setError('Maximum 15 skills allowed');
      return;
    }
    update({
      skills:          [...settings.skills, s],
      skillCategories: { ...settings.skillCategories, [s]: category },
      expertiseLevels: { ...settings.expertiseLevels, [s]: 'intermediate' as SkillLevel },
    });
  }

  function removeSkill(skill: string) {
    if (!settings) return;
    const cats   = { ...settings.skillCategories };
    const levels = { ...settings.expertiseLevels };
    delete cats[skill];
    delete levels[skill];
    update({
      skills:          settings.skills.filter((s) => s !== skill),
      skillCategories: cats,
      expertiseLevels: levels,
    });
  }

  function setLevel(skill: string, level: SkillLevel) {
    if (!settings) return;
    update({ expertiseLevels: { ...settings.expertiseLevels, [skill]: level } });
  }

  function handleSkillDragOver(e: DragEvent, toIdx: number) {
    e.preventDefault();
    if (dragSkillIdx === null || dragSkillIdx === toIdx || !settings) return;
    const arr   = [...settings.skills];
    const [item] = arr.splice(dragSkillIdx, 1);
    arr.splice(toIdx, 0, item);
    setSettings((prev) => prev ? { ...prev, skills: arr } : prev);
    setDragSkillIdx(toIdx);
    setHasUnsaved(true);
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!settings || !address || !walletClient) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    setSaveProgress(null);
    try {
      // Always persist locally first
      saveUserSettings(settings);

      // Save profile JSON to 0G Storage
      const signer    = await walletClientToSigner(walletClient);
      const rootHash  = await saveProfileTo0G(settings, signer, (p) => setSaveProgress(p));
      const updated   = { ...settings, profileRootHash: rootHash };
      saveUserSettings(updated);
      setSettings(updated);

      setHasUnsaved(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 5000);
    } catch (err) {
      // Fallback: save locally even if 0G fails
      saveUserSettings(settings);
      setError(
        `0G upload failed (saved locally): ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setSaving(false);
      setSaveProgress(null);
    }
  }

  async function handleLocalSave() {
    if (!settings) return;
    saveUserSettings(settings);
    setHasUnsaved(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  // ── Data tab ─────────────────────────────────────────────────────────────────

  function handleExportData() {
    if (typeof window === 'undefined') return;
    const data: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try { data[key] = JSON.parse(localStorage.getItem(key) || ''); }
        catch { data[key] = localStorage.getItem(key); }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'trustfolio-data.json'; a.click();
    URL.revokeObjectURL(url);
  }

  function handleDeleteAccount() {
    if (typeof window === 'undefined' || !address) return;
    const prefix = address.toLowerCase();
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.includes(prefix)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    setShowDeleteConfirm(false);
    loadSettings();
  }

  // ── Guard ───────────────────────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <div className="relative min-h-screen bg-bg-primary px-4 py-10 page-enter">
        <div className="fixed inset-0 bg-grid opacity-100 pointer-events-none" />
        <div className="relative max-w-2xl mx-auto text-center pt-24">
          <Shield size={40} className="text-gray-700 mx-auto mb-4" />
          <h1 className="font-mono text-xl font-bold text-gray-100 mb-2">Connect Wallet</h1>
          <p className="font-mono text-sm text-gray-500">Connect your wallet to access settings.</p>
        </div>
      </div>
    );
  }
  if (!settings) return null;

  // ── Sidebar tabs ─────────────────────────────────────────────────────────────

  const TABS: { key: SettingsTab; label: string; icon: React.ElementType }[] = [
    { key: 'profile',       label: 'Profile',       icon: User      },
    { key: 'notifications', label: 'Notifications', icon: Bell      },
    { key: 'privacy',       label: 'Privacy',       icon: Eye       },
    { key: 'apikeys',       label: 'API Keys',      icon: Link2     },
    { key: 'account',       label: 'Account',       icon: Database  },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="relative min-h-screen bg-bg-primary px-4 py-10 page-enter">
      <div className="fixed inset-0 bg-grid opacity-100 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-neon-purple/10 border border-neon-purple/20">
            <Settings size={20} className="text-neon-purple" />
          </div>
          <div>
            <h1 className="font-mono text-2xl font-bold text-gray-100">Settings</h1>
            <p className="font-mono text-xs text-gray-600">
              Manage your profile, preferences and privacy
            </p>
          </div>
          {hasUnsaved && (
            <span className="ml-auto font-mono text-[10px] text-amber-400/80 border border-amber-400/20 rounded-md px-2 py-1">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex gap-6">

          {/* ── Sidebar ── */}
          <aside className="hidden lg:flex flex-col gap-1 w-48 shrink-0">
            <div
              className="rounded-xl p-2"
              style={{ background: 'rgba(15,15,26,0.8)', border: '1px solid rgba(168,85,247,0.12)' }}
            >
              {TABS.map((tab) => {
                const Icon    = tab.icon;
                const active  = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-mono text-xs
                      transition-all duration-150 text-left
                      ${active
                        ? 'text-neon-purple bg-neon-purple/10 border border-neon-purple/20'
                        : 'text-gray-500 border border-transparent hover:text-gray-300 hover:bg-white/3'
                      }`}
                  >
                    <Icon size={13} />
                    {tab.label}
                    {active && <ChevronRight size={11} className="ml-auto" />}
                  </button>
                );
              })}
            </div>

            {/* Profile link */}
            <a
              href={`/profile/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-xs text-gray-600
                hover:text-neon-cyan hover:bg-neon-cyan/5 transition-all border border-transparent
                hover:border-neon-cyan/15 mt-1"
            >
              <ExternalLink size={11} />
              View public profile
            </a>
          </aside>

          {/* Mobile tabs */}
          <div className="lg:hidden w-full mb-4">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {TABS.map((tab) => {
                const Icon   = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-xs whitespace-nowrap
                      transition-all shrink-0
                      ${active
                        ? 'text-neon-purple bg-neon-purple/10 border border-neon-purple/25'
                        : 'text-gray-500 border border-transparent hover:text-gray-300'
                      }`}
                  >
                    <Icon size={12} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Main content ── */}
          <main className="flex-1 min-w-0">

            {/* ─────────────────────── PROFILE TAB ─────────────────────────── */}
            {activeTab === 'profile' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* ── Left: Form ── */}
                <div className="space-y-5">

                  {/* Alerts */}
                  {error && (
                    <div className="p-3 rounded-xl bg-neon-pink/8 border border-neon-pink/25 flex items-start gap-2">
                      <AlertCircle size={13} className="text-neon-pink mt-0.5 shrink-0" />
                      <p className="font-mono text-xs text-neon-pink">{error}</p>
                      <button onClick={() => setError(null)} className="ml-auto text-neon-pink/50 hover:text-neon-pink"><X size={12} /></button>
                    </div>
                  )}
                  {saved && (
                    <div className="p-3 rounded-xl bg-emerald-400/8 border border-emerald-400/25 flex items-center gap-2">
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      <p className="font-mono text-xs text-emerald-400">Profile saved to decentralized storage!</p>
                    </div>
                  )}

                  {/* ── Avatar ── */}
                  <NeonCard glow="purple" className="p-5">
                    <h3 className="font-mono text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                      Profile Picture
                    </h3>
                    <div className="flex items-start gap-5">
                      {/* Upload zone */}
                      <div
                        className={`relative cursor-pointer transition-all duration-200 rounded-full shrink-0
                          ${isDraggingOver ? 'scale-105' : ''}`}
                        style={{
                          border: isDraggingOver
                            ? '2px dashed rgba(168,85,247,0.8)'
                            : avatarPreview || settings.avatarHash
                              ? '2px solid rgba(168,85,247,0.4)'
                              : '2px dashed rgba(168,85,247,0.3)',
                          boxShadow: isDraggingOver ? '0 0 20px rgba(168,85,247,0.3)' : undefined,
                          padding: '3px',
                          borderRadius: '50%',
                        }}
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                        onDragLeave={() => setIsDraggingOver(false)}
                        onDrop={handleAvatarDrop}
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        <ProfileAvatar
                          address={address!}
                          avatarHash={settings.avatarHash}
                          previewDataUrl={avatarPreview ?? undefined}
                          size={80}
                          showGlow={!!avatarPreview || !!settings.avatarHash}
                        />
                        {/* Hover overlay */}
                        <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 hover:opacity-100
                          flex items-center justify-center transition-opacity text-white font-mono text-[9px] text-center">
                          Change
                        </div>
                      </div>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={handleAvatarInputChange}
                      />

                      <div className="flex-1 space-y-2">
                        <p className="font-mono text-xs text-gray-500">
                          JPG, PNG, GIF, WebP — any size
                        </p>
                        <p className="font-mono text-[10px] text-gray-600">
                          Auto-compressed to 150×150 px · stays under ~50 KB on 0G
                        </p>
                        <p className="font-mono text-[10px] text-gray-700">
                          Drag & drop onto the avatar or click to browse
                        </p>

                        {/* Compressed size preview */}
                        {avatarFile && compressedKB !== null && !avatarUploading && (
                          <p className="font-mono text-[10px] text-neon-cyan">
                            Compressed: {compressedKB} KB — ready to upload
                          </p>
                        )}
                        {avatarFile && compressedKB === null && !avatarUploading && (
                          <p className="font-mono text-[10px] text-gray-600 flex items-center gap-1">
                            <Loader2 size={9} className="animate-spin" />
                            Compressing…
                          </p>
                        )}

                        {avatarProgress && <ProgressBar progress={avatarProgress} />}

                        {avatarFile && !avatarUploading && (
                          <button
                            onClick={uploadAvatar}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs
                              text-neon-purple border border-neon-purple/30 bg-neon-purple/8
                              hover:bg-neon-purple/15 transition-all"
                          >
                            <Upload size={12} />
                            Upload to 0G Storage
                          </button>
                        )}
                        {avatarUploading && (
                          <div className="flex items-center gap-2 font-mono text-xs text-gray-500">
                            <Loader2 size={12} className="animate-spin" />
                            Uploading…
                          </div>
                        )}
                        {settings.avatarHash && !avatarFile && (
                          <p className="font-mono text-[9px] text-gray-700">
                            0G · {settings.avatarHash.slice(0, 10)}…{settings.avatarHash.slice(-6)}
                          </p>
                        )}
                      </div>
                    </div>
                  </NeonCard>

                  {/* ── Identity ── */}
                  <NeonCard glow="purple" className="p-5">
                    <h3 className="font-mono text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                      Identity
                    </h3>
                    <div className="space-y-4">
                      <InputField
                        label="Display Name"
                        value={settings.displayName}
                        onChange={(v) => update({ displayName: v })}
                        placeholder="Your name or handle"
                        maxLength={50}
                        icon={User}
                      />
                      <InputField
                        label="Title / Role"
                        value={settings.title ?? ''}
                        onChange={(v) => update({ title: v })}
                        placeholder="e.g. Senior Solidity Developer"
                        maxLength={80}
                        icon={Briefcase}
                      />
                      <InputField
                        label="Location"
                        value={settings.location ?? ''}
                        onChange={(v) => update({ location: v })}
                        placeholder="City, Country (optional)"
                        maxLength={60}
                        icon={MapPin}
                      />
                    </div>
                  </NeonCard>

                  {/* ── Bio ── */}
                  <NeonCard glow="purple" className="p-5">
                    <h3 className="font-mono text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                      Bio
                    </h3>
                    <textarea
                      value={settings.bio}
                      onChange={(e) => update({ bio: e.target.value.slice(0, 500) })}
                      rows={4}
                      placeholder="Tell the community about yourself, your expertise, and what you're building…"
                      className="w-full bg-bg-primary border border-white/8 rounded-xl px-4 py-3 font-mono text-sm
                        text-gray-200 placeholder-gray-700 focus:outline-none focus:border-neon-purple/50
                        focus:shadow-[0_0_12px_rgba(168,85,247,0.1)] transition-all resize-none leading-relaxed"
                    />
                    <div className="flex justify-between mt-1.5">
                      <span className="font-mono text-[10px] text-gray-700">
                        Supports plain text. Saved to 0G Storage.
                      </span>
                      <span className={`font-mono text-[10px] ${settings.bio.length > 450 ? 'text-amber-400' : 'text-gray-700'}`}>
                        {settings.bio.length} / 500
                      </span>
                    </div>
                  </NeonCard>

                  {/* ── Social Links ── */}
                  <NeonCard glow="purple" className="p-5">
                    <h3 className="font-mono text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                      Social Links
                    </h3>
                    <div className="space-y-4">
                      <InputField
                        label="Website"
                        value={settings.website ?? ''}
                        onChange={(v) => update({ website: v })}
                        placeholder="https://yoursite.com"
                        icon={Globe}
                      />
                      <InputField
                        label="GitHub"
                        value={settings.github ?? ''}
                        onChange={(v) => update({ github: v })}
                        placeholder="username"
                        icon={Github}
                      />
                      <InputField
                        label="Twitter / X"
                        value={settings.twitter ?? ''}
                        onChange={(v) => update({ twitter: v.replace(/^@/, '') })}
                        placeholder="handle (without @)"
                        icon={Twitter}
                      />
                      <InputField
                        label="Portfolio URL"
                        value={settings.portfolioUrl ?? ''}
                        onChange={(v) => update({ portfolioUrl: v })}
                        placeholder="https://portfolio.com"
                        icon={Link2}
                      />
                    </div>
                  </NeonCard>

                  {/* ── Skills ── */}
                  <NeonCard glow="purple" className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-mono text-xs font-semibold text-gray-400 uppercase tracking-widest">
                        Skills & Expertise
                      </h3>
                      <span className={`font-mono text-[10px] ${settings.skills.length >= 15 ? 'text-amber-400' : 'text-gray-700'}`}>
                        {settings.skills.length} / 15
                      </span>
                    </div>

                    {/* Current skill pills (drag-to-reorder) */}
                    {settings.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-xl border border-white/5 bg-white/2 min-h-[44px]">
                        {settings.skills.map((skill, i) => (
                          <SkillPill
                            key={skill}
                            skill={skill}
                            category={settings.skillCategories?.[skill] ?? 'custom'}
                            level={settings.expertiseLevels?.[skill] ?? 'intermediate'}
                            onRemove={() => removeSkill(skill)}
                            onLevelChange={(l) => setLevel(skill, l)}
                            dragging={dragSkillIdx === i}
                            onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragSkillIdx(i); }}
                            onDragOver={(e) => handleSkillDragOver(e, i)}
                            onDragEnd={() => setDragSkillIdx(null)}
                          />
                        ))}
                      </div>
                    )}

                    {/* Category selector tabs */}
                    <div className="flex gap-1 mb-3 flex-wrap">
                      {(Object.keys(SKILL_CATALOG) as Array<Exclude<SkillPillCategory, 'custom'>>).map((cat) => {
                        const cfg    = SKILL_CATALOG[cat];
                        const active = skillsTab === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setSkillsTab(cat)}
                            className="px-2.5 py-1 rounded-lg font-mono text-[10px] transition-all border"
                            style={active
                              ? { color: cfg.color, borderColor: cfg.border, background: cfg.bg }
                              : { color: '#6b7280', borderColor: 'transparent' }
                            }
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Predefined skill chips */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {SKILL_CATALOG[skillsTab].skills.map((skill) => {
                        const already = settings.skills.includes(skill);
                        const cfg     = SKILL_CATALOG[skillsTab];
                        return (
                          <button
                            key={skill}
                            disabled={already || settings.skills.length >= 15}
                            onClick={() => addSkill(skill, skillsTab)}
                            className="px-2.5 py-1 rounded-full font-mono text-xs transition-all border
                              disabled:opacity-30 disabled:cursor-not-allowed"
                            style={already
                              ? { color: cfg.color, borderColor: cfg.border, background: cfg.bg, opacity: 0.4 }
                              : { color: '#6b7280', borderColor: 'rgba(255,255,255,0.08)', background: 'transparent' }
                            }
                          >
                            {already ? '✓ ' : '+ '}{skill}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom skill input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(customInput, 'custom'); setCustomInput(''); } }}
                        placeholder="Add custom skill…"
                        className="flex-1 bg-bg-primary border border-white/8 rounded-lg px-3 py-2 font-mono text-xs
                          text-gray-300 placeholder-gray-700 focus:outline-none focus:border-neon-purple/40 transition-all"
                      />
                      <button
                        onClick={() => { addSkill(customInput, 'custom'); setCustomInput(''); }}
                        disabled={!customInput.trim() || settings.skills.length >= 15}
                        className="px-3 py-2 rounded-lg font-mono text-xs border border-neon-purple/25 text-neon-purple
                          bg-neon-purple/8 hover:bg-neon-purple/15 disabled:opacity-30 transition-all"
                      >
                        Add
                      </button>
                    </div>
                  </NeonCard>

                  {/* ── Hiring Status ── */}
                  <NeonCard glow="purple" className="p-5">
                    <h3 className="font-mono text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                      Hiring Availability
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {HIRING_OPTIONS.map((opt) => {
                        const active = settings.hiringStatus === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => update({ hiringStatus: opt.value })}
                            className="flex flex-col items-center gap-2 px-3 py-3 rounded-xl font-mono text-xs
                              transition-all border"
                            style={active
                              ? { color: opt.color, borderColor: opt.color + '55', background: opt.color + '11' }
                              : { color: '#6b7280', borderColor: 'rgba(255,255,255,0.06)', background: 'transparent' }
                            }
                          >
                            <span className={`w-2.5 h-2.5 rounded-full ${opt.dot}`}
                              style={{ boxShadow: active ? `0 0 6px ${opt.color}` : undefined }} />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </NeonCard>

                  {/* ── Save buttons ── */}
                  <div className="space-y-2">
                    {saveProgress && <ProgressBar progress={saveProgress} />}

                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full flex items-center justify-center gap-2 font-mono text-sm py-3.5 rounded-xl
                        border transition-all duration-200 disabled:opacity-50"
                      style={saved
                        ? { color: '#22c55e', borderColor: 'rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.08)' }
                        : {
                            color: '#a855f7',
                            borderColor: 'rgba(168,85,247,0.4)',
                            background: 'rgba(168,85,247,0.08)',
                            boxShadow: saving ? 'none' : '0 0 16px rgba(168,85,247,0.15)',
                          }
                      }
                    >
                      {saving ? (
                        <><Loader2 size={16} className="animate-spin" /> Saving to 0G Storage…</>
                      ) : saved ? (
                        <><CheckCircle2 size={16} /> Saved to decentralized storage!</>
                      ) : (
                        <><Save size={16} /> Save Profile to 0G Storage</>
                      )}
                    </button>

                    <button
                      onClick={handleLocalSave}
                      disabled={saving}
                      className="w-full font-mono text-xs py-2 rounded-xl border border-white/8 text-gray-600
                        hover:text-gray-400 hover:border-white/15 transition-all"
                    >
                      Save locally only (no 0G upload)
                    </button>
                  </div>
                </div>

                {/* ── Right: Live Preview ── */}
                <div className="hidden xl:block">
                  <div className="sticky top-20 space-y-3">
                    <p className="font-mono text-xs text-gray-600 uppercase tracking-widest">
                      Public profile preview
                    </p>
                    <ProfilePreview
                      settings={settings}
                      address={address!}
                      avatarPreview={avatarPreview}
                    />
                    <p className="font-mono text-[10px] text-gray-700 text-center">
                      This is how others see your profile
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ─────────────────────── NOTIFICATIONS TAB ──────────────────── */}
            {activeTab === 'notifications' && (
              <NeonCard glow="purple" className="p-6">
                <h2 className="font-mono text-sm font-semibold text-gray-300 mb-5">
                  Notification Preferences
                </h2>
                {saved && (
                  <div className="mb-4 p-3 rounded-xl bg-emerald-400/8 border border-emerald-400/25 flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <p className="font-mono text-xs text-emerald-400">Preferences saved!</p>
                  </div>
                )}
                <div className="space-y-3">
                  {([
                    { key: 'verifications', label: 'Verifications',  desc: 'When your portfolio file is AI-verified' },
                    { key: 'sales',         label: 'Sales & Offers', desc: 'When your INFT is sold or you receive an offer' },
                    { key: 'hires',         label: 'Hire Requests',  desc: 'When someone requests to hire you' },
                    { key: 'governance',    label: 'Governance',     desc: 'New proposals and voting deadlines' },
                    { key: 'rewards',       label: 'Rewards',        desc: 'TRUST token earnings and staking rewards' },
                  ] as const).map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/5
                        bg-white/2 hover:bg-white/4 transition-colors"
                    >
                      <div>
                        <p className="font-mono text-sm text-gray-200">{item.label}</p>
                        <p className="font-mono text-xs text-gray-600 mt-0.5">{item.desc}</p>
                      </div>
                      <Toggle
                        on={settings.notifications[item.key]}
                        onToggle={() => update({
                          notifications: { ...settings.notifications, [item.key]: !settings.notifications[item.key] },
                        })}
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleLocalSave}
                  disabled={saving}
                  className="w-full mt-5 font-mono text-sm py-3 rounded-xl border border-neon-purple/30
                    bg-neon-purple/8 text-neon-purple hover:bg-neon-purple/15 disabled:opacity-40 transition-all"
                >
                  Save Preferences
                </button>
              </NeonCard>
            )}

            {/* ─────────────────────── PRIVACY TAB ────────────────────────── */}
            {activeTab === 'privacy' && (
              <NeonCard glow="purple" className="p-6">
                <h2 className="font-mono text-sm font-semibold text-gray-300 mb-5">
                  Profile Visibility
                </h2>
                <div className="space-y-3 mb-5">
                  {([
                    { value: 'public',         label: 'Public',        desc: 'Anyone can view your profile, verifications, and INFTs.' },
                    { value: 'verified-only',  label: 'Verified Only', desc: 'Only users with at least one verified credential can view your profile.' },
                    { value: 'private',        label: 'Private',       desc: 'Your profile is hidden from search and public listings.' },
                  ] as { value: ProfileVisibility; label: string; desc: string }[]).map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all
                        ${settings.visibility === opt.value
                          ? 'border-neon-purple/35 bg-neon-purple/8'
                          : 'border-white/5 bg-white/2 hover:bg-white/4'
                        }`}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value={opt.value}
                        checked={settings.visibility === opt.value}
                        onChange={() => update({ visibility: opt.value })}
                        className="mt-0.5 accent-neon-purple"
                      />
                      <div>
                        <p className={`font-mono text-sm font-semibold
                          ${settings.visibility === opt.value ? 'text-neon-purple' : 'text-gray-300'}`}>
                          {opt.label}
                        </p>
                        <p className="font-mono text-xs text-gray-600 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <button
                  onClick={handleLocalSave}
                  className="w-full font-mono text-sm py-3 rounded-xl border border-neon-purple/30
                    bg-neon-purple/8 text-neon-purple hover:bg-neon-purple/15 transition-all"
                >
                  Save Privacy Settings
                </button>
              </NeonCard>
            )}

            {/* ─────────────────────── API KEYS TAB ───────────────────────── */}
            {activeTab === 'apikeys' && (
              <NeonCard glow="purple" className="p-6">
                <h2 className="font-mono text-sm font-semibold text-gray-300 mb-2">API Keys</h2>
                <p className="font-mono text-xs text-gray-600 mb-5">
                  Manage API keys for programmatic access to TrustFolio's verification endpoints.
                </p>
                <a
                  href="/api-keys"
                  className="flex items-center justify-between w-full p-4 rounded-xl border border-neon-purple/20
                    bg-neon-purple/5 hover:bg-neon-purple/10 transition-all group"
                >
                  <div>
                    <p className="font-mono text-sm text-neon-purple">Manage API Keys</p>
                    <p className="font-mono text-xs text-gray-600 mt-0.5">Create, revoke, and monitor your API keys</p>
                  </div>
                  <ExternalLink size={15} className="text-neon-purple/40 group-hover:text-neon-purple transition-colors" />
                </a>
              </NeonCard>
            )}

            {/* ─────────────────────── ACCOUNT TAB ────────────────────────── */}
            {activeTab === 'account' && (
              <div className="space-y-4">
                <NeonCard glow="none" className="p-6">
                  <h2 className="font-mono text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                    <Database size={15} className="text-gray-500" />
                    Data Management
                  </h2>
                  <div className="space-y-3">
                    <button
                      onClick={handleExportData}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-neon-cyan/15
                        bg-neon-cyan/4 hover:bg-neon-cyan/8 transition-all group"
                    >
                      <div className="text-left">
                        <p className="font-mono text-sm text-neon-cyan">Export All Data</p>
                        <p className="font-mono text-xs text-gray-600 mt-0.5">Download JSON of all your TrustFolio data</p>
                      </div>
                      <Database size={15} className="text-neon-cyan/40 group-hover:text-neon-cyan transition-colors" />
                    </button>
                    <a
                      href="/export"
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-neon-purple/15
                        bg-neon-purple/4 hover:bg-neon-purple/8 transition-all group"
                    >
                      <div>
                        <p className="font-mono text-sm text-neon-purple">Export Credential</p>
                        <p className="font-mono text-xs text-gray-600 mt-0.5">Generate portable credential proof</p>
                      </div>
                      <Shield size={15} className="text-neon-purple/40 group-hover:text-neon-purple transition-colors" />
                    </a>
                  </div>
                </NeonCard>

                <NeonCard glow="none" className="p-4 border-neon-cyan/15 bg-neon-cyan/3">
                  <p className="font-mono text-xs text-gray-500">
                    <span className="text-neon-cyan font-semibold">Storage Notice:</span>{' '}
                    Profile data is saved to 0G decentralized storage. Local browser data can be deleted below.
                    On-chain data (NFTs, transactions) remains permanently on the blockchain.
                  </p>
                </NeonCard>

                <NeonCard glow="pink" className="p-6 border-neon-pink/25">
                  <h3 className="font-mono text-sm font-semibold text-neon-pink mb-3">Danger Zone</h3>
                  {showDeleteConfirm ? (
                    <div className="p-4 rounded-xl bg-neon-pink/8 border border-neon-pink/25">
                      <p className="font-mono text-xs text-neon-pink mb-3">
                        This removes all locally stored data for your wallet. Cannot be undone.
                        On-chain and 0G Storage data will remain.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={handleDeleteAccount}
                          className="font-mono text-xs px-4 py-2 rounded-lg border border-neon-pink/40
                            bg-neon-pink/15 text-neon-pink hover:bg-neon-pink/25 transition-all"
                        >
                          Yes, Delete All Local Data
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="font-mono text-xs px-4 py-2 rounded-lg border border-white/8 text-gray-500
                            hover:text-gray-300 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-2 font-mono text-sm px-4 py-2.5 rounded-xl
                        border border-neon-pink/25 bg-neon-pink/5 text-neon-pink hover:bg-neon-pink/12 transition-all"
                    >
                      <AlertCircle size={15} />
                      Delete Local Account Data
                    </button>
                  )}
                </NeonCard>
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}
