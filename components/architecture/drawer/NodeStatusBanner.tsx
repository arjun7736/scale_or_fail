'use client';

import React from 'react';
import { ComponentLiveMetrics } from '@/packages/simulation/core/types';

interface NodeStatusBannerProps {
  metrics: ComponentLiveMetrics | null | undefined;
}

export function NodeStatusBanner({ metrics }: NodeStatusBannerProps) {
  if (!metrics) return null;

  return (
    <div className="p-3 bg-slate-950/60 font-mono text-[11px] space-y-1">
      <div className="flex justify-between">
        <span className="text-slate-400">Health:</span>
        <span
          className={`font-semibold uppercase ${
            metrics.health === 'healthy'
              ? 'text-teal-400'
              : metrics.health === 'warning'
              ? 'text-amber-400'
              : 'text-rose-400'
          }`}
        >
          {metrics.health}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-400">Throughput In:</span>
        <span className="text-slate-200">
          {metrics.throughputInRps.toLocaleString()} RPS
        </span>
      </div>
      {metrics.droppedRps > 0 && (
        <div className="flex justify-between text-rose-400 font-semibold">
          <span>Dropped / Lost:</span>
          <span>{metrics.droppedRps.toLocaleString()} RPS</span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-slate-400">Avg Latency:</span>
        <span className="text-slate-200">{metrics.avgLatencyMs} ms</span>
      </div>
    </div>
  );
}
