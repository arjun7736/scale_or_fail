import {
  ArchitectureGraph,
  ArchitectureNode,
  ComponentLiveMetrics,
  SystemMetrics,
} from '../core/types';
import { incidentEngine, StructuredIncidentLog, ProductionIncident } from './incident-engine';

export interface ServerIncidentDiagnosis {
  hasIncident: boolean;
  crashedNodeId?: string;
  crashedNodeLabel?: string;
  severity: 'critical' | 'warning';
  title: string;
  exactError: string;
  rootCauseCategory:
    | 'oom'
    | 'cpu_saturation'
    | 'db_connection_starvation'
    | 'db_io_bottleneck'
    | 'unconnected_storage'
    | 'ingress_concentration'
    | 'timeout_cascade';
  technicalDetails: string;
  preventionAdvice: string;
  actionableSteps: string[];
  suggestedActionType?: 'upgrade_tier' | 'add_lb' | 'add_redis' | 'enable_pooling' | 'connect_db' | 'add_replica' | 'upgrade_db';
  structuredLogs?: StructuredIncidentLog[];
  actionableSolutions?: {
    title: string;
    description: string;
    tradeOff: string;
    actionType: string;
  }[];
  educationalPrinciple?: string;
}

/**
 * Inspects all application servers and infrastructure in the architecture graph to detect crashes,
 * identify the exact breaking failure, and formulate step-by-step prevention steps.
 */
