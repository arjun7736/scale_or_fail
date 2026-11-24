import {
  ArchitectureGraph,
  ArchitectureNode,
  ArchitectureEdge,
  ComponentLiveMetrics,
  ComponentType,
  EdgeLiveMetrics,
  SystemMetrics,
} from '../core/types';
import { DecomposedTraffic } from '../traffic/request-mix';
import {
  calculateAppServerCapacity,
  calculateDatabaseCapacity,
  calculateRedisCapacity,
  calculateQueueCapacity,
} from '../models/capacity';
import { calculateQueueingMetrics } from '../models/queueing';
import { validateArchitectureGraph } from './graph-validator';

export interface RouteResult {
  systemMetricsPartial: Partial<SystemMetrics>;
  componentMetrics: Record<string, ComponentLiveMetrics>;
  edgeMetrics: Record<string, EdgeLiveMetrics>;
  bottleneckNodeId?: string;
  bottleneckType?: ComponentType;
  bottleneckReason?: string;
  isTotalBlackout: boolean;
}

export function routeTrafficThroughGraph(
  graph: ArchitectureGraph,
  traffic: DecomposedTraffic,
  currentSimSeconds: number,
  previousComponentMetrics?: Record<string, ComponentLiveMetrics>
): RouteResult {
  const componentMetrics: Record<string, ComponentLiveMetrics> = {};
  const edgeMetrics: Record<string, EdgeLiveMetrics> = {};
  const validation = validateArchitectureGraph(graph);

  // Initialize edge metrics
  for (const edge of graph.edges) {
    edgeMetrics[edge.id] = {
      edgeId: edge.id,
      source: edge.source,
      target: edge.target,
      throughputRps: 0,
      avgLatencyMs: 0,
      status: 'healthy',
    };
  }

  // Initialize component metrics for all nodes (defaulting to idle if unrouted)
  for (const node of graph.nodes) {
    componentMetrics[node.id] = {
      nodeId: node.id,
      type: node.type,
      health: 'healthy',
      cpuUtilization: 0,
      ramUtilization: 10,
      connectionsActive: 0,
      connectionsMax: 100,
      queueDepth: 0,
      throughputInRps: 0,
      throughputOutRps: 0,
      droppedRps: 0,
      avgLatencyMs: 10,
      p95LatencyMs: 15,
      errorRate: 0,
      costPerHour: node.config.costPerHour || 0,
      statusMessage: node.type === 'client' ? 'Traffic Source' : 'Idle / Disconnected',
    };
  }

  // Total Blackout if graph cannot serve traffic at all
  if (!validation.canServeTraffic) {
    const errorMsg = validation.issues.find((i) => i.type === 'error')?.message || 'System misconfigured';
    return {
      systemMetricsPartial: {
        incomingRps: traffic.totalRps,
        succeededRps: 0,
        failedRps: traffic.totalRps,
        inFlightRequests: 0,
        avgLatencyMs: 3000,
        p95LatencyMs: 3000,
        errorRate: 1.0,
        systemHealth: 'crashed',
      },
      componentMetrics,
      edgeMetrics,
      bottleneckReason: errorMsg,
      isTotalBlackout: true,
    };
  }

  const nodeMap = new Map<string, ArchitectureNode>(graph.nodes.map((n) => [n.id, n]));
  const outgoingEdges = new Map<string, ArchitectureEdge[]>();
  const incomingEdges = new Map<string, ArchitectureEdge[]>();

  for (const node of graph.nodes) {
    outgoingEdges.set(node.id, []);
    incomingEdges.set(node.id, []);
  }
  for (const edge of graph.edges) {
    outgoingEdges.get(edge.source)?.push(edge);
    incomingEdges.get(edge.target)?.push(edge);
  }

  const clientNode = graph.nodes.find((n) => n.type === 'client');
  if (!clientNode) {
    return {
      systemMetricsPartial: { incomingRps: traffic.totalRps, succeededRps: 0, failedRps: traffic.totalRps, errorRate: 1.0 },
      componentMetrics,
      edgeMetrics,
      isTotalBlackout: true,
    };
  }

  let currentTrafficRps = traffic.totalRps;
  componentMetrics[clientNode.id].throughputOutRps = currentTrafficRps;
  componentMetrics[clientNode.id].statusMessage = 'Generating Traffic';

  // Helper to record edge telemetry
  const recordEdgeFlow = (sourceId: string, targetId: string, rps: number, latencyMs: number, status: 'healthy' | 'warning' | 'critical' = 'healthy') => {
    const edge = graph.edges.find((e) => e.source === sourceId && e.target === targetId);
    if (edge && edgeMetrics[edge.id]) {
      edgeMetrics[edge.id].throughputRps = rps;
      edgeMetrics[edge.id].avgLatencyMs = latencyMs;
      edgeMetrics[edge.id].status = status;
    }
  };

  // 1. Edge Layer: CDN (Edge cache)
  const clientOutEdges = outgoingEdges.get(clientNode.id) || [];
  const cdnEdge = clientOutEdges.find((e) => nodeMap.get(e.target)?.type === 'cdn');
  const cdnNode = cdnEdge ? nodeMap.get(cdnEdge.target) : undefined;

  let cdnAbsorbedRps = 0;
  let nextIngressEdges = clientOutEdges;

  if (cdnNode && cdnNode.type === 'cdn') {
    const cdnConfig = cdnNode.config as import('../core/types').CdnNodeConfig;
    cdnAbsorbedRps = Math.floor(traffic.cdnEligibleRps * cdnConfig.cacheHitRatio);
    currentTrafficRps = Math.max(0, currentTrafficRps - cdnAbsorbedRps);

    componentMetrics[cdnNode.id].throughputInRps = traffic.totalRps;
    componentMetrics[cdnNode.id].throughputOutRps = currentTrafficRps;
    componentMetrics[cdnNode.id].cpuUtilization = 15;
    componentMetrics[cdnNode.id].avgLatencyMs = 8;
    componentMetrics[cdnNode.id].p95LatencyMs = 12;
    componentMetrics[cdnNode.id].statusMessage = `Edge Cache Hit: ${Math.round(cdnConfig.cacheHitRatio * 100)}% (Absorbed ${cdnAbsorbedRps} RPS)`;

    recordEdgeFlow(clientNode.id, cdnNode.id, traffic.totalRps, 8, 'healthy');
    nextIngressEdges = outgoingEdges.get(cdnNode.id) || [];
  }

  // 2. Gateway Layer: Rate Limiter
  const rlEdge = nextIngressEdges.find((e) => nodeMap.get(e.target)?.type === 'rate_limiter');
  const rateLimiterNode = rlEdge ? nodeMap.get(rlEdge.target) : undefined;
  let rateLimitDroppedRps = 0;

  if (rateLimiterNode && rateLimiterNode.type === 'rate_limiter') {
    const rlConfig = rateLimiterNode.config as import('../core/types').RateLimiterNodeConfig;
    componentMetrics[rateLimiterNode.id].throughputInRps = currentTrafficRps;

    const allowedCap = rlConfig.maxAllowedRps * rlConfig.burstAllowance;
    if (currentTrafficRps > allowedCap) {
      rateLimitDroppedRps = Math.floor(currentTrafficRps - allowedCap);
      currentTrafficRps = allowedCap;
      componentMetrics[rateLimiterNode.id].health = 'warning';
      componentMetrics[rateLimiterNode.id].statusMessage = `Rate limiting: Dropping ${rateLimitDroppedRps} req/s (429 Too Many Requests)`;
    } else {
      componentMetrics[rateLimiterNode.id].statusMessage = 'Passing traffic';
    }

    componentMetrics[rateLimiterNode.id].droppedRps = rateLimitDroppedRps;
    componentMetrics[rateLimiterNode.id].throughputOutRps = currentTrafficRps;

    const ingressSource = cdnNode ? cdnNode.id : clientNode.id;
    recordEdgeFlow(ingressSource, rateLimiterNode.id, componentMetrics[rateLimiterNode.id].throughputInRps, 2, rateLimitDroppedRps > 0 ? 'warning' : 'healthy');
    nextIngressEdges = outgoingEdges.get(rateLimiterNode.id) || [];
  }

  // 3. Ingress Layer: Load Balancer(s) or Direct to App Servers
  const lbEdges = nextIngressEdges.filter((e) => nodeMap.get(e.target)?.type === 'load_balancer');
  const serverTrafficMap = new Map<string, number>();

  if (lbEdges.length > 0) {
    const lbEdge = lbEdges[0]!;
    const lb = nodeMap.get(lbEdge.target)!;
    const lbConfig = lb.config as import('../core/types').LoadBalancerNodeConfig;

    const ingressSource = rateLimiterNode ? rateLimiterNode.id : cdnNode ? cdnNode.id : clientNode.id;
    recordEdgeFlow(ingressSource, lb.id, currentTrafficRps, 2, 'healthy');

    componentMetrics[lb.id].throughputInRps = currentTrafficRps;

    // LB capacity check
    const lbUtilization = currentTrafficRps / Math.max(1, lbConfig.maxRps);
    componentMetrics[lb.id].cpuUtilization = Math.min(100, Math.round(lbUtilization * 100));

    let availableTrafficToDistribute = currentTrafficRps;
    if (lbUtilization > 1.0) {
      const excess = currentTrafficRps - lbConfig.maxRps;
      componentMetrics[lb.id].droppedRps = excess;
      componentMetrics[lb.id].health = 'critical';
      componentMetrics[lb.id].statusMessage = 'Load Balancer throughput saturated';
      availableTrafficToDistribute = lbConfig.maxRps;
    } else if (lbUtilization > 0.85) {
      componentMetrics[lb.id].health = 'warning';
      componentMetrics[lb.id].statusMessage = 'High ingress load';
    } else {
      componentMetrics[lb.id].health = 'healthy';
      componentMetrics[lb.id].statusMessage = `Balancing via ${lbConfig.algorithm.toUpperCase()}`;
    }

    componentMetrics[lb.id].throughputOutRps = availableTrafficToDistribute;
    componentMetrics[lb.id].avgLatencyMs = 2 + lbUtilization * 4;
    componentMetrics[lb.id].p95LatencyMs = 4 + lbUtilization * 8;

    // Discover App Servers connected to this Load Balancer
    const downstreamServerEdges = (outgoingEdges.get(lb.id) || []).filter(
      (e) => nodeMap.get(e.target)?.type === 'app_server'
    );
    const downstreamServers = downstreamServerEdges.map((e) => nodeMap.get(e.target)!);

    // Health-Check Filter: Reroute traffic around failed instances!
    const healthyServers = downstreamServers.filter((server) => {
      const prev = previousComponentMetrics ? previousComponentMetrics[server.id] : undefined;
      return !prev || prev.health !== 'failed';
    });

    if (healthyServers.length === 0 && downstreamServers.length > 0) {
      // All backend servers crashed!
      componentMetrics[lb.id].health = 'critical';
      componentMetrics[lb.id].statusMessage = 'HTTP 503: All backend app servers are offline or crashed!';
      componentMetrics[lb.id].droppedRps = availableTrafficToDistribute;
      availableTrafficToDistribute = 0;
    } else if (healthyServers.length < downstreamServers.length) {
      componentMetrics[lb.id].health = 'warning';
      componentMetrics[lb.id].statusMessage = `Health check: ${downstreamServers.length - healthyServers.length} server(s) offline. Failing over to ${healthyServers.length} active node(s).`;
    }

    // Distribute among healthy servers
    if (healthyServers.length > 0 && availableTrafficToDistribute > 0) {
      if (lbConfig.algorithm === 'least_conn') {
        // Weighted by server capacity (cores / baseProcessingMs)
        const weights = healthyServers.map((s) => {
          const cfg = s.config as import('../core/types').AppServerNodeConfig;
          return cfg.cpuCores * (1000 / Math.max(1, cfg.baseProcessingMs));
        });
        const totalWeight = weights.reduce((acc, w) => acc + w, 0);

        healthyServers.forEach((server, idx) => {
          const weightFraction = weights[idx]! / Math.max(1, totalWeight);
          const rps = Math.floor(availableTrafficToDistribute * weightFraction);
          serverTrafficMap.set(server.id, rps);
          recordEdgeFlow(lb.id, server.id, rps, 3, 'healthy');
        });
      } else {
        // Round Robin: even split
        const rpsPerServer = Math.floor(availableTrafficToDistribute / healthyServers.length);
        healthyServers.forEach((server) => {
          serverTrafficMap.set(server.id, rpsPerServer);
          recordEdgeFlow(lb.id, server.id, rpsPerServer, 3, 'healthy');
        });
      }
    }
  } else {
    // Direct from Ingress (Client/CDN/RateLimiter) to App Servers
    const directServerEdges = nextIngressEdges.filter((e) => nodeMap.get(e.target)?.type === 'app_server');
    if (directServerEdges.length > 0) {
      const rpsPerServer = Math.floor(currentTrafficRps / directServerEdges.length);
      const ingressSource = rateLimiterNode ? rateLimiterNode.id : cdnNode ? cdnNode.id : clientNode.id;
      directServerEdges.forEach((e) => {
        serverTrafficMap.set(e.target, rpsPerServer);
        recordEdgeFlow(ingressSource, e.target, rpsPerServer, 2, 'healthy');
      });
    }
  }

  // Active App Servers that received traffic
  const allAppServers = graph.nodes.filter((n) => n.type === 'app_server');
  const activeServers = allAppServers.filter((s) => (serverTrafficMap.get(s.id) || 0) > 0);

  if (activeServers.length === 0) {
    return {
      systemMetricsPartial: {
        incomingRps: traffic.totalRps,
        succeededRps: cdnAbsorbedRps,
        failedRps: traffic.totalRps - cdnAbsorbedRps,
        inFlightRequests: 0,
        avgLatencyMs: 3000,
        p95LatencyMs: 3000,
        errorRate: 1.0,
        systemHealth: 'crashed',
      },
      componentMetrics,
      edgeMetrics,
      bottleneckReason: 'No application servers reachable to receive HTTP traffic',
      isTotalBlackout: true,
    };
  }

  // 4. Trace Storage & Caching Layer from App Servers (Strictly Edge-Driven!)
  // Track aggregated demand directed to each storage component
  const dbReadDemandMap = new Map<string, number>();
  const dbWriteDemandMap = new Map<string, number>();
  const dbThreadDemandMap = new Map<string, number>();
  const redisReadDemandMap = new Map<string, number>();
  const queueDemandMap = new Map<string, number>();

  for (const node of graph.nodes) {
    if (node.type === 'database') {
      dbReadDemandMap.set(node.id, 0);
      dbWriteDemandMap.set(node.id, 0);
      dbThreadDemandMap.set(node.id, 0);
    }
    if (node.type === 'redis_cache') {
      redisReadDemandMap.set(node.id, 0);
    }
    if (node.type === 'message_queue') {
      queueDemandMap.set(node.id, 0);
    }
  }

  // Evaluate routing per individual App Server
  interface ServerRouteContext {
    server: ArchitectureNode;
    serverRps: number;
    readsRps: number;
    writesRps: number;
    heavyRps: number;
    connectedCaches: ArchitectureNode[];
    connectedQueues: ArchitectureNode[];
    connectedDbs: ArchitectureNode[];
    isStorageDisconnected: boolean;
  }

  const serverContexts: ServerRouteContext[] = [];

  for (const server of activeServers) {
    const sRps = serverTrafficMap.get(server.id) || 0;
    const readsRps = Math.floor(sRps * 0.75);
    const writesRps = Math.floor(sRps * 0.20);
    const heavyRps = Math.max(0, sRps - readsRps - writesRps);

    const sOutEdges = outgoingEdges.get(server.id) || [];
    const connectedCaches = sOutEdges.map((e) => nodeMap.get(e.target)!).filter((n) => n && n.type === 'redis_cache');
    const connectedQueues = sOutEdges.map((e) => nodeMap.get(e.target)!).filter((n) => n && n.type === 'message_queue');
    const directDbs = sOutEdges.map((e) => nodeMap.get(e.target)!).filter((n) => n && n.type === 'database');

    // Also check if Caches connected to S connect to Databases
    const cacheDbs = connectedCaches.flatMap((c) =>
      (outgoingEdges.get(c.id) || []).map((e) => nodeMap.get(e.target)!).filter((n) => n && n.type === 'database')
    );
    const allConnectedDbs = Array.from(new Set([...directDbs, ...cacheDbs]));

    const isStorageDisconnected = allConnectedDbs.length === 0 && connectedCaches.length === 0;

    serverContexts.push({
      server,
      serverRps: sRps,
      readsRps,
      writesRps,
      heavyRps,
      connectedCaches,
      connectedQueues,
      connectedDbs: allConnectedDbs,
      isStorageDisconnected,
    });
  }

  // 5. Calculate Redis Cache Absorption
  const redisResults = new Map<string, ReturnType<typeof calculateRedisCapacity>>();

  for (const ctx of serverContexts) {
    if (ctx.connectedCaches.length > 0) {
      // Split read demand among connected Redis caches
      const cacheShare = Math.floor(ctx.readsRps / ctx.connectedCaches.length);
      for (const cache of ctx.connectedCaches) {
        redisReadDemandMap.set(cache.id, (redisReadDemandMap.get(cache.id) || 0) + cacheShare);
        recordEdgeFlow(ctx.server.id, cache.id, cacheShare, 1, 'healthy');
      }
    }
  }

  for (const [cacheId, demandRps] of redisReadDemandMap.entries()) {
    const cacheNode = nodeMap.get(cacheId);
    if (!cacheNode || demandRps <= 0) continue;

    const cacheConfig = cacheNode.config as import('../core/types').RedisCacheNodeConfig;
    const res = calculateRedisCapacity(cacheConfig, demandRps);
    redisResults.set(cacheId, res);

    componentMetrics[cacheId].throughputInRps = demandRps;
    componentMetrics[cacheId].throughputOutRps = res.cacheHitsRps;
    componentMetrics[cacheId].cacheHitRps = res.cacheHitsRps;
    componentMetrics[cacheId].cacheMissRps = res.cacheMissesRps;
    componentMetrics[cacheId].cpuUtilization = Math.round(res.utilization * 100);
    componentMetrics[cacheId].avgLatencyMs = Math.round(res.latencyMs);
    componentMetrics[cacheId].statusMessage = `Hit rate: ${Math.round(res.effectiveHitRate * 100)}% (Absorbed ${res.cacheHitsRps} RPS)`;
    componentMetrics[cacheId].health = res.utilization > 0.9 ? 'warning' : 'healthy';

    // Route cache misses to DBs connected to this Redis cache
    const cacheOutEdges = (outgoingEdges.get(cacheId) || []).filter((e) => nodeMap.get(e.target)?.type === 'database');
    if (cacheOutEdges.length > 0 && res.cacheMissesRps > 0) {
      const missesPerDb = Math.floor(res.cacheMissesRps / cacheOutEdges.length);
      cacheOutEdges.forEach((e) => {
        dbReadDemandMap.set(e.target, (dbReadDemandMap.get(e.target) || 0) + missesPerDb);
        recordEdgeFlow(cacheId, e.target, missesPerDb, 5, 'healthy');
      });
    }
  }

  // 6. Calculate Message Queue Buffering
  for (const ctx of serverContexts) {
    if (ctx.connectedQueues.length > 0) {
      const qShare = Math.floor(ctx.heavyRps / ctx.connectedQueues.length);
      for (const q of ctx.connectedQueues) {
        queueDemandMap.set(q.id, (queueDemandMap.get(q.id) || 0) + qShare);
        recordEdgeFlow(ctx.server.id, q.id, qShare, 2, 'healthy');
      }
    }
  }

  for (const [qId, demandRps] of queueDemandMap.entries()) {
    const qNode = nodeMap.get(qId);
    if (!qNode || demandRps <= 0) continue;

    const qConfig = qNode.config as import('../core/types').MessageQueueNodeConfig;
    const qRes = calculateQueueCapacity(qConfig, demandRps);

    componentMetrics[qId].throughputInRps = demandRps;
    componentMetrics[qId].throughputOutRps = qRes.drainRateRps;
    componentMetrics[qId].queueDepth = qRes.bufferUsed;
    componentMetrics[qId].connectionsMax = qRes.bufferCapacity;
    componentMetrics[qId].cpuUtilization = Math.round((qRes.bufferUsed / qRes.bufferCapacity) * 100);

    if (qRes.isOverflowing) {
      componentMetrics[qId].health = 'critical';
      componentMetrics[qId].statusMessage = 'Buffer full! Dropping async messages';
      componentMetrics[qId].droppedRps = Math.max(0, demandRps - qRes.drainRateRps);
    } else {
      componentMetrics[qId].health = 'healthy';
      componentMetrics[qId].statusMessage = `Buffered: ${qRes.bufferUsed.toLocaleString()} msgs`;
    }
  }

  // 7. Route Uncached Reads & Writes to Databases connected to App Servers
  for (const ctx of serverContexts) {
    if (ctx.isStorageDisconnected) continue;

    // Writes must hit Primary DB
    const primaryDb = ctx.connectedDbs.find((d) => (d.config as import('../core/types').DatabaseNodeConfig).role === 'primary');
    if (primaryDb) {
      // If server is connected to MQ, heavy writes are offloaded
      const netWrites = ctx.connectedQueues.length > 0 ? Math.floor(ctx.writesRps * 0.7) : ctx.writesRps;
      dbWriteDemandMap.set(primaryDb.id, (dbWriteDemandMap.get(primaryDb.id) || 0) + netWrites);
      dbThreadDemandMap.set(primaryDb.id, (dbThreadDemandMap.get(primaryDb.id) || 0) + 15);
      recordEdgeFlow(ctx.server.id, primaryDb.id, netWrites, 12, 'healthy');
    }

    // Direct reads (reads not absorbed by Redis)
    const uncachedReads = ctx.connectedCaches.length > 0
      ? Math.floor(ctx.readsRps * 0.15) // Misses
      : ctx.readsRps; // 100% hits DB

    if (uncachedReads > 0) {
      const readDbs = ctx.connectedDbs.filter((d) => (d.config as import('../core/types').DatabaseNodeConfig).role === 'replica');
      const targetReadDbs = readDbs.length > 0 ? readDbs : (primaryDb ? [primaryDb] : []);

      if (targetReadDbs.length > 0) {
        const readsPerDb = Math.floor(uncachedReads / targetReadDbs.length);
        for (const rDb of targetReadDbs) {
          dbReadDemandMap.set(rDb.id, (dbReadDemandMap.get(rDb.id) || 0) + readsPerDb);
          dbThreadDemandMap.set(rDb.id, (dbThreadDemandMap.get(rDb.id) || 0) + 10);
          recordEdgeFlow(ctx.server.id, rDb.id, readsPerDb, 8, 'healthy');
        }
      }
    }
  }

  // 8. Compute Database Node Metrics
  let dbBottleneckUtilization = 0;
  let maxDbLatencyMs = 10;
  let primaryDbFailed = false;
  let anyDbConnectionExhausted = false;

  for (const [dbId, readsRps] of dbReadDemandMap.entries()) {
    const dbNode = nodeMap.get(dbId);
    if (!dbNode) continue;

    const dbConfig = dbNode.config as import('../core/types').DatabaseNodeConfig;
    const writesRps = dbWriteDemandMap.get(dbId) || 0;
    const threads = dbThreadDemandMap.get(dbId) || 10;

    const dbRes = calculateDatabaseCapacity(dbConfig, readsRps, writesRps, threads);
    const connRatio = dbRes.connectionsActive / Math.max(1, dbRes.connectionsMax);
    const nodeBottleneck = Math.max(dbRes.iopsUtilization, connRatio);
    dbBottleneckUtilization = Math.max(dbBottleneckUtilization, nodeBottleneck);

    const latency = dbRes.effectiveReadLatencyMs + (dbRes.isConnectionExhausted ? 1200 : 0);
    maxDbLatencyMs = Math.max(maxDbLatencyMs, latency);

    componentMetrics[dbId].throughputInRps = readsRps + writesRps;
    componentMetrics[dbId].throughputOutRps = readsRps + writesRps;
    componentMetrics[dbId].cpuUtilization = Math.round(dbRes.iopsUtilization * 100);
    componentMetrics[dbId].connectionsActive = dbRes.connectionsActive;
    componentMetrics[dbId].connectionsMax = dbRes.connectionsMax;
    componentMetrics[dbId].queueDepth = dbRes.connectionWaitQueue;
    componentMetrics[dbId].avgLatencyMs = Math.round(latency);

    if (dbRes.isConnectionExhausted) {
      anyDbConnectionExhausted = true;
      componentMetrics[dbId].health = 'critical';
      componentMetrics[dbId].statusMessage = `Connection pool exhausted (${dbRes.connectionsActive}/${dbRes.connectionsMax})! Queries queueing.`;
      if (dbConfig.role === 'primary') primaryDbFailed = true;
    } else if (dbRes.iopsUtilization > 0.85) {
      componentMetrics[dbId].health = 'warning';
      componentMetrics[dbId].statusMessage = 'High disk IOPS saturation';
    } else {
      componentMetrics[dbId].health = 'healthy';
      componentMetrics[dbId].statusMessage = dbConfig.role === 'primary' ? 'Handling read/write queries' : 'Offloading read queries';
    }
  }

  // 9. Compute Application Server Metrics
  let worstAppServerUtilization = 0;
  let totalServerQueueDepth = 0;
  let totalServerCapacityRps = 0;
  let anyAppServerOom = false;
  let serversDisconnectedCount = 0;

  for (const ctx of serverContexts) {
    const server = ctx.server;
    const sConfig = server.config as import('../core/types').AppServerNodeConfig;

    if (ctx.isStorageDisconnected) {
      serversDisconnectedCount++;
      componentMetrics[server.id].health = 'critical';
      componentMetrics[server.id].statusMessage = 'Disconnected: No Database or Cache connected!';
      componentMetrics[server.id].throughputInRps = ctx.serverRps;
      componentMetrics[server.id].throughputOutRps = 0;
      componentMetrics[server.id].droppedRps = ctx.serverRps;
      continue;
    }

    const redisLatency = ctx.connectedCaches.length > 0 ? 1.5 : 0;
    const serverResult = calculateAppServerCapacity(sConfig, ctx.serverRps, maxDbLatencyMs + redisLatency);

    totalServerCapacityRps += serverResult.maxRps;
    worstAppServerUtilization = Math.max(worstAppServerUtilization, serverResult.cpuUtilization);
    totalServerQueueDepth += serverResult.threadWaitQueue;

    componentMetrics[server.id].throughputInRps = ctx.serverRps;
    componentMetrics[server.id].cpuUtilization = Math.round(serverResult.cpuUtilization * 100);
    componentMetrics[server.id].ramUtilization = Math.round(serverResult.ramUtilization * 100);
    componentMetrics[server.id].connectionsActive = serverResult.threadsActive;
    componentMetrics[server.id].connectionsMax = serverResult.threadsMax;
    componentMetrics[server.id].queueDepth = serverResult.threadWaitQueue;
    componentMetrics[server.id].avgLatencyMs = Math.round(serverResult.effectiveServiceMs + maxDbLatencyMs);

    if (serverResult.isOom) {
      anyAppServerOom = true;
      componentMetrics[server.id].health = 'failed';
      componentMetrics[server.id].statusMessage = 'OOM Crash: Out of Memory!';
    } else if (serverResult.cpuUtilization > 0.90 || serverResult.threadWaitQueue > 200) {
      componentMetrics[server.id].health = 'critical';
      componentMetrics[server.id].statusMessage = 'CPU overloaded & worker threads saturated';
    } else if (serverResult.cpuUtilization > 0.70) {
      componentMetrics[server.id].health = 'warning';
      componentMetrics[server.id].statusMessage = 'Elevated compute load';
    } else {
      componentMetrics[server.id].health = 'healthy';
      componentMetrics[server.id].statusMessage = 'Healthy';
    }
  }

  // 10. Global System Queueing, Latency & Little's Law Metrics
  const baseServiceTimeMs = 6 + 10 + maxDbLatencyMs;
  const pathBottleneckUtilization = Math.max(
    worstAppServerUtilization,
    dbBottleneckUtilization,
    currentTrafficRps / Math.max(1, totalServerCapacityRps)
  );

  const queueingResult = calculateQueueingMetrics(
    currentTrafficRps,
    baseServiceTimeMs,
    pathBottleneckUtilization,
    totalServerQueueDepth
  );

  // If servers are disconnected, penalize throughput
  const disconnectedRpsPenalty = Math.floor(
    (serversDisconnectedCount / Math.max(1, activeServers.length)) * queueingResult.succeededRps
  );
  const totalSucceededRps = Math.max(0, cdnAbsorbedRps + queueingResult.succeededRps - disconnectedRpsPenalty);
  const totalFailedRps = Math.max(0, traffic.totalRps - totalSucceededRps);
  const totalErrorRate = traffic.totalRps > 0 ? totalFailedRps / traffic.totalRps : 0;

  // Update server output RPS and errors
  for (const ctx of serverContexts) {
    if (!ctx.isStorageDisconnected) {
      const fraction = ctx.serverRps / Math.max(1, currentTrafficRps);
      const serverSucceeded = Math.round(queueingResult.succeededRps * fraction);
      componentMetrics[ctx.server.id].throughputOutRps = serverSucceeded;
      componentMetrics[ctx.server.id].droppedRps = Math.max(0, ctx.serverRps - serverSucceeded);
      componentMetrics[ctx.server.id].errorRate = totalErrorRate;
      componentMetrics[ctx.server.id].avgLatencyMs = Math.round(queueingResult.avgLatencyMs);
      componentMetrics[ctx.server.id].p95LatencyMs = Math.round(queueingResult.p95LatencyMs);
    }
  }

  // Identify Bottleneck & Root Cause
  let bottleneckNodeId: string | undefined;
  let bottleneckType: ComponentType | undefined;
  let bottleneckReason: string | undefined;

  const primaryDbNode = graph.nodes.find((n) => n.type === 'database' && (n.config as any).role === 'primary');

  if (serversDisconnectedCount > 0) {
    bottleneckType = 'app_server';
    bottleneckReason = `${serversDisconnectedCount} Application server(s) are not connected to any Database or Cache.`;
  } else if (anyDbConnectionExhausted) {
    bottleneckNodeId = primaryDbNode?.id;
    bottleneckType = 'database';
    bottleneckReason = 'Database connection pool exhausted. Upstream server threads blocked waiting for connections.';
  } else if (worstAppServerUtilization > 0.90) {
    const stressedServer = activeServers.find(
      (s) => componentMetrics[s.id].cpuUtilization >= Math.round(worstAppServerUtilization * 100)
    );
    bottleneckNodeId = stressedServer?.id;
    bottleneckType = 'app_server';
    bottleneckReason = `Application server CPU saturated at ${Math.round(worstAppServerUtilization * 100)}%.`;
  } else if (dbBottleneckUtilization > 0.85) {
    bottleneckNodeId = primaryDbNode?.id;
    bottleneckType = 'database';
    bottleneckReason = 'Database disk IOPS saturated under high read/write query volume.';
  }

  // System Health state
  let systemHealth: SystemMetrics['systemHealth'] = 'healthy';
  if (totalErrorRate > 0.50 || anyAppServerOom) {
    systemHealth = 'crashed';
  } else if (totalErrorRate > 0.10 || pathBottleneckUtilization > 0.90 || queueingResult.p95LatencyMs > 1500) {
    systemHealth = 'critical';
  } else if (totalErrorRate > 0.02 || pathBottleneckUtilization > 0.70 || queueingResult.p95LatencyMs > 600) {
    systemHealth = 'warning';
  }

  return {
    systemMetricsPartial: {
      incomingRps: traffic.totalRps,
      succeededRps: totalSucceededRps,
      failedRps: totalFailedRps,
      inFlightRequests: queueingResult.inFlightRequests,
      avgLatencyMs: Math.round(queueingResult.avgLatencyMs),
      p95LatencyMs: Math.round(queueingResult.p95LatencyMs),
      errorRate: totalErrorRate,
      systemHealth,
    },
    componentMetrics,
    edgeMetrics,
    bottleneckNodeId,
    bottleneckType,
    bottleneckReason,
    isTotalBlackout: totalErrorRate > 0.85,
  };
}
