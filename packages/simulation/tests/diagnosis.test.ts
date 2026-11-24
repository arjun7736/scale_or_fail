import { describe, it, expect } from 'vitest';
import { diagnoseServerIncident } from '../failures/diagnosis';
import { STARTER_ARCHITECTURE } from '../scenarios/starter';
import { ArchitectureGraph, ComponentLiveMetrics, SystemMetrics } from '../core/types';
import { DEFAULT_CONFIGS } from '../models/economics';

describe('Server Incident Diagnosis Engine', () => {
  const dummySystemMetrics: SystemMetrics = {
    tick: 50,
    simTimeSeconds: 50,
    incomingRps: 500,
    succeededRps: 500,
    failedRps: 0,
    inFlightRequests: 50,
    avgLatencyMs: 30,
    p95LatencyMs: 45,
    errorRate: 0,
    slaUptimePercent: 100,
    budgetRemaining: 400,
    operatingCostPerHour: 0.15,
    totalCostIncurred: 2,
    revenueEarned: 10,
    systemHealth: 'healthy',
    stage: 2,
    stageName: 'Growth',
    oneMillionMilestoneReached: false,
    consecutiveFailureSeconds: 0,
  };

  it('should return null when all servers are healthy', () => {
    const componentMetrics: Record<string, ComponentLiveMetrics> = {
      'app-1': {
        nodeId: 'app-1',
        type: 'app_server',
        health: 'healthy',
        cpuUtilization: 35,
        ramUtilization: 40,
        connectionsActive: 10,
        connectionsMax: 200,
        queueDepth: 0,
        throughputInRps: 50,
        throughputOutRps: 50,
        droppedRps: 0,
        avgLatencyMs: 20,
        p95LatencyMs: 25,
        errorRate: 0,
        costPerHour: 0.04,
      },
    };

    const incident = diagnoseServerIncident(STARTER_ARCHITECTURE, componentMetrics, dummySystemMetrics);
    expect(incident).toBeNull();
  });

  it('should diagnose an OOM crash and provide exact error and actionable fix', () => {
    const componentMetrics: Record<string, ComponentLiveMetrics> = {
      'app-1': {
        nodeId: 'app-1',
        type: 'app_server',
        health: 'failed',
        isOom: true,
        cpuUtilization: 95,
        ramUtilization: 100,
        connectionsActive: 200,
        connectionsMax: 200,
        queueDepth: 1500,
        throughputInRps: 2000,
        throughputOutRps: 200,
        droppedRps: 1800,
        avgLatencyMs: 2800,
        p95LatencyMs: 3200,
        errorRate: 0.9,
        costPerHour: 0.04,
      },
    };

    const incident = diagnoseServerIncident(STARTER_ARCHITECTURE, componentMetrics, dummySystemMetrics);
    expect(incident).not.toBeNull();
    expect(incident?.severity).toBe('critical');
    expect(incident?.rootCauseCategory).toBe('oom');
    expect(incident?.exactError).toContain('OOM Killer');
    expect(incident?.actionableSteps.length).toBeGreaterThan(0);
    expect(incident?.actionableSteps[0]).toContain('upgrade');
  });

  it('should diagnose Database Connection Pool Exhaustion and advise connection pooling', () => {
    const componentMetrics: Record<string, ComponentLiveMetrics> = {
      'app-1': {
        nodeId: 'app-1',
        type: 'app_server',
        health: 'critical',
        cpuUtilization: 40,
        ramUtilization: 50,
        connectionsActive: 200,
        connectionsMax: 200,
        queueDepth: 500,
        throughputInRps: 1500,
        throughputOutRps: 200,
        droppedRps: 1300,
        avgLatencyMs: 2500,
        p95LatencyMs: 3100,
        errorRate: 0.85,
        costPerHour: 0.04,
      },
      'db-primary': {
        nodeId: 'db-primary',
        type: 'database',
        health: 'critical',
        cpuUtilization: 60,
        ramUtilization: 40,
        connectionsActive: 100,
        connectionsMax: 100,
        queueDepth: 350,
        throughputInRps: 1500,
        throughputOutRps: 200,
        droppedRps: 1300,
        avgLatencyMs: 1500,
        p95LatencyMs: 2000,
        errorRate: 0.85,
        costPerHour: 0.06,
      },
    };

    const incident = diagnoseServerIncident(STARTER_ARCHITECTURE, componentMetrics, dummySystemMetrics);
    expect(incident).not.toBeNull();
    expect(incident?.rootCauseCategory).toBe('db_connection_starvation');
    expect(incident?.exactError).toContain('PostgreSQL connections');
    expect(incident?.actionableSteps.some((s) => s.includes('PgBouncer') || s.includes('Redis'))).toBe(true);
  });

  it('should diagnose a server disconnected from all databases and caches', () => {
    const disconnectedGraph: ArchitectureGraph = {
      nodes: [
        { id: 'client-1', type: 'client', label: 'Client', config: DEFAULT_CONFIGS.client() },
        { id: 'app-1', type: 'app_server', label: 'App Server 1', config: DEFAULT_CONFIGS.app_server() },
        { id: 'db-1', type: 'database', label: 'DB', config: DEFAULT_CONFIGS.database() },
      ],
      edges: [
        { id: 'e1', source: 'client-1', target: 'app-1' },
        // No edge from app-1 to db-1!
      ],
    };

    const componentMetrics: Record<string, ComponentLiveMetrics> = {
      'app-1': {
        nodeId: 'app-1',
        type: 'app_server',
        health: 'critical',
        cpuUtilization: 10,
        ramUtilization: 15,
        connectionsActive: 0,
        connectionsMax: 200,
        queueDepth: 0,
        throughputInRps: 100,
        throughputOutRps: 0,
        droppedRps: 100,
        avgLatencyMs: 10,
        p95LatencyMs: 15,
        errorRate: 1.0,
        costPerHour: 0.04,
      },
    };

    const incident = diagnoseServerIncident(disconnectedGraph, componentMetrics, dummySystemMetrics);
    expect(incident).not.toBeNull();
    expect(incident?.rootCauseCategory).toBe('unconnected_storage');
    expect(incident?.exactError).toContain('HTTP 500 Internal Server Error');
    expect(incident?.actionableSteps[0]).toContain('Draw an edge connection');
  });
});
