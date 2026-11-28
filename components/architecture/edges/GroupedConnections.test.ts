import { describe, expect, it } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import { groupConnections } from './GroupedConnections';

const node = (id: string, type: string, x: number, y: number, role?: string): Node => ({
  id, type, position: { x, y }, measured: { width: 200, height: 100 }, data: { config: { role } },
});

const edge = (source: string, target: string, edgeType: string): Edge => ({
  id: `${source}-${target}-${edgeType}`, source, target, data: { edgeType },
});

describe('groupConnections', () => {
  it('bundles load balancer fan-out and keeps cache and event routes separate', () => {
    const nodes = [
      node('lb', 'load_balancer', 0, 150),
      node('app1', 'app_server', 350, 100),
      node('app2', 'app_server', 350, 250),
      node('cache', 'redis_cache', 750, 250),
      node('kafka', 'kafka_stream', 750, 0),
    ];
    const edges = ['app1', 'app2'].flatMap((app) => [
      edge('lb', app, 'http_traffic'),
      edge(app, 'cache', 'cache_access'),
      edge(app, 'kafka', 'async_message'),
    ]);
    const layout = groupConnections(nodes, edges);

    expect(layout.routes.map((route) => route.type)).toEqual(['http_traffic', 'cache_access', 'async_message']);
    expect(layout.routes.map((route) => route.edges.length)).toEqual([2, 2, 2]);
    expect(layout.hiddenEdgeIds.size).toBe(6);
    expect(layout.routes[2].sourceY).toBeLessThan(layout.routes[1].sourceY);
    expect(edges.every((connection) => connection.hidden === undefined)).toBe(true);
  });

  it('groups replication to read replicas and leaves standalone and unsupported links visible', () => {
    const nodes = [
      node('primary', 'database', 0, 0, 'primary'),
      node('replica1', 'database', 400, 0, 'replica'),
      node('replica2', 'database', 400, 200, 'replica'),
      node('app1', 'app_server', 0, 400),
    ];
    const edges = [
      edge('primary', 'replica1', 'replication'),
      edge('primary', 'replica2', 'replication'),
      edge('app1', 'replica1', 'db_read'),
      edge('replica2', 'replica1', 'unsupported'),
    ];
    const layout = groupConnections(nodes, edges);

    expect(layout.routes.map((route) => route.type)).toEqual(['replication']);
    expect([...layout.hiddenEdgeIds]).toEqual(edges.slice(0, 2).map((connection) => connection.id));
  });
});
