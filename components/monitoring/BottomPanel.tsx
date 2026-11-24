'use client';

import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Activity,
  Clock,
  AlertOctagon,
  ListFilter,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Radio,
} from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';

export function BottomPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const metricsHistory = useGameStore((s) => s.metricsHistory);
  const alerts = useGameStore((s) => s.alerts);
  const activeHint = useGameStore((s) => s.activeContextualHint);
  const difficulty = useGameStore((s) => s.difficulty);
  const systemMetrics = useGameStore((s) => s.systemMetrics);

  const errorPercent = (systemMetrics.errorRate * 100).toFixed(1);
  const isHealthy = systemMetrics.systemHealth === 'healthy';

  return (
    <div className="border-t border-slate-800 bg-slate-950/95 flex flex-col transition-all duration-200 select-none shrink-0">
      {/* Top Header Bar */}
      <div className="h-9 px-4 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono bg-slate-900/40">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <Radio className={`h-3 w-3 ${isHealthy ? 'text-teal-400 animate-pulse' : 'text-rose-400 animate-ping'}`} />
            <span className="uppercase tracking-wider text-[11px]">System Observability</span>
          </div>

          <span className="hidden sm:inline-block text-slate-600">•</span>
          <span className="hidden sm:inline-block text-[11px] text-slate-400">
            Sim Time: <span className="text-slate-200 font-bold">{Math.floor(systemMetrics.simTimeSeconds / 60).toString().padStart(2, '0')}:{(systemMetrics.simTimeSeconds % 60).toString().padStart(2, '0')}</span>
          </span>
        </div>

        {/* Center Hint/Status Pill */}
        <div className="hidden lg:flex items-center">
          {difficulty === 'beginner' && activeHint && (
            <div className="flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px]">
              <Lightbulb className="h-3 w-3 text-emerald-400 shrink-0" />
              <span className="truncate max-w-lg">{activeHint}</span>
            </div>
          )}
          {difficulty === 'intermediate' && (
            <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-mono">
              <span>⚡ Intermediate Mode: Volatility ±15% • Diagnostic hints disabled</span>
            </div>
          )}
          {difficulty === 'expert' && (
            <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] font-mono">
              <span>🔥 Expert Mode: 2.2x Spikes • 5s SLA crash limit • Telemetry only</span>
            </div>
          )}
        </div>

        {/* Collapse / Expand Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title={isCollapsed ? 'Expand 4-Panel Telemetry' : 'Collapse Telemetry Panel'}
        >
          <span className="text-[10px] uppercase font-semibold">{isCollapsed ? 'Expand Telemetry' : 'Collapse'}</span>
          {isCollapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* 4-Panel Simultaneous Telemetry Grid */}
      {!isCollapsed && (
        <div className="h-56 p-2.5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5 bg-slate-900/40">
          
          {/* PANEL 1: Traffic Throughput (RPS) */}
          <div className="flex flex-col h-full rounded-xl border border-slate-800 bg-slate-950/80 p-2.5 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-800/80 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Activity className="h-3.5 w-3.5 text-sky-400" />
                <span>Traffic (RPS)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-sky-400 font-bold">{systemMetrics.incomingRps.toLocaleString()} in</span>
                <span className="text-slate-600">/</span>
                <span className="text-teal-400 font-bold">{systemMetrics.succeededRps.toLocaleString()} ok</span>
              </div>
            </div>

            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="succeededGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={9} tickLine={false} width={35} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '10px',
                      padding: '4px 8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="incomingRps"
                    stroke="#0ea5e9"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#trafficGradient)"
                    name="Incoming"
                  />
                  <Area
                    type="monotone"
                    dataKey="succeededRps"
                    stroke="#14b8a6"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#succeededGradient)"
                    name="Succeeded"
                  />
                  <Line
                    type="monotone"
                    dataKey="failedRps"
                    stroke="#f43f5e"
                    strokeWidth={1.5}
                    dot={false}
                    name="Failed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PANEL 2: Latency Curve (ms) */}
          <div className="flex flex-col h-full rounded-xl border border-slate-800 bg-slate-950/80 p-2.5 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-800/80 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span>Latency (ms)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-sky-300 font-bold">{systemMetrics.avgLatencyMs}ms avg</span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-400 font-bold">{systemMetrics.p95LatencyMs}ms p95</span>
              </div>
            </div>

            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metricsHistory} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={9} tickLine={false} width={35} unit="ms" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '10px',
                      padding: '4px 8px',
                    }}
                  />
                  <ReferenceLine
                    y={3000}
                    stroke="#f43f5e"
                    strokeDasharray="3 3"
                    label={{ value: '3s SLA', fill: '#f43f5e', fontSize: 9, position: 'top' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgLatencyMs"
                    stroke="#38bdf8"
                    strokeWidth={1.5}
                    dot={false}
                    name="Avg Latency"
                  />
                  <Line
                    type="monotone"
                    dataKey="p95LatencyMs"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    dot={false}
                    name="p95 Latency"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PANEL 3: Error Rate & SLA Compliance */}
          <div className="flex flex-col h-full rounded-xl border border-slate-800 bg-slate-950/80 p-2.5 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-800/80 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <AlertOctagon className="h-3.5 w-3.5 text-rose-400" />
                <span>Error Rate (%)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className={`font-bold ${parseFloat(errorPercent) > 5 ? 'text-rose-400 animate-pulse' : 'text-slate-300'}`}>
                  {errorPercent}% error
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-bold">{systemMetrics.slaUptimePercent.toFixed(1)}% SLA</span>
              </div>
            </div>

            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={9} tickLine={false} width={30} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '10px',
                      padding: '4px 8px',
                    }}
                  />
                  <ReferenceLine
                    y={5}
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                    label={{ value: '5% SLA Penalty', fill: '#f59e0b', fontSize: 9, position: 'top' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="errorRatePercent"
                    stroke="#f43f5e"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#errorGradient)"
                    name="Error Rate"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PANEL 4: Live Event Logs Stream */}
          <div className="flex flex-col h-full rounded-xl border border-slate-800 bg-slate-950/80 p-2.5 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-800/80 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <ListFilter className="h-3.5 w-3.5 text-indigo-400" />
                <span>Event Logs ({alerts.length})</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Live Stream</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-[10px] custom-scrollbar">
              {alerts.length === 0 ? (
                <div className="text-slate-500 text-center py-8">No alerts or events recorded yet.</div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-1.5 p-1.5 rounded bg-slate-900/70 border border-slate-800/60 leading-tight"
                  >
                    <span className="text-slate-500 shrink-0 text-[9px]">{alert.timestamp}</span>
                    <span
                      className={`px-1 py-0.2 rounded text-[9px] font-bold uppercase shrink-0 ${
                        alert.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : alert.severity === 'warning'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      }`}
                    >
                      {alert.severity === 'critical' ? 'CRIT' : alert.severity === 'warning' ? 'WARN' : 'INFO'}
                    </span>
                    <span className="text-slate-300 break-words flex-1">
                      <strong className="text-slate-100">{alert.title}: </strong>
                      {alert.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
