'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { HardDrive, Settings } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { useArchitectureStore } from '@/stores/architectureStore';
import { DistributedNosqlNodeConfig } from '@/packages/simulation/core/types';

export function DistributedNosqlNode({ id, data }: NodeProps) {
  const metrics = useGameStore((s) => s.componentMetrics[id]);
  const selectNode = useArchitectureStore((s) => s.selectNode);
  const selectedNodeId = useArchitectureStore((s) => s.selectedNodeId);

  const isSelected = selectedNodeId === id;
  const config = data?.config as DistributedNosqlNodeConfig;

  return (
    <div
      onClick={() => selectNode(id)}
      className={`relative rounded-xl border bg-slate-900/95 p-3.5 shadow-xl backdrop-blur-md min-w-[210px] cursor-pointer transition-all hover:border-slate-600 ${
        isSelected ? 'border-violet-400 shadow-violet-950/30' : 'border-slate-800'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !rounded-full !border-2 !border-slate-900 !bg-violet-400" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-400">
            <HardDrive className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
              <span>{(data?.label as string) || 'Distributed NoSQL'}</span>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="text-[10px] text-violet-400 font-mono">
              MASTERLESS • RF={config?.replicationFactor || 3}
            </div>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); selectNode(id); }} className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer">
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1 rounded-lg bg-slate-950/70 p-2 border border-slate-800/80 font-mono text-[10px]">
        <div className="flex justify-between text-slate-400">
          <span>Consistency:</span>
          <span className="text-violet-300 font-semibold">{config?.consistencyLevel?.toUpperCase() || 'QUORUM'}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Throughput:</span>
          <span className="text-slate-200">{(metrics?.throughputInRps || 0).toLocaleString()} IOPS</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !rounded-full !border-2 !border-slate-900 !bg-violet-400" />
    </div>
  );
}
