import { describe, it, expect } from 'vitest';
import { STARTER_ARCHITECTURE } from '../scenarios/starter';
import { checkComponentLimit, getComponentCount, COMPONENT_LIMIT_RULES } from '../models/limits';
import { validateArchitectureGraph } from '../routing/graph-validator';
import { ArchitectureGraph } from '../core/types';
import { DEFAULT_CONFIGS } from '../models/economics';

describe('Singleton & Component Limits System Design Rules', () => {
  it('correctly identifies that primary database is limited to 1 instance', () => {
    // Starter architecture has 1 primary DB
    const checkPrimary = checkComponentLimit(STARTER_ARCHITECTURE.nodes, 'database', 'database');
    expect(checkPrimary.currentCount).toBe(1);
    expect(checkPrimary.maxCount).toBe(1);
    expect(checkPrimary.allowed).toBe(false);
    expect(checkPrimary.reason).toContain('Primary ACID database');
  });

  it('allows adding Read Replicas even when primary database is present', () => {
    // Read Replicas are distinct from primary DB and can be scaled
    const checkReplica = checkComponentLimit(STARTER_ARCHITECTURE.nodes, 'db_replica', 'database');
    expect(checkReplica.currentCount).toBe(0);
    expect(checkReplica.allowed).toBe(true);
  });

  it('restricts singleton components once 1 is deployed in topology', () => {
    const singletons = [
      'load_balancer',
      'redis_cache',
      'cdn',
      'rate_limiter',
      'message_queue',
      'db_sharding',
      'kafka_stream',
      'anycast_edge',
      'circuit_breaker',
      'l4_maglev',
      'distributed_nosql',
    ] as const;

    for (const type of singletons) {
      // Empty topology: should be allowed
      const checkBefore = checkComponentLimit([], type, type);
      expect(checkBefore.allowed).toBe(true);
      expect(checkBefore.maxCount).toBe(1);

      // Once 1 is deployed: should be blocked
      const nodesWithOne = [{ type, config: {}, data: {} }];
      const checkAfter = checkComponentLimit(nodesWithOne as any, type, type);
      expect(checkAfter.allowed).toBe(false);
      expect(checkAfter.currentCount).toBe(1);
      expect(checkAfter.reason).toBeDefined();
    }
  });

  it('permits horizontal scaling for stateless application servers', () => {
    // App server should allow multiple instances
    const nodes = [
      { type: 'app_server' as const, config: {}, data: {} },
      { type: 'app_server' as const, config: {}, data: {} },
      { type: 'app_server' as const, config: {}, data: {} },
    ];
    const check = checkComponentLimit(nodes as any, 'app_server', 'app_server');
    expect(check.currentCount).toBe(3);
    expect(check.allowed).toBe(true);
  });

  it('flags validation warning when duplicate singletons are detected in graph', () => {
    const invalidGraph: ArchitectureGraph = {
      nodes: [
        { id: 'client-1', type: 'client', label: 'Client', config: DEFAULT_CONFIGS.client() },
        { id: 'lb-1', type: 'load_balancer', label: 'LB 1', config: DEFAULT_CONFIGS.load_balancer() },
        { id: 'lb-2', type: 'load_balancer', label: 'LB 2', config: DEFAULT_CONFIGS.load_balancer() }, // Duplicate LB!
        { id: 'app-1', type: 'app_server', label: 'App', config: DEFAULT_CONFIGS.app_server('small') },
        { id: 'db-1', type: 'database', label: 'DB', config: DEFAULT_CONFIGS.database('primary', 'small') },
      ],
      edges: [
        { id: 'e1', source: 'client-1', target: 'lb-1' },
        { id: 'e2', source: 'lb-1', target: 'app-1' },
        { id: 'e3', source: 'app-1', target: 'db-1' },
      ],
    };

    const validation = validateArchitectureGraph(invalidGraph);
    const singletonIssue = validation.issues.find((i) => i.code === 'DUPLICATE_SINGLETON');
    expect(singletonIssue).toBeDefined();
    expect(singletonIssue?.message).toContain('load balancer');
  });

  it('flags validation error when multiple primary databases are detected in graph', () => {
    const multiPrimaryGraph: ArchitectureGraph = {
      nodes: [
        { id: 'client-1', type: 'client', label: 'Client', config: DEFAULT_CONFIGS.client() },
        { id: 'app-1', type: 'app_server', label: 'App', config: DEFAULT_CONFIGS.app_server('small') },
        { id: 'db-primary-1', type: 'database', label: 'DB 1', config: DEFAULT_CONFIGS.database('primary', 'small') },
        { id: 'db-primary-2', type: 'database', label: 'DB 2', config: DEFAULT_CONFIGS.database('primary', 'small') }, // Split brain!
      ],
      edges: [
        { id: 'e1', source: 'client-1', target: 'app-1' },
        { id: 'e2', source: 'app-1', target: 'db-primary-1' },
      ],
    };

    const validation = validateArchitectureGraph(multiPrimaryGraph);
    const dbIssue = validation.issues.find((i) => i.code === 'MULTIPLE_PRIMARY_DATABASES');
    expect(dbIssue).toBeDefined();
    expect(dbIssue?.type).toBe('error');
  });
});
