import { ClientNode } from './ClientNode';
import { ServerNode } from './ServerNode';
import { DatabaseNode } from './DatabaseNode';
import { CacheNode } from './CacheNode';
import { LoadBalancerNode } from './LoadBalancerNode';
import { QueueNode, CdnNode, RateLimiterNode } from './SpecialNodes';
import {
  DbShardingNode,
  KafkaStreamNode,
  AnycastEdgeNode,
  CircuitBreakerNode,
  L4MaglevNode,
  DistributedNosqlNode,
} from './HyperscaleNodes';

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
