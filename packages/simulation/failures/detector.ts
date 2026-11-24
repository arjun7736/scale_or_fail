import {
  ArchitectureGraph,
  ComponentLiveMetrics,
  ComponentType,
  PostmortemReport,
  SystemAlert,
  SystemMetrics,
} from '../core/types';

export interface FailureEvent {
  tick: number;
  seconds: number;
  event: string;
  culpritNodeId?: string;
  culpritNodeType?: ComponentType;
}

export class FailureDetector {
  private failureTimeline: FailureEvent[] = [];
  private consecutiveCrashedTicks: number = 0;
  private peakRps: number = 0;
  private peakConcurrency: number = 0;
  private totalRequestsHandled: number = 0;
  private totalRequestsFailed: number = 0;

  recordTick(
    tick: number,
    simSeconds: number,
    systemMetrics: SystemMetrics,
    componentMetrics: Record<string, ComponentLiveMetrics>,
    newAlerts: SystemAlert[],
    difficulty: import('../core/types').DifficultyMode = 'beginner'
  ): { isGameOver: boolean; postmortem?: PostmortemReport } {
    this.peakRps = Math.max(this.peakRps, systemMetrics.incomingRps);
    this.peakConcurrency = Math.max(this.peakConcurrency, systemMetrics.inFlightRequests);
    this.totalRequestsHandled += systemMetrics.succeededRps;
    this.totalRequestsFailed += systemMetrics.failedRps;

    // Record critical alerts to the timeline
    for (const alert of newAlerts) {
      if (alert.severity === 'critical') {
        this.failureTimeline.push({
          tick,
          seconds: simSeconds,
          event: `${alert.title}: ${alert.message}`,
          culpritNodeId: alert.nodeId,
          culpritNodeType: alert.nodeType,
        });
      }
    }

    // Check for sustained crash condition:
    // Sustained error rate > 50% for N consecutive ticks (stricter in expert/intermediate)
    if (systemMetrics.errorRate > 0.85) {
      this.consecutiveCrashedTicks += 2;
    } else if (systemMetrics.errorRate > 0.45) {
      this.consecutiveCrashedTicks += 1;
    } else if (systemMetrics.budgetRemaining <= 0) {
      this.consecutiveCrashedTicks += 10; // Immediate bankruptcy game-over
    } else {
      this.consecutiveCrashedTicks = Math.max(0, this.consecutiveCrashedTicks - 1);
    }

    const crashThreshold = difficulty === 'expert' ? 5 : difficulty === 'intermediate' ? 8 : 12;
    const isGameOver = this.consecutiveCrashedTicks >= crashThreshold;

    if (isGameOver) {
      return {
        isGameOver: true,
      };
    }

    return { isGameOver: false };
  }

