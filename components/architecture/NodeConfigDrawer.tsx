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
  Boxes,
  Activity,
  Globe,
  ShieldAlert,
  Network,
  AlertTriangle,
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
  DbShardingNodeConfig,
  KafkaStreamNodeConfig,
  AnycastEdgeNodeConfig,
  CircuitBreakerNodeConfig,
  L4MaglevNodeConfig,
  DistributedNosqlNodeConfig,
} from '@/packages/simulation/core/types';
import { EducationalFeedbackCard } from './EducationalFeedbackCard';

export function NodeConfigDrawer() {
  const selectedNodeId = useArchitectureStore((s) => s.selectedNodeId);
  const selectedEdgeId = useArchitectureStore((s) => s.selectedEdgeId);
  const selectNode = useArchitectureStore((s) => s.selectNode);
  const selectEdge = useArchitectureStore((s) => s.selectEdge);
  const removeNode = useArchitectureStore((s) => s.removeNode);
  const removeEdge = useArchitectureStore((s) => s.removeEdge);
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);
  const validationResult = useArchitectureStore((s) => s.validationResult);

  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  const updateNodeConfigInGame = useGameStore((s) => s.updateNodeConfigInGame);
  const syncGraph = useGameStore((s) => s.syncGraph);
  const componentMetrics = useGameStore((s) =>
    selectedNodeId ? s.componentMetrics[selectedNodeId] : null
  );

  // Handle Edge Selection View
  if (selectedEdgeId) {
    const edge = edges.find((e) => e.id === selectedEdgeId);
    if (!edge) return null;
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);
    const edgeIssues = validationResult?.edgeIssuesMap[selectedEdgeId] || [];
    const edgeMetric = useGameStore.getState().edgeMetrics[selectedEdgeId];
    const primaryIssue = edgeIssues[0];
    const edgeType = (edge.data?.edgeType as string) || 'http_traffic';

    const handleDisconnect = () => {
      removeEdge(selectedEdgeId);
      selectEdge(null);
      setTimeout(() => syncGraph(), 30);
    };

    return (
      <>
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-30 md:hidden animate-in fade-in"
          onClick={() => selectEdge(null)}
        />
        <div className="fixed inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl md:inset-x-auto md:bottom-3 md:top-3 md:right-3 md:w-80 md:max-h-none md:rounded-2xl md:absolute bg-slate-900/98 md:bg-slate-900/95 border-t md:border border-slate-700 md:border-slate-800 shadow-2xl backdrop-blur-xl z-40 md:z-20 flex flex-col animate-in slide-in-from-bottom md:slide-in-from-right-4 duration-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-950/40 shrink-0">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">
                Connection Inspector
              </div>
              <div className="text-xs font-semibold text-slate-100 mt-0.5 truncate max-w-[210px]">
                {(sourceNode?.data?.label as string) || edge.source} → {(targetNode?.data?.label as string) || edge.target}
              </div>
            </div>
            <button
              onClick={() => selectEdge(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 p-3 space-y-3">
            {/* Semantic Relationship Badge */}
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 font-mono text-[11px] space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Semantic Type:</span>
                <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30 uppercase font-bold text-[10px]">
                  {edgeType.replace('_', ' ')}
                </span>
              </div>
              {edgeMetric && (
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Active Throughput:</span>
                  <span className="font-bold text-sky-400">
                    {edgeMetric.throughputRps.toLocaleString()} req/s
                  </span>
                </div>
              )}
            </div>

            {/* Educational Feedback Card */}
            <EducationalFeedbackCard
              issue={primaryIssue}
              isHealthy={!primaryIssue}
              healthyTitle="Supported Architecture Connection"
              healthyDescription={`This ${edgeType.replace('_', ' ')} connection between ${(sourceNode?.data?.label as string) || 'source'} and ${(targetNode?.data?.label as string) || 'target'} is valid and conforms to system design routing rules.`}
              healthyConcept={
                edgeType === 'replication'
                  ? 'Database Replication & Read Scaling'
                  : edgeType === 'cache_access'
                  ? 'Cache-Aside Query Acceleration'
                  : edgeType === 'async_message'
                  ? 'Asynchronous Decoupled Message Flow'
                  : 'HTTP Request Routing'
              }
            />

            {/* Disconnect Action */}
            <button
              onClick={handleDisconnect}
              className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 hover:border-rose-500 font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all mt-2"
            >
              <Trash2 className="h-3.5 w-3.5" /> Disconnect Connection
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!selectedNodeId) return null;

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const incomingEdges = edges.filter((e) => e.target === selectedNodeId);
  const outgoingEdges = edges.filter((e) => e.source === selectedNodeId);

  const type = node.type || node.data?.type;
  const config = node.data?.config as any;

  const handleUpdate = (patch: any) => {
    if (patch.role === 'primary') {
      // Demote any other database to replica to prevent split-brain write conflicts
      nodes.forEach((n) => {
        const nType = n.type || n.data?.type;
        if (nType === 'database' && n.id !== selectedNodeId && (n.data?.config as any)?.role === 'primary') {
          updateNodeConfig(n.id, { role: 'replica' });
          updateNodeConfigInGame(n.id, { role: 'replica' });
        }
      });
    }
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
    <>
      {/* Mobile Backdrop Overlay - closes on tap outside */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-30 md:hidden animate-in fade-in"
        onClick={() => selectNode(null)}
      />

      <div className="fixed inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl md:inset-x-auto md:bottom-3 md:top-3 md:right-3 md:w-80 md:max-h-none md:rounded-2xl md:absolute bg-slate-900/98 md:bg-slate-900/95 border-t md:border border-slate-700 md:border-slate-800 shadow-2xl backdrop-blur-xl z-40 md:z-20 flex flex-col animate-in slide-in-from-bottom md:slide-in-from-right-4 duration-200 overflow-hidden">
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mt-2.5 md:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-950/40 shrink-0">
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

        {/* Scrollable Drawer Body - ensures Architecture Feedback, Links & Controls all scroll smoothly */}
        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 divide-y divide-slate-800/80">
          {/* Live status banner */}
          {componentMetrics && (
            <div className="p-3 bg-slate-950/60 font-mono text-[11px] space-y-1">
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

          {/* Architecture Educational Feedback Issues */}
          {(() => {
            const nodeIssues = validationResult?.nodeIssuesMap[selectedNodeId] || [];
            if (nodeIssues.length === 0) return null;
            return (
              <div className="p-3 space-y-2 bg-slate-950/40">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 font-mono flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Architecture Feedback ({nodeIssues.length})</span>
                </div>
                {nodeIssues.map((issue) => (
                  <EducationalFeedbackCard key={issue.id} issue={issue} />
                ))}
              </div>
            );
          })()}

          {/* Connected Links & Disconnect Controls */}
          <div className="p-3 bg-slate-950/40 space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
              <span>Connected Network Links ({incomingEdges.length + outgoingEdges.length})</span>
            </div>

            {incomingEdges.length === 0 && outgoingEdges.length === 0 ? (
              <p className="text-[10px] text-slate-500 font-mono italic">No connected links</p>
            ) : (
              <div className="space-y-1.5 font-mono text-[10px]">
                {incomingEdges.map((e) => {
                  const srcNode = nodes.find((n) => n.id === e.source);
                  return (
                    <div key={e.id} className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-300 truncate max-w-[170px]">
                        ← From: <strong className="text-teal-400 font-normal">{(srcNode?.data?.label as string) || e.source}</strong>
                      </span>
                      <button
                        onClick={() => {
                          removeEdge(e.id);
                          setTimeout(() => syncGraph(), 30);
                        }}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-[9px] font-semibold transition-colors"
                        title="Disconnect this link"
                      >
                        <X className="h-2.5 w-2.5" /> Disconnect
                      </button>
                    </div>
                  );
                })}

                {outgoingEdges.map((e) => {
                  const tgtNode = nodes.find((n) => n.id === e.target);
                  return (
                    <div key={e.id} className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-300 truncate max-w-[170px]">
                        → To: <strong className="text-purple-400 font-normal">{(tgtNode?.data?.label as string) || e.target}</strong>
                      </span>
                      <button
                        onClick={() => {
                          removeEdge(e.id);
                          setTimeout(() => syncGraph(), 30);
                        }}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-[9px] font-semibold transition-colors"
                        title="Disconnect this link"
                      >
                        <X className="h-2.5 w-2.5" /> Disconnect
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Configuration Controls */}
          <div className="p-4 space-y-5 text-xs">
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

        {/* DB SHARDING CONFIG */}
        {type === 'db_sharding' && (
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
                <Boxes className="h-3.5 w-3.5 text-pink-400" /> Number of Database Shards
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[2, 4, 8, 16].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleUpdate({ shardsCount: s, writeThroughputMultiplier: s * 0.9, costPerHour: 0.10 + s * 0.04 })}
                    className={`p-2 rounded-lg border text-center font-mono ${
                      (config as DbShardingNodeConfig).shardsCount === s
                        ? 'border-pink-500 bg-pink-500/10 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400'
                    }`}
                  >
                    {s} Shards
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* KAFKA STREAM CONFIG */}
        {type === 'kafka_stream' && (
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-amber-400" /> Log Partitions
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[4, 8, 16, 32].map((p) => (
                  <button
                    key={p}
                    onClick={() => handleUpdate({ partitionsCount: p, maxRps: p * 60000, costPerHour: 0.10 + p * 0.01 })}
                    className={`p-2 rounded-lg border text-center font-mono ${
                      (config as KafkaStreamNodeConfig).partitionsCount === p
                        ? 'border-amber-500 bg-amber-500/10 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ANYCAST GEODNS CONFIG */}
        {type === 'anycast_edge' && (
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-cyan-400" /> Edge POPs Deployment
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[16, 32, 64, 128].map((pops) => (
                  <button
                    key={pops}
                    onClick={() => handleUpdate({ edgePops: pops, latencyReductionMs: Math.min(50, 15 + Math.round(pops * 0.3)), costPerHour: 0.05 + pops * 0.002 })}
                    className={`p-2 rounded-lg border text-center font-mono ${
                      (config as AnycastEdgeNodeConfig).edgePops === pops
                        ? 'border-cyan-500 bg-cyan-500/10 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400'
                    }`}
                  >
                    {pops} POPs
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CIRCUIT BREAKER CONFIG */}
        {type === 'circuit_breaker' && (
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-400" /> Trip Threshold (% CPU)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[80, 85, 90, 95].map((t) => (
                  <button
                    key={t}
                    onClick={() => handleUpdate({ thresholdPercent: t })}
                    className={`p-2 rounded-lg border text-center font-mono ${
                      (config as CircuitBreakerNodeConfig).thresholdPercent === t
                        ? 'border-rose-500 bg-rose-500/10 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400'
                    }`}
                  >
                    {t}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* L4 MAGLEV CONFIG */}
        {type === 'l4_maglev' && (
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
        )}

        {/* DISTRIBUTED NOSQL CONFIG */}
        {type === 'distributed_nosql' && (
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-violet-400" /> Consistency Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['one', 'quorum', 'all'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => handleUpdate({ consistencyLevel: lvl })}
                    className={`p-2 rounded-lg border text-center font-mono uppercase ${
                      (config as DistributedNosqlNodeConfig).consistencyLevel === lvl
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
        )}
      </div>
      </div>

      {/* Delete / Actions Footer */}
      {type !== 'client' && (
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 shrink-0">
          <button
            onClick={handleDelete}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-medium text-xs transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> Decommission Node
          </button>
        </div>
      )}
    </div>
    </>
  );
}
