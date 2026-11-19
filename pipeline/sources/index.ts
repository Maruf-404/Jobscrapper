import { RawPost, SourceResult } from '../types';
import { fetchJooble } from './jooble';
import { fetchATS } from './ats';

export interface AllSourcesResult {
  posts: RawPost[];
  perSource: Record<string, number>;
  errors: Record<string, string>;
}

export async function fetchAllSources(): Promise<AllSourcesResult> {
  console.log('[SOURCES] Starting parallel fetch across all configured sources...');

  const sources = [
    { name: 'jooble', fn: fetchJooble },
    { name: 'ats', fn: fetchATS },
  ];

  const results = await Promise.allSettled(
    sources.map(async ({ name, fn }) => {
      try {
        return await fn();
      } catch (err: any) {
        console.error(`[SOURCES] Source "${name}" encountered unhandled error:`, err?.message || err);
        return { sourceName: name, posts: [], error: err?.message || String(err) } as SourceResult;
      }
    })
  );

  const allPosts: RawPost[] = [];
  const perSource: Record<string, number> = {};
  const errors: Record<string, string> = {};

  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    const outcome = results[i];
    if (outcome.status === 'fulfilled') {
      const res = outcome.value;
      if (res.error) {
        errors[s.name] = res.error;
      }
      perSource[s.name] = res.posts.length;
      allPosts.push(...res.posts);
    } else {
      errors[s.name] = outcome.reason?.message || 'Rejected promise';
      perSource[s.name] = 0;
    }
  }

  console.log(`[SOURCES] Fetch complete. Total fetched: ${allPosts.length}. Breakdown:`, perSource);
  if (Object.keys(errors).length > 0) {
    console.warn('[SOURCES] Source errors encountered:', errors);
  }

  return { posts: allPosts, perSource, errors };
}
