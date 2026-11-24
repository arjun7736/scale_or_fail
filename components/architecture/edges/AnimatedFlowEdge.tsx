'use client';

import React from 'react';
import { BaseEdge, EdgeProps, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
import { X } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { useArchitectureStore } from '@/stores/architectureStore';

export function AnimatedFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  source,
  target,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const sourceMetrics = useGameStore((s) => s.componentMetrics[source]);
  const targetMetrics = useGameStore((s) => s.componentMetrics[target]);
  const edgeMetric = useGameStore((s) => s.edgeMetrics[id]);
  const syncGraph = useGameStore((s) => s.syncGraph);
  const removeEdge = useArchitectureStore((s) => s.removeEdge);

  const throughput = edgeMetric?.throughputRps ?? 0;
  const isHealthy = (!sourceMetrics || sourceMetrics.health === 'healthy') && (!targetMetrics || targetMetrics.health === 'healthy');
  const isWarning = sourceMetrics?.health === 'warning' || targetMetrics?.health === 'warning';
  const isCritical = sourceMetrics?.health === 'critical' || sourceMetrics?.health === 'failed' || targetMetrics?.health === 'critical';

  let strokeColor = '#0ea5e9'; // Cyan/teal for healthy
  let badgeBorder = 'border-sky-500/30 bg-slate-950/90 text-sky-300';

  if (isCritical) {
    strokeColor = '#f43f5e'; // Rose/red
    badgeBorder = 'border-rose-500/50 bg-rose-950/90 text-rose-300 animate-pulse';
  } else if (isWarning) {
    strokeColor = '#f59e0b'; // Amber
    badgeBorder = 'border-amber-500/50 bg-amber-950/90 text-amber-300';
  }

  // Adaptive stroke width: thicker for higher traffic
  const strokeWidth = selected ? 4.5 : throughput > 10000 ? 4 : throughput > 1000 ? 3.5 : 2.5;

  const handleDisconnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeEdge(id);
    setTimeout(() => syncGraph(), 30);
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth,
          stroke: selected ? '#38bdf8' : strokeColor,
          opacity: throughput > 0 ? 0.95 : 0.45,
          filter: selected ? 'drop-shadow(0 0 4px #38bdf8)' : undefined,
        }}
        className={throughput > 0 ? 'animate-flow-dash' : ''}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={`nodrag nopan flex items-center gap-1.5 px-2 py-0.5 rounded-full border shadow-lg font-mono text-[9px] font-semibold transition-all select-none group ${
            selected
              ? 'border-sky-400 bg-slate-900 text-sky-300 ring-2 ring-sky-500/40 shadow-sky-950/50'
              : badgeBorder
          }`}
        >
          {throughput > 0 ? (
            <span>{throughput.toLocaleString()} req/s</span>
          ) : (
            <span className="text-slate-400">Connected</span>
          )}

          {/* Direct Disconnect button right on the wire */}
          <button
            onClick={handleDisconnect}
            className="flex items-center justify-center h-3.5 w-3.5 rounded-full bg-slate-800 hover:bg-rose-500 text-slate-400 hover:text-white transition-colors"
            title="Disconnect this connection"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
