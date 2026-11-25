'use client';

import React from 'react';
import { Lock, Plus, Check } from 'lucide-react';
import { Node } from '@xyflow/react';
import { ToolboxItem } from './toolbox-catalog';
import { checkComponentLimit, getComponentCount } from '@/packages/simulation/models/limits';

interface ToolboxCardProps {
  item: ToolboxItem;
  currentStage: number;
  nodes: Node[];
  onDragStart: (e: React.DragEvent, item: ToolboxItem) => void;
  onQuickAdd: (item: ToolboxItem) => void;
}

export function ToolboxCard({
  item,
  currentStage,
  nodes,
  onDragStart,
  onQuickAdd,
}: ToolboxCardProps) {
  const isLocked = currentStage < item.unlockStage;
  const isNewlyUnlocked = currentStage === item.unlockStage;
  const limitCheck = checkComponentLimit(nodes, item.id, item.type);
  const isLimitReached = !limitCheck.allowed;
  const isDatabaseWithPrimary = item.id === 'database' && isLimitReached;
  const replicaCount = item.id === 'database' ? getComponentCount(nodes, 'db_replica', 'database') : 0;
  const isReplicaLimitReached = replicaCount >= 8;
  const isMulti = item.id === 'app_server';
  const isDisabled =
    isLocked ||
    (isLimitReached && !isDatabaseWithPrimary) ||
    (isDatabaseWithPrimary && isReplicaLimitReached);

  const title = isDatabaseWithPrimary ? 'PostgreSQL Read Replica' : item.title;
  const category = isDatabaseWithPrimary
    ? replicaCount > 0
      ? `Read Replicas (${replicaCount}/8)`
      : 'Read Replica DB'
    : item.category;
  const description = isDatabaseWithPrimary
    ? 'Read-only SQL replica offloading read queries from the Primary Write Master.'
    : item.description;

  return (
    <div
      draggable={!isDisabled}
      onDragStart={(e) => onDragStart(e, item)}
      onClick={() => onQuickAdd(item)}
      className={`group relative rounded-lg border p-2 transition-all select-none ${
        isLocked
          ? 'border-slate-800/40 bg-slate-950/20 opacity-60 hover:opacity-75 cursor-not-allowed'
          : isDatabaseWithPrimary
          ? 'border-purple-500/30 bg-purple-950/20 hover:border-purple-500/50 hover:bg-purple-950/30 cursor-pointer shadow-xs'
          : isLimitReached
          ? 'border-slate-800/50 bg-slate-950/40 opacity-75 hover:border-slate-700 cursor-not-allowed'
          : 'border-slate-800/80 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-800/30 active:scale-[0.98] cursor-pointer shadow-xs'
      }`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
              isLocked
                ? 'border-slate-800 bg-slate-900 text-slate-500'
                : isDatabaseWithPrimary
                ? 'border-purple-500/40 bg-purple-900/40 text-purple-300'
                : isLimitReached
                ? 'border-slate-800 bg-slate-900/80 text-slate-400'
                : `${item.iconBg} ${item.iconColor}`
            }`}
          >
            {isLocked ? <Lock className="h-3 w-3" /> : item.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span
                className={`text-[11px] font-semibold truncate ${
                  isLocked
                    ? 'text-slate-400'
                    : isDatabaseWithPrimary
                    ? 'text-purple-200 group-hover:text-white'
                    : isLimitReached
                    ? 'text-slate-300'
                    : 'text-slate-200 group-hover:text-white'
                }`}
              >
                {title}
              </span>
              {isNewlyUnlocked && (
                <span className="text-[8px] font-mono px-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  NEW
                </span>
              )}
            </div>
            <div className="text-[9px] text-slate-500 font-mono truncate">
              {item.costPerHour} • {category}
            </div>
          </div>
        </div>

        {isLocked ? (
          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-900 border border-slate-800 text-amber-400/90 shrink-0">
            Stage {item.unlockStage}
          </span>
        ) : isDatabaseWithPrimary ? (
          <div className="flex items-center gap-1 shrink-0">
            {isReplicaLimitReached ? (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-teal-400">
                Max (8/8)
              </span>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickAdd(item);
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-[9px] font-medium transition-colors shadow-xs"
                title="Deploy Read Replica"
              >
                <Plus className="h-3 w-3" /> Add Replica
              </button>
            )}
          </div>
        ) : isLimitReached ? (
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-teal-400/90 flex items-center gap-1 shrink-0"
            title={limitCheck.reason}
          >
            <Check className="h-2.5 w-2.5 text-teal-400" /> In Use (1/1)
          </span>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            {isMulti && limitCheck.currentCount > 0 && (
              <span className="text-[9px] font-mono text-teal-400/80">
                {limitCheck.currentCount} active
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd(item);
              }}
              className="flex h-6 w-6 items-center justify-center rounded bg-slate-800 hover:bg-teal-500/20 hover:text-teal-400 text-slate-300 transition-colors"
              title="Deploy to canvas"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <p className="mt-1 text-[10px] text-slate-400 line-clamp-1 group-hover:line-clamp-none transition-all">
        {description}
      </p>

      {/* Limit Hint Chip if component is single-instance and in use */}
      {!isLocked && isDatabaseWithPrimary && (
        <div className="mt-1 text-[9px] font-mono text-purple-400/90 flex items-center justify-between">
          <span>✓ Primary active (1/1). Click or drag to add Read Replica ({replicaCount}/8).</span>
        </div>
      )}
      {!isLocked && isLimitReached && !isDatabaseWithPrimary && (
        <div className="mt-1 text-[9px] font-mono text-slate-500 flex items-center gap-1">
          <span>🔒 Limit: 1 per architecture. Remove to redeploy.</span>
        </div>
      )}
    </div>
  );
}
