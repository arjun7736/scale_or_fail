'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Gauge, Settings } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { useArchitectureStore } from '@/stores/architectureStore';
import { RateLimiterNodeConfig } from '@/packages/simulation/core/types';

export function RateLimiterNode({ id, data }: NodeProps) {
  const metrics = useGameStore((s) => s.componentMetrics[id]);
  const selectNode = useArchitectureStore((s) => s.selectNode);
  const selectedNodeId = useArchitectureStore((s) => s.selectedNodeId);

  const isSelected = selectedNodeId === id;
  const config = data?.config as RateLimiterNodeConfig;

  return (
    <div
      onClick={() => selectNode(id)}
      className={`relative rounded-xl border bg-slate-900/95 p-3.5 shadow-xl backdrop-blur-md min-w-[200px] cursor-pointer transition-all hover:border-slate-600 ${
        isSelected ? 'border-orange-400 shadow-orange-950/30' : 'border-slate-800'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !rounded-full !border-2 !border-slate-900 !bg-orange-400" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400">
            <Gauge className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
              <span>{(data?.label as string) || 'Rate Limiter'}</span>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="text-[10px] text-orange-400 font-mono">
              GATEWAY • TOKEN BUCKET
            </div>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); selectNode(id); }} className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer">
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1.5 rounded-lg bg-slate-950/70 p-2 border border-slate-800/80 font-mono text-[10px]">
        <div className="flex justify-between text-slate-400">
          <span>Allowed Cap:</span>
          <span className="text-orange-300 font-semibold">{(config?.maxAllowedRps || 50000).toLocaleString()} RPS</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Dropped (429):</span>
          <span className={metrics?.droppedRps ? 'text-rose-400 font-bold' : 'text-slate-400'}>
            {(metrics?.droppedRps || 0).toLocaleString()} RPS
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !rounded-full !border-2 !border-slate-900 !bg-orange-400" />
    </div>
  );
}
