import {
  ArchitectureGraph,
  ArchitectureNode,
  ComponentLiveMetrics,
  ComponentType,
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
  bottleneckNodeId?: string;
  bottleneckType?: ComponentType;
  bottleneckReason?: string;
  isTotalBlackout: boolean;
}

export function routeTrafficThroughGraph(
  graph: ArchitectureGraph,
  traffic: DecomposedTraffic,
  currentSimSeconds: number
): RouteResult {
  const componentMetrics: Record<string, ComponentLiveMetrics> = {};
  const validation = validateArchitectureGraph(graph);

  // Initialize metrics for all nodes
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
      statusMessage: 'Operational',
    };
  }

  // If graph cannot serve traffic at all (e.g. no app server or no client)
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
      bottleneckReason: errorMsg,
      isTotalBlackout: true,
    };
  }

  const nodeMap = new Map<string, ArchitectureNode>(graph.nodes.map((n) => [n.id, n]));
  const outgoingEdges = new Map<string, string[]>();
  for (const node of graph.nodes) {
    outgoingEdges.set(node.id, []);
  }
  for (const edge of graph.edges) {
    outgoingEdges.get(edge.source)?.push(edge.target);
  }

  const clientNode = graph.nodes.find((n) => n.type === 'client');
  if (!clientNode) {
    return {
      systemMetricsPartial: { incomingRps: traffic.totalRps, succeededRps: 0, failedRps: traffic.totalRps, errorRate: 1.0 },
      componentMetrics,
      isTotalBlackout: true,
    };
  }

  let currentTrafficRps = traffic.totalRps;
  componentMetrics[clientNode.id].throughputOutRps = currentTrafficRps;

  // 1. Edge Layer: CDN (if connected directly to client or first in chain)
  const clientTargets = outgoingEdges.get(clientNode.id) || [];
  const cdnNode = clientTargets.map((id) => nodeMap.get(id)).find((n) => n?.type === 'cdn');

  let cdnAbsorbedRps = 0;
  let nextIngressTargets = clientTargets;

  if (cdnNode && cdnNode.type === 'cdn') {
    const cdnConfig = cdnNode.config as import('../core/types').CdnNodeConfig;
    cdnAbsorbedRps = Math.floor(traffic.cdnEligibleRps * cdnConfig.cacheHitRatio);
    currentTrafficRps = Math.max(0, currentTrafficRps - cdnAbsorbedRps);

    componentMetrics[cdnNode.id].throughputInRps = traffic.totalRps;
    componentMetrics[cdnNode.id].throughputOutRps = currentTrafficRps;
    componentMetrics[cdnNode.id].cpuUtilization = 15;
    componentMetrics[cdnNode.id].avgLatencyMs = 8;
    componentMetrics[cdnNode.id].p95LatencyMs = 12;
    componentMetrics[cdnNode.id].statusMessage = `Edge Cache Hit: ${Math.round(cdnConfig.cacheHitRatio * 100)}%`;

    nextIngressTargets = outgoingEdges.get(cdnNode.id) || [];
  }

  // 2. Gateway Layer: Rate Limiter
  const rateLimiterNode = nextIngressTargets.map((id) => nodeMap.get(id)).find((n) => n?.type === 'rate_limiter');
  let rateLimitDroppedRps = 0;

  if (rateLimiterNode && rateLimiterNode.type === 'rate_limiter') {
    const rlConfig = rateLimiterNode.config as import('../core/types').RateLimiterNodeConfig;
    componentMetrics[rateLimiterNode.id].throughputInRps = currentTrafficRps;

    const allowedCap = rlConfig.maxAllowedRps * rlConfig.burstAllowance;
    if (currentTrafficRps > allowedCap) {
      rateLimitDroppedRps = Math.floor(currentTrafficRps - allowedCap);
      currentTrafficRps = allowedCap;
      componentMetrics[rateLimiterNode.id].health = 'warning';
      componentMetrics[rateLimiterNode.id].statusMessage = `Rate limiting active: Dropping ${rateLimitDroppedRps} req/s`;
    } else {
      componentMetrics[rateLimiterNode.id].statusMessage = 'Passing traffic';
    }

    componentMetrics[rateLimiterNode.id].droppedRps = rateLimitDroppedRps;
    componentMetrics[rateLimiterNode.id].throughputOutRps = currentTrafficRps;
    nextIngressTargets = outgoingEdges.get(rateLimiterNode.id) || [];
  }

  // 3. Ingress Layer: Load Balancer(s) or Direct to App Servers
  const loadBalancers = nextIngressTargets.map((id) => nodeMap.get(id)).filter((n) => n?.type === 'load_balancer');
  let appServers: ArchitectureNode[] = [];

  if (loadBalancers.length > 0) {
    const lb = loadBalancers[0]!;
    const lbConfig = lb.config as import('../core/types').LoadBalancerNodeConfig;
    componentMetrics[lb.id].throughputInRps = currentTrafficRps;

    // LB capacity check
    const lbUtilization = currentTrafficRps / Math.max(1, lbConfig.maxRps);
    componentMetrics[lb.id].cpuUtilization = Math.min(100, Math.round(lbUtilization * 100));

    if (lbUtilization > 1.0) {
      const excess = currentTrafficRps - lbConfig.maxRps;
      componentMetrics[lb.id].droppedRps = excess;
      componentMetrics[lb.id].health = 'critical';
      componentMetrics[lb.id].statusMessage = 'Load Balancer throughput saturated';
      currentTrafficRps = lbConfig.maxRps;
    } else if (lbUtilization > 0.85) {
      componentMetrics[lb.id].health = 'warning';
      componentMetrics[lb.id].statusMessage = 'High ingress load';
    }

    const lbTargets = outgoingEdges.get(lb.id) || [];
    appServers = lbTargets.map((id) => nodeMap.get(id)!).filter((n) => n && n.type === 'app_server');

    componentMetrics[lb.id].throughputOutRps = currentTrafficRps;
    componentMetrics[lb.id].avgLatencyMs = 2 + lbUtilization * 4;
    componentMetrics[lb.id].p95LatencyMs = 4 + lbUtilization * 8;
  } else {
    // Direct from client/rateLimiter to app servers
    appServers = nextIngressTargets.map((id) => nodeMap.get(id)!).filter((n) => n && n.type === 'app_server');
  }

  if (appServers.length === 0) {
    return {
      systemMetricsPartial: {
        incomingRps: traffic.totalRps,
        succeededRps: cdnAbsorbedRps,
        failedRps: traffic.totalRps - cdnAbsorbedRps,
        errorRate: 1.0,
        systemHealth: 'crashed',
      },
      componentMetrics,
      bottleneckReason: 'No application servers reachable to receive HTTP traffic',
      isTotalBlackout: true,
    };
  }

  // 4. Discover Storage Layer (Databases and Caches)
  const allDbs = graph.nodes.filter((n) => n.type === 'database');
  const primaryDb = allDbs.find((n) => (n.config as import('../core/types').DatabaseNodeConfig).role === 'primary');
  const replicaDbs = allDbs.filter((n) => (n.config as import('../core/types').DatabaseNodeConfig).role === 'replica');
  const redisCaches = graph.nodes.filter((n) => n.type === 'redis_cache');
  const messageQueues = graph.nodes.filter((n) => n.type === 'message_queue');

  // Traffic distribution among App Servers
  const serverTrafficRps = Math.floor(currentTrafficRps / appServers.length);

  // 5. Calculate Cache Layer (Redis) if connected
  let totalReadDemandToDb = traffic.readRps;
  let redisLatencyContribution = 0;

  if (redisCaches.length > 0) {
    const redis = redisCaches[0]!;
    const redisConfig = redis.config as import('../core/types').RedisCacheNodeConfig;
    const redisReadRps = Math.floor(traffic.readRps * (currentTrafficRps / Math.max(1, traffic.totalRps)));

    const redisResult = calculateRedisCapacity(redisConfig, redisReadRps);
    componentMetrics[redis.id].throughputInRps = redisReadRps;
    componentMetrics[redis.id].throughputOutRps = redisResult.cacheHitsRps;
    componentMetrics[redis.id].cpuUtilization = Math.round(redisResult.utilization * 100);
    componentMetrics[redis.id].avgLatencyMs = Math.round(redisResult.latencyMs);
    componentMetrics[redis.id].statusMessage = `Hit rate: ${Math.round(redisResult.effectiveHitRate * 100)}% (Absorbed ${redisResult.cacheHitsRps} RPS)`;

    if (redisResult.utilization > 0.9) {
      componentMetrics[redis.id].health = 'warning';
    } else {
      componentMetrics[redis.id].health = 'healthy';
    }

    // Uncached reads proceed to the database
    totalReadDemandToDb = redisResult.cacheMissesRps;
    redisLatencyContribution = redisResult.latencyMs;
  }

  // 6. Calculate Message Queue if connected (buffers async write/heavy tasks)
  let asyncWritesBufferedRps = 0;
  if (messageQueues.length > 0) {
    const mq = messageQueues[0]!;
    const mqConfig = mq.config as import('../core/types').MessageQueueNodeConfig;
    const heavyRps = traffic.heavyRps;
    const mqResult = calculateQueueCapacity(mqConfig, heavyRps);

    componentMetrics[mq.id].throughputInRps = heavyRps;
    componentMetrics[mq.id].throughputOutRps = mqResult.drainRateRps;
    componentMetrics[mq.id].queueDepth = mqResult.bufferUsed;
    componentMetrics[mq.id].connectionsMax = mqResult.bufferCapacity;
    componentMetrics[mq.id].cpuUtilization = Math.round((mqResult.bufferUsed / mqResult.bufferCapacity) * 100);

    if (mqResult.isOverflowing) {
      componentMetrics[mq.id].health = 'critical';
      componentMetrics[mq.id].statusMessage = 'Queue buffer full! Dropping async messages';
      componentMetrics[mq.id].droppedRps = Math.max(0, heavyRps - mqResult.drainRateRps);
    } else {
      componentMetrics[mq.id].health = 'healthy';
      componentMetrics[mq.id].statusMessage = `Buffered: ${mqResult.bufferUsed} msgs`;
    }

    asyncWritesBufferedRps = Math.min(heavyRps, mqResult.drainRateRps);
  }

  // 7. Calculate Database Layer
  let dbBottleneckUtilization = 0;
  let dbLatencyMs = 15;
  let dbConnectionExhausted = false;
  let primaryDbFailed = false;

  if (primaryDb) {
    const pConfig = primaryDb.config as import('../core/types').DatabaseNodeConfig;

    // Reads split between Primary and Read Replicas
    const availableReadNodesCount = 1 + replicaDbs.length;
    const readsPerNode = Math.floor(totalReadDemandToDb / availableReadNodesCount);

    // Writes MUST hit Primary DB
    const netWriteRps = Math.max(0, traffic.writeRps - asyncWritesBufferedRps);

    const primaryDbResult = calculateDatabaseCapacity(
      pConfig,
      readsPerNode,
      netWriteRps,
      appServers.length * 15
    );

    dbBottleneckUtilization = Math.max(
      primaryDbResult.iopsUtilization,
      primaryDbResult.connectionsActive / primaryDbResult.connectionsMax
    );

    dbConnectionExhausted = primaryDbResult.isConnectionExhausted;
    dbLatencyMs = primaryDbResult.effectiveReadLatencyMs + (primaryDbResult.isConnectionExhausted ? 1200 : 0);

    componentMetrics[primaryDb.id].throughputInRps = readsPerNode + netWriteRps;
    componentMetrics[primaryDb.id].throughputOutRps = Math.round(readsPerNode + netWriteRps);
    componentMetrics[primaryDb.id].cpuUtilization = Math.round(primaryDbResult.iopsUtilization * 100);
    componentMetrics[primaryDb.id].connectionsActive = primaryDbResult.connectionsActive;
    componentMetrics[primaryDb.id].connectionsMax = primaryDbResult.connectionsMax;
    componentMetrics[primaryDb.id].queueDepth = primaryDbResult.connectionWaitQueue;
    componentMetrics[primaryDb.id].avgLatencyMs = Math.round(dbLatencyMs);

    if (primaryDbResult.isConnectionExhausted) {
      componentMetrics[primaryDb.id].health = 'critical';
      componentMetrics[primaryDb.id].statusMessage = 'Connection pool exhausted! Queries queueing/timing out';
      primaryDbFailed = true;
    } else if (primaryDbResult.iopsUtilization > 0.85) {
      componentMetrics[primaryDb.id].health = 'warning';
      componentMetrics[primaryDb.id].statusMessage = 'High disk IOPS saturation';
    } else {
      componentMetrics[primaryDb.id].health = 'healthy';
      componentMetrics[primaryDb.id].statusMessage = 'Operating normally';
    }

    // Process replicas
    for (const replica of replicaDbs) {
      const rConfig = replica.config as import('../core/types').DatabaseNodeConfig;
      const replicaResult = calculateDatabaseCapacity(rConfig, readsPerNode, 0, appServers.length * 8);

      componentMetrics[replica.id].throughputInRps = readsPerNode;
      componentMetrics[replica.id].throughputOutRps = readsPerNode;
      componentMetrics[replica.id].cpuUtilization = Math.round(replicaResult.iopsUtilization * 100);
      componentMetrics[replica.id].connectionsActive = replicaResult.connectionsActive;
      componentMetrics[replica.id].connectionsMax = replicaResult.connectionsMax;
      componentMetrics[replica.id].avgLatencyMs = Math.round(replicaResult.effectiveReadLatencyMs);

      if (replicaResult.isConnectionExhausted) {
        componentMetrics[replica.id].health = 'critical';
        componentMetrics[replica.id].statusMessage = 'Replica connection pool full';
      } else {
        componentMetrics[replica.id].health = 'healthy';
        componentMetrics[replica.id].statusMessage = 'Serving read queries';
      }
    }
  } else {
    // No primary DB!
    primaryDbFailed = true;
    dbBottleneckUtilization = 2.0;
  }

  // 8. Calculate Application Servers
  let worstAppServerUtilization = 0;
  let totalServerQueueDepth = 0;
  let totalServerCapacityRps = 0;
  let anyAppServerOom = false;

  for (const server of appServers) {
    const sConfig = server.config as import('../core/types').AppServerNodeConfig;
    const serverResult = calculateAppServerCapacity(sConfig, serverTrafficRps, dbLatencyMs + redisLatencyContribution);

    totalServerCapacityRps += serverResult.maxRps;
    worstAppServerUtilization = Math.max(worstAppServerUtilization, serverResult.cpuUtilization);
    totalServerQueueDepth += serverResult.threadWaitQueue;

    componentMetrics[server.id].throughputInRps = serverTrafficRps;
    componentMetrics[server.id].cpuUtilization = Math.round(serverResult.cpuUtilization * 100);
    componentMetrics[server.id].ramUtilization = Math.round(serverResult.ramUtilization * 100);
    componentMetrics[server.id].connectionsActive = serverResult.threadsActive;
    componentMetrics[server.id].connectionsMax = serverResult.threadsMax;
    componentMetrics[server.id].queueDepth = serverResult.threadWaitQueue;
    componentMetrics[server.id].avgLatencyMs = Math.round(serverResult.effectiveServiceMs + dbLatencyMs);

    if (serverResult.isOom) {
      anyAppServerOom = true;
      componentMetrics[server.id].health = 'failed';
      componentMetrics[server.id].statusMessage = 'OOM Crash: Out of Memory!';
    } else if (serverResult.cpuUtilization > 0.90 || serverResult.threadWaitQueue > 200) {
      componentMetrics[server.id].health = 'critical';
      componentMetrics[server.id].statusMessage = 'CPU overloaded & thread pool saturated';
    } else if (serverResult.cpuUtilization > 0.70) {
      componentMetrics[server.id].health = 'warning';
      componentMetrics[server.id].statusMessage = 'Elevated CPU utilization';
    } else {
      componentMetrics[server.id].health = 'healthy';
      componentMetrics[server.id].statusMessage = 'Healthy';
    }
  }

  // 9. Overall System Queueing & Little's Law Metrics
  // Base latency = CDN/LB overhead + Server Compute + DB query + Redis query
  const baseServiceTimeMs = 8 + 12 + dbLatencyMs + redisLatencyContribution;

  // The bottleneck utilization is the maximum constraint across the path
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

  // Total succeeded includes CDN hits + successfully processed backend requests
  const totalSucceededRps = cdnAbsorbedRps + queueingResult.succeededRps;
  const totalFailedRps = traffic.totalRps - totalSucceededRps;
  const totalErrorRate = traffic.totalRps > 0 ? totalFailedRps / traffic.totalRps : 0;

  // Update server output RPS and errors
  for (const server of appServers) {
    const fractionOfTraffic = 1 / appServers.length;
    componentMetrics[server.id].throughputOutRps = Math.round(queueingResult.succeededRps * fractionOfTraffic);
    componentMetrics[server.id].droppedRps = Math.round(queueingResult.timedOutRps * fractionOfTraffic);
    componentMetrics[server.id].errorRate = totalErrorRate;
    componentMetrics[server.id].avgLatencyMs = Math.round(queueingResult.avgLatencyMs);
    componentMetrics[server.id].p95LatencyMs = Math.round(queueingResult.p95LatencyMs);
  }

  // Identify bottleneck
  let bottleneckNodeId: string | undefined;
  let bottleneckType: ComponentType | undefined;
  let bottleneckReason: string | undefined;

  if (primaryDbFailed || dbConnectionExhausted) {
    bottleneckNodeId = primaryDb?.id;
    bottleneckType = 'database';
    bottleneckReason = 'Database connection pool exhausted. Starving upstream server threads.';
  } else if (worstAppServerUtilization > 0.90) {
    const stressedServer = appServers.find(
      (s) => componentMetrics[s.id].cpuUtilization >= Math.round(worstAppServerUtilization * 100)
    );
    bottleneckNodeId = stressedServer?.id;
    bottleneckType = 'app_server';
    bottleneckReason = `Application server CPU saturated at ${Math.round(worstAppServerUtilization * 100)}%.`;
  } else if (dbBottleneckUtilization > 0.85) {
    bottleneckNodeId = primaryDb?.id;
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
    bottleneckNodeId,
    bottleneckType,
    bottleneckReason,
    isTotalBlackout: totalErrorRate > 0.85,
  };
}
