'use client';

import { useState, useEffect, useRef } from 'react';
import { BarChart2, TrendingUp, Users, ShoppingBag, Briefcase, Zap, Award } from 'lucide-react';
import { NeonCard } from '@/components/NeonCard';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';

// ── Mock data generators ──────────────────────────────────────────────────────

function genDailyVerifications() {
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    data.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: Math.floor(Math.random() * 80 + 20),
    });
  }
  return data;
}

function genWeeklyVolume() {
  const data = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    data.push({
      week: `W${d.getMonth() + 1}/${d.getDate()}`,
      volume: parseFloat((Math.random() * 800 + 100).toFixed(2)),
    });
  }
  return data;
}

const SKILL_DISTRIBUTION = [
  { name: 'Code', value: 38, color: '#a855f7' },
  { name: 'Design', value: 22, color: '#06b6d4' },
  { name: 'Writing', value: 18, color: '#ec4899' },
  { name: 'Document', value: 14, color: '#f59e0b' },
  { name: 'Other', value: 8, color: '#6b7280' },
];

const TIER_DISTRIBUTION = [
  { name: 'Diamond', value: 8, color: '#e2e8f0' },
  { name: 'Gold', value: 22, color: '#f59e0b' },
  { name: 'Silver', value: 35, color: '#06b6d4' },
  { name: 'Bronze', value: 35, color: '#a855f7' },
];

const TOP_TALENT = [
  { address: '0xd8dA6B...96045', score: 97, tier: 'Diamond' },
  { address: '0xf39Fd6...2266', score: 94, tier: 'Diamond' },
  { address: '0x70997...79C8', score: 91, tier: 'Diamond' },
  { address: '0x3C44Cd...93BC', score: 88, tier: 'Gold' },
  { address: '0x9065ff...3104', score: 85, tier: 'Gold' },
];

const TOP_EMPLOYERS = [
  { address: '0xBcd4042...8B2D', hires: 47, volume: '234.5 0G' },
  { address: '0x71bE63f...1C9A', hires: 31, volume: '189.2 0G' },
  { address: '0xFABB085...1049', hires: 28, volume: '142.0 0G' },
  { address: '0x1CBd3b2...1A66', hires: 19, volume: '98.7 0G' },
  { address: '0xdF3e18d...A79F', hires: 15, volume: '76.3 0G' },
];

const TOP_EARNERS = [
  { address: '0xcd3B766...d0FC', trustEarned: '45,820 TRUST' },
  { address: '0x2546BcB...3C29', trustEarned: '38,140 TRUST' },
  { address: '0xDd2FD4b...d0B5', trustEarned: '29,670 TRUST' },
  { address: '0x8626f69...B6B1', trustEarned: '24,500 TRUST' },
  { address: '0x09DB0a8...F699', trustEarned: '19,880 TRUST' },
];

// ── Animated Counter ──────────────────────────────────────────────────────────

function AnimatedCounter({ target, duration = 1500, suffix = '' }: { target: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    let raf: number;
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return <span>{count.toLocaleString()}{suffix}</span>;
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-card border border-neon-purple/30 rounded-lg px-3 py-2 font-mono text-xs shadow-neon-purple">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-neon-purple">{p.name}: <span className="text-gray-200">{p.value}</span></p>
      ))}
    </div>
  );
}

function CustomVolumeTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-card border border-neon-cyan/30 rounded-lg px-3 py-2 font-mono text-xs shadow-neon-cyan">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-neon-cyan">Volume: <span className="text-gray-200">{payload[0].value.toFixed(2)} 0G</span></p>
    </div>
  );
}