export function diagnoseServerIncident(
  graph: ArchitectureGraph,
  componentMetrics: Record<string, ComponentLiveMetrics>,
  systemMetrics: SystemMetrics,
  engine = incidentEngine
): ServerIncidentDiagnosis | null {
  const nodeMap = new Map<string, ArchitectureNode>(graph.nodes.map((n) => [n.id, n]));
  const outgoingEdges = new Map<string, string[]>();
  for (const node of graph.nodes) {
    outgoingEdges.set(node.id, []);
  }
  for (const edge of graph.edges) {
    outgoingEdges.get(edge.source)?.push(edge.target);
  }

  const appServers = graph.nodes.filter((n) => n.type === 'app_server');
  const databases = graph.nodes.filter((n) => n.type === 'database');
  const primaryDb = databases.find((n) => (n.config as any).role === 'primary');
  const primaryDbMetrics = primaryDb ? componentMetrics[primaryDb.id] : undefined;

  // 1. Structural check: Disconnected from storage
  const disconnectedServer = appServers.find((server) => {
    const sTargets = outgoingEdges.get(server.id) || [];
    const connectedDbs = sTargets.map((id) => nodeMap.get(id)).filter((n) => n && n.type === 'database');
    const connectedCaches = sTargets.map((id) => nodeMap.get(id)).filter((n) => n && n.type === 'redis_cache');
    const m = componentMetrics[server.id];
    return connectedDbs.length === 0 && connectedCaches.length === 0 && m && (m.health === 'failed' || m.health === 'critical' || m.errorRate > 0.4);
  });

  if (disconnectedServer) {
    const sMetrics = componentMetrics[disconnectedServer.id]!;
    return {
      hasIncident: true,
      crashedNodeId: disconnectedServer.id,
      crashedNodeLabel: disconnectedServer.label,
      severity: 'critical',
      title: `SERVER BROKEN: "${disconnectedServer.label}" has no database connected!`,
      exactError: 'HTTP 500 Internal Server Error: Application server cannot query, authenticate, or persist state because no Database or Cache is reachable.',
      rootCauseCategory: 'unconnected_storage',
      technicalDetails: `Server received ${sMetrics.throughputInRps.toLocaleString()} req/s, but has 0 outgoing connections to any persistence layer. All incoming HTTP worker threads immediately threw unhandled connection exceptions.`,
      preventionAdvice: 'Connect your application server to a Database or Cache.',
      actionableSteps: [
        `Draw an edge connection from "${disconnectedServer.label}" to your PostgreSQL Primary database.`,
        'Ensure the line connects to the purple Database handle.',
      ],
      suggestedActionType: 'connect_db',
    };
  }

  // 2. Evaluate production incidents via IncidentEngine (telemetry, root cause, structured logs)
  const { currentIncident } = engine.evaluateTick(
    systemMetrics.tick,
    systemMetrics.simTimeSeconds,
    graph,
    systemMetrics,
    componentMetrics
  );

  if (currentIncident) {
    const culpritNode = currentIncident.culpritNodeId
      ? graph.nodes.find((n) => n.id === currentIncident.culpritNodeId)
      : undefined;

    const categoryMap: Record<string, ServerIncidentDiagnosis['rootCauseCategory']> = {
      database: 'db_connection_starvation',
      container: 'oom',
      cache: 'timeout_cascade',
      compute: 'cpu_saturation',
      network: 'timeout_cascade',
    };

    return {
      hasIncident: true,
      crashedNodeId: currentIncident.culpritNodeId,
      crashedNodeLabel: culpritNode?.label,
      severity: currentIncident.severity,
      title: currentIncident.name,
      exactError: currentIncident.description,
      rootCauseCategory: categoryMap[currentIncident.category] || 'cpu_saturation',
      technicalDetails: currentIncident.technicalRootCause,
      preventionAdvice: currentIncident.recoveryConditionsDescription,
      actionableSteps: currentIncident.actionableSolutions.map((s) => `${s.title}: ${s.description}`),
      actionableSolutions: currentIncident.actionableSolutions,
      structuredLogs: currentIncident.structuredLogs,
      educationalPrinciple: currentIncident.educationalPrinciple,
      suggestedActionType: currentIncident.actionableSolutions[0]?.actionType as any,
    };
  }

  // 1. Find crashed or critically failing servers
  const crashedServer = appServers.find((s) => {
    const m = componentMetrics[s.id];
    return m && (m.health === 'failed' || m.isOom || m.cpuUtilization >= 95 || m.errorRate > 0.4);
  });

  if (!crashedServer) {
    // Check if any server is in warning state (>85% CPU or queue building)
    const stressedServer = appServers.find((s) => {
      const m = componentMetrics[s.id];
      return m && (m.cpuUtilization >= 85 || (m.queueDepth && m.queueDepth > 100));
    });

    if (!stressedServer) return null;

    const sMetrics = componentMetrics[stressedServer.id];
    const sCfg = stressedServer.config as any;

    return {
      hasIncident: true,
      crashedNodeId: stressedServer.id,
      crashedNodeLabel: stressedServer.label,
      severity: 'warning',
      title: `Server "${stressedServer.label}" is near breaking point!`,
      exactError: `CPU utilization is at ${sMetrics.cpuUtilization}% with ${sMetrics.queueDepth} waiting requests. Incoming traffic (${sMetrics.throughputInRps.toLocaleString()} RPS) is exceeding instance single-node throughput limit.`,
      rootCauseCategory: 'cpu_saturation',
      technicalDetails: `Instance tier (${sCfg.tier?.toUpperCase()}, ${sCfg.cpuCores} vCPU) is processing more requests than its execution thread pool (${sCfg.threadPoolSize} threads) can service without latency degradation.`,
      preventionAdvice: 'Distribute traffic across multiple replicas with a Load Balancer or upgrade to a higher compute tier.',
      actionableSteps: [
        'Deploy an Application Load Balancer from the toolbox.',
        'Add a second App Server replica and connect the Load Balancer to both.',
        'Or click this server and upgrade its tier to MEDIUM or LARGE.',
      ],
      suggestedActionType: 'add_lb',
    };
  }

  const sMetrics = componentMetrics[crashedServer.id]!;
  const sCfg = crashedServer.config as any;
  const sTargets = outgoingEdges.get(crashedServer.id) || [];
  const connectedDbs = sTargets.map((id) => nodeMap.get(id)).filter((n) => n && n.type === 'database');
  const connectedCaches = sTargets.map((id) => nodeMap.get(id)).filter((n) => n && n.type === 'redis_cache');

  // Diagnosis Case A: Disconnected from storage
  if (connectedDbs.length === 0 && connectedCaches.length === 0) {
    return {
      hasIncident: true,
      crashedNodeId: crashedServer.id,
      crashedNodeLabel: crashedServer.label,
      severity: 'critical',
      title: `SERVER BROKEN: "${crashedServer.label}" has no database connected!`,
      exactError: 'HTTP 500 Internal Server Error: Application server cannot query, authenticate, or persist state because no Database or Cache is reachable.',
      rootCauseCategory: 'unconnected_storage',
      technicalDetails: `Server received ${sMetrics.throughputInRps.toLocaleString()} req/s, but has 0 outgoing connections to any persistence layer. All incoming HTTP worker threads immediately threw unhandled connection exceptions.`,
      preventionAdvice: 'Connect your application server to a Database or Cache.',
      actionableSteps: [
        `Draw an edge connection from "${crashedServer.label}" to your PostgreSQL Primary database.`,
        'Ensure the line connects to the purple Database handle.',
      ],
      suggestedActionType: 'connect_db',
    };
  }

  // Diagnosis Case B: OOM Crash (Out of Memory)
  if (sMetrics.isOom || sMetrics.ramUtilization >= 98) {
    return {
      hasIncident: true,
      crashedNodeId: crashedServer.id,
      crashedNodeLabel: crashedServer.label,
      severity: 'critical',
      title: `SERVER CRASHED: Out-Of-Memory (OOM Killed)!`,
      exactError: `Linux Kernel OOM Killer terminated the process! In-flight request heap allocated memory exceeded the physical instance RAM limit (${sCfg.ramGb} GB).`,
      rootCauseCategory: 'oom',
      technicalDetails: `Due to elevated latency or queue build-up, in-flight concurrent requests ballooned to ${sMetrics.connectionsActive + sMetrics.queueDepth}. Each active worker socket and request buffer allocated RAM until total heap exceeded ${sCfg.ramGb * 1024} MB.`,
      preventionAdvice: 'Scale server memory tier or add horizontal replicas behind a Load Balancer to divide concurrency.',
      actionableSteps: [
        `Select "${crashedServer.label}" and upgrade its tier to LARGE (16GB RAM) or XLARGE (32GB RAM).`,
        'Add a Load Balancer to shard incoming concurrency across 2 or more server replicas.',
        'Add a Rate Limiter at the client ingress to shed catastrophic request floods.',
      ],
      suggestedActionType: 'upgrade_tier',
    };
  }

  // Diagnosis Case C: Database Connection Pool Starvation Cascading to App Server
  if (
    primaryDbMetrics &&
    (primaryDbMetrics.connectionsActive >= primaryDbMetrics.connectionsMax * 0.95 ||
      primaryDbMetrics.health === 'critical')
  ) {
    return {
      hasIncident: true,
      crashedNodeId: crashedServer.id,
      crashedNodeLabel: crashedServer.label,
      severity: 'critical',
      title: `SERVER DOWN: Starved by Database Connection Pool Exhaustion!`,
      exactError: `All ${sCfg.threadPoolSize} application server worker threads are blocked waiting for PostgreSQL connections (${primaryDbMetrics.connectionsActive}/${primaryDbMetrics.connectionsMax} pool slots full). Requests timed out with HTTP 504.`,
      rootCauseCategory: 'db_connection_starvation',
      technicalDetails: `Upstream app server threads cannot execute queries because the database has reached its max_connections ceiling (${primaryDbMetrics.connectionsMax}). In-flight requests accumulated in socket buffers until client timeouts aborted them.`,
      preventionAdvice: 'Enable Database Connection Pooling (PgBouncer) or deploy a Redis Cache to eliminate 85% of database query volume.',
      actionableSteps: [
        'Select the Database node and toggle "Connection Pooler (PgBouncer)" in the configuration drawer.',
        'Deploy a Redis Cache node between the App Server and Database to absorb read queries in memory.',
        'Add a Database Read Replica to distribute read query connections away from the primary.',
      ],
      suggestedActionType: 'enable_pooling',
    };
  }

  // Diagnosis Case D: CPU 100% Burnout
  if (sMetrics.cpuUtilization >= 95) {
    const hasLb = graph.nodes.some((n) => n.type === 'load_balancer');
    return {
      hasIncident: true,
      crashedNodeId: crashedServer.id,
      crashedNodeLabel: crashedServer.label,
      severity: 'critical',
      title: `SERVER DOWN: Single-Node CPU Saturated at 100%!`,
      exactError: `App Server CPU hit 100% saturation under ${sMetrics.throughputInRps.toLocaleString()} requests/second. The OS cannot context-switch threads fast enough, causing request timeouts.`,
      rootCauseCategory: 'cpu_saturation',
      technicalDetails: `The server instance (${sCfg.tier?.toUpperCase()}, ${sCfg.cpuCores} cores) has a processing ceiling that cannot keep pace with the incoming demand rate. Request queue depth reached ${sMetrics.queueDepth} requests.`,
      preventionAdvice: hasLb
        ? 'Scale up the server instance tier or add additional worker replicas behind your Load Balancer.'
        : 'Add an Application Load Balancer and scale horizontally with multiple App Server replicas to eliminate this single point of failure.',
      actionableSteps: hasLb
        ? [
            `Select "${crashedServer.label}" and upgrade to a higher tier (${sCfg.cpuCores * 2} vCPU).`,
            'Deploy an additional App Server replica connected to the Load Balancer.',
          ]
        : [
            'Drag an Application Load Balancer from the toolbox and place it between Client and App Servers.',
            'Deploy 2 or more App Server replicas behind the Load Balancer.',
          ],
      suggestedActionType: hasLb ? 'upgrade_tier' : 'add_lb',
    };
  }

  // Diagnosis Case E: General Latency & Timeout Cascade
  return {
    hasIncident: true,
    crashedNodeId: crashedServer.id,
    crashedNodeLabel: crashedServer.label,
    severity: 'critical',
    title: `SERVER DEGRADED: Latency Cascade & Timeouts!`,
    exactError: `Average latency spiked to ${sMetrics.avgLatencyMs}ms (breaching the 3,000ms SLA). ${sMetrics.droppedRps.toLocaleString()} requests/sec are dropping with HTTP 504 Gateway Timeout.`,
    rootCauseCategory: 'timeout_cascade',
    technicalDetails: `Downstream query latency backed up the request queue (${sMetrics.queueDepth} items), saturating all available worker threads and breaching SLA timeout boundaries.`,
    preventionAdvice: 'Reduce query latency with Redis caching, compound query indexing, or deploy edge CDN caching.',
    actionableSteps: [
      'Select your Database and enable "Query Index Optimization".',
      'Deploy a Redis Cache node to serve reads in ~1ms.',
      'Deploy a Cloud CDN at the edge to absorb static traffic before reaching servers.',
    ],
    suggestedActionType: 'add_redis',
  };
}
