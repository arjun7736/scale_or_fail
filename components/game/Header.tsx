'use client';

import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  DollarSign,
  TrendingUp,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';

export function Header() {
  const [showMobileSettings, setShowMobileSettings] = useState(false);

  const gameStatus = useGameStore((s) => s.gameStatus);
  const speed = useGameStore((s) => s.speed);
  const difficulty = useGameStore((s) => s.difficulty);
  const systemMetrics = useGameStore((s) => s.systemMetrics);

  const startGame = useGameStore((s) => s.startGame);
  const pauseGame = useGameStore((s) => s.pauseGame);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const setDifficulty = useGameStore((s) => s.setDifficulty);
  const restartGame = useGameStore((s) => s.restartGame);

  const isToolboxOpen = useGameStore((s) => s.isToolboxOpen);
  const isTelemetryOpen = useGameStore((s) => s.isTelemetryOpen);
  const toggleToolbox = useGameStore((s) => s.toggleToolbox);
  const toggleTelemetry = useGameStore((s) => s.toggleTelemetry);

  // Global keyboard shortcuts for layout toggling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)
      ) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleToolbox();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        toggleTelemetry();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleToolbox, toggleTelemetry]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isRunning = gameStatus === 'running';

  return (
    <>
      {/* Primary Navigation Bar */}
      <header className="h-13 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md px-2.5 sm:px-3.5 flex items-center justify-between select-none z-30 shrink-0">
        {/* Brand & Left Panel Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <button
            onClick={toggleToolbox}
            className={`flex h-8 px-2 items-center gap-1 rounded-lg border transition-all ${
              isToolboxOpen
                ? 'bg-slate-800 border-slate-700 text-teal-400 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title={isToolboxOpen ? 'Close Toolbox' : 'Add Architecture Components'}
          >
            {isToolboxOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <>
                <Plus className="h-4 w-4 text-teal-400" />
                <span className="text-[11px] font-semibold hidden xs:inline">Add</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400 font-bold shadow-teal-950/40 shadow-sm">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h1 className="text-xs sm:text-sm font-extrabold tracking-tight text-white font-mono">
                  SCALE <span className="text-teal-400 font-sans font-light">OR</span> FAIL
                </h1>
                <span className="hidden sm:inline-block rounded-full border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.2 text-[9px] font-mono text-teal-300">
                  PRO
                </span>
              </div>
              <p className="text-[9px] text-slate-400 hidden lg:block leading-none">
                Build Small • Scale Big • Never Go Down
              </p>
            </div>
          </div>
        </div>

        {/* Desktop Center status items */}
        <div className="hidden md:flex items-center gap-2 lg:gap-3.5">
          {/* Survival Time */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800">
            <Clock className="h-3 w-3 text-slate-400" />
            <div className="text-[11px] font-mono">
              <span className="text-slate-400 text-[10px]">TIME: </span>
              <span className="text-teal-300 font-bold">
                {formatTime(systemMetrics.simTimeSeconds)}
              </span>
            </div>
          </div>

          {/* Current Stage */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800">
            <TrendingUp className="h-3 w-3 text-amber-400" />
            <div className="text-[11px] font-mono">
              <span className="text-slate-400 text-[10px]">STAGE {systemMetrics.stage}: </span>
              <span className="text-amber-300 font-semibold">{systemMetrics.stageName}</span>
            </div>
          </div>

          {/* Cloud Budget */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800">
            <DollarSign className="h-3 w-3 text-emerald-400" />
            <div className="text-[11px] font-mono">
              <span className="text-slate-400 text-[10px]">BUDGET: </span>
              <span
                className={`font-bold ${
                  systemMetrics.budgetRemaining < 50 ? 'text-rose-400 animate-pulse' : 'text-emerald-300'
                }`}
              >
                ${systemMetrics.budgetRemaining.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 ml-1">
                (${systemMetrics.operatingCostPerHour}/hr)
              </span>
            </div>
          </div>
        </div>

        {/* Simulation Controls & Right Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Desktop Difficulty Selector */}
          <div className="hidden sm:flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5 text-[10px] font-mono">
            {(['beginner', 'intermediate', 'expert'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setDifficulty(mode)}
                className={`px-1.5 py-0.5 rounded capitalize transition-all ${
                  difficulty === mode
                    ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Desktop Speed multiplier */}
          <div className="hidden sm:flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5 text-[10px] font-mono">
            {[1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-1.5 py-0.5 rounded transition-all ${
                  speed === s
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Mobile Settings Toggle Button */}
          <button
            onClick={() => setShowMobileSettings(!showMobileSettings)}
            className="sm:hidden flex items-center justify-center h-8 w-8 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            title="Difficulty & Speed Settings"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>

          {/* Start / Pause */}
          <button
            onClick={isRunning ? pauseGame : startGame}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg font-semibold text-xs transition-all shadow-sm ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/20'
                : 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-950/30'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="h-3 w-3 fill-current" /> Pause
              </>
            ) : (
              <>
                <Play className="h-3 w-3 fill-current" /> Start
              </>
            )}
          </button>

          {/* Restart */}
          <button
            onClick={restartGame}
            className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
            title="Restart Simulation"
          >
            <RotateCcw className="h-3 w-3" />
          </button>

          {/* Telemetry Sidebar Toggle */}
          <button
            onClick={toggleTelemetry}
            className={`flex h-8 px-2 items-center gap-1 rounded-lg border transition-all ${
              isTelemetryOpen
                ? 'bg-slate-800 border-slate-700 text-sky-400 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title={isTelemetryOpen ? 'Close Telemetry' : 'Open Telemetry'}
          >
            {isTelemetryOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <>
                <PanelRightOpen className="h-4 w-4" />
                <span className="text-[11px] font-semibold hidden xs:inline">Stats</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Secondary Status Sub-Bar */}
      <div className="md:hidden h-7 bg-slate-900/90 border-b border-slate-800/80 px-2.5 flex items-center justify-between text-[10px] font-mono select-none shrink-0">
        <div className="flex items-center gap-1 text-slate-300">
          <Clock className="h-2.5 w-2.5 text-slate-400" />
          <span className="font-bold text-teal-300">{formatTime(systemMetrics.simTimeSeconds)}</span>
        </div>

        <div className="flex items-center gap-1 text-amber-300">
          <TrendingUp className="h-2.5 w-2.5 text-amber-400" />
          <span className="font-semibold">S{systemMetrics.stage}: {systemMetrics.stageName}</span>
        </div>

        <div className="flex items-center gap-1">
          <DollarSign className="h-2.5 w-2.5 text-emerald-400" />
          <span
            className={`font-bold ${
              systemMetrics.budgetRemaining < 50 ? 'text-rose-400' : 'text-emerald-300'
            }`}
          >
            ${systemMetrics.budgetRemaining.toFixed(0)}
          </span>
          <span className="text-[9px] text-slate-500">
            (${systemMetrics.operatingCostPerHour}/h)
          </span>
        </div>
      </div>

      {/* Mobile Settings Drawer Dropdown */}
      {showMobileSettings && (
        <div className="sm:hidden bg-slate-900 border-b border-slate-800 p-2.5 space-y-2 animate-in slide-in-from-top-1 text-xs font-mono z-30 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 uppercase">Difficulty:</span>
            <div className="flex items-center bg-slate-950 rounded border border-slate-800 p-0.5 text-[10px]">
              {(['beginner', 'intermediate', 'expert'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDifficulty(mode)}
                  className={`px-2 py-0.5 rounded capitalize ${
                    difficulty === mode
                      ? 'bg-teal-500 text-slate-950 font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 uppercase">Speed:</span>
            <div className="flex items-center bg-slate-950 rounded border border-slate-800 p-0.5 text-[10px]">
              {[1, 2, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2.5 py-0.5 rounded ${
                    speed === s
                      ? 'bg-slate-700 text-white font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
