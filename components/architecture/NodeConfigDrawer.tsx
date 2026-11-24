'use client';

import React from 'react';
import {
  X,
  Trash2,
  Cpu,
  HardDrive,
  Database,
  Zap,
  Split,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Gauge,
} from 'lucide-react';
import { useArchitectureStore } from '@/stores/architectureStore';
import { useGameStore } from '@/stores/gameStore';
import { SERVER_TIERS, DATABASE_TIERS } from '@/packages/simulation/models/economics';
import {
  AppServerNodeConfig,
  DatabaseNodeConfig,
  RedisCacheNodeConfig,
  LoadBalancerNodeConfig,
  RateLimiterNodeConfig,
  MessageQueueNodeConfig,
} from '@/packages/simulation/core/types';

export function NodeConfigDrawer() {
  const selectedNodeId = useArchitectureStore((s) => s.selectedNodeId);
  const selectNode = useArchitectureStore((s) => s.selectNode);
  const removeNode = useArchitectureStore((s) => s.removeNode);
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);

  const nodes = useArchitectureStore((s) => s.nodes);
  const updateNodeConfigInGame = useGameStore((s) => s.updateNodeConfigInGame);
  const syncGraph = useGameStore((s) => s.syncGraph);
  const componentMetrics = useGameStore((s) =>
    selectedNodeId ? s.componentMetrics[selectedNodeId] : null
  );

  if (!selectedNodeId) return null;

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const type = node.type || node.data?.type;
  const config = node.data?.config as any;

  const handleUpdate = (patch: any) => {
    updateNodeConfig(selectedNodeId, patch);
    updateNodeConfigInGame(selectedNodeId, patch);
    setTimeout(() => syncGraph(), 30);
  };

  const handleDelete = () => {
    removeNode(selectedNodeId);
    selectNode(null);
    setTimeout(() => syncGraph(), 30);
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900/95 border-l border-slate-800 shadow-2xl backdrop-blur-xl z-20 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400 font-mono">
            Node Configuration
          </div>
          <div className="text-sm font-semibold text-slate-100 mt-0.5">
            {(node.data?.label as string) || node.id}
          </div>
        </div>

        <button
          onClick={() => selectNode(null)}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Live status banner */}
      {componentMetrics && (
        <div className="p-3 bg-slate-950/60 border-b border-slate-800/80 font-mono text-[11px] space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Health:</span>
            <span
              className={`font-semibold uppercase ${
                componentMetrics.health === 'healthy'
                  ? 'text-teal-400'
                  : componentMetrics.health === 'warning'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {componentMetrics.health}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Throughput In:</span>
            <span className="text-slate-200">
              {componentMetrics.throughputInRps.toLocaleString()} RPS
            </span>
          </div>
          {componentMetrics.droppedRps > 0 && (
            <div className="flex justify-between text-rose-400 font-semibold">
              <span>Dropped / Lost:</span>
              <span>{componentMetrics.droppedRps.toLocaleString()} RPS</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-400">Avg Latency:</span>
            <span className="text-slate-200">{componentMetrics.avgLatencyMs} ms</span>
          </div>
        </div>
      )}

      {/* Configuration Controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* APP SERVER CONFIG */}
        {type === 'app_server' && (
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-teal-400" /> Instance Tier
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {(Object.keys(SERVER_TIERS) as (keyof typeof SERVER_TIERS)[]).map((tierKey) => {
                  const t = SERVER_TIERS[tierKey];
                  const isCurrent = (config as AppServerNodeConfig).tier === tierKey;
                  return (
                    <button
                      key={tierKey}
                      onClick={() => handleUpdate({ ...t })}
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
        )}

        {/* DATABASE CONFIG */}
        {type === 'database' && (
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-purple-400" /> Database Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleUpdate({ role: 'primary' })}
                  className={`p-2 rounded-lg border text-center font-mono ${
                    (config as DatabaseNodeConfig).role === 'primary'
                      ? 'border-purple-500 bg-purple-500/10 text-white'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400'
                  }`}
                >
                  PRIMARY (R/W)
                </button>
                <button
                  onClick={() => handleUpdate({ role: 'replica' })}
                  className={`p-2 rounded-lg border text-center font-mono ${
                    (config as DatabaseNodeConfig).role === 'replica'
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
                  const isCurrent = (config as DatabaseNodeConfig).tier === tierKey;
                  return (
                    <button
                      key={tierKey}
                      onClick={() => handleUpdate({ ...t })}
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
                  checked={Boolean((config as DatabaseNodeConfig).queryOptimizationIndex)}
                  onChange={(e) => handleUpdate({ queryOptimizationIndex: e.target.checked })}
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
                  checked={Boolean((config as DatabaseNodeConfig).connectionPooling)}
                  onChange={(e) => handleUpdate({ connectionPooling: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-purple-500 h-4 w-4"
                />
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Multiplexes hundreds of upstream application worker threads onto a lean pool of database backend connections. Drastically prevents connection pool exhaustion when scaling servers.
              </p>
            </div>
          </div>
        )}

        {/* REDIS CACHE CONFIG */}
        {type === 'redis_cache' && (
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-rose-400" /> Cache Hit Rate Target
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0.50"
                  max="0.95"
                  step="0.05"
                  value={(config as RedisCacheNodeConfig).hitRateTarget || 0.85}
                  onChange={(e) => handleUpdate({ hitRateTarget: parseFloat(e.target.value) })}
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <div className="flex justify-between font-mono text-[11px] text-slate-400">
                  <span>50%</span>
                  <span className="text-rose-400 font-bold">
                    {Math.round(((config as RedisCacheNodeConfig).hitRateTarget || 0.85) * 100)}% Absorption
                  </span>
                  <span>95%</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1.5">Cache Cluster Memory</label>
              <div className="grid grid-cols-3 gap-2">
                {[4, 8, 16].map((gb) => (
                  <button
                    key={gb}
                    onClick={() => handleUpdate({ ramGb: gb, costPerHour: 0.04 * (gb / 4) })}
                    className={`p-2 rounded-lg border text-center font-mono ${
                      (config as RedisCacheNodeConfig).ramGb === gb
                        ? 'border-rose-500 bg-rose-500/10 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400'
                    }`}
                  >
                    {gb} GB
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LOAD BALANCER CONFIG */}
        {type === 'load_balancer' && (
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
                <Split className="h-3.5 w-3.5 text-amber-400" /> Balancing Algorithm
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['round_robin', 'least_conn'].map((alg) => (
                  <button
                    key={alg}
                    onClick={() => handleUpdate({ algorithm: alg })}
                    className={`p-2 rounded-lg border text-center font-mono uppercase ${
                      (config as LoadBalancerNodeConfig).algorithm === alg
                        ? 'border-amber-500 bg-amber-500/10 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400'
                    }`}
                  >
                    {alg.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RATE LIMITER CONFIG */}
        {type === 'rate_limiter' && (
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5 text-orange-400" /> Max Allowed RPS Cap
              </label>
              <input
                type="number"
                min="1000"
                max="500000"
                step="5000"
                value={(config as RateLimiterNodeConfig).maxAllowedRps || 50000}
                onChange={(e) => handleUpdate({ maxAllowedRps: parseInt(e.target.value) || 10000 })}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-slate-200 focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* MESSAGE QUEUE CONFIG */}
        {type === 'message_queue' && (
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-400" /> Worker Consumers
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[2, 4, 8, 16].map((w) => (
                  <button
                    key={w}
                    onClick={() => handleUpdate({ workersCount: w, costPerHour: 0.03 + w * 0.01 })}
                    className={`p-2 rounded-lg border text-center font-mono ${
                      (config as MessageQueueNodeConfig).workersCount === w
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
        )}
      </div>

      {/* Delete / Actions Footer */}
      {type !== 'client' && (
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <button
            onClick={handleDelete}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-medium text-xs transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> Decommission Node
          </button>
        </div>
      )}
    </div>
  );
}
