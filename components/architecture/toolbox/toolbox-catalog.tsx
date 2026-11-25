import React from 'react';
import {
  Server,
  Database,
  Split,
  Zap,
  Layers,
  Gauge,
  Globe,
  ShieldAlert,
  Network,
  HardDrive,
  Activity,
} from 'lucide-react';
import { ComponentType } from '@/packages/simulation/core/types';

export interface ToolboxItem {
  id: string;
  type: ComponentType;
  title: string;
  category: string;
  description: string;
  costPerHour: string;
  unlockStage: number;
  unlockStageName: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

export const TOOLBOX_ITEMS: ToolboxItem[] = [
  // STAGE 1: Startup
  {
    id: 'app_server',
    type: 'app_server',
    title: 'App Server (Node/Go)',
    category: 'Compute Tier',
    description: 'Stateless compute worker (Node.js/Go/Java) executing business logic and querying backend storage.',
    costPerHour: '$0.04 - $1.10/hr',
    unlockStage: 1,
    unlockStageName: 'Startup',
    icon: <Server className="h-4 w-4" />,
    iconBg: 'bg-teal-500/10 border-teal-500/20',
    iconColor: 'text-teal-400',
  },
  {
    id: 'database',
    type: 'database',
    title: 'PostgreSQL Database',
    category: 'Relational Storage',
    description: 'Primary ACID write master. Once deployed, scale read throughput with Read Replicas.',
    costPerHour: '$0.06 - $1.40/hr',
    unlockStage: 1,
    unlockStageName: 'Startup',
    icon: <Database className="h-4 w-4" />,
    iconBg: 'bg-purple-500/10 border-purple-500/20',
    iconColor: 'text-purple-400',
  },

  // STAGE 2: Growth
  {
    id: 'load_balancer',
    type: 'load_balancer',
    title: 'L7 Load Balancer (ALB)',
    category: 'Traffic Ingress',
    description: 'Layer 7 reverse proxy (Nginx/Envoy/AWS ALB) distributing HTTP traffic evenly with active health checking.',
    costPerHour: '$0.05/hr',
    unlockStage: 2,
    unlockStageName: 'Growth',
    icon: <Split className="h-4 w-4" />,
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-400',
  },

  // STAGE 3: Viral Traffic
  {
    id: 'redis_cache',
    type: 'redis_cache',
    title: 'Redis Cache Cluster',
    category: 'In-Memory Caching',
    description: 'In-memory distributed cache (Redis/Memcached) absorbing 80-90% of read queries in sub-millisecond RAM.',
    costPerHour: '$0.08/hr',
    unlockStage: 3,
    unlockStageName: 'Viral Traffic',
    icon: <Zap className="h-4 w-4" />,
    iconBg: 'bg-rose-500/10 border-rose-500/20',
    iconColor: 'text-rose-400',
  },

  // STAGE 4: Database Bottleneck
  {
    id: 'cdn',
    type: 'cdn',
    title: 'Cloud CDN (Cloudflare)',
    category: 'Global Edge Network',
    description: 'Global Edge Network (Cloudflare/CloudFront) caching public GET requests at edge POPs before origin.',
    costPerHour: '$0.05/hr',
    unlockStage: 4,
    unlockStageName: 'DB Bottleneck',
    icon: <Globe className="h-4 w-4" />,
    iconBg: 'bg-cyan-500/10 border-cyan-500/20',
    iconColor: 'text-cyan-400',
  },
  {
    id: 'rate_limiter',
    type: 'rate_limiter',
    title: 'Rate Limiter (Envoy)',
    category: 'Ingress Perimeter',
    description: 'API gateway token bucket (Envoy/Redis) rejecting abusive traffic bursts with HTTP 429 Too Many Requests.',
    costPerHour: '$0.02/hr',
    unlockStage: 4,
    unlockStageName: 'DB Bottleneck',
    icon: <Gauge className="h-4 w-4" />,
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-400',
  },

  // STAGE 5: Flash Sale Spikes
  {
    id: 'message_queue',
    type: 'message_queue',
    title: 'Message Queue (RabbitMQ)',
    category: 'Async Processing',
    description: 'Message broker (RabbitMQ/SQS) buffering write bursts so workers process jobs at a steady drain rate.',
    costPerHour: '$0.07/hr',
    unlockStage: 5,
    unlockStageName: 'Flash Sale',
    icon: <Layers className="h-4 w-4" />,
    iconBg: 'bg-indigo-500/10 border-indigo-500/20',
    iconColor: 'text-indigo-400',
  },

  // STAGE 6: Distributed Systems
  {
    id: 'db_sharding',
    type: 'db_sharding',
    title: 'DB Sharding Router (Vitess)',
    category: 'Horizontal Partitions',
    description: 'Horizontal database coordinator (Vitess/Citus) hash-partitioning primary writes across isolated shards.',
    costPerHour: '$0.25/hr',
    unlockStage: 6,
    unlockStageName: 'Distributed Systems',
    icon: <Database className="h-4 w-4" />,
    iconBg: 'bg-purple-500/10 border-purple-500/20',
    iconColor: 'text-purple-400',
  },
  {
    id: 'kafka_stream',
    type: 'kafka_stream',
    title: 'Kafka Event Log Cluster',
    category: 'Event Streaming',
    description: 'Distributed commit log (Apache Kafka/Pulsar) streaming millions of async partitioned events/sec.',
    costPerHour: '$0.18/hr',
    unlockStage: 6,
    unlockStageName: 'Distributed Systems',
    icon: <Activity className="h-4 w-4" />,
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-400',
  },

  // STAGE 7: Hyperscale (1M Milestone)
  {
    id: 'anycast_edge',
    type: 'anycast_edge',
    title: 'Anycast GeoDNS (Route 53)',
    category: 'Global Ingress',
    description: 'BGP Anycast routing (AWS Route 53/Cloudflare) directing worldwide traffic to the lowest-latency edge POP.',
    costPerHour: '$0.15/hr',
    unlockStage: 7,
    unlockStageName: 'Hyperscale',
    icon: <Globe className="h-4 w-4" />,
    iconBg: 'bg-cyan-500/10 border-cyan-500/20',
    iconColor: 'text-cyan-400',
  },
  {
    id: 'circuit_breaker',
    type: 'circuit_breaker',
    title: 'Circuit Breaker (Hystrix)',
    category: 'Fault Tolerance',
    description: 'Adaptive load shedder (Netflix Hystrix/Resilience4j) automatically shedding non-critical load during saturation.',
    costPerHour: '$0.03/hr',
    unlockStage: 7,
    unlockStageName: 'Hyperscale',
    icon: <ShieldAlert className="h-4 w-4" />,
    iconBg: 'bg-rose-500/10 border-rose-500/20',
    iconColor: 'text-rose-400',
  },

  // STAGE 8: Endless Survival / Mega Hyperscale (10M - 100M)
  {
    id: 'l4_maglev',
    type: 'l4_maglev',
    title: 'Kernel L4 Maglev (Katran)',
    category: 'Hyperscale Ingress',
    description: 'Kernel-bypass L4 load balancer (Google Maglev/Meta Katran) with Direct Server Return (DSR) routing 100M+ pps.',
    costPerHour: '$0.12/hr',
    unlockStage: 8,
    unlockStageName: 'Endless Survival',
    icon: <Network className="h-4 w-4" />,
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
  {
    id: 'distributed_nosql',
    type: 'distributed_nosql',
    title: 'Distributed NoSQL (Cassandra)',
    category: 'Hyperscale Storage',
    description: 'Decentralized quorum storage (Cassandra/DynamoDB/ScyllaDB) with masterless horizontal write scaling.',
    costPerHour: '$0.35/hr',
    unlockStage: 8,
    unlockStageName: 'Endless Survival',
    icon: <HardDrive className="h-4 w-4" />,
    iconBg: 'bg-violet-500/10 border-violet-500/20',
    iconColor: 'text-violet-400',
  },
];
