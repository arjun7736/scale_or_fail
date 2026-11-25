'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Clock } from 'lucide-react';
import { TelemetryDataPoint } from '@/stores/gameStore';

interface LatencyPanelProps {
  metricsHistory: TelemetryDataPoint[];
  avgLatencyMs: number;
  p95LatencyMs: number;
}

export function LatencyPanel({ metricsHistory, avgLatencyMs, p95LatencyMs }: LatencyPanelProps) {
  return (
    <div className="flex flex-col h-full rounded-lg border border-slate-800 bg-slate-950/80 p-2 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between pb-1 mb-0.5 border-b border-slate-800/80 text-[10px] font-mono">
        <div className="flex items-center gap-1 font-semibold text-slate-200">
          <Clock className="h-3 w-3 text-amber-400" />
          <span>Latency (ms)</span>
        </div>
        <div className="flex items-center gap-1 text-[9px]">
          <span className="text-sky-300 font-bold">{avgLatencyMs}ms avg</span>
          <span className="text-slate-600">•</span>
          <span className="text-amber-400 font-bold">{p95LatencyMs}ms p95</span>
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
}
