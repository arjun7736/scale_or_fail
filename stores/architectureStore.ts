import { create } from 'zustand';
import {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  Connection,
  addEdge,
} from '@xyflow/react';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/system';
import {
  ArchitectureGraph,
  ArchitectureNode,
  ArchitectureEdge,
  ComponentType,
} from '../packages/simulation/core/types';
import { DEFAULT_CONFIGS } from '../packages/simulation/models/economics';
import { STARTER_ARCHITECTURE } from '../packages/simulation/scenarios/starter';
import { checkComponentLimit, getComponentCount } from '../packages/simulation/models/limits';
import {
  classifyConnection,
  validateArchitecture,
  ArchitectureValidationResult,
} from '../packages/simulation/validation';

export interface ArchitectureState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  validationResult: ArchitectureValidationResult | null;

  // React Flow handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;

  // Architecture actions
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  addNode: (type: ComponentType, position?: { x: number; y: number }, itemId?: string) => ArchitectureNode | null;
  addReadReplica: (primaryDbId?: string) => ArchitectureNode | null;
  removeNode: (nodeId: string) => void;
  removeEdge: (edgeId: string) => void;
  updateNodeConfig: (nodeId: string, newConfig: Partial<ArchitectureNode['config']>) => void;
  setGraph: (graph: ArchitectureGraph) => void;
  resetToStarter: () => void;
  getArchitectureGraph: () => ArchitectureGraph;
  validateCurrentGraph: () => ArchitectureValidationResult;
}

let onArchitectureEditCallback: (() => void) | null = null;
export function registerArchitectureEditListener(cb: () => void) {
  onArchitectureEditCallback = cb;
}

// Convert domain architecture graph into React Flow format
function convertGraphToFlow(graph: ArchitectureGraph): { nodes: Node[]; edges: Edge[] } {
  const nodeMap = new Map<string, ArchitectureNode>(graph.nodes.map((n) => [n.id, n]));

  const nodes: Node[] = graph.nodes.map((node) => ({
    id: node.id,
    type: node.type, // Maps to our custom node components
    position: node.position || { x: 250, y: 150 },
    data: {
      label: node.label,
      type: node.type,
      config: node.config,
    },
  }));

  const edges: Edge[] = graph.edges.map((edge) => {
    const sNode = nodeMap.get(edge.source);
    const tNode = nodeMap.get(edge.target);
    const classification = sNode && tNode ? classifyConnection(sNode, tNode) : null;

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'animatedFlow',
      animated: true,
      data: {
        label: edge.label || classification?.label || 'Connected',
        edgeType: edge.edgeType || classification?.edgeType || 'http_traffic',
        isValid: classification ? classification.isValid : true,
        issue: classification?.issue,
      },
    };
  });

  return { nodes, edges };
}

