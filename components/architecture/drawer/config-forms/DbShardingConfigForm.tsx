'use client';

import React from 'react';
import { Boxes } from 'lucide-react';
import { DbShardingNodeConfig } from '@/packages/simulation/core/types';

interface DbShardingConfigFormProps {
  config: DbShardingNodeConfig;
  onUpdate: (patch: Partial<DbShardingNodeConfig>) => void;
}

export function DbShardingConfigForm({ config, onUpdate }: DbShardingConfigFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-pink-400" /> Number of Database Shards
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[2, 4, 8, 16].map((s) => (
            <button
              key={s}
              onClick={() =>
                onUpdate({
                  shardsCount: s,
                  writeThroughputMultiplier: s * 0.9,
                  costPerHour: 0.1 + s * 0.04,
                })
              }
              className={`p-2 rounded-lg border text-center font-mono ${
                config.shardsCount === s
                  ? 'border-pink-500 bg-pink-500/10 text-white'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400'
              }`}
            >
              {s} Shards
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
