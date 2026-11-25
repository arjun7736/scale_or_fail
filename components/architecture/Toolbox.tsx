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
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { ComponentType } from '@/packages/simulation/core/types';
import { useArchitectureStore } from '@/stores/architectureStore';
import { useGameStore } from '@/stores/gameStore';
import { checkComponentLimit, getComponentCount } from '@/packages/simulation/models/limits';

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
    title: 'App Server (Node/Go)',
    category: 'Compute Tier',
    description: 'Stateless compute worker (Node.js/Go/Java) executing business logic and querying backend storage.',
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
    title: 'PostgreSQL Primary DB',
    category: 'Relational Storage',
    description: 'Primary ACID write master (PostgreSQL/MySQL) for transactional mutations and state persistence.',
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
    title: 'L7 Load Balancer (ALB)',
    category: 'Traffic Ingress',
    description: 'Layer 7 reverse proxy (Nginx/Envoy/AWS ALB) distributing HTTP traffic evenly with active health checking.',
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
    title: 'Redis Cache Cluster',
    category: 'In-Memory Caching',
    description: 'In-memory distributed cache (Redis/Memcached) absorbing 80-90% of read queries in sub-millisecond RAM.',
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
    title: 'Cloud CDN (Cloudflare)',
    category: 'Global Edge Network',
    description: 'Global Edge Network (Cloudflare/CloudFront) caching public GET requests at edge POPs before origin.',
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
    title: 'Rate Limiter (Envoy)',
    category: 'Ingress Perimeter',
    description: 'API gateway token bucket (Envoy/Redis) rejecting abusive traffic bursts with HTTP 429 Too Many Requests.',
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
    title: 'Message Queue (RabbitMQ)',
    category: 'Async Processing',
    description: 'Message broker (RabbitMQ/SQS) buffering write bursts so workers process jobs at a steady drain rate.',
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
    title: 'Read Replica DB (Aurora)',
    category: 'Database Scaling',
    description: 'Read-only SQL replicas (PostgreSQL/Aurora) horizontally scaling read throughput off the write master.',
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
    title: 'DB Sharding Router (Vitess)',
    category: 'Horizontal Partitions',
    description: 'Horizontal database coordinator (Vitess/Citus) hash-partitioning primary writes across isolated shards.',
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
    title: 'Kafka Event Log Cluster',
    category: 'Event Streaming',
    description: 'Distributed commit log (Apache Kafka/Pulsar) streaming millions of async partitioned events/sec.',
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
    title: 'Anycast GeoDNS (Route 53)',
    category: 'Global Ingress',
    description: 'BGP Anycast routing (AWS Route 53/Cloudflare) directing worldwide traffic to the lowest-latency edge POP.',
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
    title: 'Circuit Breaker (Hystrix)',
    category: 'Fault Tolerance',
    description: 'Adaptive load shedder (Netflix Hystrix/Resilience4j) automatically shedding non-critical load during saturation.',
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
    title: 'Kernel L4 Maglev (Katran)',
    category: 'Hyperscale Ingress',
    description: 'Kernel-bypass L4 load balancer (Google Maglev/Meta Katran) with Direct Server Return (DSR) routing 100M+ pps.',
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
    title: 'Distributed NoSQL (Cassandra)',
    category: 'Hyperscale Storage',
    description: 'Decentralized quorum storage (Cassandra/DynamoDB/ScyllaDB) with masterless horizontal write scaling.',
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
  const [lastAddedTitle, setLastAddedTitle] = useState<string | null>(null);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  const isToolboxOpen = useGameStore((s) => s.isToolboxOpen);
  const isToolboxRail = useGameStore((s) => s.isToolboxRail);
  const toggleToolbox = useGameStore((s) => s.toggleToolbox);
  const toggleToolboxRail = useGameStore((s) => s.toggleToolboxRail);

  const nodes = useArchitectureStore((s) => s.nodes);
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
    const limitCheck = checkComponentLimit(nodes, item.id, item.type);
    if (!limitCheck.allowed) {
      e.preventDefault();
      setLimitWarning(limitCheck.reason || `Only 1 ${item.title} allowed in topology.`);
      setTimeout(() => setLimitWarning(null), 3500);
      return;
    }
    e.dataTransfer.setData('application/scale-or-fail-type', item.type);
    e.dataTransfer.setData('application/scale-or-fail-id', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleQuickAdd = (item: ToolboxItem) => {
    if (currentStage < item.unlockStage) return;

    const limitCheck = checkComponentLimit(nodes, item.id, item.type);
    if (!limitCheck.allowed) {
      setLimitWarning(limitCheck.reason || `Only 1 ${item.title} allowed in topology.`);
      setTimeout(() => setLimitWarning(null), 3500);
      return;
    }

    // Calculate a slightly randomized center offset for mobile / click deploy
    const offset = (Math.random() - 0.5) * 60;
    const added = addNode(item.type, { x: 260 + offset, y: 160 + offset }, item.id);
    if (added) {
      setTimeout(() => syncGraph(), 50);
      setLastAddedTitle(item.title);
      setTimeout(() => setLastAddedTitle(null), 2000);
    }
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

  return (
    <>
      {/* Mobile Backdrop Overlay - closes on tap outside */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden animate-in fade-in"
        onClick={toggleToolbox}
      />

      {/* COMPACT ICON RAIL MODE */}
      {isToolboxRail ? (
        <div className="fixed inset-y-0 left-0 z-50 md:relative md:inset-auto md:z-auto flex flex-col h-full bg-slate-900/98 md:bg-slate-900/95 border-r border-slate-800/80 w-14 select-none shrink-0 items-center py-2.5 space-y-2 shadow-2xl md:shadow-none animate-in slide-in-from-left duration-200">
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
              const limitCheck = checkComponentLimit(nodes, item.id, item.type);
              const isLimitReached = !limitCheck.allowed;
              const isDisabled = isLocked || isLimitReached;

              return (
                <button
                  key={item.id}
                  draggable={!isDisabled}
                  onDragStart={(e) => handleDragStart(e, item)}
                  onClick={() => handleQuickAdd(item)}
                  className={`relative group flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all ${
                    isDisabled
                      ? 'border-slate-800/60 bg-slate-950/40 text-slate-600 cursor-not-allowed'
                      : `${item.iconBg} ${item.iconColor} hover:scale-105 active:scale-95 cursor-pointer`
                  }`}
                  title={`${item.title} (${item.costPerHour})${
                    isLocked
                      ? ` • Locked until Stage ${item.unlockStage}`
                      : isLimitReached
                      ? ' • In Use (Single Instance Limit: 1)'
                      : ' • Tap or drag to deploy'
                  }`}
                >
                  {isLocked ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : isLimitReached ? (
                    item.icon
                  ) : (
                    item.icon
                  )}

                  {isLocked && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/40 text-[8px] font-mono text-amber-300">
                      {item.unlockStage}
                    </span>
                  )}

                  {!isLocked && isLimitReached && (
                    <span
                      className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-teal-500/20 border border-teal-500/40 text-[8px] font-mono text-teal-300"
                      title="Already deployed in topology (Limit: 1)"
                    >
                      ✓
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
      ) : (
        /* FULL COMPACT DRAWER MODE */
        <div className="fixed inset-y-0 left-0 z-50 md:relative md:inset-auto md:z-auto flex flex-col h-full bg-slate-900/98 md:bg-slate-900/95 border-r border-slate-800/80 w-72 max-w-[85vw] select-none shrink-0 shadow-2xl md:shadow-none animate-in slide-in-from-left duration-200">
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
                  className="hidden md:inline-flex p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Collapse to Icon Rail"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={toggleToolbox}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Close Toolbox"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tap-to-Deploy Alert Banner on Mobile */}
            <div className="md:hidden flex items-center justify-between px-2 py-1 rounded bg-teal-500/10 border border-teal-500/20 text-[10px] text-teal-300 font-mono">
              <span>👉 Tap any card to deploy to canvas</span>
              <span className="text-slate-400 text-[9px]">Tap X to exit</span>
            </div>

            {/* Limit Warning Alert */}
            {limitWarning && (
              <div className="px-2 py-1.5 rounded bg-amber-500/15 border border-amber-500/40 text-[10px] text-amber-300 font-mono animate-in fade-in flex items-start gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
                <span className="leading-tight">{limitWarning}</span>
              </div>
            )}

            {/* Success feedback when component is deployed */}
            {lastAddedTitle && !limitWarning && (
              <div className="px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-[10px] text-emerald-300 font-mono animate-in fade-in">
                ✓ Deployed {lastAddedTitle} to canvas!
              </div>
            )}

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

          {/* Component Cards List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredItems.map((item) => {
              const isLocked = currentStage < item.unlockStage;
              const isNewlyUnlocked = currentStage === item.unlockStage;
              const limitCheck = checkComponentLimit(nodes, item.id, item.type);
              const isLimitReached = !limitCheck.allowed;
              const isMulti = item.id === 'app_server' || item.id === 'db_replica';
              const isDisabled = isLocked || isLimitReached;

              return (
                <div
                  key={item.id}
                  draggable={!isDisabled}
                  onDragStart={(e) => handleDragStart(e, item)}
                  onClick={() => handleQuickAdd(item)}
                  className={`group relative rounded-lg border p-2 transition-all select-none ${
                    isLocked
                      ? 'border-slate-800/40 bg-slate-950/20 opacity-60 hover:opacity-75 cursor-not-allowed'
                      : isLimitReached
                      ? 'border-slate-800/50 bg-slate-950/40 opacity-75 hover:border-slate-700 cursor-not-allowed'
                      : 'border-slate-800/80 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-800/30 active:scale-[0.98] cursor-pointer shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                          isLocked
                            ? 'border-slate-800 bg-slate-900 text-slate-500'
                            : isLimitReached
                            ? 'border-slate-800 bg-slate-900/80 text-slate-400'
                            : `${item.iconBg} ${item.iconColor}`
                        }`}
                      >
                        {isLocked ? (
                          <Lock className="h-3 w-3" />
                        ) : isLimitReached ? (
                          item.icon
                        ) : (
                          item.icon
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-[11px] font-semibold truncate ${
                              isLocked
                                ? 'text-slate-400'
                                : isLimitReached
                                ? 'text-slate-300'
                                : 'text-slate-200 group-hover:text-white'
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

                    {isLocked ? (
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-900 border border-slate-800 text-amber-400/90 shrink-0">
                        Stage {item.unlockStage}
                      </span>
                    ) : isLimitReached ? (
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-teal-400/90 flex items-center gap-1 shrink-0"
                        title={limitCheck.reason}
                      >
                        <Check className="h-2.5 w-2.5 text-teal-400" /> In Use (1/1)
                      </span>
                    ) : (
                      <div className="flex items-center gap-1 shrink-0">
                        {isMulti && limitCheck.currentCount > 0 && (
                          <span className="text-[9px] font-mono text-teal-400/80">
                            {limitCheck.currentCount} active
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAdd(item);
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded bg-slate-800 hover:bg-teal-500/20 hover:text-teal-400 text-slate-300 transition-colors"
                          title="Deploy to canvas"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="mt-1 text-[10px] text-slate-400 line-clamp-1 group-hover:line-clamp-none transition-all">
                    {item.description}
                  </p>

                  {/* Limit Hint Chip if component is single-instance and in use */}
                  {!isLocked && isLimitReached && (
                    <div className="mt-1 text-[9px] font-mono text-slate-500 flex items-center gap-1">
                      <span>🔒 Limit: 1 per architecture. Remove to redeploy.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-slate-800 bg-slate-950/40 text-[10px] text-slate-400 font-mono flex items-center justify-between">
            <span className="text-slate-500 truncate">Stage {currentStage}: {currentStageName}</span>
            <button
              onClick={toggleToolbox}
              className="text-teal-400 hover:underline text-[10px] md:hidden"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
