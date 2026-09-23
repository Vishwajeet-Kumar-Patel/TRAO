'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { api, KitRecordResponse } from '../../lib/api';
import {
  PlusCircle,
  Briefcase,
  Globe,
  Calendar,
  Layers,
  ArrowRight,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [kits, setKits] = useState<KitRecordResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/#auth');
      return;
    }

    async function fetchKits() {
      try {
        const res = await api.getKits();
        setKits(res.kits);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch interview kits');
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchKits();
    }
  }, [user, authLoading, router]);

  const handleDelete = async (kitId: string) => {
    if (!confirm('Are you sure you want to delete this prep kit?')) return;
    try {
      await api.deleteKit(kitId);
      setKits((prev) => prev.filter((k) => k.id !== kitId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete kit');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Loading your interview preparation dashboard...</p>
      </div>
    );
  }

  const completedCount = kits.filter((k) => k.status === 'completed').length;
  const totalQuestions = kits.reduce((acc, k) => acc + (k.kit?.questions.length || 0), 0);
  const totalFlashcards = kits.reduce((acc, k) => acc + (k.kit?.flashcards.length || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Interview Prep Kits</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your company-specific preparation workspaces, coverage, and schedules.
          </p>
        </div>

        <Link
          href="/create"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-bold shadow-lg shadow-teal-500/20 transition-all hover:scale-102 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Kit
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl glass-panel">
          <span className="block text-xs text-slate-400 mb-1">Total Kits</span>
          <span className="text-2xl font-bold font-mono text-white">{kits.length}</span>
        </div>
        <div className="p-4 rounded-xl glass-panel">
          <span className="block text-xs text-slate-400 mb-1">Completed Kits</span>
          <span className="text-2xl font-bold font-mono text-teal-400">{completedCount}</span>
        </div>
        <div className="p-4 rounded-xl glass-panel">
          <span className="block text-xs text-slate-400 mb-1">Prepared Questions</span>
          <span className="text-2xl font-bold font-mono text-emerald-400">{totalQuestions}</span>
        </div>
        <div className="p-4 rounded-xl glass-panel">
          <span className="block text-xs text-slate-400 mb-1">Active Recall Cards</span>
          <span className="text-2xl font-bold font-mono text-purple-400">{totalFlashcards}</span>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Kits List Grid */}
      {kits.length === 0 ? (
        <div className="py-16 text-center rounded-2xl glass-panel border border-dashed border-white/10 space-y-4">
          <div className="w-12 h-12 rounded-full bg-teal-500/10 text-teal-400 mx-auto flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Interview Prep Kits Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Paste a job description and company URL to generate your first comprehensive interview kit.
            </p>
          </div>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-md shadow-teal-500/20"
          >
            <PlusCircle className="w-4 h-4" /> Create Your First Kit
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kits.map((kitRecord) => {
            const roleTitle = kitRecord.kit?.role.title || 'Software Engineering Role';
            const company = kitRecord.kit?.source.company || kitRecord.input.companyUrl;
            const days = kitRecord.kit?.schedule.days_available || kitRecord.input.days;
            const qCount = kitRecord.kit?.questions.length || 0;
            const fCount = kitRecord.kit?.flashcards.length || 0;
            const isFullyCovered = (kitRecord.kit?.coverage.uncovered_requirement_ids.length || 0) === 0;

            return (
              <div
                key={kitRecord.id}
                className="rounded-2xl glass-panel p-5 border border-white/10 hover:border-teal-500/30 transition-all flex flex-col justify-between group shadow-lg"
              >
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                        kitRecord.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : kitRecord.status === 'running'
                          ? 'bg-teal-500/15 text-teal-400 border border-teal-500/20 animate-pulse'
                          : kitRecord.status === 'failed'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {kitRecord.status === 'completed' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : kitRecord.status === 'running' ? (
                        <Clock className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      {kitRecord.status}
                    </span>

                    <button
                      onClick={() => handleDelete(kitRecord.id)}
                      title="Delete prep kit"
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Title & Company */}
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors line-clamp-1">
                      {roleTitle}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                      <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{company}</span>
                    </div>
                  </div>

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px]">
                    <div className="bg-slate-900/60 p-2 rounded-lg text-center">
                      <span className="block text-slate-500 text-[10px]">Schedule</span>
                      <span className="font-mono font-bold text-slate-200">{days}d</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg text-center">
                      <span className="block text-slate-500 text-[10px]">Questions</span>
                      <span className="font-mono font-bold text-teal-400">{qCount}</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg text-center">
                      <span className="block text-slate-500 text-[10px]">Coverage</span>
                      <span
                        className={`font-mono font-bold ${
                          isFullyCovered ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {isFullyCovered ? '100%' : 'Gaps'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-4 mt-4 border-t border-white/5">
                  <Link
                    href={`/kits/${kitRecord.id}`}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 hover:bg-teal-500 hover:text-slate-950 text-slate-200 text-xs font-semibold transition-all group-hover:bg-teal-500/10 group-hover:text-teal-300"
                  >
                    <span>Open Kit Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
