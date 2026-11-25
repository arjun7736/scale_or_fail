import { ArchitectureNode, ArchitectureIssue, ComponentType, SemanticEdgeType } from '../core/types';
import { ARCHITECTURE_RULES } from './rules';

export interface ConnectionValidationResult {
  isValid: boolean;
  edgeType: SemanticEdgeType;
  label: string;
  issue?: ArchitectureIssue;
}

export function classifyConnection(
  source: ArchitectureNode,
  target: ArchitectureNode
): ConnectionValidationResult {
  const sType = source.type;
  const tType = target.type;
  const sCfg = source.config as any;
  const tCfg = target.config as any;

  // 1. Redis Cache to Database
  if (sType === 'redis_cache' && tType === 'database') {
    const isReplica = tCfg?.role === 'replica';
    const rule = ARCHITECTURE_RULES.RULE_REDIS_TO_REPLICA;
    return {
      isValid: false,
      edgeType: 'unsupported',
      label: 'Unsupported: Cache-to-DB',
      issue: {
        id: `issue-redis-db-${source.id}-${target.id}`,
        ruleId: rule.id,
        title: isReplica
          ? 'Unsupported Cache-to-Read-Replica Connection'
          : 'Unsupported Cache-to-Database Connection',
        category: 'invalid',
        severity: 'error',
        message: isReplica
          ? 'Invalid connection: Redis Cache → PostgreSQL Read Replica. This simulator does not support Redis acting as a database query router. Connect your application server to Redis and configure a separate database access path.'
          : 'Invalid connection: Redis Cache → PostgreSQL Primary. This simulator does not support Redis acting as a write-through router. Connect your application server to both cache and database.',
        explanation: rule.explanation,
        consequence: rule.consequence,
        suggestedApproaches: rule.suggestedApproaches,
        learningConcept: rule.learningConcept,
        relatedNodeIds: [source.id, target.id],
        difficultyDetails: rule.difficultyDetails,
        docLinks: rule.docLinks,
      },
    };
  }

  // 2. Database as HTTP Ingress / Reverse flow
  if (sType === 'database' && (tType === 'client' || tType === 'load_balancer')) {
    const rule = ARCHITECTURE_RULES.RULE_DATABASE_HTTP_ENTRYPOINT;
    return {
      isValid: false,
      edgeType: 'unsupported',
      label: 'Invalid Direction',
      issue: {
        id: `issue-db-ingress-${source.id}-${target.id}`,
        ruleId: rule.id,
        title: 'Incorrect Component Direction (Database Ingress)',
        category: 'invalid',
        severity: 'error',
        message: 'Invalid connection: A database cannot serve as the entry point or forward traffic to HTTP client or load balancer in this simulation.',
        explanation: rule.explanation,
        consequence: rule.consequence,
        suggestedApproaches: rule.suggestedApproaches,
        learningConcept: rule.learningConcept,
        relatedNodeIds: [source.id, target.id],
        difficultyDetails: rule.difficultyDetails,
      },
    };
  }

  if (sType === 'client' && tType === 'database') {
    const rule = ARCHITECTURE_RULES.RULE_DATABASE_HTTP_ENTRYPOINT;
    return {
      isValid: false,
      edgeType: 'unsupported',
      label: 'Invalid: Direct DB Ingress',
      issue: {
        id: `issue-client-db-${source.id}-${target.id}`,
        ruleId: rule.id,
        title: 'Unsupported Direct Client-to-Database Connection',
        category: 'invalid',
        severity: 'error',
        message: 'Direct connection from Client to Database is unsupported. In web system design, public internet clients must connect through an application layer.',
        explanation: rule.explanation,
        consequence: rule.consequence,
        suggestedApproaches: rule.suggestedApproaches,
        learningConcept: rule.learningConcept,
        relatedNodeIds: [source.id, target.id],
        difficultyDetails: rule.difficultyDetails,
      },
    };
  }

  // 3. Database to Database: Replication
  if (sType === 'database' && tType === 'database') {
    const sourceRole = sCfg?.role || 'primary';
    const targetRole = tCfg?.role || 'replica';

    if (sourceRole === 'primary' && targetRole === 'replica') {
      return {
        isValid: true,
        edgeType: 'replication',
        label: 'Asynchronous Replication (WAL)',
      };
    }

    if (sourceRole === 'replica' && targetRole === 'primary') {
      return {
        isValid: false,
        edgeType: 'unsupported',
        label: 'Invalid: Replica-to-Primary',
        issue: {
          id: `issue-replica-primary-${source.id}-${target.id}`,
          ruleId: 'RULE_REVERSE_REPLICATION',
          title: 'Invalid Reverse Replication Direction',
          category: 'invalid',
          severity: 'error',
          message: 'A Read Replica cannot replicate write streams back to a Primary Database. Replication streams flow strictly from Primary to Replica.',
          explanation: 'In leader-follower database systems, replication writes flow unidirectionally from the write master (WAL sender) to read-only standbys (WAL receiver).',
          consequence: 'This reverse replication link is invalid and cannot transmit data.',
          suggestedApproaches: [
            {
              title: 'Reverse the connection direction',
              description: 'Wire from PostgreSQL Primary to Read Replica.',
            },
          ],
          learningConcept: 'Unidirectional Write-Ahead Log (WAL) Streaming',
          relatedNodeIds: [source.id, target.id],
        },
      };
    }

    if (sourceRole === 'primary' && targetRole === 'primary') {
      const rule = ARCHITECTURE_RULES.RULE_MULTIPLE_PRIMARY_DATABASES;
      return {
        isValid: false,
        edgeType: 'unsupported',
        label: 'Invalid: Dual Primary Master',
        issue: {
          id: `issue-dual-primary-${source.id}-${target.id}`,
          ruleId: rule.id,
          title: rule.title,
          category: 'invalid',
          severity: 'error',
          message: 'Both databases are configured as Primary Write Masters. Standard relational topologies require single-master replication.',
          explanation: rule.explanation,
          consequence: rule.consequence,
          suggestedApproaches: rule.suggestedApproaches,
          learningConcept: rule.learningConcept,
          relatedNodeIds: [source.id, target.id],
        },
      };
    }
  }

  // 4. App Server to Storage & Caching
  if (sType === 'app_server') {
    if (tType === 'redis_cache') {
      return {
        isValid: true,
        edgeType: 'cache_access',
        label: 'Cache Access (Read/Write)',
      };
    }

    if (tType === 'database') {
      const targetRole = tCfg?.role || 'primary';
      if (targetRole === 'replica') {
        return {
          isValid: true,
          edgeType: 'db_read',
          label: 'Database Read (Replica)',
        };
      }
      return {
        isValid: true,
        edgeType: 'db_read_write',
        label: 'Database Read/Write (ACID)',
      };
    }

    if (tType === 'message_queue' || tType === 'kafka_stream') {
      return {
        isValid: true,
        edgeType: 'async_message',
        label: 'Async Message Flow',
      };
    }

    if (tType === 'db_sharding') {
      return {
        isValid: true,
        edgeType: 'db_read_write',
        label: 'Sharded SQL Ingress',
      };
    }

    if (tType === 'distributed_nosql') {
      return {
        isValid: true,
        edgeType: 'db_read_write',
        label: 'NoSQL Quorum Read/Write',
      };
    }
  }

  // 5. Message Queue / Kafka to App Server (Worker consumer)
  if ((sType === 'message_queue' || sType === 'kafka_stream') && tType === 'app_server') {
    return {
      isValid: true,
      edgeType: 'stream_processing',
      label: 'Worker Stream Consumer',
    };
  }

  // 6. DB Sharding Router to Database
  if (sType === 'db_sharding' && tType === 'database') {
    return {
      isValid: true,
      edgeType: 'db_read_write',
      label: 'Partitioned Shard Write',
    };
  }

  // 7. Ingress & HTTP Traffic Routing
  const validEdgeIngress = [
    'anycast_edge',
    'cdn',
    'rate_limiter',
    'l4_maglev',
    'circuit_breaker',
  ];

  if (sType === 'client') {
    if (validEdgeIngress.includes(tType)) {
      return {
        isValid: true,
        edgeType: 'edge_traffic',
        label: 'Edge Traffic Ingress',
      };
    }
    if (tType === 'load_balancer' || tType === 'app_server') {
      return {
        isValid: true,
        edgeType: 'http_traffic',
        label: 'HTTP Request Flow',
      };
    }
  }

  // Inter-ingress flow
  if (validEdgeIngress.includes(sType)) {
    if (validEdgeIngress.includes(tType)) {
      return {
        isValid: true,
        edgeType: 'edge_traffic',
        label: 'Edge Ingress Hop',
      };
    }
    if (tType === 'load_balancer' || tType === 'app_server') {
      return {
        isValid: true,
        edgeType: 'http_traffic',
        label: 'HTTP Request Flow',
      };
    }
  }

  // Load Balancer to App Server / Circuit Breaker
  if (sType === 'load_balancer') {
    if (tType === 'app_server') {
      return {
        isValid: true,
        edgeType: 'http_traffic',
        label: 'HTTP Request Flow',
      };
    }
    if (tType === 'circuit_breaker') {
      return {
        isValid: true,
        edgeType: 'http_traffic',
        label: 'Circuit Breaker Ingress',
      };
    }
  }

  if (sType === 'circuit_breaker') {
    if (tType === 'load_balancer' || tType === 'app_server') {
      return {
        isValid: true,
        edgeType: 'http_traffic',
        label: 'Protected HTTP Flow',
      };
    }
  }

  // Unsupported or illogical connection fallback
  const isReverseAppClient = sType === 'app_server' && tType === 'client';
  const isServerToServer = sType === 'app_server' && tType === 'app_server';

  return {
    isValid: false,
    edgeType: 'unsupported',
    label: 'Unsupported Connection',
    issue: {
      id: `issue-unsupported-${source.id}-${target.id}`,
      ruleId: 'RULE_UNSUPPORTED_CONNECTION',
      title: `Unsupported Connection (${source.type} → ${target.type})`,
      category: 'invalid',
      severity: 'error',
      message: isReverseAppClient
        ? 'Invalid reverse connection: App Server cannot initiate outbound connections directly to a Client in this request-response model.'
        : isServerToServer
        ? 'Direct App Server to App Server connection without an internal service mesh or broker is unsupported in this simulation.'
        : `Connection from ${source.type.replace('_', ' ')} to ${target.type.replace('_', ' ')} is not supported by the simulation architecture model.`,
      explanation:
        'Modern system design organizes components into discrete tiers (Edge Ingress → Compute → Storage/Cache). Unsanctioned lateral or inverted connections break tiered separation of concerns.',
      consequence:
        'The simulation will exclude this edge from valid routing paths. Traffic will not flow along this connection.',
      suggestedApproaches: [
        {
          title: 'Review Tier Architecture',
          description:
            'Ensure traffic follows the standard pattern: Client → Ingress/Load Balancer → Application Server → Cache / Database.',
        },
      ],
      learningConcept: 'N-Tier Architectural Layering & Data Flow Directions',
      relatedNodeIds: [source.id, target.id],
    },
  };
}
