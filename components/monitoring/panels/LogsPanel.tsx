'use client';

import React from 'react';
import { ListFilter } from 'lucide-react';
import { SystemAlert } from '@/packages/simulation/core/types';

interface LogsPanelProps {
  alerts: SystemAlert[];
}

export function LogsPanel({ alerts }: LogsPanelProps) {
  return (
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
}
