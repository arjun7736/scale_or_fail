'use client';

import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { useArchitectureStore } from '@/stores/architectureStore';

export function NodeValidationBadge({ nodeId }: { nodeId: string }) {
  const validationResult = useArchitectureStore((s) => s.validationResult);
  const issues = validationResult?.nodeIssuesMap[nodeId] || [];
  if (issues.length === 0) return null;

  const hasError = issues.some((i) => i.severity === 'error');
  const hasWarning = issues.some((i) => i.severity === 'warning');
  const topIssue = issues[0];

  if (hasError) {
    return (
      <div
        className="absolute -top-2 -right-2 z-10 flex items-center justify-center h-5 w-5 rounded-full bg-rose-500 text-white shadow-lg shadow-rose-950/60 ring-2 ring-slate-900 animate-pulse cursor-pointer"
        title={`Error: ${topIssue.title} - Click to inspect`}
      >
        <AlertTriangle className="h-3 w-3" />
      </div>
    );
  }

  if (hasWarning) {
    return (
      <div
        className="absolute -top-2 -right-2 z-10 flex items-center justify-center h-5 w-5 rounded-full bg-amber-500 text-slate-950 shadow-md shadow-amber-950/50 ring-2 ring-slate-900 cursor-pointer"
        title={`Warning: ${topIssue.title} - Click to inspect`}
      >
        <AlertTriangle className="h-3 w-3" />
      </div>
    );
  }

  return (
    <div
      className="absolute -top-2 -right-2 z-10 flex items-center justify-center h-5 w-5 rounded-full bg-sky-500 text-white shadow-md ring-2 ring-slate-900 cursor-pointer"
      title={`Note: ${topIssue.title}`}
    >
      <Info className="h-3 w-3" />
    </div>
  );
}
