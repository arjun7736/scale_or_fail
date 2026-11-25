'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Lightbulb,
  ExternalLink,
  ShieldCheck,
  Scale,
} from 'lucide-react';
import { ArchitectureIssue } from '@/packages/simulation/core/types';

interface EducationalFeedbackCardProps {
  issue?: ArchitectureIssue;
  isHealthy?: boolean;
  healthyTitle?: string;
  healthyDescription?: string;
  healthyConcept?: string;
}

export function EducationalFeedbackCard({
  issue,
  isHealthy = false,
  healthyTitle = 'Verified Healthy Connection',
  healthyDescription = 'This architectural dependency satisfies distributed system design principles and routing rules.',
  healthyConcept = 'Clean Decoupled Architecture',
}: EducationalFeedbackCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isHealthy || !issue) {
    return (
      <div className="rounded-xl border border-teal-500/30 bg-teal-950/20 p-3 space-y-2">
        <div className="flex items-center gap-2 text-teal-300 font-semibold text-xs">
          <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
          <span>{healthyTitle}</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
          {healthyDescription}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-teal-400/90 pt-1 border-t border-teal-500/20">
          <BookOpen className="h-3 w-3 shrink-0" />
          <span>Concept: {healthyConcept}</span>
        </div>
      </div>
    );
  }

  const isError = issue.severity === 'error';
  const isWarning = issue.severity === 'warning';

  const badgeBg = isError
    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
    : isWarning
    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    : 'bg-sky-500/20 text-sky-300 border-sky-500/40';

  const cardBorder = isError
    ? 'border-rose-500/40 bg-rose-950/15'
    : isWarning
    ? 'border-amber-500/40 bg-amber-950/15'
    : 'border-sky-500/30 bg-sky-950/15';

  return (
    <div className={`rounded-xl border ${cardBorder} p-3 space-y-2.5 transition-all text-xs`}>
      {/* Title & Severity Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {isError ? (
            <AlertOctagon className="h-4 w-4 text-rose-400 shrink-0" />
          ) : isWarning ? (
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          ) : (
            <Info className="h-4 w-4 text-sky-400 shrink-0" />
          )}
          <span className="font-semibold text-slate-100 leading-snug">
            {issue.title}
          </span>
        </div>
        <span
          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 border ${badgeBg}`}
        >
          {issue.severity}
        </span>
      </div>

      {/* Primary Message */}
      <p className="text-[11px] text-slate-200 font-medium leading-relaxed">
        {issue.message}
      </p>

      {/* Learning Concept Banner */}
      {issue.learningConcept && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] text-teal-300 font-mono">
          <BookOpen className="h-3 w-3 text-teal-400 shrink-0" />
          <span className="font-semibold text-slate-400">Concept:</span>
          <span className="leading-tight break-words">{issue.learningConcept}</span>
        </div>
      )}

      {/* Expand/Collapse Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full pt-1.5 text-[10px] font-mono text-slate-400 hover:text-slate-200 border-t border-slate-800/80 transition-colors"
      >
        <span className="flex items-center gap-1">
          <Lightbulb className="h-3 w-3 text-amber-400" />
          {isExpanded ? 'Hide Technical Analysis' : 'Show Architectural Deep-Dive'}
        </span>
        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {/* Expanded Educational Section */}
      {isExpanded && (
        <div className="space-y-3 pt-2 text-[11px] animate-in fade-in duration-150">
          {/* Explanation: What is wrong and why */}
          {issue.explanation && (
            <div>
              <div className="font-semibold text-slate-300 font-mono text-[10px] uppercase mb-0.5">
                Why is this problematic?
              </div>
              <p className="text-slate-400 leading-relaxed font-sans">
                {issue.explanation}
              </p>
            </div>
          )}

          {/* Consequence: What happens under load */}
          {issue.consequence && (
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="font-semibold text-rose-300 font-mono text-[10px] uppercase mb-0.5 flex items-center gap-1">
                <span>Simulation Impact</span>
              </div>
              <p className="text-slate-300 text-[10px] leading-relaxed">
                {issue.consequence}
              </p>
            </div>
          )}

          {/* Suggested Approaches & Trade-offs */}
          {issue.suggestedApproaches && issue.suggestedApproaches.length > 0 && (
            <div>
              <div className="font-semibold text-slate-300 font-mono text-[10px] uppercase mb-1 flex items-center gap-1">
                <Scale className="h-3 w-3 text-teal-400" />
                <span>Recommended Solutions & Trade-Offs</span>
              </div>
              <div className="space-y-2">
                {issue.suggestedApproaches.map((app, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1"
                  >
                    <div className="font-semibold text-slate-200 text-[10.5px]">
                      {idx + 1}. {app.title}
                    </div>
                    <p className="text-slate-400 text-[10px] leading-relaxed font-sans">
                      {app.description}
                    </p>
                    {app.tradeOffs && (
                      <div className="text-[9.5px] text-amber-300/90 pt-0.5 font-mono">
                        <span className="font-bold text-slate-500">Trade-off: </span>
                        {app.tradeOffs}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Difficulty Specific Guidance */}
          {issue.difficultyDetails && (
            <div className="pt-1 border-t border-slate-800/80 text-[10px] font-mono space-y-1 text-slate-400">
              {issue.difficultyDetails.beginnerHint && (
                <div>
                  <span className="text-emerald-400 font-bold">Beginner Tip: </span>
                  <span>{issue.difficultyDetails.beginnerHint}</span>
                </div>
              )}
              {issue.difficultyDetails.intermediateGuidance && (
                <div>
                  <span className="text-amber-400 font-bold">System Guidance: </span>
                  <span>{issue.difficultyDetails.intermediateGuidance}</span>
                </div>
              )}
            </div>
          )}

          {/* Reference Documentation Links */}
          {issue.docLinks && issue.docLinks.length > 0 && (
            <div className="pt-1 border-t border-slate-800/80 text-[10px] font-mono">
              <span className="text-slate-500 block mb-1">References:</span>
              <div className="space-y-0.5">
                {issue.docLinks.map((doc, dIdx) => (
                  <div key={dIdx} className="flex items-center gap-1 text-sky-400 hover:text-sky-300">
                    <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                    <span>{doc.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
