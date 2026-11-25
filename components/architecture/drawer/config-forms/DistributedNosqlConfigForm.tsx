'use client';

import React from 'react';
import { HardDrive } from 'lucide-react';
import { DistributedNosqlNodeConfig } from '@/packages/simulation/core/types';

interface DistributedNosqlConfigFormProps {
  config: DistributedNosqlNodeConfig;
  onUpdate: (patch: Partial<DistributedNosqlNodeConfig>) => void;
}

export function DistributedNosqlConfigForm({ config, onUpdate }: DistributedNosqlConfigFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
          <HardDrive className="h-3.5 w-3.5 text-violet-400" /> Consistency Level
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['one', 'quorum', 'all'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => onUpdate({ consistencyLevel: lvl })}
              className={`p-2 rounded-lg border text-center font-mono uppercase ${
                config.consistencyLevel === lvl
                  ? 'border-violet-500 bg-violet-500/10 text-white'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
