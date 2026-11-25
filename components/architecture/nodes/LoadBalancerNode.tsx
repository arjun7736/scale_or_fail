'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Split, Settings } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { useArchitectureStore } from '@/stores/architectureStore';
import { LoadBalancerNodeConfig } from '@/packages/simulation/core/types';
import { NodeValidationBadge } from './NodeValidationBadge';

export function LoadBalancerNode({ id, data }: NodeProps) {
  const metrics = useGameStore((s) => s.componentMetrics[id]);
  const selectNode = useArchitectureStore((s) => s.selectNode);
  const selectedNodeId = useArchitectureStore((s) => s.selectedNodeId);

  const isSelected = selectedNodeId === id;
  const config = data?.config as LoadBalancerNodeConfig;
  const cpu = metrics?.cpuUtilization ?? 0;

  return (
    <div
      onClick={() => selectNode(id)}
      className={`relative rounded-xl border bg-slate-900/95 p-3.5 shadow-xl backdrop-blur-md min-w-[200px] cursor-pointer transition-all hover:border-slate-600 ${
        isSelected ? 'border-amber-400 shadow-amber-950/30' : 'border-slate-800'
      }`}
    >
      <NodeValidationBadge nodeId={id} />
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !rounded-full !border-2 !border-slate-900 !bg-amber-400"
      />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Split className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
              <span>{data?.label as string || 'Load Balancer'}</span>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="text-[10px] text-amber-400 font-mono">
              ALB • {config?.algorithm?.replace('_', ' ').toUpperCase() || 'ROUND ROBIN'}
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            selectNode(id);
          }}
          className="text-slate-400 hover:text-slate-200 p-1"
          title="Configure Load Balancer"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1.5 rounded-lg bg-slate-950/70 p-2 border border-slate-800/80 font-mono text-[10px]">
        <div className="flex justify-between text-slate-400">
          <span>Throughput:</span>
          <span className="text-slate-200">{(metrics?.throughputInRps || 0).toLocaleString()} RPS</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Capacity:</span>
          <span className="text-amber-300">{(config?.maxRps || 200000).toLocaleString()} RPS</span>
        </div>
        <div>
          <div className="flex justify-between text-slate-400 mb-0.5">
            <span>Load</span>
            <span className={cpu > 80 ? 'text-rose-400' : 'text-slate-300'}>{cpu}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-300"
              style={{ width: `${Math.min(100, cpu)}%` }}
            />
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !rounded-full !border-2 !border-slate-900 !bg-amber-400"
      />
    </div>
  );
}
