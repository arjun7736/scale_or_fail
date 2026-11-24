'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Server, Cpu, HardDrive, Settings, AlertTriangle } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { useArchitectureStore } from '@/stores/architectureStore';
import { AppServerNodeConfig } from '@/packages/simulation/core/types';

export function ServerNode({ id, data }: NodeProps) {
  const metrics = useGameStore((s) => s.componentMetrics[id]);
  const selectNode = useArchitectureStore((s) => s.selectNode);
  const selectedNodeId = useArchitectureStore((s) => s.selectedNodeId);

  const isSelected = selectedNodeId === id;
  const config = data?.config as AppServerNodeConfig;

  const cpu = metrics?.cpuUtilization ?? 0;
  const ram = metrics?.ramUtilization ?? 15;
  const health = metrics?.health || 'healthy';

  let borderColor = 'border-slate-800';
  let badgeColor = 'bg-teal-500/10 text-teal-400 border-teal-500/30';
  let statusDot = 'bg-teal-400';

  if (health === 'critical' || metrics?.isOom) {
    borderColor = 'border-rose-500 shadow-rose-950/40 shadow-lg';
    badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    statusDot = 'bg-rose-500 animate-ping';
  } else if (health === 'warning') {
    borderColor = 'border-amber-500 shadow-amber-950/30 shadow-lg';
    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    statusDot = 'bg-amber-400';
  } else if (isSelected) {
    borderColor = 'border-teal-400 shadow-teal-950/30 shadow-lg';
  }

  return (
    <div
      onClick={() => selectNode(id)}
      className={`relative rounded-xl border bg-slate-900/95 p-3.5 shadow-xl backdrop-blur-md min-w-[210px] cursor-pointer transition-all hover:border-slate-600 ${borderColor}`}
    >
      {/* Target handle on Left */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !rounded-full !border-2 !border-slate-900 !bg-teal-400"
      />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
            <Server className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
              <span>{data?.label as string || 'App Server'}</span>
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusDot}`} />
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {config?.tier?.toUpperCase() || 'SMALL'} • {config?.cpuCores || 2} vCPU
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            selectNode(id);
          }}
          className="text-slate-400 hover:text-slate-200 p-1"
          title="Configure Node"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Metrics bars */}
      <div className="space-y-1.5 rounded-lg bg-slate-950/70 p-2 border border-slate-800/80 font-mono text-[10px]">
        <div>
          <div className="flex justify-between text-slate-400 mb-0.5">
            <span className="flex items-center gap-1"><Cpu className="h-2.5 w-2.5" /> CPU</span>
            <span className={cpu > 80 ? 'text-rose-400 font-bold' : cpu > 60 ? 'text-amber-400' : 'text-slate-300'}>
              {cpu}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                cpu > 85 ? 'bg-rose-500' : cpu > 60 ? 'bg-amber-400' : 'bg-teal-400'
              }`}
              style={{ width: `${Math.min(100, cpu)}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-slate-400 mb-0.5">
            <span className="flex items-center gap-1"><HardDrive className="h-2.5 w-2.5" /> RAM</span>
            <span className={ram > 85 ? 'text-rose-400 font-bold' : 'text-slate-300'}>{ram}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${ram > 85 ? 'bg-rose-500' : 'bg-sky-400'}`}
              style={{ width: `${Math.min(100, ram)}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between pt-0.5 text-slate-400 border-t border-slate-900 text-[9px]">
          <span>Throughput:</span>
          <span className="text-slate-200">{(metrics?.throughputInRps || 0).toLocaleString()} RPS</span>
        </div>

        {metrics?.queueDepth && metrics.queueDepth > 0 ? (
          <div className="flex justify-between text-amber-400 text-[9px] font-semibold">
            <span className="flex items-center gap-0.5"><AlertTriangle className="h-2.5 w-2.5" /> Queue:</span>
            <span>+{metrics.queueDepth} reqs</span>
          </div>
        ) : null}

        {health === 'failed' || metrics?.isOom ? (
          <div className="mt-1 rounded bg-rose-500/20 border border-rose-500/40 p-1 text-center font-mono text-[9px] font-bold text-rose-300 animate-pulse">
            💥 SERVER CRASHED - CLICK TO FIX
          </div>
        ) : cpu >= 95 ? (
          <div className="mt-1 rounded bg-rose-500/20 border border-rose-500/40 p-1 text-center font-mono text-[9px] font-bold text-rose-300">
            ⚠️ 100% CPU SATURATED
          </div>
        ) : null}
      </div>

      {/* Source handle on Right */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !rounded-full !border-2 !border-slate-900 !bg-teal-400"
      />
    </div>
  );
}
