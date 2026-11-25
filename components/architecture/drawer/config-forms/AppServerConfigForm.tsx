'use client';

import React from 'react';
import { Cpu } from 'lucide-react';
import { SERVER_TIERS } from '@/packages/simulation/models/economics';
import { AppServerNodeConfig } from '@/packages/simulation/core/types';

interface AppServerConfigFormProps {
  config: AppServerNodeConfig;
  onUpdate: (patch: Partial<AppServerNodeConfig>) => void;
}

export function AppServerConfigForm({ config, onUpdate }: AppServerConfigFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-teal-400" /> Instance Tier
        </label>
        <div className="grid grid-cols-1 gap-1.5">
          {(Object.keys(SERVER_TIERS) as (keyof typeof SERVER_TIERS)[]).map((tierKey) => {
            const t = SERVER_TIERS[tierKey];
            const isCurrent = config.tier === tierKey;
            return (
              <button
                key={tierKey}
                onClick={() => onUpdate({ ...t })}
                className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                  isCurrent
                    ? 'border-teal-500 bg-teal-500/10 text-white font-medium'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="uppercase font-mono text-[11px]">{tierKey}</div>
                  <div className="text-[10px] text-slate-500">
                    {t.cpuCores} Cores • {t.ramGb}GB RAM • {t.threadPoolSize} Threads
                  </div>
                </div>
                <span className="font-mono text-teal-400 text-[11px]">
                  ${t.costPerHour}/hr
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
