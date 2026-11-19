'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X, Filter, RotateCcw, Check } from 'lucide-react';
import { ROLE_TAXONOMY, CANONICAL_CITIES } from '@/pipeline/prompts';

const SOURCES = [
  { id: 'greenhouse', name: 'Greenhouse' },
  { id: 'lever', name: 'Lever' },
  { id: 'ashby', name: 'Ashby' },
  { id: 'jooble', name: 'Jooble' },
];

export default function SearchAndFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Read current parameters
  const currentSearch = searchParams.get('q') || '';
  const currentRoles = searchParams.getAll('role');
  const currentCities = searchParams.getAll('city');
  const currentSources = searchParams.getAll('source');
  const currentRecent = searchParams.get('recent') === 'true';

  const [searchTerm, setSearchTerm] = useState(currentSearch);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Helper to push URL updates
  const updateUrl = (newParams: {
    q?: string;
    roles?: string[];
    cities?: string[];
    sources?: string[];
    recent?: boolean;
  }) => {
    const params = new URLSearchParams();

    const q = newParams.q !== undefined ? newParams.q : searchTerm;
    if (q.trim()) params.set('q', q.trim());

    const roles = newParams.roles !== undefined ? newParams.roles : currentRoles;
    roles.forEach(r => params.append('role', r));

    const cities = newParams.cities !== undefined ? newParams.cities : currentCities;
    cities.forEach(c => params.append('city', c));

    const sources = newParams.sources !== undefined ? newParams.sources : currentSources;
    sources.forEach(s => params.append('source', s));

    const recent = newParams.recent !== undefined ? newParams.recent : currentRecent;
    if (recent) params.set('recent', 'true');

    // Reset to page 1 on filter changes
    params.set('page', '1');

    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({ q: searchTerm });
  };

  const toggleRole = (role: string) => {
    const next = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    updateUrl({ roles: next });
  };

  const toggleCity = (city: string) => {
    const next = currentCities.includes(city)
      ? currentCities.filter(c => c !== city)
      : [...currentCities, city];
    updateUrl({ cities: next });
  };

  const toggleSource = (source: string) => {
    const next = currentSources.includes(source)
      ? currentSources.filter(s => s !== source)
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
    Boolean(searchTerm) ||
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
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search title, tech skills, or company (e.g. Frontend, Python, Groww, SDE Intern)..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                updateUrl({ q: '' });
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm shadow-indigo-200 shrink-0"
        >
          {isPending ? 'Searching...' : 'Search'}
        </button>

        <button
          type="button"
          onClick={() => setShowFiltersMobile(!showFiltersMobile)}
          className="sm:hidden px-3 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Filter className="w-4 h-4" />
        </button>
      </form>

      {/* Filter Section */}
      <div className={`${showFiltersMobile ? 'block' : 'hidden sm:block'} mt-5 pt-5 border-t border-slate-100 space-y-4`}>
        {/* Role Pills */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role Categories</span>
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
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Top Indian Cities</span>
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
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Sources:</span>
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

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAll}
                className="flex items-center space-x-1 text-xs font-semibold text-rose-600 hover:text-rose-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset all</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
