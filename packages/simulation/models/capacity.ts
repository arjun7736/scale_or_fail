import {
  AppServerNodeConfig,
  DatabaseNodeConfig,
  RedisCacheNodeConfig,
  LoadBalancerNodeConfig,
  MessageQueueNodeConfig,
  CdnNodeConfig,
  RateLimiterNodeConfig,
} from '../core/types';

export interface AppServerCapacityResult {
  maxRps: number;
  cpuUtilization: number; // 0 to 1
  ramUtilization: number; // 0 to 1
  threadsActive: number;
  threadsMax: number;
  threadWaitQueue: number;
  isOom: boolean;
  effectiveServiceMs: number;
  activePods: number;
  targetPods: number;
  isCpuThrottled: boolean;
  queueOverflowDrops: number;
}

export interface DatabaseCapacityResult {
  readCapacityRps: number;
  writeCapacityRps: number;
  iopsUtilization: number; // 0 to 1
  connectionsActive: number;
  connectionsMax: number;
  connectionWaitQueue: number;
  isConnectionExhausted: boolean;
  effectiveReadLatencyMs: number;
  effectiveWriteLatencyMs: number;
  connectionTimeoutDrops: number;
  effectiveConnectionWaitMs: number;
}

/**
 * Calculates App Server processing capacity and resource utilization,
 * accounting for bare metal, Docker cgroup limits, Kubernetes pod replicas,
 * and worker thread pool rejection policies.
 */
export function calculateAppServerCapacity(
  config: AppServerNodeConfig,
  incomingRps: number,
  downstreamLatencyMs: number = 0
): AppServerCapacityResult {
  // 1. Determine active pod/container replicas
  const isK8s = config.containerRuntime === 'kubernetes';
  const isDocker = config.containerRuntime === 'docker';
  const podReplicas = isK8s && config.k8sConfig ? Math.max(1, config.k8sConfig.replicas) : 1;
  const targetPods = isK8s && config.k8sConfig ? config.k8sConfig.replicas : 1;

  // 2. Compute effective CPU and RAM limits
  let effectiveCpuCores = config.cpuCores;
  let effectiveRamLimitMb = config.ramGb * 1024;

  if (isDocker && config.dockerConfig) {
    if (config.dockerConfig.cpuLimitCores) {
      effectiveCpuCores = Math.min(config.cpuCores, config.dockerConfig.cpuLimitCores);
    }
    if (config.dockerConfig.ramLimitMb) {
      effectiveRamLimitMb = config.dockerConfig.ramLimitMb;
    }
  }

  // Aggregate thread pool size across all active replicas
  const effectiveThreadPoolSize = (config.threadPoolSize || 50) * podReplicas;

  // 3. Base single-thread computation capacity
  const requestsPerCorePerSec = 1000 / Math.max(1, config.baseProcessingMs);
  const ioConcurrencyBonus = Math.min(
    3.0,
    1.0 + Math.log10(Math.max(10, effectiveThreadPoolSize) / 10) * 0.4
  );
  const maxRpsPerReplica = effectiveCpuCores * requestsPerCorePerSec * ioConcurrencyBonus;
  const maxRps = maxRpsPerReplica * podReplicas;

  // 4. CPU utilization & throttling
  const rawCpuLoad = incomingRps / Math.max(1, maxRps);
  const cpuUtilization = Math.min(1.0, Math.max(0, rawCpuLoad));
  const isCpuThrottled = (isDocker || isK8s) && rawCpuLoad > 0.95;

  // Throttling penalty when cgroup limits are exceeded
  const throttleLatencyPenaltyMs = isCpuThrottled ? config.baseProcessingMs * 1.8 : 0;
  const effectiveComputeMs =
    config.baseProcessingMs * (1 + Math.pow(cpuUtilization, 3) * 2.5) + throttleLatencyPenaltyMs;
  const totalTurnaroundMs = effectiveComputeMs + downstreamLatencyMs;

  // 5. In-flight concurrency required by Little's Law: L = lambda * W
  const requiredConcurrency = Math.ceil(incomingRps * (totalTurnaroundMs / 1000));
  const threadsActive = Math.min(effectiveThreadPoolSize, requiredConcurrency);
  const rawThreadWaitQueue = Math.max(0, requiredConcurrency - effectiveThreadPoolSize);

  // 6. Worker Pool queue capacity & rejection policy
  const workerQueueCap = (config.workerPool?.queueCapacity ?? 1000) * podReplicas;
  let queueOverflowDrops = 0;
  let threadWaitQueue = rawThreadWaitQueue;

  if (rawThreadWaitQueue > workerQueueCap) {
    queueOverflowDrops = rawThreadWaitQueue - workerQueueCap;
    threadWaitQueue = workerQueueCap;
  }

  // 7. RAM usage: base runtime per pod + memory per active in-flight request
  const baseRamMbPerPod = 350;
  const inFlightRamMb =
    (threadsActive + threadWaitQueue * 0.5) * (config.memoryPerRequestMb || 12);
  const totalRamMb = baseRamMbPerPod * podReplicas + inFlightRamMb;
  const totalAllowedRamMb = effectiveRamLimitMb * podReplicas;
  const ramUtilization = Math.min(1.0, totalRamMb / Math.max(1, totalAllowedRamMb));
  const isOom = totalRamMb > totalAllowedRamMb;

  return {
    maxRps,
    cpuUtilization,
    ramUtilization,
    threadsActive,
    threadsMax: effectiveThreadPoolSize,
    threadWaitQueue,
    isOom,
    effectiveServiceMs: effectiveComputeMs,
    activePods: podReplicas,
    targetPods,
    isCpuThrottled,
    queueOverflowDrops,
  };
}

