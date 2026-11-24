import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../core/engine';
import { STARTER_ARCHITECTURE } from '../scenarios/starter';

describe('Simulation Engine Determinism & Lifecycle', () => {
  it('should run deterministic ticks with reproducible metrics', () => {
    const engine1 = new SimulationEngine(STARTER_ARCHITECTURE, 42);
    const engine2 = new SimulationEngine(STARTER_ARCHITECTURE, 42);

    const out1 = engine1.tick();
    const out2 = engine2.tick();

    expect(out1.systemMetrics.incomingRps).toBe(out2.systemMetrics.incomingRps);
    expect(out1.systemMetrics.succeededRps).toBe(out2.systemMetrics.succeededRps);
    expect(out1.systemMetrics.stage).toBe(1);
    expect(out1.isGameOver).toBe(false);
  });

  it('should generate postmortem report when system collapses without upgrades', () => {
    const engine = new SimulationEngine(STARTER_ARCHITECTURE, 999);

    // Fast-forward ticks until traffic grows and un-upgraded single server collapses
    let isGameOver = false;
    let postmortem = undefined;

    for (let i = 0; i < 300; i++) {
      const output = engine.tick();
      if (output.isGameOver) {
        isGameOver = true;
        postmortem = output.postmortem;
        break;
      }
    }

    expect(isGameOver).toBe(true);
    expect(postmortem).toBeDefined();
    expect(postmortem?.rootCause).toBeTruthy();
    expect(postmortem?.recommendations.length).toBeGreaterThan(0);
  });
});
