import { RawPost, SourceResult } from '../types';
import { env } from '../env';
import { fetchWithRateLimitAndRetry } from '../utils/rate-limiter';

const QUERIES = ['fresher', 'intern', 'graduate trainee', 'entry level'];
const PAGES_PER_QUERY = 2;
const RESULTS_PER_PAGE = 50;

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

export async function fetchAdzuna(): Promise<SourceResult> {
  const sourceName = 'adzuna';
  if (!env.adzunaAppId || !env.adzunaAppKey) {
    console.log(`[${sourceName}] Skipping: ADZUNA_APP_ID or ADZUNA_APP_KEY not provided.`);
    return { sourceName, posts: [] };
  }

  const posts: RawPost[] = [];
  const seenIds = new Set<string>();

  for (const query of QUERIES) {
    for (let page = 1; page <= PAGES_PER_QUERY; page++) {
      const url = `https://api.adzuna.com/v1/api/jobs/in/search/${page}?app_id=${encodeURIComponent(
        env.adzunaAppId
      )}&app_key=${encodeURIComponent(env.adzunaAppKey)}&what=${encodeURIComponent(
        query
      )}&results_per_page=${RESULTS_PER_PAGE}&content-type=application/json`;

      try {
        const res = await fetchWithRateLimitAndRetry(url);
        if (!res.ok) {
          console.warn(`[${sourceName}] Query "${query}" page ${page} returned status ${res.status}`);
          continue;
        }

        const data = await res.json();
        const results = data.results || [];

        for (const item of results) {
          const id = String(item.id || item.redirect_url);
          if (seenIds.has(id)) continue;
          seenIds.add(id);

          const locationParts = item.location?.display_name || item.location?.area?.join(', ') || 'India';
          const post: RawPost = {
            title: item.title ? stripHtml(item.title) : 'Untitled',
            company: item.company?.display_name || 'Confidential',
            location_raw: locationParts,
            description: stripHtml(item.description || ''),
            apply_url: item.redirect_url || '',
            source: 'adzuna',
            source_id: id,
            source_url: item.redirect_url || url,
            posted_at: item.created ? new Date(item.created).toISOString() : null,
          };
          posts.push(post);
        }
      } catch (err: any) {
        console.error(`[${sourceName}] Error fetching query "${query}" page ${page}:`, err?.message || err);
      }
    }
  }

  console.log(`[${sourceName}] Fetched ${posts.length} candidate posts.`);
  return { sourceName, posts };
}
