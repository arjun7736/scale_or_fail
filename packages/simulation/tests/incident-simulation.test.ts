import { describe, it, expect, beforeEach } from 'vitest';
import { calculateDatabaseCapacity, calculateAppServerCapacity } from '../models/capacity';
import { IncidentEngine } from '../failures/incident-engine';
import { routeTrafficThroughGraph } from '../routing/traffic-router';
import { decomposeTraffic } from '../traffic/request-mix';
import {
  ArchitectureGraph,
  ComponentLiveMetrics,
  DatabaseNodeConfig,
  AppServerNodeConfig,
  SystemMetrics,
} from '../core/types';
import { DEFAULT_CONFIGS } from '../models/economics';

describe('Production Incident & Architecture Decision Tests', () => {
  let incidentEngine: IncidentEngine;

  beforeEach(() => {
    incidentEngine = new IncidentEngine();
  });

  const createBaseMetrics = (): SystemMetrics => ({
    tick: 10,
    simTimeSeconds: 10,
    incomingRps: 1000,
    succeededRps: 1000,
    failedRps: 0,
    inFlightRequests: 100,
    avgLatencyMs: 25,
    p95LatencyMs: 40,
    errorRate: 0,
    slaUptimePercent: 100,
    budgetRemaining: 1000,
    operatingCostPerHour: 0.5,
    totalCostIncurred: 1,
    revenueEarned: 20,
    systemHealth: 'healthy',
    stage: 2,
    stageName: 'Growth',
    oneMillionMilestoneReached: false,
    consecutiveFailureSeconds: 0,
    activeClientConnections: 100,
    dbQueriesTotalRps: 950,
    cacheHitsTotalRps: 0,
    queueMessagesTotalRps: 0,
  });

  describe('Test 1: Database Connection Pool Exhaustion & PgBouncer Recovery', () => {
    it('should trigger connection starvation when client worker threads exceed max_connections without pooling', () => {
      const dbConfig: DatabaseNodeConfig = {
        ...DEFAULT_CONFIGS.database(),
        maxConnections: 100,
        connectionPooling: false,
        clientConnectionPool: {
          minConnections: 10,
          maxConnections: 100,
          connectionTimeoutMs: 50,
        },
      };

      // 250 concurrent worker threads attempting to query unpooled database
      const threads = 250;
      const readsRps = 1500;
      const writesRps = 300;

      const unpooledResult = calculateDatabaseCapacity(dbConfig, readsRps, writesRps, threads);

      expect(unpooledResult.connectionsActive).toBe(100);
      expect(unpooledResult.isConnectionExhausted).toBe(true);
      expect(unpooledResult.connectionWaitQueue).toBe(60);
      expect(unpooledResult.connectionTimeoutDrops).toBeGreaterThan(0);
      expect(unpooledResult.effectiveConnectionWaitMs).toBeGreaterThan(0);

      // Verify IncidentEngine detects this failure
      const graph: ArchitectureGraph = {
        nodes: [
          { id: 'db-1', type: 'database', label: 'PostgreSQL Primary', config: dbConfig },
        ],
        edges: [],
      };

      const compMetrics: Record<string, ComponentLiveMetrics> = {
        'db-1': {
          nodeId: 'db-1',
          type: 'database',
          health: 'critical',
          cpuUtilization: 70,
          ramUtilization: 50,
          connectionsActive: unpooledResult.connectionsActive,
          connectionsMax: unpooledResult.connectionsMax,
          queueDepth: unpooledResult.connectionWaitQueue,
          throughputInRps: readsRps + writesRps,
          throughputOutRps: readsRps + writesRps - unpooledResult.connectionTimeoutDrops,
          droppedRps: unpooledResult.connectionTimeoutDrops,
          avgLatencyMs: 2500,
          p95LatencyMs: 3200,
          errorRate: 0.35,
          costPerHour: 0.06,
        },
      };

      const eval1 = incidentEngine.evaluateTick(1, 1, graph, createBaseMetrics(), compMetrics);
      expect(eval1.currentIncident).not.toBeNull();
      expect(eval1.currentIncident?.id).toBe('db_connection_exhaustion');
      expect(eval1.currentIncident?.structuredLogs.length).toBeGreaterThan(0);
      expect(eval1.currentIncident?.structuredLogs.some((l) => l.message.includes('FATAL'))).toBe(true);

      // RECOVERY: Enable PgBouncer Connection Pooling
      const pooledConfig: DatabaseNodeConfig = {
        ...dbConfig,
        connectionPooling: true,
      };

      const pooledResult = calculateDatabaseCapacity(pooledConfig, readsRps, writesRps, threads);
      expect(pooledResult.isConnectionExhausted).toBe(false);
      expect(pooledResult.connectionWaitQueue).toBe(0);
      expect(pooledResult.connectionTimeoutDrops).toBe(0);
      expect(pooledResult.effectiveConnectionWaitMs).toBeLessThanOrEqual(5);

      // Update graph and metrics with pooling enabled
      const recoveredGraph: ArchitectureGraph = {
        nodes: [
          { id: 'db-1', type: 'database', label: 'PostgreSQL Primary', config: pooledConfig },
        ],
        edges: [],
      };

      compMetrics['db-1'].health = 'healthy';
      compMetrics['db-1'].droppedRps = 0;
      compMetrics['db-1'].queueDepth = 0;
      compMetrics['db-1'].connectionsActive = pooledResult.connectionsActive;

      const eval2 = incidentEngine.evaluateTick(2, 2, recoveredGraph, createBaseMetrics(), compMetrics);
      expect(eval2.justResolved).not.toBeNull();
      expect(eval2.justResolved?.id).toBe('db_connection_exhaustion');
      expect(eval2.justResolved?.isResolved).toBe(true);
      expect(eval2.currentIncident).toBeNull();
    });
  });

  describe('Test 2: Docker Container OOMKill & Pod Scaling Recovery', () => {
    it('should trigger OOMKill when in-flight request heap exceeds container memory limit and recover via scaling', () => {
      const serverConfig: AppServerNodeConfig = {
        ...DEFAULT_CONFIGS.app_server(),
        containerRuntime: 'docker',
        dockerConfig: {
          cpuLimitCores: 1,
          ramLimitMb: 512, // Constrained 512MB container limit
          restartPolicy: 'on_failure',
        },
      };

      // In-flight concurrency with downstream query latency
      const rps = 1500;
      const downstreamLatencyMs = 250;

      const oomResult = calculateAppServerCapacity(serverConfig, rps, downstreamLatencyMs);
      expect(oomResult.isOom).toBe(true);

      // Test incident engine detection
      const graph: ArchitectureGraph = {
        nodes: [
          { id: 'app-1', type: 'app_server', label: 'App Server (Docker)', config: serverConfig },
        ],
        edges: [],
      };

      const compMetrics: Record<string, ComponentLiveMetrics> = {
        'app-1': {
          nodeId: 'app-1',
          type: 'app_server',
          health: 'failed',
          isOom: true,
          oomKilledCount: 1,
          cpuUtilization: 90,
          ramUtilization: 100,
          connectionsActive: 400,
          connectionsMax: 200,
          queueDepth: 200,
          throughputInRps: 800,
          throughputOutRps: 200,
          droppedRps: 600,
          avgLatencyMs: 3000,
          p95LatencyMs: 4000,
          errorRate: 0.75,
          costPerHour: 0.04,
        },
      };

      const eval1 = incidentEngine.evaluateTick(1, 1, graph, createBaseMetrics(), compMetrics);
      expect(eval1.currentIncident).not.toBeNull();
      expect(eval1.currentIncident?.id).toBe('k8s_container_oomkill');
      expect(
        eval1.currentIncident?.structuredLogs.some((l) => l.message.includes('cgroup') || l.message.includes('137'))
      ).toBe(true);

      // RECOVERY: Scale up container RAM limit or scale Kubernetes Pod replicas
      const scaledConfig: AppServerNodeConfig = {
        ...serverConfig,
        containerRuntime: 'kubernetes',
        k8sConfig: {
          replicas: 4,
          minReplicas: 2,
          maxReplicas: 8,
          targetCpuUtilization: 75,
          readinessProbeDelaySeconds: 5,
          isAutoscalingEnabled: true,
        },
        dockerConfig: {
          cpuLimitCores: 2,
          ramLimitMb: 2048,
          restartPolicy: 'always',
        },
      };

      const scaledResult = calculateAppServerCapacity(scaledConfig, rps, 20);
      expect(scaledResult.isOom).toBe(false);
      expect(scaledResult.activePods).toBe(4);

      // Verify recovery in IncidentEngine
      const recoveredGraph: ArchitectureGraph = {
        nodes: [
          { id: 'app-1', type: 'app_server', label: 'App Server (K8s)', config: scaledConfig },
        ],
        edges: [],
      };

      compMetrics['app-1'].health = 'healthy';
      compMetrics['app-1'].isOom = false;
      compMetrics['app-1'].oomKilledCount = 0;
      compMetrics['app-1'].droppedRps = 0;
      compMetrics['app-1'].errorRate = 0;

      const eval2 = incidentEngine.evaluateTick(2, 2, recoveredGraph, createBaseMetrics(), compMetrics);
      expect(eval2.justResolved).not.toBeNull();
      expect(eval2.justResolved?.id).toBe('k8s_container_oomkill');
      expect(eval2.justResolved?.isResolved).toBe(true);
      expect(eval2.currentIncident).toBeNull();
    });
  });

  describe('Test 3: Request Accounting & Conservation of Flow', () => {
    it('should accurately track client connections, DB query volume, and cache hits with flow conservation', () => {
      const graph: ArchitectureGraph = {
        nodes: [
          { id: 'client-1', type: 'client', label: 'Client', config: DEFAULT_CONFIGS.client() },
          { id: 'lb-1', type: 'load_balancer', label: 'Load Balancer', config: DEFAULT_CONFIGS.load_balancer() },
          { id: 'app-1', type: 'app_server', label: 'App Server', config: DEFAULT_CONFIGS.app_server() },
          { id: 'redis-1', type: 'redis_cache', label: 'Redis Cache', config: DEFAULT_CONFIGS.redis_cache() },
          { id: 'db-1', type: 'database', label: 'PostgreSQL Primary', config: DEFAULT_CONFIGS.database() },
        ],
        edges: [
          { id: 'e1', source: 'client-1', target: 'lb-1', edgeType: 'http_traffic' },
          { id: 'e2', source: 'lb-1', target: 'app-1', edgeType: 'http_traffic' },
          { id: 'e3', source: 'app-1', target: 'redis-1', edgeType: 'cache_access' },
          { id: 'e4', source: 'app-1', target: 'db-1', edgeType: 'db_read_write' },
        ],
      };

      const traffic = decomposeTraffic(1000);
      const result = routeTrafficThroughGraph(graph, traffic, 10);

      // 1. External Flow Conservation: Succeeded + Failed = Incoming
      const incoming = result.systemMetricsPartial.incomingRps ?? 0;
      const succeeded = result.systemMetricsPartial.succeededRps ?? 0;
      const failed = result.systemMetricsPartial.failedRps ?? 0;
      expect(incoming).toBe(1000);
      expect(succeeded + failed).toBe(incoming);

      // 2. Active client connections: Must be tracked independently from internal thread counts
      expect(result.systemMetricsPartial.activeClientConnections).toBeDefined();
      expect(result.systemMetricsPartial.activeClientConnections).toBeGreaterThan(0);

      // 3. Downstream operations: Cache offloading reduces DB query pressure
      expect(result.systemMetricsPartial.cacheHitsTotalRps).toBeDefined();
      expect(result.systemMetricsPartial.dbQueriesTotalRps).toBeDefined();

      const redisMetrics = result.componentMetrics['redis-1'];
      const dbMetrics = result.componentMetrics['db-1'];

      expect(redisMetrics).toBeDefined();
      expect(dbMetrics).toBeDefined();

      // Redis absorbs ~85% of read queries; remainder reaches PostgreSQL
      expect(redisMetrics.throughputInRps).toBeGreaterThan(0);
      expect(dbMetrics.throughputInRps).toBeLessThan(redisMetrics.throughputInRps);
    });
  });
});
