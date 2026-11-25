'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AlertOctagon } from 'lucide-react';
import { TelemetryDataPoint } from '@/stores/gameStore';

interface ErrorRatePanelProps {
  metricsHistory: TelemetryDataPoint[];
  errorPercent: string;
  slaUptimePercent: number;
}

export function ErrorRatePanel({ metricsHistory, errorPercent, slaUptimePercent }: ErrorRatePanelProps) {
  const isHighError = parseFloat(errorPercent) > 5;

  return (
    <div className="flex flex-col h-full rounded-lg border border-slate-800 bg-slate-950/80 p-2 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between pb-1 mb-0.5 border-b border-slate-800/80 text-[10px] font-mono">
        <div className="flex items-center gap-1 font-semibold text-slate-200">
          <AlertOctagon className="h-3 w-3 text-rose-400" />
          <span>Error Rate (%)</span>
        </div>
        <div className="flex items-center gap-1 text-[9px]">
          <span className={`font-bold ${isHighError ? 'text-rose-400 animate-pulse' : 'text-slate-300'}`}>
            {errorPercent}% error
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400 font-bold">{slaUptimePercent.toFixed(1)}% SLA</span>
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
}
