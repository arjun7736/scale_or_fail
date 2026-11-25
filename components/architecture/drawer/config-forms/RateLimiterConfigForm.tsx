'use client';

import React from 'react';
import { Gauge } from 'lucide-react';
import { RateLimiterNodeConfig } from '@/packages/simulation/core/types';

interface RateLimiterConfigFormProps {
  config: RateLimiterNodeConfig;
  onUpdate: (patch: Partial<RateLimiterNodeConfig>) => void;
}

export function RateLimiterConfigForm({ config, onUpdate }: RateLimiterConfigFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
          <Gauge className="h-3.5 w-3.5 text-orange-400" /> Max Allowed RPS Cap
        </label>
        <input
          type="number"
          min="1000"
          max="500000"
          step="5000"
          value={config.maxAllowedRps || 50000}
          onChange={(e) => onUpdate({ maxAllowedRps: parseInt(e.target.value) || 10000 })}
          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-slate-200 focus:border-orange-500 focus:outline-none"
        />
      </div>
    </div>
  );
}
