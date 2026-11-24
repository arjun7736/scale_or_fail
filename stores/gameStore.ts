import { create } from 'zustand';
import {
  ComponentLiveMetrics,
  DifficultyMode,
  EdgeLiveMetrics,
  PostmortemReport,
  SimulationTickOutput,
  SystemAlert,
  SystemMetrics,
} from '../packages/simulation/core/types';
import {
  diagnoseServerIncident,
  ServerIncidentDiagnosis,
} from '../packages/simulation/failures/diagnosis';
import { SimulationBridge } from '../lib/simulation-bridge';
import { useArchitectureStore, registerArchitectureEditListener } from './architectureStore';

export interface TelemetryDataPoint {
  time: string;
  tick: number;
  incomingRps: number;
  succeededRps: number;
  failedRps: number;
  inFlightRequests: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorRatePercent: number;
}

export interface GameState {
  gameStatus: 'idle' | 'running' | 'paused' | 'game_over';
  speed: number;
  difficulty: DifficultyMode;
  systemMetrics: SystemMetrics;
  componentMetrics: Record<string, ComponentLiveMetrics>;
  edgeMetrics: Record<string, EdgeLiveMetrics>;
  metricsHistory: TelemetryDataPoint[];
  alerts: SystemAlert[];
  postmortem: PostmortemReport | null;
  showPostmortem: boolean;
  showMilestone: boolean;
  activeContextualHint: string | null;
  activeIncident: ServerIncidentDiagnosis | null;
  autoPauseOnEdit: boolean;

  // Layout & UI Density Controls
  isToolboxOpen: boolean;
  isToolboxRail: boolean;
  isTelemetryOpen: boolean;
  bottomPanelMode: 'minimized' | 'compact' | 'expanded';

  bridge: SimulationBridge | null;

  // Actions
  initGame: () => void;
  startGame: () => void;
  pauseGame: () => void;
  togglePause: () => void;
  setAutoPauseOnEdit: (enabled: boolean) => void;
  toggleToolbox: () => void;
  toggleToolboxRail: () => void;
  toggleTelemetry: () => void;
  setBottomPanelMode: (mode: 'minimized' | 'compact' | 'expanded') => void;
  toggleBottomPanel: () => void;
  notifyArchitectureEdit: () => void;
  setSpeed: (speed: number) => void;
  setDifficulty: (mode: DifficultyMode) => void;
  restartGame: () => void;
  dismissPostmortem: () => void;
  dismissMilestone: () => void;
  dismissIncident: () => void;
  inspectIncidentNode: () => void;
  syncGraph: () => void;
  updateNodeConfigInGame: (nodeId: string, newConfig: any) => void;
}

const INITIAL_SYSTEM_METRICS: SystemMetrics = {
  tick: 0,
  simTimeSeconds: 0,
  incomingRps: 15,
  succeededRps: 15,
  failedRps: 0,
  inFlightRequests: 2,
  avgLatencyMs: 14,
  p95LatencyMs: 20,
  errorRate: 0,
  slaUptimePercent: 100,
  budgetRemaining: 500.0,
  operatingCostPerHour: 0.10,
  totalCostIncurred: 0,
  revenueEarned: 0,
  systemHealth: 'healthy',
  stage: 1,
  stageName: 'Startup',
  oneMillionMilestoneReached: false,
  consecutiveFailureSeconds: 0,
};

