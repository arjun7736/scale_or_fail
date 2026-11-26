'use client';

import React from 'react';
import { BaseEdge, EdgeProps, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
import { X, AlertTriangle, Info, CheckCircle2, RefreshCw } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { useArchitectureStore } from '@/stores/architectureStore';
import { SemanticEdgeType } from '@/packages/simulation/core/types';

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
  data,
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
  const selectEdge = useArchitectureStore((s) => s.selectEdge);
  const selectedEdgeId = useArchitectureStore((s) => s.selectedEdgeId);
  const validationResult = useArchitectureStore((s) => s.validationResult);

  const isEdgeSelected = selected || selectedEdgeId === id;
  const edgeIssues = validationResult?.edgeIssuesMap[id] || [];
  const primaryIssue = edgeIssues[0];
  const isInvalid = primaryIssue?.severity === 'error' || data?.edgeType === 'unsupported';
  const isWarning = primaryIssue?.severity === 'warning';

  const edgeType = (data?.edgeType as SemanticEdgeType) || 'http_traffic';
  const throughput = edgeMetric?.throughputRps ?? 0;

  // Semantic color and badge styling
  let strokeColor = '#14b8a6'; // Default Teal (HTTP)
  let badgeBorder = 'border-teal-500/30 bg-slate-950/90 text-teal-300';
  let badgeLabel = (data?.label as string) || 'HTTP Flow';
  let strokeDash: string | undefined = undefined;

  if (isInvalid) {
    strokeColor = '#f43f5e'; // Red
    strokeDash = '6 4';
    badgeBorder = 'border-rose-500/80 bg-rose-950/90 text-rose-300 animate-pulse';
    badgeLabel = 'Unsupported';
  } else if (isWarning) {
    strokeColor = '#f59e0b'; // Amber
    badgeBorder = 'border-amber-500/80 bg-amber-950/90 text-amber-300';
  } else if (edgeType === 'replication') {
    strokeColor = '#f59e0b'; // Amber/Gold
    badgeBorder = 'border-amber-500/40 bg-slate-950/90 text-amber-300';
    badgeLabel = 'Replication';
  } else if (edgeType === 'cache_access') {
    strokeColor = '#06b6d4'; // Cyan
    badgeBorder = 'border-cyan-500/40 bg-slate-950/90 text-cyan-300';
    badgeLabel = 'Cache Access';
  } else if (edgeType === 'async_message' || edgeType === 'stream_processing') {
    strokeColor = '#a855f7'; // Purple
    badgeBorder = 'border-purple-500/40 bg-slate-950/90 text-purple-300';
    badgeLabel = (data?.label as string) || (edgeType === 'stream_processing' ? 'Kafka Stream' : 'Async Queue');
  } else if (edgeType === 'db_read_write' || edgeType === 'db_read') {
    strokeColor = '#38bdf8'; // Sky blue
    badgeBorder = 'border-sky-500/40 bg-slate-950/90 text-sky-300';
    badgeLabel = (data?.label as string) || (edgeType === 'db_read' ? 'DB Read' : 'DB Read/Write');
  }

  // Adaptive stroke width
  const strokeWidth = isEdgeSelected
    ? 4.5
    : throughput > 10000
    ? 4
    : throughput > 1000
    ? 3.5
    : 2.5;

  const handleEdgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectEdge(id);
  };

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
          stroke: isEdgeSelected ? '#38bdf8' : strokeColor,
          strokeDasharray: strokeDash,
          opacity: isInvalid ? 0.85 : throughput > 0 ? 0.95 : 0.6,
          filter: isEdgeSelected
            ? 'drop-shadow(0 0 6px #38bdf8)'
            : isInvalid
            ? 'drop-shadow(0 0 4px #f43f5e)'
            : undefined,
          cursor: 'pointer',
        }}
        className={throughput > 0 && !isInvalid ? 'animate-flow-dash' : ''}
      />

      <EdgeLabelRenderer>
        <div
          onClick={handleEdgeClick}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={`nodrag nopan flex items-center gap-1.5 px-2 py-0.5 rounded-full border shadow-lg font-mono text-[9px] font-semibold transition-all select-none cursor-pointer group ${
            isEdgeSelected
              ? 'border-sky-400 bg-slate-900 text-sky-300 ring-2 ring-sky-500/40 shadow-sky-950/50'
              : badgeBorder
          }`}
          title={primaryIssue ? `${primaryIssue.title}: Click to view architecture feedback` : `Connection: ${badgeLabel}`}
        >
          {isInvalid ? (
            <AlertTriangle className="h-3 w-3 text-rose-400 shrink-0" />
          ) : isWarning ? (
            <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
          ) : edgeType === 'replication' ? (
            <RefreshCw className="h-2.5 w-2.5 text-amber-400 shrink-0" />
          ) : null}

          {throughput > 0 && !isInvalid ? (
            <span>{throughput.toLocaleString()} req/s</span>
          ) : (
            <span>{badgeLabel}</span>
          )}

          {/* Direct Disconnect button right on the wire */}
          <button
            onClick={handleDisconnect}
            className="flex items-center justify-center h-3.5 w-3.5 rounded-full bg-slate-800 hover:bg-rose-500 text-slate-400 hover:text-white transition-colors ml-0.5"
            title="Disconnect this connection"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
