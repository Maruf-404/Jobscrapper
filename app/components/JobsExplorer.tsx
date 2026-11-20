'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import SearchAndFilters from './SearchAndFilters';
import PostCard from './PostCard';
import { PostItem } from '@/lib/posts';
import { AlertCircle, Loader2, CheckCircle2, ArrowUp } from 'lucide-react';

const INITIAL_BATCH_SIZE = 24;
const BATCH_INCREMENT = 12;

export interface JobsExplorerProps {
  initialPosts: PostItem[];
  initialParams: {
    q?: string;
    recent?: boolean;
    page?: number;
  };
}

export default function JobsExplorer({ initialPosts, initialParams }: JobsExplorerProps) {
  const [searchTerm, setSearchTerm] = useState(initialParams.q || '');
  const [onlyRecent, setOnlyRecent] = useState<boolean>(initialParams.recent || false);
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_BATCH_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);

  const isMountedRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

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

    // 7-day recency filter
    if (onlyRecent) {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      list = list.filter((p) => p.posted_at && p.posted_at >= cutoff);
    }

    return list;
  }, [initialPosts, searchTerm, onlyRecent]);

  const totalCount = filteredPosts.length;
  const hasMore = visibleCount < totalCount;

  // Sliced posts for optimized DOM rendering
  const visiblePosts = useMemo(() => {
    return filteredPosts.slice(0, visibleCount);
  }, [filteredPosts, visibleCount]);

  // Reset infinite scroll count when filter or search changes
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH_SIZE);
  }, [searchTerm, onlyRecent]);

  // Synchronize browser URL silently without full re-render
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }

    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('q', searchTerm.trim());
    if (onlyRecent) params.set('recent', 'true');

    const paramStr = params.toString();
    const targetUrl = paramStr ? `/?${paramStr}` : window.location.pathname;
    window.history.replaceState(null, '', targetUrl);
  }, [searchTerm, onlyRecent]);

  // Monitor scroll for Back-to-Top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 600) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Optimized IntersectionObserver for smooth infinite scroll
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    // Brief throttle for smooth loader animation
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + BATCH_INCREMENT, totalCount));
      setIsLoadingMore(false);
    }, 200);
  }, [isLoadingMore, hasMore, totalCount]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: '350px', // Pre-load before user hits the bottom
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleToggleRecent = () => {
    setOnlyRecent((prev) => !prev);
  };

  const handleResetAll = () => {
    setSearchTerm('');
    setOnlyRecent(false);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      {/* Search and Filters Bar */}
      <SearchAndFilters
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onlyRecent={onlyRecent}
        onToggleRecent={handleToggleRecent}
        onResetAll={handleResetAll}
      />

      {/* Results Header */}
      <div className="flex items-center justify-between mb-3 text-xs font-semibold uppercase tracking-wider text-[#667085]">
        <span>
          Showing {visiblePosts.length} of {totalCount.toLocaleString()}{' '}
          {totalCount === 1 ? 'position' : 'positions'}
        </span>
        {hasMore && (
          <span className="text-[#0D81FC] font-medium normal-case flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0D81FC] animate-ping inline-block" />
            Scroll down for more
          </span>
        )}
      </div>

      {/* Jobs Grid or Empty State */}
      {visiblePosts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 transition-opacity">
            {visiblePosts.map((post) => (
              <PostCard key={post.id} post={post} highlightQuery={searchTerm} />
            ))}
          </div>

          {/* Infinite Scroll Sentinel and Loader */}
          {hasMore && (
            <div ref={sentinelRef} className="mt-8">
              {/* Skeleton Cards Preview on Load */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 opacity-60">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-[#EAECF0] p-5 shadow-xs animate-pulse"
                  >
                    <div className="w-24 h-5 bg-[#F2F4F7] rounded-full mb-3" />
                    <div className="w-3/4 h-5 bg-[#F2F4F7] rounded mb-2" />
                    <div className="w-1/2 h-4 bg-[#F9FAFB] rounded mb-4" />
                    <div className="w-full h-8 bg-[#F9FAFB] rounded-lg mt-4" />
                  </div>
                ))}
              </div>

              {/* Bottom Loading Indicator */}
              <div className="flex items-center justify-center gap-2 py-6 text-xs font-medium text-[#667085]">
                <Loader2 className="w-4 h-4 text-[#0D81FC] animate-spin" />
                <span>Loading more fresher opportunities...</span>
              </div>
            </div>
          )}

          {/* End of Results Pill */}
          {!hasMore && totalCount > 0 && (
            <div className="text-center py-12 my-6 border-t border-[#EAECF0]">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#EAECF0] text-[#475467] text-xs font-medium shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-[#12B76A] shrink-0" />
                <span>You've viewed all {totalCount.toLocaleString()} verified opportunities</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-[#EAECF0] p-8 sm:p-12 text-center max-w-lg mx-auto my-10 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#F2F4F7] flex items-center justify-center text-[#98A2B3] mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#101828]">
            {searchTerm ? `No positions found for "${searchTerm}"` : 'No positions found'}
          </h3>
          <p className="text-xs text-[#475467] mt-1.5 leading-relaxed">
            {searchTerm
              ? `No active fresher postings matched "${searchTerm}" with the current filters. Check spelling or try one of the popular search terms below.`
              : 'No active fresher postings matched your filter criteria. Try broadening your criteria.'}
          </p>

          {/* Quick Suggestions for Empty State */}
          <div className="mt-5 pt-4 border-t border-[#EAECF0]">
            <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-2">
              Try searching for:
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {['Python', 'React', 'SDE Intern', 'Frontend', 'Backend', 'Data Analyst'].map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSearchChange(suggestion)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#F2F4F7] text-[#344054] hover:bg-[#EFF7FF] hover:text-[#0D81FC] transition-colors"
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
                className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F2F4F7] text-[#344054] hover:bg-[#E4E7EC] transition-colors"
              >
                Clear Search "{searchTerm}"
              </button>
            )}
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-[#0D81FC] text-white hover:bg-[#0B72DF] transition-colors shadow-xs"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      )}

      {/* Floating Back-to-Top Button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 p-3 rounded-full bg-[#0D81FC] text-white shadow-lg shadow-[#0D81FC]/30 hover:bg-[#0B72DF] active:scale-95 transition-all z-20"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
