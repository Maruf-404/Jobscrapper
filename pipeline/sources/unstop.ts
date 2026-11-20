// Unstop Public Early-Career Ingestion Source
// Fetches verified open student internships and entry-level fresher opportunities across India
import { RawPost, SourceResult } from '../types';

function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
}

export async function fetchUnstop(): Promise<SourceResult> {
  const sourceName = 'unstop';
  const posts: RawPost[] = [];

  console.log(`[${sourceName}] Fetching public fresher opportunities from Unstop...`);

  // Target 8 pages of internships (~200) + 4 pages of entry-level jobs (~100)
  const categories = [
    { type: 'internships', maxPages: 8 },
    { type: 'jobs', maxPages: 4 },
  ];

  for (const cat of categories) {
    for (let page = 1; page <= cat.maxPages; page++) {
      try {
        const url = `https://unstop.com/api/public/opportunity/search-result?opportunity=${cat.type}&per_page=25&page=${page}&oppstatus=open`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(6000),
        });

        if (!res.ok) {
          console.warn(`[${sourceName}] Page ${page} of ${cat.type} returned status ${res.status}`);
          break;
        }

        const data = await res.json();
        const items = data.data?.data || [];
        if (items.length === 0) break;

        for (const item of items) {
          const title = (item.title || '').trim();
          const company = (item.organisation?.name || 'Company').trim();
          const locations = item.jobDetail?.locations || [];
          const locStr = locations.length > 0 ? locations.join(', ') : 'India (Remote / Pan-India)';
          const rawDesc = item.jobDetail?.about_job || item.seo_meta?.description || '';
          const description = stripHtml(rawDesc);
          const applyUrl = item.public_url ? `https://unstop.com/${item.public_url}` : 'https://unstop.com';

          posts.push({
            title: title || 'Untitled Opportunity',
            company,
            location_raw: locStr,
            description,
            apply_url: applyUrl,
            source: 'unstop',
            source_id: `unstop_${item.id || Buffer.from(company + title).toString('hex').slice(0, 16)}`,
            source_url: applyUrl,
            posted_at: item.start_date ? new Date(item.start_date).toISOString() : new Date().toISOString(),
          });
        }
      } catch (err: any) {
        console.warn(`[${sourceName}] Error on ${cat.type} page ${page}:`, err?.message || err);
        break;
      }
    }
  }

  console.log(`[${sourceName}] Ingested ${posts.length} raw student/fresher postings.`);
  return { sourceName, posts };
}
