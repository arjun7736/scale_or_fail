import { describe, it, expect } from 'vitest';
import { STARTER_ARCHITECTURE } from '../scenarios/starter';
import { validateArchitectureGraph } from '../routing/graph-validator';
import { routeTrafficThroughGraph } from '../routing/traffic-router';
import { decomposeTraffic } from '../traffic/request-mix';
import { DEFAULT_CONFIGS } from '../models/economics';
import { ArchitectureGraph } from '../core/types';

describe('Traffic Routing & Graph Validation', () => {
  it('should validate valid starter architecture', () => {
    const result = validateArchitectureGraph(STARTER_ARCHITECTURE);
    expect(result.isValid).toBe(true);
    expect(result.canServeTraffic).toBe(true);
    expect(result.issues.length).toBe(0);
  });

  it('should reject invalid connections (e.g. Client directly to Database)', () => {
    const invalidGraph: ArchitectureGraph = {
      nodes: [
        { id: 'c1', type: 'client', label: 'Client', config: DEFAULT_CONFIGS.client() },
        { id: 'db1', type: 'database', label: 'DB', config: DEFAULT_CONFIGS.database() },
      ],
      edges: [{ id: 'e1', source: 'c1', target: 'db1' }],
    };

    const result = validateArchitectureGraph(invalidGraph);
    expect(result.isValid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_CONNECTION')).toBe(true);
  });

  it('should route traffic through starter architecture and track component metrics', () => {
    const traffic = decomposeTraffic(50);
    const result = routeTrafficThroughGraph(STARTER_ARCHITECTURE, traffic, 10);

    expect(result.isTotalBlackout).toBe(false);
    expect(result.systemMetricsPartial.succeededRps).toBeGreaterThan(0);
    expect(result.componentMetrics['app-1']).toBeDefined();
    expect(result.componentMetrics['db-primary']).toBeDefined();
    expect(result.edgeMetrics).toBeDefined();
  });

  it('should NOT route traffic to disconnected Redis Cache on the canvas', () => {
    const graphWithDisconnectedCache: ArchitectureGraph = {
      nodes: [
        ...STARTER_ARCHITECTURE.nodes,
        { id: 'redis-idle', type: 'redis_cache', label: 'Unconnected Redis', config: DEFAULT_CONFIGS.redis_cache() },
      ],
      edges: [...STARTER_ARCHITECTURE.edges], // No edge from app-1 to redis-idle!
    };

    const traffic = decomposeTraffic(200);
    const result = routeTrafficThroughGraph(graphWithDisconnectedCache, traffic, 10);

    // Disconnected cache must receive 0 RPS!
    expect(result.componentMetrics['redis-idle'].throughputInRps).toBe(0);
    expect(result.componentMetrics['redis-idle'].statusMessage).toContain('Idle / Disconnected');
    // Primary DB must still receive 100% of the read demand
    expect(result.componentMetrics['db-primary'].throughputInRps).toBeGreaterThan(0);
  });

  it('should route reads through Redis Cache when properly connected', () => {
    const graphWithConnectedCache: ArchitectureGraph = {
      nodes: [
        ...STARTER_ARCHITECTURE.nodes,
        { id: 'redis-active', type: 'redis_cache', label: 'Connected Redis', config: DEFAULT_CONFIGS.redis_cache() },
      ],
      edges: [
        ...STARTER_ARCHITECTURE.edges,
        { id: 'edge-app-to-redis', source: 'app-1', target: 'redis-active' },
        { id: 'edge-redis-to-db', source: 'redis-active', target: 'db-primary' },
      ],
    };

    const traffic = decomposeTraffic(200);
    const result = routeTrafficThroughGraph(graphWithConnectedCache, traffic, 10);

    // Connected cache should absorb reads
    expect(result.componentMetrics['redis-active'].throughputInRps).toBeGreaterThan(100);
    expect(result.componentMetrics['redis-active'].cacheHitRps).toBeGreaterThan(80);
    expect(result.componentMetrics['redis-active'].statusMessage).toContain('Hit rate');
  });

  it('should failover traffic away from crashed/offline app server in Load Balancer', () => {
    const haGraph: ArchitectureGraph = {
      nodes: [
        { id: 'client-1', type: 'client', label: 'Client', config: DEFAULT_CONFIGS.client() },
        { id: 'lb-1', type: 'load_balancer', label: 'ALB', config: DEFAULT_CONFIGS.load_balancer() },
        { id: 'app-1', type: 'app_server', label: 'App 1', config: DEFAULT_CONFIGS.app_server('large') },
        { id: 'app-2', type: 'app_server', label: 'App 2', config: DEFAULT_CONFIGS.app_server('large') },
        { id: 'db-1', type: 'database', label: 'Primary DB', config: DEFAULT_CONFIGS.database('primary', 'large') },
      ],
      edges: [
        { id: 'e-c-lb', source: 'client-1', target: 'lb-1' },
        { id: 'e-lb-a1', source: 'lb-1', target: 'app-1' },
        { id: 'e-lb-a2', source: 'lb-1', target: 'app-2' },
        { id: 'e-a1-db', source: 'app-1', target: 'db-1' },
        { id: 'e-a2-db', source: 'app-2', target: 'db-1' },
      ],
    };

    const traffic = decomposeTraffic(1000);

    // Simulate app-1 being crashed/failed in previous tick
    const previousMetrics: any = {
      'app-1': { health: 'failed', isOom: true },
      'app-2': { health: 'healthy' },
    };

    const result = routeTrafficThroughGraph(haGraph, traffic, 20, previousMetrics);

    // LB should notice app-1 is failed and route all 1000 RPS to healthy app-2!
    expect(result.componentMetrics['app-2'].throughputInRps).toBe(1000);
    expect(result.componentMetrics['app-1'].throughputInRps).toBe(0);
    expect(result.componentMetrics['lb-1'].statusMessage).toContain('Failing over');
  });
});
