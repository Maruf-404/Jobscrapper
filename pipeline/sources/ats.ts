import fs from 'fs';
import path from 'path';
import { RawPost, SourceResult } from '../types';
import { fetchWithRateLimitAndRetry } from '../utils/rate-limiter';

interface CompanyConfig {
  name: string;
  slug: string;
  ats: 'greenhouse' | 'lever' | 'ashby';
}

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

export async function fetchATS(): Promise<SourceResult> {
  const sourceName = 'ats';
  const posts: RawPost[] = [];

  const configPath = path.resolve(process.cwd(), 'pipeline/sources/companies.json');
  if (!fs.existsSync(configPath)) {
    console.warn(`[${sourceName}] companies.json not found at ${configPath}`);
    return { sourceName, posts: [] };
  }

  const companies: CompanyConfig[] = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  console.log(`[${sourceName}] Fetching public ATS endpoints for ${companies.length} companies...`);

  for (const company of companies) {
    try {
      if (company.ats === 'greenhouse') {
        const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(company.slug)}/jobs?content=true`;
        const res = await fetchWithRateLimitAndRetry(url);
        if (!res.ok) {
          console.warn(`[${sourceName}] Greenhouse ${company.slug} returned ${res.status}`);
          continue;
        }
        const data = await res.json();
        const jobs = data.jobs || [];

        for (const j of jobs) {
          posts.push({
            title: j.title ? j.title.trim() : 'Untitled Role',
            company: company.name,
            location_raw: j.location?.name ? j.location.name.trim() : '',
            description: stripHtml(j.content || ''),
            apply_url: j.absolute_url || '',
            source: 'greenhouse',
            source_id: `gh_${company.slug}_${j.id}`,
            source_url: j.absolute_url || url,
            posted_at: j.updated_at ? new Date(j.updated_at).toISOString() : null,
          });
        }
      } else if (company.ats === 'lever') {
        const url = `https://api.lever.co/v0/postings/${encodeURIComponent(company.slug)}?mode=json`;
        const res = await fetchWithRateLimitAndRetry(url);
        if (!res.ok) {
          console.warn(`[${sourceName}] Lever ${company.slug} returned ${res.status}`);
          continue;
        }
        const jobs = await res.json();
        if (Array.isArray(jobs)) {
          for (const j of jobs) {
            const loc = j.categories?.location || (j.categories?.allLocations ? j.categories.allLocations.join(', ') : '');
            posts.push({
              title: j.text ? j.text.trim() : 'Untitled Role',
              company: company.name,
              location_raw: loc,
              description: stripHtml(j.descriptionPlain || j.description || ''),
              apply_url: j.hostedUrl || j.applyUrl || '',
              source: 'lever',
              source_id: `lever_${company.slug}_${j.id}`,
              source_url: j.hostedUrl || url,
              posted_at: j.createdAt ? new Date(j.createdAt).toISOString() : null,
            });
          }
        }
      } else if (company.ats === 'ashby') {
        const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(company.slug)}`;
        const res = await fetchWithRateLimitAndRetry(url);
        if (!res.ok) {
          console.warn(`[${sourceName}] Ashby ${company.slug} returned ${res.status}`);
          continue;
        }
        const data = await res.json();
        const jobs = data.jobs || [];
        for (const j of jobs) {
          const loc = [j.locationName, ...(j.secondaryLocations || [])].filter(Boolean).join(', ');
          posts.push({
            title: j.title ? j.title.trim() : 'Untitled Role',
            company: company.name,
            location_raw: loc,
            description: stripHtml(j.descriptionHtml || j.department || ''),
            apply_url: j.jobUrl || '',
            source: 'ashby',
            source_id: `ashby_${company.slug}_${j.id}`,
            source_url: j.jobUrl || url,
            posted_at: j.publishedAt ? new Date(j.publishedAt).toISOString() : null,
          });
        }
      }
    } catch (err: any) {
      console.warn(`[${sourceName}] Error fetching ${company.name} (${company.slug}):`, err?.message || err);
    }
  }

  console.log(`[${sourceName}] Total raw postings fetched from ATS endpoints: ${posts.length}`);
  return { sourceName, posts };
}
