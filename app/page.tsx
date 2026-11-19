import { Suspense } from 'react';
import SearchAndFilters from './components/SearchAndFilters';
import PostCard from './components/PostCard';
import Pagination from './components/Pagination';
import { getFilteredPosts, PostItem } from '@/lib/posts';
import { Briefcase, AlertCircle } from 'lucide-react';

export const revalidate = 300; // ISR revalidate every 300 seconds (PRD Section 8)

interface PageProps {
  searchParams: {
    q?: string;
    role?: string | string[];
    city?: string | string[];
    source?: string | string[];
    recent?: string;
    page?: string;
  };
}

export default async function HomePage({ searchParams }: PageProps) {
  const q = searchParams.q || '';
  const roles = Array.isArray(searchParams.role)
    ? searchParams.role
    : searchParams.role
    ? [searchParams.role]
    : [];
  const cities = Array.isArray(searchParams.city)
    ? searchParams.city
    : searchParams.city
    ? [searchParams.city]
    : [];
  const sources = Array.isArray(searchParams.source)
    ? searchParams.source
    : searchParams.source
    ? [searchParams.source]
    : [];
  const postedIn7Days = searchParams.recent === 'true';
  const page = parseInt(searchParams.page || '1', 10) || 1;

  const { posts, totalCount, totalPages } = await getFilteredPosts({
    search: q,
    roles,
    cities,
    sources,
    postedIn7Days,
    page,
    limit: 24,
  });

  return (
    <div>
      {/* Hero Banner */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Find Fresher & Internship Jobs in India
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-2xl">
          Aggregated directly from public company ATS endpoints (Greenhouse, Lever, Ashby) and job APIs.
          Intelligently categorized by role and city using Gemini Flash.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <Suspense fallback={<div className="h-28 bg-white rounded-2xl animate-pulse mb-8" />}>
        <SearchAndFilters />
      </Suspense>

      {/* Results Header */}
      <div className="flex items-center justify-between mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <span>
          Showing {posts.length} of {totalCount.toLocaleString()} {totalCount === 1 ? 'position' : 'positions'}
        </span>
        {totalPages > 1 && <span>Page {page} of {totalPages}</span>}
      </div>

      {/* Jobs Grid or Empty State */}
      {posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 transition-opacity">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} highlightQuery={q} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-lg mx-auto my-10 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {q ? `No positions found for "${q}"` : 'No positions found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            {q
              ? `No active fresher postings matched "${q}" with the current filters. Check spelling or try one of the popular search terms below.`
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
                  <a
                    key={suggestion}
                    href={`/?q=${encodeURIComponent(suggestion)}`}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    {suggestion}
                  </a>
                )
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {q && (
              <a
                href={(() => {
                  const p = new URLSearchParams();
                  roles.forEach((r) => p.append('role', r));
                  cities.forEach((c) => p.append('city', c));
                  sources.forEach((s) => p.append('source', s));
                  if (postedIn7Days) p.set('recent', 'true');
                  const str = p.toString();
                  return str ? `/?${str}` : '/';
                })()}
                className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Clear Search "{q}"
              </a>
            )}
            <a
              href="/"
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Reset All Filters
            </a>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      <Suspense fallback={null}>
        <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} />
      </Suspense>
    </div>
  );
}
