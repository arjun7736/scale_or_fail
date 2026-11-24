import { PRNG } from '../core/prng';

export interface StageDefinition {
  stageNumber: number;
  name: string;
  minDurationSeconds: number;
  baseRpsStart: number;
  baseRpsEnd: number;
  description: string;
  hasSpike: boolean;
  spikeSeconds?: number;
  spikeMultiplier?: number;
}

export const STAGE_DEFINITIONS: StageDefinition[] = [
  {
    stageNumber: 1,
    name: 'Startup',
    minDurationSeconds: 45,
    baseRpsStart: 15,
    baseRpsEnd: 60,
    description: 'Initial launch. Single app server and database. Low concurrency.',
    hasSpike: false,
  },
  {
    stageNumber: 2,
    name: 'Growth',
    minDurationSeconds: 60,
    baseRpsStart: 80,
    baseRpsEnd: 350,
    description: 'Product Hunt launch! Single-server CPU overload. Scale vertically or prepare horizontal replicas.',
    hasSpike: true,
    spikeSeconds: 30,
    spikeMultiplier: 1.4,
  },
  {
    stageNumber: 3,
    name: 'Viral Traffic',
    minDurationSeconds: 75,
    baseRpsStart: 500,
    baseRpsEnd: 2500,
    description: 'TechCrunch frontpage! Multi-instance horizontal scaling and Load Balancing required.',
    hasSpike: true,
    spikeSeconds: 40,
    spikeMultiplier: 1.6,
  },
  {
    stageNumber: 4,
    name: 'Database Bottleneck',
    minDurationSeconds: 90,
    baseRpsStart: 3000,
    baseRpsEnd: 15000,
    description: 'Database read IOPS saturated! App servers stalling. Add Redis caching or DB Read Replicas.',
    hasSpike: true,
    spikeSeconds: 50,
    spikeMultiplier: 1.5,
  },
  {
    stageNumber: 5,
    name: 'Production Scale',
    minDurationSeconds: 90,
    baseRpsStart: 18000,
    baseRpsEnd: 60000,
    description: 'Database connection pool exhaustion and worker queue delays. Tune pools and message queues.',
    hasSpike: true,
    spikeSeconds: 45,
    spikeMultiplier: 1.4,
  },
  {
    stageNumber: 6,
    name: 'Distributed Systems',
    minDurationSeconds: 100,
    baseRpsStart: 70000,
    baseRpsEnd: 250000,
    description: 'Enterprise scale. High throughput and redundancy test across load balancers and replicas.',
    hasSpike: true,
    spikeSeconds: 50,
    spikeMultiplier: 1.5,
  },
  {
    stageNumber: 7,
    name: 'Hyperscale',
    minDurationSeconds: 120,
    baseRpsStart: 300000,
    baseRpsEnd: 850000,
    description: 'Hyperscale surge aiming for the 1,000,000 concurrent in-flight requests milestone!',
    hasSpike: true,
    spikeSeconds: 60,
    spikeMultiplier: 1.6,
  },
  {
    stageNumber: 8,
    name: 'Endless Survival',
    minDurationSeconds: 999999,
    baseRpsStart: 900000,
    baseRpsEnd: 5000000,
    description: 'Beyond hyperscale. Continuous traffic expansion and stochastic stress tests.',
    hasSpike: true,
    spikeSeconds: 60,
    spikeMultiplier: 1.7,
  },
];

export class TrafficGenerator {
  private prng: PRNG;

  constructor(seed: number = 1337) {
    this.prng = new PRNG(seed);
  }

  /**
   * Calculates traffic parameters for a given simulation elapsed time in seconds.
   */
  getTrafficForTick(simSeconds: number): {
    incomingRps: number;
    stage: number;
    stageName: string;
    isSpikeActive: boolean;
  } {
    let accumulatedTime = 0;
    let currentStage = STAGE_DEFINITIONS[STAGE_DEFINITIONS.length - 1];

    for (const stageDef of STAGE_DEFINITIONS) {
      if (simSeconds < accumulatedTime + stageDef.minDurationSeconds) {
        currentStage = stageDef;
        break;
      }
      accumulatedTime += stageDef.minDurationSeconds;
    }

    const stageElapsed = Math.max(0, simSeconds - accumulatedTime);
    const stageProgress = Math.min(1.0, stageElapsed / currentStage.minDurationSeconds);

    // Linear interpolation between baseRpsStart and baseRpsEnd
    let baseRps =
      currentStage.baseRpsStart +
      (currentStage.baseRpsEnd - currentStage.baseRpsStart) * stageProgress;

    // Add organic wave variation (simulated micro-fluctuation)
    const wave = Math.sin(simSeconds * 0.15) * 0.08 + Math.cos(simSeconds * 0.05) * 0.05;
    baseRps *= 1 + wave;

    // Check for stage traffic spike
    let isSpikeActive = false;
    if (currentStage.hasSpike && currentStage.spikeSeconds && currentStage.spikeMultiplier) {
      const spikeStart = currentStage.minDurationSeconds * 0.45;
      const spikeEnd = spikeStart + currentStage.spikeSeconds;
      if (stageElapsed >= spikeStart && stageElapsed <= spikeEnd) {
        isSpikeActive = true;
        // Bell-shaped spike multiplier
        const spikeProgress = (stageElapsed - spikeStart) / (spikeEnd - spikeStart);
        const spikePeak = Math.sin(spikeProgress * Math.PI);
        const addedSpike = (currentStage.spikeMultiplier - 1.0) * spikePeak;
        baseRps *= 1.0 + addedSpike;
      }
    }

    // Add deterministic micro-jitter (±3%)
    const jitter = (this.prng.next() - 0.5) * 0.06;
    const finalRps = Math.max(1, Math.round(baseRps * (1 + jitter)));

    return {
      incomingRps: finalRps,
      stage: currentStage.stageNumber,
      stageName: currentStage.name,
      isSpikeActive,
    };
  }

  reset(seed: number = 1337): void {
    this.prng.reset(seed);
  }
}
