import { describe, it, expect } from 'vitest';
import {
  calculateAppServerCapacity,
  calculateDatabaseCapacity,
  calculateRedisCapacity,
  calculateQueueCapacity,
} from '../models/capacity';
import { DEFAULT_CONFIGS } from '../models/economics';

describe('Capacity Models', () => {
  it('should calculate App Server capacity and reflect CPU saturation under load', () => {
    const config = DEFAULT_CONFIGS.app_server('small');
    // Low load
    const lowLoad = calculateAppServerCapacity(config, 20);
    expect(lowLoad.cpuUtilization).toBeLessThan(0.4);
    expect(lowLoad.isOom).toBe(false);
    expect(lowLoad.threadWaitQueue).toBe(0);

    // High load exceeding single instance capacity
    const heavyLoad = calculateAppServerCapacity(config, 600);
    expect(heavyLoad.cpuUtilization).toBeGreaterThanOrEqual(0.85);
  });

  it('should model Database IOPS and index optimization benefits', () => {
    const unindexedConfig = DEFAULT_CONFIGS.database('primary', 'small');
    const indexedConfig = {
      ...DEFAULT_CONFIGS.database('primary', 'small'),
      queryOptimizationIndex: true,
    };

    const unindexed = calculateDatabaseCapacity(unindexedConfig, 300, 20);
    const indexed = calculateDatabaseCapacity(indexedConfig, 300, 20);

    // Indexed query latency should be significantly lower than unindexed
    expect(indexed.effectiveReadLatencyMs).toBeLessThan(unindexed.effectiveReadLatencyMs);
    // Indexed IOPS utilization should be lower for the same read load
    expect(indexed.iopsUtilization).toBeLessThan(unindexed.iopsUtilization);
  });

  it('should model Redis Cache absorbing read traffic and reducing downstream load', () => {
    const redisConfig = DEFAULT_CONFIGS.redis_cache();
    const readRps = 1000;
    const result = calculateRedisCapacity(redisConfig, readRps);

    expect(result.cacheHitsRps).toBeGreaterThan(700);
    expect(result.cacheMissesRps).toBeLessThan(300);
    expect(result.cacheHitsRps + result.cacheMissesRps).toBe(readRps);
    expect(result.latencyMs).toBeLessThan(5);
  });

  it('should model Message Queue buffer overflow under unhandled write bursts', () => {
    const queueConfig = {
      ...DEFAULT_CONFIGS.message_queue(),
      bufferCapacity: 500,
      workersCount: 1,
      drainRatePerWorker: 50,
    };

    const overflowResult = calculateQueueCapacity(queueConfig, 5000);
    expect(overflowResult.isOverflowing).toBe(true);
    expect(overflowResult.bufferUsed).toBe(queueConfig.bufferCapacity);
  });
});
