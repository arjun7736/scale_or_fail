import { describe, it, expect } from 'vitest';
import { calculateQueueingMetrics } from '../models/queueing';

describe('Queueing Models and Little\'s Law', () => {
  it('should verify Little\'s Law concurrency formula L = lambda * W', () => {
    const throughput = 1000; // 1,000 req/s
    const baseLatencyMs = 50; // 50 ms
    const utilization = 0.3; // Low load

    const result = calculateQueueingMetrics(throughput, baseLatencyMs, utilization, 0);

    // Concurrency L = lambda * W = 1000 * (50-60ms / 1000s) ≈ 50-60 in-flight requests
    expect(result.inFlightRequests).toBeGreaterThanOrEqual(40);
    expect(result.inFlightRequests).toBeLessThanOrEqual(100);
    expect(result.errorRate).toBe(0);
    expect(result.succeededRps).toBe(throughput);
  });

  it('should simulate request timeouts and drops when latency breaches SLA threshold', () => {
    const throughput = 5000;
    const baseLatencyMs = 200;
    // Bottleneck saturation causes queue blowup
    const saturation = 1.05; // >100% capacity

    const result = calculateQueueingMetrics(throughput, baseLatencyMs, saturation, 5000);

    expect(result.timedOutRps).toBeGreaterThan(0);
    expect(result.errorRate).toBeGreaterThan(0);
    expect(result.succeededRps).toBeLessThan(throughput);
  });
});
