'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import { RedisCacheNodeConfig } from '@/packages/simulation/core/types';

interface CacheConfigFormProps {
  config: RedisCacheNodeConfig;
  onUpdate: (patch: Partial<RedisCacheNodeConfig>) => void;
}

export function CacheConfigForm({ config, onUpdate }: CacheConfigFormProps) {
  const currentHitRate = config.hitRateTarget || 0.85;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-rose-400" /> Cache Hit Rate Target
        </label>
        <div className="space-y-2">
          <input
            type="range"
            min="0.50"
            max="0.95"
            step="0.05"
            value={currentHitRate}
            onChange={(e) => onUpdate({ hitRateTarget: parseFloat(e.target.value) })}
            className="w-full accent-rose-500 cursor-pointer"
          />
          <div className="flex justify-between font-mono text-[11px] text-slate-400">
            <span>50%</span>
            <span className="text-rose-400 font-bold">
              {Math.round(currentHitRate * 100)}% Absorption
            </span>
            <span>95%</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-slate-400 font-medium mb-1.5">Cache Cluster Memory</label>
        <div className="grid grid-cols-3 gap-2">
          {[4, 8, 16].map((gb) => (
            <button
              key={gb}
              onClick={() => onUpdate({ ramGb: gb, costPerHour: 0.04 * (gb / 4) })}
              className={`p-2 rounded-lg border text-center font-mono ${
                config.ramGb === gb
                  ? 'border-rose-500 bg-rose-500/10 text-white'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400'
              }`}
            >
              {gb} GB
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
