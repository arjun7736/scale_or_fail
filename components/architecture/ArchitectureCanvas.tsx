'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Pause, Wrench, ShieldCheck } from 'lucide-react';

import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import { useArchitectureStore } from '@/stores/architectureStore';
import { useGameStore } from '@/stores/gameStore';
import { ComponentType } from '@/packages/simulation/core/types';

function CanvasInternal() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  const onNodesChange = useArchitectureStore((s) => s.onNodesChange);
  const onEdgesChange = useArchitectureStore((s) => s.onEdgesChange);
  const onConnect = useArchitectureStore((s) => s.onConnect);
  const addNode = useArchitectureStore((s) => s.addNode);
  const selectNode = useArchitectureStore((s) => s.selectNode);

  const syncGraph = useGameStore((s) => s.syncGraph);
  const gameStatus = useGameStore((s) => s.gameStatus);
  const startGame = useGameStore((s) => s.startGame);
  const pauseGame = useGameStore((s) => s.pauseGame);
  const togglePause = useGameStore((s) => s.togglePause);
  const autoPauseOnEdit = useGameStore((s) => s.autoPauseOnEdit);
  const setAutoPauseOnEdit = useGameStore((s) => s.setAutoPauseOnEdit);

  // Global Spacebar shortcut for instant Pause / Resume
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        e.target instanceof HTMLElement &&
        (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePause]);

  // Sync graph to simulation engine after connections or deletions
  const handleConnect = useCallback(
    (connection: any) => {
      onConnect(connection);
      setTimeout(() => syncGraph(), 50);
    },
    [onConnect, syncGraph]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/scale-or-fail-type') as ComponentType;
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
      setTimeout(() => syncGraph(), 50);
    },
    [screenToFlowPosition, addNode, syncGraph]
  );

  return (
    <div
      ref={reactFlowWrapper}
      className="h-full w-full relative bg-slate-950/80"
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      {/* Floating Architecture Scaling / Maintenance HUD */}
      {gameStatus === 'paused' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-xl border border-amber-500/50 bg-slate-950/95 shadow-2xl shadow-amber-950/50 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-amber-300">
              ARCHITECTURE MAINTENANCE MODE (PAUSED)
            </span>
          </div>
          <span className="hidden md:inline-block text-[11px] text-slate-300">
            Safe to add servers, rewire links, and upgrade tiers without downtime!
          </span>
          <button
            onClick={startGame}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold font-mono text-xs transition-all shadow-md shadow-teal-950/40"
          >
            <Play className="h-3 w-3 fill-current" /> Resume Traffic <kbd className="text-[9px] bg-teal-700/50 text-slate-950 px-1 rounded">Space</kbd>
          </button>
        </div>
      )}

      {gameStatus === 'running' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800/80 bg-slate-950/80 shadow-lg backdrop-blur-md">
          <span className="flex h-2 w-2 rounded-full bg-teal-400 animate-ping" />
          <span className="text-[11px] font-mono text-slate-300">Live Traffic</span>
          <button
            onClick={pauseGame}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-semibold font-mono text-xs transition-all border border-amber-500/30 shadow-sm"
            title="Pause to rewire and scale safely"
          >
            <Pause className="h-3 w-3 fill-current" /> Pause to Scale Up <kbd className="text-[9px] bg-slate-950 px-1 rounded border border-slate-700 text-slate-400">Space</kbd>
          </button>
        </div>
      )}

      {gameStatus === 'idle' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-xl border border-teal-500/30 bg-slate-950/90 shadow-xl backdrop-blur-md">
          <span className="text-xs font-mono font-medium text-slate-200">
            System in initial design state. Assemble your topology before starting traffic.
          </span>
          <button
            onClick={startGame}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold font-mono text-xs transition-all shadow-md"
          >
            <Play className="h-3 w-3 fill-current" /> Start Simulation <kbd className="text-[9px] bg-teal-600/60 text-slate-950 px-1 rounded">Space</kbd>
          </button>
        </div>
      )}

      {/* Auto-Pause Toggle in bottom corner of Canvas */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] font-mono shadow-md backdrop-blur-md">
        <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
          <input
            type="checkbox"
            checked={autoPauseOnEdit}
            onChange={(e) => setAutoPauseOnEdit(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-0 cursor-pointer"
          />
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-teal-400" />
            Auto-Pause on Topology Edit
          </span>
        </label>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={(changes: any) => {
          onNodesChange(changes);
          syncGraph();
        }}
        onEdgesChange={(changes: any) => {
          onEdgesChange(changes);
          syncGraph();
        }}
        onConnect={handleConnect}
        onPaneClick={() => selectNode(null)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.35 }}
        minZoom={0.2}
        maxZoom={1.8}
        deleteKeyCode={['Backspace', 'Delete']}
        edgesFocusable={true}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1.5}
          color="#1e293b"
          className="opacity-70"
        />
        <Controls
          className="!bg-slate-900/90 !border !border-slate-800 !rounded-xl !overflow-hidden !shadow-xl [&>button]:!bg-slate-900 [&>button]:!border-b [&>button]:!border-slate-800 [&>button]:!fill-slate-300 [&>button:hover]:!bg-slate-800"
        />
      </ReactFlow>
    </div>
  );
}

export function ArchitectureCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInternal />
    </ReactFlowProvider>
  );
}

