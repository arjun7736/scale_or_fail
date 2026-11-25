import { ArchitectureGraph, ComponentType } from '../core/types';

export interface ComponentLimitRule {
  id: string;
  type: ComponentType;
  maxCount: number;
  isMultiInstanceAllowed: boolean;
  name: string;
  reason: string;
}

export const COMPONENT_LIMIT_RULES: Record<string, ComponentLimitRule> = {
  app_server: {
    id: 'app_server',
    type: 'app_server',
    maxCount: Infinity,
    isMultiInstanceAllowed: true,
    name: 'Application Server',
    reason: 'Stateless application servers can be horizontally scaled behind a load balancer to increase compute throughput.',
  },
  db_replica: {
    id: 'db_replica',
    type: 'database',
    maxCount: 8,
    isMultiInstanceAllowed: true,
    name: 'Read Replica DB',
    reason: 'Read replicas can be scaled horizontally to offload read queries from the primary write master.',
  },
  database: {
    id: 'database',
    type: 'database',
    maxCount: 1,
    isMultiInstanceAllowed: false,
    name: 'PostgreSQL Primary DB',
    reason: 'In relational system design, only 1 Primary ACID database (Write Master) is allowed to prevent split-brain write conflicts. Use Read Replicas to scale read capacity.',
  },
  load_balancer: {
    id: 'load_balancer',
    type: 'load_balancer',
    maxCount: 1,
    isMultiInstanceAllowed: false,
    name: 'Layer 7 Load Balancer',
    reason: 'Only 1 L7 Load Balancer ingress tier is used to distribute traffic across the backend application pool.',
  },
  redis_cache: {
    id: 'redis_cache',
    type: 'redis_cache',
    maxCount: 1,
    isMultiInstanceAllowed: false,
    name: 'Redis In-Memory Cache',
    reason: 'Only 1 centralized Redis cache cluster is required to absorb read traffic in RAM.',
  },
  cdn: {
    id: 'cdn',
    type: 'cdn',
    maxCount: 1,
    isMultiInstanceAllowed: false,
    name: 'Cloud CDN',
    reason: 'Only 1 Global CDN edge layer is used. Chaining multiple CDNs introduces duplicate cache hops and cache invalidation conflicts.',
  },
  rate_limiter: {
    id: 'rate_limiter',
    type: 'rate_limiter',
    maxCount: 1,
    isMultiInstanceAllowed: false,
    name: 'Rate Limiter',
    reason: 'Only 1 perimeter Rate Limiter is needed at ingress to shield backend services against sudden spikes.',
  },
  message_queue: {
    id: 'message_queue',
    type: 'message_queue',
    maxCount: 1,
    isMultiInstanceAllowed: false,
    name: 'Message Queue',
    reason: 'Only 1 central Message Queue buffer is used to smooth asynchronous write bursts.',
  },
  db_sharding: {
    id: 'db_sharding',
    type: 'db_sharding',
    maxCount: 1,
    isMultiInstanceAllowed: false,
    name: 'DB Sharding Router',
    reason: 'Only 1 DB Sharding Coordinator is used to route hash-partitioned primary writes.',
  },
  kafka_stream: {
    id: 'kafka_stream',
    type: 'kafka_stream',
    maxCount: 1,
    isMultiInstanceAllowed: false,
    name: 'Kafka Event Log',
    reason: 'Only 1 central Kafka Event Streaming Cluster acts as the system commit log backbone.',
  },
  anycast_edge: {
    id: 'anycast_edge',
    type: 'anycast_edge',
    maxCount: 1,
    isMultiInstanceAllowed: false,
    name: 'Anycast GeoDNS Router',
    reason: 'Only 1 Anycast BGP routing layer is used at the global internet perimeter.',
  },
  circuit_breaker: {
    id: 'circuit_breaker',
    type: 'circuit_breaker',
    maxCount: 1,
    isMultiInstanceAllowed: false,
    name: 'Adaptive Circuit Breaker',
    reason: 'Only 1 central Circuit Breaker gateway is used to shed excess load when downstream saturation occurs.',
  },
  l4_maglev: {
    id: 'l4_maglev',
    type: 'l4_maglev',
    maxCount: 1,
    isMultiInstanceAllowed: false,
    name: 'Kernel L4 (Maglev)',
    reason: 'Only 1 Layer-4 Maglev kernel bypass cluster is used for Direct Server Return (DSR) ingress.',
  },
  distributed_nosql: {
    id: 'distributed_nosql',
    type: 'distributed_nosql',
    maxCount: 1,
    isMultiInstanceAllowed: false,
    name: 'Distributed NoSQL Store',
    reason: 'Only 1 global Distributed NoSQL quorum cluster is used for linear write scaling.',
  },
  client: {
    id: 'client',
    type: 'client',
    maxCount: 1,
    isMultiInstanceAllowed: false,
    name: 'Global Client Traffic',
    reason: 'Only 1 Global Client ingress source represents the total user demand.',
  },
};

export function getComponentCount(
  nodes: { type?: string; config?: any; data?: any }[],
  itemId: string,
  type: ComponentType
): number {
  if (itemId === 'database' || (type === 'database' && itemId !== 'db_replica')) {
    // Primary database count (role === 'primary' or default)
    return nodes.filter((n) => {
      const nodeType = n.type || n.data?.type;
      if (nodeType !== 'database') return false;
      const role = n.config?.role || n.data?.config?.role;
      return role === 'primary' || !role;
    }).length;
  }

  if (itemId === 'db_replica') {
    // Read replica count
    return nodes.filter((n) => {
      const nodeType = n.type || n.data?.type;
      if (nodeType !== 'database') return false;
      const role = n.config?.role || n.data?.config?.role;
      return role === 'replica';
    }).length;
  }

  return nodes.filter((n) => (n.type || n.data?.type) === type).length;
}

export function checkComponentLimit(
  nodes: { type?: string; config?: any; data?: any }[],
  itemId: string,
  type: ComponentType
): { allowed: boolean; currentCount: number; maxCount: number; reason?: string; name: string } {
  const rule = COMPONENT_LIMIT_RULES[itemId] || COMPONENT_LIMIT_RULES[type];
  const currentCount = getComponentCount(nodes, itemId, type);

  if (!rule) {
    return {
      allowed: true,
      currentCount,
      maxCount: Infinity,
      name: type.replace('_', ' ').toUpperCase(),
    };
  }

  if (currentCount >= rule.maxCount) {
    return {
      allowed: false,
      currentCount,
      maxCount: rule.maxCount,
      reason: rule.reason,
      name: rule.name,
    };
  }

  return {
    allowed: true,
    currentCount,
    maxCount: rule.maxCount,
    name: rule.name,
  };
}
