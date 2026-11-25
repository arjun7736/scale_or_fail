'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import { MessageQueueNodeConfig } from '@/packages/simulation/core/types';

interface MessageQueueConfigFormProps {
  config: MessageQueueNodeConfig;
  onUpdate: (patch: Partial<MessageQueueNodeConfig>) => void;
}

export function MessageQueueConfigForm({ config, onUpdate }: MessageQueueConfigFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-indigo-400" /> Worker Consumers
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[2, 4, 8, 16].map((w) => (
            <button
              key={w}
              onClick={() => onUpdate({ workersCount: w, costPerHour: 0.03 + w * 0.01 })}
              className={`p-2 rounded-lg border text-center font-mono ${
                config.workersCount === w
                  ? 'border-indigo-500 bg-indigo-500/10 text-white'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
