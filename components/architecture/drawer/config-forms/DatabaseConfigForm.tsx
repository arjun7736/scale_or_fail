'use client';

import React from 'react';
import { Database, HardDrive } from 'lucide-react';
import { DATABASE_TIERS } from '@/packages/simulation/models/economics';
import { DatabaseNodeConfig } from '@/packages/simulation/core/types';

interface DatabaseConfigFormProps {
  config: DatabaseNodeConfig;
  onUpdate: (patch: Partial<DatabaseNodeConfig>) => void;
}

export function DatabaseConfigForm({ config, onUpdate }: DatabaseConfigFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5 text-purple-400" /> Database Role
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onUpdate({ role: 'primary' })}
            className={`p-2 rounded-lg border text-center font-mono ${
              config.role === 'primary'
                ? 'border-purple-500 bg-purple-500/10 text-white'
                : 'border-slate-800 bg-slate-950/40 text-slate-400'
            }`}
          >
            PRIMARY (R/W)
          </button>
          <button
            onClick={() => onUpdate({ role: 'replica' })}
            className={`p-2 rounded-lg border text-center font-mono ${
              config.role === 'replica'
                ? 'border-purple-500 bg-purple-500/10 text-white'
                : 'border-slate-800 bg-slate-950/40 text-slate-400'
            }`}
          >
            READ REPLICA
          </button>
        </div>
      </div>

      <div>
        <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
          <HardDrive className="h-3.5 w-3.5 text-purple-400" /> Database Tier
        </label>
        <div className="grid grid-cols-1 gap-1.5">
          {(Object.keys(DATABASE_TIERS) as (keyof typeof DATABASE_TIERS)[]).map((tierKey) => {
            const t = DATABASE_TIERS[tierKey];
            const isCurrent = config.tier === tierKey;
            return (
              <button
                key={tierKey}
                onClick={() => onUpdate({ ...t })}
                className={`flex items-center justify-between p-2 rounded-lg border text-left ${
                  isCurrent
                    ? 'border-purple-500 bg-purple-500/10 text-white'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="uppercase font-mono text-[11px]">{tierKey}</div>
                  <div className="text-[10px] text-slate-500">
                    {t.maxConnections} Conns • {t.maxIops} IOPS
                  </div>
                </div>
                <span className="font-mono text-purple-400 text-[11px]">
                  ${t.costPerHour}/hr
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Query Optimization Index Toggle */}
      <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-200">Query Index Optimization</span>
          <input
            type="checkbox"
            checked={Boolean(config.queryOptimizationIndex)}
            onChange={(e) => onUpdate({ queryOptimizationIndex: e.target.checked })}
            className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-500 h-4 w-4"
          />
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          Adds B-Tree compound indices to hot query paths. Doubles read throughput capacity and reduces read query latency by 55%.
        </p>
      </div>

      {/* Connection Pooling (PgBouncer) Toggle */}
      <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-200">Connection Pooler (PgBouncer)</span>
          <input
            type="checkbox"
            checked={Boolean(config.connectionPooling)}
            onChange={(e) => onUpdate({ connectionPooling: e.target.checked })}
            className="rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-purple-500 h-4 w-4"
          />
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          Multiplexes hundreds of upstream application worker threads onto a lean pool of database backend connections. Drastically prevents connection pool exhaustion when scaling servers.
        </p>
      </div>
    </div>
  );
}
