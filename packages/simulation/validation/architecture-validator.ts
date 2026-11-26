import {
  ArchitectureGraph,
  ArchitectureNode,
  ArchitectureIssue,
  ArchitectureAssessment,
  ComponentLiveMetrics,
  ComponentType,
  DifficultyMode,
  DimensionAssessment,
} from '../core/types';
import { ARCHITECTURE_RULES } from './rules';
import { classifyConnection } from './connection-validator';

export interface ArchitectureValidationResult {
  isValid: boolean; // False if any Category A (Error) issues exist
  canServeTraffic: boolean;
  issues: ArchitectureIssue[];
  nodeIssuesMap: Record<string, ArchitectureIssue[]>;
  edgeIssuesMap: Record<string, ArchitectureIssue[]>;
  assessment: ArchitectureAssessment;
}

/**
 * Modular Architecture Validation Engine
 * Analyzes nodes, edges, component configurations, and dependencies.
 */
export function validateArchitecture(
  graph: ArchitectureGraph,
  liveMetrics?: Record<string, ComponentLiveMetrics>,
  currentRps: number = 50,
  difficulty: DifficultyMode = 'beginner',
  currentStage: number = 1
): ArchitectureValidationResult {
  const issues: ArchitectureIssue[] = [];
  const nodeIssuesMap: Record<string, ArchitectureIssue[]> = {};
  const edgeIssuesMap: Record<string, ArchitectureIssue[]> = {};

  const addIssue = (issue: ArchitectureIssue) => {
    issues.push(issue);

    if (issue.relatedNodeIds) {
      for (const nid of issue.relatedNodeIds) {
        if (!nodeIssuesMap[nid]) nodeIssuesMap[nid] = [];
        nodeIssuesMap[nid].push(issue);
      }
    }

    if (issue.relatedEdgeIds) {
      for (const eid of issue.relatedEdgeIds) {
        if (!edgeIssuesMap[eid]) edgeIssuesMap[eid] = [];
        edgeIssuesMap[eid].push(issue);
      }
    }
  };

  const nodeMap = new Map<string, ArchitectureNode>(graph.nodes.map((n) => [n.id, n]));
  const outgoingEdges = new Map<string, string[]>();
  const incomingEdges = new Map<string, string[]>();
  const allOutgoingEdges = new Map<string, string[]>();

  for (const node of graph.nodes) {
    outgoingEdges.set(node.id, []);
    incomingEdges.set(node.id, []);
    allOutgoingEdges.set(node.id, []);
  }

  // ==========================================
  // PHASE 1: CONNECTION VALIDATION
  // ==========================================
  for (const edge of graph.edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode || !targetNode) {
      addIssue({
        id: `dangling-${edge.id}`,
        ruleId: 'RULE_DANGLING_EDGE',
        title: 'Dangling Connection',
        category: 'invalid',
        severity: 'error',
        message: `Connection ${edge.source} → ${edge.target} connects to a deleted or non-existent node.`,
        explanation: 'The edge endpoints do not match any active component in the topology.',
        consequence: 'Requests attempting to route along this connection will immediately fail.',
        suggestedApproaches: [{ title: 'Delete broken edge', description: 'Remove or reconnect the dangling edge.' }],
        learningConcept: 'Graph Integrity & Topology Consistency',
        relatedEdgeIds: [edge.id],
      });
      continue;
    }

    allOutgoingEdges.get(edge.source)?.push(edge.target);

    const connRes = classifyConnection(sourceNode, targetNode);
    if (!connRes.isValid && connRes.issue) {
      connRes.issue.relatedEdgeIds = [edge.id];
      addIssue(connRes.issue);
    } else {
      outgoingEdges.get(edge.source)?.push(edge.target);
      incomingEdges.get(edge.target)?.push(edge.source);
    }
  }

  // ==========================================
  // PHASE 2: STRUCTURAL TOPOLOGY VALIDATION
  // ==========================================

  // Check 1: Client Node
  const clientNodes = graph.nodes.filter((n) => n.type === 'client');
  if (clientNodes.length === 0) {
    const rule = ARCHITECTURE_RULES.RULE_NO_CLIENT_NODE;
    addIssue({
      id: 'issue-no-client',
      ruleId: rule.id,
      title: rule.title,
      category: 'invalid',
      severity: 'error',
      message: 'No traffic client found in architecture. Add a Client node to generate load.',
      explanation: rule.explanation,
      consequence: rule.consequence,
      suggestedApproaches: rule.suggestedApproaches,
      learningConcept: rule.learningConcept,
      difficultyDetails: rule.difficultyDetails,
    });
  }

  // Check 2: Compute Tier (App Servers)
  const appServers = graph.nodes.filter((n) => n.type === 'app_server');
  if (appServers.length === 0) {
    const rule = ARCHITECTURE_RULES.RULE_NO_APP_SERVERS;
    addIssue({
      id: 'issue-no-app-servers',
      ruleId: rule.id,
      title: rule.title,
      category: 'invalid',
      severity: 'error',
      message: 'No Application Servers found. Traffic has no compute layer to process requests.',
      explanation: rule.explanation,
      consequence: rule.consequence,
      suggestedApproaches: rule.suggestedApproaches,
      learningConcept: rule.learningConcept,
      difficultyDetails: rule.difficultyDetails,
    });
  }

  // Check 2b: Duplicate singletons
  const counts: Record<string, number> = {};
  for (const node of graph.nodes) {
    counts[node.type] = (counts[node.type] || 0) + 1;
  }
  const SINGLETON_TYPES: ComponentType[] = [
    'client',
    'load_balancer',
    'redis_cache',
    'cdn',
    'rate_limiter',
    'message_queue',
    'db_sharding',
    'kafka_stream',
    'anycast_edge',
    'circuit_breaker',
    'l4_maglev',
    'distributed_nosql',
  ];
  for (const st of SINGLETON_TYPES) {
    if (counts[st] > 1) {
      const rule = ARCHITECTURE_RULES.RULE_DUPLICATE_SINGLETON;
      addIssue({
        id: `issue-duplicate-${st}`,
        ruleId: rule.id,
        title: rule.title,
        category: 'inefficient',
        severity: 'warning',
        message: `Multiple ${st.replace('_', ' ')} components detected (${counts[st]}). System design best practices require at most 1 instance for this tier.`,
        explanation: rule.explanation,
        consequence: rule.consequence,
        suggestedApproaches: rule.suggestedApproaches,
        learningConcept: rule.learningConcept,
        relatedNodeIds: graph.nodes.filter((n) => n.type === st).map((n) => n.id),
      });
    }
  }

  // Check 2c: Ingress reachability from Client to App Servers
  let canReachAppServer = false;
  if (clientNodes.length > 0) {
    const reachableVisited = new Set<string>();
    const q = [clientNodes[0].id];
    reachableVisited.add(clientNodes[0].id);

    while (q.length > 0) {
      const curId = q.shift()!;
      const curNode = nodeMap.get(curId);
      if (curNode && curNode.type === 'app_server') {
        canReachAppServer = true;
      }
      const neighbors = outgoingEdges.get(curId) || [];
      for (const nId of neighbors) {
        if (!reachableVisited.has(nId)) {
          reachableVisited.add(nId);
          q.push(nId);
        }
      }
    }

    if (!canReachAppServer && appServers.length > 0) {
      addIssue({
        id: 'issue-unreachable-app-servers',
        ruleId: 'RULE_UNREACHABLE_APP_SERVERS',
        title: 'Application Servers Unreachable',
        category: 'invalid',
        severity: 'error',
        message: 'Application servers are not reachable from the Client. Connect Client through Load Balancer or directly.',
        explanation: 'Client requests cannot find any directed routing path to compute instances.',
        consequence: 'Client traffic cannot reach application compute, resulting in 100% request failure.',
        suggestedApproaches: [{ title: 'Connect Ingress to Servers', description: 'Wire client or load balancer to application servers.' }],
        learningConcept: 'Ingress Path Connectivity',
      });
    }
  }

  // Check 3: Database Presence
  const databases = graph.nodes.filter((n) => n.type === 'database' || n.type === 'distributed_nosql');
  if (databases.length === 0) {
    const rule = ARCHITECTURE_RULES.RULE_NO_DATABASE;
    addIssue({
      id: 'issue-no-db',
      ruleId: rule.id,
      title: rule.title,
      category: 'invalid',
      severity: 'error',
      message: 'No Database found. Stateful transactional endpoints cannot persist data.',
      explanation: rule.explanation,
      consequence: rule.consequence,
      suggestedApproaches: rule.suggestedApproaches,
      learningConcept: rule.learningConcept,
      difficultyDetails: rule.difficultyDetails,
    });
  }

  // Check 4: Load Balancer without backend application targets (Example 2)
  const loadBalancers = graph.nodes.filter((n) => n.type === 'load_balancer');
  for (const lb of loadBalancers) {
    const targets = outgoingEdges.get(lb.id) || [];
    const backendServers = targets.map((id) => nodeMap.get(id)).filter((n) => n && n.type === 'app_server');

    if (backendServers.length === 0) {
      const rule = ARCHITECTURE_RULES.RULE_LB_NO_TARGETS;
      addIssue({
        id: `issue-lb-no-targets-${lb.id}`,
        ruleId: rule.id,
        title: rule.title,
        category: 'invalid',
        severity: 'error',
        message: 'Your load balancer has no healthy application targets. Incoming requests cannot reach your application.',
        explanation: rule.explanation,
        consequence: rule.consequence,
        suggestedApproaches: rule.suggestedApproaches,
        learningConcept: rule.learningConcept,
        relatedNodeIds: [lb.id],
        difficultyDetails: rule.difficultyDetails,
      });
    } else if (backendServers.length === 1) {
      // Valid but Inefficient: LB connected to only 1 server
      const rule = ARCHITECTURE_RULES.RULE_LB_SINGLE_TARGET;
      addIssue({
        id: `issue-lb-single-target-${lb.id}`,
        ruleId: rule.id,
        title: rule.title,
        category: 'inefficient',
        severity: 'info',
        message: 'Load balancer is connected to only 1 application server. Consider adding replicas to realize load balancing benefits.',
        explanation: rule.explanation,
        consequence: rule.consequence,
        suggestedApproaches: rule.suggestedApproaches,
        learningConcept: rule.learningConcept,
        relatedNodeIds: [lb.id, backendServers[0]!.id],
        difficultyDetails: rule.difficultyDetails,
      });
    }
  }

  // Check 5: Read Replica without Primary Database (Example 4)
  const replicaDbs = graph.nodes.filter(
    (n) => n.type === 'database' && (n.config as any)?.role === 'replica'
  );
  const primaryDbs = graph.nodes.filter(
    (n) => n.type === 'database' && (n.config as any)?.role === 'primary'
  );

  if (replicaDbs.length > 0 && primaryDbs.length === 0) {
    const rule = ARCHITECTURE_RULES.RULE_REPLICA_WITHOUT_PRIMARY;
    addIssue({
      id: 'issue-replica-no-primary',
      ruleId: rule.id,
      title: rule.title,
      category: 'invalid',
      severity: 'error',
      message: 'A PostgreSQL read replica requires a valid replication source. Configure its relationship with a primary database.',
      explanation: rule.explanation,
      consequence: rule.consequence,
      suggestedApproaches: rule.suggestedApproaches,
      learningConcept: rule.learningConcept,
      relatedNodeIds: replicaDbs.map((r) => r.id),
      difficultyDetails: rule.difficultyDetails,
    });
  }

  // Check 6: Multiple Primary Databases (Split-brain)
  if (primaryDbs.length > 1) {
    const rule = ARCHITECTURE_RULES.RULE_MULTIPLE_PRIMARY_DATABASES;
    addIssue({
      id: 'issue-multiple-primary-dbs',
      ruleId: rule.id,
      title: rule.title,
      category: 'invalid',
      severity: 'error',
      message: 'Multiple Primary Databases detected. Relational SQL topologies only support 1 Primary Write Master.',
      explanation: rule.explanation,
      consequence: rule.consequence,
      suggestedApproaches: rule.suggestedApproaches,
      learningConcept: rule.learningConcept,
      relatedNodeIds: primaryDbs.map((p) => p.id),
      difficultyDetails: rule.difficultyDetails,
    });
  }

  // Check 7: Disconnected Database for App Servers (Example 3)
  for (const server of appServers) {
    const sTargets = outgoingEdges.get(server.id) || [];
    const connectedDbs = sTargets.map((id) => nodeMap.get(id)).filter((n) => n && (n.type === 'database' || n.type === 'distributed_nosql'));
    const connectedCaches = sTargets.map((id) => nodeMap.get(id)).filter((n) => n && n.type === 'redis_cache');
    const connectedShards = sTargets.map((id) => nodeMap.get(id)).filter((n) => n && n.type === 'db_sharding');

    if (connectedDbs.length === 0 && connectedCaches.length === 0 && connectedShards.length === 0) {
      const rule = ARCHITECTURE_RULES.RULE_DISCONNECTED_DATABASE;
      addIssue({
        id: `issue-disconnected-db-${server.id}`,
        ruleId: rule.id,
        title: rule.title,
        category: 'invalid',
        severity: 'error',
        message: `Your application "${server.label}" cannot complete database-dependent requests because no reachable database is configured.`,
        explanation: rule.explanation,
        consequence: rule.consequence,
        suggestedApproaches: rule.suggestedApproaches,
        learningConcept: rule.learningConcept,
        relatedNodeIds: [server.id],
        difficultyDetails: rule.difficultyDetails,
      });
    }
  }

  // Check 8: Routing Cycles / Unsupported graph loops (Tarjan / DFS)
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  let hasCycle = false;
  const cycleNodes: string[] = [];

  function detectCycleDFS(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = allOutgoingEdges.get(nodeId) || [];
    for (const neighbor of neighbors) {
      // Skip intentional replication edges between Primary and Replica
      const sNode = nodeMap.get(nodeId);
      const tNode = nodeMap.get(neighbor);
      if (sNode?.type === 'database' && tNode?.type === 'database') continue;

      // Skip asynchronous message brokers (Message Queue, Kafka) which decouple execution asynchronously
      if (
        sNode?.type === 'message_queue' ||
        sNode?.type === 'kafka_stream' ||
        tNode?.type === 'message_queue' ||
        tNode?.type === 'kafka_stream'
      ) {
        continue;
      }

      if (!visited.has(neighbor)) {
        if (detectCycleDFS(neighbor)) {
          cycleNodes.push(nodeId);
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        cycleNodes.push(neighbor);
        cycleNodes.push(nodeId);
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      if (detectCycleDFS(node.id)) {
        hasCycle = true;
        break;
      }
    }
  }

  if (hasCycle) {
    const rule = ARCHITECTURE_RULES.RULE_ROUTING_CYCLE;
    addIssue({
      id: 'issue-routing-cycle',
      ruleId: rule.id,
      title: rule.title,
      category: 'invalid',
      severity: 'error',
      message: 'A circular routing loop was detected in the architecture. Call graphs must be a Directed Acyclic Graph (DAG).',
      explanation: rule.explanation,
      consequence: rule.consequence,
      suggestedApproaches: rule.suggestedApproaches,
      learningConcept: rule.learningConcept,
      relatedNodeIds: Array.from(new Set(cycleNodes)),
      difficultyDetails: rule.difficultyDetails,
    });
  }

  // ==========================================
  // PHASE 3: RELIABILITY & EFFICIENCY ANALYSIS
  // ==========================================

  // Check 9: Single Point of Failure (Compute Tier)
  if (appServers.length === 1 && currentStage >= 2) {
    const rule = ARCHITECTURE_RULES.RULE_SINGLE_POINT_OF_FAILURE_APP;
    addIssue({
      id: 'issue-spof-app',
      ruleId: rule.id,
      title: rule.title,
      category: 'reliability_risk',
      severity: 'warning',
      message: 'Single application server has no redundancy. If this instance fails, the entire application will go offline.',
      explanation: rule.explanation,
      consequence: rule.consequence,
      suggestedApproaches: rule.suggestedApproaches,
      learningConcept: rule.learningConcept,
      relatedNodeIds: [appServers[0].id],
      difficultyDetails: rule.difficultyDetails,
    });
  }

  // Check 10: Database SPOF
  if (primaryDbs.length === 1 && replicaDbs.length === 0 && currentStage >= 3) {
    const rule = ARCHITECTURE_RULES.RULE_DATABASE_SPOF;
    addIssue({
      id: 'issue-spof-db',
      ruleId: rule.id,
      title: rule.title,
      category: 'reliability_risk',
      severity: 'warning',
      message: 'Database has no replication or failover targets configured. A database failure will cause complete data outage.',
      explanation: rule.explanation,
      consequence: rule.consequence,
      suggestedApproaches: rule.suggestedApproaches,
      learningConcept: rule.learningConcept,
      relatedNodeIds: [primaryDbs[0].id],
      difficultyDetails: rule.difficultyDetails,
    });
  }

  // Check 11: Single Server under high load
  if (appServers.length === 1 && currentRps > 800) {
    const rule = ARCHITECTURE_RULES.RULE_SINGLE_SERVER_UNDER_LOAD;
    addIssue({
      id: 'issue-single-server-high-load',
      ruleId: rule.id,
      title: rule.title,
      category: 'inefficient',
      severity: 'warning',
      message: 'A single application server is handling significant traffic volume (> 800 RPS). Consider scaling horizontally.',
      explanation: rule.explanation,
      consequence: rule.consequence,
      suggestedApproaches: rule.suggestedApproaches,
      learningConcept: rule.learningConcept,
      relatedNodeIds: [appServers[0].id],
      difficultyDetails: rule.difficultyDetails,
    });
  }

  // Check 12: High Read Load without Caching (live metrics driven or traffic volume driven)
  const caches = graph.nodes.filter((n) => n.type === 'redis_cache');
  if (caches.length === 0 && replicaDbs.length === 0 && currentRps > 1000) {
    const rule = ARCHITECTURE_RULES.RULE_HIGH_READ_LOAD_NO_CACHE;
    addIssue({
      id: 'issue-high-read-no-cache',
      ruleId: rule.id,
      title: rule.title,
      category: 'inefficient',
      severity: 'warning',
      message: 'High read workload is hitting the database directly. Consider deploying Redis Cache or Read Replicas.',
      explanation: rule.explanation,
      consequence: rule.consequence,
      suggestedApproaches: rule.suggestedApproaches,
      learningConcept: rule.learningConcept,
      relatedNodeIds: primaryDbs.map((p) => p.id),
      difficultyDetails: rule.difficultyDetails,
    });
  }

  // Check 13: Live Metrics Driven Analysis (if live metrics available)
  if (liveMetrics) {
    // Database connection saturation
    for (const db of databases) {
      const m = liveMetrics[db.id];
      if (m && m.connectionsMax > 0 && m.connectionsActive / m.connectionsMax > 0.80) {
        const rule = ARCHITECTURE_RULES.RULE_HIGH_DB_CONNECTIONS;
        addIssue({
          id: `issue-db-connections-${db.id}`,
          ruleId: rule.id,
          title: rule.title,
          category: 'inefficient',
          severity: 'warning',
          message: `Database "${db.label}" connection utilization is at ${Math.round((m.connectionsActive / m.connectionsMax) * 100)}%. Consider connection pooling.`,
          explanation: rule.explanation,
          consequence: rule.consequence,
          suggestedApproaches: rule.suggestedApproaches,
          learningConcept: rule.learningConcept,
          relatedNodeIds: [db.id],
          difficultyDetails: rule.difficultyDetails,
        });
      }
    }

    // Cache stampede risk
    for (const cache of caches) {
      const cm = liveMetrics[cache.id];
      if (cm && cm.throughputInRps > 2000 && primaryDbs.length > 0) {
        const primaryM = liveMetrics[primaryDbs[0].id];
        if (primaryM && primaryM.cpuUtilization > 70) {
          const rule = ARCHITECTURE_RULES.RULE_CACHE_STAMPEDE_RISK;
          addIssue({
            id: `issue-stampede-${cache.id}`,
            ruleId: rule.id,
            title: rule.title,
            category: 'reliability_risk',
            severity: 'warning',
            message: 'Primary DB is already heavily loaded. If Redis keys expire, a cache stampede will cause database saturation.',
            explanation: rule.explanation,
            consequence: rule.consequence,
            suggestedApproaches: rule.suggestedApproaches,
            learningConcept: rule.learningConcept,
            relatedNodeIds: [cache.id, primaryDbs[0].id],
            difficultyDetails: rule.difficultyDetails,
          });
        }
      }
    }

    // Message queue unbounded growth
    const queues = graph.nodes.filter((n) => n.type === 'message_queue');
    for (const q of queues) {
      const qm = liveMetrics[q.id];
      const qCfg = q.config as any;
      if (qm && qm.queueDepth > 0 && qCfg.bufferCapacity > 0) {
        if (qm.queueDepth / qCfg.bufferCapacity > 0.70) {
          const rule = ARCHITECTURE_RULES.RULE_UNBOUNDED_QUEUE_RISK;
          addIssue({
            id: `issue-queue-bloat-${q.id}`,
            ruleId: rule.id,
            title: rule.title,
            category: 'reliability_risk',
            severity: 'warning',
            message: `Message queue buffer is ${Math.round((qm.queueDepth / qCfg.bufferCapacity) * 100)}% full. Ingestion exceeds worker drain rate.`,
            explanation: rule.explanation,
            consequence: rule.consequence,
            suggestedApproaches: rule.suggestedApproaches,
            learningConcept: rule.learningConcept,
            relatedNodeIds: [q.id],
            difficultyDetails: rule.difficultyDetails,
          });
        }
      }
    }
  }

  // ==========================================
  // PHASE 4: 5-DIMENSION ASSESSMENT COMPUTATION
  // ==========================================
  const errorsCount = issues.filter((i) => i.severity === 'error').length;
  const warningsCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  const isValid = errorsCount === 0;
  const hasFatalRoutingBlocker = !canReachAppServer || clientNodes.length === 0 || appServers.length === 0 || hasCycle;
  const canServeTraffic = !hasFatalRoutingBlocker;

  // 1. Routing Correctness (Score 100 if 0 errors, drops by 35 per fatal error)
  const routingScore = Math.max(0, 100 - errorsCount * 35);

  // 2. Performance Efficiency
  let perfScore = 100;
  if (appServers.length === 1 && currentRps > 500) perfScore -= 20;
  if (caches.length === 0 && currentRps > 800) perfScore -= 25;
  if (warningsCount > 0) perfScore -= Math.min(25, warningsCount * 8);
  perfScore = Math.max(10, Math.min(100, perfScore));

  // 3. Scalability
  let scalScore = 50;
  if (loadBalancers.length > 0 && appServers.length >= 2) scalScore += 25;
  if (caches.length > 0) scalScore += 15;
  if (replicaDbs.length > 0) scalScore += 10;
  scalScore = Math.max(10, Math.min(100, scalScore));

  // 4. Reliability & Fault Tolerance
  let relScore = 100;
  if (appServers.length === 1 && currentStage >= 2) relScore -= 30;
  if (primaryDbs.length === 1 && replicaDbs.length === 0 && currentStage >= 3) relScore -= 25;
  if (loadBalancers.length === 0 && appServers.length > 1) relScore -= 15;
  if (errorsCount > 0) relScore -= 20;
  relScore = Math.max(10, Math.min(100, relScore));

  // 5. Cost Efficiency
  let costScore = 100;
  const totalCost = graph.nodes.reduce((acc, n) => acc + (n.config.costPerHour || 0), 0);
  if (currentStage === 1 && totalCost > 1.0) costScore -= 30;
  if (currentStage <= 2 && totalCost > 2.5) costScore -= 25;
  costScore = Math.max(20, Math.min(100, costScore));

  // Weighted overall educational score
  const overallScore = Math.round(
    routingScore * 0.35 +
    perfScore * 0.20 +
    scalScore * 0.15 +
    relScore * 0.20 +
    costScore * 0.10
  );

  let letterGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
  if (overallScore >= 95) letterGrade = 'A+';
  else if (overallScore >= 85) letterGrade = 'A';
  else if (overallScore >= 75) letterGrade = 'B';
  else if (overallScore >= 60) letterGrade = 'C';
  else if (overallScore >= 45) letterGrade = 'D';
  else letterGrade = 'F';

  const rateDimension = (score: number): DimensionAssessment['rating'] => {
    if (score >= 90) return 'exceptional';
    if (score >= 75) return 'good';
    if (score >= 60) return 'adequate';
    if (score >= 40) return 'concerning';
    return 'critical';
  };

  const assessment: ArchitectureAssessment = {
    overallScore,
    letterGrade,
    isWorkloadSatisfied: isValid && (liveMetrics ? !Object.values(liveMetrics).some((m) => m.health === 'critical' || m.health === 'failed') : true),
    dimensions: {
      routingCorrectness: {
        score: routingScore,
        weight: 0.35,
        rating: rateDimension(routingScore),
        summary: errorsCount === 0 ? 'All component connections and dependencies satisfy topology rules.' : `${errorsCount} invalid connection(s) or missing critical layers detected.`,
        strengths: errorsCount === 0 ? ['Valid client-to-storage call graph', 'Acyclic DAG request routing'] : [],
        vulnerabilities: issues.filter((i) => i.severity === 'error').map((i) => i.title),
      },
      performanceEfficiency: {
        score: perfScore,
        weight: 0.20,
        rating: rateDimension(perfScore),
        summary: perfScore >= 80 ? 'Throughput and latency headroom are well-balanced for current workload.' : 'Potential latency bottlenecks or queue buildup detected under load.',
        strengths: caches.length > 0 ? ['Sub-millisecond in-memory read absorption (Redis)'] : ['Nominal query latency'],
        vulnerabilities: issues.filter((i) => i.category === 'inefficient').map((i) => i.title),
      },
      scalability: {
        score: scalScore,
        weight: 0.15,
        rating: rateDimension(scalScore),
        summary: scalScore >= 75 ? 'Horizontal scaling tiers deployed behind reverse proxy.' : 'Compute or database tier lacks horizontal expansion paths.',
        strengths: appServers.length > 1 ? [`${appServers.length} application server replicas behind ingress`] : [],
        vulnerabilities: appServers.length === 1 ? ['Single instance compute ceiling'] : [],
      },
      reliability: {
        score: relScore,
        weight: 0.20,
        rating: rateDimension(relScore),
        summary: relScore >= 80 ? 'Redundant components eliminate single points of failure.' : 'Single points of failure risk total service outage during host disruption.',
        strengths: loadBalancers.length > 0 && appServers.length > 1 ? ['Active upstream health checking and failover'] : [],
        vulnerabilities: issues.filter((i) => i.category === 'reliability_risk').map((i) => i.title),
      },
      costEfficiency: {
        score: costScore,
        weight: 0.10,
        rating: rateDimension(costScore),
        summary: `Operating at $${totalCost.toFixed(2)}/hr. ${costScore >= 80 ? 'Optimal capacity-to-cost ratio.' : 'Infrastructure cost is elevated for current nominal demand.'}`,
        strengths: [`Infrastructure cost: $${totalCost.toFixed(2)}/hr`],
        vulnerabilities: costScore < 75 ? ['Over-provisioned capacity burning operational budget'] : [],
      },
    },
    topIssues: [...issues].sort((a, b) => {
      const order = { error: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    }),
    learningSummary:
      errorsCount > 0
        ? 'Resolve fatal connection and dependency errors first to ensure traffic can be processed reliably.'
        : warningsCount > 0
        ? 'Architecture is functional. Investigate efficiency and resilience warnings to prepare for upcoming traffic spikes.'
        : 'Architecture is well-engineered for the current workload, exhibiting clean tier segregation and high availability.',
  };

  return {
    isValid,
    canServeTraffic,
    issues,
    nodeIssuesMap,
    edgeIssuesMap,
    assessment,
  };
}
