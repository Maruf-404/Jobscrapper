import { Suspense } from 'react';
import JobsExplorer from '@/components/jobs/JobsExplorer';
import { getAllActivePosts } from '@/lib/posts';

export const revalidate = 300; // ISR revalidate every 300 seconds (PRD Section 8)

interface PageProps {
  searchParams: {
    q?: string;
    recent?: string;
    page?: string;
  };
}

export default async function HomePage({ searchParams }: PageProps) {
  const q = searchParams.q || '';
  const postedIn7Days = searchParams.recent === 'true';
  const page = parseInt(searchParams.page || '1', 10) || 1;

  // Load active fresher posts for fast, instant client-side explorer
  const posts = await getAllActivePosts();

  return (
    <div>
      {/* Hero Banner */}
      <div className="mb-3.5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#101828]">
          Find Fresher &amp; Internship Jobs in India
        </h1>
        <p className="text-sm text-[#475467] mt-1 max-w-2xl font-normal">
          Aggregated directly from verified company career pages and official job portals across India.
          Intelligently categorized by role and city using Gemini Flash.
        </p>
      </div>

      {/* Interactive Instant Jobs Explorer */}
      <Suspense fallback={<div className="h-96 bg-white rounded-2xl animate-pulse mb-8" />}>
        <JobsExplorer
          initialPosts={posts}
          initialParams={{
            q,
            recent: postedIn7Days,
            page,
          }}
        />
      </Suspense>
    </div>
  );
}