export default function StatsPage() {
  const [leaderTab, setLeaderTab] = useState<'talent' | 'employers' | 'earners'>('talent');
  const [dailyData] = useState(genDailyVerifications);
  const [weeklyData] = useState(genWeeklyVolume);

  const STAT_CARDS = [
    { label: 'Total Verified Portfolios', value: 4827, glow: 'purple' as const, icon: Award, color: 'text-neon-purple' },
    { label: 'Total INFTs Minted', value: 2341, glow: 'cyan' as const, icon: Zap, color: 'text-neon-cyan' },
    { label: 'Marketplace Volume', value: 18492, glow: 'pink' as const, icon: ShoppingBag, color: 'text-neon-pink', suffix: ' 0G' },
    { label: 'Hiring Contracts', value: 892, glow: 'purple' as const, icon: Briefcase, color: 'text-neon-purple' },
    { label: 'TRUST Distributed', value: 2840000, glow: 'cyan' as const, icon: TrendingUp, color: 'text-neon-cyan', suffix: '' },
    { label: 'Active Stakers', value: 1204, glow: 'none' as const, icon: Users, color: 'text-gray-300' },
  ];

  return (
    <div className="relative min-h-screen bg-bg-primary px-4 py-10 page-enter">
      <div className="fixed inset-0 bg-grid opacity-100 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20">
            <BarChart2 size={22} className="text-neon-cyan" />
          </div>
          <div>
            <h1 className="font-mono text-2xl font-bold text-gray-100">Platform Analytics</h1>
            <p className="font-mono text-sm text-gray-500">
              Real-time insights into TrustFolio ecosystem activity
            </p>
          </div>
        </div>

        {/* Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {STAT_CARDS.map((s) => (
            <NeonCard key={s.label} glow={s.glow} className="p-4">
              <div className="flex items-start gap-3">
                <s.icon size={20} className={`${s.color} mt-0.5 shrink-0`} />
                <div>
                  <p className="font-mono text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className={`font-mono text-xl font-bold ${s.color}`}>
                    <AnimatedCounter target={s.value} suffix={s.suffix ?? ''} />
                  </p>
                </div>
              </div>
            </NeonCard>
          ))}
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Line chart: Daily Verifications */}
          <NeonCard glow="purple" className="p-5">
            <h2 className="font-mono text-sm font-semibold text-gray-300 mb-4">Daily Verifications (30d)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,85,247,0.1)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  interval={6}
                />
                <YAxis
                  tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Verifications"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#a855f7', stroke: '#a855f7' }}
                  style={{ filter: 'drop-shadow(0 0 4px rgba(168,85,247,0.6))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </NeonCard>

          {/* Bar chart: Weekly Volume */}
          <NeonCard glow="cyan" className="p-5">
            <h2 className="font-mono text-sm font-semibold text-gray-300 mb-4">Weekly Marketplace Volume (8w)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,182,212,0.1)" />
                <XAxis
                  dataKey="week"
                  tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomVolumeTooltip />} />
                <Bar dataKey="volume" fill="#06b6d4" radius={[4, 4, 0, 0]}>
                  {weeklyData.map((_, i) => (
                    <Cell key={i} fill="#06b6d4" style={{ filter: 'drop-shadow(0 0 3px rgba(6,182,212,0.5))' }} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </NeonCard>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          {/* Pie: Skill Distribution */}
          <NeonCard glow="pink" className="p-5">
            <h2 className="font-mono text-sm font-semibold text-gray-300 mb-4">Skill Distribution</h2>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={SKILL_DISTRIBUTION}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {SKILL_DISTRIBUTION.map((entry, i) => (
                      <Cell key={i} fill={entry.color} style={{ filter: `drop-shadow(0 0 4px ${entry.color}60)` }} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#12121f', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px', fontFamily: 'JetBrains Mono', fontSize: 11 }}
                    labelStyle={{ color: '#9ca3af' }}
                    itemStyle={{ color: '#e5e7eb' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {SKILL_DISTRIBUTION.map((s) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="font-mono text-xs text-gray-400">{s.name}</span>
                    <span className="font-mono text-xs text-gray-600">{s.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </NeonCard>

          {/* Donut: Badge Tier Distribution */}
          <NeonCard glow="none" className="p-5">
            <h2 className="font-mono text-sm font-semibold text-gray-300 mb-4">Badge Tier Distribution</h2>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={TIER_DISTRIBUTION}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {TIER_DISTRIBUTION.map((entry, i) => (
                      <Cell key={i} fill={entry.color} style={{ filter: `drop-shadow(0 0 4px ${entry.color}60)` }} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#12121f', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px', fontFamily: 'JetBrains Mono', fontSize: 11 }}
                    labelStyle={{ color: '#9ca3af' }}
                    itemStyle={{ color: '#e5e7eb' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {TIER_DISTRIBUTION.map((t) => (
                  <div key={t.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="font-mono text-xs text-gray-400">{t.name}</span>
                    <span className="font-mono text-xs text-gray-600">{t.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </NeonCard>
        </div>

        {/* Leaderboard */}
        <NeonCard glow="purple" className="p-6">
          <h2 className="font-mono text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Award size={16} className="text-neon-purple" />
            Leaderboard
          </h2>

          {/* Tabs */}
          <div className="flex gap-1 mb-5 border-b border-white/10">
            {([
              { key: 'talent', label: 'Top Talent' },
              { key: 'employers', label: 'Top Employers' },
              { key: 'earners', label: 'Top Earners' },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setLeaderTab(t.key)}
                className={`font-mono text-xs px-4 py-2 -mb-px border-b-2 transition-all duration-200
                  ${leaderTab === t.key
                    ? 'text-neon-purple border-neon-purple'
                    : 'text-gray-500 border-transparent hover:text-gray-300'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {leaderTab === 'talent' && (
              <table className="w-full font-mono text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-white/5">
                    <th className="text-left py-2 pr-4">Rank</th>
                    <th className="text-left py-2 pr-4">Address</th>
                    <th className="text-left py-2 pr-4">Score</th>
                    <th className="text-left py-2">Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {TOP_TALENT.map((t, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="py-2.5 pr-4">
                        <span className={`font-bold ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                          #{i + 1}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-300">{t.address}</td>
                      <td className="py-2.5 pr-4 text-neon-cyan">{t.score}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-xs border ${
                          t.tier === 'Diamond' ? 'text-white border-white/30 bg-white/5' :
                          t.tier === 'Gold' ? 'text-amber-400 border-amber-400/30 bg-amber-400/10' :
                          'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10'
                        }`}>{t.tier}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {leaderTab === 'employers' && (
              <table className="w-full font-mono text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-white/5">
                    <th className="text-left py-2 pr-4">Rank</th>
                    <th className="text-left py-2 pr-4">Address</th>
                    <th className="text-left py-2 pr-4">Hires</th>
                    <th className="text-left py-2">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {TOP_EMPLOYERS.map((e, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="py-2.5 pr-4">
                        <span className={`font-bold ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                          #{i + 1}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-300">{e.address}</td>
                      <td className="py-2.5 pr-4 text-neon-purple">{e.hires}</td>
                      <td className="py-2.5 text-neon-cyan">{e.volume}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {leaderTab === 'earners' && (
              <table className="w-full font-mono text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-white/5">
                    <th className="text-left py-2 pr-4">Rank</th>
                    <th className="text-left py-2 pr-4">Address</th>
                    <th className="text-left py-2">TRUST Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {TOP_EARNERS.map((e, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="py-2.5 pr-4">
                        <span className={`font-bold ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                          #{i + 1}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-300">{e.address}</td>
                      <td className="py-2.5 text-neon-purple">{e.trustEarned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </NeonCard>
      </div>
    </div>
  );
}
