'use client';

import React, { useState } from 'react';
import { Question, QuestionCategory } from '@prep-kit/shared';
import { Pin, Edit3, Trash2, ChevronDown, ChevronUp, Check, X, Shield } from 'lucide-react';

interface QuestionItemProps {
  question: Question;
  allRequirementIds: Array<{ id: string; text: string }>;
  onUpdate: (updated: Partial<Question>) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function QuestionItem({
  question,
  allRequirementIds,
  onUpdate,
  onDelete,
}: QuestionItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit state
  const [prompt, setPrompt] = useState(question.prompt);
  const [outline, setOutline] = useState(question.answer_outline);
  const [category, setCategory] = useState<QuestionCategory>(question.category);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(question.difficulty);
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>(question.requirement_ids || []);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        prompt,
        answer_outline: outline,
        category,
        difficulty,
        requirement_ids: selectedReqIds.length > 0 ? selectedReqIds : question.requirement_ids,
        edited: true,
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async () => {
    await onUpdate({ pinned: !question.pinned });
  };

  const getDifficultyBadge = (diff: number) => {
    switch (diff) {
      case 3:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/20">Hard (L3)</span>;
      case 2:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">Medium (L2)</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-500/15 text-teal-400 border border-teal-500/20">Foundational (L1)</span>;
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'technical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20">Technical</span>;
      case 'behavioural':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/15 text-purple-400 border border-purple-500/20">Behavioural</span>;
      case 'system-design':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">System Design</span>;
      case 'company-fit':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-orange-500/15 text-orange-400 border border-orange-500/20">Company Fit</span>;
      default:
        return null;
    }
  };

  return (
    <div
      className={`rounded-xl border transition-all ${
        question.pinned
          ? 'bg-amber-950/20 border-amber-500/30'
          : 'bg-[#121620]/90 border-white/10 hover:border-white/20'
      } p-4 shadow-sm`}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-white/5 text-slate-400 border border-white/5">
            {question.id}
          </span>
          {getCategoryBadge(question.category)}
          {getDifficultyBadge(question.difficulty)}

          {question.pinned && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Shield className="w-3 h-3" /> Pinned (Regen Protected)
            </span>
          )}

          {question.edited && !question.pinned && (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/20">
              User Edited
            </span>
          )}

          {question.origin === 'user' && !question.edited && (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
              Custom Created
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleTogglePin}
            title={question.pinned ? 'Unpin question' : 'Pin question (protects from regeneration)'}
            className={`p-1.5 rounded-lg transition-colors ${
              question.pinned
                ? 'bg-amber-500/20 text-amber-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsEditing(!isEditing)}
            title="Edit question"
            className={`p-1.5 rounded-lg transition-colors ${
              isEditing ? 'bg-teal-500/20 text-teal-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onDelete}
            title="Delete question"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content / Edit Form */}
      {isEditing ? (
        <div className="mt-4 space-y-3 pt-3 border-t border-white/10">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Question Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              className="w-full bg-slate-900/80 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as QuestionCategory)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="technical">Technical</option>
                <option value="behavioural">Behavioural</option>
                <option value="system-design">System Design</option>
                <option value="company-fit">Company Fit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value) as 1 | 2 | 3)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value={1}>1 - Foundational</option>
                <option value={2}>2 - Intermediate</option>
                <option value={3}>3 - Advanced / Deep</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Answer Outline</label>
            <textarea
              value={outline}
              onChange={(e) => setOutline(e.target.value)}
              rows={4}
              className="w-full bg-slate-900/80 border border-white/10 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20"
            >
              <Check className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2.5">
          <p className="text-sm font-medium text-slate-100 leading-relaxed">{question.prompt}</p>

          {/* Linked Requirements */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-500">Covers:</span>
            {question.requirement_ids.map((reqId) => {
              const reqText = allRequirementIds.find((r) => r.id === reqId)?.text || reqId;
              return (
                <span
                  key={reqId}
                  title={reqText}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800/80 text-slate-300 border border-white/5 truncate max-w-[200px]"
                >
                  {reqId}: {reqText}
                </span>
              );
            })}
          </div>

          {/* Collapsible Answer Outline */}
          <div className="mt-3 pt-2.5 border-t border-white/5">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-medium"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{expanded ? 'Hide Answer Outline' : 'View Answer Outline & Key Points'}</span>
            </button>

            {expanded && (
              <div className="mt-2 p-3 rounded-lg bg-slate-900/60 border border-white/5 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                {question.answer_outline}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
