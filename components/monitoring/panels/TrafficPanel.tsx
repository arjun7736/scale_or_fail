'use client';

import React from 'react';
import { AreaChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';
import { TelemetryDataPoint } from '@/stores/gameStore';

interface TrafficPanelProps {
  metricsHistory: TelemetryDataPoint[];
  incomingRps: number;
  succeededRps: number;
}

export function TrafficPanel({ metricsHistory, incomingRps, succeededRps }: TrafficPanelProps) {
  return (
    <div className="flex flex-col h-full rounded-lg border border-slate-800 bg-slate-950/80 p-2 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between pb-1 mb-0.5 border-b border-slate-800/80 text-[10px] font-mono">
        <div className="flex items-center gap-1 font-semibold text-slate-200">
          <Activity className="h-3 w-3 text-sky-400" />
          <span>Traffic (RPS)</span>
        </div>
        <div className="flex items-center gap-1 text-[9px]">
          <span className="text-sky-400 font-bold">{incomingRps.toLocaleString()} in</span>
          <span className="text-slate-600">/</span>
          <span className="text-teal-400 font-bold">{succeededRps.toLocaleString()} ok</span>
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
}