export const useGameStore = create<GameState>((set, get) => ({
  gameStatus: 'idle',
  speed: 1,
  difficulty: 'beginner',
  systemMetrics: INITIAL_SYSTEM_METRICS,
  componentMetrics: {},
  edgeMetrics: {},
  metricsHistory: [],
  alerts: [
    {
      id: 'welcome-1',
      tick: 0,
      timestamp: '00:00',
      severity: 'info',
      title: 'Welcome to Scale or Fail',
      message: 'Initial architecture deployed. Press Start to initiate client traffic generation.',
    },
  ],
  postmortem: null,
  showPostmortem: false,
  showMilestone: false,
  activeContextualHint: 'Tip: Traffic will increase steadily. Monitor App Server CPU and Database Connections.',
  activeIncident: null,
  autoPauseOnEdit: true,
  isToolboxOpen: true,
  isToolboxRail: false,
  isTelemetryOpen: true,
  bottomPanelMode: 'compact',
  bridge: null,

  initGame: () => {
    if (get().bridge) return;

    const graph = useArchitectureStore.getState().getArchitectureGraph();
    const bridge = new SimulationBridge(graph, 1337, get().difficulty);

    bridge.setCallbacks(
      (output: SimulationTickOutput) => {
        const timeStr = `${Math.floor(output.systemMetrics.simTimeSeconds / 60)
          .toString()
          .padStart(2, '0')}:${(output.systemMetrics.simTimeSeconds % 60)
          .toString()
          .padStart(2, '0')}`;

        const newPoint: TelemetryDataPoint = {
          time: timeStr,
          tick: output.systemMetrics.tick,
          incomingRps: output.systemMetrics.incomingRps,
          succeededRps: output.systemMetrics.succeededRps,
          failedRps: output.systemMetrics.failedRps,
          inFlightRequests: output.systemMetrics.inFlightRequests,
          avgLatencyMs: output.systemMetrics.avgLatencyMs,
          p95LatencyMs: output.systemMetrics.p95LatencyMs,
          errorRatePercent: Math.round(output.systemMetrics.errorRate * 1000) / 10,
        };

        // Contextual hint generator for Beginner Mode
        let contextualHint: string | null = null;
        if (get().difficulty === 'beginner') {
          const compMetrics = Object.values(output.componentMetrics);
          const overloadedServer = compMetrics.find(
            (c) => c.type === 'app_server' && c.cpuUtilization >= 80
          );
          const exhaustedDb = compMetrics.find(
            (c) => c.type === 'database' && (c.cpuUtilization >= 85 || c.connectionsActive >= c.connectionsMax * 0.8)
          );

          if (exhaustedDb) {
            contextualHint = '⚠️ Database IOPS or connection pool is near capacity! Consider adding a Redis Cache or Read Replica to offload read queries.';
          } else if (overloadedServer) {
            contextualHint = '⚠️ App Server CPU is high! Upgrade server tier or add a Load Balancer with multiple server replicas.';
          } else if (output.systemMetrics.inFlightRequests > 500000) {
            contextualHint = '🚀 Approaching Hyperscale! Keep latency low to maintain system stability.';
          }
        }

        const currentGraph = useArchitectureStore.getState().getArchitectureGraph();
        const incident = diagnoseServerIncident(currentGraph, output.componentMetrics, output.systemMetrics);

        set((state) => ({
          systemMetrics: output.systemMetrics,
          componentMetrics: output.componentMetrics,
          edgeMetrics: output.edgeMetrics || state.edgeMetrics,
          activeIncident: incident,
          metricsHistory: [...state.metricsHistory.slice(-59), newPoint],
          alerts: output.newAlerts.length > 0 ? [...output.newAlerts, ...state.alerts].slice(0, 50) : state.alerts,
          activeContextualHint: contextualHint || state.activeContextualHint,
        }));
      },
      (postmortem: PostmortemReport) => {
        set({
          gameStatus: 'game_over',
          postmortem,
          showPostmortem: true,
        });
      },
      (milestone: string) => {
        if (milestone === '1_MILLION_CONCURRENT') {
          set({ showMilestone: true });
        }
      }
    );

    set({ bridge });
  },

  startGame: () => {
    const { bridge } = get();
    if (!bridge) {
      get().initGame();
    }
    get().bridge?.start();
    set({ gameStatus: 'running' });
  },

  pauseGame: () => {
    get().bridge?.pause();
    set({ gameStatus: 'paused' });
  },

  togglePause: () => {
    const { gameStatus, startGame, pauseGame } = get();
    if (gameStatus === 'running') {
      pauseGame();
    } else {
      startGame();
    }
  },

  setAutoPauseOnEdit: (autoPauseOnEdit: boolean) => {
    set({ autoPauseOnEdit });
  },

  toggleToolbox: () => {
    set((s) => ({ isToolboxOpen: !s.isToolboxOpen }));
  },

  toggleToolboxRail: () => {
    set((s) => ({ isToolboxRail: !s.isToolboxRail }));
  },

  toggleTelemetry: () => {
    set((s) => ({ isTelemetryOpen: !s.isTelemetryOpen }));
  },

  setBottomPanelMode: (bottomPanelMode: 'minimized' | 'compact' | 'expanded') => {
    set({ bottomPanelMode });
  },

  toggleBottomPanel: () => {
    set((s) => ({
      bottomPanelMode: s.bottomPanelMode === 'minimized' ? 'compact' : 'minimized',
    }));
  },

  notifyArchitectureEdit: () => {
    const { gameStatus, autoPauseOnEdit, pauseGame, alerts } = get();
    if (autoPauseOnEdit && gameStatus === 'running') {
      pauseGame();
      const simSec = get().systemMetrics.simTimeSeconds;
      const timeStr = `${Math.floor(simSec / 60).toString().padStart(2, '0')}:${(simSec % 60).toString().padStart(2, '0')}`;
      const autoPauseAlert = {
        id: `auto-pause-${Date.now()}`,
        tick: get().systemMetrics.tick,
        timestamp: timeStr,
        severity: 'info' as const,
        title: 'Auto-Paused for Scaling',
        message: 'Simulation paused for architecture maintenance so you can add components and rewire connections safely without downtime. Press Space or Click Resume when ready.',
      };
      set({ alerts: [autoPauseAlert, ...alerts] });
    }
  },

  setSpeed: (speed: number) => {
    get().bridge?.setSpeed(speed);
    set({ speed });
  },

  setDifficulty: (difficulty: DifficultyMode) => {
    get().bridge?.setDifficulty(difficulty);
    set({ difficulty });
  },

  restartGame: () => {
    const { bridge } = get();
    useArchitectureStore.getState().resetToStarter();
    const starterGraph = useArchitectureStore.getState().getArchitectureGraph();

    bridge?.reset(starterGraph, Date.now());
    set({
      gameStatus: 'idle',
      systemMetrics: INITIAL_SYSTEM_METRICS,
      componentMetrics: {},
      metricsHistory: [],
      alerts: [
        {
          id: `restart-${Date.now()}`,
          tick: 0,
          timestamp: '00:00',
          severity: 'info',
          title: 'Simulation Reset',
          message: 'Architecture reset to starter topology. Ready to begin.',
        },
      ],
      postmortem: null,
      showPostmortem: false,
      showMilestone: false,
      activeContextualHint: 'Tip: Traffic will increase steadily. Monitor App Server CPU and Database Connections.',
      activeIncident: null,
    });
  },

  dismissPostmortem: () => {
    set({ showPostmortem: false });
  },

  dismissMilestone: () => {
    set({ showMilestone: false });
  },

  dismissIncident: () => {
    set({ activeIncident: null });
  },

  inspectIncidentNode: () => {
    const incident = get().activeIncident;
    if (incident?.crashedNodeId) {
      useArchitectureStore.getState().selectNode(incident.crashedNodeId);
    }
  },

  syncGraph: () => {
    const graph = useArchitectureStore.getState().getArchitectureGraph();
    get().bridge?.updateGraph(graph);
  },

  updateNodeConfigInGame: (nodeId: string, newConfig: any) => {
    useArchitectureStore.getState().updateNodeConfig(nodeId, newConfig);
    get().bridge?.updateNodeConfig(nodeId, newConfig);
  },
}));

// Automatically pause for safe maintenance when topology is edited
registerArchitectureEditListener(() => {
  useGameStore.getState().notifyArchitectureEdit();
});
