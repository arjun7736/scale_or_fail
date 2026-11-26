/**
 * Scale or Fail - Production Incident Engine
 *
 * Implements real-world production incident detection, structured telemetry logs,
 * root-cause analysis, and verifiable recovery validation.
 */

import {
  ArchitectureGraph,
  ComponentLiveMetrics,
  SystemMetrics,
} from '../core/types';

export interface StructuredIncidentLog {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  service: string;
  message: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface ProductionIncident {
  id: string;
  name: string;
  severity: 'warning' | 'critical';
  category: 'database' | 'container' | 'cache' | 'network' | 'compute';
  description: string;
  symptoms: string[];
  culpritNodeId?: string;
  culpritNodeType?: string;
  technicalRootCause: string;
  structuredLogs: StructuredIncidentLog[];
  recoveryConditionsDescription: string;
  actionableSolutions: {
    title: string;
    description: string;
    tradeOff: string;
    actionType: string;
  }[];
  educationalPrinciple: string;
  isTriggered: boolean;
  isResolved: boolean;
  triggerTick: number;
  resolvedTick?: number;
}

export class IncidentEngine {
  private activeIncidents = new Map<string, ProductionIncident>();
  private resolvedHistory: ProductionIncident[] = [];

  /**
   * Evaluates the current architecture state against realistic production incident definitions.
   */
  public evaluateTick(
    tick: number,
    simSeconds: number,
    graph: ArchitectureGraph,
    systemMetrics: SystemMetrics,
    componentMetrics: Record<string, ComponentLiveMetrics>
  ): {
    currentIncident: ProductionIncident | null;
    justResolved: ProductionIncident | null;
  } {
    let currentIncident: ProductionIncident | null = null;
    let justResolved: ProductionIncident | null = null;

    // Check if any active incident has been successfully recovered by player actions
    for (const [id, inc] of Array.from(this.activeIncidents.entries())) {
      const isRecovered = this.checkRecovery(id, graph, systemMetrics, componentMetrics);
      if (isRecovered) {
        inc.isResolved = true;
        inc.resolvedTick = tick;
        this.activeIncidents.delete(id);
        this.resolvedHistory.push(inc);
        justResolved = inc;
      } else {
        currentIncident = inc;
      }
    }

    if (!currentIncident) {
      // 1. EVALUATE INCIDENT: Database Connection Pool Exhaustion
      const dbIncident = this.checkDbConnectionExhaustion(tick, simSeconds, graph, componentMetrics);
      if (dbIncident) {
        this.activeIncidents.set(dbIncident.id, dbIncident);
        currentIncident = dbIncident;
      }
    }

    if (!currentIncident) {
      // 2. EVALUATE INCIDENT: Kubernetes Container OOMKill Loop
      const oomIncident = this.checkContainerOomKill(tick, simSeconds, graph, componentMetrics);
      if (oomIncident) {
        this.activeIncidents.set(oomIncident.id, oomIncident);
        currentIncident = oomIncident;
      }
    }

    if (!currentIncident) {
      // 3. EVALUATE INCIDENT: Cache Stampede (Thundering Herd)
      const stampedeIncident = this.checkCacheStampede(tick, simSeconds, graph, componentMetrics);
      if (stampedeIncident) {
        this.activeIncidents.set(stampedeIncident.id, stampedeIncident);
        currentIncident = stampedeIncident;
      }
    }

    return { currentIncident, justResolved };
  }

  public getActiveIncidents(): ProductionIncident[] {
    return Array.from(this.activeIncidents.values());
  }

  public getResolvedHistory(): ProductionIncident[] {
    return this.resolvedHistory;
  }

