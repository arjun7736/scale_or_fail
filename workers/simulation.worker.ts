import { SimulationEngine } from '../packages/simulation/core/engine';
import { ArchitectureGraph, DifficultyMode } from '../packages/simulation/core/types';
import { STARTER_ARCHITECTURE } from '../packages/simulation/scenarios/starter';

let engine: SimulationEngine = new SimulationEngine(STARTER_ARCHITECTURE, 1337);
let intervalId: any = null;
let currentSpeed: number = 1;
let isRunning: boolean = false;

function stepTick() {
  if (!engine) return;
  const output = engine.tick();

  self.postMessage({
    type: 'TICK_OUTPUT',
    payload: output,
  });

  if (output.milestoneJustReached) {
    self.postMessage({
      type: 'MILESTONE_REACHED',
      payload: '1_MILLION_CONCURRENT',
    });
  }

  if (output.isGameOver) {
    stopLoop();
    self.postMessage({
      type: 'GAME_OVER',
      payload: output.postmortem,
    });
  }
}

function startLoop() {
  if (intervalId) clearInterval(intervalId);
  isRunning = true;
  engine.start();
  // 1 tick = 1000ms / speed
  const intervalMs = Math.max(50, Math.floor(1000 / currentSpeed));
  intervalId = setInterval(stepTick, intervalMs);
}

function stopLoop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  isRunning = false;
  if (engine) engine.pause();
}

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'INIT': {
      const graph: ArchitectureGraph = payload.graph || STARTER_ARCHITECTURE;
      const seed: number = payload.seed || 1337;
      engine = new SimulationEngine(graph, seed);
      if (payload.difficulty) {
        engine.setDifficulty(payload.difficulty as DifficultyMode);
      }
      break;
    }
    case 'START': {
      startLoop();
      break;
    }
    case 'PAUSE': {
      stopLoop();
      break;
    }
    case 'SET_SPEED': {
      currentSpeed = payload.speed || 1;
      engine.setSpeed(currentSpeed);
      if (isRunning) {
        startLoop();
      }
      break;
    }
    case 'SET_DIFFICULTY': {
      if (payload) {
        engine.setDifficulty(payload as DifficultyMode);
      }
      break;
    }
    case 'RESET': {
      stopLoop();
      const seed = payload?.seed || 1337;
      engine.reset(seed);
      if (payload?.graph) {
        engine.setGraph(payload.graph);
      }
      break;
    }
    case 'UPDATE_GRAPH': {
      engine.setGraph(payload.graph);
      break;
    }
    case 'UPDATE_NODE_CONFIG': {
      engine.updateNodeConfig(payload.nodeId, payload.config);
      break;
    }
    case 'ADD_NODE': {
      engine.addNode(payload.node);
      break;
    }
    case 'REMOVE_NODE': {
      engine.removeNode(payload.nodeId);
      break;
    }
    case 'ADD_EDGE': {
      engine.addEdge(payload.edge);
      break;
    }
    case 'REMOVE_EDGE': {
      engine.removeEdge(payload.edgeId);
      break;
    }
    case 'MANUAL_TICK': {
      stepTick();
      break;
    }
  }
};
