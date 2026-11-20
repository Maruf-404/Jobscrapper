'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import SearchAndFilters from './SearchAndFilters';
import PostCard from './PostCard';
import Pagination from './Pagination';
import { PostItem } from '@/lib/posts';
import { AlertCircle } from 'lucide-react';

const PAGE_SIZE = 24;

export interface JobsExplorerProps {
  initialPosts: PostItem[];
  initialParams: {
    q?: string;
    sources?: string[];
    recent?: boolean;
    page?: number;
  };
}

export default function JobsExplorer({ initialPosts, initialParams }: JobsExplorerProps) {
  const [searchTerm, setSearchTerm] = useState(initialParams.q || '');
  const [selectedSources, setSelectedSources] = useState<string[]>(initialParams.sources || []);
  const [onlyRecent, setOnlyRecent] = useState<boolean>(initialParams.recent || false);
  const [currentPage, setCurrentPage] = useState<number>(initialParams.page || 1);

  const isMountedRef = useRef(false);
  const gridTopRef = useRef<HTMLDivElement>(null);

  // Instant 0ms Filter Calculation via useMemo
  const filteredPosts = useMemo(() => {
    let list = initialPosts;

    // Search query multi-word compound matching
    if (searchTerm.trim()) {
      const words = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
      list = list.filter((p) => {
        const haystack = `${p.title || ''} ${p.company || ''} ${p.role || ''} ${p.city || ''} ${p.location_raw || ''} ${p.description || ''}`.toLowerCase();
        return words.every((w) => haystack.includes(w));
      });
    }

    // Source filter
    if (selectedSources.length > 0) {
      const sourceSet = new Set(selectedSources);
      list = list.filter((p) => sourceSet.has(p.source));
    }

    // 7-day recency filter
    if (onlyRecent) {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      list = list.filter((p) => p.posted_at && p.posted_at >= cutoff);
    }

    return list;
  }, [initialPosts, searchTerm, selectedSources, onlyRecent]);

  // Synchronize browser URL silently using replaceState without triggering network roundtrips
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }

    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('q', searchTerm.trim());
    selectedSources.forEach((s) => params.append('source', s));
    if (onlyRecent) params.set('recent', 'true');
    if (currentPage > 1) params.set('page', String(currentPage));

    const paramStr = params.toString();
    const targetUrl = paramStr ? `/?${paramStr}` : window.location.pathname;
    window.history.replaceState(null, '', targetUrl);
  }, [searchTerm, selectedSources, onlyRecent, currentPage]);

  // Handlers that reset pagination to page 1 on filter modification
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleToggleSource = (source: string) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
    setCurrentPage(1);
  };

  const handleToggleRecent = () => {
    setOnlyRecent((prev) => !prev);
    setCurrentPage(1);
  };

  const handleResetAll = () => {
    setSearchTerm('');
    setSelectedSources([]);
    setOnlyRecent(false);
    setCurrentPage(1);
  };

  // Pagination slicing
  const totalCount = filteredPosts.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPosts = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredPosts.slice(start, start + PAGE_SIZE);
  }, [filteredPosts, safePage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (gridTopRef.current) {
      gridTopRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div>
      {/* Search and Filters Bar */}
      <SearchAndFilters
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        selectedSources={selectedSources}
        onToggleSource={handleToggleSource}
        onlyRecent={onlyRecent}
        onToggleRecent={handleToggleRecent}
        onResetAll={handleResetAll}
      />

      {/* Anchor for smooth scroll on pagination */}
      <div ref={gridTopRef} />

      {/* Results Header */}
      <div className="flex items-center justify-between mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <span>
          Showing {paginatedPosts.length} of {totalCount.toLocaleString()}{' '}
          {totalCount === 1 ? 'position' : 'positions'}
        </span>
        {totalPages > 1 && (
          <span>
            Page {safePage} of {totalPages}
          </span>
        )}
      </div>

      {/* Jobs Grid or Empty State */}
      {paginatedPosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 transition-opacity">
          {paginatedPosts.map((post) => (
            <PostCard key={post.id} post={post} highlightQuery={searchTerm} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-lg mx-auto my-10 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {searchTerm ? `No positions found for "${searchTerm}"` : 'No positions found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            {searchTerm
              ? `No active fresher postings matched "${searchTerm}" with the current filters. Check spelling or try one of the popular search terms below.`
              : 'No active fresher postings matched your filter criteria. Try broadening your criteria.'}
          </p>

          {/* Quick Suggestions for Empty State */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Try searching for:
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {['Python', 'React', 'SDE Intern', 'Frontend', 'Backend', 'Data Analyst'].map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSearchChange(suggestion)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    {suggestion}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {searchTerm && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Clear Search "{searchTerm}"
              </button>
            )}
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
