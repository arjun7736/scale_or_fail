'use client';

import React from 'react';
import { Activity } from 'lucide-react';
import { KafkaStreamNodeConfig } from '@/packages/simulation/core/types';

interface KafkaStreamConfigFormProps {
  config: KafkaStreamNodeConfig;
  onUpdate: (patch: Partial<KafkaStreamNodeConfig>) => void;
}

export function KafkaStreamConfigForm({ config, onUpdate }: KafkaStreamConfigFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-amber-400" /> Log Partitions
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[4, 8, 16, 32].map((p) => (
            <button
              key={p}
              onClick={() =>
                onUpdate({
                  partitionsCount: p,
                  maxRps: p * 60000,
                  costPerHour: 0.1 + p * 0.01,
                })
              }
              className={`p-2 rounded-lg border text-center font-mono ${
                config.partitionsCount === p
                  ? 'border-amber-500 bg-amber-500/10 text-white'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
