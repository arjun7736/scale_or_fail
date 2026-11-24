'use client';

import React from 'react';
import {
  AlertTriangle,
  RotateCcw,
  Trophy,
  Activity,
  Users,
  Clock,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  X,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';

export function GameModal() {
  const showPostmortem = useGameStore((s) => s.showPostmortem);
  const showMilestone = useGameStore((s) => s.showMilestone);
  const postmortem = useGameStore((s) => s.postmortem);

  const restartGame = useGameStore((s) => s.restartGame);
  const dismissPostmortem = useGameStore((s) => s.dismissPostmortem);
  const dismissMilestone = useGameStore((s) => s.dismissMilestone);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // 1 Million Milestone Modal
  if (showMilestone) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
        <div className="relative max-w-xl w-full rounded-2xl border border-teal-500/50 bg-slate-900 p-8 shadow-2xl text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-400">
            <Trophy className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <span className="rounded-full bg-teal-500/10 px-3 py-1 font-mono text-xs font-semibold text-teal-300 border border-teal-500/30">
              MAJOR MILESTONE ACHIEVED
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white font-mono mt-2">
              ARCHITECTURE MASTER
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              You&apos;ve designed a system capable of surviving <strong className="text-teal-400 font-mono">1 million concurrent in-flight requests</strong> in this simulation.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left space-y-2 font-mono text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Little&apos;s Law Verification:</span>
              <span className="text-teal-300">L = λ · W satisfied</span>
            </div>
            <div className="flex justify-between">
              <span>Throughput + Latency Equilibrium:</span>
              <span className="text-slate-200">Maintained under peak load</span>
            </div>
          </div>

          <button
            onClick={dismissMilestone}
            className="w-full py-3 px-6 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-teal-950/40"
          >
            Continue Scaling (Endless Survival)
          </button>
        </div>
      </div>
    );
  }

  // Game Over Postmortem Modal
  if (showPostmortem && postmortem) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-300">
        <div className="relative max-w-3xl w-full my-8 rounded-2xl border border-rose-500/40 bg-slate-900 p-6 md:p-8 shadow-2xl space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold font-mono text-white">SYSTEM OUTAGE — GAME OVER</h2>
                  <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-mono text-rose-400 border border-rose-500/30">
                    SLA BREACHED
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  Postmortem Analysis & Root Cause Diagnosis
                </p>
              </div>
            </div>

            <button
              onClick={dismissPostmortem}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Root cause callout */}
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 space-y-1.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-rose-400 font-mono flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Root Cause
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-mono">
              {postmortem.rootCause}
            </p>
          </div>

          {/* Metric Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400">Survival Duration</div>
              <div className="text-lg font-bold text-teal-400 font-mono mt-0.5">
                {formatTime(postmortem.survivalDurationSeconds)}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">Stage {postmortem.finalStage}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400">Peak RPS</div>
              <div className="text-lg font-bold text-slate-100 font-mono mt-0.5">
                {postmortem.peakRps.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">Requests/sec</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400">Peak Concurrency</div>
              <div className="text-lg font-bold text-sky-400 font-mono mt-0.5">
                {postmortem.peakConcurrency.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">In-Flight (L)</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400">Total Requests</div>
              <div className="text-lg font-bold text-slate-100 font-mono mt-0.5">
                {postmortem.totalRequestsHandled.toLocaleString()}
              </div>
              <div className="text-[10px] text-rose-400 font-mono">
                {postmortem.totalRequestsFailed.toLocaleString()} failed
              </div>
            </div>
          </div>

          {/* Educational Recommendations */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
              <BookOpen className="h-4 w-4 text-teal-400" /> Architectural Lessons Learned
            </div>

            <div className="space-y-2">
              {postmortem.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/50 space-y-1.5"
                >
                  <div className="text-xs font-semibold text-teal-300 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                    {rec.title}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    {rec.explanation}
                  </p>
                  <div className="text-[11px] text-slate-200 font-mono bg-slate-900 p-2 rounded border border-slate-800/80 flex items-center gap-1.5">
                    <ArrowRight className="h-3 w-3 text-teal-400 shrink-0" />
                    <span>Fix: {rec.architecturalFix}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Restart button */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            <div className="text-xs text-slate-400 font-mono">
              Apply these lessons to survive higher traffic tiers.
            </div>

            <button
              onClick={restartGame}
              className="flex items-center gap-2 py-2.5 px-6 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-teal-950/40"
            >
              <RotateCcw className="h-4 w-4" /> Restart & Redesign
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
