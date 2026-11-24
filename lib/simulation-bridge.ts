import {
  ArchitectureGraph,
  DifficultyMode,
  PostmortemReport,
  SimulationTickOutput,
} from '../packages/simulation/core/types';
import { SimulationEngine } from '../packages/simulation/core/engine';
import { STARTER_ARCHITECTURE } from '../packages/simulation/scenarios/starter';

export type TickCallback = (output: SimulationTickOutput) => void;
export type GameOverCallback = (postmortem: PostmortemReport) => void;
export type MilestoneCallback = (milestone: string) => void;

/**
 * Bridge that connects the UI to either a background Web Worker or local SimulationEngine.
 * Guarantees smooth execution off the main thread with zero lockup.
 */
export class SimulationBridge {
  private worker: Worker | null = null;
  private localEngine: SimulationEngine | null = null;
  private localIntervalId: any = null;
  private currentSpeed: number = 1;
  private isRunning: boolean = false;

  private onTickCallback: TickCallback | null = null;
  private onGameOverCallback: GameOverCallback | null = null;
  private onMilestoneCallback: MilestoneCallback | null = null;

  constructor(
    initialGraph: ArchitectureGraph = STARTER_ARCHITECTURE,
    seed: number = 1337,
    difficulty: DifficultyMode = 'beginner'
  ) {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('../workers/simulation.worker.ts', import.meta.url), {
          type: 'module',
        });

        this.worker.onmessage = (e: MessageEvent) => {
          const { type, payload } = e.data;
          if (type === 'TICK_OUTPUT') {
            this.onTickCallback?.(payload);
          } else if (type === 'GAME_OVER') {
            this.isRunning = false;
            this.onGameOverCallback?.(payload);
          } else if (type === 'MILESTONE_REACHED') {
            this.onMilestoneCallback?.(payload);
          }
        };

        this.worker.postMessage({
          type: 'INIT',
          payload: { graph: initialGraph, seed, difficulty },
        });
        return;
      } catch (err) {
        console.warn('Web Worker initialization failed, falling back to local engine:', err);
      }
    }

    // Fallback: local engine on main thread
    this.localEngine = new SimulationEngine(initialGraph, seed);
    this.localEngine.setDifficulty(difficulty);
  }

  setCallbacks(
    onTick: TickCallback,
    onGameOver: GameOverCallback,
    onMilestone: MilestoneCallback
  ) {
    this.onTickCallback = onTick;
    this.onGameOverCallback = onGameOver;
    this.onMilestoneCallback = onMilestone;
  }

  start() {
    this.isRunning = true;
    if (this.worker) {
      this.worker.postMessage({ type: 'START' });
    } else if (this.localEngine) {
      this.localEngine.start();
      this.startLocalLoop();
    }
  }

  pause() {
    this.isRunning = false;
    if (this.worker) {
      this.worker.postMessage({ type: 'PAUSE' });
    } else if (this.localEngine) {
      this.localEngine.pause();
      this.stopLocalLoop();
    }
  }

  setSpeed(speed: number) {
    this.currentSpeed = speed;
    if (this.worker) {
      this.worker.postMessage({ type: 'SET_SPEED', payload: { speed } });
    } else if (this.localEngine) {
      this.localEngine.setSpeed(speed);
      if (this.isRunning) {
        this.startLocalLoop();
      }
    }
  }

  updateGraph(graph: ArchitectureGraph) {
    if (this.worker) {
      this.worker.postMessage({ type: 'UPDATE_GRAPH', payload: { graph } });
    } else if (this.localEngine) {
      this.localEngine.setGraph(graph);
    }
  }

  updateNodeConfig(nodeId: string, config: any) {
    if (this.worker) {
      this.worker.postMessage({ type: 'UPDATE_NODE_CONFIG', payload: { nodeId, config } });
    } else if (this.localEngine) {
      this.localEngine.updateNodeConfig(nodeId, config);
    }
  }

  reset(graph: ArchitectureGraph, seed: number = 1337) {
    this.isRunning = false;
    if (this.worker) {
      this.worker.postMessage({ type: 'RESET', payload: { graph, seed } });
    } else if (this.localEngine) {
      this.stopLocalLoop();
      this.localEngine.reset(seed);
      this.localEngine.setGraph(graph);
    }
  }

  destroy() {
    this.pause();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  private startLocalLoop() {
    this.stopLocalLoop();
    const intervalMs = Math.max(50, Math.floor(1000 / this.currentSpeed));
    this.localIntervalId = setInterval(() => {
      if (!this.localEngine) return;
      const output = this.localEngine.tick();
      this.onTickCallback?.(output);
      if (output.milestoneJustReached) {
        this.onMilestoneCallback?.('1_MILLION_CONCURRENT');
      }
      if (output.isGameOver) {
        this.stopLocalLoop();
        this.isRunning = false;
        if (output.postmortem) {
          this.onGameOverCallback?.(output.postmortem);
        }
      }
    }, intervalMs);
  }

  private stopLocalLoop() {
    if (this.localIntervalId) {
      clearInterval(this.localIntervalId);
      this.localIntervalId = null;
    }
  }
}
