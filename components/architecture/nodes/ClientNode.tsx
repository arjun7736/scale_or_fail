'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Globe, Users } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';

export function ClientNode({ id, data }: NodeProps) {
  const metrics = useGameStore((s) => s.componentMetrics[id]);
  const systemMetrics = useGameStore((s) => s.systemMetrics);

  return (
    <div className="relative rounded-xl border border-sky-500/40 bg-slate-900/95 p-3.5 shadow-xl backdrop-blur-md min-w-[190px]">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
          <Globe className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-100">{data?.label as string || 'Global Clients'}</div>
          <div className="text-[10px] text-sky-400/80 font-mono flex items-center gap-1">
            <Users className="h-2.5 w-2.5" /> Traffic Source
          </div>
        </div>
      </div>

      <div className="space-y-1 rounded-lg bg-slate-950/60 p-2 border border-slate-800 font-mono text-[11px]">
        <div className="flex justify-between text-slate-400">
          <span>Traffic:</span>
          <span className="text-sky-300 font-semibold">{systemMetrics.incomingRps.toLocaleString()} RPS</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Stage:</span>
          <span className="text-slate-200">{systemMetrics.stageName}</span>
        </div>
      </div>

      {/* Outgoing Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !rounded-full !border-2 !border-slate-900 !bg-sky-400"
      />
    </div>
  );
}
