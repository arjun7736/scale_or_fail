'use client';

import React from 'react';
import { ComponentType } from '@/packages/simulation/core/types';
import { AppServerConfigForm } from './AppServerConfigForm';
import { DatabaseConfigForm } from './DatabaseConfigForm';
import { CacheConfigForm } from './CacheConfigForm';
import { LoadBalancerConfigForm } from './LoadBalancerConfigForm';
import { RateLimiterConfigForm } from './RateLimiterConfigForm';
import { MessageQueueConfigForm } from './MessageQueueConfigForm';
import { DbShardingConfigForm } from './DbShardingConfigForm';
import { KafkaStreamConfigForm } from './KafkaStreamConfigForm';
import { AnycastEdgeConfigForm } from './AnycastEdgeConfigForm';
import { CircuitBreakerConfigForm } from './CircuitBreakerConfigForm';
import { L4MaglevConfigForm } from './L4MaglevConfigForm';
import { DistributedNosqlConfigForm } from './DistributedNosqlConfigForm';

export * from './AppServerConfigForm';
export * from './DatabaseConfigForm';
export * from './CacheConfigForm';
export * from './LoadBalancerConfigForm';
export * from './RateLimiterConfigForm';
export * from './MessageQueueConfigForm';
export * from './DbShardingConfigForm';
export * from './KafkaStreamConfigForm';
export * from './AnycastEdgeConfigForm';
export * from './CircuitBreakerConfigForm';
export * from './L4MaglevConfigForm';
export * from './DistributedNosqlConfigForm';

interface NodeConfigFormDispatcherProps {
  type: ComponentType | string;
  config: any;
  onUpdate: (patch: any) => void;
}

export function NodeConfigFormDispatcher({ type, config, onUpdate }: NodeConfigFormDispatcherProps) {
  switch (type) {
    case 'app_server':
      return <AppServerConfigForm config={config} onUpdate={onUpdate} />;
    case 'database':
      return <DatabaseConfigForm config={config} onUpdate={onUpdate} />;
    case 'redis_cache':
      return <CacheConfigForm config={config} onUpdate={onUpdate} />;
    case 'load_balancer':
      return <LoadBalancerConfigForm config={config} onUpdate={onUpdate} />;
    case 'rate_limiter':
      return <RateLimiterConfigForm config={config} onUpdate={onUpdate} />;
    case 'message_queue':
      return <MessageQueueConfigForm config={config} onUpdate={onUpdate} />;
    case 'db_sharding':
      return <DbShardingConfigForm config={config} onUpdate={onUpdate} />;
    case 'kafka_stream':
      return <KafkaStreamConfigForm config={config} onUpdate={onUpdate} />;
    case 'anycast_edge':
      return <AnycastEdgeConfigForm config={config} onUpdate={onUpdate} />;
    case 'circuit_breaker':
      return <CircuitBreakerConfigForm config={config} onUpdate={onUpdate} />;
    case 'l4_maglev':
      return <L4MaglevConfigForm config={config} onUpdate={onUpdate} />;
    case 'distributed_nosql':
      return <DistributedNosqlConfigForm config={config} onUpdate={onUpdate} />;
    default:
      return null;
  }
}
