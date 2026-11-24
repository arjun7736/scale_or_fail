'use client';

import React from 'react';
import {
  Activity,
  Users,
  Gauge,
  AlertCircle,
  Clock,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  ChevronRight,
} from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';

export function TelemetrySidebar() {
  const isTelemetryOpen = useGameStore((s) => s.isTelemetryOpen);
  const toggleTelemetry = useGameStore((s) => s.toggleTelemetry);
  const systemMetrics = useGameStore((s) => s.systemMetrics);
  const alerts = useGameStore((s) => s.alerts);

  if (!isTelemetryOpen) return null;

  const concurrency = systemMetrics.inFlightRequests;
  const milestoneProgress = Math.min(100, Math.round((concurrency / 1000000) * 100));

  const errorRatePercent = (systemMetrics.errorRate * 100).toFixed(1);
  const isHealthy = systemMetrics.systemHealth === 'healthy';
  const isWarning = systemMetrics.systemHealth === 'warning';
  const isCritical = systemMetrics.systemHealth === 'critical' || systemMetrics.systemHealth === 'crashed';

  return (
    <div className="flex flex-col h-full bg-slate-900/95 border-l border-slate-800/80 w-72 select-none shrink-0 transition-all">
      {/* Header */}
      <div className="p-2.5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Live Telemetry
            </h2>
            <span
              className={`h-2 w-2 rounded-full ${
                isHealthy
                  ? 'bg-teal-400'
                  : isWarning
                  ? 'bg-amber-400'
                  : 'bg-rose-500 animate-ping'
              }`}
            />
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            STATUS: <span className="font-semibold uppercase text-slate-300">{systemMetrics.systemHealth}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right font-mono text-[10px]">
            <span className="text-slate-400">SLA: </span>
            <span className="text-teal-300 font-bold">{systemMetrics.slaUptimePercent}%</span>
          </div>
          <button
            onClick={toggleTelemetry}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Telemetry Panel (Ctrl+E)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {/* Hyperscale Milestone Gauge */}
        <div className="p-2 rounded-lg border border-sky-500/20 bg-sky-950/20 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-sky-300">
              <Users className="h-3.5 w-3.5" /> In-Flight Concurrency
            </div>
            <span className="text-[9px] font-mono text-sky-400">Target: 1M</span>
          </div>

          <div className="flex items-baseline justify-between font-mono">
            <div className="text-lg font-bold text-white tracking-tight">
              {concurrency.toLocaleString()}
            </div>
            <div className="text-[11px] text-sky-400 font-semibold">{milestoneProgress}%</div>
          </div>

          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-teal-400 transition-all duration-300"
              style={{ width: `${milestoneProgress}%` }}
            />
          </div>
          <p className="text-[9px] text-slate-400 leading-tight">
            Little&apos;s Law (L = λ · W): simultaneous requests in-system.
          </p>
        </div>

        {/* Traffic Throughput */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="p-2 rounded-lg border border-slate-800 bg-slate-950/40">
            <div className="text-[9px] uppercase font-mono text-slate-400">Incoming RPS</div>
            <div className="text-sm font-bold text-slate-100 font-mono mt-0.5">
              {systemMetrics.incomingRps.toLocaleString()}
            </div>
            <div className="text-[9px] text-slate-500 font-mono">Requests/sec</div>
          </div>

          <div className="p-2 rounded-lg border border-slate-800 bg-slate-950/40">
            <div className="text-[9px] uppercase font-mono text-slate-400">Succeeded</div>
            <div className="text-sm font-bold text-teal-400 font-mono mt-0.5">
              {systemMetrics.succeededRps.toLocaleString()}
            </div>
            <div className="text-[9px] text-slate-500 font-mono">200 OK</div>
          </div>
        </div>

        {/* Latency Cards */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="p-2 rounded-lg border border-slate-800 bg-slate-950/40">
            <div className="text-[9px] uppercase font-mono text-slate-400">Avg Latency</div>
            <div
              className={`text-sm font-bold font-mono mt-0.5 ${
                systemMetrics.avgLatencyMs > 1000
                  ? 'text-rose-400'
                  : systemMetrics.avgLatencyMs > 400
                  ? 'text-amber-400'
                  : 'text-slate-100'
              }`}
            >
              {systemMetrics.avgLatencyMs} ms
            </div>
            <div className="text-[9px] text-slate-500 font-mono">Target: &lt;400ms</div>
          </div>

          <div className="p-2 rounded-lg border border-slate-800 bg-slate-950/40">
            <div className="text-[9px] uppercase font-mono text-slate-400">p95 Latency</div>
            <div
              className={`text-sm font-bold font-mono mt-0.5 ${
                systemMetrics.p95LatencyMs > 2000
                  ? 'text-rose-400'
                  : systemMetrics.p95LatencyMs > 800
                  ? 'text-amber-400'
                  : 'text-slate-100'
              }`}
            >
              {systemMetrics.p95LatencyMs} ms
            </div>
            <div className="text-[9px] text-slate-500 font-mono">SLA: 3,000ms</div>
          </div>
        </div>

        {/* Error Rate Card */}
        <div className="p-2 rounded-lg border border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div>
            <div className="text-[9px] uppercase font-mono text-slate-400">Error Rate (5xx/429)</div>
            <div
              className={`text-sm font-bold font-mono mt-0.5 ${
                systemMetrics.errorRate > 0.1
                  ? 'text-rose-400'
                  : systemMetrics.errorRate > 0.02
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {errorRatePercent}%
            </div>
          </div>
          <div className="text-right font-mono text-[10px] text-slate-400">
            <div>{systemMetrics.failedRps.toLocaleString()} drops/s</div>
            <div className="text-[9px] text-slate-500">Max SLA: 5%</div>
          </div>
        </div>

        {/* Alerts & Events Feed */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Active Alerts & Events
            </span>
            <span className="text-[9px] font-mono text-slate-500">{alerts.length} events</span>
          </div>

          <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
            {alerts.length === 0 ? (
              <div className="text-center py-3 text-slate-500 text-xs font-mono">
                No active warnings
              </div>
            ) : (
              alerts.slice(0, 8).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-1.5 rounded-lg border text-xs font-mono transition-all ${
                    alert.severity === 'critical'
                      ? 'border-rose-500/40 bg-rose-950/20 text-rose-300'
                      : alert.severity === 'warning'
                      ? 'border-amber-500/40 bg-amber-950/20 text-amber-300'
                      : 'border-slate-800 bg-slate-950/50 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold flex items-center gap-1 text-[10px]">
                      {alert.severity === 'critical' ? (
                        <XCircle className="h-2.5 w-2.5 text-rose-400 shrink-0" />
                      ) : alert.severity === 'warning' ? (
                        <AlertTriangle className="h-2.5 w-2.5 text-amber-400 shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-2.5 w-2.5 text-teal-400 shrink-0" />
                      )}
                      <span className="truncate">{alert.title}</span>
                    </span>
                    <span className="text-[8px] text-slate-500 shrink-0">{alert.timestamp}</span>
                  </div>
                  <p className="text-[9px] leading-tight text-slate-300">{alert.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
