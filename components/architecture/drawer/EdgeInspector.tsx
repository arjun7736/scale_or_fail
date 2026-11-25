'use client';

import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { useArchitectureStore } from '@/stores/architectureStore';
import { useGameStore } from '@/stores/gameStore';
import { EducationalFeedbackCard } from '../EducationalFeedbackCard';

export function EdgeInspector() {
  const selectedEdgeId = useArchitectureStore((s) => s.selectedEdgeId);
  const selectEdge = useArchitectureStore((s) => s.selectEdge);
  const removeEdge = useArchitectureStore((s) => s.removeEdge);
  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  const validationResult = useArchitectureStore((s) => s.validationResult);
  const syncGraph = useGameStore((s) => s.syncGraph);

  if (!selectedEdgeId) return null;

  const edge = edges.find((e) => e.id === selectedEdgeId);
  if (!edge) return null;

  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);
  const edgeIssues = validationResult?.edgeIssuesMap[selectedEdgeId] || [];
  const edgeMetric = useGameStore.getState().edgeMetrics[selectedEdgeId];
  const primaryIssue = edgeIssues[0];
  const edgeType = (edge.data?.edgeType as string) || 'http_traffic';

  const handleDisconnect = () => {
    removeEdge(selectedEdgeId);
    selectEdge(null);
    setTimeout(() => syncGraph(), 30);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-30 md:hidden animate-in fade-in"
        onClick={() => selectEdge(null)}
      />
      <div className="fixed inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl md:inset-x-auto md:bottom-3 md:top-3 md:right-3 md:w-80 md:max-h-none md:rounded-2xl md:absolute bg-slate-900/98 md:bg-slate-900/95 border-t md:border border-slate-700 md:border-slate-800 shadow-2xl backdrop-blur-xl z-40 md:z-20 flex flex-col animate-in slide-in-from-bottom md:slide-in-from-right-4 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">
              Connection Inspector
            </div>
            <div className="text-xs font-semibold text-slate-100 mt-0.5 truncate max-w-[210px]">
              {(sourceNode?.data?.label as string) || edge.source} → {(targetNode?.data?.label as string) || edge.target}
            </div>
          </div>
          <button
            onClick={() => selectEdge(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 p-3 space-y-3">
          {/* Semantic Relationship Badge */}
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 font-mono text-[11px] space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Semantic Type:</span>
              <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30 uppercase font-bold text-[10px]">
                {edgeType.replace('_', ' ')}
              </span>
            </div>
            {edgeMetric && (
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Active Throughput:</span>
                <span className="font-bold text-sky-400">
                  {edgeMetric.throughputRps.toLocaleString()} req/s
                </span>
              </div>
            )}
          </div>

          {/* Educational Feedback Card */}
          <EducationalFeedbackCard
            issue={primaryIssue}
            isHealthy={!primaryIssue}
            healthyTitle="Supported Architecture Connection"
            healthyDescription={`This ${edgeType.replace('_', ' ')} connection between ${(sourceNode?.data?.label as string) || 'source'} and ${(targetNode?.data?.label as string) || 'target'} is valid and conforms to system design routing rules.`}
            healthyConcept={
              edgeType === 'replication'
                ? 'Database Replication & Read Scaling'
                : edgeType === 'cache_access'
                ? 'Cache-Aside Query Acceleration'
                : edgeType === 'async_message'
                ? 'Asynchronous Decoupled Message Flow'
                : 'HTTP Request Routing'
            }
          />

          {/* Disconnect Action */}
          <button
            onClick={handleDisconnect}
            className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 hover:border-rose-500 font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all mt-2"
          >
            <Trash2 className="h-3.5 w-3.5" /> Disconnect Connection
          </button>
        </div>
      </div>
    </>
  );
}
