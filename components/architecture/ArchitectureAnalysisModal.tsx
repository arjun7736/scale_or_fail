'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  TrendingUp,
  Cpu,
  Layers,
  Scale,
  DollarSign,
  Award,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { useArchitectureStore } from '@/stores/architectureStore';
import { EducationalFeedbackCard } from './EducationalFeedbackCard';

export function ArchitectureAnalysisModal() {
  const isOpen = useGameStore((s) => s.isAnalysisModalOpen);
  const closeAnalysisModal = useGameStore((s) => s.closeAnalysisModal);
  const assessment = useGameStore((s) => s.architectureAssessment);
  const systemMetrics = useGameStore((s) => s.systemMetrics);
  const difficulty = useGameStore((s) => s.difficulty);
  const validationResult = useArchitectureStore((s) => s.validationResult);

  const [activeTab, setActiveTab] = useState<'all' | 'errors' | 'warnings' | 'info'>('all');

  if (!isOpen) return null;

  const currentAssessment = assessment || validationResult?.assessment;
  const issues = validationResult?.issues || [];

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const infos = issues.filter((i) => i.severity === 'info');

  const filteredIssues =
    activeTab === 'errors'
      ? errors
      : activeTab === 'warnings'
      ? warnings
      : activeTab === 'info'
      ? infos
      : issues;

  // Grade badge styling
  const grade = currentAssessment?.letterGrade || 'B';
  const gradeColor =
    grade === 'A+' || grade === 'A'
      ? 'text-teal-400 border-teal-500/40 bg-teal-500/10 shadow-teal-950/50'
      : grade === 'B'
      ? 'text-sky-400 border-sky-500/40 bg-sky-500/10 shadow-sky-950/50'
      : grade === 'C'
      ? 'text-amber-400 border-amber-500/40 bg-amber-500/10 shadow-amber-950/50'
      : 'text-rose-400 border-rose-500/40 bg-rose-500/10 shadow-rose-950/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Container */}
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900/98 shadow-2xl shadow-slate-950 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Architecture Design Assessment</span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  Stage {systemMetrics.stage}: {systemMetrics.stageName}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
                Evaluated against {systemMetrics.incomingRps.toLocaleString()} RPS • {difficulty.toUpperCase()} MODE
              </p>
            </div>
          </div>

          <button
            onClick={closeAnalysisModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Hero Banner: Score & Letter Grade */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-950/60">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div
                className={`flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl border-2 font-mono text-3xl sm:text-4xl font-extrabold shadow-xl shrink-0 ${gradeColor}`}
              >
                {grade}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-slate-100">
                    {currentAssessment?.overallScore ?? 85}/100
                  </span>
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Overall Architecture Score
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans max-w-md leading-relaxed">
                  {currentAssessment?.summary ||
                    currentAssessment?.learningSummary ||
                    'System topology validated against current traffic volume and reliability constraints.'}
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 font-mono text-xs">
              <span className="text-slate-400">Issues Detected:</span>
              <div className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${errors.length > 0 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-500'}`}>
                  {errors.length} Errors
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${warnings.length > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-500'}`}>
                  {warnings.length} Warnings
                </span>
              </div>
            </div>
          </div>

          {/* 5-Dimension Radar / Bar Cards */}
          {currentAssessment && (
            <div className="space-y-2">
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>The 5 Architectural Dimensions</span>
                <span className="text-[10px] text-slate-500">Benchmark: Production Standards</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {/* 1. Routing Correctness */}
                <DimensionCard
                  icon={<ShieldCheck className="h-4 w-4 text-emerald-400" />}
                  title="Routing Correctness"
                  assessment={currentAssessment.dimensions.routingCorrectness}
                />
                {/* 2. Performance Efficiency */}
                <DimensionCard
                  icon={<Cpu className="h-4 w-4 text-sky-400" />}
                  title="Performance Efficiency"
                  assessment={currentAssessment.dimensions.performanceEfficiency}
                />
                {/* 3. Scalability */}
                <DimensionCard
                  icon={<TrendingUp className="h-4 w-4 text-teal-400" />}
                  title="Scalability"
                  assessment={currentAssessment.dimensions.scalability}
                />
                {/* 4. Reliability & Resilience */}
                <DimensionCard
                  icon={<Layers className="h-4 w-4 text-amber-400" />}
                  title="Reliability & Resilience"
                  assessment={currentAssessment.dimensions.reliability}
                />
                {/* 5. Cost Efficiency */}
                <DimensionCard
                  icon={<DollarSign className="h-4 w-4 text-indigo-400" />}
                  title="Cost Efficiency"
                  assessment={currentAssessment.dimensions.costEfficiency}
                />
                {/* Concepts Card */}
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 space-y-1.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300 font-mono">
                      <BookOpen className="h-4 w-4 text-purple-400" />
                      <span>Key Principles</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      System design patterns demonstrated in this architecture.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(currentAssessment.keyConcepts || ['Layered Ingress', 'Decoupled Compute', 'Data Persistence']).slice(0, 3).map((concept: string, cIdx: number) => (
                      <span
                        key={cIdx}
                        className="px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-[9px] truncate max-w-[150px]"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Educational Issues Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
                Architectural Findings & Educational Insights
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5 text-[10px] font-mono">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-2 py-0.5 rounded transition-all ${
                    activeTab === 'all' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({issues.length})
                </button>
                <button
                  onClick={() => setActiveTab('errors')}
                  className={`px-2 py-0.5 rounded transition-all ${
                    activeTab === 'errors' ? 'bg-rose-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Errors ({errors.length})
                </button>
                <button
                  onClick={() => setActiveTab('warnings')}
                  className={`px-2 py-0.5 rounded transition-all ${
                    activeTab === 'warnings' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Warnings ({warnings.length})
                </button>
                <button
                  onClick={() => setActiveTab('info')}
                  className={`px-2 py-0.5 rounded transition-all ${
                    activeTab === 'info' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tips ({infos.length})
                </button>
              </div>
            </div>

            {filteredIssues.length === 0 ? (
              <div className="p-6 rounded-xl border border-teal-500/30 bg-teal-950/20 text-center space-y-2">
                <Sparkles className="h-8 w-8 text-teal-400 mx-auto" />
                <h3 className="text-sm font-bold text-teal-200">
                  No {activeTab !== 'all' ? activeTab : ''} Issues Found!
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  Your architecture is currently functioning cleanly for this stage without any detected violations or immediate bottlenecks.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredIssues.map((issue) => (
                  <EducationalFeedbackCard key={issue.id} issue={issue} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-slate-800 bg-slate-950/50 text-xs font-mono">
          <span className="text-slate-500 hidden sm:inline">
            Press Esc or click Close to return to canvas
          </span>
          <button
            onClick={closeAnalysisModal}
            className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition-all ml-auto"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function DimensionCard({
  icon,
  title,
  assessment,
}: {
  icon: React.ReactNode;
  title: string;
  assessment: import('@/packages/simulation/core/types').DimensionAssessment;
}) {
  const score = assessment.score;
  const ratingColor =
    score >= 85
      ? 'text-teal-400'
      : score >= 70
      ? 'text-sky-400'
      : score >= 50
      ? 'text-amber-400'
      : 'text-rose-400';

  const barColor =
    score >= 85
      ? 'bg-teal-500'
      : score >= 70
      ? 'bg-sky-500'
      : score >= 50
      ? 'bg-amber-500'
      : 'bg-rose-500';

  return (
    <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 space-y-1.5">
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
          {icon}
          <span className="truncate">{title}</span>
        </div>
        <span className={`font-bold ${ratingColor}`}>{score}%</span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
        />
      </div>

      <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
        {assessment.feedback || assessment.summary}
      </p>
    </div>
  );
}
