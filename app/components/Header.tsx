import Link from 'next/link';
import { Sparkles, BarChart2, Briefcase, RefreshCw } from 'lucide-react';

interface HeaderProps {
  activeCount: number;
  lastUpdatedIST: string;
}

export default function Header({ activeCount, lastUpdatedIST }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Tagline */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Fresher Jobs India
                </span>
                <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Verified ToS-Safe
                </span>
              </div>
            </Link>
          </div>

          {/* Metrics & Links */}
          <div className="flex items-center space-x-4 sm:space-x-6 text-sm">
            <div className="hidden md:flex flex-col items-end text-xs text-slate-500">
              <div className="flex items-center space-x-1.5 font-medium text-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{activeCount.toLocaleString()} Active Roles</span>
              </div>
              <div className="flex items-center space-x-1 text-slate-400 mt-0.5">
                <RefreshCw className="w-3 h-3" />
                <span>Updated {lastUpdatedIST}</span>
              </div>
            </div>

            <nav className="flex items-center space-x-2">
              <Link
                href="/"
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
              >
                Jobs
              </Link>
              <Link
                href="/stats"
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
              >
                <BarChart2 className="w-4 h-4 text-indigo-500" />
                <span>Stats</span>
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
