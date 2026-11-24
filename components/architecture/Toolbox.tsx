'use client';

import React from 'react';
import {
  Server,
  Database,
  Split,
  Zap,
  Layers,
  ShieldCheck,
  Gauge,
  Plus,
} from 'lucide-react';
import { ComponentType } from '@/packages/simulation/core/types';
import { useArchitectureStore } from '@/stores/architectureStore';
import { useGameStore } from '@/stores/gameStore';

interface ToolboxItem {
  type: ComponentType;
  title: string;
  category: string;
  description: string;
  costPerHour: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

const TOOLBOX_ITEMS: ToolboxItem[] = [
  {
    type: 'load_balancer',
    title: 'Load Balancer',
    category: 'Ingress & Traffic',
    description: 'Distributes incoming HTTP traffic evenly across backend app servers.',
    costPerHour: '$0.05/hr',
    icon: <Split className="h-4 w-4" />,
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-400',
  },
  {
    type: 'app_server',
    title: 'Application Server',
    category: 'Compute',
    description: 'Stateless worker that executes business logic and queries storage.',
    costPerHour: '$0.04 - $1.10/hr',
    icon: <Server className="h-4 w-4" />,
    iconBg: 'bg-teal-500/10 border-teal-500/20',
    iconColor: 'text-teal-400',
  },
  {
    type: 'database',
    title: 'Database (Replica)',
    category: 'Storage',
    description: 'Relational SQL database. Handles writes (Primary) or offloads read queries (Replica).',
    costPerHour: '$0.06 - $1.40/hr',
    icon: <Database className="h-4 w-4" />,
    iconBg: 'bg-purple-500/10 border-purple-500/20',
    iconColor: 'text-purple-400',
  },
  {
    type: 'redis_cache',
    title: 'Redis Cache',
    category: 'In-Memory Caching',
    description: 'Absorbs 80-90% of read traffic in sub-millisecond RAM, shielding database.',
    costPerHour: '$0.08/hr',
    icon: <Zap className="h-4 w-4" />,
    iconBg: 'bg-rose-500/10 border-rose-500/20',
    iconColor: 'text-rose-400',
  },
  {
    type: 'message_queue',
    title: 'Message Queue',
    category: 'Decoupling',
    description: 'Buffers async writes and heavy workloads to prevent worker thread stalling.',
    costPerHour: '$0.07/hr',
    icon: <Layers className="h-4 w-4" />,
    iconBg: 'bg-indigo-500/10 border-indigo-500/20',
    iconColor: 'text-indigo-400',
  },
  {
    type: 'cdn',
    title: 'Cloud CDN',
    category: 'Edge Network',
    description: 'Caches public GET requests at global edge POPs before reaching origin.',
    costPerHour: '$0.05/hr',
    icon: <ShieldCheck className="h-4 w-4" />,
    iconBg: 'bg-blue-500/10 border-blue-500/20',
    iconColor: 'text-blue-400',
  },
  {
    type: 'rate_limiter',
    title: 'Rate Limiter',
    category: 'Protection',
    description: 'Shields backend by rejecting excess spikes with HTTP 429 Too Many Requests.',
    costPerHour: '$0.02/hr',
    icon: <Gauge className="h-4 w-4" />,
    iconBg: 'bg-orange-500/10 border-orange-500/20',
    iconColor: 'text-orange-400',
  },
];

export function Toolbox() {
  const addNode = useArchitectureStore((s) => s.addNode);
  const syncGraph = useGameStore((s) => s.syncGraph);

  const handleDragStart = (e: React.DragEvent, type: ComponentType) => {
    e.dataTransfer.setData('application/scale-or-fail-type', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleQuickAdd = (type: ComponentType) => {
    addNode(type);
    setTimeout(() => syncGraph(), 50);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border-r border-slate-800/80 w-72 select-none">
      <div className="p-3.5 border-b border-slate-800">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Infrastructure Toolbox
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Drag components to canvas or click (+) to deploy
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {TOOLBOX_ITEMS.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => handleDragStart(e, item.type)}
            className="group relative rounded-xl border border-slate-800 bg-slate-950/40 p-2.5 transition-all hover:border-slate-700 hover:bg-slate-800/40 cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${item.iconBg} ${item.iconColor}`}
                >
                  {item.icon}
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-200 group-hover:text-white">
                    {item.title}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {item.costPerHour}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleQuickAdd(item.type)}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 hover:bg-teal-500/20 hover:text-teal-400 text-slate-300"
                title="Add to canvas"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="mt-1.5 text-[11px] text-slate-400 leading-tight">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-800 bg-slate-950/30 text-[11px] text-slate-500 font-mono">
        💡 <span className="text-slate-400">Architecture Tip:</span> Connect components by dragging from the circular handles.
      </div>
    </div>
  );
}
