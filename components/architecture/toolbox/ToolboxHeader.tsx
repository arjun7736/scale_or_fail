'use client';

import React from 'react';
import { X, ChevronLeft, Search, AlertCircle } from 'lucide-react';
import { TOOLBOX_ITEMS } from './toolbox-catalog';

interface ToolboxHeaderProps {
  currentStage: number;
  filter: 'all' | 'unlocked' | 'locked';
  searchQuery: string;
  limitWarning: string | null;
  lastAddedTitle: string | null;
  unlockedCount: number;
  lockedCount: number;
  onFilterChange: (f: 'all' | 'unlocked' | 'locked') => void;
  onSearchChange: (q: string) => void;
  onToggleRail: () => void;
  onClose: () => void;
}

export function ToolboxHeader({
  currentStage,
  filter,
  searchQuery,
  limitWarning,
  lastAddedTitle,
  unlockedCount,
  lockedCount,
  onFilterChange,
  onSearchChange,
  onToggleRail,
  onClose,
}: ToolboxHeaderProps) {
  return (
    <div className="p-2.5 border-b border-slate-800 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Toolbox
          </h2>
          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300">
            S{currentStage}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleRail}
            className="hidden md:inline-flex p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Collapse to Icon Rail"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Toolbox"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tap-to-Deploy Alert Banner on Mobile */}
      <div className="md:hidden flex items-center justify-between px-2 py-1 rounded bg-teal-500/10 border border-teal-500/20 text-[10px] text-teal-300 font-mono">
        <span>👉 Tap any card to deploy to canvas</span>
        <span className="text-slate-400 text-[9px]">Tap X to exit</span>
      </div>

      {/* Limit Warning Alert */}
      {limitWarning && (
        <div className="px-2 py-1.5 rounded bg-amber-500/15 border border-amber-500/40 text-[10px] text-amber-300 font-mono animate-in fade-in flex items-start gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
          <span className="leading-tight">{limitWarning}</span>
        </div>
      )}

      {/* Success feedback when component is deployed */}
      {lastAddedTitle && !limitWarning && (
        <div className="px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-[10px] text-emerald-300 font-mono animate-in fade-in">
          ✓ Deployed {lastAddedTitle} to canvas!
        </div>
      )}

      {/* Quick Search */}
      <div className="relative">
        <Search className="h-3 w-3 absolute left-2 top-2 text-slate-500" />
        <input
          type="text"
          placeholder="Search components..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-slate-950/70 border border-slate-800 rounded-lg pl-7 pr-2 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500/50"
        />
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-1 p-0.5 rounded-md bg-slate-950/70 border border-slate-800/80 text-[10px] font-medium font-mono">
        <button
          onClick={() => onFilterChange('all')}
          className={`flex-1 py-0.5 rounded text-center transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All ({TOOLBOX_ITEMS.length})
        </button>
        <button
          onClick={() => onFilterChange('unlocked')}
          className={`flex-1 py-0.5 rounded text-center transition-all cursor-pointer ${
            filter === 'unlocked'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Unlocked ({unlockedCount})
        </button>
        <button
          onClick={() => onFilterChange('locked')}
          className={`flex-1 py-0.5 rounded text-center transition-all cursor-pointer ${
            filter === 'locked'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Locked ({lockedCount})
        </button>
      </div>
    </div>
  );
}
