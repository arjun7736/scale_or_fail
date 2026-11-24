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
}

/**
 * Calculates App Server processing capacity and resource utilization
 */
export function calculateAppServerCapacity(
  config: AppServerNodeConfig,
  incomingRps: number,
  downstreamLatencyMs: number = 0
): AppServerCapacityResult {
  // Base single-thread computation capacity
  const requestsPerCorePerSec = 1000 / Math.max(1, config.baseProcessingMs);
  // Thread concurrency allows interleaving I/O wait
  const ioConcurrencyBonus = Math.min(3.0, 1.0 + Math.log10(Math.max(10, config.threadPoolSize) / 10) * 0.4);
  const maxRps = config.cpuCores * requestsPerCorePerSec * ioConcurrencyBonus;

  // CPU utilization based on compute load
  const rawCpuLoad = incomingRps / Math.max(1, maxRps);
  const cpuUtilization = Math.min(1.0, Math.max(0, rawCpuLoad));

  // Total turnaround time for this server including I/O wait
  const effectiveComputeMs = config.baseProcessingMs * (1 + Math.pow(cpuUtilization, 3) * 2.5);
  const totalTurnaroundMs = effectiveComputeMs + downstreamLatencyMs;

  // In-flight concurrency required by Little's Law: L = lambda * W
  const requiredConcurrency = Math.ceil(incomingRps * (totalTurnaroundMs / 1000));
  const threadsActive = Math.min(config.threadPoolSize, requiredConcurrency);
  const threadWaitQueue = Math.max(0, requiredConcurrency - config.threadPoolSize);

  // RAM usage = 300MB base runtime + memory per active in-flight request
  const baseRamMb = 350;
  const inFlightRamMb = (threadsActive + threadWaitQueue * 0.5) * config.memoryPerRequestMb;
  const totalRamMb = baseRamMb + inFlightRamMb;
  const ramLimitMb = config.ramGb * 1024;
  const ramUtilization = Math.min(1.0, totalRamMb / ramLimitMb);
  const isOom = totalRamMb > ramLimitMb;

  return {
    maxRps,
    cpuUtilization,
    ramUtilization,
    threadsActive,
    threadsMax: config.threadPoolSize,
    threadWaitQueue,
    isOom,
    effectiveServiceMs: effectiveComputeMs,
  };
}

/**
 * Calculates Database capacity, IOPS and connection pool saturation
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
    : (config.role === 'primary' ? 0.35 : 0.25);
  const throughputRatio = config.connectionPooling ? 0.01 : 0.04;

  const estimatedConnectionsDemanded = Math.ceil(
    upstreamActiveThreads * threadRatio + (readRps + writeRps) * throughputRatio
  );

  const connectionsActive = Math.min(config.maxConnections, estimatedConnectionsDemanded);
  const connectionWaitQueue = Math.max(0, estimatedConnectionsDemanded - config.maxConnections);
  const isConnectionExhausted = estimatedConnectionsDemanded > config.maxConnections;

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
