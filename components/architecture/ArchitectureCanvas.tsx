'use client';

import React, { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

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
