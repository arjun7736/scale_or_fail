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
  | 'rate_limiter'
  | 'db_sharding'
  | 'kafka_stream'
  | 'anycast_edge'
  | 'circuit_breaker'
  | 'l4_maglev'
  | 'distributed_nosql';

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
  connectionPooling?: boolean;
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

export interface DbShardingNodeConfig extends BaseNodeConfig {
  shardsCount: number;
  algorithm: 'hash' | 'range';
  writeThroughputMultiplier: number;
}

export interface KafkaStreamNodeConfig extends BaseNodeConfig {
  partitionsCount: number;
  maxRps: number;
  retentionHours: number;
}

export interface AnycastEdgeNodeConfig extends BaseNodeConfig {
  edgePops: number;
  latencyReductionMs: number;
  geoRouting: boolean;
}

export interface CircuitBreakerNodeConfig extends BaseNodeConfig {
  thresholdPercent: number;
  recoverySeconds: number;
  sheddingRatio: number;
}

export interface L4MaglevNodeConfig extends BaseNodeConfig {
  algorithm: 'maglev_hash' | 'ecmp';
  maxPacketsPerSec: number;
  directServerReturn: boolean;
}

export interface DistributedNosqlNodeConfig extends BaseNodeConfig {
  replicationFactor: number;
  consistencyLevel: 'one' | 'quorum' | 'all';
  maxWriteIops: number;
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
  db_sharding: DbShardingNodeConfig;
  kafka_stream: KafkaStreamNodeConfig;
  anycast_edge: AnycastEdgeNodeConfig;
  circuit_breaker: CircuitBreakerNodeConfig;
  l4_maglev: L4MaglevNodeConfig;
  distributed_nosql: DistributedNosqlNodeConfig;
};

export interface ArchitectureNode<T extends ComponentType = ComponentType> {
  id: string;
  type: T;
  label: string;
  config: NodeConfigMap[T];
  position?: { x: number; y: number };
}

export type SemanticEdgeType =
  | 'http_traffic'      // HTTP Request Flow (Client -> LB/App, LB -> App)
  | 'edge_traffic'      // Edge Ingress (Client -> Anycast/CDN/RateLimiter/L4)
  | 'cache_access'      // Cache Access (App Server -> Redis Cache)
  | 'db_read_write'     // Database Read/Write (App Server -> PostgreSQL Primary)
  | 'db_read'           // Database Read (App Server -> PostgreSQL Read Replica)
  | 'replication'       // Asynchronous Replication (Primary DB -> Read Replica)
  | 'async_message'     // Asynchronous Message Flow (App Server -> Message Queue / Kafka)
  | 'stream_processing' // Stream Processing (Queue / Kafka -> Worker/App)
  | 'unsupported';      // Unsupported or invalid connection

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  edgeType?: SemanticEdgeType;
}

export type ValidationSeverity = 'error' | 'warning' | 'info';
export type ValidationCategory = 'invalid' | 'inefficient' | 'reliability_risk';

export interface ArchitectureIssue {
  id: string;
  ruleId: string;
  title: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  message: string; // concise summary
  explanation: string; // why it's wrong / what's occurring
  consequence: string; // what happens during gameplay / under load
  suggestedApproaches: {
    title: string;
    description: string;
    tradeOffs?: string;
  }[];
  learningConcept: string; // real-world system design principle
  relatedNodeIds?: string[];
  relatedEdgeIds?: string[];
  difficultyDetails?: {
    beginnerHint?: string;
    intermediateGuidance?: string;
    expertMonitoringMetric?: string;
  };
  docLinks?: { title: string; url?: string }[];
}

export interface DimensionAssessment {
  score: number; // 0 to 100
  weight: number; // 0 to 1
  rating: 'exceptional' | 'good' | 'adequate' | 'concerning' | 'critical';
  summary: string;
  feedback?: string;
  strengths: string[];
  vulnerabilities: string[];
}

export interface ArchitectureAssessment {
  overallScore: number; // 0 to 100
  letterGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  isWorkloadSatisfied: boolean;
  dimensions: {
    routingCorrectness: DimensionAssessment;
    performanceEfficiency: DimensionAssessment;
    scalability: DimensionAssessment;
    reliability: DimensionAssessment;
    costEfficiency: DimensionAssessment;
  };
  topIssues: ArchitectureIssue[];
  learningSummary: string;
  summary?: string;
  keyConcepts?: string[];
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
  cacheHitRps?: number;
  cacheMissRps?: number;
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

export interface EdgeLiveMetrics {
  edgeId: string;
  source: string;
  target: string;
  throughputRps: number;
  avgLatencyMs: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface SimulationTickOutput {
  systemMetrics: SystemMetrics;
  componentMetrics: Record<string, ComponentLiveMetrics>;
  edgeMetrics?: Record<string, EdgeLiveMetrics>;
  newAlerts: SystemAlert[];
  isGameOver: boolean;
  postmortem?: PostmortemReport;
  milestoneJustReached?: boolean;
}

export type DifficultyMode = 'beginner' | 'intermediate' | 'expert';
