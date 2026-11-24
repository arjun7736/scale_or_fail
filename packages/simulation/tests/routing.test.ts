import { describe, it, expect } from 'vitest';
import { STARTER_ARCHITECTURE } from '../scenarios/starter';
import { validateArchitectureGraph } from '../routing/graph-validator';
import { routeTrafficThroughGraph } from '../routing/traffic-router';
import { decomposeTraffic } from '../traffic/request-mix';
import { DEFAULT_CONFIGS } from '../models/economics';

describe('Traffic Routing & Graph Validation', () => {
  it('should validate valid starter architecture', () => {
    const result = validateArchitectureGraph(STARTER_ARCHITECTURE);
    expect(result.isValid).toBe(true);
    expect(result.canServeTraffic).toBe(true);
    expect(result.issues.length).toBe(0);
  });

  it('should reject invalid connections (e.g. Client directly to Database)', () => {
    const invalidGraph = {
      nodes: [
        { id: 'c1', type: 'client' as const, label: 'Client', config: DEFAULT_CONFIGS.client() },
        { id: 'db1', type: 'database' as const, label: 'DB', config: DEFAULT_CONFIGS.database() },
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
  });
});
