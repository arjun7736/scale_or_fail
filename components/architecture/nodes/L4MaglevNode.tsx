'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Network, Settings } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { useArchitectureStore } from '@/stores/architectureStore';

export function L4MaglevNode({ id, data }: NodeProps) {
  const metrics = useGameStore((s) => s.componentMetrics[id]);
  const selectNode = useArchitectureStore((s) => s.selectNode);
  const selectedNodeId = useArchitectureStore((s) => s.selectedNodeId);

  const isSelected = selectedNodeId === id;

  return (
    <div
      onClick={() => selectNode(id)}
      className={`relative rounded-xl border bg-slate-900/95 p-3.5 shadow-xl backdrop-blur-md min-w-[210px] cursor-pointer transition-all hover:border-slate-600 ${
        isSelected ? 'border-emerald-400 shadow-emerald-950/30' : 'border-slate-800'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !rounded-full !border-2 !border-slate-900 !bg-emerald-400" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Network className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
              <span>{(data?.label as string) || 'L4 Maglev (DSR)'}</span>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="text-[10px] text-emerald-400 font-mono">
              KERNEL BYPASS • 100M+ PPS
            </div>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); selectNode(id); }} className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer">
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1 rounded-lg bg-slate-950/70 p-2 border border-slate-800/80 font-mono text-[10px]">
        <div className="flex justify-between text-slate-400">
          <span>Direct Server Return:</span>
          <span className="text-emerald-400 font-bold">ZERO PROXY BOTTLENECK</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Routing:</span>
          <span className="text-slate-200">{(metrics?.throughputInRps || 0).toLocaleString()} PPS</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !rounded-full !border-2 !border-slate-900 !bg-emerald-400" />
    </div>
  );
}
