import { describe, it, expect } from 'vitest';
import { routeTrafficThroughGraph } from '../routing/traffic-router';
import { validateArchitectureGraph } from '../routing/graph-validator';
import { DEFAULT_CONFIGS } from '../models/economics';
import { ArchitectureGraph } from '../core/types';
import { decomposeTraffic } from '../traffic/request-mix';

describe('Hyperscale Components (1M to 100M Concurrency)', () => {
  it('should validate connections for advanced hyperscale topology', () => {
    const graph: ArchitectureGraph = {
      nodes: [
        { id: 'client-1', type: 'client', label: 'Client', config: DEFAULT_CONFIGS.client() },
        { id: 'anycast-1', type: 'anycast_edge', label: 'Anycast', config: DEFAULT_CONFIGS.anycast_edge() },
        { id: 'cdn-1', type: 'cdn', label: 'CDN', config: DEFAULT_CONFIGS.cdn() },
        { id: 'l4-1', type: 'l4_maglev', label: 'L4 Maglev', config: DEFAULT_CONFIGS.l4_maglev() },
        { id: 'cb-1', type: 'circuit_breaker', label: 'Circuit Breaker', config: DEFAULT_CONFIGS.circuit_breaker() },
        { id: 'server-1', type: 'app_server', label: 'App Server', config: DEFAULT_CONFIGS.app_server('xlarge') },
        { id: 'kafka-1', type: 'kafka_stream', label: 'Kafka', config: DEFAULT_CONFIGS.kafka_stream() },
        { id: 'sharding-1', type: 'db_sharding', label: 'DB Sharding', config: DEFAULT_CONFIGS.db_sharding() },
        { id: 'db-1', type: 'database', label: 'Postgres Primary', config: DEFAULT_CONFIGS.database('primary', 'enterprise') },
      ],
      edges: [
        { id: 'e1', source: 'client-1', target: 'anycast-1' },
        { id: 'e2', source: 'anycast-1', target: 'cdn-1' },
        { id: 'e3', source: 'cdn-1', target: 'l4-1' },
        { id: 'e4', source: 'l4-1', target: 'cb-1' },
        { id: 'e5', source: 'cb-1', target: 'server-1' },
        { id: 'e6', source: 'server-1', target: 'kafka-1' },
        { id: 'e7', source: 'server-1', target: 'sharding-1' },
        { id: 'e8', source: 'sharding-1', target: 'db-1' },
      ],
    };

    const validation = validateArchitectureGraph(graph);
    expect(validation.isValid).toBe(true);
    expect(validation.canServeTraffic).toBe(true);
  });

  it('should scale write IOPS through Database Sharding', () => {
    const graph: ArchitectureGraph = {
      nodes: [
        { id: 'client-1', type: 'client', label: 'Client', config: DEFAULT_CONFIGS.client() },
        { id: 'server-1', type: 'app_server', label: 'App Server', config: DEFAULT_CONFIGS.app_server('2xlarge') },
        { id: 'sharding-1', type: 'db_sharding', label: 'DB Sharding Router', config: DEFAULT_CONFIGS.db_sharding() },
        { id: 'db-1', type: 'database', label: 'Primary DB', config: DEFAULT_CONFIGS.database('primary', 'enterprise') },
      ],
      edges: [
        { id: 'e1', source: 'client-1', target: 'server-1' },
        { id: 'e2', source: 'server-1', target: 'sharding-1' },
        { id: 'e3', source: 'sharding-1', target: 'db-1' },
      ],
    };

    const traffic = decomposeTraffic(3000);
    const result = routeTrafficThroughGraph(graph, traffic, 100);

    // Sharding router should process the writes
    expect(result.componentMetrics['sharding-1']?.throughputInRps).toBeGreaterThan(0);
    expect(result.componentMetrics['sharding-1']?.statusMessage).toContain('Hash partitioning');
    expect(result.systemMetricsPartial.systemHealth).toBe('healthy');
  });

  it('should handle masterless reads and writes in Distributed NoSQL', () => {
    const graph: ArchitectureGraph = {
      nodes: [
        { id: 'client-1', type: 'client', label: 'Client', config: DEFAULT_CONFIGS.client() },
        { id: 'server-1', type: 'app_server', label: 'App Server', config: DEFAULT_CONFIGS.app_server('2xlarge') },
        { id: 'nosql-1', type: 'distributed_nosql', label: 'NoSQL Cluster', config: DEFAULT_CONFIGS.distributed_nosql() },
      ],
      edges: [
        { id: 'e1', source: 'client-1', target: 'server-1' },
        { id: 'e2', source: 'server-1', target: 'nosql-1' },
      ],
    };

    const validation = validateArchitectureGraph(graph);
    expect(validation.canServeTraffic).toBe(true);

    const traffic = decomposeTraffic(3000);
    const result = routeTrafficThroughGraph(graph, traffic, 100);

    expect(result.componentMetrics['nosql-1']?.statusMessage).toContain('Masterless Quorum');
    expect(result.componentMetrics['nosql-1']?.throughputInRps).toBeGreaterThan(2000);
  });

  it('should sustain Stage 5 production scale (60,000 RPS to 84,000 RPS spike) without primary DB or server crash', () => {
    const primaryDbConfig = {
      ...DEFAULT_CONFIGS.database('primary', 'enterprise'),
      connectionPooling: true,
      queryOptimizationIndex: true,
    };
    const replicaDbConfig = {
      ...DEFAULT_CONFIGS.database('replica', 'enterprise'),
      queryOptimizationIndex: true,
    };

    const k8sServerConfig = (idName: string) => ({
      ...DEFAULT_CONFIGS.app_server('xlarge'),
      name: idName,
      containerRuntime: 'kubernetes' as const,
      k8sConfig: {
        replicas: 4,
        minReplicas: 2,
        maxReplicas: 8,
        targetCpuUtilization: 75,
        readinessProbeDelaySeconds: 2,
        isAutoscalingEnabled: true,
      },
    });

    const graph: ArchitectureGraph = {
      nodes: [
        { id: 'client-1', type: 'client', label: 'Client', config: DEFAULT_CONFIGS.client() },
        { id: 'cdn-1', type: 'cdn', label: 'Edge CDN', config: DEFAULT_CONFIGS.cdn() },
        { id: 'rl-1', type: 'rate_limiter', label: 'Rate Limiter', config: { ...DEFAULT_CONFIGS.rate_limiter(), maxAllowedRps: 150000 } },
        { id: 'lb-1', type: 'load_balancer', label: 'Load Balancer', config: DEFAULT_CONFIGS.load_balancer() },
        { id: 'app-1', type: 'app_server', label: 'App Server 1', config: k8sServerConfig('App Server 1') },
        { id: 'app-2', type: 'app_server', label: 'App Server 2', config: k8sServerConfig('App Server 2') },
        { id: 'app-3', type: 'app_server', label: 'App Server 3', config: k8sServerConfig('App Server 3') },
        { id: 'app-4', type: 'app_server', label: 'App Server 4', config: k8sServerConfig('App Server 4') },
        { id: 'redis-1', type: 'redis_cache', label: 'Redis Cache', config: DEFAULT_CONFIGS.redis_cache() },
        { id: 'mq-1', type: 'message_queue', label: 'Message Queue', config: { ...DEFAULT_CONFIGS.message_queue(), workersCount: 16 } },
        { id: 'db-primary', type: 'database', label: 'Postgres Primary', config: primaryDbConfig },
        { id: 'db-replica', type: 'database', label: 'Postgres Replica', config: replicaDbConfig },
      ],
      edges: [
        { id: 'e1', source: 'client-1', target: 'cdn-1' },
        { id: 'e2', source: 'cdn-1', target: 'rl-1' },
        { id: 'e3', source: 'rl-1', target: 'lb-1' },
        { id: 'e4', source: 'lb-1', target: 'app-1' },
        { id: 'e5', source: 'lb-1', target: 'app-2' },
        { id: 'e6', source: 'lb-1', target: 'app-3' },
        { id: 'e7', source: 'lb-1', target: 'app-4' },
        { id: 'e8', source: 'app-1', target: 'redis-1' },
        { id: 'e9', source: 'app-2', target: 'redis-1' },
        { id: 'e10', source: 'app-3', target: 'redis-1' },
        { id: 'e11', source: 'app-4', target: 'redis-1' },
        { id: 'e12', source: 'app-1', target: 'mq-1' },
        { id: 'e13', source: 'app-2', target: 'mq-1' },
        { id: 'e14', source: 'app-3', target: 'mq-1' },
        { id: 'e15', source: 'app-4', target: 'mq-1' },
        { id: 'e16', source: 'mq-1', target: 'db-primary' },
        { id: 'e17', source: 'app-1', target: 'db-primary' },
        { id: 'e18', source: 'app-2', target: 'db-primary' },
        { id: 'e19', source: 'app-3', target: 'db-primary' },
        { id: 'e20', source: 'app-4', target: 'db-primary' },
        { id: 'e21', source: 'app-1', target: 'db-replica' },
        { id: 'e22', source: 'app-2', target: 'db-replica' },
        { id: 'e23', source: 'app-3', target: 'db-replica' },
        { id: 'e24', source: 'app-4', target: 'db-replica' },
        { id: 'e25', source: 'db-primary', target: 'db-replica' },
      ],
    };

    const validation = validateArchitectureGraph(graph);
    expect(validation.isValid).toBe(true);

    // Test with Stage 5 peak spike traffic: 84,000 RPS
    const traffic = decomposeTraffic(84000);
    const result = routeTrafficThroughGraph(graph, traffic, 200);

    // 1. Primary DB must NOT be overloaded or failed
    const primaryMetrics = result.componentMetrics['db-primary'];
    expect(primaryMetrics).toBeDefined();
    expect(primaryMetrics.health).not.toBe('failed');
    expect(primaryMetrics.health).not.toBe('critical');
    expect(primaryMetrics.cpuUtilization).toBeLessThan(85); // IOPS utilization < 85%

    // 2. App servers must NOT crash from OOM
    const app1Metrics = result.componentMetrics['app-1'];
    const app2Metrics = result.componentMetrics['app-2'];
    expect(app1Metrics.isOom).toBeFalsy();
    expect(app2Metrics.isOom).toBeFalsy();
    expect(app1Metrics.health).not.toBe('failed');
    expect(app2Metrics.health).not.toBe('failed');

    // 3. System overall should remain healthy or warning, not crashed
    expect(result.systemMetricsPartial.systemHealth).not.toBe('crashed');
    expect(result.systemMetricsPartial.errorRate).toBeLessThan(0.05);
  });
});
