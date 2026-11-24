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
  Radio,
} from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';

export function BottomPanel() {
  const [mobileTab, setMobileTab] = useState<'traffic' | 'latency' | 'errors' | 'logs'>('traffic');

  const bottomPanelMode = useGameStore((s) => s.bottomPanelMode);
  const setBottomPanelMode = useGameStore((s) => s.setBottomPanelMode);

  const metricsHistory = useGameStore((s) => s.metricsHistory);
  const alerts = useGameStore((s) => s.alerts);
  const activeHint = useGameStore((s) => s.activeContextualHint);
  const difficulty = useGameStore((s) => s.difficulty);
  const systemMetrics = useGameStore((s) => s.systemMetrics);

  const errorPercent = (systemMetrics.errorRate * 100).toFixed(1);
  const isHealthy = systemMetrics.systemHealth === 'healthy';

  const isMinimized = bottomPanelMode === 'minimized';
  const isCompact = bottomPanelMode === 'compact';
  const isExpanded = bottomPanelMode === 'expanded';

  // Component definition for Panel 1: Traffic
  const renderTrafficPanel = () => (
    <div className="flex flex-col h-full rounded-lg border border-slate-800 bg-slate-950/80 p-2 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between pb-1 mb-0.5 border-b border-slate-800/80 text-[10px] font-mono">
        <div className="flex items-center gap-1 font-semibold text-slate-200">
          <Activity className="h-3 w-3 text-sky-400" />
          <span>Traffic (RPS)</span>
        </div>
        <div className="flex items-center gap-1 text-[9px]">
          <span className="text-sky-400 font-bold">{systemMetrics.incomingRps.toLocaleString()} in</span>
          <span className="text-slate-600">/</span>
          <span className="text-teal-400 font-bold">{systemMetrics.succeededRps.toLocaleString()} ok</span>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={metricsHistory} margin={{ top: 2, right: 4, left: -25, bottom: 0 }}>
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
            <XAxis dataKey="time" stroke="#475569" fontSize={8} tickLine={false} />
            <YAxis stroke="#475569" fontSize={8} tickLine={false} width={30} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '6px',
                fontSize: '9px',
                padding: '3px 6px',
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
  );

  // Component definition for Panel 2: Latency
  const renderLatencyPanel = () => (
    <div className="flex flex-col h-full rounded-lg border border-slate-800 bg-slate-950/80 p-2 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between pb-1 mb-0.5 border-b border-slate-800/80 text-[10px] font-mono">
        <div className="flex items-center gap-1 font-semibold text-slate-200">
          <Clock className="h-3 w-3 text-amber-400" />
          <span>Latency (ms)</span>
        </div>
        <div className="flex items-center gap-1 text-[9px]">
          <span className="text-sky-300 font-bold">{systemMetrics.avgLatencyMs}ms avg</span>
          <span className="text-slate-600">•</span>
          <span className="text-amber-400 font-bold">{systemMetrics.p95LatencyMs}ms p95</span>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={metricsHistory} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="time" stroke="#475569" fontSize={8} tickLine={false} />
            <YAxis stroke="#475569" fontSize={8} tickLine={false} width={30} unit="ms" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '6px',
                fontSize: '9px',
                padding: '3px 6px',
              }}
            />
            <ReferenceLine
              y={3000}
              stroke="#f43f5e"
              strokeDasharray="3 3"
              label={{ value: '3s SLA', fill: '#f43f5e', fontSize: 8, position: 'top' }}
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
  );

  // Component definition for Panel 3: Error Rate
  const renderErrorPanel = () => (
    <div className="flex flex-col h-full rounded-lg border border-slate-800 bg-slate-950/80 p-2 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between pb-1 mb-0.5 border-b border-slate-800/80 text-[10px] font-mono">
        <div className="flex items-center gap-1 font-semibold text-slate-200">
          <AlertOctagon className="h-3 w-3 text-rose-400" />
          <span>Error Rate (%)</span>
        </div>
        <div className="flex items-center gap-1 text-[9px]">
          <span className={`font-bold ${parseFloat(errorPercent) > 5 ? 'text-rose-400 animate-pulse' : 'text-slate-300'}`}>
            {errorPercent}% error
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400 font-bold">{systemMetrics.slaUptimePercent.toFixed(1)}% SLA</span>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={metricsHistory} margin={{ top: 2, right: 4, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" stroke="#475569" fontSize={8} tickLine={false} />
            <YAxis stroke="#475569" fontSize={8} tickLine={false} width={25} unit="%" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '6px',
                fontSize: '9px',
                padding: '3px 6px',
              }}
            />
            <ReferenceLine
              y={5}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              label={{ value: '5% SLA', fill: '#f59e0b', fontSize: 8, position: 'top' }}
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
  );

  // Component definition for Panel 4: Logs
  const renderLogsPanel = () => (
    <div className="flex flex-col h-full rounded-lg border border-slate-800 bg-slate-950/80 p-2 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between pb-1 mb-0.5 border-b border-slate-800/80 text-[10px] font-mono">
        <div className="flex items-center gap-1 font-semibold text-slate-200">
          <ListFilter className="h-3 w-3 text-indigo-400" />
          <span>Event Logs ({alerts.length})</span>
        </div>
        <span className="text-[9px] text-slate-500 font-mono">Live</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 font-mono text-[9px]">
        {alerts.length === 0 ? (
          <div className="text-slate-500 text-center py-4">No events yet.</div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-1 p-1 rounded bg-slate-900/70 border border-slate-800/60 leading-tight"
            >
              <span className="text-slate-500 shrink-0 text-[8px]">{alert.timestamp}</span>
              <span
                className={`px-1 py-0.2 rounded text-[8px] font-bold uppercase shrink-0 ${
                  alert.severity === 'critical'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : alert.severity === 'warning'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                }`}
              >
                {alert.severity === 'critical' ? 'CRIT' : alert.severity === 'warning' ? 'WARN' : 'INFO'}
              </span>
              <span className="text-slate-300 break-words flex-1 truncate">
                <strong className="text-slate-200">{alert.title}: </strong>
                {alert.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="border-t border-slate-800 bg-slate-950/95 flex flex-col transition-all duration-200 select-none shrink-0">
      {/* Top Header Bar */}
      <div className="h-8 px-2.5 sm:px-3 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono bg-slate-900/50">
        {/* Left: Health & Sim Time */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 font-bold text-slate-200">
            <Radio className={`h-3 w-3 ${isHealthy ? 'text-teal-400 animate-pulse' : 'text-rose-400 animate-ping'}`} />
            <span className="uppercase tracking-wider text-[10px]">Observability</span>
          </div>

          <span className="text-slate-600 hidden xs:inline">•</span>
          <span className="text-[10px] text-slate-400 hidden xs:inline">
            Sim: <span className="text-slate-200 font-bold">{Math.floor(systemMetrics.simTimeSeconds / 60).toString().padStart(2, '0')}:{(systemMetrics.simTimeSeconds % 60).toString().padStart(2, '0')}</span>
          </span>

          {/* Minimized Live Ticker Badges */}
          {isMinimized && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800 text-[9px] sm:text-[10px] font-mono">
              <span className="text-sky-400 font-medium">
                {systemMetrics.incomingRps.toLocaleString()} RPS
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400 font-medium hidden sm:inline">
                {systemMetrics.avgLatencyMs}ms
              </span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className={`${parseFloat(errorPercent) > 5 ? 'text-rose-400' : 'text-emerald-400'} font-medium`}>
                {errorPercent}% err
              </span>
            </div>
          )}
        </div>

        {/* Center Hint/Status Pill (Desktop only) */}
        <div className="hidden lg:flex items-center">
          {difficulty === 'beginner' && activeHint && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px]">
              <Lightbulb className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
              <span className="truncate max-w-md">{activeHint}</span>
            </div>
          )}
          {difficulty === 'intermediate' && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-mono">
              <span>⚡ Intermediate: Volatility ±15%</span>
            </div>
          )}
          {difficulty === 'expert' && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-mono">
              <span>🔥 Expert: 2.2x Spikes • 5s SLA Crash Limit</span>
            </div>
          )}
        </div>

        {/* 3-Mode Segmented Control */}
        <div className="flex items-center bg-slate-900 rounded border border-slate-800 p-0.5 text-[9px] font-mono">
          <button
            onClick={() => setBottomPanelMode('minimized')}
            className={`px-1.5 py-0.5 rounded transition-all ${
              isMinimized
                ? 'bg-slate-700 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Minimize to single status bar"
          >
            Min
          </button>
          <button
            onClick={() => setBottomPanelMode('compact')}
            className={`px-1.5 py-0.5 rounded transition-all ${
              isCompact
                ? 'bg-teal-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Compact view"
          >
            Compact
          </button>
          <button
            onClick={() => setBottomPanelMode('expanded')}
            className={`px-1.5 py-0.5 rounded transition-all ${
              isExpanded
                ? 'bg-slate-700 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Full height view"
          >
            Full
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {!isMinimized && (
        <div className="flex flex-col">
          {/* Mobile Tab Switcher (Visible on mobile only) */}
          <div className="flex md:hidden items-center justify-between px-2 py-1 bg-slate-900/90 border-b border-slate-800 text-[10px] font-mono">
            <div className="flex items-center gap-1 w-full justify-around">
              <button
                onClick={() => setMobileTab('traffic')}
                className={`px-2 py-0.5 rounded transition-all ${
                  mobileTab === 'traffic'
                    ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40'
                    : 'text-slate-400'
                }`}
              >
                Traffic
              </button>
              <button
                onClick={() => setMobileTab('latency')}
                className={`px-2 py-0.5 rounded transition-all ${
                  mobileTab === 'latency'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                    : 'text-slate-400'
                }`}
              >
                Latency
              </button>
              <button
                onClick={() => setMobileTab('errors')}
                className={`px-2 py-0.5 rounded transition-all ${
                  mobileTab === 'errors'
                    ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                    : 'text-slate-400'
                }`}
              >
                Errors
              </button>
              <button
                onClick={() => setMobileTab('logs')}
                className={`px-2 py-0.5 rounded transition-all ${
                  mobileTab === 'logs'
                    ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/40'
                    : 'text-slate-400'
                }`}
              >
                Logs ({alerts.length})
              </button>
            </div>
          </div>

          {/* Desktop 4-Column Grid View */}
          <div
            className={`hidden md:grid ${
              isCompact ? 'h-36' : 'h-56'
            } p-2 grid-cols-2 xl:grid-cols-4 gap-2 bg-slate-900/40 transition-all duration-200`}
          >
            {renderTrafficPanel()}
            {renderLatencyPanel()}
            {renderErrorPanel()}
            {renderLogsPanel()}
          </div>

          {/* Mobile Single Tab View */}
          <div
            className={`md:hidden ${
              isCompact ? 'h-36' : 'h-52'
            } p-1.5 bg-slate-900/40 transition-all duration-200`}
          >
            {mobileTab === 'traffic' && renderTrafficPanel()}
            {mobileTab === 'latency' && renderLatencyPanel()}
            {mobileTab === 'errors' && renderErrorPanel()}
            {mobileTab === 'logs' && renderLogsPanel()}
          </div>
        </div>
      )}
    </div>
  );
}