  // --- INCIDENT 1: Database Connection Pool Exhaustion ---
  private checkDbConnectionExhaustion(
    tick: number,
    simSeconds: number,
    graph: ArchitectureGraph,
    componentMetrics: Record<string, ComponentLiveMetrics>
  ): ProductionIncident | null {
    const primaryDb = graph.nodes.find(
      (n) => n.type === 'database' && (n.config as any).role === 'primary'
    );
    if (!primaryDb) return null;

    const m = componentMetrics[primaryDb.id];
    if (!m) return null;

    const isExhausted = m.connectionsActive >= m.connectionsMax && (m.queueDepth > 10 || m.droppedRps > 0);
    if (!isExhausted) return null;

    const timeStr = `${Math.floor(simSeconds / 60)
      .toString()
      .padStart(2, '0')}:${(simSeconds % 60).toString().padStart(2, '0')}`;

    return {
      id: 'db_connection_exhaustion',
      name: 'PostgreSQL Database Connection Pool Exhaustion',
      severity: 'critical',
      category: 'database',
      description:
        'All client connection slots on the primary database are occupied. Upstream application worker threads are blocked waiting for PostgreSQL connections (max_connections reached) and timing out with HTTP 504 Gateway Timeout.',
      symptoms: [
        `Active connections at maximum capacity: ${m.connectionsActive}/${m.connectionsMax}`,
        `Connection wait queue building: ${m.queueDepth} requests waiting for connections`,
        `Requests dropping: ${m.droppedRps} RPS timing out`,
        'Upstream App Server latency degrading',
      ],
      culpritNodeId: primaryDb.id,
      culpritNodeType: 'database',
      technicalRootCause:
        'Each application server worker thread requires a dedicated backend database connection. As compute replicas scale up, aggregate client connections exceed PostgreSQL max_connections.',
      structuredLogs: [
        {
          timestamp: timeStr,
          level: 'WARN',
          service: 'app-server',
          message: 'HikariPool-1 - Connection is not available, request timed out after 2000ms.',
        },
        {
          timestamp: timeStr,
          level: 'FATAL',
          service: 'postgresql-primary',
          message: 'FATAL: sorry, too many clients already. Max connections (100) reached.',
        },
        {
          timestamp: timeStr,
          level: 'ERROR',
          service: 'ingress-lb',
          message: 'HTTP 504 Gateway Timeout returned to 1,420 client sessions.',
        },
      ],
      recoveryConditionsDescription:
        'Enable PgBouncer Connection Pooling on the Database, deploy a Read Replica for read queries, or upgrade the Database Tier to increase connection capacity.',
      actionableSolutions: [
        {
          title: 'Enable PgBouncer Connection Pooling',
          description: 'Multiplexes hundreds of application worker threads onto a lean pool of backend PostgreSQL connections.',
          tradeOff: 'Zero cost overhead. Vastly increases client connection concurrency without consuming server memory.',
          actionType: 'enable_pooling',
        },
        {
          title: 'Deploy a PostgreSQL Read Replica',
          description: 'Offloads read queries from the primary database, freeing connection slots on the write master.',
          tradeOff: 'Adds replica instance cost, but scales read throughput and enhances read fault tolerance.',
          actionType: 'add_replica',
        },
        {
          title: 'Upgrade Database Tier',
          description: 'Select an Enterprise or Large tier to increase max_connections to 300+.',
          tradeOff: 'Significantly increases hourly infrastructure operating costs.',
          actionType: 'upgrade_db',
        },
      ],
      educationalPrinciple:
        'Connection Multiplexing: In distributed systems, client thread counts grow with traffic. Multiplexing via connection poolers (PgBouncer, ProxySQL) prevents resource starvation.',
      isTriggered: true,
      isResolved: false,
      triggerTick: tick,
    };
  }

