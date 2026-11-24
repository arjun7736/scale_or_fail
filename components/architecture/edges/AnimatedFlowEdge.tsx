'use client';

import React from 'react';
import { BaseEdge, EdgeProps, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
import { useGameStore } from '@/stores/gameStore';

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
  const strokeWidth = throughput > 10000 ? 4.5 : throughput > 1000 ? 3.5 : 2.5;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth,
          stroke: strokeColor,
          opacity: throughput > 0 ? 0.9 : 0.35,
        }}
        className={throughput > 0 ? 'animate-flow-dash' : ''}
      />

      {throughput > 0 && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={`nodrag nopan px-2 py-0.5 rounded-full border shadow-lg font-mono text-[9px] font-semibold transition-all select-none ${badgeBorder}`}
          >
            {throughput.toLocaleString()} req/s
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
