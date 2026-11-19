import { Suspense } from 'react';
import JobsExplorer from './components/JobsExplorer';
import { getAllActivePosts } from '@/lib/posts';

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

  // Load active fresher posts for fast, instant client-side explorer
  const posts = await getAllActivePosts();

  return (
    <div>
      {/* Hero Banner */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Find Fresher &amp; Internship Jobs in India
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-2xl">
          Aggregated directly from public company ATS endpoints (Greenhouse, Lever, Ashby, Unstop) and verified fresher APIs.
          Intelligently categorized by role and city using Gemini Flash.
        </p>
      </div>

      {/* Interactive Instant Jobs Explorer */}
      <Suspense fallback={<div className="h-96 bg-white rounded-2xl animate-pulse mb-8" />}>
        <JobsExplorer
          initialPosts={posts}
          initialParams={{
            q,
            roles,
            cities,
            sources,
            recent: postedIn7Days,
            page,
          }}
        />
      </Suspense>
    </div>
  );
}