/**
 * Calculates Database capacity, IOPS, connection pool saturation, and client connection timeouts.
 */
export function calculateDatabaseCapacity(
  config: DatabaseNodeConfig,
  readRps: number,
  writeRps: number,
  upstreamActiveThreads: number = 0
): DatabaseCapacityResult {
  const indexMultiplier = config.queryOptimizationIndex ? 2.5 : 1.0;
  const effectiveReadLatencyMs = config.queryOptimizationIndex
    ? config.readLatencyMs * 0.45
    : config.readLatencyMs;
  const effectiveWriteLatencyMs = config.writeLatencyMs;

  // IOPS calculation: writes cost significantly more IOPS due to WAL and locking
  const readIopsPerReq = 1.2 / indexMultiplier;
  const writeIopsPerReq = 4.0;
  const totalIopsDemanded = readRps * readIopsPerReq + writeRps * writeIopsPerReq;

  const iopsUtilization = Math.min(1.0, totalIopsDemanded / Math.max(1, config.maxIops));

  // Max read and write throughput given IOPS limit
  const readCapacityRps = (config.maxIops * 0.75) / Math.max(0.1, readIopsPerReq);
  const writeCapacityRps = (config.maxIops * 0.40) / Math.max(0.1, writeIopsPerReq);

  // Database connections: active connections scale with upstream threads querying the DB.
  // With Connection Pooling (PgBouncer), worker threads share multiplexed pooled backend connections:
  const threadRatio = config.connectionPooling
    ? 0.08
    : config.role === 'primary'
    ? 0.35
    : 0.25;
  const throughputRatio = config.connectionPooling ? 0.01 : 0.04;

  const estimatedConnectionsDemanded = Math.ceil(
    upstreamActiveThreads * threadRatio + (readRps + writeRps) * throughputRatio
  );

  const connectionsActive = Math.min(config.maxConnections, estimatedConnectionsDemanded);
  const connectionWaitQueue = Math.max(0, estimatedConnectionsDemanded - config.maxConnections);
  const isConnectionExhausted = estimatedConnectionsDemanded > config.maxConnections;

  // Realistic Connection Timeout Modeling:
  // If connection queue builds up, calculate wait time.
  const connTimeoutMs = config.clientConnectionPool?.connectionTimeoutMs ?? 2000;
  const serviceRatePerConnMs = Math.max(5, (effectiveReadLatencyMs + effectiveWriteLatencyMs) / 2);
  const effectiveConnectionWaitMs = isConnectionExhausted
    ? Math.min(connTimeoutMs * 1.5, (connectionWaitQueue / Math.max(1, connectionsActive)) * serviceRatePerConnMs * 10)
    : 0;

  // If connection wait time breaches connectionTimeoutMs, queries drop as timeouts
  let connectionTimeoutDrops = 0;
  if (effectiveConnectionWaitMs >= connTimeoutMs) {
    const timeoutRatio = Math.min(1.0, (effectiveConnectionWaitMs - connTimeoutMs + 200) / connTimeoutMs);
    connectionTimeoutDrops = Math.floor((readRps + writeRps) * timeoutRatio * 0.6);
  }

  return {
    readCapacityRps,
    writeCapacityRps,
    iopsUtilization,
    connectionsActive,
    connectionsMax: config.maxConnections,
    connectionWaitQueue,
    isConnectionExhausted,
    effectiveReadLatencyMs,
    effectiveWriteLatencyMs,
    connectionTimeoutDrops,
    effectiveConnectionWaitMs,
  };
}

/**
 * Calculates Redis Cache absorption and memory usage
 */
export function calculateRedisCapacity(
  config: RedisCacheNodeConfig,
  readRps: number
): {
  cacheHitsRps: number;
  cacheMissesRps: number;
  effectiveHitRate: number;
  utilization: number;
  latencyMs: number;
} {
  const utilization = Math.min(1.0, readRps / Math.max(1, config.maxRps));
  // Degrade hit rate slightly if throughput approaches limit
  const effectiveHitRate = utilization > 0.9 ? config.hitRateTarget * 0.85 : config.hitRateTarget;
  const cacheHitsRps = Math.floor(readRps * effectiveHitRate);
  const cacheMissesRps = readRps - cacheHitsRps;
  const latencyMs = 1.2 + utilization * 1.5;

  return {
    cacheHitsRps,
    cacheMissesRps,
    effectiveHitRate,
    utilization,
    latencyMs,
  };
}

/**
 * Calculates Message Queue buffering and drain dynamics
 */
export function calculateQueueCapacity(
  config: MessageQueueNodeConfig,
  incomingEnqueueRps: number
): {
  bufferUsed: number;
  bufferCapacity: number;
  drainRateRps: number;
  isOverflowing: boolean;
} {
  const drainRateRps = config.workersCount * config.drainRatePerWorker;
  const netDelta = incomingEnqueueRps - drainRateRps;
  // Approximated buffer accumulation
  const bufferUsed = Math.min(config.bufferCapacity, Math.max(0, Math.floor(Math.max(0, netDelta) * 5)));
  const isOverflowing = bufferUsed >= config.bufferCapacity;

  return {
    bufferUsed,
    bufferCapacity: config.bufferCapacity,
    drainRateRps,
    isOverflowing,
  };
}
