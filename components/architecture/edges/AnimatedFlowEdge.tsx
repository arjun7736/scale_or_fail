'use client';

import React from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';
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
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const sourceMetrics = useGameStore((s) => s.componentMetrics[source]);
  const isHealthy = !sourceMetrics || sourceMetrics.health === 'healthy';
  const isWarning = sourceMetrics?.health === 'warning';
  const isCritical = sourceMetrics?.health === 'critical' || sourceMetrics?.health === 'failed';

  let strokeColor = '#0ea5e9'; // Cyan/teal for healthy
  if (isCritical) {
    strokeColor = '#f43f5e'; // Rose/red
  } else if (isWarning) {
    strokeColor = '#f59e0b'; // Amber
  }

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: 3,
          stroke: strokeColor,
          opacity: 0.8,
        }}
        className="animate-flow-dash"
      />
    </>
  );
}
