import { RawPost, SourceResult } from '../types';
import { env } from '../env';
import { fetchWithRateLimitAndRetry } from '../utils/rate-limiter';

const QUERIES = [
  { keywords: 'fresher', location: 'India' },
  { keywords: 'intern', location: 'India' },
  { keywords: 'graduate trainee', location: 'India' },
  { keywords: 'entry level', location: 'India' },
  { keywords: 'software intern', location: 'India' },
  { keywords: 'engineering intern', location: 'India' },
  { keywords: 'data analyst intern', location: 'India' },
  { keywords: 'product intern', location: 'India' },
  { keywords: 'fresher developer', location: '' },
  { keywords: 'internship India', location: '' },
];

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
    for (let page = 1; page <= 2; page++) {
      const url = `https://jooble.org/api/${encodeURIComponent(env.joobleApiKey)}`;

      try {
        const res = await fetchWithRateLimitAndRetry(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keywords: query.keywords,
            location: query.location,
            page,
          }),
        });

        if (!res.ok) {
          if (res.status === 429) {
            console.warn(`[${sourceName}] Jooble rate limit (429) reached. Preserving ${posts.length} fetched posts and continuing.`);
            return { sourceName, posts };
          }
          console.warn(`[${sourceName}] Query "${query.keywords}" page ${page} returned status ${res.status}`);
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
        console.error(`[${sourceName}] Error fetching query "${query.keywords}" page ${page}:`, err?.message || err);
      }
    }
  }

  console.log(`[${sourceName}] Fetched ${posts.length} candidate posts.`);
  return { sourceName, posts };
}
