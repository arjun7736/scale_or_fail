import { ArchitectureGraph, ComponentType } from '../core/types';

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  nodeIds?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  canServeTraffic: boolean;
  issues: ValidationIssue[];
}

const ALLOWED_CONNECTIONS: Record<ComponentType, ComponentType[]> = {
  client: ['anycast_edge', 'cdn', 'rate_limiter', 'l4_maglev', 'load_balancer', 'app_server'],
  anycast_edge: ['cdn', 'rate_limiter', 'l4_maglev', 'load_balancer', 'app_server'],
  cdn: ['rate_limiter', 'l4_maglev', 'load_balancer', 'app_server'],
  rate_limiter: ['l4_maglev', 'load_balancer', 'circuit_breaker', 'app_server'],
  l4_maglev: ['load_balancer', 'circuit_breaker', 'app_server'],
  load_balancer: ['circuit_breaker', 'app_server'],
  circuit_breaker: ['load_balancer', 'app_server'],
  app_server: ['database', 'redis_cache', 'message_queue', 'db_sharding', 'kafka_stream', 'distributed_nosql'],
  redis_cache: ['database', 'db_sharding', 'distributed_nosql'],
  message_queue: ['database', 'app_server', 'db_sharding'],
  kafka_stream: ['database', 'app_server', 'db_sharding', 'distributed_nosql'],
  db_sharding: ['database'],
  database: [],
  distributed_nosql: [],
};

export function validateArchitectureGraph(graph: ArchitectureGraph): ValidationResult {
  const issues: ValidationIssue[] = [];
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  // Check client node presence
  const clientNodes = graph.nodes.filter((n) => n.type === 'client');
  if (clientNodes.length === 0) {
    issues.push({
      type: 'error',
      code: 'NO_CLIENT_NODE',
      message: 'No traffic client found in architecture. Add a Client node to receive traffic.',
    });
  }

  // Check app server presence
  const appServers = graph.nodes.filter((n) => n.type === 'app_server');
  if (appServers.length === 0) {
    issues.push({
      type: 'error',
      code: 'NO_APP_SERVERS',
      message: 'No Application Servers found. Traffic has no compute layer to process requests.',
    });
  }

  // Check database presence
  const databases = graph.nodes.filter((n) => n.type === 'database' || n.type === 'distributed_nosql');
  if (databases.length === 0) {
    issues.push({
      type: 'error',
      code: 'NO_DATABASE',
      message: 'No Database or Distributed Storage found. Application cannot persist or read state.',
    });
  }

  // Check edge validity
  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }

  for (const edge of graph.edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode || !targetNode) {
      issues.push({
        type: 'warning',
        code: 'DANGLING_EDGE',
        message: `Edge connects to non-existent node: ${edge.source} -> ${edge.target}`,
      });
      continue;
    }

    // Check connection rules
    const allowedTargets = ALLOWED_CONNECTIONS[sourceNode.type] || [];
    if (!allowedTargets.includes(targetNode.type)) {
      issues.push({
        type: 'error',
        code: 'INVALID_CONNECTION',
        message: `Invalid connection: ${sourceNode.type} cannot connect directly to ${targetNode.type}.`,
        nodeIds: [sourceNode.id, targetNode.id],
      });
    }

    adjacency.get(edge.source)?.push(edge.target);
  }

  // Check reachability from Client to App Servers
  let canReachAppServer = false;
  if (clientNodes.length > 0) {
    const visited = new Set<string>();
    const queue = [clientNodes[0].id];
    visited.add(clientNodes[0].id);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentNode = nodeMap.get(currentId);
      if (currentNode && currentNode.type === 'app_server') {
        canReachAppServer = true;
      }
      const neighbors = adjacency.get(currentId) || [];
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }

    if (!canReachAppServer && appServers.length > 0) {
      issues.push({
        type: 'error',
        code: 'UNREACHABLE_APP_SERVERS',
        message: 'Application servers are not reachable from the Client. Connect Client through Load Balancer or directly.',
      });
    }
  }

  // Check if multiple app servers exist without a load balancer
  if (appServers.length > 1) {
    const loadBalancers = graph.nodes.filter((n) => n.type === 'load_balancer');
    if (loadBalancers.length === 0) {
      issues.push({
        type: 'warning',
        code: 'MULTIPLE_SERVERS_NO_LB',
        message: 'Multiple application servers exist without a Load Balancer. Only directly connected servers will receive traffic.',
      });
    }
  }

  // Check database reachability from App Servers
  for (const server of appServers) {
    const serverNeighbors = adjacency.get(server.id) || [];
    const connectedDbs = serverNeighbors.filter((id) => nodeMap.get(id)?.type === 'database');
    const connectedCaches = serverNeighbors.filter((id) => nodeMap.get(id)?.type === 'redis_cache');

    if (connectedDbs.length === 0 && connectedCaches.length === 0) {
      issues.push({
        type: 'warning',
        code: 'SERVER_DISCONNECTED_FROM_DB',
        message: `App server "${server.label}" is not connected to any Database or Cache.`,
        nodeIds: [server.id],
      });
    }
  }

  const hasFatalErrors = issues.some((i) => i.type === 'error');
  const canServeTraffic = !hasFatalErrors && canReachAppServer;

  return {
    isValid: !hasFatalErrors,
    canServeTraffic,
    issues,
  };
}
