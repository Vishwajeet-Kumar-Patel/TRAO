'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { api, KitRecordResponse } from '../../../lib/api';
import {
  InterviewKitData,
  Question,
  Flashcard,
  QuestionCategory,
  WeakSpotsReport,
} from '@prep-kit/shared';
import { QuestionItem } from '../../../components/QuestionItem';
import { PracticeModal } from '../../../components/PracticeModal';
import { WeakSpotsCard } from '../../../components/WeakSpotsCard';
import {
  Briefcase,
  Globe,
  Calendar,
  Layers,
  Sparkles,
  RotateCw,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  Code,
  Shield,
  Clock,
  ExternalLink,
  Save,
  Check,
  Zap,
  Trash2,
} from 'lucide-react';

type BuilderTab =
  | 'overview'
  | 'company'
  | 'role'
  | 'questions'
  | 'flashcards'
  | 'schedule'
  | 'weak-spots';

export default function KitBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const kitId = params.id as string;

  const [kitRecord, setKitRecord] = useState<KitRecordResponse | null>(null);
  const [kit, setKit] = useState<InterviewKitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<BuilderTab>('overview');
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory | 'all'>('all');

  // Modal / Practice states
  const [isPracticeOpen, setIsPracticeOpen] = useState(false);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [isAddFlashcardOpen, setIsAddFlashcardOpen] = useState(false);
  const [weakSpotsReport, setWeakSpotsReport] = useState<WeakSpotsReport | null>(null);

  // Regeneration states
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  const [regenNotification, setRegenNotification] = useState<string | null>(null);

  // Editable Company Brief State
  const [companySummary, setCompanySummary] = useState('');
  const [companyWhatTheyDo, setCompanyWhatTheyDo] = useState('');
  const [briefDirty, setBriefDirty] = useState(false);

  // New Question Form State
  const [newQPrompt, setNewQPrompt] = useState('');
  const [newQOutline, setNewQOutline] = useState('');
  const [newQCategory, setNewQCategory] = useState<QuestionCategory>('technical');
  const [newQDifficulty, setNewQDifficulty] = useState<1 | 2 | 3>(2);
  const [newQReqId, setNewQReqId] = useState('');

  // New Flashcard Form State
  const [newFFront, setNewFFront] = useState('');
  const [newFBack, setNewFBack] = useState('');
  const [newFReqId, setNewFReqId] = useState('');

  const loadKitData = useCallback(async () => {
    try {
      const res = await api.getKitById(kitId);
      setKitRecord(res.kit);
      if (res.kit.kit) {
        setKit(res.kit.kit);
        setCompanySummary(res.kit.kit.company_brief.summary);
        setCompanyWhatTheyDo(res.kit.kit.company_brief.what_they_do);
        if (res.kit.kit.role.requirements[0]) {
          setNewQReqId(res.kit.kit.role.requirements[0].id);
          setNewFReqId(res.kit.kit.role.requirements[0].id);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load prep kit');
    } finally {
      setLoading(false);
    }
  }, [kitId]);

  const loadWeakSpots = useCallback(async () => {
    try {
      const res = await api.getWeakSpotsReport(kitId);
      setWeakSpotsReport(res.report);
    } catch {
      // ignore if empty
    }
  }, [kitId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/#auth');
      return;
    }
    if (user && kitId) {
      loadKitData();
      loadWeakSpots();
    }
  }, [user, authLoading, kitId, router, loadKitData, loadWeakSpots]);

  // Section-Level Regeneration Handlers
  const handleRegenerateCompanyBrief = async () => {
    setRegeneratingSection('company');
    setRegenNotification(null);
    try {
      const res = await api.regenerateCompanyBrief(kitId);
      if (kit) {
        const updated = { ...kit, company_brief: res.company_brief };
        setKit(updated);
        setCompanySummary(res.company_brief.summary);
        setCompanyWhatTheyDo(res.company_brief.what_they_do);
        setBriefDirty(false);
      }
      setRegenNotification('Company brief regenerated from live company crawl.');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Regeneration failed');
    } finally {
      setRegeneratingSection(null);
    }
  };

  const handleRegenerateCategory = async (cat: QuestionCategory) => {
    setRegeneratingSection(`category-${cat}`);
    setRegenNotification(null);
    try {
      const res = await api.regenerateQuestionsCategory(kitId, cat);
      setKit(res.kit);
      setRegenNotification(res.message);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Category regeneration failed');
    } finally {
      setRegeneratingSection(null);
    }
  };

  const handleRegenerateSchedule = async () => {
    setRegeneratingSection('schedule');
    setRegenNotification(null);
    try {
      const res = await api.regenerateSchedule(kitId);
      if (kit) {
        setKit({ ...kit, schedule: res.schedule });
      }
      setRegenNotification('Deterministic schedule recomputed.');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Schedule regeneration failed');
    } finally {
      setRegeneratingSection(null);
    }
  };

  // Company Brief Save
  const handleSaveCompanyBrief = async () => {
    if (!kit) return;
    const updatedKit: InterviewKitData = {
      ...kit,
      company_brief: {
        ...kit.company_brief,
        summary: companySummary,
        what_they_do: companyWhatTheyDo,
        edited: true,
      },
    };
    try {
      await api.updateKit(kitId, updatedKit);
      setKit(updatedKit);
      setBriefDirty(false);
      setRegenNotification('Company brief changes saved.');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save company brief');
    }
  };

  // Question CRUD Handlers
  const handleUpdateQuestion = async (qId: string, updates: Partial<Question>) => {
    try {
      const res = await api.updateQuestion(kitId, qId, updates);
      setKit(res.kit);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update question');
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      const res = await api.deleteQuestion(kitId, qId);
      setKit(res.kit);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete question');
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQPrompt.trim()) return;
    try {
      const res = await api.addQuestion(kitId, {
        prompt: newQPrompt,
        answer_outline: newQOutline || 'Key discussion points and STAR outline',
        category: newQCategory,
        difficulty: newQDifficulty,
        requirement_ids: [newQReqId || kit?.role.requirements[0]?.id || 'r1'],
      });
      setKit(res.kit);
      setIsAddQuestionOpen(false);
      setNewQPrompt('');
      setNewQOutline('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to add question');
    }
  };

  // Flashcard CRUD Handlers
  const handleAddFlashcard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFFront.trim() || !newFBack.trim()) return;
    try {
      const res = await api.addFlashcard(kitId, {
        front: newFFront,
        back: newFBack,
        requirement_ids: [newFReqId || kit?.role.requirements[0]?.id || 'r1'],
      });
      setKit(res.kit);
      setIsAddFlashcardOpen(false);
      setNewFFront('');
      setNewFBack('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to add flashcard');
    }
  };

  const handleDeleteFlashcard = async (fId: string) => {
    if (!confirm('Are you sure you want to delete this flashcard?')) return;
    try {
      const res = await api.deleteFlashcard(kitId, fId);
      setKit(res.kit);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete flashcard');
    }
  };

  const copyKitJsonToClipboard = () => {
    if (!kit) return;
    navigator.clipboard.writeText(JSON.stringify(kit, null, 2));
    setRegenNotification('Exact Appendix A Kit JSON copied to clipboard!');
  };

  if (authLoading || loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Loading Prep Kit workspace...</p>
      </div>
    );
  }

  if (error || !kit) {
    return (
      <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-4">
        <h3 className="text-lg font-bold text-rose-300">Prep Kit Not Ready</h3>
        <p className="text-xs text-rose-400">{error || 'Kit data is currently unavailable'}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 rounded-xl bg-white/10 text-xs font-semibold text-white"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const filteredQuestions =
    selectedCategory === 'all'
      ? kit.questions
      : kit.questions.filter((q) => q.category === selectedCategory);

  const isFullyCovered = kit.coverage.uncovered_requirement_ids.length === 0;

  return (
    <div className="space-y-6">
      {/* Header Workspace Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl glass-panel border border-white/10 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/20">
              {kit.role.seniority || 'Senior'}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                isFullyCovered
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
              }`}
            >
              {isFullyCovered ? '✓ 100% Must-Have Covered' : 'Coverage Gaps Present'}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-400">
              Passes: {kit.coverage.passes}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{kit.role.title}</h1>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <a
              href={kit.source.company_url}
              target="_blank"
              rel="noreferrer"
              className="hover:text-teal-400 flex items-center gap-1 transition-colors"
            >
              <span>{kit.source.company || kit.source.company_url}</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsPracticeOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/20 transition-transform hover:scale-102"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            Launch Practice Mode ({kit.flashcards.length} cards)
          </button>

          <button
            onClick={copyKitJsonToClipboard}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium border border-white/10 transition-colors"
          >
            <Code className="w-3.5 h-3.5" />
            Export Appendix A JSON
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {regenNotification && (
        <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-300 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            {regenNotification}
          </span>
          <button
            onClick={() => setRegenNotification(null)}
            className="text-slate-400 hover:text-white text-xs font-mono ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'overview'
              ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Overview & Sources
        </button>

        <button
          onClick={() => setActiveTab('company')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'company'
              ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Company Brief
        </button>

        <button
          onClick={() => setActiveTab('role')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'role'
              ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Role & Requirements ({kit.role.requirements.length})
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'questions'
              ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Questions ({kit.questions.length})
        </button>

        <button
          onClick={() => setActiveTab('flashcards')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'flashcards'
              ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Flashcards ({kit.flashcards.length})
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'schedule'
              ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Schedule ({kit.schedule.days_available}d)
        </button>

        <button
          onClick={() => setActiveTab('weak-spots')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'weak-spots'
              ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Weak Spots Report
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl glass-panel space-y-2">
              <span className="text-xs font-semibold text-slate-400">Target Source</span>
              <h4 className="text-base font-bold text-white truncate">{kit.source.company}</h4>
              <p className="text-xs text-slate-400 font-mono truncate">{kit.source.company_url}</p>
              <span className="inline-block text-[11px] text-slate-500">
                Researched: {new Date(kit.source.researched_at).toLocaleDateString()}
              </span>
            </div>

            <div className="p-5 rounded-2xl glass-panel space-y-2">
              <span className="text-xs font-semibold text-slate-400">Coverage Status</span>
              <h4
                className={`text-base font-bold ${
                  isFullyCovered ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {isFullyCovered
                  ? '100% Must-Haves Covered'
                  : `${kit.coverage.uncovered_requirement_ids.length} Uncovered Requirement(s)`}
              </h4>
              <p className="text-xs text-slate-400">
                Deterministic passes executed:{' '}
                <span className="text-teal-400 font-bold">{kit.coverage.passes}</span>
              </p>
            </div>

            <div className="p-5 rounded-2xl glass-panel space-y-2">
              <span className="text-xs font-semibold text-slate-400">Prep Kit Velocity</span>
              <h4 className="text-base font-bold text-teal-400">
                {kit.schedule.days_available} Day Plan
              </h4>
              <p className="text-xs text-slate-400">
                {kit.questions.length} Questions • {kit.flashcards.length} Active Recall Cards
              </p>
            </div>
          </div>

          {/* Crawled Pages Used */}
          <div className="p-6 rounded-2xl glass-panel space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Discovered Company URLs Used
            </h3>
            {kit.source.pages_used.length > 0 ? (
              <ul className="space-y-2">
                {kit.source.pages_used.map((url, idx) => (
                  <li
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-teal-300 font-mono truncate flex items-center justify-between"
                  >
                    <span>{url}</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-500 hover:text-teal-400"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">Target homepage utilized for initial brief synthesis.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Company Brief */}
      {activeTab === 'company' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Company Brief & Operations</h2>
              <p className="text-xs text-slate-400">
                Synthesized from company crawler. Edit directly inline or regenerate from live site.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {briefDirty && (
                <button
                  onClick={handleSaveCompanyBrief}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-500 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20"
                >
                  <Save className="w-3.5 h-3.5" /> Save Changes
                </button>
              )}

              <button
                onClick={handleRegenerateCompanyBrief}
                disabled={regeneratingSection === 'company'}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition-colors disabled:opacity-50"
              >
                <RotateCw
                  className={`w-3.5 h-3.5 text-teal-400 ${
                    regeneratingSection === 'company' ? 'animate-spin' : ''
                  }`}
                />
                {regeneratingSection === 'company' ? 'Regenerating...' : 'Regenerate Brief'}
              </button>
            </div>
          </div>

          <div className="p-6 rounded-2xl glass-panel space-y-6 border border-white/10">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Executive Summary
              </label>
              <textarea
                rows={3}
                value={companySummary}
                onChange={(e) => {
                  setCompanySummary(e.target.value);
                  setBriefDirty(true);
                }}
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                What They Do (Products, Business Model & Tech)
              </label>
              <textarea
                rows={6}
                value={companyWhatTheyDo}
                onChange={(e) => {
                  setCompanyWhatTheyDo(e.target.value);
                  setBriefDirty(true);
                }}
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 leading-relaxed font-sans"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Role & Requirements */}
      {activeTab === 'role' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl glass-panel space-y-4 border border-white/10">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase">Target Role</span>
                <h3 className="text-xl font-bold text-white">{kit.role.title}</h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 font-semibold uppercase">Seniority</span>
                <span className="block text-sm font-bold text-teal-400">{kit.role.seniority}</span>
              </div>
            </div>

            {kit.role.responsibilities.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Key Responsibilities
                </h4>
                <ul className="space-y-1.5">
                  {kit.role.responsibilities.map((resp, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-teal-400 mt-0.5">•</span>
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Requirements Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Extracted Requirements ({kit.role.requirements.length})
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {kit.role.requirements.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl bg-[#121620] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-white/5 text-slate-300">
                      {req.id}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-100">{req.text}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                        req.priority === 'must'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {req.priority.toUpperCase()}
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-[11px] bg-white/5 text-slate-300 font-medium">
                      {req.kind}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Questions Builder */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {(['all', 'technical', 'behavioural', 'system-design', 'company-fit'] as const).map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap capitalize transition-all ${
                      selectedCategory === cat
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {cat.replace('-', ' ')}
                  </button>
                )
              )}
            </div>

            {/* Actions: Add Question & Category Regeneration */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => setIsAddQuestionOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>

              {selectedCategory !== 'all' && (
                <button
                  onClick={() => handleRegenerateCategory(selectedCategory as QuestionCategory)}
                  disabled={regeneratingSection === `category-${selectedCategory}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition-colors disabled:opacity-50"
                >
                  <RotateCw
                    className={`w-3.5 h-3.5 text-teal-400 ${
                      regeneratingSection === `category-${selectedCategory}` ? 'animate-spin' : ''
                    }`}
                  />
                  <span>Regenerate {selectedCategory}</span>
                </button>
              )}
            </div>
          </div>

          {/* Add Question Modal Drawer */}
          {isAddQuestionOpen && (
            <form
              onSubmit={handleAddQuestion}
              className="p-5 rounded-2xl glass-panel border border-teal-500/30 space-y-4 animate-in fade-in"
            >
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-400" />
                Add Custom Interview Question
              </h4>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Question Prompt *
                </label>
                <textarea
                  required
                  rows={2}
                  value={newQPrompt}
                  onChange={(e) => setNewQPrompt(e.target.value)}
                  placeholder="e.g. Explain how you would optimize large MongoDB queries in Node.js..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={newQCategory}
                    onChange={(e) => setNewQCategory(e.target.value as QuestionCategory)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-white"
                  >
                    <option value="technical">Technical</option>
                    <option value="behavioural">Behavioural</option>
                    <option value="system-design">System Design</option>
                    <option value="company-fit">Company Fit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Difficulty</label>
                  <select
                    value={newQDifficulty}
                    onChange={(e) => setNewQDifficulty(Number(e.target.value) as 1 | 2 | 3)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-white"
                  >
                    <option value={1}>1 - Foundational</option>
                    <option value={2}>2 - Intermediate</option>
                    <option value={3}>3 - Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Covers Requirement
                  </label>
                  <select
                    value={newQReqId}
                    onChange={(e) => setNewQReqId(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-white"
                  >
                    {kit.role.requirements.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id}: {r.text.slice(0, 30)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Answer Outline & Evaluation Points
                </label>
                <textarea
                  rows={3}
                  value={newQOutline}
                  onChange={(e) => setNewQOutline(e.target.value)}
                  placeholder="Key concepts, STAR outline, or performance considerations..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddQuestionOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-teal-500 text-slate-950 text-xs font-bold shadow-md shadow-teal-500/20"
                >
                  Add Question
                </button>
              </div>
            </form>
          )}

          {/* Question Cards List */}
          <div className="grid grid-cols-1 gap-4">
            {filteredQuestions.map((q) => (
              <QuestionItem
                key={q.id}
                question={q}
                allRequirementIds={kit.role.requirements.map((r) => ({ id: r.id, text: r.text }))}
                onUpdate={(updates) => handleUpdateQuestion(q.id, updates)}
                onDelete={() => handleDeleteQuestion(q.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Flashcards Builder */}
      {activeTab === 'flashcards' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Active Recall Flashcards</h2>
              <p className="text-xs text-slate-400">
                Master key concepts with interactive prompt-and-reveal cards.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddFlashcardOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Flashcard
              </button>

              <button
                onClick={() => setIsPracticeOpen(true)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-md shadow-teal-500/20"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" /> Start Practice
              </button>
            </div>
          </div>

          {/* Add Flashcard Form */}
          {isAddFlashcardOpen && (
            <form
              onSubmit={handleAddFlashcard}
              className="p-5 rounded-2xl glass-panel border border-teal-500/30 space-y-4 animate-in fade-in"
            >
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-400" />
                Add Custom Flashcard
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Front Prompt *</label>
                  <textarea
                    required
                    rows={3}
                    value={newFFront}
                    onChange={(e) => setNewFFront(e.target.value)}
                    placeholder="Concept question or prompt..."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Back Answer *</label>
                  <textarea
                    required
                    rows={3}
                    value={newFBack}
                    onChange={(e) => setNewFBack(e.target.value)}
                    placeholder="Clear, concise conceptual explanation..."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Linked Requirement</label>
                <select
                  value={newFReqId}
                  onChange={(e) => setNewFReqId(e.target.value)}
                  className="w-full sm:w-1/2 bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-white"
                >
                  {kit.role.requirements.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.id}: {r.text.slice(0, 40)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddFlashcardOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-teal-500 text-slate-950 text-xs font-bold"
                >
                  Add Flashcard
                </button>
              </div>
            </form>
          )}

          {/* Flashcard Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {kit.flashcards.map((f) => (
              <div
                key={f.id}
                className="p-4 rounded-xl bg-[#121620] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 text-slate-400">
                      {f.id}
                    </span>
                    <button
                      onClick={() => handleDeleteFlashcard(f.id)}
                      className="p-1 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-2">{f.front}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
                    {f.back}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <div className="flex gap-1">
                    {f.requirement_ids.map((rid) => (
                      <span
                        key={rid}
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-400"
                      >
                        {rid}
                      </span>
                    ))}
                  </div>
                  {f.origin === 'user' && (
                    <span className="text-[10px] text-teal-400 font-semibold">User Added</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Schedule View */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                {kit.schedule.days_available}-Day Deterministic Study Schedule
              </h2>
              <p className="text-xs text-slate-400">
                Paced allocation ensuring every must-have requirement appears and harder topics are prioritized earlier.
              </p>
            </div>

            <button
              onClick={handleRegenerateSchedule}
              disabled={regeneratingSection === 'schedule'}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition-colors disabled:opacity-50"
            >
              <RotateCw
                className={`w-3.5 h-3.5 text-teal-400 ${
                  regeneratingSection === 'schedule' ? 'animate-spin' : ''
                }`}
              />
              {regeneratingSection === 'schedule' ? 'Reallocating...' : 'Re-allocate Schedule'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {kit.schedule.days.map((day) => (
              <div
                key={day.day}
                className="p-5 rounded-2xl bg-[#121620] border border-white/10 hover:border-white/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded font-mono text-xs font-bold bg-teal-500/20 text-teal-300">
                      Day {day.day}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-mono font-bold text-slate-200">{day.minutes} mins</span>
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white">{day.focus}</h3>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                  <span className="text-xs text-slate-500 font-semibold">Allocated:</span>
                  {day.question_ids.map((qid) => {
                    const qObj = kit.questions.find((q) => q.id === qid);
                    return (
                      <span
                        key={qid}
                        title={qObj?.prompt || qid}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-slate-900 text-teal-300 border border-white/5 hover:border-teal-500/30 transition-colors"
                      >
                        {qid} ({qObj?.category || 'q'})
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 7: Weak Spots Report */}
      {activeTab === 'weak-spots' && (
        <WeakSpotsCard
          report={weakSpotsReport}
          onLaunchPractice={() => setIsPracticeOpen(true)}
        />
      )}

      {/* Active Flashcard Practice Modal */}
      {isPracticeOpen && (
        <PracticeModal
          kitId={kitId}
          flashcards={kit.flashcards}
          onClose={() => setIsPracticeOpen(false)}
          onFinished={() => {
            loadWeakSpots();
            setActiveTab('weak-spots');
          }}
        />
      )}
    </div>
  );
}
