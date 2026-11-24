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
} from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';

export function BottomPanel() {
  const [activeTab, setActiveTab] = useState<'traffic' | 'latency' | 'errors' | 'logs'>('traffic');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const metricsHistory = useGameStore((s) => s.metricsHistory);
  const alerts = useGameStore((s) => s.alerts);
  const activeHint = useGameStore((s) => s.activeContextualHint);
  const difficulty = useGameStore((s) => s.difficulty);

  return (
    <div className="border-t border-slate-800 bg-slate-950/95 flex flex-col transition-all duration-200 select-none">
      {/* Top bar with tabs & collapse */}
      <div className="h-10 px-4 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('traffic')}
            className={`px-3 py-1.5 rounded-t-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'traffic'
                ? 'bg-slate-900 border-t border-x border-slate-800 text-teal-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="h-3 w-3" /> Traffic (RPS)
          </button>

          <button
            onClick={() => setActiveTab('latency')}
            className={`px-3 py-1.5 rounded-t-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'latency'
                ? 'bg-slate-900 border-t border-x border-slate-800 text-teal-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="h-3 w-3" /> Latency (ms)
          </button>

          <button
            onClick={() => setActiveTab('errors')}
            className={`px-3 py-1.5 rounded-t-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'errors'
                ? 'bg-slate-900 border-t border-x border-slate-800 text-teal-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertOctagon className="h-3 w-3" /> Error Rate (%)
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-t-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'bg-slate-900 border-t border-x border-slate-800 text-teal-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListFilter className="h-3 w-3" /> Event Logs ({alerts.length})
          </button>
        </div>

        {/* Beginner Contextual Hint banner */}
        {difficulty === 'beginner' && activeHint && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
            <Lightbulb className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="truncate max-w-xl">{activeHint}</span>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded text-slate-400 hover:text-white"
          title={isCollapsed ? 'Expand Panel' : 'Collapse Panel'}
        >
          {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Content panel */}
      {!isCollapsed && (
        <div className="h-44 p-3 bg-slate-900/60">
          {activeTab === 'traffic' && (
            <div className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsHistory}>
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
                  <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} width={45} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="incomingRps"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#trafficGradient)"
                    name="Incoming RPS"
                  />
                  <Area
                    type="monotone"
                    dataKey="succeededRps"
                    stroke="#14b8a6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#succeededGradient)"
                    name="Succeeded RPS"
                  />
                  <Line
                    type="monotone"
                    dataKey="failedRps"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={false}
                    name="Dropped RPS"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === 'latency' && (
            <div className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metricsHistory}>
                  <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} width={45} unit="ms" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <ReferenceLine y={3000} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: '3,000ms SLA Timeout', fill: '#f43f5e', fontSize: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="avgLatencyMs"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                    name="Avg Latency (ms)"
                  />
                  <Line
                    type="monotone"
                    dataKey="p95LatencyMs"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    name="p95 Latency (ms)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === 'errors' && (
            <div className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsHistory}>
                  <defs>
                    <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} width={40} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <ReferenceLine y={5} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '5% SLA Penalty', fill: '#f59e0b', fontSize: 10 }} />
                  <Area
                    type="monotone"
                    dataKey="errorRatePercent"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#errorGradient)"
                    name="Error Rate (%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="h-full overflow-y-auto space-y-1 pr-2 font-mono text-[11px]">
              {alerts.length === 0 ? (
                <div className="text-slate-500 text-center py-8">No events logged yet.</div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center gap-3 p-1.5 rounded bg-slate-950/60 border border-slate-800/80"
                  >
                    <span className="text-slate-500 shrink-0">{alert.timestamp}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase shrink-0 ${
                        alert.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-400'
                          : alert.severity === 'warning'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-teal-500/20 text-teal-400'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="font-semibold text-slate-200">{alert.title}:</span>
                    <span className="text-slate-400 truncate">{alert.message}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
