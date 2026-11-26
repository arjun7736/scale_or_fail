/**
 * Scale or Fail - Extensible Infrastructure Component Registry
 *
 * Defines the standard specification, configuration schema, input/output contracts,
 * failure modes, and operational characteristics for all infrastructure components.
 */

import {
  ComponentType,
  SemanticEdgeType,
  BaseNodeConfig,
  AppServerNodeConfig,
  DatabaseNodeConfig,
  RedisCacheNodeConfig,
  LoadBalancerNodeConfig,
  MessageQueueNodeConfig,
  CdnNodeConfig,
  RateLimiterNodeConfig,
  DbShardingNodeConfig,
  KafkaStreamNodeConfig,
  AnycastEdgeNodeConfig,
  CircuitBreakerNodeConfig,
  L4MaglevNodeConfig,
  DistributedNosqlNodeConfig,
} from '../core/types';

export type ComponentCategory =
  | 'networking'
  | 'compute'
  | 'storage'
  | 'messaging'
  | 'reliability'
  | 'observability';

export interface ComponentFailureMode {
  id: string;
  name: string;
  description: string;
  triggerCondition: string;
  symptom: string;
  mitigation: string;
}

export interface ComponentSpecification<TConfig extends BaseNodeConfig = BaseNodeConfig> {
  type: ComponentType;
  category: ComponentCategory;
  displayName: string;
  shortDescription: string;
  technicalDescription: string;
  supportedInputEdges: SemanticEdgeType[];
  supportedOutputEdges: SemanticEdgeType[];
  defaultConfig: TConfig;
  failureModes: ComponentFailureMode[];
  costPerHour: (config: TConfig) => number;
  computeCapacity?: (config: TConfig, inputs: any) => any;
  educationalConcept: string;
  docsUrl?: string;
}

export class ComponentRegistry {
  private static instance: ComponentRegistry;
  private specifications = new Map<ComponentType, ComponentSpecification<any>>();

  private constructor() {
    this.registerCoreComponents();
  }

  public static getInstance(): ComponentRegistry {
    if (!ComponentRegistry.instance) {
      ComponentRegistry.instance = new ComponentRegistry();
    }
    return ComponentRegistry.instance;
  }

  public register<TConfig extends BaseNodeConfig>(spec: ComponentSpecification<TConfig>): void {
    this.specifications.set(spec.type, spec);
  }

  public get<TConfig extends BaseNodeConfig = BaseNodeConfig>(
    type: ComponentType
  ): ComponentSpecification<TConfig> | undefined {
    return this.specifications.get(type) as ComponentSpecification<TConfig> | undefined;
  }

  public getAll(): ComponentSpecification<any>[] {
    return Array.from(this.specifications.values());
  }

  public getByCategory(category: ComponentCategory): ComponentSpecification<any>[] {
    return this.getAll().filter((spec) => spec.category === category);
  }

  public isValidConnection(
    sourceType: ComponentType,
    targetType: ComponentType,
    edgeType: SemanticEdgeType
  ): boolean {
    const sourceSpec = this.get(sourceType);
    const targetSpec = this.get(targetType);
    if (!sourceSpec || !targetSpec) return false;

    const sourceCanSend = sourceSpec.supportedOutputEdges.includes(edgeType);
    const targetCanReceive = targetSpec.supportedInputEdges.includes(edgeType);

    return sourceCanSend && targetCanReceive;
  }

