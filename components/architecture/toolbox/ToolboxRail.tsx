'use client';

import React from 'react';
import { Lock, ChevronRight } from 'lucide-react';
import { Node } from '@xyflow/react';
import { TOOLBOX_ITEMS, ToolboxItem } from './toolbox-catalog';
import { checkComponentLimit, getComponentCount } from '@/packages/simulation/models/limits';

interface ToolboxRailProps {
  currentStage: number;
  nodes: Node[];
  onToggleRail: () => void;
  onDragStart: (e: React.DragEvent, item: ToolboxItem) => void;
  onQuickAdd: (item: ToolboxItem) => void;
}

export function ToolboxRail({
  currentStage,
  nodes,
  onToggleRail,
  onDragStart,
  onQuickAdd,
}: ToolboxRailProps) {
  return (
    <div className="fixed inset-y-0 left-0 z-50 md:relative md:inset-auto md:z-auto flex flex-col h-full bg-slate-900/98 md:bg-slate-900/95 border-r border-slate-800/80 w-14 select-none shrink-0 items-center py-2.5 space-y-2 shadow-2xl md:shadow-none animate-in slide-in-from-left duration-200">
      <button
        onClick={onToggleRail}
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        title="Expand to Full Card View"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="w-8 h-px bg-slate-800" />

      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full flex flex-col items-center space-y-2 px-1">
        {TOOLBOX_ITEMS.map((item) => {
          const isLocked = currentStage < item.unlockStage;
          const limitCheck = checkComponentLimit(nodes, item.id, item.type);
          const isLimitReached = !limitCheck.allowed;
          const isDatabaseWithPrimary = item.id === 'database' && isLimitReached;
          const replicaCount = item.id === 'database' ? getComponentCount(nodes, 'db_replica', 'database') : 0;
          const isReplicaLimitReached = replicaCount >= 8;
          const isDisabled =
            isLocked ||
            (isLimitReached && !isDatabaseWithPrimary) ||
            (isDatabaseWithPrimary && isReplicaLimitReached);
          const title = isDatabaseWithPrimary
            ? `PostgreSQL Read Replica (${replicaCount}/8)`
            : item.title;

          return (
            <button
              key={item.id}
              draggable={!isDisabled}
              onDragStart={(e) => onDragStart(e, item)}
              onClick={() => onQuickAdd(item)}
              className={`relative group flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all ${
                isDisabled
                  ? 'border-slate-800/60 bg-slate-950/40 text-slate-600 cursor-not-allowed'
                  : isDatabaseWithPrimary
                  ? 'border-purple-500/40 bg-purple-500/10 text-purple-400 hover:scale-105 active:scale-95 cursor-pointer'
                  : `${item.iconBg} ${item.iconColor} hover:scale-105 active:scale-95 cursor-pointer`
              }`}
              title={`${title} (${item.costPerHour})${
                isLocked
                  ? ` • Locked until Stage ${item.unlockStage}`
                  : isDatabaseWithPrimary
                  ? ` • Primary active (1/1) - Tap/drag to deploy Read Replica (${replicaCount}/8)`
                  : isLimitReached
                  ? ' • In Use (Single Instance Limit: 1)'
                  : ' • Tap or drag to deploy'
              }`}
            >
              {isLocked ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                item.icon
              )}

              {isLocked && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/40 text-[8px] font-mono text-amber-300">
                  {item.unlockStage}
                </span>
              )}

              {!isLocked && isLimitReached && (
                <span
                  className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-teal-500/20 border border-teal-500/40 text-[8px] font-mono text-teal-300"
                  title="Already deployed in topology (Limit: 1)"
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="text-[9px] font-mono text-slate-500 text-center">
        S{currentStage}
      </div>
    </div>
  );
}
