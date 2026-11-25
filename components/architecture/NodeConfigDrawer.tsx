'use client';

import React from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { useArchitectureStore } from '@/stores/architectureStore';
import { useGameStore } from '@/stores/gameStore';
import { EducationalFeedbackCard } from './EducationalFeedbackCard';
import { EdgeInspector } from './drawer/EdgeInspector';
import { NodeStatusBanner } from './drawer/NodeStatusBanner';
import { ConnectedLinksList } from './drawer/ConnectedLinksList';
import { NodeConfigFormDispatcher } from './drawer/config-forms';

export function NodeConfigDrawer() {
  const selectedNodeId = useArchitectureStore((s) => s.selectedNodeId);
  const selectedEdgeId = useArchitectureStore((s) => s.selectedEdgeId);
  const selectNode = useArchitectureStore((s) => s.selectNode);
  const removeNode = useArchitectureStore((s) => s.removeNode);
  const removeEdge = useArchitectureStore((s) => s.removeEdge);
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);
  const validationResult = useArchitectureStore((s) => s.validationResult);

  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  const updateNodeConfigInGame = useGameStore((s) => s.updateNodeConfigInGame);
  const syncGraph = useGameStore((s) => s.syncGraph);
  const componentMetrics = useGameStore((s) =>
    selectedNodeId ? s.componentMetrics[selectedNodeId] : null
  );

  // If an edge is selected, delegate to EdgeInspector
  if (selectedEdgeId) {
    return <EdgeInspector />;
  }

  if (!selectedNodeId) return null;

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const incomingEdges = edges.filter((e) => e.target === selectedNodeId);
  const outgoingEdges = edges.filter((e) => e.source === selectedNodeId);

  const type = node.type || node.data?.type;
  const config = node.data?.config as any;

  const handleUpdate = (patch: any) => {
    if (patch.role === 'primary') {
      // Demote any other database to replica to prevent split-brain write conflicts
      nodes.forEach((n) => {
        const nType = n.type || n.data?.type;
        if (nType === 'database' && n.id !== selectedNodeId && (n.data?.config as any)?.role === 'primary') {
          updateNodeConfig(n.id, { role: 'replica' });
          updateNodeConfigInGame(n.id, { role: 'replica' });
        }
      });
    }
    updateNodeConfig(selectedNodeId, patch);
    updateNodeConfigInGame(selectedNodeId, patch);
    setTimeout(() => syncGraph(), 30);
  };

  const handleDelete = () => {
    removeNode(selectedNodeId);
    selectNode(null);
    setTimeout(() => syncGraph(), 30);
  };

  const handleDisconnectEdge = (edgeId: string) => {
    removeEdge(edgeId);
    setTimeout(() => syncGraph(), 30);
  };

  const nodeIssues = validationResult?.nodeIssuesMap[selectedNodeId] || [];

  return (
    <>
      {/* Mobile Backdrop Overlay - closes on tap outside */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-30 md:hidden animate-in fade-in"
        onClick={() => selectNode(null)}
      />

      <div className="fixed inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl md:inset-x-auto md:bottom-3 md:top-3 md:right-3 md:w-80 md:max-h-none md:rounded-2xl md:absolute bg-slate-900/98 md:bg-slate-900/95 border-t md:border border-slate-700 md:border-slate-800 shadow-2xl backdrop-blur-xl z-40 md:z-20 flex flex-col animate-in slide-in-from-bottom md:slide-in-from-right-4 duration-200 overflow-hidden">
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mt-2.5 md:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-mono">
              Node Configuration
            </div>
            <div className="text-sm font-semibold text-slate-100 mt-0.5">
              {(node.data?.label as string) || node.id}
            </div>
          </div>

          <button
            onClick={() => selectNode(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Drawer Body - ensures Architecture Feedback, Links & Controls all scroll smoothly */}
        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 divide-y divide-slate-800/80">
          {/* Live status banner */}
          <NodeStatusBanner metrics={componentMetrics} />

          {/* Architecture Educational Feedback Issues */}
          {nodeIssues.length > 0 && (
            <div className="p-3 space-y-2 bg-slate-950/40">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 font-mono flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Architecture Feedback ({nodeIssues.length})</span>
              </div>
              {nodeIssues.map((issue) => (
                <EducationalFeedbackCard key={issue.id} issue={issue} />
              ))}
            </div>
          )}

          {/* Connected Links & Disconnect Controls */}
          <ConnectedLinksList
            incomingEdges={incomingEdges}
            outgoingEdges={outgoingEdges}
            nodes={nodes}
            onDisconnectEdge={handleDisconnectEdge}
          />

          {/* Configuration Controls */}
          <div className="p-4 space-y-5 text-xs">
            <NodeConfigFormDispatcher
              type={type as string}
              config={config}
              onUpdate={handleUpdate}
            />
          </div>
        </div>

        {/* Delete / Actions Footer */}
        {type !== 'client' && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/50 shrink-0">
            <button
              onClick={handleDelete}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-medium text-xs transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Decommission Node
            </button>
          </div>
        )}
      </div>
    </>
  );
}
