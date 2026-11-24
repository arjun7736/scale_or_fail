import {
  ArchitectureGraph,
  ArchitectureNode,
  ArchitectureEdge,
  ComponentLiveMetrics,
  ComponentType,
  DifficultyMode,
  PostmortemReport,
  SimulationTickOutput,
  SystemAlert,
  SystemMetrics,
} from './types';
import { TrafficGenerator } from '../traffic/generator';
import { decomposeTraffic } from '../traffic/request-mix';
import { routeTrafficThroughGraph } from '../routing/traffic-router';
import { FailureDetector } from '../failures/detector';
import { ECONOMICS_CONSTANTS } from '../models/economics';

export class SimulationEngine {
  private graph: ArchitectureGraph;
  private trafficGenerator: TrafficGenerator;
  private failureDetector: FailureDetector;
  private tickCount: number = 0;
  private simSeconds: number = 0;
  private isRunning: boolean = false;
  private isGameOver: boolean = false;
  private speedMultiplier: number = 1;
  private difficulty: DifficultyMode = 'beginner';

  private budgetRemaining: number = ECONOMICS_CONSTANTS.INITIAL_BUDGET;
  private totalCostIncurred: number = 0;
  private totalRevenueEarned: number = 0;
  private successfulRequestsTotal: number = 0;
  private failedRequestsTotal: number = 0;
  private oneMillionMilestoneReached: boolean = false;

  private activeAlerts: SystemAlert[] = [];
  private lastTickOutput: SimulationTickOutput | null = null;
  private listeners: ((output: SimulationTickOutput) => void)[] = [];

  constructor(initialGraph: ArchitectureGraph, seed: number = 1337) {
    this.graph = JSON.parse(JSON.stringify(initialGraph));
    this.trafficGenerator = new TrafficGenerator(seed);
    this.failureDetector = new FailureDetector();
  }

  /**
   * Advances the simulation by 1 discrete time tick (1 second of sim time).
   */
  tick(): SimulationTickOutput {
    if (this.isGameOver) {
      if (this.lastTickOutput) return this.lastTickOutput;
    }

    this.tickCount++;
    this.simSeconds++;

    // 1. Calculate incoming traffic for this tick
    const trafficInfo = this.trafficGenerator.getTrafficForTick(this.simSeconds, this.difficulty);
    const decomposed = decomposeTraffic(trafficInfo.incomingRps);

    // 2. Route traffic through architecture graph
    const routeResult = routeTrafficThroughGraph(
      this.graph,
      decomposed,
      this.simSeconds,
      this.lastTickOutput?.componentMetrics
    );

    // 3. Financial calculations
    let totalCostPerHour = 0;
    for (const node of this.graph.nodes) {
      totalCostPerHour += node.config.costPerHour || 0;
    }
    const tickCost = totalCostPerHour / 3600;
    this.totalCostIncurred += tickCost;
    this.budgetRemaining -= tickCost;

    const succeededThisTick = routeResult.systemMetricsPartial.succeededRps || 0;
    const failedThisTick = routeResult.systemMetricsPartial.failedRps || 0;
    this.successfulRequestsTotal += succeededThisTick;
    this.failedRequestsTotal += failedThisTick;

    // Revenue generation
    const rawRevenueThisTick =
      (succeededThisTick / 10000) * ECONOMICS_CONSTANTS.REVENUE_PER_10K_SUCCESSFUL_REQUESTS;
    const errorRate = routeResult.systemMetricsPartial.errorRate || 0;
    const revenuePenalty =
      errorRate > ECONOMICS_CONSTANTS.SLA_PENALTY_THRESHOLD_ERROR_RATE
        ? ECONOMICS_CONSTANTS.SLA_PENALTY_MULTIPLIER
        : 1.0;
    const revenueThisTick = rawRevenueThisTick * revenuePenalty;
    this.totalRevenueEarned += revenueThisTick;
    this.budgetRemaining += revenueThisTick;

    // 4. Calculate SLA uptime
    const totalRequests = this.successfulRequestsTotal + this.failedRequestsTotal;
    const slaUptimePercent =
      totalRequests > 0
        ? Math.max(0, Math.min(100, Math.round((this.successfulRequestsTotal / totalRequests) * 10000) / 100))
        : 100;

    // 5. Milestone check: 1 Million simultaneous in-flight requests!
    let milestoneJustReached = false;
    const currentInFlight = routeResult.systemMetricsPartial.inFlightRequests || 0;
    if (
      !this.oneMillionMilestoneReached &&
      currentInFlight >= 1000000 &&
      errorRate < 0.20
    ) {
      this.oneMillionMilestoneReached = true;
      milestoneJustReached = true;
    }

    // 6. Generate alerts & bottleneck warnings
    const newAlerts: SystemAlert[] = [];
    this.generateAlertsForTick(routeResult.componentMetrics, routeResult.bottleneckReason, newAlerts);

    // 7. Assemble system metrics
    const systemMetrics: SystemMetrics = {
      tick: this.tickCount,
      simTimeSeconds: this.simSeconds,
      incomingRps: trafficInfo.incomingRps,
      succeededRps: succeededThisTick,
      failedRps: failedThisTick,
      inFlightRequests: currentInFlight,
      avgLatencyMs: routeResult.systemMetricsPartial.avgLatencyMs || 10,
      p95LatencyMs: routeResult.systemMetricsPartial.p95LatencyMs || 15,
      errorRate,
      slaUptimePercent,
      budgetRemaining: Math.round(this.budgetRemaining * 100) / 100,
      operatingCostPerHour: Math.round(totalCostPerHour * 100) / 100,
      totalCostIncurred: Math.round(this.totalCostIncurred * 100) / 100,
      revenueEarned: Math.round(this.totalRevenueEarned * 100) / 100,
      systemHealth: routeResult.systemMetricsPartial.systemHealth || 'healthy',
      stage: trafficInfo.stage,
      stageName: trafficInfo.stageName,
      oneMillionMilestoneReached: this.oneMillionMilestoneReached,
      consecutiveFailureSeconds: 0,
    };

    // 8. Failure & Game Over Evaluation
    const failureCheck = this.failureDetector.recordTick(
      this.tickCount,
      this.simSeconds,
      systemMetrics,
      routeResult.componentMetrics,
      newAlerts,
      this.difficulty
    );

    let postmortem: PostmortemReport | undefined;
    if (failureCheck.isGameOver) {
      this.isGameOver = true;
      this.isRunning = false;
      postmortem = this.failureDetector.generatePostmortem(
        this.simSeconds,
        this.graph,
        systemMetrics,
        routeResult.componentMetrics
      );
    }

    const output: SimulationTickOutput = {
      systemMetrics,
      componentMetrics: routeResult.componentMetrics,
      edgeMetrics: routeResult.edgeMetrics,
      newAlerts,
      isGameOver: this.isGameOver,
      postmortem,
      milestoneJustReached,
    };

    this.lastTickOutput = output;
    this.notifyListeners(output);
    return output;
  }

