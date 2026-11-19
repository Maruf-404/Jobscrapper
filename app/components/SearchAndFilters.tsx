'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X, Filter, RotateCcw, Check, Loader2, Sparkles } from 'lucide-react';
import { ROLE_TAXONOMY, CANONICAL_CITIES } from '@/pipeline/prompts';

const SOURCES = [
  { id: 'greenhouse', name: 'Greenhouse' },
  { id: 'lever', name: 'Lever' },
  { id: 'ashby', name: 'Ashby' },
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

export default function SearchAndFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Read current parameters from URL
  const currentSearch = searchParams.get('q') || '';
  const currentRoles = searchParams.getAll('role');
  const currentCities = searchParams.getAll('city');
  const currentSources = searchParams.getAll('source');
  const currentRecent = searchParams.get('recent') === 'true';

  const [searchTerm, setSearchTerm] = useState(currentSearch);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize local searchTerm when URL changes externally (e.g. back/forward navigation or reset)
  useEffect(() => {
    setSearchTerm(currentSearch);
  }, [currentSearch]);

  // Helper to push URL updates via Next.js router with non-blocking useTransition
  const updateUrl = (newParams: {
    q?: string;
    roles?: string[];
    cities?: string[];
    sources?: string[];
    recent?: boolean;
  }) => {
    // Clear any pending debounce timeout
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const params = new URLSearchParams();

    const q = newParams.q !== undefined ? newParams.q : searchTerm;
    if (q.trim()) params.set('q', q.trim());

    const roles = newParams.roles !== undefined ? newParams.roles : currentRoles;
    roles.forEach((r) => params.append('role', r));

    const cities = newParams.cities !== undefined ? newParams.cities : currentCities;
    cities.forEach((c) => params.append('city', c));

    const sources = newParams.sources !== undefined ? newParams.sources : currentSources;
    sources.forEach((s) => params.append('source', s));

    const recent = newParams.recent !== undefined ? newParams.recent : currentRecent;
    if (recent) params.set('recent', 'true');

    // Always reset to page 1 on filter/search changes
    params.set('page', '1');

    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  };

  // Debounced search on typing (300ms)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    setSearchTerm(nextValue);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (nextValue.trim() !== currentSearch.trim()) {
        updateUrl({ q: nextValue });
      }
    }, 300);
  };

  // Immediate search on Enter or button click
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({ q: searchTerm });
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    updateUrl({ q: '' });
  };

  const handleChipClick = (term: string) => {
    setSearchTerm(term);
    updateUrl({ q: term });
  };

  const toggleRole = (role: string) => {
    const next = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];
    updateUrl({ roles: next });
  };

  const toggleCity = (city: string) => {
    const next = currentCities.includes(city)
      ? currentCities.filter((c) => c !== city)
      : [...currentCities, city];
    updateUrl({ cities: next });
  };

  const toggleSource = (source: string) => {
    const next = currentSources.includes(source)
      ? currentSources.filter((s) => s !== source)
      : [...currentSources, source];
    updateUrl({ sources: next });
  };

  const toggleRecent = () => {
    updateUrl({ recent: !currentRecent });
  };

  const resetAll = () => {
    setSearchTerm('');
    startTransition(() => {
      router.push('/');
    });
  };

  const hasActiveFilters =
    Boolean(currentSearch) ||
    currentRoles.length > 0 ||
    currentCities.length > 0 ||
    currentSources.length > 0 ||
    currentRecent;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm mb-8">
      {/* Search Input Row */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search title, skills, or company (e.g. Python, React, SDE Intern, Capco)..."
            className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />

          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center space-x-1.5">
            {isPending && (
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
            )}
            {searchTerm && !isPending && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm shadow-indigo-200 shrink-0 flex items-center space-x-1.5"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Searching...</span>
            </>
          ) : (
            <span>Search</span>
          )}
        </button>

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
          const isActive = currentSearch.toLowerCase() === chip.toLowerCase();
          return (
            <button
              key={chip}
              type="button"
              onClick={() => handleChipClick(chip)}
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

          {currentSearch && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
              <span>Search: "{currentSearch}"</span>
              <button
                type="button"
                onClick={handleClearSearch}
                className="hover:text-indigo-900 ml-1 p-0.5"
                title="Remove search query"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {currentRoles.map((r) => (
            <span
              key={r}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-medium"
            >
              <span>Role: {r}</span>
              <button
                type="button"
                onClick={() => toggleRole(r)}
                className="hover:text-blue-900 ml-1 p-0.5"
                title={`Remove role filter ${r}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {currentCities.map((c) => (
            <span
              key={c}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium"
            >
              <span>City: {c}</span>
              <button
                type="button"
                onClick={() => toggleCity(c)}
                className="hover:text-emerald-900 ml-1 p-0.5"
                title={`Remove city filter ${c}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {currentSources.map((s) => (
            <span
              key={s}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-300 font-medium"
            >
              <span>Source: {s}</span>
              <button
                type="button"
                onClick={() => toggleSource(s)}
                className="hover:text-slate-900 ml-1 p-0.5"
                title={`Remove source filter ${s}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {currentRecent && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-medium">
              <span>Last 7 Days</span>
              <button
                type="button"
                onClick={toggleRecent}
                className="hover:text-amber-900 ml-1 p-0.5"
                title="Remove 7-day filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-semibold transition-colors ml-auto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>
        </div>
      )}

      {/* Filter Section */}
      <div
        className={`${
          showFiltersMobile ? 'block' : 'hidden sm:block'
        } mt-5 pt-5 border-t border-slate-100 space-y-4`}
      >
        {/* Role Pills */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Role Categories
            </span>
            {currentRoles.length > 0 && (
              <span className="text-[11px] font-semibold text-indigo-600">
                {currentRoles.length} selected
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ROLE_TAXONOMY.map((role) => {
              const active = currentRoles.includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  {active && <Check className="w-3 h-3 stroke-[2.5]" />}
                  <span>{role}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* City Pills */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Top Indian Cities
            </span>
            {currentCities.length > 0 && (
              <span className="text-[11px] font-semibold text-indigo-600">
                {currentCities.length} selected
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CANONICAL_CITIES.map((city) => {
              const active = currentCities.includes(city);
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => toggleCity(city)}
                  className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  {active && <Check className="w-3 h-3 stroke-[2.5]" />}
                  <span>{city}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sources & 7-Days Quick Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
              Sources:
            </span>
            {SOURCES.map((s) => {
              const active = currentSources.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSource(s.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    active
                      ? 'bg-slate-900 text-white'
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
                checked={currentRecent}
                onChange={toggleRecent}
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
