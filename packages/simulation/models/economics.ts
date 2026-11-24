import {
  AppServerNodeConfig,
  DatabaseNodeConfig,
  RedisCacheNodeConfig,
  LoadBalancerNodeConfig,
  MessageQueueNodeConfig,
  CdnNodeConfig,
  RateLimiterNodeConfig,
  ClientNodeConfig,
} from '../core/types';

export const SERVER_TIERS: Record<
  AppServerNodeConfig['tier'],
  Omit<AppServerNodeConfig, 'name'>
> = {
  small: {
    tier: 'small',
    cpuCores: 2,
    ramGb: 4,
    threadPoolSize: 200,
    baseProcessingMs: 25,
    memoryPerRequestMb: 1.5,
    costPerHour: 0.04,
  },
  medium: {
    tier: 'medium',
    cpuCores: 4,
    ramGb: 8,
    threadPoolSize: 500,
    baseProcessingMs: 18,
    memoryPerRequestMb: 1.2,
    costPerHour: 0.09,
  },
  large: {
    tier: 'large',
    cpuCores: 8,
    ramGb: 16,
    threadPoolSize: 1200,
    baseProcessingMs: 12,
    memoryPerRequestMb: 1.0,
    costPerHour: 0.20,
  },
  xlarge: {
    tier: 'xlarge',
    cpuCores: 16,
    ramGb: 32,
    threadPoolSize: 3000,
    baseProcessingMs: 8,
    memoryPerRequestMb: 0.8,
    costPerHour: 0.45,
  },
  '2xlarge': {
    tier: '2xlarge',
    cpuCores: 32,
    ramGb: 64,
    threadPoolSize: 8000,
    baseProcessingMs: 5,
    memoryPerRequestMb: 0.6,
    costPerHour: 1.10,
  },
};

export const DATABASE_TIERS: Record<
  DatabaseNodeConfig['tier'],
  Omit<DatabaseNodeConfig, 'name' | 'role' | 'queryOptimizationIndex'>
> = {
  small: {
    tier: 'small',
    maxConnections: 100,
    maxIops: 800,
    storageGb: 50,
    readLatencyMs: 15,
    writeLatencyMs: 40,
    costPerHour: 0.06,
  },
  medium: {
    tier: 'medium',
    maxConnections: 300,
    maxIops: 2500,
    storageGb: 200,
    readLatencyMs: 10,
    writeLatencyMs: 28,
    costPerHour: 0.16,
  },
  large: {
    tier: 'large',
    maxConnections: 800,
    maxIops: 8000,
    storageGb: 1000,
    readLatencyMs: 6,
    writeLatencyMs: 18,
    costPerHour: 0.45,
  },
  enterprise: {
    tier: 'enterprise',
    maxConnections: 2500,
    maxIops: 30000,
    storageGb: 5000,
    readLatencyMs: 3,
    writeLatencyMs: 10,
    costPerHour: 1.40,
  },
};

export const DEFAULT_CONFIGS = {
  client: (): ClientNodeConfig => ({
    name: 'Global Traffic Source',
    costPerHour: 0,
    userConcurrencyMultiplier: 1.0,
  }),
  load_balancer: (): LoadBalancerNodeConfig => ({
    name: 'Application Load Balancer',
    algorithm: 'round_robin',
    maxRps: 200000,
    connectionTimeoutMs: 3000,
    healthCheckIntervalMs: 1000,
    costPerHour: 0.05,
  }),
  app_server: (tier: AppServerNodeConfig['tier'] = 'small'): AppServerNodeConfig => ({
    name: `App Server (${tier.toUpperCase()})`,
    ...SERVER_TIERS[tier],
  }),
  database: (
    role: 'primary' | 'replica' = 'primary',
    tier: DatabaseNodeConfig['tier'] = 'small'
  ): DatabaseNodeConfig => ({
    name: role === 'primary' ? `Primary DB (${tier})` : `Read Replica (${tier})`,
    role,
    queryOptimizationIndex: false,
    connectionPooling: false,
    ...DATABASE_TIERS[tier],
    costPerHour: role === 'replica' ? DATABASE_TIERS[tier].costPerHour * 0.85 : DATABASE_TIERS[tier].costPerHour,
  }),
  redis_cache: (): RedisCacheNodeConfig => ({
    name: 'Redis Cache Cluster',
    ramGb: 8,
    maxRps: 250000,
    hitRateTarget: 0.85,
    ttlSeconds: 300,
    costPerHour: 0.08,
  }),
  message_queue: (): MessageQueueNodeConfig => ({
    name: 'Message Queue (Kafka)',
    bufferCapacity: 100000,
    drainRatePerWorker: 500,
    workersCount: 4,
    costPerHour: 0.07,
  }),
  cdn: (): CdnNodeConfig => ({
    name: 'Global Edge CDN',
    edgePointsOfPresence: 24,
    cacheHitRatio: 0.70,
    ddosShield: true,
    costPerHour: 0.05,
  }),
  rate_limiter: (): RateLimiterNodeConfig => ({
    name: 'API Gateway Rate Limiter',
    maxAllowedRps: 50000,
    burstAllowance: 1.25,
    costPerHour: 0.02,
  }),
};

export const ECONOMICS_CONSTANTS = {
  INITIAL_BUDGET: 500.0, // $500 starter credit
  REVENUE_PER_10K_SUCCESSFUL_REQUESTS: 0.25, // $0.25 per 10k requests served
  SLA_PENALTY_THRESHOLD_ERROR_RATE: 0.05, // >5% error rate triggers SLA penalty
  SLA_PENALTY_MULTIPLIER: 0.5, // Revenue halved during SLA degradation
};