  private generateAlertsForTick(
    componentMetrics: Record<string, ComponentLiveMetrics>,
    bottleneckReason: string | undefined,
    alertsOut: SystemAlert[]
  ): void {
    const timeStr = `${Math.floor(this.simSeconds / 60)
      .toString()
      .padStart(2, '0')}:${(this.simSeconds % 60).toString().padStart(2, '0')}`;

    for (const [nodeId, metrics] of Object.entries(componentMetrics)) {
      if (metrics.health === 'critical' || metrics.cpuUtilization >= 95) {
        alertsOut.push({
          id: `${nodeId}-${this.tickCount}`,
          tick: this.tickCount,
          timestamp: timeStr,
          severity: 'critical',
          nodeId,
          nodeType: metrics.type,
          title: `${metrics.type.toUpperCase()} Overloaded`,
          message: metrics.statusMessage || `Resource saturation at ${metrics.cpuUtilization}%`,
          remedy: 'Scale instance tier or add horizontal replicas.',
        });
      } else if (metrics.health === 'warning') {
        alertsOut.push({
          id: `${nodeId}-${this.tickCount}`,
          tick: this.tickCount,
          timestamp: timeStr,
          severity: 'warning',
          nodeId,
          nodeType: metrics.type,
          title: `${metrics.type.toUpperCase()} Elevated Load`,
          message: metrics.statusMessage || `Utilization reached ${metrics.cpuUtilization}%`,
        });
      }
    }

    if (bottleneckReason) {
      alertsOut.push({
        id: `bottleneck-${this.tickCount}`,
        tick: this.tickCount,
        timestamp: timeStr,
        severity: 'warning',
        title: 'System Bottleneck Detected',
        message: bottleneckReason,
      });
    }

    // Keep active alerts bounded
    this.activeAlerts = [...alertsOut, ...this.activeAlerts].slice(0, 50);
  }

  /**
   * Graph modifications
   */
  setGraph(newGraph: ArchitectureGraph): void {
    this.graph = JSON.parse(JSON.stringify(newGraph));
  }

  getGraph(): ArchitectureGraph {
    return JSON.parse(JSON.stringify(this.graph));
  }

  updateNodeConfig(nodeId: string, newConfig: Partial<ArchitectureNode['config']>): void {
    const node = this.graph.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.config = { ...node.config, ...newConfig } as any;
    }
  }

  addNode(node: ArchitectureNode): void {
    if (!this.graph.nodes.find((n) => n.id === node.id)) {
      this.graph.nodes.push(node);
    }
  }

  removeNode(nodeId: string): void {
    this.graph.nodes = this.graph.nodes.filter((n) => n.id !== nodeId);
    this.graph.edges = this.graph.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
  }

  addEdge(edge: ArchitectureEdge): void {
    if (!this.graph.edges.find((e) => e.id === edge.id || (e.source === edge.source && e.target === edge.target))) {
      this.graph.edges.push(edge);
    }
  }

  removeEdge(edgeId: string): void {
    this.graph.edges = this.graph.edges.filter((e) => e.id !== edgeId);
  }

  /**
   * Simulation state controls
   */
  start(): void {
    this.isRunning = true;
  }

  pause(): void {
    this.isRunning = false;
  }

  setSpeed(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }

  getSpeed(): number {
    return this.speedMultiplier;
  }

  setDifficulty(mode: DifficultyMode): void {
    this.difficulty = mode;
  }

  getDifficulty(): DifficultyMode {
    return this.difficulty;
  }

  reset(newSeed: number = 1337): void {
    this.tickCount = 0;
    this.simSeconds = 0;
    this.isRunning = false;
    this.isGameOver = false;
    this.budgetRemaining = ECONOMICS_CONSTANTS.INITIAL_BUDGET;
    this.totalCostIncurred = 0;
    this.totalRevenueEarned = 0;
    this.successfulRequestsTotal = 0;
    this.failedRequestsTotal = 0;
    this.oneMillionMilestoneReached = false;
    this.activeAlerts = [];
    this.lastTickOutput = null;
    this.trafficGenerator.reset(newSeed);
    this.failureDetector.reset();
  }

  subscribe(listener: (output: SimulationTickOutput) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(output: SimulationTickOutput): void {
    for (const listener of this.listeners) {
      listener(output);
    }
  }
}
