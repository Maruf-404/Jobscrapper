'use client';

import { useState } from 'react';
import { Search, X, Filter, RotateCcw, Sparkles } from 'lucide-react';

const SOURCES = [
  { id: 'greenhouse', name: 'Greenhouse' },
  { id: 'lever', name: 'Lever' },
  { id: 'ashby', name: 'Ashby' },
  { id: 'unstop', name: 'Unstop' },
  { id: 'jooble', name: 'Jooble' },
];

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
  selectedSources: string[];
  onToggleSource: (source: string) => void;
  onlyRecent: boolean;
  onToggleRecent: () => void;
  onResetAll: () => void;
}

export default function SearchAndFilters({
  searchTerm,
  onSearchChange,
  selectedSources,
  onToggleSource,
  onlyRecent,
  onToggleRecent,
  onResetAll,
}: SearchAndFiltersProps) {
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  const hasActiveFilters =
    Boolean(searchTerm) ||
    selectedSources.length > 0 ||
    onlyRecent;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm mb-8">
      {/* Search Input Row */}
      <form onSubmit={(e) => e.preventDefault()} className="flex gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search title, skills, company, or city (e.g. Python, React, SDE Intern, Bengaluru, Remote)..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />

          {searchTerm && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowFiltersMobile(!showFiltersMobile)}
          className="sm:hidden px-3 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Filter className="w-4 h-4" />
        </button>
      </form>

      {/* Popular 1-Click Search Chips */}
      <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-1 text-xs">
        <span className="text-slate-400 font-medium mr-1 flex items-center">
          <Sparkles className="w-3 h-3 text-indigo-500 mr-1" />
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
                  ? 'bg-indigo-100 text-indigo-700 font-semibold border border-indigo-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/90 hover:text-slate-900 border border-transparent'
              }`}
            >
              {chip}
            </button>
          );
        })}
      </div>

      {/* Active Filter Badges Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
            Active Filters:
          </span>

          {searchTerm && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
              <span>Search: "{searchTerm}"</span>
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="hover:text-indigo-900 ml-1 p-0.5"
                title="Remove search query"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedSources.map((s) => {
            const match = SOURCES.find((src) => src.id === s);
            const label = match ? match.name : s;
            return (
              <span
                key={s}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-300 font-medium"
              >
                <span>Source: {label}</span>
                <button
                  type="button"
                  onClick={() => onToggleSource(s)}
                  className="hover:text-slate-900 ml-1 p-0.5"
                  title={`Remove source filter ${label}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}

          {onlyRecent && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-medium">
              <span>Last 7 Days</span>
              <button
                type="button"
                onClick={onToggleRecent}
                className="hover:text-amber-900 ml-1 p-0.5"
                title="Remove 7-day filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={onResetAll}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-semibold transition-colors ml-auto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>
        </div>
      )}

      {/* Sources & 7-Days Quick Filter Bar */}
      <div
        className={`${
          showFiltersMobile ? 'block' : 'hidden sm:block'
        } mt-4 pt-4 border-t border-slate-100`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
              Sources:
            </span>
            {SOURCES.map((s) => {
              const active = selectedSources.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onToggleSource(s.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    active
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyRecent}
                onChange={onToggleRecent}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Posted in last 7 days</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
