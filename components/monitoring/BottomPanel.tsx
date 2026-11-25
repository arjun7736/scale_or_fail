'use client';

import React, { useState } from 'react';
import { Lightbulb, Radio } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { TrafficPanel, LatencyPanel, ErrorRatePanel, LogsPanel } from './panels';

export function BottomPanel() {
  const [mobileTab, setMobileTab] = useState<'traffic' | 'latency' | 'errors' | 'logs'>('traffic');
  const [mobileView, setMobileView] = useState<'split' | 'tabs'>('split');

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
            className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
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
            className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
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
            className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
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
          {/* Mobile View Toggle Bar */}
          <div className="flex md:hidden items-center justify-between px-2.5 py-1 bg-slate-900/90 border-b border-slate-800 text-[10px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold text-[9px]">VIEW:</span>
              <div className="flex items-center bg-slate-950 rounded border border-slate-800 p-0.5">
                <button
                  onClick={() => setMobileView('split')}
                  className={`px-1.5 py-0.5 rounded text-[8px] transition-all cursor-pointer ${
                    mobileView === 'split'
                      ? 'bg-teal-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  4-Panel Split
                </button>
                <button
                  onClick={() => setMobileView('tabs')}
                  className={`px-1.5 py-0.5 rounded text-[8px] transition-all cursor-pointer ${
                    mobileView === 'tabs'
                      ? 'bg-teal-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tabbed
                </button>
              </div>
            </div>

            {mobileView === 'tabs' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMobileTab('traffic')}
                  className={`px-1.5 py-0.5 rounded text-[9px] transition-all cursor-pointer ${
                    mobileTab === 'traffic'
                      ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40'
                      : 'text-slate-400'
                  }`}
                >
                  Traffic
                </button>
                <button
                  onClick={() => setMobileTab('latency')}
                  className={`px-1.5 py-0.5 rounded text-[9px] transition-all cursor-pointer ${
                    mobileTab === 'latency'
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                      : 'text-slate-400'
                  }`}
                >
                  Latency
                </button>
                <button
                  onClick={() => setMobileTab('errors')}
                  className={`px-1.5 py-0.5 rounded text-[9px] transition-all cursor-pointer ${
                    mobileTab === 'errors'
                      ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                      : 'text-slate-400'
                  }`}
                >
                  Errors
                </button>
                <button
                  onClick={() => setMobileTab('logs')}
                  className={`px-1.5 py-0.5 rounded text-[9px] transition-all cursor-pointer ${
                    mobileTab === 'logs'
                      ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/40'
                      : 'text-slate-400'
                  }`}
                >
                  Logs
                </button>
              </div>
            )}
          </div>

          {/* Desktop / Laptop 4-Column Split Grid View */}
          <div
            className={`hidden md:grid ${
              isCompact ? 'h-40 md:h-44' : 'h-60 md:h-64'
            } p-2 grid-cols-2 lg:grid-cols-4 gap-2 bg-slate-900/40 transition-all duration-200`}
          >
            <TrafficPanel
              metricsHistory={metricsHistory}
              incomingRps={systemMetrics.incomingRps}
              succeededRps={systemMetrics.succeededRps}
            />
            <LatencyPanel
              metricsHistory={metricsHistory}
              avgLatencyMs={systemMetrics.avgLatencyMs}
              p95LatencyMs={systemMetrics.p95LatencyMs}
            />
            <ErrorRatePanel
              metricsHistory={metricsHistory}
              errorPercent={errorPercent}
              slaUptimePercent={systemMetrics.slaUptimePercent}
            />
            <LogsPanel alerts={alerts} />
          </div>

          {/* Mobile Display */}
          <div className="md:hidden">
            {mobileView === 'split' ? (
              <div
                className={`${
                  isCompact ? 'h-72' : 'h-96'
                } p-1.5 grid grid-cols-2 gap-1.5 bg-slate-900/40 overflow-y-auto transition-all duration-200`}
              >
                <TrafficPanel
                  metricsHistory={metricsHistory}
                  incomingRps={systemMetrics.incomingRps}
                  succeededRps={systemMetrics.succeededRps}
                />
                <LatencyPanel
                  metricsHistory={metricsHistory}
                  avgLatencyMs={systemMetrics.avgLatencyMs}
                  p95LatencyMs={systemMetrics.p95LatencyMs}
                />
                <ErrorRatePanel
                  metricsHistory={metricsHistory}
                  errorPercent={errorPercent}
                  slaUptimePercent={systemMetrics.slaUptimePercent}
                />
                <LogsPanel alerts={alerts} />
              </div>
            ) : (
              <div
                className={`${
                  isCompact ? 'h-36' : 'h-52'
                } p-1.5 bg-slate-900/40 transition-all duration-200`}
              >
                {mobileTab === 'traffic' && (
                  <TrafficPanel
                    metricsHistory={metricsHistory}
                    incomingRps={systemMetrics.incomingRps}
                    succeededRps={systemMetrics.succeededRps}
                  />
                )}
                {mobileTab === 'latency' && (
                  <LatencyPanel
                    metricsHistory={metricsHistory}
                    avgLatencyMs={systemMetrics.avgLatencyMs}
                    p95LatencyMs={systemMetrics.p95LatencyMs}
                  />
                )}
                {mobileTab === 'errors' && (
                  <ErrorRatePanel
                    metricsHistory={metricsHistory}
                    errorPercent={errorPercent}
                    slaUptimePercent={systemMetrics.slaUptimePercent}
                  />
                )}
                {mobileTab === 'logs' && <LogsPanel alerts={alerts} />}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
