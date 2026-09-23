'use client';

import React from 'react';
import { WeakSpotsReport } from '@prep-kit/shared';
import { AlertTriangle, TrendingUp, CheckCircle, Lightbulb, Play } from 'lucide-react';

interface WeakSpotsCardProps {
  report: WeakSpotsReport | null;
  onLaunchPractice: () => void;
}

export function WeakSpotsCard({ report, onLaunchPractice }: WeakSpotsCardProps) {
  if (!report) {
    return (
      <div className="p-8 rounded-2xl glass-panel text-center text-slate-400">
        <Lightbulb className="w-8 h-8 text-teal-400 mx-auto mb-3 opacity-60" />
        <p className="text-sm">Practice flashcards and review questions to generate your personalized Weak Spots Analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-950/40 via-slate-900/60 to-purple-950/40 border border-teal-500/20 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold font-mono text-teal-400">
              {report.overallScore}%
            </span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-400" />
              Interview Preparedness Score
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Based on your flashcard confidence ratings, requirement coverage, and question difficulty distribution.
            </p>
          </div>
        </div>

        <button
          onClick={onLaunchPractice}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/20 transition-transform hover:scale-102 shrink-0"
        >
          <Play className="w-4 h-4 fill-slate-950" />
          Target Weak Areas Now
        </button>
      </div>

      {/* Weak Spots Breakdown */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Top Priority Improvement Areas
        </h4>

        <div className="grid grid-cols-1 gap-3">
          {report.weakSpots.map((spot, idx) => (
            <div
              key={spot.requirementId}
              className="p-4 rounded-xl bg-[#121620]/90 border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/5 text-slate-400 text-xs flex items-center justify-center font-mono">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-mono font-bold text-teal-400">
                    {spot.requirementId}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      spot.priority === 'must'
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {spot.priority.toUpperCase()}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-slate-400 font-medium">
                    {spot.kind}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Avg Confidence:</span>
                  <span
                    className={`font-mono font-bold ${
                      spot.averageConfidence <= 2
                        ? 'text-rose-400'
                        : spot.averageConfidence <= 3.5
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {spot.averageConfidence} / 5.0
                  </span>
                </div>
              </div>

              <p className="text-sm font-medium text-slate-200 mb-2">{spot.requirementText}</p>

              {/* Recommendation Box */}
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 flex items-start gap-2 text-xs text-slate-300">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{spot.recommendation}</span>
              </div>

              {/* Sample Questions */}
              {spot.sampleQuestions.length > 0 && (
                <div className="mt-3 pt-2 border-t border-white/5">
                  <span className="block text-[11px] text-slate-400 mb-1 font-semibold">
                    Key Questions for this Area:
                  </span>
                  <ul className="space-y-1">
                    {spot.sampleQuestions.map((sq, sIdx) => (
                      <li key={sIdx} className="text-xs text-slate-300 flex items-start gap-1.5">
                        <span className="text-teal-400">•</span>
                        <span>{sq}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
