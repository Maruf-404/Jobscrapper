'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, Briefcase, RefreshCw } from 'lucide-react';

interface HeaderProps {
  activeCount: number;
  lastUpdatedIST: string;
}

export default function Header({ activeCount, lastUpdatedIST }: HeaderProps) {
  const pathname = usePathname();
  const isJobs = pathname === '/';
  const isStats = pathname === '/stats';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#EAECF0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 relative">
          {/* Left: Logo & Title */}
          <div className="flex items-center space-x-3 shrink-0">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-[#0D81FC] flex items-center justify-center text-white shadow-sm shadow-[#0D81FC]/30 group-hover:bg-[#0B72DF] transition-colors">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-[#101828] group-hover:text-[#0D81FC] transition-colors">
                  Fresher Jobs India
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Jobs & Stats Navigation */}
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center p-1 bg-[#F2F4F7] rounded-xl border border-[#EAECF0] shadow-2xs">
            <Link
              href="/"
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                isJobs
                  ? 'bg-white text-[#0D81FC] shadow-xs'
                  : 'text-[#475467] hover:text-[#101828] hover:bg-white/60'
              }`}
            >
              <Briefcase className={`w-3.5 h-3.5 ${isJobs ? 'text-[#0D81FC]' : 'text-[#667085]'}`} />
              <span>Jobs</span>
            </Link>
            <Link
              href="/stats"
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                isStats
                  ? 'bg-white text-[#0D81FC] shadow-xs'
                  : 'text-[#475467] hover:text-[#101828] hover:bg-white/60'
              }`}
            >
              <BarChart2 className={`w-3.5 h-3.5 ${isStats ? 'text-[#0D81FC]' : 'text-[#667085]'}`} />
              <span>Stats</span>
            </Link>
          </nav>

          {/* Right: Metrics & LLM Cost Pill */}
          <div className="flex items-center space-x-4 sm:space-x-6 text-sm shrink-0">
            <div className="hidden md:flex flex-col items-end text-xs text-[#667085]">
              <div className="flex items-center space-x-1.5 font-medium text-[#101828]">
                <span className="w-2 h-2 rounded-full bg-[#12B76A] animate-pulse"></span>
                <span>{activeCount.toLocaleString()} Active Roles</span>
                <span
                  className="text-[11px] font-semibold text-[#027A48] bg-[#ECFDF3] px-1.5 py-0.5 rounded border border-[#ABEFC6]"
                  title="Gemini LLM tagging cost: $0.208 (~₹17.85 INR) per 1,000 posts (Official Gemini 3.1 Flash-Lite rate)"
                >
                  $0.208 / 1k
                </span>
              </div>
              <div className="flex items-center space-x-1 text-[#98A2B3] mt-0.5">
                <RefreshCw className="w-3 h-3" />
                <span>Updated {lastUpdatedIST}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
