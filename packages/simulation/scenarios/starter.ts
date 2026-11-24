import { ArchitectureGraph } from '../core/types';
import { DEFAULT_CONFIGS } from '../models/economics';

export const STARTER_ARCHITECTURE: ArchitectureGraph = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      label: 'Global Clients',
      config: DEFAULT_CONFIGS.client(),
      position: { x: 80, y: 220 },
    },
    {
      id: 'app-1',
      type: 'app_server',
      label: 'App Server 1',
      config: DEFAULT_CONFIGS.app_server('small'),
      position: { x: 380, y: 220 },
    },
    {
      id: 'db-primary',
      type: 'database',
      label: 'PostgreSQL Primary',
      config: DEFAULT_CONFIGS.database('primary', 'small'),
      position: { x: 680, y: 220 },
    },
  ],
  edges: [
    {
      id: 'edge-client-to-app-1',
      source: 'client-1',
      target: 'app-1',
      label: 'HTTP Requests',
    },
    {
      id: 'edge-app-1-to-db',
      source: 'app-1',
      target: 'db-primary',
      label: 'SQL Queries',
    },
  ],
};