  // --- INCIDENT 2: Kubernetes Container OOMKill Loop ---
  private checkContainerOomKill(
    tick: number,
    simSeconds: number,
    graph: ArchitectureGraph,
    componentMetrics: Record<string, ComponentLiveMetrics>
  ): ProductionIncident | null {
    const oomServer = graph.nodes.find((n) => {
      if (n.type !== 'app_server') return false;
      const m = componentMetrics[n.id];
      return m && (m.isOom || (m.oomKilledCount && m.oomKilledCount > 0));
    });

    if (!oomServer) return null;
    const m = componentMetrics[oomServer.id]!;
    const timeStr = `${Math.floor(simSeconds / 60)
      .toString()
      .padStart(2, '0')}:${(simSeconds % 60).toString().padStart(2, '0')}`;

    return {
      id: 'k8s_container_oomkill',
      name: 'Kubernetes Pod CrashLoopBackOff: Container OOMKilled',
      severity: 'critical',
      category: 'container',
      description:
        `Application server "${oomServer.label}" exceeded its container cgroup memory limit and was terminated by the Linux kernel OOM Killer with SIGKILL (Exit Code 137).`,
      symptoms: [
        'Container terminated with exit code 137 (OOMKilled)',
        'Pod in CrashLoopBackOff restart state',
        'Active in-flight requests dropped with 502 Bad Gateway',
      ],
      culpritNodeId: oomServer.id,
      culpritNodeType: 'app_server',
      technicalRootCause:
        'In-flight requests and thread buffers consumed more RAM than the configured container memory limit. The Linux kernel OOM Killer terminated the process.',
      structuredLogs: [
        {
          timestamp: timeStr,
          level: 'FATAL',
          service: 'kernel',
          message: 'Memory cgroup out of memory: Kill process 1420 (node) score 1024 or sacrifice child',
        },
        {
          timestamp: timeStr,
          level: 'ERROR',
          service: 'kubelet',
          message: 'Pod app-server-7b4c698f-x8z9q failed liveness probe, restarting container.',
        },
      ],
      recoveryConditionsDescription:
        'Upgrade instance RAM tier, scale pod replicas to distribute in-flight concurrency, or add caching to reduce request residency time.',
      actionableSolutions: [
        {
          title: 'Select and upgrade server instance RAM tier',
          description: 'Upgrade the server tier from Small (4GB) to Medium (8GB) or Large (16GB).',
          tradeOff: 'Higher instance cost, but provides ample headroom for memory-intensive workloads.',
          actionType: 'upgrade_ram',
        },
        {
          title: 'Horizontally Scale App Server Replicas',
          description: 'Deploy a Load Balancer and add replica servers so in-flight requests per node are halved.',
          tradeOff: 'Distributes memory pressure and provides high availability.',
          actionType: 'scale_replicas',
        },
      ],
      educationalPrinciple:
        'Resource Quotas & Cgroups: Containerized services must balance memory limits against maximum concurrent in-flight request volume to prevent OOM termination.',
      isTriggered: true,
      isResolved: false,
      triggerTick: tick,
    };
  }

