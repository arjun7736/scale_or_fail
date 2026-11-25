import { ArchitectureIssue, ComponentType, DifficultyMode } from '../core/types';

export interface ArchitectureRuleDefinition {
  id: string;
  title: string;
  category: 'invalid' | 'inefficient' | 'reliability_risk';
  severity: 'error' | 'warning' | 'info';
  affectedNodeTypes: ComponentType[];
  affectedEdgeTypes?: string[];
  learningConcept: string;
  explanation: string;
  consequence: string;
  suggestedApproaches: {
    title: string;
    description: string;
    tradeOffs?: string;
  }[];
  difficultyDetails?: {
    beginnerHint?: string;
    intermediateGuidance?: string;
    expertMonitoringMetric?: string;
  };
  docLinks?: { title: string; url?: string }[];
}

export const ARCHITECTURE_RULES: Record<string, ArchitectureRuleDefinition> = {
  // ==========================================
  // CATEGORY A: INVALID ARCHITECTURES (ERRORS)
  // ==========================================

  RULE_REDIS_TO_REPLICA: {
    id: 'RULE_REDIS_TO_REPLICA',
    title: 'Unsupported Cache-to-Database Connection',
    category: 'invalid',
    severity: 'error',
    affectedNodeTypes: ['redis_cache', 'database'],
    affectedEdgeTypes: ['unsupported'],
    learningConcept: 'Cache-Aside Pattern & Data Access Layer Co-ordination',
    explanation:
      'Invalid connection: Redis Cache → PostgreSQL Read Replica. In standard production system design, Redis does not function as an automatic database query router or replication controller. Instead, an application server or Data Access Object (DAO) coordinates cache lookups and manages database fallback queries.',
    consequence:
      'The simulator will exclude this unsupported edge from valid request-routing paths. Requests routed along this path cannot be serviced and will be marked as unrouteable.',
    suggestedApproaches: [
      {
        title: 'Adopt the Cache-Aside (Lazy-Loading) Pattern',
        description:
          'Connect your Application Server directly to Redis Cache for quick reads, and also connect the Application Server to PostgreSQL to query on cache misses.',
        tradeOffs:
          'Application code must handle cache misses and invalidation logic, but decoupling preserves architectural clarity and prevent vendor lock-in.',
      },
      {
        title: 'Use Read Replicas via App Server Connection Pool',
        description:
          'Connect the Application Server to the Read Replica for read queries, and to the Primary DB for write transactions.',
        tradeOffs:
          'Application must separate read queries from write transactions (CQRS pattern) and accommodate asynchronous replication lag.',
      },
    ],
    difficultyDetails: {
      beginnerHint:
        'Connect App Server → Redis Cache, and separately connect App Server → PostgreSQL. Redis cannot talk directly to PostgreSQL read replicas in this simulator.',
      intermediateGuidance:
        'Cache-aside requires the application tier to query cache first and fetch from SQL on misses. Remove the Redis → Replica wire.',
      expertMonitoringMetric:
        'Topology check: Direct cache-to-replica edge detected. Excluded from valid call graph.',
    },
    docLinks: [
      { title: 'AWS: Caching Best Practices (Cache-Aside Pattern)' },
      { title: 'Martin Fowler: CQRS (Command Query Responsibility Segregation)' },
    ],
  },

  RULE_LB_NO_TARGETS: {
    id: 'RULE_LB_NO_TARGETS',
    title: 'Load Balancer Without Application Targets',
    category: 'invalid',
    severity: 'error',
    affectedNodeTypes: ['load_balancer'],
    affectedEdgeTypes: ['http_traffic'],
    learningConcept: 'Reverse Proxy Target Groups & Upstream Health',
    explanation:
      'Your Layer 7 Load Balancer has no healthy application server target group configured. In HTTP ingress design, a reverse proxy requires at least one registered upstream worker pool to terminate TLS and forward requests.',
    consequence:
      'Incoming client requests reaching the load balancer will immediately fail with HTTP 503 Service Unavailable / Bad Gateway, driving error rate to 100%.',
    suggestedApproaches: [
      {
        title: 'Connect Load Balancer to Application Servers',
        description:
          'Wire the output handle of the Load Balancer to one or more Application Server instances.',
        tradeOffs:
          'Adds network hop overhead (~1-3ms) but enables horizontal scalability and zero-downtime failover.',
      },
      {
        title: 'Direct Client Ingress (For Minimal Prototyping Only)',
        description:
          'Connect Client directly to a single Application Server if not using a Load Balancer.',
        tradeOffs:
          'Eliminates Load Balancer cost, but creates a hard single point of failure with no horizontal scaling capability.',
      },
    ],
    difficultyDetails: {
      beginnerHint:
        'Your Load Balancer is lonely! Drag a wire from Load Balancer to an App Server so requests have somewhere to go.',
      intermediateGuidance:
        'Target group is empty: Ingress proxy cannot dispatch requests without active upstream backend pool members.',
      expertMonitoringMetric:
        'ALB_TargetGroup_HealthyHostCount == 0 (HTTP 503 Service Unavailable)',
    },
    docLinks: [{ title: 'Nginx / AWS ALB Target Group Configuration' }],
  },

  RULE_DISCONNECTED_DATABASE: {
    id: 'RULE_DISCONNECTED_DATABASE',
    title: 'Application Server Disconnected From Storage',
    category: 'invalid',
    severity: 'error',
    affectedNodeTypes: ['app_server', 'database'],
    affectedEdgeTypes: ['db_read_write', 'db_read'],
    learningConcept: 'Stateful Persistence & Data Access Dependencies',
    explanation:
      'Your Application Server exists and receives traffic, but has no reachable database dependency configured. Production business logic requires access to durable storage for CRUD operations and session data.',
    consequence:
      'All database-dependent requests (typically 75% reads + 20% writes in standard web traffic) will fail with HTTP 500 Internal Server Error. Only pure static or CDN-cached requests can succeed.',
    suggestedApproaches: [
      {
        title: 'Connect App Server to PostgreSQL Primary',
        description:
          'Wire the App Server to PostgreSQL Primary DB to support transactional write mutations and base reads.',
        tradeOffs:
          'Enables full ACID data persistence, but application throughput becomes bounded by database connection pools and disk IOPS.',
      },
      {
        title: 'Implement Multi-Tier Storage (Cache + Database)',
        description:
          'Connect App Server to both Redis Cache and PostgreSQL Primary to balance persistence and low latency.',
        tradeOffs:
          'Higher infrastructure cost, but dramatically decreases database load by absorbing read traffic in memory.',
      },
    ],
    difficultyDetails: {
      beginnerHint:
        'Your App Server needs a database! Connect App Server to PostgreSQL so it can store and read data.',
      intermediateGuidance:
        'Application instances cannot fulfill transactional endpoints without a configured SQL or NoSQL backing store.',
      expertMonitoringMetric:
        'ConnectionPoolTimeoutException: No database host reachable from worker pool.',
    },
    docLinks: [{ title: 'Database Connection Management in Microservices' }],
  },

  RULE_REPLICA_WITHOUT_PRIMARY: {
    id: 'RULE_REPLICA_WITHOUT_PRIMARY',
    title: 'Read Replica Without Primary Database',
    category: 'invalid',
    severity: 'error',
    affectedNodeTypes: ['database'],
    affectedEdgeTypes: ['replication'],
    learningConcept: 'Leader-Follower Replication Topology',
    explanation:
      'A PostgreSQL Read Replica requires an active Primary Database (Write Master) as its replication stream source (WAL sender). Read replicas cannot accept write queries or self-bootstrap without a master.',
    consequence:
      'Write transactions cannot be processed anywhere in the system. The replica will be in an uninitialized state, and write requests will fail.',
    suggestedApproaches: [
      {
        title: 'Deploy a Primary PostgreSQL Database',
        description:
          'Deploy a PostgreSQL Primary DB and connect it to this Read Replica to establish the replication stream.',
        tradeOffs:
          'Provides write durability and enables scaling reads, but write scaling remains bounded by single-master limits.',
      },
      {
        title: 'Promote Replica to Primary Role',
        description:
          'In the Node Configuration Drawer, toggle this database role from REPLICA to PRIMARY (R/W).',
        tradeOffs:
          'Restores write availability immediately without adding extra server costs.',
      },
    ],
    difficultyDetails: {
      beginnerHint:
        'Read Replicas can only read data replicated from a Primary DB. Add a Primary DB or promote this replica to Primary in its settings.',
      intermediateGuidance:
        'Replication stream is broken: WAL receiver has no upstream primary node to replicate write-ahead logs from.',
      expertMonitoringMetric:
        'pg_stat_wal_receiver: Disconnected. No upstream primary replication source.',
    },
    docLinks: [{ title: 'PostgreSQL Streaming Replication Architecture' }],
  },

  RULE_DATABASE_HTTP_ENTRYPOINT: {
    id: 'RULE_DATABASE_HTTP_ENTRYPOINT',
    title: 'Database Exposed as Direct HTTP Ingress',
    category: 'invalid',
    severity: 'error',
    affectedNodeTypes: ['client', 'database'],
    affectedEdgeTypes: ['unsupported'],
    learningConcept: 'Network Security Perimeters & Tier Segregation',
    explanation:
      'Direct connection from Client or External Ingress to Database detected. Databases communicate via binary protocol (e.g., PostgreSQL port 5432) and must never be exposed as direct HTTP/HTTPS web endpoints to the public internet.',
    consequence:
      'HTTP web traffic cannot speak raw database wire protocols. Traffic will be dropped at ingress, and exposing internal storage violates fundamental security defense-in-depth principles.',
    suggestedApproaches: [
      {
        title: 'Route Traffic Through Compute Layer',
        description:
          'Place an Application Server or API Gateway between Client and Database to parse HTTP requests and execute parameterized queries.',
        tradeOffs:
          'Adds application tier compute costs, but enforces authentication, rate limiting, and business validation.',
      },
    ],
    difficultyDetails: {
      beginnerHint:
        'Clients cannot connect directly to databases. Place an App Server in between them to handle web requests.',
      intermediateGuidance:
        'Protocol mismatch: Database engines do not parse HTTP/REST. Route through an application server.',
      expertMonitoringMetric:
        'Security & Protocol Violation: Public subnet routing to private DB listener.',
    },
    docLinks: [{ title: 'Three-Tier Architecture & DMZ Perimeter Security' }],
  },

  RULE_MULTIPLE_PRIMARY_DATABASES: {
    id: 'RULE_MULTIPLE_PRIMARY_DATABASES',
    title: 'Multiple Primary Write Masters (Split-Brain Risk)',
    category: 'invalid',
    severity: 'error',
    affectedNodeTypes: ['database'],
    learningConcept: 'Single-Leader Replication & Split-Brain Prevention',
    explanation:
      'Multiple independent Primary Databases detected in a relational topology. Relational systems require a single source of truth for ACID transactions. Multiple write masters cause split-brain data corruption without distributed consensus protocols.',
    consequence:
      'Conflicting mutations and duplicate primary keys will corrupt state. The system design simulator rejects dual-primary topologies for standard PostgreSQL.',
    suggestedApproaches: [
      {
        title: 'Convert Secondary Database to Read Replica',
        description:
          'Designate one database as PRIMARY (R/W) and convert the other to a READ REPLICA connected via replication.',
        tradeOffs:
          'Eliminates write conflicts and offloads read queries, but does not scale write throughput beyond the primary.',
      },
      {
        title: 'Use Database Sharding for Write Scaling',
        description:
          'If write throughput exceeds single-node capacity, deploy a DB Sharding Router (Vitess) to partition writes across isolated database shards.',
        tradeOffs:
          'Scales write throughput linearly, but makes cross-shard transactions and joins complex and expensive.',
      },
    ],
    difficultyDetails: {
      beginnerHint:
        'You can only have 1 Primary Database. Change the second database to a Read Replica in its configuration.',
      intermediateGuidance:
        'Split-brain risk: Dual write-masters detected without consensus coordination. Use read replicas or sharding.',
      expertMonitoringMetric:
        'Consensus Failure: Dual R/W masters detected. High risk of diverging split-brain transaction logs.',
    },
    docLinks: [{ title: 'Martin Kleppmann: Designing Data-Intensive Applications (Replication)' }],
  },

  RULE_ROUTING_CYCLE: {
    id: 'RULE_ROUTING_CYCLE',
    title: 'Routing Cycle Detected in Call Graph',
    category: 'invalid',
    severity: 'error',
    affectedNodeTypes: ['load_balancer', 'app_server', 'rate_limiter'],
    learningConcept: 'Directed Acyclic Graphs (DAG) in Microservice Routing',
    explanation:
      'A circular loop was detected between compute/ingress components (e.g. Server A → Server B → Server A, or Load Balancer looping back to itself). Ingress routing must form a clean Directed Acyclic Graph (DAG).',
    consequence:
      'Requests entering this loop will bounce continuously until hitting hop limits, causing connection amplification, thread exhaustion, and cascading request timeouts.',
    suggestedApproaches: [
      {
        title: 'Enforce Unidirectional Request Flow',
        description:
          'Disconnect the backward edge to ensure traffic strictly flows from Ingress → Compute → Storage.',
        tradeOffs:
          'Clean acyclic call paths make latency deterministic and prevent recursive request amplification.',
      },
    ],
    difficultyDetails: {
      beginnerHint:
        'Remove the circular connection! Traffic should flow in one direction: Client → Load Balancer → App Server → Database.',
      intermediateGuidance:
        'Cyclic dependency in call graph: Recursion loop will exhaust execution thread pools.',
      expertMonitoringMetric:
        'MaxHopLimitExceeded: Infinite redirect/forward loop detected in ingress topology.',
    },
    docLinks: [{ title: 'Preventing Microservice Cascading Loops and Deadlocks' }],
  },

  RULE_NO_CLIENT_NODE: {
    id: 'RULE_NO_CLIENT_NODE',
    title: 'Missing Client Traffic Source',
    category: 'invalid',
    severity: 'error',
    affectedNodeTypes: ['client'],
    learningConcept: 'System Ingress & Workload Drivers',
    explanation:
      'No Client ingress node found in the architecture. A system cannot be simulated or evaluated without an external traffic driver representing user demand.',
    consequence:
      'The simulation has no traffic ingress to generate load, measure latency, or evaluate system throughput.',
    suggestedApproaches: [
      {
        title: 'Add a Client Node',
        description: 'Ensure a Client node is placed and wired to your ingress layer (Load Balancer, CDN, or App Server).',
      },
    ],
    difficultyDetails: {
      beginnerHint: 'Every architecture needs a Client node to simulate incoming traffic from real users.',
      intermediateGuidance: 'Missing traffic driver: Architecture has no external request generation source.',
      expertMonitoringMetric: 'IngressStream: Null. No traffic generator bound to ingress ports.',
    },
    docLinks: [{ title: 'System Ingress & Load Generation Principles' }],
  },

  RULE_NO_APP_SERVERS: {
    id: 'RULE_NO_APP_SERVERS',
    title: 'Missing Compute Tier (No App Servers)',
    category: 'invalid',
    severity: 'error',
    affectedNodeTypes: ['app_server'],
    learningConcept: 'Compute vs Storage Separation in Web Systems',
    explanation:
      'No Application Servers found in the architecture. Without compute instances, there is no execution environment to execute application code, evaluate authentication, or query backend databases.',
    consequence:
      'All incoming requests that reach ingress cannot be executed and will immediately fail with HTTP 502/503 errors.',
    suggestedApproaches: [
      {
        title: 'Deploy Application Servers',
        description: 'Deploy one or more App Servers and connect them behind a Load Balancer or directly to ingress.',
      },
    ],
    difficultyDetails: {
      beginnerHint: 'Add an App Server from the toolbox to run your application business logic.',
      intermediateGuidance: 'Missing stateless compute layer: Requests cannot be executed without backend workers.',
      expertMonitoringMetric: 'NoActiveComputeBackends: Zero workers available to process incoming HTTP payloads.',
    },
    docLinks: [{ title: 'Stateless Application Server Tier Design' }],
  },

  RULE_NO_DATABASE: {
    id: 'RULE_NO_DATABASE',
    title: 'Missing Persistent Storage Layer',
    category: 'invalid',
    severity: 'error',
    affectedNodeTypes: ['database', 'distributed_nosql'],
    learningConcept: 'Durability & State Persistence in Distributed Systems',
    explanation:
      'No persistent database or distributed store found in the architecture. Modern stateful applications require a durable backend to persist user profiles, transactions, and domain state.',
    consequence:
      'Database-dependent read and write mutations will fail immediately with HTTP 500 errors.',
    suggestedApproaches: [
      {
        title: 'Deploy a PostgreSQL Database',
        description: 'Add a PostgreSQL Primary Database and wire it to your Application Servers.',
      },
    ],
    difficultyDetails: {
      beginnerHint: 'Add a PostgreSQL Primary Database to store and retrieve data.',
      intermediateGuidance: 'Persistence layer missing: All stateful transactional endpoints will fail.',
      expertMonitoringMetric: 'StorageSubsystemOffline: No durable state persistence tier bound to compute.',
    },
    docLinks: [{ title: 'ACID Properties and Relational Database Principles' }],
  },

  RULE_DUPLICATE_SINGLETON: {
    id: 'RULE_DUPLICATE_SINGLETON',
    title: 'Duplicate Singleton Component Tier',
    category: 'invalid',
    severity: 'error',
    affectedNodeTypes: ['load_balancer', 'redis_cache', 'cdn', 'rate_limiter'],
    learningConcept: 'Architectural Layer Cleanliness & Duplicate Hops',
    explanation:
      'Multiple instances of a singleton tier detected (such as chaining two Load Balancers or two CDNs in sequence). In production design, cascading duplicate proxies introduces redundant network hops, complex cache invalidation, and increased blast radius.',
    consequence:
      'Extra network latency overhead, unnecessary billing spend, and duplicate configuration overhead without additional throughput capacity.',
    suggestedApproaches: [
      {
        title: 'Remove Duplicate Component',
        description:
          'Keep exactly one instance of this ingress or caching tier and scale compute workers horizontally instead.',
      },
    ],
    difficultyDetails: {
      beginnerHint: 'You only need one Load Balancer or one CDN. Remove the duplicate instance.',
      intermediateGuidance: 'Duplicate proxy hops detected. Consolidate to a single tier to avoid latency penalties.',
      expertMonitoringMetric: 'RedundantHopDetected: Chained proxies increase p95 latency without scaling throughput.',
    },
    docLinks: [{ title: 'Clean Architecture in Cloud Infrastructure' }],
  },

  // ==========================================
  // CATEGORY B: VALID BUT INEFFICIENT (WARNINGS)
  // ==========================================

  RULE_SINGLE_SERVER_UNDER_LOAD: {
    id: 'RULE_SINGLE_SERVER_UNDER_LOAD',
    title: 'Single App Server Nearing Capacity Limits',
    category: 'inefficient',
    severity: 'warning',
    affectedNodeTypes: ['app_server'],
    learningConcept: 'Horizontal vs. Vertical Scaling & Little\'s Law',
    explanation:
      'Your architecture is functional, but a single application server is handling high or rapidly increasing traffic. As concurrency (L = λ · W) grows, single-node CPU and thread pools become saturated, leading to queue buildup.',
    consequence:
      'Average latency will degrade from ~15ms to over 500ms. If traffic surges further, request timeouts and thread exhaustion will cause dropped requests (HTTP 504).',
    suggestedApproaches: [
      {
        title: 'Scale Out Horizontally (Add Load Balancer + App Servers)',
        description:
          'Deploy a Load Balancer and add 1-2 additional App Servers. Distributing traffic across multiple smaller instances provides linear throughput scaling.',
        tradeOffs:
          'Adds Load Balancer cost (~$0.05/hr) and minimal proxy latency (~2ms), but enables seamless horizontal scaling and high availability.',
      },
      {
        title: 'Scale Up Vertically (Upgrade Instance Tier)',
        description:
          'Upgrade the existing server from SMALL (2 cores, 4GB) to MEDIUM or LARGE (4-8 cores, 8-16GB).',
        tradeOffs:
          'Simple with zero topology changes, but expensive and still leaves a single point of failure.',
      },
    ],
    difficultyDetails: {
      beginnerHint:
        'Your single server is working hard! Put a Load Balancer in front and add another App Server to share the load.',
      intermediateGuidance:
        'Server CPU and queue depth are climbing under load. Consider horizontal scaling behind a reverse proxy.',
      expertMonitoringMetric:
        'ThreadQueueSaturation: queueDepth > 80, CPU > 75%. Approaching Little\'s Law concurrency ceiling.',
    },
    docLinks: [{ title: 'Horizontal vs Vertical Scaling Trade-Offs' }],
  },

  RULE_HIGH_READ_LOAD_NO_CACHE: {
    id: 'RULE_HIGH_READ_LOAD_NO_CACHE',
    title: 'High Database Read Load Without Caching',
    category: 'inefficient',
    severity: 'warning',
    affectedNodeTypes: ['database', 'redis_cache'],
    learningConcept: 'Read-Heavy Workloads & Sub-Millisecond RAM Caching',
    explanation:
      'Your database is executing a high read query workload (75% of incoming traffic) directly against disk storage. Repeated reads for unchanged data waste expensive database IOPS and connection pool slots.',
    consequence:
      'Database disk IOPS and connection pools become bottlenecks. Read latency increases from ~5ms to >50ms, slowing down upstream application request processing.',
    suggestedApproaches: [
      {
        title: 'Deploy an In-Memory Redis Cache',
        description:
          'Deploy a Redis Cache cluster between the App Server and Database. Redis serves read hits in sub-millisecond RAM, absorbing 80-90% of read queries.',
        tradeOffs:
          'Redis adds ~$0.08/hr cost and requires cache invalidation strategies (TTL / write-through), but protects database IOPS.',
      },
      {
        title: 'Deploy Read Replicas (Aurora / Postgres)',
        description:
          'Deploy Read Replicas to horizontally scale read throughput off the primary write master.',
        tradeOffs:
          'Read replicas add instance cost and have asynchronous replication lag (~10-50ms), but scale relational query capacity.',
      },
    ],
    difficultyDetails: {
      beginnerHint:
        'Your database is doing too many read queries. Add a Redis Cache cluster to answer common queries in fast memory!',
      intermediateGuidance:
        'Storage IOPS saturation risk: 75% read ratio can be absorbed by an in-memory cache layer or read replicas.',
      expertMonitoringMetric:
        'HighStorageReadIOPS: 80% read queries hitting disk. Cache absorption ratio is 0%.',
    },
    docLinks: [{ title: 'In-Memory Caching Strategies (Redis / Memcached)' }],
  },

  RULE_LB_SINGLE_TARGET: {
    id: 'RULE_LB_SINGLE_TARGET',
    title: 'Load Balancer Connected to Only 1 Server',
    category: 'inefficient',
    severity: 'info',
    affectedNodeTypes: ['load_balancer', 'app_server'],
    learningConcept: 'Load Balancing Efficiency & Redundancy Justification',
    explanation:
      'Your Load Balancer is distributing traffic to only a single application server. While technically valid, paying for a load balancer to route to one node provides zero load distribution benefits and adds an unnecessary network hop.',
    consequence:
      'You are paying load balancer hourly fees ($0.05/hr) with extra proxy latency (~2ms) without gaining fault tolerance or load distribution.',
    suggestedApproaches: [
      {
        title: 'Add a Second Application Server Replica',
        description:
          'Deploy a second App Server and connect the Load Balancer to both to unlock genuine load balancing and failover.',
        tradeOffs:
          'Doubles compute cost, but provides true high availability and doubles throughput capacity.',
      },
      {
        title: 'Keep as Prepared Ingress (Valid Stage 1 Design)',
        description:
          'If preparing for imminent traffic growth, keeping the Load Balancer in place allows adding servers instantly without client reconfiguration.',
        tradeOffs:
          'Minor cost overhead, but eliminates future downtime during traffic expansion.',
      },
    ],
    difficultyDetails: {
      beginnerHint:
        'A Load Balancer needs at least two App Servers to actually balance traffic. Add another App Server!',
      intermediateGuidance:
        'Redundant proxy tier: Single upstream backend provides no failover benefit. Add instances to justify LB.',
      expertMonitoringMetric:
        'ALB_TargetGroup_HostCount == 1. Ingress proxy overhead without high availability.',
    },
    docLinks: [{ title: 'Load Balancer Redundancy Best Practices' }],
  },

  RULE_OVERPROVISIONED_INFRASTRUCTURE: {
    id: 'RULE_OVERPROVISIONED_INFRASTRUCTURE',
    title: 'Over-Provisioned Infrastructure for Current Workload',
    category: 'inefficient',
    severity: 'info',
    affectedNodeTypes: ['app_server', 'database'],
    learningConcept: 'Cost Optimization & Right-Sizing Cloud Resources',
    explanation:
      'Your architecture utilizes high-tier infrastructure (e.g. 2XLARGE servers or Enterprise DB) while current traffic is nominal (< 200 RPS). Over-allocating compute during low demand burns financial budget unnecessarily.',
    consequence:
      'Operating cost per hour is disproportionately high relative to revenue earned, risking budget exhaustion before hyperscale stages.',
    suggestedApproaches: [
      {
        title: 'Right-Size Instances to Match Demand',
        description:
          'Scale down instances to SMALL or MEDIUM tiers during early stages, then scale out as traffic increases.',
        tradeOffs:
          'Saves budget for future hyperscale components (Kafka, Maglev, Sharding) without sacrificing performance.',
      },
    ],
    difficultyDetails: {
      beginnerHint: 'Your servers are bigger and more expensive than you need right now. Right-size them to save money!',
      intermediateGuidance: 'Instance utilization < 15%. Consider right-sizing to conserve operational budget.',
      expertMonitoringMetric: 'LowResourceUtilization: Compute utilization < 10% with high unit cost.',
    },
    docLinks: [{ title: 'AWS Well-Architected Framework: Cost Optimization' }],
  },

  RULE_HIGH_DB_CONNECTIONS: {
    id: 'RULE_HIGH_DB_CONNECTIONS',
    title: 'High Database Connection Pool Utilization',
    category: 'inefficient',
    severity: 'warning',
    affectedNodeTypes: ['database', 'app_server'],
    learningConcept: 'Database Connection Starvation & PgBouncer Pooling',
    explanation:
      'Application server instances are consuming over 75% of available PostgreSQL connections. Each PostgreSQL connection spawns an operating system process with memory overhead (~10MB RAM).',
    consequence:
      'If traffic surges, new connection attempts will be rejected with "FATAL: remaining connection slots are reserved", leading to cascaded application connection timeouts.',
    suggestedApproaches: [
      {
        title: 'Enable Connection Pooling (PgBouncer)',
        description:
          'In the Database configuration drawer, enable Connection Pooling to multiplex thousands of application requests across a small pool of database connections.',
        tradeOffs:
          'Some session-level SQL features (like PREPARE statements in transaction pooling) require care, but prevents connection exhaustion.',
      },
      {
        title: 'Upgrade Database Tier',
        description:
          'Upgrade the Database tier to increase maxConnections.',
        tradeOffs:
          'Increases RAM and CPU cost, but provides more raw connections.',
      },
    ],
    difficultyDetails: {
      beginnerHint: 'Your database is running out of connections! Turn on Connection Pooling in database settings.',
      intermediateGuidance: 'Connection pool saturation > 75%. Enable connection pooling (PgBouncer) or upgrade tier.',
      expertMonitoringMetric: 'pg_stat_activity: connectionsActive / maxConnections > 0.80. Approaching connection starvation.',
    },
    docLinks: [{ title: 'PostgreSQL Connection Pooling with PgBouncer' }],
  },

  RULE_LOW_CACHE_HIT_RATE: {
    id: 'RULE_LOW_CACHE_HIT_RATE',
    title: 'Low Cache Hit Rate (Frequent Cache Misses)',
    category: 'inefficient',
    severity: 'info',
    affectedNodeTypes: ['redis_cache'],
    learningConcept: 'Cache Sizing, Eviction Policies & Working Set',
    explanation:
      'Redis Cache hit rate is below 50%. This occurs when cache memory is too small to hold the working dataset, causing frequent LRU evictions, or when TTL is set too aggressively.',
    consequence:
      'Cache misses force requests to fall back to the primary database, negating the latency benefit of the cache layer and adding redundant cache lookup overhead.',
    suggestedApproaches: [
      {
        title: 'Increase Cache Memory Size',
        description: 'Upgrade Redis Cache RAM in configuration so the hot working set fits comfortably in memory.',
        tradeOffs: 'Higher RAM cost per hour, but increases cache hit ratio above 85%.',
      },
      {
        title: 'Optimize TTL and Key Eviction Policy',
        description: 'Increase TTL so frequently read items remain cached longer.',
        tradeOffs: 'Slightly higher risk of stale data if mutations occur frequently without invalidation.',
      },
    ],
    difficultyDetails: {
      beginnerHint: 'Your cache is missing too often. Give it more RAM in settings so it can store more items.',
      intermediateGuidance: 'Cache hit ratio < 50%. Working set exceeds available RAM; upgrade cache memory.',
      expertMonitoringMetric: 'Redis_keyspace_hits / (keyspace_hits + keyspace_misses) < 0.50.',
    },
    docLinks: [{ title: 'Redis Memory Optimization and Eviction Policies' }],
  },

  // ==========================================
  // CATEGORY C: RELIABILITY & SCALABILITY RISKS
  // ==========================================

  RULE_SINGLE_POINT_OF_FAILURE_APP: {
    id: 'RULE_SINGLE_POINT_OF_FAILURE_APP',
    title: 'Single Application Server (High SPOF Risk)',
    category: 'reliability_risk',
    severity: 'warning',
    affectedNodeTypes: ['app_server'],
    learningConcept: 'Single Point of Failure (SPOF) & Fault Tolerance',
    explanation:
      'Your architecture relies on a single Application Server with no redundancy. If this instance experiences an out-of-memory error, garbage collection pause, or node failure, the entire system experiences a total outage.',
    consequence:
      'Zero fault tolerance: Any server disruption produces an immediate 100% outage for all users.',
    suggestedApproaches: [
      {
        title: 'Add Redundant App Servers Behind a Load Balancer',
        description:
          'Deploy a Load Balancer and at least two Application Server instances across independent failure domains.',
        tradeOffs:
          'Higher compute cost, but guarantees that the failure of any single instance does not bring down the entire service.',
      },
    ],
    difficultyDetails: {
      beginnerHint:
        'If your only app server crashes, the whole game is over! Add a second server so one can fail safely.',
      intermediateGuidance:
        'Single Point of Failure (SPOF): Zero redundancy in compute tier. Host failure causes total service disruption.',
      expertMonitoringMetric:
        'SPOF_Detection: Compute availability N=1. SLA target of 99.9% cannot be guaranteed without N+1 redundancy.',
    },
    docLinks: [{ title: 'Designing High Availability Web Systems (N+1 Redundancy)' }],
  },

  RULE_DATABASE_SPOF: {
    id: 'RULE_DATABASE_SPOF',
    title: 'Database Single Point of Failure',
    category: 'reliability_risk',
    severity: 'warning',
    affectedNodeTypes: ['database'],
    learningConcept: 'Database High Availability, Failover & Replication',
    explanation:
      'A database-dependent application has only one primary database instance and no configured failover or replication strategy. If this database host crashes or disk fills up, all stateful operations halt completely.',
    consequence:
      'Data mutations and stateful reads will immediately fail during any database restart, failover, or saturation event.',
    suggestedApproaches: [
      {
        title: 'Deploy Read Replicas for Read Redundancy',
        description:
          'Deploy PostgreSQL Read Replicas to offload reads. In production, replicas also provide candidate nodes for automated failover promotion.',
        tradeOffs:
          'Replicas provide read availability and failover candidates, but write operations still depend on the primary until promoted.',
      },
      {
        title: 'Use Distributed NoSQL for Multi-Master Resilience',
        description:
          'For hyperscale stages, migrate to Distributed NoSQL (Cassandra) which offers masterless multi-node quorum writes with no single point of failure.',
        tradeOffs:
          'Sacrifices multi-row ACID transactions and relational joins, but achieves 100% write availability.',
      },
    ],
    difficultyDetails: {
      beginnerHint:
        'Add a Read Replica database! It offloads read queries and provides a backup if the primary slows down.',
      intermediateGuidance:
        'Single database instance creates an unmitigated SPOF. Deploy read replicas or automated failover topology.',
      expertMonitoringMetric:
        'SinglePointOfFailure: Master database has 0 replication standby nodes. MTTR will be high during node failure.',
    },
    docLinks: [{ title: 'High Availability Topologies for PostgreSQL' }],
  },

  RULE_CACHE_STAMPEDE_RISK: {
    id: 'RULE_CACHE_STAMPEDE_RISK',
    title: 'Cache Stampede Risk on Cache Eviction',
    category: 'reliability_risk',
    severity: 'warning',
    affectedNodeTypes: ['redis_cache', 'database'],
    learningConcept: 'Cache Stampede (Thundering Herd) & Fallback Protection',
    explanation:
      'Your system absorbs high traffic through Redis Cache, but the underlying database capacity is not sized to handle the full load if cache keys expire or Redis fails. When hot cache keys expire simultaneously, thousands of concurrent requests slam the primary database.',
    consequence:
      'A sudden drop in cache hit rate will trigger a thundering herd on PostgreSQL, instantly saturating connection pools and triggering cascading timeouts.',
    suggestedApproaches: [
      {
        title: 'Add Read Replicas to Absorb Database Spikes',
        description:
          'Deploy 1-2 Read Replicas so that database fallbacks are distributed across multiple database instances.',
        tradeOffs:
          'Adds replica instance costs, but cushions against database collapse during cache cold starts.',
      },
      {
        title: 'Configure Adaptive Circuit Breaker',
        description:
          'Deploy a Circuit Breaker to shed non-essential traffic when downstream database latency spikes.',
        tradeOffs:
          'Sheds a fraction of requests during an incident, but prevents total system collapse.',
      },
    ],
    difficultyDetails: {
      beginnerHint:
        'If your cache resets, all requests will hit your database at once! Add Read Replicas so the database can survive.',
      intermediateGuidance:
        'Thundering herd risk: Database capacity cannot absorb 100% of uncached traffic during cache flush or failure.',
      expertMonitoringMetric:
        'StampedeExposureRatio: (CacheHitRps * 0.8) > MaxDatabaseCapacityRps.',
    },
    docLinks: [{ title: 'Mitigating Cache Stampede (Thundering Herd) with Probabilistic Early Expiration' }],
  },

  RULE_UNBOUNDED_QUEUE_RISK: {
    id: 'RULE_UNBOUNDED_QUEUE_RISK',
    title: 'Message Queue Ingestion Exceeds Worker Drain Rate',
    category: 'reliability_risk',
    severity: 'warning',
    affectedNodeTypes: ['message_queue', 'app_server'],
    learningConcept: 'Backpressure, Queue Buffer Bloat & Drain Equilibrium',
    explanation:
      'Heavy async mutation traffic is entering the Message Queue faster than consumer workers can drain it. When producer arrival rate (λ) exceeds service rate (μ), queue depth grows without bound.',
    consequence:
      'Queue memory buffer will fill up. Once buffer capacity is reached, either new messages will be dropped (data loss) or backpressure will block application producers.',
    suggestedApproaches: [
      {
        title: 'Scale Out Worker Application Servers',
        description:
          'Increase workersCount or deploy additional App Server instances dedicated to processing queue jobs.',
        tradeOffs:
          'Increases compute cost, but stabilizes queue depth and maintains low end-to-end processing latency.',
      },
      {
        title: 'Use Kafka for High-Throughput Event Streaming',
        description:
          'For massive write bursts, use Kafka Event Stream which buffers events sequentially to disk with partitioned consumer groups.',
        tradeOffs:
          'Slightly higher latency than in-memory queues, but virtually unlimited durable storage buffer.',
      },
    ],
    difficultyDetails: {
      beginnerHint: 'Your message queue is filling up faster than your workers can empty it! Add more workers in settings.',
      intermediateGuidance: 'Queue depth divergence: Arrival rate λ > Service rate μ. Scale consumer workers.',
      expertMonitoringMetric: 'QueueLagGrowthRate > 0: queueDepth accelerating toward bufferCapacity limit.',
    },
    docLinks: [{ title: 'Queueing Theory: M/M/c Queues and Backpressure' }],
  },
};
