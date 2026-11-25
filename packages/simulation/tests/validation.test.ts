import { describe, it, expect } from 'vitest';
import { STARTER_ARCHITECTURE } from '../scenarios/starter';
import { validateArchitecture, classifyConnection } from '../validation';
import { routeTrafficThroughGraph } from '../routing/traffic-router';
import { decomposeTraffic } from '../traffic/request-mix';
import { DEFAULT_CONFIGS } from '../models/economics';
import { ArchitectureGraph, ArchitectureNode } from '../core/types';

describe('Intelligent Architecture Validation & Educational Feedback System', () => {
  // Scenario 1: Valid client -> LB connection
  it('1. should validate a valid Client -> Load Balancer connection', () => {
    const client: ArchitectureNode = {
      id: 'c1',
      type: 'client',
      label: 'Client',
      config: DEFAULT_CONFIGS.client(),
    };
    const lb: ArchitectureNode = {
      id: 'lb1',
      type: 'load_balancer',
      label: 'ALB',
      config: DEFAULT_CONFIGS.load_balancer(),
    };

    const res = classifyConnection(client, lb);
    expect(res.isValid).toBe(true);
    expect(res.edgeType).toBe('http_traffic');
    expect(res.issue).toBeUndefined();
  });

  // Scenario 2: Valid LB -> App server connection
  it('2. should validate a valid Load Balancer -> App Server connection', () => {
    const lb: ArchitectureNode = {
      id: 'lb1',
      type: 'load_balancer',
      label: 'ALB',
      config: DEFAULT_CONFIGS.load_balancer(),
    };
    const app: ArchitectureNode = {
      id: 'app1',
      type: 'app_server',
      label: 'App',
      config: DEFAULT_CONFIGS.app_server('small'),
    };

    const res = classifyConnection(lb, app);
    expect(res.isValid).toBe(true);
    expect(res.edgeType).toBe('http_traffic');
    expect(res.label).toContain('HTTP');
  });

  // Scenario 3: Valid App -> DB dependency
  it('3. should validate a valid App Server -> Primary Database dependency', () => {
    const app: ArchitectureNode = {
      id: 'app1',
      type: 'app_server',
      label: 'App',
      config: DEFAULT_CONFIGS.app_server('small'),
    };
    const db: ArchitectureNode = {
      id: 'db1',
      type: 'database',
      label: 'Primary DB',
      config: DEFAULT_CONFIGS.database('primary', 'small'),
    };

    const res = classifyConnection(app, db);
    expect(res.isValid).toBe(true);
    expect(res.edgeType).toBe('db_read_write');
  });

  // Scenario 4: Valid App -> Cache relationship
  it('4. should validate a valid App Server -> Redis Cache relationship (Cache Access)', () => {
    const app: ArchitectureNode = {
      id: 'app1',
      type: 'app_server',
      label: 'App',
      config: DEFAULT_CONFIGS.app_server('small'),
    };
    const cache: ArchitectureNode = {
      id: 'cache1',
      type: 'redis_cache',
      label: 'Redis',
      config: DEFAULT_CONFIGS.redis_cache(),
    };

    const res = classifyConnection(app, cache);
    expect(res.isValid).toBe(true);
    expect(res.edgeType).toBe('cache_access');
    expect(res.label).toContain('Cache');
  });

  // Scenario 5: Valid Primary -> Replica replication
  it('5. should validate a valid Primary Database -> Read Replica replication relationship', () => {
    const primaryDb: ArchitectureNode = {
      id: 'db_primary',
      type: 'database',
      label: 'Primary DB',
      config: DEFAULT_CONFIGS.database('primary', 'medium'),
    };
    const readReplica: ArchitectureNode = {
      id: 'db_replica',
      type: 'database',
      label: 'Read Replica',
      config: DEFAULT_CONFIGS.database('replica', 'medium'),
    };

    const res = classifyConnection(primaryDb, readReplica);
    expect(res.isValid).toBe(true);
    expect(res.edgeType).toBe('replication');
    expect(res.label).toContain('Replication');
  });

  // Scenario 6: Unsupported Redis -> Read Replica
  it('6. should detect and reject unsupported Redis -> Read Replica connection with educational feedback', () => {
    const cache: ArchitectureNode = {
      id: 'cache1',
      type: 'redis_cache',
      label: 'Redis',
      config: DEFAULT_CONFIGS.redis_cache(),
    };
    const readReplica: ArchitectureNode = {
      id: 'db_replica',
      type: 'database',
      label: 'Read Replica',
      config: DEFAULT_CONFIGS.database('replica', 'small'),
    };

    const res = classifyConnection(cache, readReplica);
    expect(res.isValid).toBe(false);
    expect(res.edgeType).toBe('unsupported');
    expect(res.issue).toBeDefined();
    expect(res.issue?.title).toContain('Unsupported Cache-to-Read-Replica Connection');
    expect(res.issue?.learningConcept).toContain('Cache-Aside Pattern');
    expect(res.issue?.suggestedApproaches.length).toBeGreaterThan(0);
    expect(res.issue?.consequence).toBeDefined();
  });

  // Scenario 7: LB without application targets
  it('7. should flag an error when a Load Balancer has no backend application targets', () => {
    const danglingLbGraph: ArchitectureGraph = {
      nodes: [
        { id: 'c1', type: 'client', label: 'Client', config: DEFAULT_CONFIGS.client() },
        { id: 'lb1', type: 'load_balancer', label: 'ALB', config: DEFAULT_CONFIGS.load_balancer() },
      ],
      edges: [{ id: 'e1', source: 'c1', target: 'lb1' }],
    };

    const val = validateArchitecture(danglingLbGraph);
    expect(val.isValid).toBe(false);
    const lbIssue = val.issues.find((i) => i.ruleId === 'RULE_LB_NO_TARGETS');
    expect(lbIssue).toBeDefined();
    expect(lbIssue?.severity).toBe('error');
    expect(lbIssue?.message).toContain('no healthy application targets');
  });

  // Scenario 8: DB-dependent endpoint without DB
  it('8. should report error and fail DB-dependent requests when App Server has no reachable DB', () => {
    const noDbGraph: ArchitectureGraph = {
      nodes: [
        { id: 'c1', type: 'client', label: 'Client', config: DEFAULT_CONFIGS.client() },
        { id: 'app1', type: 'app_server', label: 'App', config: DEFAULT_CONFIGS.app_server('small') },
      ],
      edges: [{ id: 'e1', source: 'c1', target: 'app1' }],
    };

    const val = validateArchitecture(noDbGraph);
    expect(val.isValid).toBe(false);
    const dbIssue = val.issues.find((i) => i.ruleId === 'RULE_DISCONNECTED_DATABASE');
    expect(dbIssue).toBeDefined();
    expect(dbIssue?.severity).toBe('error');

    // In simulation router: DB-dependent requests must fail while app is reachable
    const traffic = decomposeTraffic(100);
    const routeRes = routeTrafficThroughGraph(noDbGraph, traffic, 10);
    expect(routeRes.componentMetrics['app1'].statusMessage).toContain('cannot complete database-dependent requests');
  });

  // Scenario 9: Single-server reliability warning
  it('9. should produce a reliability risk warning for single application server without redundancy', () => {
    // Stage 2 single server graph
    const val = validateArchitecture(STARTER_ARCHITECTURE, undefined, 100, 'intermediate', 2);
    const spofIssue = val.issues.find((i) => i.ruleId === 'RULE_SINGLE_POINT_OF_FAILURE_APP');
    expect(spofIssue).toBeDefined();
    expect(spofIssue?.category).toBe('reliability_risk');
    expect(spofIssue?.severity).toBe('warning');
    expect(spofIssue?.learningConcept).toContain('Single Point of Failure');
  });

  // Scenario 10: High DB utilization warning
  it('10. should warn when Database connection pool is near saturation', () => {
    const liveMetrics = {
      'db-primary': {
        nodeId: 'db-primary',
        type: 'database' as const,
        health: 'warning' as const,
        cpuUtilization: 85,
        ramUtilization: 60,
        connectionsActive: 88,
        connectionsMax: 100, // 88% saturated
        queueDepth: 5,
        throughputInRps: 500,
        throughputOutRps: 500,
        droppedRps: 0,
        avgLatencyMs: 45,
        p95LatencyMs: 90,
        errorRate: 0,
        costPerHour: 0.15,
        statusMessage: 'Busy',
      },
    };

    const val = validateArchitecture(STARTER_ARCHITECTURE, liveMetrics, 500, 'intermediate', 2);
    const connIssue = val.issues.find((i) => i.ruleId === 'RULE_HIGH_DB_CONNECTIONS');
    expect(connIssue).toBeDefined();
    expect(connIssue?.severity).toBe('warning');
    expect(connIssue?.message).toContain('connection utilization is at 88%');
  });

  // Scenario 11: Healthy low-traffic architecture without unnecessary errors
  it('11. should validate a healthy low-traffic starter architecture with 0 errors and high grade', () => {
    const val = validateArchitecture(STARTER_ARCHITECTURE, undefined, 50, 'beginner', 1);
    expect(val.isValid).toBe(true);
    expect(val.canServeTraffic).toBe(true);
    const fatalErrors = val.issues.filter((i) => i.severity === 'error');
    expect(fatalErrors.length).toBe(0);
    expect(val.assessment.overallScore).toBeGreaterThanOrEqual(80);
    expect(['A+', 'A', 'B']).toContain(val.assessment.letterGrade);
  });

  // Scenario 12: Cache failure and DB fallback
  it('12. should model cache absorbing reads and database fallback gracefully', () => {
    const cachedGraph: ArchitectureGraph = {
      nodes: [
        ...STARTER_ARCHITECTURE.nodes,
        { id: 'redis1', type: 'redis_cache', label: 'Redis Cache', config: DEFAULT_CONFIGS.redis_cache() },
      ],
      edges: [
        ...STARTER_ARCHITECTURE.edges,
        { id: 'e-app-redis', source: 'app-1', target: 'redis1' },
      ],
    };

    const traffic = decomposeTraffic(200);
    const routeRes = routeTrafficThroughGraph(cachedGraph, traffic, 10);

    // Redis cache absorbs reads
    expect(routeRes.componentMetrics['redis1'].throughputInRps).toBeGreaterThan(100);
    // Uncached writes (20%) and cache misses fall back to primary DB
    expect(routeRes.componentMetrics['db-primary'].throughputInRps).toBeGreaterThan(0);
    expect(routeRes.componentMetrics['db-primary'].throughputInRps).toBeLessThan(traffic.totalRps);
  });

  // Scenario 13: Node deletion creating broken dependency
  it('13. should detect dangling edges and broken dependencies when a node is deleted', () => {
    const brokenGraph: ArchitectureGraph = {
      nodes: [
        { id: 'c1', type: 'client', label: 'Client', config: DEFAULT_CONFIGS.client() },
        // app-1 deleted!
        { id: 'db1', type: 'database', label: 'DB', config: DEFAULT_CONFIGS.database() },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'app-deleted' },
        { id: 'e2', source: 'app-deleted', target: 'db1' },
      ],
    };

    const val = validateArchitecture(brokenGraph);
    expect(val.isValid).toBe(false);
    const danglingIssue = val.issues.find((i) => i.ruleId === 'RULE_DANGLING_EDGE');
    expect(danglingIssue).toBeDefined();
    expect(danglingIssue?.severity).toBe('error');
  });

  // Scenario 14: Correct handling of routing cycles / unsupported graph loops
  it('14. should detect routing cycles in call graphs and exclude cyclical deadlock without crashing', () => {
    const cyclicGraph: ArchitectureGraph = {
      nodes: [
        { id: 'c1', type: 'client', label: 'Client', config: DEFAULT_CONFIGS.client() },
        { id: 'app1', type: 'app_server', label: 'App 1', config: DEFAULT_CONFIGS.app_server('small') },
        { id: 'app2', type: 'app_server', label: 'App 2', config: DEFAULT_CONFIGS.app_server('small') },
        { id: 'db1', type: 'database', label: 'DB', config: DEFAULT_CONFIGS.database() },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'app1' },
        { id: 'e2', source: 'app1', target: 'app2' },
        { id: 'e3', source: 'app2', target: 'app1' }, // Cycle between app1 and app2!
        { id: 'e4', source: 'app1', target: 'db1' },
      ],
    };

    const val = validateArchitecture(cyclicGraph);
    expect(val.isValid).toBe(false);
    const cycleIssue = val.issues.find((i) => i.ruleId === 'RULE_ROUTING_CYCLE');
    expect(cycleIssue).toBeDefined();
    expect(cycleIssue?.severity).toBe('error');
    expect(cycleIssue?.learningConcept).toContain('Directed Acyclic Graph');
  });

  // Scenario 15: Preservation of existing simulation behavior after validation integration
  it('15. should preserve existing simulation throughput and latency on standard architecture', () => {
    const traffic = decomposeTraffic(50);
    const routeRes = routeTrafficThroughGraph(STARTER_ARCHITECTURE, traffic, 30);

    expect(routeRes.isTotalBlackout).toBe(false);
    expect(routeRes.systemMetricsPartial.succeededRps).toBeGreaterThan(40);
    expect(routeRes.systemMetricsPartial.avgLatencyMs).toBeLessThan(100);
    expect(routeRes.componentMetrics['app-1'].health).toBe('healthy');
    expect(routeRes.componentMetrics['db-primary'].health).toBe('healthy');
  });
});
