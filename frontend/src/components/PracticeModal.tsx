'use client';

import React, { useState, useEffect } from 'react';
import { Flashcard, ConfidenceLevel } from '@prep-kit/shared';
import { api } from '../lib/api';
import {
  RotateCcw,
  Sparkles,
  CheckCircle2,
  X,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface PracticeModalProps {
  kitId: string;
  flashcards: Flashcard[];
  onClose: () => void;
  onFinished: () => void;
}

export function PracticeModal({ kitId, flashcards, onClose, onFinished }: PracticeModalProps) {
  const [deck, setDeck] = useState<Flashcard[]>(flashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [history, setHistory] = useState<Array<{ flashcardId: string; confidence: ConfidenceLevel }>>([]);

  useEffect(() => {
    async function loadPrioritizedDeck() {
      try {
        const res = await api.getPracticeOverview(kitId);
        if (res.prioritizedFlashcards && res.prioritizedFlashcards.length > 0) {
          setDeck(res.prioritizedFlashcards);
        } else {
          setDeck(flashcards);
        }
      } catch {
        setDeck(flashcards);
      } finally {
        setLoading(false);
      }
    }
    loadPrioritizedDeck();
  }, [kitId, flashcards]);

  const currentCard = deck[currentIndex];

  const handleRateConfidence = async (level: ConfidenceLevel) => {
    if (!currentCard) return;

    try {
      await api.recordPractice(kitId, currentCard.id, level);
      setHistory((prev) => [...prev, { flashcardId: currentCard.id, confidence: level }]);

      if (currentIndex + 1 < deck.length) {
        setIsFlipped(false);
        setCurrentIndex((prev) => prev + 1);
      } else {
        setCompleted(true);
      }
    } catch (err) {
      console.error('Failed to record confidence rating:', err);
    }
  };

  const calculateAverageScore = () => {
    if (history.length === 0) return 0;
    const sum = history.reduce((acc, h) => acc + h.confidence, 0);
    return (sum / history.length).toFixed(1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-[#0f1420] border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Flashcard Practice Mode</h2>
              <p className="text-xs text-slate-400">Active Recall & Confidence Tracking</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            Preparing confidence-prioritized flashcard queue...
          </div>
        ) : completed ? (
          /* Completion Summary */
          <div className="py-10 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">Practice Session Complete!</h3>
              <p className="text-sm text-slate-400">
                You reviewed <span className="text-teal-300 font-semibold">{deck.length}</span> card(s).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5">
                <span className="block text-xs text-slate-400 mb-1">Average Confidence</span>
                <span className="text-2xl font-bold font-mono text-teal-400">
                  {calculateAverageScore()} / 5.0
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5">
                <span className="block text-xs text-slate-400 mb-1">Cards Mastered</span>
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  {history.filter((h) => h.confidence >= 4).length}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setIsFlipped(false);
                  setCompleted(false);
                  setHistory([]);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-sm font-medium transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Practice Again
              </button>
              <button
                onClick={() => {
                  onFinished();
                  onClose();
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-bold shadow-lg shadow-teal-500/20 transition-transform hover:scale-102"
              >
                View Prep Kit <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Active Card Review */
          <div className="py-6 flex flex-col flex-1 justify-between">
            {/* Progress Meter */}
            <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
              <span>
                Card <span className="text-teal-400 font-mono font-bold">{currentIndex + 1}</span> of{' '}
                <span className="font-mono">{deck.length}</span>
              </span>
              <div className="flex items-center gap-1.5 text-xs text-teal-400">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Weak-First Priority Queue</span>
              </div>
            </div>

            {/* Flashcard Area */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="relative w-full min-h-[260px] rounded-2xl bg-gradient-to-b from-[#141a29] to-[#101420] border border-white/10 p-6 sm:p-8 flex flex-col justify-between cursor-pointer hover:border-teal-500/30 transition-all shadow-xl select-none"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-white/5 text-slate-400">
                    {currentCard?.id}
                  </span>
                  <span className="text-xs text-slate-500">
                    {isFlipped ? 'Answer (Click to flip)' : 'Prompt (Click to reveal)'}
                  </span>
                </div>

                <div className="space-y-3">
                  <h4 className="text-lg sm:text-xl font-medium text-white leading-relaxed">
                    {isFlipped ? currentCard?.back : currentCard?.front}
                  </h4>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {currentCard?.requirement_ids.map((rid) => (
                    <span
                      key={rid}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800/80 text-slate-400"
                    >
                      {rid}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-teal-400/80 font-medium">
                  {isFlipped ? '✓ Answer Revealed' : 'Tap to reveal answer →'}
                </span>
              </div>
            </div>

            {/* Confidence Ratings (Visible when flipped) */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <span className="block text-xs font-semibold text-slate-400 text-center mb-3">
                Rate your confidence on this topic:
              </span>

              <div className="grid grid-cols-5 gap-2">
                <button
                  onClick={() => handleRateConfidence(1)}
                  className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold flex flex-col items-center gap-1 transition-all"
                >
                  <span>1</span>
                  <span className="text-[10px] font-normal text-rose-300">Very Weak</span>
                </button>

                <button
                  onClick={() => handleRateConfidence(2)}
                  className="p-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 text-xs font-bold flex flex-col items-center gap-1 transition-all"
                >
                  <span>2</span>
                  <span className="text-[10px] font-normal text-orange-300">Weak</span>
                </button>

                <button
                  onClick={() => handleRateConfidence(3)}
                  className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-bold flex flex-col items-center gap-1 transition-all"
                >
                  <span>3</span>
                  <span className="text-[10px] font-normal text-amber-300">Okay</span>
                </button>

                <button
                  onClick={() => handleRateConfidence(4)}
                  className="p-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 text-xs font-bold flex flex-col items-center gap-1 transition-all"
                >
                  <span>4</span>
                  <span className="text-[10px] font-normal text-teal-300">Strong</span>
                </button>

                <button
                  onClick={() => handleRateConfidence(5)}
                  className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex flex-col items-center gap-1 transition-all"
                >
                  <span>5</span>
                  <span className="text-[10px] font-normal text-emerald-300">Mastered</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
