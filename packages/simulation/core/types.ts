/**
 * Scale or Fail - Core Domain Types
 */

export type ComponentType =
  | 'client'
  | 'load_balancer'
  | 'app_server'
  | 'database'
  | 'redis_cache'
  | 'message_queue'
  | 'cdn'
  | 'rate_limiter';

export type ComponentHealth = 'healthy' | 'warning' | 'critical' | 'failed' | 'offline';

export type LoadBalancerAlgorithm = 'round_robin' | 'least_conn' | 'ip_hash';

export type DatabaseRole = 'primary' | 'replica';

export interface BaseNodeConfig {
  name: string;
  costPerHour: number;
}

export interface ClientNodeConfig extends BaseNodeConfig {
  userConcurrencyMultiplier: number;
}

export interface LoadBalancerNodeConfig extends BaseNodeConfig {
  algorithm: LoadBalancerAlgorithm;
  maxRps: number;
  connectionTimeoutMs: number;
  healthCheckIntervalMs: number;
}

export interface AppServerNodeConfig extends BaseNodeConfig {
  tier: 'small' | 'medium' | 'large' | 'xlarge' | '2xlarge';
  cpuCores: number;
  ramGb: number;
  threadPoolSize: number;
  baseProcessingMs: number;
  memoryPerRequestMb: number;
}

export interface DatabaseNodeConfig extends BaseNodeConfig {
  tier: 'small' | 'medium' | 'large' | 'enterprise';
  role: DatabaseRole;
  maxConnections: number;
  maxIops: number;
  storageGb: number;
  readLatencyMs: number;
  writeLatencyMs: number;
  queryOptimizationIndex: boolean;
}

export interface RedisCacheNodeConfig extends BaseNodeConfig {
  ramGb: number;
  maxRps: number;
  hitRateTarget: number; // e.g. 0.85
  ttlSeconds: number;
}

export interface MessageQueueNodeConfig extends BaseNodeConfig {
  bufferCapacity: number;
  drainRatePerWorker: number; // requests/sec consumed
  workersCount: number;
}

export interface CdnNodeConfig extends BaseNodeConfig {
  edgePointsOfPresence: number;
  cacheHitRatio: number; // e.g. 0.70
  ddosShield: boolean;
}

export interface RateLimiterNodeConfig extends BaseNodeConfig {
  maxAllowedRps: number;
  burstAllowance: number;
}

export type NodeConfigMap = {
  client: ClientNodeConfig;
  load_balancer: LoadBalancerNodeConfig;
  app_server: AppServerNodeConfig;
  database: DatabaseNodeConfig;
  redis_cache: RedisCacheNodeConfig;
  message_queue: MessageQueueNodeConfig;
  cdn: CdnNodeConfig;
  rate_limiter: RateLimiterNodeConfig;
};

export interface ArchitectureNode<T extends ComponentType = ComponentType> {
  id: string;
  type: T;
  label: string;
  config: NodeConfigMap[T];
  position?: { x: number; y: number };
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface ArchitectureGraph {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}

export interface ComponentLiveMetrics {
  nodeId: string;
  type: ComponentType;
  health: ComponentHealth;
  cpuUtilization: number; // 0 to 100%
  ramUtilization: number; // 0 to 100%
  connectionsActive: number;
  connectionsMax: number;
  queueDepth: number;
  throughputInRps: number;
  throughputOutRps: number;
  droppedRps: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorRate: number; // 0 to 1
  costPerHour: number;
  statusMessage?: string;
  isOom?: boolean;
}

export interface SystemMetrics {
  tick: number;
  simTimeSeconds: number;
  incomingRps: number;
  succeededRps: number;
  failedRps: number;
  inFlightRequests: number; // Concurrency L = lambda * W
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorRate: number; // 0 to 1
  slaUptimePercent: number;
  budgetRemaining: number;
  operatingCostPerHour: number;
  totalCostIncurred: number;
  revenueEarned: number;
  systemHealth: 'healthy' | 'warning' | 'critical' | 'crashed';
  stage: number;
  stageName: string;
  oneMillionMilestoneReached: boolean;
  consecutiveFailureSeconds: number;
}

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'resolved';

export interface SystemAlert {
  id: string;
  tick: number;
  timestamp: string;
  severity: AlertSeverity;
  nodeId?: string;
  nodeType?: ComponentType;
  title: string;
  message: string;
  remedy?: string;
}

export interface PostmortemReport {
  survivalDurationSeconds: number;
  peakRps: number;
  peakConcurrency: number;
  totalRequestsHandled: number;
  totalRequestsFailed: number;
  totalSpend: number;
  totalRevenue: number;
  finalStage: number;
  finalStageName: string;
  oneMillionMilestoneReached: boolean;
  rootCause: string;
  failureTimeline: {
    tick: number;
    seconds: number;
    event: string;
    culpritNodeId?: string;
    culpritNodeType?: ComponentType;
  }[];
  architectureSnapshot: ArchitectureGraph;
  finalMetrics: SystemMetrics;
  recommendations: {
    title: string;
    explanation: string;
    architecturalFix: string;
  }[];
}

export interface SimulationTickOutput {
  systemMetrics: SystemMetrics;
  componentMetrics: Record<string, ComponentLiveMetrics>;
  newAlerts: SystemAlert[];
  isGameOver: boolean;
  postmortem?: PostmortemReport;
  milestoneJustReached?: boolean;
}

export type DifficultyMode = 'beginner' | 'intermediate' | 'expert';
