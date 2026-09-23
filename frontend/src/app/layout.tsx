import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';

export const metadata: Metadata = {
  title: 'PrepKit AI - Production AI Interview Preparation Engine',
  description:
    'Generate deterministic, research-backed interview preparation kits with multi-pass coverage, company crawling, customizable schedules, and active recall practice.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0d14] text-slate-100 min-h-screen flex flex-col font-sans">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