  private registerCoreComponents(): void {
    // 1. CLIENT
    this.register({
      type: 'client',
      category: 'networking',
      displayName: 'Virtual User Traffic Generator',
      shortDescription: 'Generates client HTTP request workloads.',
      technicalDescription:
        'Models realistic distributed client traffic patterns including sinusoidal daily cycles, flash spikes, think times, and jitter.',
      supportedInputEdges: [],
      supportedOutputEdges: ['http_traffic'],
      defaultConfig: {
        name: 'Client Traffic Source',
        costPerHour: 0,
        userConcurrencyMultiplier: 1.0,
      },
      failureModes: [],
      costPerHour: () => 0,
      educationalConcept: 'Traffic Ingress & Arrival Distributions',
    });

    // 2. APP SERVER
    this.register<AppServerNodeConfig>({
      type: 'app_server',
      category: 'compute',
      displayName: 'Application Server (Node.js/Go/Java)',
      shortDescription: 'Stateless compute instance executing business logic.',
      technicalDescription:
        'Executes application worker threads, orchestrates database and cache calls, and manages memory per in-flight request. Supports bare metal, Docker containers, and Kubernetes pods.',
      supportedInputEdges: ['http_traffic', 'stream_processing'],
      supportedOutputEdges: ['db_read_write', 'db_read', 'cache_access', 'async_message'],
      defaultConfig: {
        name: 'App Server',
        costPerHour: 0.04,
        tier: 'small',
        cpuCores: 2,
        ramGb: 4,
        threadPoolSize: 50,
        baseProcessingMs: 15,
        memoryPerRequestMb: 12,
        containerRuntime: 'bare_metal',
        workerPool: {
          minWorkers: 10,
          maxWorkers: 50,
          queueCapacity: 500,
          rejectionPolicy: 'abort',
        },
        connectionPool: {
          minConnections: 5,
          maxConnections: 25,
          connectionTimeoutMs: 2000,
        },
      },
      failureModes: [
        {
          id: 'oom',
          name: 'Out of Memory (OOM)',
          description: 'In-flight concurrency and queue depth exhaust available RAM.',
          triggerCondition: 'RAM utilization exceeds 100%.',
          symptom: 'Process killed by OS/cgroup kernel (SIGKILL), all active in-flight requests dropped.',
          mitigation: 'Scale compute tier, optimize memory per request, or distribute traffic across multiple replicas.',
        },
        {
          id: 'thread_starvation',
          name: 'Thread Pool Starvation',
          description: 'All worker threads blocked waiting on slow downstream dependencies.',
          triggerCondition: 'Required concurrency exceeds threadPoolSize.',
          symptom: 'Latencies spike exponentially; connection queue overflows.',
          mitigation: 'Add caching, tune DB queries, or scale worker pool.',
        },
      ],
      costPerHour: (config) => config.costPerHour || 0.04,
      educationalConcept: "Compute Sizing, Concurrency & Little's Law",
    });

    // 3. DATABASE
    this.register<DatabaseNodeConfig>({
      type: 'database',
      category: 'storage',
      displayName: 'PostgreSQL Relational Database',
      shortDescription: 'ACID transactional SQL storage with primary/replica roles.',
      technicalDescription:
        'Stores structured relational data with ACID guarantees. Primary handles writes and WAL replication; Read Replicas offload read throughput.',
      supportedInputEdges: ['db_read_write', 'db_read', 'replication'],
      supportedOutputEdges: ['replication'],
      defaultConfig: {
        name: 'PostgreSQL Primary',
        costPerHour: 0.12,
        tier: 'medium',
        role: 'primary',
        maxConnections: 100,
        maxIops: 3000,
        storageGb: 100,
        readLatencyMs: 12,
        writeLatencyMs: 25,
        queryOptimizationIndex: false,
        connectionPooling: false,
      },
      failureModes: [
        {
          id: 'conn_exhaustion',
          name: 'Database Connection Pool Exhaustion',
          description: 'Upstream app servers open more simultaneous client connections than max_connections.',
          triggerCondition: 'Active client connections exceed maxConnections.',
          symptom: 'PostgreSQL rejects new connections with "too many connections"; app requests throw 504 Gateway Timeout.',
          mitigation: 'Deploy PgBouncer connection pooler, increase max_connections, or add Read Replicas.',
        },
        {
          id: 'iops_saturation',
          name: 'Disk IOPS Saturation',
          description: 'Query read/write rate exceeds disk volume IOPS limits.',
          triggerCondition: 'Demanded IOPS exceeds maxIops.',
          symptom: 'Disk queue builds up; query latency spikes from 12ms to 2000ms+.',
          mitigation: 'Add B-tree query indexes, upgrade storage tier to Provisioned IOPS, or introduce Redis caching.',
        },
      ],
      costPerHour: (config) => config.costPerHour || 0.12,
      educationalConcept: 'ACID Guarantees, Replication & Connection Multiplexing',
    });

    // 4. REDIS CACHE
    this.register<RedisCacheNodeConfig>({
      type: 'redis_cache',
      category: 'storage',
      displayName: 'Redis In-Memory Cache Cluster',
      shortDescription: 'Sub-millisecond key-value RAM cache.',
      technicalDescription:
        'Absorbs read query demand in memory using cache-aside pattern. Prevents expensive repeated SQL queries from reaching persistent disk.',
      supportedInputEdges: ['cache_access'],
      supportedOutputEdges: [],
      defaultConfig: {
        name: 'Redis Cache Cluster',
        costPerHour: 0.08,
        ramGb: 8,
        maxRps: 150000,
        hitRateTarget: 0.85,
        ttlSeconds: 300,
      },
      failureModes: [
        {
          id: 'cache_stampede',
          name: 'Cache Stampede (Thundering Herd)',
          description: 'Hot key expires under high concurrency causing simultaneous database read flooding.',
          triggerCondition: 'Cache miss rate surges under peak load.',
          symptom: 'Immediate spike in downstream primary database latency.',
          mitigation: 'Implement probabilistic early expiration (XFetch), mutex locks, or longer TTLs.',
        },
      ],
      costPerHour: (config) => config.costPerHour || 0.08,
      educationalConcept: 'Cache-Aside Pattern, Invalidation & Thundering Herd Protection',
    });

    // 5. LOAD BALANCER
    this.register<LoadBalancerNodeConfig>({
      type: 'load_balancer',
      category: 'networking',
      displayName: 'Layer 7 Application Load Balancer (Envoy)',
      shortDescription: 'Reverse proxy distributing HTTP traffic with health checks.',
      technicalDescription:
        'Terminates HTTP traffic and distributes requests across healthy backend app servers using Round Robin or Least Connections algorithms.',
      supportedInputEdges: ['http_traffic'],
      supportedOutputEdges: ['http_traffic'],
      defaultConfig: {
        name: 'L7 Load Balancer',
        costPerHour: 0.05,
        algorithm: 'round_robin',
        maxRps: 200000,
        connectionTimeoutMs: 5000,
        healthCheckIntervalMs: 2000,
      },
      failureModes: [
        {
          id: 'no_healthy_backends',
          name: 'All Backends Unhealthy',
          description: 'All upstream application servers fail health checks.',
          triggerCondition: 'Healthy target count drops to zero.',
          symptom: 'HTTP 503 Service Unavailable returned to all incoming requests.',
          mitigation: 'Ensure backend servers have sufficient CPU/RAM capacity and pass readiness probes.',
        },
      ],
      costPerHour: (config) => config.costPerHour || 0.05,
      educationalConcept: 'Reverse Proxying, Health Checking & Fault Isolation',
    });

    // 6. MESSAGE QUEUE
    this.register<MessageQueueNodeConfig>({
      type: 'message_queue',
      category: 'messaging',
      displayName: 'Message Queue (RabbitMQ / SQS)',
      shortDescription: 'Asynchronous buffer decoupling writes from compute.',
      technicalDescription:
        'Buffers incoming write bursts so worker pools can consume and process tasks at a sustainable, rate-limited pace.',
      supportedInputEdges: ['async_message', 'stream_processing'],
      supportedOutputEdges: ['stream_processing', 'db_read_write', 'cache_access', 'async_message'],
      defaultConfig: {
        name: 'RabbitMQ Message Queue',
        costPerHour: 0.07,
        bufferCapacity: 100000,
        drainRatePerWorker: 250,
        workersCount: 4,
      },
      failureModes: [
        {
          id: 'buffer_overflow',
          name: 'Message Queue Buffer Overflow',
          description: 'Producer publish rate continuously outpaces consumer worker drain rate.',
          triggerCondition: 'Queue depth exceeds bufferCapacity.',
          symptom: 'Dead letter queue drops messages or publisher is blocked by backpressure.',
          mitigation: 'Scale consumer worker count, optimize job processing speed, or introduce dead-letter queues.',
        },
      ],
      costPerHour: (config) => config.costPerHour || 0.07,
      educationalConcept: 'Asynchronous Decoupling, Backpressure & Worker Pools',
    });

    // 7. CDN
    this.register<CdnNodeConfig>({
      type: 'cdn',
      category: 'networking',
      displayName: 'Cloud CDN (Edge Network)',
      shortDescription: 'Worldwide Edge Network caching public static & GET requests.',
      technicalDescription:
        'Caches static assets and cacheable responses at edge points of presence globally, terminating requests before origin.',
      supportedInputEdges: ['http_traffic'],
      supportedOutputEdges: ['http_traffic'],
      defaultConfig: {
        name: 'Cloud CDN',
        costPerHour: 0.05,
        edgePointsOfPresence: 32,
        cacheHitRatio: 0.7,
        ddosShield: true,
      },
      failureModes: [],
      costPerHour: (config) => config.costPerHour || 0.05,
      educationalConcept: 'Edge Computing, Point-of-Presence Routing & Static Offloading',
    });

    // 8. RATE LIMITER
    this.register<RateLimiterNodeConfig>({
      type: 'rate_limiter',
      category: 'reliability',
      displayName: 'API Rate Limiter (Token Bucket)',
      shortDescription: 'Perimeter gateway shield enforcing RPS caps.',
      technicalDescription:
        'Enforces token bucket rate limits at system ingress, shedding abusive traffic spikes with HTTP 429 Too Many Requests.',
      supportedInputEdges: ['http_traffic'],
      supportedOutputEdges: ['http_traffic'],
      defaultConfig: {
        name: 'Rate Limiter',
        costPerHour: 0.02,
        maxAllowedRps: 50000,
        burstAllowance: 1.2,
      },
      failureModes: [],
      costPerHour: (config) => config.costPerHour || 0.02,
      educationalConcept: 'Traffic Shaping, Token Bucket Algorithm & Abuse Prevention',
    });

    // 9. DB SHARDING
    this.register<DbShardingNodeConfig>({
      type: 'db_sharding',
      category: 'storage',
      displayName: 'Database Sharding Router (Vitess / Citus)',
      shortDescription: 'Horizontal partition coordinator routing queries across shards.',
      technicalDescription:
        'Hash-partitions primary write and read operations across isolated relational database shards, multiplying write throughput.',
      supportedInputEdges: ['db_read_write', 'db_read'],
      supportedOutputEdges: ['db_read_write', 'db_read'],
      defaultConfig: {
        name: 'DB Sharding Router',
        costPerHour: 0.25,
        shardsCount: 4,
        algorithm: 'hash',
        writeThroughputMultiplier: 3.6,
      },
      failureModes: [],
      costPerHour: (config) => config.costPerHour || 0.25,
      educationalConcept: 'Horizontal Partitioning, Shard Keys & Cross-Shard Joins',
    });

    // 10. KAFKA STREAM
    this.register<KafkaStreamNodeConfig>({
      type: 'kafka_stream',
      category: 'messaging',
      displayName: 'Kafka Event Log Cluster',
      shortDescription: 'High-throughput partitioned distributed commit log.',
      technicalDescription:
        'Streams millions of immutable events per second across partitioned logs with consumer group coordination.',
      supportedInputEdges: ['async_message', 'stream_processing'],
      supportedOutputEdges: ['stream_processing', 'db_read_write', 'cache_access', 'async_message'],
      defaultConfig: {
        name: 'Kafka Cluster',
        costPerHour: 0.18,
        partitionsCount: 8,
        maxRps: 500000,
        retentionHours: 48,
      },
      failureModes: [],
      costPerHour: (config) => config.costPerHour || 0.18,
      educationalConcept: 'Event Streaming, Partition Keying & Consumer Group Lag',
    });

    // 11. ANYCAST EDGE
    this.register<AnycastEdgeNodeConfig>({
      type: 'anycast_edge',
      category: 'networking',
      displayName: 'Anycast GeoDNS Router (BGP Route 53)',
      shortDescription: 'Global BGP routing steering traffic to closest POP.',
      technicalDescription:
        'Announces a single IP address from multiple worldwide data centers via BGP, reducing RTT network latency.',
      supportedInputEdges: ['http_traffic'],
      supportedOutputEdges: ['http_traffic'],
      defaultConfig: {
        name: 'Anycast GeoDNS',
        costPerHour: 0.15,
        edgePops: 64,
        latencyReductionMs: 35,
        geoRouting: true,
      },
      failureModes: [],
      costPerHour: (config) => config.costPerHour || 0.15,
      educationalConcept: 'BGP Anycast Routing, Round-Trip Time & Geo-steering',
    });

    // 12. CIRCUIT BREAKER
    this.register<CircuitBreakerNodeConfig>({
      type: 'circuit_breaker',
      category: 'reliability',
      displayName: 'Adaptive Circuit Breaker (Hystrix / Resilience4j)',
      shortDescription: 'Automated load shedder protecting saturated backends.',
      technicalDescription:
        'Monitors downstream error rates and resource saturation. Opens circuit during stress to shed non-critical requests.',
      supportedInputEdges: ['http_traffic'],
      supportedOutputEdges: ['http_traffic'],
      defaultConfig: {
        name: 'Circuit Breaker',
        costPerHour: 0.03,
        thresholdPercent: 90,
        recoverySeconds: 15,
        sheddingRatio: 0.35,
      },
      failureModes: [],
      costPerHour: (config) => config.costPerHour || 0.03,
      educationalConcept: 'Cascading Failure Prevention, Fallbacks & Self-Healing',
    });

    // 13. L4 MAGLEV
    this.register<L4MaglevNodeConfig>({
      type: 'l4_maglev',
      category: 'networking',
      displayName: 'Kernel L4 Maglev (Katran / eBPF)',
      shortDescription: 'Kernel-bypass load balancer routing 100M+ pps.',
      technicalDescription:
        'Direct Server Return (DSR) load balancer running in the Linux kernel via eBPF/XDP. Backends respond directly to clients.',
      supportedInputEdges: ['http_traffic'],
      supportedOutputEdges: ['http_traffic'],
      defaultConfig: {
        name: 'L4 Maglev (DSR)',
        costPerHour: 0.12,
        algorithm: 'maglev_hash',
        maxPacketsPerSec: 100000000,
        directServerReturn: true,
      },
      failureModes: [],
      costPerHour: (config) => config.costPerHour || 0.12,
      educationalConcept: 'Direct Server Return (DSR), eBPF Packet Filtering & Kernel Ingress',
    });

    // 14. DISTRIBUTED NOSQL
    this.register<DistributedNosqlNodeConfig>({
      type: 'distributed_nosql',
      category: 'storage',
      displayName: 'Distributed NoSQL (Cassandra / DynamoDB)',
      shortDescription: 'Masterless quorum storage with linear horizontal write scaling.',
      technicalDescription:
        'Peer-to-peer ring topology with configurable consistency levels (ONE, QUORUM, ALL) supporting high write volume.',
      supportedInputEdges: ['db_read_write', 'db_read'],
      supportedOutputEdges: [],
      defaultConfig: {
        name: 'Distributed NoSQL',
        costPerHour: 0.35,
        replicationFactor: 3,
        consistencyLevel: 'quorum',
        maxWriteIops: 250000,
      },
      failureModes: [],
      costPerHour: (config) => config.costPerHour || 0.35,
      educationalConcept: 'CAP Theorem, Eventual Consistency & Quorum Writes (W + R > N)',
    });
  }
}

export const componentRegistry = ComponentRegistry.getInstance();
