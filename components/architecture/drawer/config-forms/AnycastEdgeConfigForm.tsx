'use client';

import React from 'react';
import { Globe } from 'lucide-react';
import { AnycastEdgeNodeConfig } from '@/packages/simulation/core/types';

interface AnycastEdgeConfigFormProps {
  config: AnycastEdgeNodeConfig;
  onUpdate: (patch: Partial<AnycastEdgeNodeConfig>) => void;
}

export function AnycastEdgeConfigForm({ config, onUpdate }: AnycastEdgeConfigFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-cyan-400" /> Edge POPs Deployment
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[16, 32, 64, 128].map((pops) => (
            <button
              key={pops}
              onClick={() =>
                onUpdate({
                  edgePops: pops,
                  latencyReductionMs: Math.min(50, 15 + Math.round(pops * 0.3)),
                  costPerHour: 0.05 + pops * 0.002,
                })
              }
              className={`p-2 rounded-lg border text-center font-mono ${
                config.edgePops === pops
                  ? 'border-cyan-500 bg-cyan-500/10 text-white'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400'
              }`}
            >
              {pops} POPs
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
