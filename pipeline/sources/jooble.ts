import { RawPost, SourceResult } from '../types';
import { env } from '../env';
import { fetchWithRateLimitAndRetry } from '../utils/rate-limiter';

const QUERIES = ['fresher', 'intern', 'graduate trainee', 'entry level'];

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(html: string): string {
  if (!html) return '';
  const decoded = decodeHtmlEntities(html);
  return decoded.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
}

export async function fetchJooble(): Promise<SourceResult> {
  const sourceName = 'jooble';
  if (!env.joobleApiKey) {
    console.log(`[${sourceName}] Skipping: JOOBLE_API_KEY not provided.`);
    return { sourceName, posts: [] };
  }

  const posts: RawPost[] = [];
  const seenIds = new Set<string>();

  for (const query of QUERIES) {
    const url = `https://jooble.org/api/${encodeURIComponent(env.joobleApiKey)}`;

    try {
      const res = await fetchWithRateLimitAndRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: query,
          location: 'India',
          page: 1,
        }),
      });

      if (!res.ok) {
        console.warn(`[${sourceName}] Query "${query}" returned status ${res.status}`);
        continue;
      }

      const data = await res.json();
      const jobs = data.jobs || [];

      for (const item of jobs) {
        const id = String(item.id || item.link);
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        const post: RawPost = {
          title: item.title ? stripHtml(item.title) : 'Untitled',
          company: item.company || 'Confidential',
          location_raw: item.location || 'India',
          description: stripHtml(item.snippet || ''),
          apply_url: item.link || '',
          source: 'jooble',
          source_id: id,
          source_url: item.link || url,
          posted_at: item.updated ? new Date(item.updated).toISOString() : null,
        };
        posts.push(post);
      }
    } catch (err: any) {
      console.error(`[${sourceName}] Error fetching query "${query}":`, err?.message || err);
    }
  }

  console.log(`[${sourceName}] Fetched ${posts.length} candidate posts.`);
  return { sourceName, posts };
}
