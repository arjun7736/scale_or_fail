'use client';

import React from 'react';
import {
  AlertTriangle,
  XCircle,
  Wrench,
  CheckCircle2,
  ArrowRight,
  X,
  Cpu,
  Layers,
  Database,
  ExternalLink,
} from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';

export function ServerIncidentBanner() {
  const activeIncident = useGameStore((s) => s.activeIncident);
  const dismissIncident = useGameStore((s) => s.dismissIncident);
  const inspectIncidentNode = useGameStore((s) => s.inspectIncidentNode);
  const difficulty = useGameStore((s) => s.difficulty);

  if (!activeIncident || !activeIncident.hasIncident) {
    return null;
  }

  const isCritical = activeIncident.severity === 'critical';

  return (
    <div
      className={`absolute top-2 left-2 right-2 sm:top-3 sm:left-4 sm:right-4 z-40 mx-auto max-w-4xl max-h-[85vh] overflow-y-auto rounded-xl p-3 sm:p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-top-4 ${
        isCritical
          ? 'border-rose-500/70 bg-slate-950/95 shadow-rose-950/40'
          : 'border-amber-500/70 bg-slate-950/95 shadow-amber-950/30'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Incident Icon & Title */}
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
              isCritical
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-400 animate-pulse'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-400'
            }`}
          >
            {isCritical ? <XCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ${
                  isCritical
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {isCritical ? 'CRITICAL INCIDENT: SERVER DOWN' : 'INCIDENT WARNING'}
              </span>
              <h3 className="text-sm font-bold text-white font-mono">{activeIncident.title}</h3>
            </div>

            {/* Exact Error description */}
            <div className="rounded-lg bg-slate-900/90 border border-slate-800/80 p-2.5 font-mono text-xs text-rose-200">
              <span className="font-bold text-rose-400">❌ Error: </span>
              {activeIncident.exactError}
            </div>

            {/* Technical Root Cause */}
            <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
              <strong className="text-slate-100">Root Cause: </strong>
              {activeIncident.technicalDetails}
            </p>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={dismissIncident}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          title="Dismiss Banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Actionable Prevention Steps (DO THIS TO NOT BREAK THE SYSTEM) */}
      <div className="mt-3 pt-3 border-t border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-400 font-mono flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5" />
            {difficulty === 'beginner'
              ? 'What to do to prevent breaking the system:'
              : difficulty === 'intermediate'
              ? 'System Diagnostics:'
              : 'Production Incident Protocol:'}
          </div>

          {difficulty === 'beginner' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 font-mono text-[11px]">
              {activeIncident.actionableSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded border border-slate-800/60 text-slate-200"
                >
                  <ArrowRight className="h-3 w-3 text-teal-400 shrink-0" />
                  <span className="truncate">{step}</span>
                </div>
              ))}
            </div>
          ) : difficulty === 'intermediate' ? (
            <div className="font-mono text-[11px] text-amber-300/90 bg-amber-500/10 p-2 rounded border border-amber-500/20">
              ⚡ Intermediate Challenge: Step-by-step guidance disabled. Inspect your node telemetry, connection pools, and downstream topology to resolve the bottleneck.
            </div>
          ) : (
            <div className="font-mono text-[11px] text-rose-300/90 bg-rose-500/10 p-2 rounded border border-rose-500/20">
              🔥 Hardcore Expert: No guidance provided. Strict 5-second SLA failure countdown active.
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          {activeIncident.crashedNodeId && (
            <button
              onClick={inspectIncidentNode}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-teal-950/30"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Inspect Node
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
