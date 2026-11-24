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

export interface ArchitectureState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;

  // React Flow handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;

  // Architecture actions
  selectNode: (nodeId: string | null) => void;
  addNode: (type: ComponentType, position?: { x: number; y: number }) => ArchitectureNode;
  removeNode: (nodeId: string) => void;
  updateNodeConfig: (nodeId: string, newConfig: Partial<ArchitectureNode['config']>) => void;
  setGraph: (graph: ArchitectureGraph) => void;
  resetToStarter: () => void;
  getArchitectureGraph: () => ArchitectureGraph;
}

// Convert domain architecture graph into React Flow format
function convertGraphToFlow(graph: ArchitectureGraph): { nodes: Node[]; edges: Edge[] } {
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

  const edges: Edge[] = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'animatedFlow',
    animated: true,
    data: {
      label: edge.label,
    },
  }));

  return { nodes, edges };
}

export const useArchitectureStore = create<ArchitectureState>((set, get) => {
  const initialFlow = convertGraphToFlow(STARTER_ARCHITECTURE);

  return {
    nodes: initialFlow.nodes,
    edges: initialFlow.edges,
    selectedNodeId: null,

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
      const newEdge: Edge = {
        ...connection,
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        type: 'animatedFlow',
        animated: true,
      };
      set({
        edges: addEdge(newEdge, get().edges),
      });
    },

    selectNode: (nodeId) => {
      set({ selectedNodeId: nodeId });
    },

    addNode: (type, position) => {
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
          config = DEFAULT_CONFIGS.database('replica', 'small');
          label = 'Read Replica';
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

      return archNode;
    },

    removeNode: (nodeId) => {
      set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== nodeId),
        edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      }));
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
    },

    setGraph: (graph) => {
      const flow = convertGraphToFlow(graph);
      set({ nodes: flow.nodes, edges: flow.edges });
    },

    resetToStarter: () => {
      const flow = convertGraphToFlow(STARTER_ARCHITECTURE);
      set({ nodes: flow.nodes, edges: flow.edges, selectedNodeId: null });
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
      }));

      return { nodes: archNodes, edges: archEdges };
    },
  };
});
