'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { ProgressTracker } from '../../components/ProgressTracker';
import { KitGenerationProgress } from '@prep-kit/shared';
import {
  Sparkles,
  Layers,
  FileText,
  Globe,
  Calendar,
  Zap,
  ArrowRight,
  Info,
  CheckCircle2,
} from 'lucide-react';

const SAMPLE_JD_1 = `Senior Full Stack Engineer
We are looking for a Senior Full Stack Engineer with 5+ years of experience in React, TypeScript, Node.js, and MongoDB. You will architect real-time event streaming systems and lead team code reviews.

Responsibilities:
- Build high-scale reactive web applications using React and Next.js
- Design resilient Node.js microservices and REST/GraphQL APIs
- Mentor junior engineers and collaborate with product management

Requirements:
- 5+ years with React and TypeScript (must)
- Strong Node.js and MongoDB backend proficiency (must)
- Experience with GraphQL APIs and Docker containerization (nice)
- Proven mentorship and cross-functional team leadership (must)`;

const SAMPLE_JD_2 = `Staff Distributed Systems Engineer
Lead the design of our global low-latency edge caching and event streaming infrastructure.

Requirements:
- Deep expertise in distributed systems architecture and consensus protocols (must)
- High concurrency systems programming in Go or Rust (must)
- Production Kafka and Redis cluster operations (must)
- Kubernetes and infrastructure as code with Terraform (nice)`;

