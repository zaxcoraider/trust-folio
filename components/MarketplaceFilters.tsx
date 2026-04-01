'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';

export interface FilterState {
  search:    string;
  category:  string;
  tier:      string;
  minScore:  string;
  maxScore:  string;
  minPrice:  string;
  maxPrice:  string;
  sortBy:    string;
}

interface MarketplaceFiltersProps {
  filters:   FilterState;
  onChange:  (f: FilterState) => void;
  total:     number;
}

const CATEGORIES = [
  { value: '',         label: 'All Categories' },
  { value: 'code',     label: '⌨️ Developer'   },
  { value: 'design',   label: '🎨 Designer'    },
  { value: 'writing',  label: '✍️ Writer'      },
  { value: 'document', label: '📄 Analyst'     },
  { value: 'other',    label: '🔮 Other'       },
];

const TIERS = [
  { value: '',         label: 'All Tiers'  },
  { value: 'diamond',  label: '💎 Diamond' },
  { value: 'gold',     label: '🥇 Gold'    },
  { value: 'silver',   label: '🥈 Silver'  },
];

const SORT_OPTIONS = [
  { value: 'newest',        label: 'Newest First'    },
  { value: 'oldest',        label: 'Oldest First'    },
  { value: 'score_high',    label: 'Highest Score'   },
  { value: 'price_low',     label: 'Lowest Price'    },
  { value: 'price_high',    label: 'Highest Price'   },
  { value: 'most_viewed',   label: 'Most Viewed'     },
];

export function MarketplaceFilters({ filters, onChange, total }: MarketplaceFiltersProps) {
  const set = (key: keyof FilterState, value: string) =>
    onChange({ ...filters, [key]: value });

  const clearAll = () =>
    onChange({ search: '', category: '', tier: '', minScore: '', maxScore: '', minPrice: '', maxPrice: '', sortBy: 'newest' });

  const hasFilters =
    filters.category || filters.tier ||
    filters.minScore  || filters.maxScore ||
    filters.minPrice  || filters.maxPrice;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => set('search', e.target.value)}
          placeholder="Search by wallet, skill, keyword…"
          className="w-full bg-bg-card border border-neon-purple/20 rounded-lg pl-9 pr-4 py-2.5 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/60 transition-colors"
        />
        {filters.search && (
          <button
            onClick={() => set('search', '')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 items-center">
        <SlidersHorizontal size={13} className="text-neon-purple shrink-0" />

        {/* Category */}
        <select
          value={filters.category}
          onChange={(e) => set('category', e.target.value)}
          className="bg-bg-card border border-neon-purple/20 rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-neon-purple/60 transition-colors"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        {/* Tier */}
        <select
          value={filters.tier}
          onChange={(e) => set('tier', e.target.value)}
          className="bg-bg-card border border-neon-purple/20 rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-neon-purple/60 transition-colors"
        >
          {TIERS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {/* Score range */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={filters.minScore}
            onChange={(e) => set('minScore', e.target.value)}
            placeholder="Min score"
            min="0" max="100"
            className="w-24 bg-bg-card border border-neon-purple/20 rounded-lg px-2 py-2 font-mono text-xs text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/60"
          />
          <span className="text-gray-600 text-xs">–</span>
          <input
            type="number"
            value={filters.maxScore}
            onChange={(e) => set('maxScore', e.target.value)}
            placeholder="Max score"
            min="0" max="100"
            className="w-24 bg-bg-card border border-neon-purple/20 rounded-lg px-2 py-2 font-mono text-xs text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/60"
          />
        </div>

        {/* Price range */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={filters.minPrice}
            onChange={(e) => set('minPrice', e.target.value)}
            placeholder="Min 0G"
            min="0"
            className="w-20 bg-bg-card border border-neon-purple/20 rounded-lg px-2 py-2 font-mono text-xs text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/60"
          />
          <span className="text-gray-600 text-xs">–</span>
          <input
            type="number"
            value={filters.maxPrice}
            onChange={(e) => set('maxPrice', e.target.value)}
            placeholder="Max 0G"
            min="0"
            className="w-20 bg-bg-card border border-neon-purple/20 rounded-lg px-2 py-2 font-mono text-xs text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/60"
          />
        </div>

        {/* Sort */}
        <select
          value={filters.sortBy}
          onChange={(e) => set('sortBy', e.target.value)}
          className="bg-bg-card border border-neon-purple/20 rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-neon-purple/60 transition-colors ml-auto"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs font-mono text-gray-500 hover:text-neon-purple transition-colors px-2 py-2"
          >
            <X size={11} />
            Clear
          </button>
        )}
      </div>

      {/* Result count */}
      <div className="text-xs font-mono text-gray-600">
        {total} INFT{total !== 1 ? 's' : ''} found
      </div>
    </div>
  );
}
