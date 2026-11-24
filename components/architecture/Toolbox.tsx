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
  ChevronLeft,
  ChevronRight,
  Search,
  LayoutList,
  Columns,
} from 'lucide-react';
import { ComponentType } from '@/packages/simulation/core/types';
import { useArchitectureStore } from '@/stores/architectureStore';
import { useGameStore } from '@/stores/gameStore';

interface ToolboxItem {
  id: string;
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
    id: 'app_server',
    type: 'app_server',
    title: 'App Server',
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
    id: 'database',
    type: 'database',
    title: 'PostgreSQL DB',
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
    id: 'load_balancer',
    type: 'load_balancer',
    title: 'Load Balancer',
    category: 'Traffic Ingress',
    description: 'Distributes incoming HTTP traffic evenly across backend app servers.',
    costPerHour: '$0.05/hr',
    unlockStage: 2,
    unlockStageName: 'Growth',
    icon: <Split className="h-4 w-4" />,
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-400',
  },

  // STAGE 3: Viral Traffic
  {
    id: 'redis_cache',
    type: 'redis_cache',
    title: 'Redis Cache',
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
    id: 'cdn',
    type: 'cdn',
    title: 'Cloud CDN',
    category: 'Edge Network',
    description: 'Caches public GET requests at global edge POPs before reaching origin.',
    costPerHour: '$0.05/hr',
    unlockStage: 4,
    unlockStageName: 'DB Bottleneck',
    icon: <Globe className="h-4 w-4" />,
    iconBg: 'bg-cyan-500/10 border-cyan-500/20',
    iconColor: 'text-cyan-400',
  },
  {
    id: 'rate_limiter',
    type: 'rate_limiter',
    title: 'Rate Limiter',
    category: 'Traffic Control',
    description: 'Shields backend against sudden spikes by rejecting excess traffic with HTTP 429.',
    costPerHour: '$0.02/hr',
    unlockStage: 4,
    unlockStageName: 'DB Bottleneck',
    icon: <Gauge className="h-4 w-4" />,
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-400',
  },

  // STAGE 5: Flash Sale Spikes
  {
    id: 'message_queue',
    type: 'message_queue',
    title: 'Message Queue',
    category: 'Asynchronous Workflows',
    description: 'Buffers write requests during flash sales so workers process at steady rate.',
    costPerHour: '$0.07/hr',
    unlockStage: 5,
    unlockStageName: 'Flash Sale',
    icon: <Layers className="h-4 w-4" />,
    iconBg: 'bg-indigo-500/10 border-indigo-500/20',
    iconColor: 'text-indigo-400',
  },
  {
    id: 'db_replica',
    type: 'database',
    title: 'Read Replica DB',
    category: 'Database Scaling',
    description: 'Read-only replicas offload queries from primary write master.',
    costPerHour: '$0.06 - $1.40/hr',
    unlockStage: 5,
    unlockStageName: 'Flash Sale',
    icon: <Boxes className="h-4 w-4" />,
    iconBg: 'bg-violet-500/10 border-violet-500/20',
    iconColor: 'text-violet-400',
  },

  // STAGE 6: Distributed Systems
  {
    id: 'db_sharding',
    type: 'db_sharding',
    title: 'DB Sharding Router',
    category: 'Distributed Database',
    description: 'Hash-partitions database writes across multiple isolated primary shards.',
    costPerHour: '$0.25/hr',
    unlockStage: 6,
    unlockStageName: 'Distributed Systems',
    icon: <Database className="h-4 w-4" />,
    iconBg: 'bg-purple-500/10 border-purple-500/20',
    iconColor: 'text-purple-400',
  },
  {
    id: 'kafka_stream',
    type: 'kafka_stream',
    title: 'Kafka Event Log',
    category: 'Event Streaming',
    description: 'High-throughput distributed commit log streaming millions of async events/sec.',
    costPerHour: '$0.18/hr',
    unlockStage: 6,
    unlockStageName: 'Distributed Systems',
    icon: <Activity className="h-4 w-4" />,
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-400',
  },

  // STAGE 7: Hyperscale (1M Milestone)
  {
    id: 'anycast_edge',
    type: 'anycast_edge',
    title: 'Anycast GeoDNS',
    category: 'Global Ingress',
    description: 'Routes global traffic across multi-region edge POPs with BGP latency routing.',
    costPerHour: '$0.15/hr',
    unlockStage: 7,
    unlockStageName: 'Hyperscale',
    icon: <Globe className="h-4 w-4" />,
    iconBg: 'bg-cyan-500/10 border-cyan-500/20',
    iconColor: 'text-cyan-400',
  },
  {
    id: 'circuit_breaker',
    type: 'circuit_breaker',
    title: 'Circuit Breaker',
    category: 'Fault Tolerance',
    description: 'Automatically sheds non-critical background traffic during heavy saturation.',
    costPerHour: '$0.03/hr',
    unlockStage: 7,
    unlockStageName: 'Hyperscale',
    icon: <ShieldAlert className="h-4 w-4" />,
    iconBg: 'bg-rose-500/10 border-rose-500/20',
    iconColor: 'text-rose-400',
  },

  // STAGE 8: Endless Survival / Mega Hyperscale (10M - 100M)
  {
    id: 'l4_maglev',
    type: 'l4_maglev',
    title: 'Kernel L4 (Maglev)',
    category: 'Hyperscale Ingress',
    description: 'DSR kernel bypass routing 100M+ packets without reverse proxy bottlenecks.',
    costPerHour: '$0.12/hr',
    unlockStage: 8,
    unlockStageName: 'Endless Survival',
    icon: <Network className="h-4 w-4" />,
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
  {
    id: 'distributed_nosql',
    type: 'distributed_nosql',
    title: 'Distributed NoSQL',
    category: 'Hyperscale Storage',
    description: 'Decentralized quorum replication with linear horizontal write scaling.',
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
  const [searchQuery, setSearchQuery] = useState('');

  const isToolboxOpen = useGameStore((s) => s.isToolboxOpen);
  const isToolboxRail = useGameStore((s) => s.isToolboxRail);
  const toggleToolbox = useGameStore((s) => s.toggleToolbox);
  const toggleToolboxRail = useGameStore((s) => s.toggleToolboxRail);

  const addNode = useArchitectureStore((s) => s.addNode);
  const syncGraph = useGameStore((s) => s.syncGraph);
  const currentStage = useGameStore((s) => s.systemMetrics.stage || 1);
  const currentStageName = useGameStore((s) => s.systemMetrics.stageName || 'Startup');

  if (!isToolboxOpen) return null;

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
    if (filter === 'unlocked' && currentStage < item.unlockStage) return false;
    if (filter === 'locked' && currentStage >= item.unlockStage) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // COMPACT ICON RAIL MODE
  if (isToolboxRail) {
    return (
      <div className="flex flex-col h-full bg-slate-900/95 border-r border-slate-800/80 w-14 select-none shrink-0 items-center py-2.5 space-y-2">
        <button
          onClick={toggleToolboxRail}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Expand to Full Card View"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="w-8 h-px bg-slate-800" />

        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full flex flex-col items-center space-y-2 px-1">
          {TOOLBOX_ITEMS.map((item) => {
            const isLocked = currentStage < item.unlockStage;
            return (
              <button
                key={item.id}
                draggable={!isLocked}
                onDragStart={(e) => handleDragStart(e, item)}
                onClick={() => handleQuickAdd(item)}
                className={`relative group flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all ${
                  isLocked
                    ? 'border-slate-800/60 bg-slate-950/40 text-slate-600 cursor-not-allowed'
                    : `${item.iconBg} ${item.iconColor} hover:scale-105 hover:shadow-md cursor-grab active:cursor-grabbing`
                }`}
                title={`${item.title} (${item.costPerHour})${isLocked ? ` • Locked until Stage ${item.unlockStage}` : ' • Click or drag to canvas'}`}
              >
                {isLocked ? <Lock className="h-3.5 w-3.5" /> : item.icon}
                {isLocked && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/40 text-[8px] font-mono text-amber-300">
                    {item.unlockStage}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="text-[9px] font-mono text-slate-500 text-center">
          S{currentStage}
        </div>
      </div>
    );
  }

  // SLEEK COMPACT DRAWER MODE (w-72)
  return (
    <div className="flex flex-col h-full bg-slate-900/95 border-r border-slate-800/80 w-72 select-none shrink-0 transition-all">
      {/* Header */}
      <div className="p-2.5 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Toolbox
            </h2>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300">
              S{currentStage}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleToolboxRail}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Collapse to Icon Rail"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={toggleToolbox}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Toolbox (Ctrl+B)"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative">
          <Search className="h-3 w-3 absolute left-2 top-2 text-slate-500" />
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/70 border border-slate-800 rounded-lg pl-7 pr-2 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500/50"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 p-0.5 rounded-md bg-slate-950/70 border border-slate-800/80 text-[10px] font-medium font-mono">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-0.5 rounded text-center transition-all ${
              filter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({TOOLBOX_ITEMS.length})
          </button>
          <button
            onClick={() => setFilter('unlocked')}
            className={`flex-1 py-0.5 rounded text-center transition-all ${
              filter === 'unlocked'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Unlocked ({unlockedCount})
          </button>
          <button
            onClick={() => setFilter('locked')}
            className={`flex-1 py-0.5 rounded text-center transition-all ${
              filter === 'locked'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Locked ({lockedCount})
          </button>
        </div>
      </div>

      {/* Component Cards List - Compact, sleek cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredItems.map((item) => {
          const isLocked = currentStage < item.unlockStage;
          const isNewlyUnlocked = currentStage === item.unlockStage;

          return (
            <div
              key={item.id}
              draggable={!isLocked}
              onDragStart={(e) => handleDragStart(e, item)}
              className={`group relative rounded-lg border p-2 transition-all ${
                isLocked
                  ? 'border-slate-800/40 bg-slate-950/20 opacity-60 hover:opacity-75 cursor-not-allowed'
                  : 'border-slate-800/80 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-800/30 cursor-grab active:cursor-grabbing shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                      isLocked ? 'border-slate-800 bg-slate-900 text-slate-500' : `${item.iconBg} ${item.iconColor}`
                    }`}
                  >
                    {isLocked ? <Lock className="h-3 w-3" /> : item.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[11px] font-semibold truncate ${
                          isLocked ? 'text-slate-400' : 'text-slate-200 group-hover:text-white'
                        }`}
                      >
                        {item.title}
                      </span>
                      {isNewlyUnlocked && (
                        <span className="text-[8px] font-mono px-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono truncate">
                      {item.costPerHour} • {item.category}
                    </div>
                  </div>
                </div>

                {!isLocked ? (
                  <button
                    onClick={() => handleQuickAdd(item)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-800 hover:bg-teal-500/20 hover:text-teal-400 text-slate-300"
                    title="Add to canvas"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                ) : (
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-900 border border-slate-800 text-amber-400/90 shrink-0">
                    Stage {item.unlockStage}
                  </span>
                )}
              </div>

              <p className="mt-1 text-[10px] text-slate-400 line-clamp-1 group-hover:line-clamp-none transition-all">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Footer tip */}
      <div className="p-2 border-t border-slate-800 bg-slate-950/40 text-[10px] text-slate-400 font-mono flex items-center justify-between">
        <span className="text-slate-500">Stage {currentStage}: {currentStageName}</span>
        <button
          onClick={toggleToolboxRail}
          className="text-teal-400 hover:underline text-[10px]"
        >
          Rail view
        </button>
      </div>
    </div>
  );
}
