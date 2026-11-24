'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Layers, Settings, ShieldCheck, Gauge } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { useArchitectureStore } from '@/stores/architectureStore';
import {
  MessageQueueNodeConfig,
  CdnNodeConfig,
  RateLimiterNodeConfig,
} from '@/packages/simulation/core/types';

export function QueueNode({ id, data }: NodeProps) {
  const metrics = useGameStore((s) => s.componentMetrics[id]);
  const selectNode = useArchitectureStore((s) => s.selectNode);
  const selectedNodeId = useArchitectureStore((s) => s.selectedNodeId);

  const isSelected = selectedNodeId === id;
  const config = data?.config as MessageQueueNodeConfig;
  const queueDepth = metrics?.queueDepth ?? 0;
  const capacity = config?.bufferCapacity ?? 100000;
  const percent = Math.min(100, Math.round((queueDepth / capacity) * 100));

  return (
    <div
      onClick={() => selectNode(id)}
      className={`relative rounded-xl border bg-slate-900/95 p-3.5 shadow-xl backdrop-blur-md min-w-[200px] cursor-pointer transition-all hover:border-slate-600 ${
        isSelected ? 'border-indigo-400 shadow-indigo-950/30' : 'border-slate-800'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !rounded-full !border-2 !border-slate-900 !bg-indigo-400" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
              <span>{data?.label as string || 'Message Queue'}</span>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="text-[10px] text-indigo-400 font-mono">
              ASYNC • {config?.workersCount || 4} Workers
            </div>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); selectNode(id); }} className="text-slate-400 hover:text-slate-200 p-1">
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1.5 rounded-lg bg-slate-950/70 p-2 border border-slate-800/80 font-mono text-[10px]">
        <div className="flex justify-between text-slate-400 mb-0.5">
          <span>Buffer:</span>
          <span className={percent > 80 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
            {queueDepth.toLocaleString()} / {capacity.toLocaleString()}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full bg-indigo-400 transition-all duration-300" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !rounded-full !border-2 !border-slate-900 !bg-indigo-400" />
    </div>
  );
}

export function CdnNode({ id, data }: NodeProps) {
  const metrics = useGameStore((s) => s.componentMetrics[id]);
  const selectNode = useArchitectureStore((s) => s.selectNode);
  const selectedNodeId = useArchitectureStore((s) => s.selectedNodeId);

  const isSelected = selectedNodeId === id;
  const config = data?.config as CdnNodeConfig;

  return (
    <div
      onClick={() => selectNode(id)}
      className={`relative rounded-xl border bg-slate-900/95 p-3.5 shadow-xl backdrop-blur-md min-w-[200px] cursor-pointer transition-all hover:border-slate-600 ${
        isSelected ? 'border-blue-400 shadow-blue-950/30' : 'border-slate-800'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !rounded-full !border-2 !border-slate-900 !bg-blue-400" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
              <span>{data?.label as string || 'Edge CDN'}</span>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="text-[10px] text-blue-400 font-mono">
              EDGE • {config?.edgePointsOfPresence || 24} POPs
            </div>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); selectNode(id); }} className="text-slate-400 hover:text-slate-200 p-1">
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1.5 rounded-lg bg-slate-950/70 p-2 border border-slate-800/80 font-mono text-[10px]">
        <div className="flex justify-between text-slate-400">
          <span>Edge Hit:</span>
          <span className="text-emerald-400 font-semibold">{Math.round((config?.cacheHitRatio || 0.7) * 100)}%</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Throughput:</span>
          <span className="text-slate-200">{(metrics?.throughputInRps || 0).toLocaleString()} RPS</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !rounded-full !border-2 !border-slate-900 !bg-blue-400" />
    </div>
  );
}

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
              <span>{data?.label as string || 'Rate Limiter'}</span>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="text-[10px] text-orange-400 font-mono">
              GATEWAY • TOKEN BUCKET
            </div>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); selectNode(id); }} className="text-slate-400 hover:text-slate-200 p-1">
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