export default function CreateKitPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<'single' | 'batch'>('single');

  // Single Role Form
  const [jd, setJd] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState(5);

  // Batch Form
  const [batchJson, setBatchJson] = useState(`[
  {
    "id": "role-01",
    "jd": "Senior Full Stack Engineer with React and Node.js proficiency required.",
    "company_url": "https://stripe.com",
    "days": 5
  },
  {
    "id": "role-02",
    "jd": "Backend Engineer with Go, Kafka, and distributed systems architecture.",
    "company_url": "https://cloudflare.com",
    "days": 3
  }
]`);

  // Active Job State
  const [generatingKitId, setGeneratingKitId] = useState<string | null>(null);
  const [activeProgress, setActiveProgress] = useState<KitGenerationProgress>({
    stage: 'validating',
    message: 'Starting generation...',
    percentage: 5,
  });
  const [activeStatus, setActiveStatus] = useState<'queued' | 'running' | 'completed' | 'failed'>('queued');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/#auth');
    }
  }, [user, authLoading, router]);

  // Polling loop for active background job
  useEffect(() => {
    if (!generatingKitId || activeStatus === 'completed' || activeStatus === 'failed') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await api.getKitById(generatingKitId);
        setActiveProgress(res.kit.progress);
        setActiveStatus(res.kit.status);

        if (res.kit.status === 'completed') {
          clearInterval(interval);
          setTimeout(() => {
            router.push(`/kits/${generatingKitId}`);
          }, 1200);
        } else if (res.kit.status === 'failed') {
          setGenerationError(res.kit.error || 'Generation pipeline encountered an error');
          clearInterval(interval);
        }
      } catch (err: unknown) {
        console.error('Polling error:', err);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [generatingKitId, activeStatus, router]);

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jd.trim() || !companyUrl.trim()) return;

    setIsSubmitting(true);
    setGenerationError(null);

    try {
      const res = await api.createKit(jd, companyUrl, days);
      setGeneratingKitId(res.id);
      setActiveStatus('running');
      setActiveProgress(res.progress);
    } catch (err: unknown) {
      setGenerationError(err instanceof Error ? err.message : 'Failed to launch kit generation');
      setIsSubmitting(false);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setGenerationError(null);

    try {
      const parsedCases = JSON.parse(batchJson);
      if (!Array.isArray(parsedCases) || parsedCases.length === 0) {
        throw new Error('Batch JSON must be a non-empty array of cases');
      }

      // Launch first case for immediate live preview
      const first = parsedCases[0];
      const res = await api.createKit(first.jd, first.company_url, first.days || 5);
      setGeneratingKitId(res.id);
      setActiveStatus('running');
      setActiveProgress(res.progress);
    } catch (err: unknown) {
      setGenerationError(err instanceof Error ? err.message : 'Invalid batch JSON format');
      setIsSubmitting(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Create Interview Prep Kit</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Provide your target job description and company website. Our engine will research the company, extract requirements, verify coverage, and build your study plan.
        </p>
      </div>

      {/* Live Generation Progress View */}
      {generatingKitId && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <ProgressTracker
            progress={activeProgress}
            status={activeStatus}
            error={generationError}
          />
          {activeStatus === 'completed' && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Kit ready! Redirecting to Kit Workspace...
              </span>
              <button
                onClick={() => router.push(`/kits/${generatingKitId}`)}
                className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-xs"
              >
                Open Workspace Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* Creation Form Container */}
      {!generatingKitId && (
        <div className="rounded-2xl glass-panel p-6 sm:p-8 border border-white/10 shadow-2xl space-y-6">
          {/* Mode Switcher */}
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <button
              onClick={() => setTab('single')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === 'single'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Single Role Input
            </button>
            <button
              onClick={() => setTab('batch')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === 'batch'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Batch Multi-Role Input
            </button>
          </div>

          {tab === 'single' ? (
            /* Single Role Form */
            <form onSubmit={handleSingleSubmit} className="space-y-6">
              {/* Job Description Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Job Description (JD) *
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Quick load:</span>
                    <button
                      type="button"
                      onClick={() => setJd(SAMPLE_JD_1)}
                      className="px-2 py-0.5 rounded text-[10px] bg-white/5 hover:bg-white/10 text-teal-400 border border-white/5"
                    >
                      Sample 1 (Full Stack)
                    </button>
                    <button
                      type="button"
                      onClick={() => setJd(SAMPLE_JD_2)}
                      className="px-2 py-0.5 rounded text-[10px] bg-white/5 hover:bg-white/10 text-purple-400 border border-white/5"
                    >
                      Sample 2 (Systems)
                    </button>
                  </div>
                </div>

                <textarea
                  required
                  rows={8}
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  placeholder="Paste the full job description text here (responsibilities, technical skills, mandatory qualifications, bonus points)..."
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors font-sans"
                />

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Thin descriptions produce strictly extracted requirements without hallucinations.</span>
                  <span className="font-mono">{jd.length} chars</span>
                </div>
              </div>

              {/* Company Website & Days Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-teal-400" />
                    Target Company Website *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyUrl}
                    onChange={(e) => setCompanyUrl(e.target.value)}
                    placeholder="https://stripe.com or https://acme.example.com"
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  />
                  <span className="block text-[11px] text-slate-500 mt-1">
                    Crawler will safely discover internal careers, tech stack, and values.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      Days Until Interview (1–60) *
                    </span>
                    <span className="text-sm font-mono font-bold text-teal-400">{days} days</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={60}
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value, 10))}
                    className="w-full accent-teal-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>1 Day (Intensive)</span>
                    <span>14 Days (Standard)</span>
                    <span>60 Days (Comprehensive)</span>
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting || !jd.trim() || !companyUrl.trim()}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/25 transition-transform hover:scale-102 active:scale-98 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  {isSubmitting ? 'Initializing Generation...' : 'Generate Prep Kit'}
                </button>
              </div>
            </form>
          ) : (
            /* Batch Multi-Role Form */
            <form onSubmit={handleBatchSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Batch Evaluation Input Cases (JSON Array)
                </label>
                <textarea
                  required
                  rows={10}
                  value={batchJson}
                  onChange={(e) => setBatchJson(e.target.value)}
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl p-3.5 text-xs font-mono text-teal-300 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                />
                <span className="block text-[11px] text-slate-500">
                  Must conform to array format containing <code>id</code>, <code>jd</code>, <code>company_url</code>, and <code>days</code>.
                </span>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/25 transition-transform hover:scale-102 active:scale-98 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  {isSubmitting ? 'Processing Batch...' : 'Submit Batch Evaluation'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
