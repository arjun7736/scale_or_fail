'use client';

import React from 'react';
import { Network } from 'lucide-react';
import { L4MaglevNodeConfig } from '@/packages/simulation/core/types';

interface L4MaglevConfigFormProps {
  config: L4MaglevNodeConfig;
  onUpdate: (patch: Partial<L4MaglevNodeConfig>) => void;
}

export function L4MaglevConfigForm({ config: _config, onUpdate: _onUpdate }: L4MaglevConfigFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
          <Network className="h-3.5 w-3.5 text-emerald-400" /> Packet Forwarding Mode
        </label>
        <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-mono text-[11px]">
          Direct Server Return (DSR) enabled via eBPF/XDP. Backends respond directly to clients, bypassing proxy return bandwidth.
        </div>
      </div>
    </div>
  );
}
