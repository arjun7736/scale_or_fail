import { ArchitectureGraph } from '../core/types';
import { validateArchitecture, ArchitectureValidationResult } from '../validation';

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  ruleId?: string;
  message: string;
  nodeIds?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  canServeTraffic: boolean;
  issues: ValidationIssue[];
}

function getLegacyCode(ruleId: string): string {
  switch (ruleId) {
    case 'RULE_NO_CLIENT_NODE':
      return 'NO_CLIENT_NODE';
    case 'RULE_NO_APP_SERVERS':
      return 'NO_APP_SERVERS';
    case 'RULE_NO_DATABASE':
      return 'NO_DATABASE';
    case 'RULE_DUPLICATE_SINGLETON':
      return 'DUPLICATE_SINGLETON';
    case 'RULE_MULTIPLE_PRIMARY_DATABASES':
      return 'MULTIPLE_PRIMARY_DATABASES';
    case 'RULE_DANGLING_EDGE':
      return 'DANGLING_EDGE';
    case 'RULE_LB_NO_TARGETS':
    case 'RULE_UNREACHABLE_APP_SERVERS':
      return 'UNREACHABLE_APP_SERVERS';
    case 'RULE_DISCONNECTED_DATABASE':
      return 'SERVER_DISCONNECTED_FROM_DB';
    case 'RULE_REDIS_TO_REPLICA':
    case 'RULE_DATABASE_HTTP_ENTRYPOINT':
    case 'RULE_REPLICA_WITHOUT_PRIMARY':
    case 'RULE_ROUTING_CYCLE':
      return 'INVALID_CONNECTION';
    default:
      return ruleId.startsWith('RULE_') ? ruleId.slice(5) : ruleId;
  }
}

export function validateArchitectureGraph(graph: ArchitectureGraph): ValidationResult {
  const result: ArchitectureValidationResult = validateArchitecture(graph);
  return {
    isValid: result.isValid,
    canServeTraffic: result.canServeTraffic,
    issues: result.issues.map((i) => ({
      type: i.severity === 'error' ? 'error' : i.severity === 'warning' ? 'warning' : 'info',
      code: getLegacyCode(i.ruleId),
      ruleId: i.ruleId,
      message: i.message,
      nodeIds: i.relatedNodeIds,
    })),
  };
}
