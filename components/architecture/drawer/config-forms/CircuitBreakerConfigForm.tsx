'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { CircuitBreakerNodeConfig } from '@/packages/simulation/core/types';

interface CircuitBreakerConfigFormProps {
  config: CircuitBreakerNodeConfig;
  onUpdate: (patch: Partial<CircuitBreakerNodeConfig>) => void;
}

export function CircuitBreakerConfigForm({ config, onUpdate }: CircuitBreakerConfigFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 text-rose-400" /> Trip Threshold (% CPU)
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[80, 85, 90, 95].map((t) => (
            <button
              key={t}
              onClick={() => onUpdate({ thresholdPercent: t })}
              className={`p-2 rounded-lg border text-center font-mono ${
                config.thresholdPercent === t
                  ? 'border-rose-500 bg-rose-500/10 text-white'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400'
              }`}
            >
              {t}%
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
