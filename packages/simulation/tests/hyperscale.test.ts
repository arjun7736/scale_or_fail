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
});
