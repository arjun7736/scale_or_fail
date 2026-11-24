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
} from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';

export function TelemetrySidebar() {
  const systemMetrics = useGameStore((s) => s.systemMetrics);
  const alerts = useGameStore((s) => s.alerts);

  const concurrency = systemMetrics.inFlightRequests;
  const milestoneProgress = Math.min(100, Math.round((concurrency / 1000000) * 100));

  const errorRatePercent = (systemMetrics.errorRate * 100).toFixed(1);
  const isHealthy = systemMetrics.systemHealth === 'healthy';
  const isWarning = systemMetrics.systemHealth === 'warning';
  const isCritical = systemMetrics.systemHealth === 'critical' || systemMetrics.systemHealth === 'crashed';

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border-l border-slate-800/80 w-80 select-none">
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Live Telemetry
          </h2>
          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
            <span
              className={`h-2 w-2 rounded-full ${
                isHealthy
                  ? 'bg-teal-400'
                  : isWarning
                  ? 'bg-amber-400'
                  : 'bg-rose-500 animate-ping'
              }`}
            />
            STATUS: <span className="font-semibold uppercase text-slate-300">{systemMetrics.systemHealth}</span>
          </div>
        </div>

        <div className="text-right font-mono text-[11px]">
          <span className="text-slate-400">SLA: </span>
          <span className="text-teal-300 font-bold">{systemMetrics.slaUptimePercent}%</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Hyperscale Milestone Gauge */}
        <div className="p-3 rounded-xl border border-sky-500/20 bg-sky-950/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
              <Users className="h-4 w-4" /> In-Flight Concurrency
            </div>
            <span className="text-[10px] font-mono text-sky-400">Target: 1,000,000</span>
          </div>

          <div className="flex items-baseline justify-between font-mono">
            <div className="text-xl font-bold text-white tracking-tight">
              {concurrency.toLocaleString()}
            </div>
            <div className="text-xs text-sky-400 font-semibold">{milestoneProgress}%</div>
          </div>

          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-teal-400 transition-all duration-300"
              style={{ width: `${milestoneProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Little&apos;s Law (L = λ · W): simultaneous requests in-system.
          </p>
        </div>

        {/* Traffic Throughput */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40">
            <div className="text-[10px] uppercase font-mono text-slate-400">Incoming RPS</div>
            <div className="text-base font-bold text-slate-100 font-mono mt-0.5">
              {systemMetrics.incomingRps.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Requests/sec</div>
          </div>

          <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40">
            <div className="text-[10px] uppercase font-mono text-slate-400">Succeeded</div>
            <div className="text-base font-bold text-teal-400 font-mono mt-0.5">
              {systemMetrics.succeededRps.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">200 OK</div>
          </div>
        </div>

        {/* Latency Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40">
            <div className="text-[10px] uppercase font-mono text-slate-400">Avg Latency</div>
            <div
              className={`text-base font-bold font-mono mt-0.5 ${
                systemMetrics.avgLatencyMs > 1000
                  ? 'text-rose-400'
                  : systemMetrics.avgLatencyMs > 400
                  ? 'text-amber-400'
                  : 'text-slate-100'
              }`}
            >
              {systemMetrics.avgLatencyMs} ms
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Target: &lt;400ms</div>
          </div>

          <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40">
            <div className="text-[10px] uppercase font-mono text-slate-400">p95 Latency</div>
            <div
              className={`text-base font-bold font-mono mt-0.5 ${
                systemMetrics.p95LatencyMs > 2000
                  ? 'text-rose-400'
                  : systemMetrics.p95LatencyMs > 800
                  ? 'text-amber-400'
                  : 'text-slate-100'
              }`}
            >
              {systemMetrics.p95LatencyMs} ms
            </div>
            <div className="text-[10px] text-slate-500 font-mono">SLA: 3,000ms</div>
          </div>
        </div>

        {/* Error Rate Card */}
        <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-mono text-slate-400">Error Rate (5xx/429)</div>
            <div
              className={`text-base font-bold font-mono mt-0.5 ${
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
          <div className="text-right font-mono text-[11px] text-slate-400">
            <div>{systemMetrics.failedRps.toLocaleString()} drops/s</div>
            <div className="text-[10px] text-slate-500">Max SLA: 5%</div>
          </div>
        </div>

        {/* Alerts & Events Feed */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Active Alerts & Events
            </span>
            <span className="text-[10px] font-mono text-slate-500">{alerts.length} events</span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <div className="text-center py-4 text-slate-500 text-xs font-mono">
                No active warnings
              </div>
            ) : (
              alerts.slice(0, 10).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-2 rounded-lg border text-xs font-mono transition-all ${
                    alert.severity === 'critical'
                      ? 'border-rose-500/40 bg-rose-950/20 text-rose-300'
                      : alert.severity === 'warning'
                      ? 'border-amber-500/40 bg-amber-950/20 text-amber-300'
                      : 'border-slate-800 bg-slate-950/50 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold flex items-center gap-1 text-[11px]">
                      {alert.severity === 'critical' ? (
                        <XCircle className="h-3 w-3 text-rose-400" />
                      ) : alert.severity === 'warning' ? (
                        <AlertTriangle className="h-3 w-3 text-amber-400" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 text-teal-400" />
                      )}
                      {alert.title}
                    </span>
                    <span className="text-[9px] text-slate-500">{alert.timestamp}</span>
                  </div>
                  <p className="text-[10px] leading-tight text-slate-300">{alert.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
