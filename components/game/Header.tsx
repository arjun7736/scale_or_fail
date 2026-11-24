'use client';

import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  DollarSign,
  TrendingUp,
  Shield,
  Zap,
} from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';

export function Header() {
  const gameStatus = useGameStore((s) => s.gameStatus);
  const speed = useGameStore((s) => s.speed);
  const difficulty = useGameStore((s) => s.difficulty);
  const systemMetrics = useGameStore((s) => s.systemMetrics);

  const startGame = useGameStore((s) => s.startGame);
  const pauseGame = useGameStore((s) => s.pauseGame);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const setDifficulty = useGameStore((s) => s.setDifficulty);
  const restartGame = useGameStore((s) => s.restartGame);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isRunning = gameStatus === 'running';

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 flex items-center justify-between select-none z-30">
      {/* Brand & Tagline */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 font-bold shadow-teal-950/40 shadow-md">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold tracking-tight text-white font-mono">
              SCALE <span className="text-teal-400 font-sans font-light">OR</span> FAIL
            </h1>
            <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-[10px] font-mono text-teal-300">
              SIMULATOR
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            Build Small. Scale Big. Never Go Down.
          </p>
        </div>
      </div>

      {/* Center status items */}
      <div className="flex items-center gap-6">
        {/* Survival Time */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <div className="text-[11px] font-mono">
            <span className="text-slate-400">SURVIVAL: </span>
            <span className="text-teal-300 font-bold">
              {formatTime(systemMetrics.simTimeSeconds)}
            </span>
          </div>
        </div>

        {/* Current Stage */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
          <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
          <div className="text-[11px] font-mono">
            <span className="text-slate-400">STAGE {systemMetrics.stage}: </span>
            <span className="text-amber-300 font-semibold">{systemMetrics.stageName}</span>
          </div>
        </div>

        {/* Cloud Budget */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
          <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
          <div className="text-[11px] font-mono">
            <span className="text-slate-400">BUDGET: </span>
            <span
              className={`font-bold ${
                systemMetrics.budgetRemaining < 50 ? 'text-rose-400 animate-pulse' : 'text-emerald-300'
              }`}
            >
              ${systemMetrics.budgetRemaining.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500 ml-1.5">
              (${systemMetrics.operatingCostPerHour}/hr)
            </span>
          </div>
        </div>
      </div>

      {/* Simulation Controls */}
      <div className="flex items-center gap-3">
        {/* Difficulty Selector */}
        <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5 text-[11px] font-mono">
          {(['beginner', 'intermediate', 'expert'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setDifficulty(mode)}
              className={`px-2 py-1 rounded capitalize transition-all ${
                difficulty === mode
                  ? 'bg-teal-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Speed multiplier */}
        <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5 text-xs font-mono">
          {[1, 2, 5].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-1 rounded transition-all ${
                speed === s
                  ? 'bg-slate-700 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Start / Pause */}
        <button
          onClick={isRunning ? pauseGame : startGame}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-semibold text-xs transition-all shadow-md ${
            isRunning
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/20'
              : 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-950/30'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="h-3.5 w-3.5 fill-current" /> Pause
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" /> Start
            </>
          )}
        </button>

        {/* Restart */}
        <button
          onClick={restartGame}
          className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
          title="Restart Simulation"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
