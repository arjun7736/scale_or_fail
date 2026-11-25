'use client';

import React from 'react';
import { Split } from 'lucide-react';
import { LoadBalancerNodeConfig, LoadBalancerAlgorithm } from '@/packages/simulation/core/types';

interface LoadBalancerConfigFormProps {
  config: LoadBalancerNodeConfig;
  onUpdate: (patch: Partial<LoadBalancerNodeConfig>) => void;
}

export function LoadBalancerConfigForm({ config, onUpdate }: LoadBalancerConfigFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
          <Split className="h-3.5 w-3.5 text-amber-400" /> Balancing Algorithm
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['round_robin', 'least_conn'] as LoadBalancerAlgorithm[]).map((alg) => (
            <button
              key={alg}
              onClick={() => onUpdate({ algorithm: alg })}
              className={`p-2 rounded-lg border text-center font-mono uppercase ${
                config.algorithm === alg
                  ? 'border-amber-500 bg-amber-500/10 text-white'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400'
              }`}
            >
              {alg.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
