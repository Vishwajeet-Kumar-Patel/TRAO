'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  BrainCircuit,
  Lock,
} from 'lucide-react';

export default function HomePage() {
  const { user, login, register } = useAuth();
  const router = useRouter();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);

    try {
      if (isRegisterMode) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      router.push('/dashboard');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('demo.engineer@example.com');
    setPassword('demopassword123');
    setLoading(true);
    setAuthError(null);
    try {
      try {
        await login('demo.engineer@example.com', 'demopassword123');
      } catch {
        await register('demo.engineer@example.com', 'demopassword123');
      }
      router.push('/dashboard');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Demo sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-16 py-4 sm:py-8">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          Enterprise Interview Preparation Kit Engine
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Ace High-Stakes Tech Interviews with{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-emerald-300 to-teal-200">
            Precision AI & Deterministic Prep
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
          Crawl target company engineering sites, extract granular job requirements, guarantee 100% must-have coverage through multi-pass generation, and master flashcards with confidence tracking.
        </p>

        {user ? (
          <div className="pt-4 flex items-center justify-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold shadow-lg shadow-teal-500/25 transition-transform hover:scale-105"
            >
              Open Your Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>

      {/* Auth Box & Visual Preview */}
      {!user && (
        <div id="auth" className="max-w-md mx-auto rounded-2xl glass-panel p-6 sm:p-8 shadow-2xl border border-white/10">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white">
              {isRegisterMode ? 'Create Your Account' : 'Welcome Back'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isRegisterMode ? 'Start generating custom interview prep kits' : 'Sign in to access your interview kits'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition-transform active:scale-98 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : isRegisterMode ? 'Sign Up Free' : 'Sign In'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-[#121620] text-slate-500">Or quick demo access</span>
            </div>
          </div>

          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 flex items-center justify-center gap-2 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-teal-400" />
            1-Click Instant Demo Login
          </button>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setAuthError(null);
              }}
              className="text-xs text-teal-400 hover:text-teal-300 font-medium"
            >
              {isRegisterMode ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      )}

      {/* Feature Value Props */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
        <div className="p-6 rounded-2xl glass-panel space-y-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Safe Company Crawler</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Crawls target company domains, ranks internal careers and engineering blogs, extracts hiring signals, and generates a structured company brief.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Deterministic Coverage Engine</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Application code validates requirement coverage mathematically and triggers targeted second-pass generation to guarantee 100% must-have representation.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Regeneration State Preservation</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Edit, pin, and add custom questions with confidence. Section-level regeneration strictly preserves your manual edits and pinned questions.
          </p>
        </div>
      </div>
    </div>
  );
}
