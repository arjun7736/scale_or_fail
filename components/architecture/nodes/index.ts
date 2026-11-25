import { ClientNode } from './ClientNode';
import { ServerNode } from './ServerNode';
import { DatabaseNode } from './DatabaseNode';
import { CacheNode } from './CacheNode';
import { LoadBalancerNode } from './LoadBalancerNode';
import { QueueNode } from './QueueNode';
import { CdnNode } from './CdnNode';
import { RateLimiterNode } from './RateLimiterNode';
import { DbShardingNode } from './DbShardingNode';
import { KafkaStreamNode } from './KafkaStreamNode';
import { AnycastEdgeNode } from './AnycastEdgeNode';
import { CircuitBreakerNode } from './CircuitBreakerNode';
import { L4MaglevNode } from './L4MaglevNode';
import { DistributedNosqlNode } from './DistributedNosqlNode';

export * from './ClientNode';
export * from './ServerNode';
export * from './DatabaseNode';
export * from './CacheNode';
export * from './LoadBalancerNode';
export * from './QueueNode';
export * from './CdnNode';
export * from './RateLimiterNode';
export * from './DbShardingNode';
export * from './KafkaStreamNode';
export * from './AnycastEdgeNode';
export * from './CircuitBreakerNode';
export * from './L4MaglevNode';
export * from './DistributedNosqlNode';
export * from './NodeValidationBadge';

export const nodeTypes = {
  client: ClientNode,
  app_server: ServerNode,
  database: DatabaseNode,
  redis_cache: CacheNode,
  load_balancer: LoadBalancerNode,
  message_queue: QueueNode,
  cdn: CdnNode,
  rate_limiter: RateLimiterNode,
  db_sharding: DbShardingNode,
  kafka_stream: KafkaStreamNode,
  anycast_edge: AnycastEdgeNode,
  circuit_breaker: CircuitBreakerNode,
  l4_maglev: L4MaglevNode,
  distributed_nosql: DistributedNosqlNode,
};