  generatePostmortem(
    simSeconds: number,
    graph: ArchitectureGraph,
    finalMetrics: SystemMetrics,
    componentMetrics: Record<string, ComponentLiveMetrics>
  ): PostmortemReport {
    // Diagnose root cause
    let rootCause = 'System collapsed under traffic load.';
    const recommendations: { title: string; explanation: string; architecturalFix: string }[] = [];

    // Analyze component metrics to pinpoint the primary failure
    const databases = graph.nodes.filter((n) => n.type === 'database');
    const appServers = graph.nodes.filter((n) => n.type === 'app_server');
    const loadBalancers = graph.nodes.filter((n) => n.type === 'load_balancer');
    const caches = graph.nodes.filter((n) => n.type === 'redis_cache');

    const primaryDb = databases.find(
      (n) => (n.config as import('../core/types').DatabaseNodeConfig).role === 'primary'
    );
    const primaryDbMetrics = primaryDb ? componentMetrics[primaryDb.id] : undefined;

    const failedServers = appServers.filter(
      (s) => componentMetrics[s.id]?.cpuUtilization >= 95 || componentMetrics[s.id]?.health === 'failed'
    );

    if (finalMetrics.budgetRemaining <= 0) {
      rootCause = 'Infrastructure Bankruptcy: Cloud operating budget was completely exhausted, leading to immediate cloud instance deprovisioning.';
      recommendations.push({
        title: 'Optimize Infrastructure Unit Economics',
        explanation: 'Over-provisioning high-tier instances before traffic arrives bleeds capital.',
        architecturalFix: 'Use auto-scaling tiers, introduce caching to avoid oversized enterprise databases, and balance scale with revenue.',
      });
    } else if (primaryDbMetrics && (primaryDbMetrics.connectionsActive >= primaryDbMetrics.connectionsMax || primaryDbMetrics.health === 'critical')) {
      rootCause = `Database Connection Exhaustion: The primary database connection pool was saturated (${primaryDbMetrics.connectionsActive}/${primaryDbMetrics.connectionsMax} connections). In-flight application server threads blocked waiting for connections, triggering cascading 504 Gateway Timeouts across the entire tier.`;
      recommendations.push({
        title: 'Enable Database Connection Pooling (PgBouncer)',
        explanation: 'Multiplexing worker threads onto a pooled backend connection pool eliminates the 1-thread-to-1-connection bottleneck.',
        architecturalFix: 'Select your Database node and toggle "Connection Pooler (PgBouncer)" in the configuration drawer.',
      });
      recommendations.push({
        title: 'Introduce Redis Caching Layer',
        explanation: 'Redis absorbs 80-90% of read queries in memory with sub-millisecond latency, preventing them from consuming expensive database connection slots.',
        architecturalFix: 'Drag a Redis Cache node onto the canvas and connect it between your App Server and Database.',
      });
      recommendations.push({
        title: 'Add Database Read Replicas',
        explanation: 'Read replicas allow read queries to be offloaded from the primary database, reserving primary IOPS and connection slots solely for state-mutating writes.',
        architecturalFix: 'Deploy a Read Replica Database to distribute query load.',
      });
    } else if (appServers.length === 1 && failedServers.length > 0) {
      rootCause = `Single Point of Failure: The single application server "${appServers[0]?.label}" hit 100% CPU saturation under ${finalMetrics.incomingRps} requests/sec. Without horizontal replicas or a load balancer, incoming queues exploded and requests timed out.`;
      recommendations.push({
        title: 'Horizontal Scaling with Load Balancing',
        explanation: 'Single-server vertical scaling has diminishing returns and creates a fatal single point of failure (SPOF). Horizontal scaling distributes load across redundant worker instances.',
        architecturalFix: 'Add a Load Balancer and scale to 2 or more Application Server replicas.',
      });
    } else if (appServers.length > 1 && loadBalancers.length === 0) {
      rootCause = 'Misconfigured Routing: Multiple application servers existed, but without a Load Balancer to distribute incoming traffic, excess requests concentrated on a single path while other servers sat idle.';
      recommendations.push({
        title: 'Deploy an Ingress Load Balancer',
        explanation: 'Multiple compute nodes require an ingress distributor (ALB/NLB) to balance incoming connections using round-robin or least-connections.',
        architecturalFix: 'Insert an Application Load Balancer between the Client and your Application Servers.',
      });
    } else if (failedServers.length > 0) {
      rootCause = `Compute Saturation: ${failedServers.length} application server(s) ran out of compute or memory capacity. Request concurrency (L = ${finalMetrics.inFlightRequests}) exceeded available thread pool capacity.`;
      recommendations.push({
        title: 'Scale Application Server Tier or Add Replicas',
        explanation: 'Worker thread pool exhaustion causes incoming requests to queue in socket buffers until client timeouts drop them.',
        architecturalFix: 'Upgrade App Server tiers to higher CPU cores/RAM or add more replicas behind the Load Balancer.',
      });
    } else {
      rootCause = `Distributed Latency Cascade: System-wide p95 latency climbed to ${finalMetrics.p95LatencyMs}ms (breaching the 3,000ms SLA timeout). Little's Law caused in-flight requests to balloon to ${finalMetrics.inFlightRequests}, overwhelming network buffers.`;
      recommendations.push({
        title: 'Implement Edge CDN and Rate Limiting',
        explanation: 'Absorb static and cacheable traffic at the edge with a CDN, and use a Rate Limiter to shed catastrophic traffic spikes before they reach internal databases.',
        architecturalFix: 'Deploy a Cloud CDN and an API Gateway Rate Limiter at the client ingress.',
      });
    }

    return {
      survivalDurationSeconds: simSeconds,
      peakRps: this.peakRps,
      peakConcurrency: this.peakConcurrency,
      totalRequestsHandled: this.totalRequestsHandled,
      totalRequestsFailed: this.totalRequestsFailed,
      totalSpend: finalMetrics.totalCostIncurred,
      totalRevenue: finalMetrics.revenueEarned,
      finalStage: finalMetrics.stage,
      finalStageName: finalMetrics.stageName,
      oneMillionMilestoneReached: finalMetrics.oneMillionMilestoneReached,
      rootCause,
      failureTimeline: [...this.failureTimeline],
      architectureSnapshot: JSON.parse(JSON.stringify(graph)),
      finalMetrics: { ...finalMetrics },
      recommendations,
    };
  }

  reset(): void {
    this.failureTimeline = [];
    this.consecutiveCrashedTicks = 0;
    this.peakRps = 0;
    this.peakConcurrency = 0;
    this.totalRequestsHandled = 0;
    this.totalRequestsFailed = 0;
  }
}
