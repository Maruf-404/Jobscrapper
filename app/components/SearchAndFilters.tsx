'use client';

import { Search, X, RotateCcw, Sparkles } from 'lucide-react';

const POPULAR_SEARCHES = [
  'Python',
  'React',
  'Frontend',
  'Backend',
  'SDE Intern',
  'Data Analyst',
  'Remote',
  'Bengaluru',
];

export interface SearchAndFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onlyRecent: boolean;
  onToggleRecent: () => void;
  onResetAll: () => void;
}

export default function SearchAndFilters({
  searchTerm,
  onSearchChange,
  onlyRecent,
  onToggleRecent,
  onResetAll,
}: SearchAndFiltersProps) {
  const hasActiveFilters = Boolean(searchTerm) || onlyRecent;

  return (
    <div className="bg-white rounded-xl border border-[#EAECF0] p-3 sm:p-4 shadow-xs mb-3.5">
      {/* Search Input Row */}
      <form onSubmit={(e) => e.preventDefault()} className="flex gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#98A2B3] pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search title, skills, company, or city (e.g. Python, React, SDE Intern, Bengaluru, Remote)..."
            className="w-full pl-10 pr-10 py-2 rounded-xl border border-[#D0D5DD] bg-white text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#0D81FC]/20 focus:border-[#0D81FC] transition-all placeholder:text-[#98A2B3]"
          />

          {searchTerm && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="text-[#98A2B3] hover:text-[#475467] p-1 rounded-full hover:bg-[#F2F4F7] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Popular 1-Click Search Chips & Quick Recency Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mt-2.5 pt-0.5 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[#667085] font-medium mr-1 flex items-center">
            <Sparkles className="w-3 h-3 text-[#0D81FC] mr-1" />
            Popular:
          </span>
          {POPULAR_SEARCHES.map((chip) => {
            const isActive = searchTerm.toLowerCase() === chip.toLowerCase();
            return (
              <button
                key={chip}
                type="button"
                onClick={() => onSearchChange(isActive ? '' : chip)}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#EFF7FF] text-[#0D81FC] font-semibold border border-[#B2D7FE]'
                    : 'bg-[#F2F4F7] text-[#344054] hover:bg-[#E4E7EC] hover:text-[#101828] border border-transparent'
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center space-x-2 text-xs font-medium text-[#475467] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyRecent}
              onChange={onToggleRecent}
              className="w-4 h-4 rounded border-[#D0D5DD] text-[#0D81FC] focus:ring-[#0D81FC]"
            />
            <span>Posted in last 7 days</span>
          </label>
        </div>
      </div>

      {/* Active Filter Badges Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-[#EAECF0] text-xs">
          <span className="text-[#667085] font-semibold uppercase tracking-wider text-[11px]">
            Active Filters:
          </span>

          {searchTerm && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#EFF7FF] text-[#0D81FC] border border-[#B2D7FE] font-medium">
              <span>Search: "{searchTerm}"</span>
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="hover:text-[#0B72DF] ml-1 p-0.5"
                title="Remove search query"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {onlyRecent && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#ECFDF3] text-[#027A48] border border-[#ABEFC6] font-medium">
              <span>Last 7 Days</span>
              <button
                type="button"
                onClick={onToggleRecent}
                className="hover:text-[#027A48] ml-1 p-0.5"
                title="Remove 7-day filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={onResetAll}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#FEF3F2] text-[#B42318] hover:bg-[#FEE4E2] border border-[#FECDCA] font-medium transition-colors ml-auto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>
        </div>
      )}
    </div>
  );
}
