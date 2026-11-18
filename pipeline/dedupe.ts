import crypto from 'crypto';
import { RawPost } from './types';

export interface DedupedPost extends RawPost {
  id?: string;
  dedupe_key: string;
  canonical_apply_url: string;
  canonical_city: string;
  duplicate_of?: string | null;
}

export interface DedupeStats {
  totalInput: number;
  exactDuplicatesRemoved: number;
  fuzzyDuplicatesRemoved: number;
  totalUnique: number;
  duplicatesPerSource: Record<string, number>;
}

export interface DedupeResult {
  uniquePosts: DedupedPost[];
  duplicatePosts: DedupedPost[];
  stats: DedupeStats;
}

// Canonical city mapper
export function getCanonicalCity(locationRaw: string): string {
  if (!locationRaw) return 'Remote';
  const loc = locationRaw.toLowerCase();

  if (loc.includes('bangalore') || loc.includes('bengaluru')) return 'Bengaluru';
  if (loc.includes('mumbai') || loc.includes('bombay') || loc.includes('navi mumbai') || loc.includes('thane')) return 'Mumbai';
  if (loc.includes('pune')) return 'Pune';
  if (
    loc.includes('delhi') ||
    loc.includes('ncr') ||
    loc.includes('gurgaon') ||
    loc.includes('gurugram') ||
    loc.includes('noida') ||
    loc.includes('faridabad') ||
    loc.includes('ghaziabad')
  ) {
    return 'Delhi NCR';
  }
  if (loc.includes('hyderabad') || loc.includes('secunderabad')) return 'Hyderabad';
  if (loc.includes('chennai') || loc.includes('madras')) return 'Chennai';
  if (loc.includes('kolkata') || loc.includes('calcutta')) return 'Kolkata';
  if (loc.includes('ahmedabad')) return 'Ahmedabad';
  if (loc.includes('jaipur')) return 'Jaipur';
  if (loc.includes('remote') || loc.includes('wfh') || loc.includes('work from home') || loc.includes('anywhere')) {
    return 'Remote';
  }

  return 'Other India';
}

export function normalizeString(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function canonicalizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'source', 'fbclid', 'gclid', 'gh_src', 'lever-source', 'ashby_jid',
      'trk', 'tracking_id', 'sub_id'
    ];
    for (const p of trackingParams) {
      parsed.searchParams.delete(p);
    }
    parsed.hash = '';
    let result = parsed.toString();
    if (result.endsWith('/')) {
      result = result.slice(0, -1);
    }
    return result;
  } catch {
    return rawUrl.trim();
  }
}

export function computeDedupeKey(company: string, title: string, city: string): string {
  const normComp = normalizeString(company);
  const normTitle = normalizeString(title);
  const normCity = normalizeString(city);
  const data = `${normComp}|${normTitle}|${normCity}`;
  return crypto.createHash('sha1').update(data).digest('hex');
}

// Postgres pg_trgm style trigram generation
function getTrigrams(str: string): Set<string> {
  const padded = `  ${str} `;
  const trigrams = new Set<string>();
  for (let i = 0; i <= padded.length - 3; i++) {
    trigrams.add(padded.substring(i, i + 3));
  }
  return trigrams;
}

// Trigram Jaccard similarity (|A ∩ B| / |A ∪ B|) matching pg_trgm similarity()
export function trigramSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;

  const triA = getTrigrams(a);
  const triB = getTrigrams(b);

  let intersection = 0;
  for (const t of triA) {
    if (triB.has(t)) {
      intersection++;
    }
  }

  const union = triA.size + triB.size - intersection;
  return union === 0 ? 0.0 : intersection / union;
}

export function deduplicatePosts(posts: RawPost[]): DedupeResult {
  const duplicatesPerSource: Record<string, number> = {};
  const recordDuplicate = (src: string) => {
    duplicatesPerSource[src] = (duplicatesPerSource[src] || 0) + 1;
  };

  const seenDedupeKeys = new Map<string, DedupedPost>();
  const seenUrls = new Map<string, DedupedPost>();
  const uniquePosts: DedupedPost[] = [];
  const duplicatePosts: DedupedPost[] = [];

  let exactDuplicatesRemoved = 0;
  let fuzzyDuplicatesRemoved = 0;

  for (const post of posts) {
    const canonicalCity = getCanonicalCity(post.location_raw);
    const canonicalUrl = canonicalizeUrl(post.apply_url);
    const dedupeKey = computeDedupeKey(post.company, post.title, canonicalCity);

    const dedupedPost: DedupedPost = {
      ...post,
      dedupe_key: dedupeKey,
      canonical_apply_url: canonicalUrl,
      canonical_city: canonicalCity,
    };

    // 1. Exact match on dedupe_key (normalized company + title + city)
    if (seenDedupeKeys.has(dedupeKey)) {
      const canonical = seenDedupeKeys.get(dedupeKey)!;
      dedupedPost.duplicate_of = canonical.dedupe_key;
      duplicatePosts.push(dedupedPost);
      exactDuplicatesRemoved++;
      recordDuplicate(post.source);
      continue;
    }

    // 2. Exact match on canonical URL
    if (canonicalUrl && seenUrls.has(canonicalUrl)) {
      const canonical = seenUrls.get(canonicalUrl)!;
      dedupedPost.duplicate_of = canonical.dedupe_key;
      duplicatePosts.push(dedupedPost);
      exactDuplicatesRemoved++;
      recordDuplicate(post.source);
      continue;
    }

    // 3. Fuzzy match: same normalized company and title similarity > 0.85
    const normCompany = normalizeString(post.company);
    const normTitle = normalizeString(post.title);
    let fuzzyMatch: DedupedPost | null = null;

    for (const existing of uniquePosts) {
      if (normalizeString(existing.company) === normCompany) {
        const sim = trigramSimilarity(normalizeString(existing.title), normTitle);
        if (sim > 0.85) {
          fuzzyMatch = existing;
          break;
        }
      }
    }

    if (fuzzyMatch) {
      dedupedPost.duplicate_of = fuzzyMatch.dedupe_key;
      duplicatePosts.push(dedupedPost);
      fuzzyDuplicatesRemoved++;
      recordDuplicate(post.source);
      continue;
    }

    // Passed deduplication
    seenDedupeKeys.set(dedupeKey, dedupedPost);
    if (canonicalUrl) {
      seenUrls.set(canonicalUrl, dedupedPost);
    }
    uniquePosts.push(dedupedPost);
  }

  const stats: DedupeStats = {
    totalInput: posts.length,
    exactDuplicatesRemoved,
    fuzzyDuplicatesRemoved,
    totalUnique: uniquePosts.length,
    duplicatesPerSource,
  };

  console.log(`[DEDUPE] Input posts: ${stats.totalInput}`);
  console.log(` - Exact duplicates removed: ${stats.exactDuplicatesRemoved}`);
  console.log(` - Fuzzy duplicates removed: ${stats.fuzzyDuplicatesRemoved}`);
  console.log(` - Unique posts remaining: ${stats.totalUnique}`);
  console.log(' - Duplicates per source:', stats.duplicatesPerSource);

  return { uniquePosts, duplicatePosts, stats };
}