  // --- INCIDENT 3: Cache Stampede (Thundering Herd) ---
  private checkCacheStampede(
    tick: number,
    simSeconds: number,
    graph: ArchitectureGraph,
    componentMetrics: Record<string, ComponentLiveMetrics>
  ): ProductionIncident | null {
    const primaryDb = graph.nodes.find(
      (n) => n.type === 'database' && (n.config as any).role === 'primary'
    );
    const cache = graph.nodes.find((n) => n.type === 'redis_cache');
    if (!primaryDb || !cache) return null;

    const dbM = componentMetrics[primaryDb.id];
    const cacheM = componentMetrics[cache.id];
    if (!dbM || !cacheM) return null;

    // Cache stampede: cache misses surge (>300 RPS) while DB IOPS is saturated (>85%)
    const isStampede = (cacheM.cacheMissRps || 0) > 300 && dbM.cpuUtilization > 85;
    if (!isStampede) return null;

    const timeStr = `${Math.floor(simSeconds / 60)
      .toString()
      .padStart(2, '0')}:${(simSeconds % 60).toString().padStart(2, '0')}`;

    return {
      id: 'cache_stampede',
      name: 'Cache Stampede (Thundering Herd) Flooding Database',
      severity: 'warning',
      category: 'cache',
      description:
        'Expired cached entries under heavy concurrent read traffic caused thousands of simultaneous queries to bypass the cache and hammer the primary database simultaneously.',
      symptoms: [
        `Cache miss rate spiked: ${cacheM.cacheMissRps} misses/sec hitting DB`,
        `Database IOPS saturated at ${dbM.cpuUtilization}%`,
        'End-to-end response latency degraded',
      ],
      culpritNodeId: cache.id,
      culpritNodeType: 'redis_cache',
      technicalRootCause:
        'A hot cache key expired while thousands of requests were in-flight. Without mutex locking or probabilistic early expiration, all concurrent threads executed the database query simultaneously.',
      structuredLogs: [
        {
          timestamp: timeStr,
          level: 'WARN',
          service: 'redis',
          message: 'Key "hot_products" expired. Immediate cache miss surge detected.',
        },
        {
          timestamp: timeStr,
          level: 'WARN',
          service: 'postgresql-primary',
          message: 'Disk IOPS saturated (92%) due to simultaneous identical read queries.',
        },
      ],
      recoveryConditionsDescription:
        'Deploy a Read Replica to offload read misses, enable Query Index Optimization on the DB, or increase cache hit rate target.',
      actionableSolutions: [
        {
          title: 'Deploy a PostgreSQL Read Replica',
          description: 'Absorbs read misses on replicas instead of saturating the write master.',
          tradeOff: 'Offloads read pressure with minimal architectural disruption.',
          actionType: 'add_replica',
        },
        {
          title: 'Enable Query Index Optimization',
          description: 'Reduces read query IOPS cost by 55%, allowing the database to absorb misses smoothly.',
          tradeOff: 'Zero cost overhead.',
          actionType: 'optimize_index',
        },
      ],
      educationalPrinciple:
        'Thundering Herd & Cache Protection: Always protect downstream databases from cache stampedes using probabilistic early re-computation (XFetch), background refresh, or read replica scaling.',
      isTriggered: true,
      isResolved: false,
      triggerTick: tick,
    };
  }

  // --- RECOVERY VALIDATION ---
  private checkRecovery(
    incidentId: string,
    graph: ArchitectureGraph,
    systemMetrics: SystemMetrics,
    componentMetrics: Record<string, ComponentLiveMetrics>
  ): boolean {
    if (incidentId === 'db_connection_exhaustion') {
      const primaryDb = graph.nodes.find(
        (n) => n.type === 'database' && (n.config as any).role === 'primary'
      );
      if (!primaryDb) return true;
      const m = componentMetrics[primaryDb.id];
      if (!m) return true;
      const cfg = primaryDb.config as any;

      // Recovered if connection pooling enabled OR connection usage drops below 85% with 0 timeout drops
      const isPoolingEnabled = Boolean(cfg.connectionPooling);
      const isConnectionsHealthy = m && m.connectionsActive < m.connectionsMax * 0.85 && (m.droppedRps || 0) === 0;
      const isSystemHealthy = systemMetrics.errorRate < 0.05;

      return (isPoolingEnabled || isConnectionsHealthy) && isSystemHealthy;
    }

    if (incidentId === 'k8s_container_oomkill') {
      const allAppServers = graph.nodes.filter((n) => n.type === 'app_server');
      const anyOom = allAppServers.some((s) => {
        const m = componentMetrics[s.id];
        return m && (m.isOom || m.health === 'failed');
      });
      return !anyOom && systemMetrics.errorRate < 0.05;
    }

    if (incidentId === 'cache_stampede') {
      const primaryDb = graph.nodes.find(
        (n) => n.type === 'database' && (n.config as any).role === 'primary'
      );
      if (!primaryDb) return false;
      const dbM = componentMetrics[primaryDb.id];
      const isIopsHealthy = dbM && dbM.cpuUtilization < 75;
      return Boolean(isIopsHealthy && systemMetrics.errorRate < 0.05);
    }

    return false;
  }

  public reset(): void {
    this.activeIncidents.clear();
    this.resolvedHistory = [];
  }
}

export const incidentEngine = new IncidentEngine();
