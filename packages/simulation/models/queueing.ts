/**
 * Queueing theory and latency dynamics modeling.
 * Implements Little's Law (L = lambda * W), M/M/c approximation, and timeout drops.
 */

export interface QueueingLatencyResult {
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  inFlightRequests: number; // Concurrency L
  succeededRps: number;
  timedOutRps: number;
  errorRate: number;
}

export const SLA_CONSTANTS = {
  DEFAULT_TIMEOUT_MS: 3000, // 3-second SLA timeout
  CRITICAL_LATENCY_THRESHOLD_MS: 1500, // Warning threshold
  ACCEPTABLE_LATENCY_THRESHOLD_MS: 400, // Healthy threshold
};

/**
 * Calculates end-to-end latency, queueing delays, timeouts, and in-flight concurrency.
 *
 * @param throughputDemandRps Incoming request rate
 * @param baseServiceTimeMs Intrinsic processing time (CPU + Network + DB/Cache)
 * @param bottleneckUtilization Utilization of the most constrained component in the path (0 to 1)
 * @param queueLength Total requests currently waiting in thread/connection queues
 * @param timeoutMs Maximum allowable latency before a request is aborted
 */
export function calculateQueueingMetrics(
  throughputDemandRps: number,
  baseServiceTimeMs: number,
  bottleneckUtilization: number,
  queueLength: number = 0,
  timeoutMs: number = SLA_CONSTANTS.DEFAULT_TIMEOUT_MS
): QueueingLatencyResult {
  if (throughputDemandRps <= 0) {
    return {
      avgLatencyMs: Math.max(5, baseServiceTimeMs),
      p95LatencyMs: Math.max(10, baseServiceTimeMs * 1.3),
      p99LatencyMs: Math.max(15, baseServiceTimeMs * 1.8),
      inFlightRequests: 0,
      succeededRps: 0,
      timedOutRps: 0,
      errorRate: 0,
    };
  }

  // Non-linear queueing delay based on utilization rho.
  // As rho -> 1.0, wait time increases rapidly (Kingman's / M/M/1 queueing delay curve)
  const rho = Math.min(0.995, Math.max(0, bottleneckUtilization));
  const queueDelayMultiplier = rho < 0.70 ? rho * 0.5 : 0.35 + Math.pow(rho / (1 - rho), 1.25) * 0.15;
  const queueWaitMs = baseServiceTimeMs * queueDelayMultiplier + (queueLength > 0 ? (queueLength / throughputDemandRps) * 1000 : 0);

  const rawAvgLatencyMs = baseServiceTimeMs + queueWaitMs;

  // Tail latencies (p95 and p99 log-normal approximation)
  const jitterFactor = 1.0 + Math.pow(rho, 2) * 1.2;
  const rawP95LatencyMs = rawAvgLatencyMs * 1.45 * jitterFactor;
  const rawP99LatencyMs = rawAvgLatencyMs * 2.10 * jitterFactor;

  // Timeout logic:
  // If avg latency exceeds timeoutMs, or p95 heavily breaches timeout, requests drop
  let timedOutRps = 0;
  if (rawP95LatencyMs > timeoutMs) {
    // Fraction of requests that exceed timeout threshold
    const breachRatio = Math.min(1.0, (rawP95LatencyMs - timeoutMs) / rawP95LatencyMs);
    timedOutRps = Math.floor(throughputDemandRps * Math.min(1.0, breachRatio * 1.5));
  }

  // If utilization is severely oversaturated (>1.0), excess requests are dropped directly
  if (bottleneckUtilization > 1.0) {
    const overflowRatio = (bottleneckUtilization - 1.0) / bottleneckUtilization;
    const directDrops = Math.floor(throughputDemandRps * Math.min(1.0, overflowRatio));
    timedOutRps = Math.max(timedOutRps, directDrops);
  }

  const succeededRps = Math.max(0, throughputDemandRps - timedOutRps);
  const errorRate = throughputDemandRps > 0 ? timedOutRps / throughputDemandRps : 0;

  // Effective latency capped at timeout for aborted requests
  const avgLatencyMs = Math.min(timeoutMs * 1.2, rawAvgLatencyMs);
  const p95LatencyMs = Math.min(timeoutMs * 1.5, rawP95LatencyMs);
  const p99LatencyMs = Math.min(timeoutMs * 2.0, rawP99LatencyMs);

  // Little's Law: In-flight concurrency L = lambda * W
  // Lambda = incoming throughput, W = average time spent in system (in seconds)
  const inFlightRequests = Math.ceil(throughputDemandRps * (avgLatencyMs / 1000));

  return {
    avgLatencyMs,
    p95LatencyMs,
    p99LatencyMs,
    inFlightRequests,
    succeededRps,
    timedOutRps,
    errorRate,
  };
}
