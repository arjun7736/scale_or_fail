'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Edge, Node } from '@xyflow/react';

interface ConnectedLinksListProps {
  incomingEdges: Edge[];
  outgoingEdges: Edge[];
  nodes: Node[];
  onDisconnectEdge: (edgeId: string) => void;
}

export function ConnectedLinksList({
  incomingEdges,
  outgoingEdges,
  nodes,
  onDisconnectEdge,
}: ConnectedLinksListProps) {
  const totalCount = incomingEdges.length + outgoingEdges.length;

  return (
    <div className="p-3 bg-slate-950/40 space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
        <span>Connected Network Links ({totalCount})</span>
      </div>

      {totalCount === 0 ? (
        <p className="text-[10px] text-slate-500 font-mono italic">No connected links</p>
      ) : (
        <div className="space-y-1.5 font-mono text-[10px]">
          {incomingEdges.map((e) => {
            const srcNode = nodes.find((n) => n.id === e.source);
            return (
              <div
                key={e.id}
                className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800"
              >
                <span className="text-slate-300 truncate max-w-[170px]">
                  ← From: <strong className="text-teal-400 font-normal">{(srcNode?.data?.label as string) || e.source}</strong>
                </span>
                <button
                  onClick={() => onDisconnectEdge(e.id)}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-[9px] font-semibold transition-colors"
                  title="Disconnect this link"
                >
                  <X className="h-2.5 w-2.5" /> Disconnect
                </button>
              </div>
            );
          })}

          {outgoingEdges.map((e) => {
            const tgtNode = nodes.find((n) => n.id === e.target);
            return (
              <div
                key={e.id}
                className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800"
              >
                <span className="text-slate-300 truncate max-w-[170px]">
                  → To: <strong className="text-purple-400 font-normal">{(tgtNode?.data?.label as string) || e.target}</strong>
                </span>
                <button
                  onClick={() => onDisconnectEdge(e.id)}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-[9px] font-semibold transition-colors"
                  title="Disconnect this link"
                >
                  <X className="h-2.5 w-2.5" /> Disconnect
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