export const useArchitectureStore = create<ArchitectureState>((set, get) => {
  const initialFlow = convertGraphToFlow(STARTER_ARCHITECTURE);
  const initialValidation = validateArchitecture(STARTER_ARCHITECTURE);

  return {
    nodes: initialFlow.nodes,
    edges: initialFlow.edges,
    selectedNodeId: null,
    selectedEdgeId: null,
    validationResult: initialValidation,

    onNodesChange: (changes: any) => {
      set({
        nodes: applyNodeChanges(get().nodes, changes),
      });
    },

    onEdgesChange: (changes: any) => {
      set({
        edges: applyEdgeChanges(get().edges, changes),
      });
    },

    onConnect: (connection) => {
      if (!connection.source || !connection.target) return;
      const { nodes, edges } = get();
      const sNode = nodes.find((n) => n.id === connection.source);
      const tNode = nodes.find((n) => n.id === connection.target);

      let classification: any = null;
      if (sNode && tNode) {
        const sourceArchNode: ArchitectureNode = {
          id: sNode.id,
          type: (sNode.type || sNode.data?.type) as ComponentType,
          label: (sNode.data?.label as string) || sNode.id,
          config: sNode.data?.config as any,
        };
        const targetArchNode: ArchitectureNode = {
          id: tNode.id,
          type: (tNode.type || tNode.data?.type) as ComponentType,
          label: (tNode.data?.label as string) || tNode.id,
          config: tNode.data?.config as any,
        };
        classification = classifyConnection(sourceArchNode, targetArchNode);
      }

      const newEdge: Edge = {
        ...connection,
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        type: 'animatedFlow',
        animated: true,
        data: {
          label: classification?.label || 'Connected',
          edgeType: classification?.edgeType || 'http_traffic',
          isValid: classification ? classification.isValid : true,
          issue: classification?.issue,
        },
      };

      set({
        edges: addEdge(newEdge, edges),
      });
      get().validateCurrentGraph();
    },

    selectNode: (nodeId) => {
      set({ selectedNodeId: nodeId, selectedEdgeId: null });
    },

    selectEdge: (edgeId) => {
      set({ selectedEdgeId: edgeId, selectedNodeId: null });
    },

    addNode: (type, position, itemId) => {
      let targetItemId = itemId || type;
      const currentNodes = get().nodes.map((n) => ({
        type: (n.type || n.data?.type) as ComponentType,
        config: n.data?.config,
        data: n.data,
      }));

      // If user is adding database, and primary DB already exists, auto-route to Read Replica
      if (type === 'database' && (targetItemId === 'database' || !targetItemId)) {
        const primaryCount = getComponentCount(currentNodes, 'database', 'database');
        if (primaryCount >= 1) {
          targetItemId = 'db_replica';
        }
      }

      const limitCheck = checkComponentLimit(currentNodes, targetItemId, type);
      if (!limitCheck.allowed) {
        console.warn(`[Limit Rule] Cannot add ${targetItemId}: ${limitCheck.reason}`);
        return null;
      }

      const id = `${type}-${Date.now().toString(36).slice(-4)}`;
      let config: any;
      let label = type.replace('_', ' ').toUpperCase();

      switch (type) {
        case 'load_balancer':
          config = DEFAULT_CONFIGS.load_balancer();
          label = 'Load Balancer';
          break;
        case 'app_server':
          config = DEFAULT_CONFIGS.app_server('small');
          label = 'App Server';
          break;
        case 'database':
          if (targetItemId === 'database') {
            config = DEFAULT_CONFIGS.database('primary', 'small');
            label = 'PostgreSQL Primary';
          } else {
            const replicaCount = getComponentCount(currentNodes, 'db_replica', 'database');
            config = DEFAULT_CONFIGS.database('replica', 'small');
            label = replicaCount > 0 ? `Read Replica ${replicaCount + 1}` : 'Read Replica';
          }
          break;
        case 'redis_cache':
          config = DEFAULT_CONFIGS.redis_cache();
          label = 'Redis Cache';
          break;
        case 'message_queue':
          config = DEFAULT_CONFIGS.message_queue();
          label = 'Message Queue';
          break;
        case 'cdn':
          config = DEFAULT_CONFIGS.cdn();
          label = 'Cloud CDN';
          break;
        case 'rate_limiter':
          config = DEFAULT_CONFIGS.rate_limiter();
          label = 'Rate Limiter';
          break;
        case 'db_sharding':
          config = DEFAULT_CONFIGS.db_sharding();
          label = 'DB Sharding Router';
          break;
        case 'kafka_stream':
          config = DEFAULT_CONFIGS.kafka_stream();
          label = 'Kafka Stream';
          break;
        case 'anycast_edge':
          config = DEFAULT_CONFIGS.anycast_edge();
          label = 'Anycast GeoDNS';
          break;
        case 'circuit_breaker':
          config = DEFAULT_CONFIGS.circuit_breaker();
          label = 'Circuit Breaker';
          break;
        case 'l4_maglev':
          config = DEFAULT_CONFIGS.l4_maglev();
          label = 'L4 Maglev (DSR)';
          break;
        case 'distributed_nosql':
          config = DEFAULT_CONFIGS.distributed_nosql();
          label = 'Distributed NoSQL';
          break;
        default:
          config = DEFAULT_CONFIGS.client();
          label = 'Traffic Ingress';
      }

      const defaultPos = position || {
        x: 200 + Math.random() * 200,
        y: 150 + Math.random() * 150,
      };

      const archNode: ArchitectureNode = {
        id,
        type,
        label,
        config,
        position: defaultPos,
      };

      const flowNode: Node = {
        id,
        type,
        position: defaultPos,
        data: {
          label,
          type,
          config,
        },
      };

      set((state) => ({
        nodes: [...state.nodes, flowNode],
        selectedNodeId: id,
      }));

      onArchitectureEditCallback?.();
      return archNode;
    },

    addReadReplica: (primaryDbId?: string) => {
      const { nodes, edges } = get();
      const currentNodes = nodes.map((n) => ({
        type: (n.type || n.data?.type) as ComponentType,
        config: n.data?.config,
        data: n.data,
      }));

      const limitCheck = checkComponentLimit(currentNodes, 'db_replica', 'database');
      if (!limitCheck.allowed) {
        console.warn(`[Limit Rule] Cannot add db_replica: ${limitCheck.reason}`);
        return null;
      }

      // Locate primary database node
      let primaryNode = primaryDbId ? nodes.find((n) => n.id === primaryDbId) : null;
      if (!primaryNode) {
        primaryNode =
          nodes.find((n) => {
            const t = n.type || n.data?.type;
            const role = (n.data?.config as any)?.role;
            return t === 'database' && (role === 'primary' || !role);
          }) || nodes.find((n) => (n.type || n.data?.type) === 'database') || null;
      }

      const replicaCount = getComponentCount(currentNodes, 'db_replica', 'database');
      const basePos = primaryNode ? primaryNode.position : { x: 500, y: 350 };
      const replicaPos = {
        x: basePos.x + 230,
        y: basePos.y + (replicaCount * 95) - 30,
      };

      const id = `db-replica-${Date.now().toString(36).slice(-4)}`;
      const config = DEFAULT_CONFIGS.database('replica', 'small');
      const label = replicaCount > 0 ? `Read Replica ${replicaCount + 1}` : 'Read Replica';

      const archNode: ArchitectureNode = {
        id,
        type: 'database',
        label,
        config,
        position: replicaPos,
      };

      const flowNode: Node = {
        id,
        type: 'database',
        position: replicaPos,
        data: {
          label,
          type: 'database',
          config,
        },
      };

      // Connect replication and incoming read query edges
      const newEdges: Edge[] = [];
      if (primaryNode) {
        // 1. Establish WAL Replication Stream from Primary DB to Read Replica
        newEdges.push({
          id: `e-repl-${primaryNode.id}-${id}-${Date.now().toString(36).slice(-4)}`,
          source: primaryNode.id,
          target: id,
          type: 'animatedFlow',
          animated: true,
          data: {
            label: 'Replication (WAL)',
            edgeType: 'replication',
            isValid: true,
          },
        });

        // 2. Connect incoming read traffic from upstream App Servers
        const incomingEdges = edges.filter((e) => e.target === primaryNode!.id);
        incomingEdges.forEach((incEdge) => {
          newEdges.push({
            id: `e-${incEdge.source}-${id}-${Date.now().toString(36).slice(-4)}`,
            source: incEdge.source,
            target: id,
            type: 'animatedFlow',
            animated: true,
            data: {
              label: 'Database Read (Replica)',
              edgeType: 'db_read',
              isValid: true,
            },
          });
        });
      }

      set((state) => ({
        nodes: [...state.nodes, flowNode],
        edges: [...state.edges, ...newEdges],
        selectedNodeId: id,
      }));

      onArchitectureEditCallback?.();
      get().validateCurrentGraph();
      return archNode;
    },

    removeNode: (nodeId) => {
      onArchitectureEditCallback?.();
      set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== nodeId),
        edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      }));
      get().validateCurrentGraph();
    },

    removeEdge: (edgeId) => {
      onArchitectureEditCallback?.();
      set((state) => ({
        edges: state.edges.filter((e) => e.id !== edgeId),
        selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
      }));
      get().validateCurrentGraph();
    },

    updateNodeConfig: (nodeId, newConfig) => {
      set((state) => ({
        nodes: state.nodes.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                config: { ...((node.data?.config as object) || {}), ...newConfig },
              },
            };
          }
          return node;
        }),
      }));
      get().validateCurrentGraph();
    },

    setGraph: (graph) => {
      const flow = convertGraphToFlow(graph);
      set({ nodes: flow.nodes, edges: flow.edges });
      get().validateCurrentGraph();
    },

    resetToStarter: () => {
      const flow = convertGraphToFlow(STARTER_ARCHITECTURE);
      set({ nodes: flow.nodes, edges: flow.edges, selectedNodeId: null, selectedEdgeId: null });
      get().validateCurrentGraph();
    },

    getArchitectureGraph: () => {
      const { nodes, edges } = get();
      const archNodes: ArchitectureNode[] = nodes.map((n) => ({
        id: n.id,
        type: (n.type || (n.data?.type as ComponentType)) as ComponentType,
        label: (n.data?.label as string) || n.id,
        config: n.data?.config as any,
        position: n.position,
      }));

      const archEdges: ArchitectureEdge[] = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.data?.label as string,
        edgeType: (e.data?.edgeType as any) || 'http_traffic',
      }));

      return { nodes: archNodes, edges: archEdges };
    },

    validateCurrentGraph: () => {
      const graph = get().getArchitectureGraph();
      const valRes = validateArchitecture(graph);
      set({ validationResult: valRes });
      return valRes;
    },
  };
});
