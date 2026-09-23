'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Sparkles, LayoutDashboard, PlusCircle, LogOut, User } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0a0d14]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-slate-950" />
          </div>
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-300">
            PrepKit AI
          </span>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-6">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  pathname === '/dashboard' ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>

              <Link
                href="/create"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-semibold shadow-md shadow-teal-500/20 transition-all hover:scale-102"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Prep Kit</span>
              </Link>

              <div className="flex items-center gap-3 pl-3 border-l border-white/10">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline font-mono">{user.email.split('@')[0]}</span>
                </div>
                <button
                  onClick={logout}
                  title="Log out"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/#auth"
                className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
