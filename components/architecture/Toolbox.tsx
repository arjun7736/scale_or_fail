'use client';

import React, { useState } from 'react';
import {
  Server,
  Database,
  Split,
  Zap,
  Layers,
  ShieldCheck,
  Gauge,
  Plus,
  Lock,
  Boxes,
  Activity,
  Globe,
  ShieldAlert,
  Network,
  HardDrive,
  Sparkles,
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
  unlockStage: number;
  unlockStageName: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

const TOOLBOX_ITEMS: ToolboxItem[] = [
  // STAGE 1: Startup
  {
    type: 'app_server',
    title: 'Application Server',
    category: 'Compute',
    description: 'Stateless worker executing business logic and querying backend storage.',
    costPerHour: '$0.04 - $1.10/hr',
    unlockStage: 1,
    unlockStageName: 'Startup',
    icon: <Server className="h-4 w-4" />,
    iconBg: 'bg-teal-500/10 border-teal-500/20',
    iconColor: 'text-teal-400',
  },
  {
    type: 'database',
    title: 'PostgreSQL Database',
    category: 'Relational Storage',
    description: 'Primary ACID database for transactional reads and state persistence.',
    costPerHour: '$0.06 - $1.40/hr',
    unlockStage: 1,
    unlockStageName: 'Startup',
    icon: <Database className="h-4 w-4" />,
    iconBg: 'bg-purple-500/10 border-purple-500/20',
    iconColor: 'text-purple-400',
  },

  // STAGE 2: Growth
  {
    type: 'load_balancer',
    title: 'Layer 7 Load Balancer',
    category: 'Traffic Ingress',
    description: 'Distributes incoming HTTP traffic evenly across backend app servers with health checking.',
    costPerHour: '$0.05/hr',
    unlockStage: 2,
    unlockStageName: 'Growth',
    icon: <Split className="h-4 w-4" />,
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-400',
  },

  // STAGE 3: Viral Traffic
  {
    type: 'redis_cache',
    title: 'Redis In-Memory Cache',
    category: 'In-Memory Caching',
    description: 'Absorbs 80-90% of read queries in sub-millisecond RAM, shielding database.',
    costPerHour: '$0.08/hr',
    unlockStage: 3,
    unlockStageName: 'Viral Traffic',
    icon: <Zap className="h-4 w-4" />,
    iconBg: 'bg-rose-500/10 border-rose-500/20',
    iconColor: 'text-rose-400',
  },

  // STAGE 4: Database Bottleneck
  {
    type: 'cdn',
    title: 'Cloud CDN',
    category: 'Edge Network',
    description: 'Caches public GET requests at global edge POPs before reaching origin.',
    costPerHour: '$0.05/hr',
    unlockStage: 4,
    unlockStageName: 'DB Bottleneck',
    icon: <ShieldCheck className="h-4 w-4" />,
    iconBg: 'bg-blue-500/10 border-blue-500/20',
    iconColor: 'text-blue-400',
  },

  // STAGE 5: Production Scale
  {
    type: 'rate_limiter',
    title: 'API Rate Limiter',
    category: 'Protection',
    description: 'Shields backend by rejecting excess spikes with HTTP 429 Too Many Requests.',
    costPerHour: '$0.02/hr',
    unlockStage: 5,
    unlockStageName: 'Production Scale',
    icon: <Gauge className="h-4 w-4" />,
    iconBg: 'bg-orange-500/10 border-orange-500/20',
    iconColor: 'text-orange-400',
  },
  {
    type: 'message_queue',
    title: 'Message Queue (Async)',
    category: 'Decoupling',
    description: 'Buffers async writes and heavy workloads to prevent worker thread stalling.',
    costPerHour: '$0.07/hr',
    unlockStage: 5,
    unlockStageName: 'Production Scale',
    icon: <Layers className="h-4 w-4" />,
    iconBg: 'bg-indigo-500/10 border-indigo-500/20',
    iconColor: 'text-indigo-400',
  },

  // STAGE 6: Distributed Systems
  {
    type: 'db_sharding',
    title: 'DB Sharding Router',
    category: 'Distributed Storage',
    description: 'Partitions writes across multiple DB shards by hash key to break single-primary limits.',
    costPerHour: '$0.25/hr',
    unlockStage: 6,
    unlockStageName: 'Distributed Systems',
    icon: <Boxes className="h-4 w-4" />,
    iconBg: 'bg-pink-500/10 border-pink-500/20',
    iconColor: 'text-pink-400',
  },
  {
    type: 'kafka_stream',
    title: 'Kafka Event Stream',
    category: 'Event Streaming',
    description: 'High-throughput distributed commit log streaming millions of async events per second.',
    costPerHour: '$0.18/hr',
    unlockStage: 6,
    unlockStageName: 'Distributed Systems',
    icon: <Activity className="h-4 w-4" />,
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-400',
  },

  // STAGE 7: Hyperscale (1M Milestone)
  {
    type: 'anycast_edge',
    title: 'Anycast GeoDNS Router',
    category: 'Global Ingress',
    description: 'Routes global traffic across multi-region edge POPs with latency-based BGP routing.',
    costPerHour: '$0.15/hr',
    unlockStage: 7,
    unlockStageName: 'Hyperscale',
    icon: <Globe className="h-4 w-4" />,
    iconBg: 'bg-cyan-500/10 border-cyan-500/20',
    iconColor: 'text-cyan-400',
  },
  {
    type: 'circuit_breaker',
    title: 'Adaptive Circuit Breaker',
    category: 'Fault Tolerance',
    description: 'Automatically sheds non-critical background traffic when system reaches 90%+ saturation.',
    costPerHour: '$0.03/hr',
    unlockStage: 7,
    unlockStageName: 'Hyperscale',
    icon: <ShieldAlert className="h-4 w-4" />,
    iconBg: 'bg-rose-500/10 border-rose-500/20',
    iconColor: 'text-rose-400',
  },

  // STAGE 8: Endless Survival / Mega Hyperscale (10M - 100M)
  {
    type: 'l4_maglev',
    title: 'Kernel-Bypass L4 (Maglev)',
    category: 'Hyperscale Ingress',
    description: 'Direct Server Return (DSR) bypassing OS reverse proxy bottlenecks to route 100M+ packets.',
    costPerHour: '$0.12/hr',
    unlockStage: 8,
    unlockStageName: 'Endless Survival',
    icon: <Network className="h-4 w-4" />,
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
  {
    type: 'distributed_nosql',
    title: 'Distributed NoSQL Store',
    category: 'Hyperscale Storage',
    description: 'Decentralized quorum replication (Cassandra/DynamoDB) with linear horizontal write scaling.',
    costPerHour: '$0.35/hr',
    unlockStage: 8,
    unlockStageName: 'Endless Survival',
    icon: <HardDrive className="h-4 w-4" />,
    iconBg: 'bg-violet-500/10 border-violet-500/20',
    iconColor: 'text-violet-400',
  },
];

export function Toolbox() {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const addNode = useArchitectureStore((s) => s.addNode);
  const syncGraph = useGameStore((s) => s.syncGraph);
  const currentStage = useGameStore((s) => s.systemMetrics.stage || 1);
  const currentStageName = useGameStore((s) => s.systemMetrics.stageName || 'Startup');

  const handleDragStart = (e: React.DragEvent, item: ToolboxItem) => {
    if (currentStage < item.unlockStage) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('application/scale-or-fail-type', item.type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleQuickAdd = (item: ToolboxItem) => {
    if (currentStage < item.unlockStage) return;
    addNode(item.type);
    setTimeout(() => syncGraph(), 50);
  };

  const unlockedCount = TOOLBOX_ITEMS.filter((i) => currentStage >= i.unlockStage).length;
  const lockedCount = TOOLBOX_ITEMS.length - unlockedCount;

  const filteredItems = TOOLBOX_ITEMS.filter((item) => {
    if (filter === 'unlocked') return currentStage >= item.unlockStage;
    if (filter === 'locked') return currentStage < item.unlockStage;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-slate-900/95 border-r border-slate-800/80 w-80 select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Architecture Toolbox
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 font-medium">
            Stage {currentStage}: {currentStageName}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Drag components to canvas or click (+) to deploy.
        </p>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 mt-2.5 p-0.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[10px] font-medium font-mono">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-1 rounded text-center transition-all ${
              filter === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({TOOLBOX_ITEMS.length})
          </button>
          <button
            onClick={() => setFilter('unlocked')}
            className={`flex-1 py-1 rounded text-center transition-all ${
              filter === 'unlocked'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Unlocked ({unlockedCount})
          </button>
          <button
            onClick={() => setFilter('locked')}
            className={`flex-1 py-1 rounded text-center transition-all ${
              filter === 'locked'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Locked ({lockedCount})
          </button>
        </div>
      </div>

      {/* Component Cards List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredItems.map((item) => {
          const isLocked = currentStage < item.unlockStage;
          const isNewlyUnlocked = currentStage === item.unlockStage;

          return (
            <div
              key={item.type}
              draggable={!isLocked}
              onDragStart={(e) => handleDragStart(e, item)}
              className={`group relative rounded-xl border p-2.5 transition-all ${
                isLocked
                  ? 'border-slate-800/50 bg-slate-950/20 opacity-60 hover:opacity-75 cursor-not-allowed'
                  : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-800/40 cursor-grab active:cursor-grabbing shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                      isLocked ? 'border-slate-800 bg-slate-900 text-slate-500' : `${item.iconBg} ${item.iconColor}`
                    }`}
                  >
                    {isLocked ? <Lock className="h-4 w-4" /> : item.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-medium ${
                          isLocked ? 'text-slate-400' : 'text-slate-200 group-hover:text-white'
                        }`}
                      >
                        {item.title}
                      </span>
                      {isNewlyUnlocked && (
                        <span className="flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                          <Sparkles className="h-2.5 w-2.5" /> NEW
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {item.costPerHour} • {item.category}
                    </div>
                  </div>
                </div>

                {!isLocked ? (
                  <button
                    onClick={() => handleQuickAdd(item)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 hover:bg-teal-500/20 hover:text-teal-400 text-slate-300"
                    title="Add to canvas"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-400/90 flex items-center gap-1">
                    <Lock className="h-2.5 w-2.5" /> Stage {item.unlockStage}
                  </span>
                )}
              </div>

              <p className="mt-1.5 text-[11px] text-slate-400 leading-tight">
                {item.description}
              </p>

              {isLocked && (
                <div className="mt-2 text-[10px] font-mono text-amber-400/80 bg-amber-500/5 px-2 py-1 rounded border border-amber-500/10 flex items-center gap-1.5">
                  <Lock className="h-3 w-3 shrink-0" />
                  <span>Unlocks at Stage {item.unlockStage}: {item.unlockStageName}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer tip */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 font-mono">
        💡 <span className="text-slate-300">Scalability Roadmap:</span> Progress through traffic stages to unlock advanced hyperscale distributed systems.
      </div>
    </div>
  );
}
