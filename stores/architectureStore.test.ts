import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIGS } from '../packages/simulation/models/economics';
import { useArchitectureStore } from './architectureStore';

const store = useArchitectureStore.getState;
const linksFor = (id: string) => store().getArchitectureGraph().edges
  .filter(({ source, target }) => source === id || target === id)
  .map(({ source, target, edgeType }) => [source, target, edgeType]);

beforeEach(() => store().resetToStarter());

describe('adding architecture group members', () => {
  it('copies incoming and outgoing app routes once and skips invalid links', () => {
    const graph = store().getArchitectureGraph();
    graph.edges.push({ id: 'invalid', source: 'app-1', target: 'client-1', edgeType: 'unsupported' });
    store().setGraph(graph);

    const second = store().addNode('app_server')!;
    const third = store().addNode('app_server')!;

    for (const app of [second, third]) {
      expect(linksFor(app.id)).toEqual([
        ['client-1', app.id, 'http_traffic'],
        [app.id, 'db-primary', 'db_read_write'],
      ]);
    }
  });

  it('inherits replica read routes and WAL from peers through either replica entry point', () => {
    const graph = store().getArchitectureGraph();
    graph.nodes.push({
      id: 'replica-1',
      type: 'database',
      label: 'Read Replica',
      config: DEFAULT_CONFIGS.database('replica'),
    });
    graph.edges = [
      { id: 'wal', source: 'db-primary', target: 'replica-1', edgeType: 'replication' },
      { id: 'read', source: 'app-1', target: 'replica-1', edgeType: 'db_read' },
    ];
    store().setGraph(graph);

    const second = store().addNode('database', { x: 800, y: 300 }, 'db_replica')!;
    const third = store().addReadReplica('db-primary')!;

    for (const replica of [second, third]) {
      expect(linksFor(replica.id)).toEqual([
        ['db-primary', replica.id, 'replication'],
        ['app-1', replica.id, 'db_read'],
      ]);
    }
  });

  it('connects the first replica to the primary and its app readers', () => {
    const replica = store().addNode('database')!;

    expect(linksFor(replica.id)).toEqual([
      ['db-primary', replica.id, 'replication'],
      ['app-1', replica.id, 'db_read'],
    ]);
  });
});
