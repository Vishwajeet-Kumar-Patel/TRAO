'use client';

import React from 'react';
import { KitGenerationProgress } from '@prep-kit/shared';
import { CheckCircle2, CircleDashed, AlertCircle, Loader2 } from 'lucide-react';

interface ProgressTrackerProps {
  progress: KitGenerationProgress;
  status: 'queued' | 'running' | 'completed' | 'failed';
  error?: string | null;
}

const STAGES = [
  { id: 'validating', label: 'Validate Input' },
  { id: 'extracting', label: 'Extract Requirements' },
  { id: 'researching', label: 'Company Retrieval & Crawl' },
  { id: 'generating_brief', label: 'Company Brief' },
  { id: 'generating_questions', label: 'Categorized Questions' },
  { id: 'generating_flashcards', label: 'Active Recall Cards' },
  { id: 'checking_coverage', label: 'Deterministic Coverage' },
  { id: 'closing_gaps', label: 'Second-Pass Gap Closing' },
  { id: 'scheduling', label: 'Deterministic Schedule' },
  { id: 'validating_kit', label: 'Appendix A Validation' },
];

export function ProgressTracker({ progress, status, error }: ProgressTrackerProps) {
  const currentStageIndex = STAGES.findIndex((s) => s.id === progress.stage);
  const isFailed = status === 'failed';
  const isCompleted = status === 'completed';

  return (
    <div className="w-full rounded-2xl glass-panel p-6 border border-white/10 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isCompleted ? (
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          ) : isFailed ? (
            <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
          <div>
            <h3 className="text-base font-semibold text-white">
              {isCompleted
                ? 'Generation Complete'
                : isFailed
                ? 'Generation Failed'
                : 'Generating Interview Prep Kit'}
            </h3>
            <p className="text-xs text-slate-400">{progress.message}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xl font-bold font-mono text-teal-400">
            {isCompleted ? 100 : progress.percentage}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 rounded-full bg-slate-800/80 overflow-hidden mb-6 border border-white/5">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isFailed
              ? 'bg-rose-500'
              : isCompleted
              ? 'bg-gradient-to-r from-teal-500 to-emerald-400'
              : 'bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-300 animate-pulse'
          }`}
          style={{ width: `${isCompleted ? 100 : Math.max(5, progress.percentage)}%` }}
        />
      </div>

      {/* Stage Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {STAGES.map((s, idx) => {
          let stageStatus: 'done' | 'current' | 'pending' | 'failed' = 'pending';

          if (isCompleted) {
            stageStatus = 'done';
          } else if (isFailed && idx === currentStageIndex) {
            stageStatus = 'failed';
          } else if (idx < currentStageIndex) {
            stageStatus = 'done';
          } else if (idx === currentStageIndex) {
            stageStatus = 'current';
          }

          return (
            <div
              key={s.id}
              className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2 border transition-all ${
                stageStatus === 'done'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : stageStatus === 'current'
                  ? 'bg-teal-500/20 border-teal-500/40 text-teal-200 shadow-sm shadow-teal-500/10'
                  : stageStatus === 'failed'
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  : 'bg-slate-900/40 border-white/5 text-slate-500'
              }`}
            >
              {stageStatus === 'done' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : stageStatus === 'current' ? (
                <CircleDashed className="w-3.5 h-3.5 text-teal-400 animate-spin shrink-0" />
              ) : stageStatus === 'failed' ? (
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-700 shrink-0" />
              )}
              <span className="truncate">{s.label}</span>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}
    </div>
  );
}
