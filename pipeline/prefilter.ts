import { RawPost } from './types';

export interface PreFilterStats {
  total: number;
  droppedNonIndia: number;
  droppedNonFresher: number;
  passed: number;
}

export interface PreFilterResult {
  posts: RawPost[];
  stats: PreFilterStats;
}

// Indian locations and indicators
const INDIA_LOCATION_KEYWORDS = [
  'india',
  'bengaluru', 'bangalore',
  'mumbai', 'bombay',
  'pune',
  'delhi', 'new delhi', 'ncr', 'gurgaon', 'gurugram', 'noida', 'faridabad', 'ghaziabad',
  'hyderabad', 'secunderabad',
  'chennai', 'madras',
  'kolkata', 'calcutta',
  'ahmedabad',
  'jaipur',
  'remote', 'wfh', 'work from home', 'anywhere', 'virtual'
];

// Negative location keywords (overseas locations without India/Remote)
const NON_INDIA_LOCATIONS = [
  'united states', 'usa', 'united kingdom', 'uk', 'london', 'germany', 'berlin',
  'singapore', 'australia', 'sydney', 'canada', 'toronto', 'france', 'paris',
  'netherlands', 'amsterdam', 'dubai', 'uae', 'ireland', 'dublin', 'japan', 'tokyo'
];

// Fresher keywords for titles and descriptions
const FRESHER_KEYWORDS_TITLE = [
  /\bfresher\b/i,
  /\bfreshers\b/i,
  /\bintern\b/i,
  /\binterns\b/i,
  /\binternship\b/i,
  /\binternships\b/i,
  /\btrainee\b/i,
  /\bgraduate trainee\b/i,
  /\bmanagement trainee\b/i,
  /\bnew grad\b/i,
  /\bnew graduate\b/i,
  /\bentry level\b/i,
  /\bentry-level\b/i,
  /\bcampus\b/i,
  /\bapprentice\b/i,
  /\bapprenticeship\b/i,
  /\bjunior\b/i,
  /\bjr\.?\b/i,
  /\bassociate\b/i,
  /\b0-1\b/i,
  /\b0-2\b/i,
];

const FRESHER_KEYWORDS_BODY = [
  /\bfresher\b/i,
  /\bfreshers\b/i,
  /\bintern\b/i,
  /\binternship\b/i,
  /\bgraduate trainee\b/i,
  /\bentry level\b/i,
  /\bentry-level\b/i,
  /\b0\s*-\s*1\s*(years?|yrs?)\b/i,
  /\b0\s*-\s*2\s*(years?|yrs?)\b/i,
  /\b0\s*to\s*1\s*(years?|yrs?)\b/i,
  /\b0\s*to\s*2\s*(years?|yrs?)\b/i,
  /\bno prior experience\b/i,
  /\bno experience required\b/i,
  /\bcollege graduate\b/i,
  /\brecent graduate\b/i,
];

// Obvious senior/lead roles that shouldn't be included unless they explicitly say intern
const SENIOR_ROLE_PATTERN = /\b(senior|sr\.?|lead|principal|staff|director|vp|head of|manager|chief|architect|president|executive)\b/i;

// Entry-level job title keywords (no explicit fresher/intern needed)
const ENTRY_LEVEL_TITLE_PATTERN = /\b(software engineer|developer|analyst|associate engineer|associate analyst|associate consultant|graduate engineer|graduate analyst|engineer trainee|analyst trainee|technology analyst|systems engineer|qa engineer|test engineer|data engineer|cloud engineer|devops engineer|sre|site reliability|frontend|backend|full.?stack|mobile developer|ios developer|android developer|product analyst|business analyst|operations analyst|financial analyst|marketing analyst|research analyst|content writer|technical writer|support engineer|customer success|account executive|business development)\b/i;

export function isIndiaLocation(locationRaw: string): boolean {
  if (!locationRaw) return true; // default lenient if location unspecified in India-specific query
  const loc = locationRaw.toLowerCase();

  // If it mentions India or an Indian city or Remote/WFH, it passes
  const hasIndia = INDIA_LOCATION_KEYWORDS.some((kw) => loc.includes(kw));
  if (hasIndia) return true;

  // If it explicitly names a foreign country and does not mention India or Remote, drop it
  const isForeign = NON_INDIA_LOCATIONS.some((kw) => loc.includes(kw));
  if (isForeign) return false;

  return true;
}

export function isFresherPost(title: string, description: string): boolean {
  const t = title.toLowerCase();

  // High confidence positive: title explicitly mentions intern, fresher, trainee, apprentice, new grad
  if (
    /\b(intern|internship|fresher|freshers|trainee|apprentice|new grad|new graduate)\b/i.test(
      t
    )
  ) {
    return true;
  }

  // Reject clearly senior roles (unless title said intern above)
  if (SENIOR_ROLE_PATTERN.test(t) && !/\bintern\b/i.test(t)) {
    return false;
  }

  // Check title for junior/entry/0-1/associate
  const titleMatch = FRESHER_KEYWORDS_TITLE.some((regex) => regex.test(t));
  if (titleMatch) return true;

  // Check description snippet for explicit 0-1, 0-2 yrs or fresher keywords
  const descSnippet = description.slice(0, 3000);
  const descMatch = FRESHER_KEYWORDS_BODY.some((regex) => regex.test(descSnippet));
  if (descMatch) return true;

  // Heuristic: common entry-level job titles with no seniority flags and India location
  // These are roles typically open to freshers (0-2 yrs) even without explicit "fresher" in JD
  if (ENTRY_LEVEL_TITLE_PATTERN.test(t)) {
    return true;
  }

  return false;
}

export function preFilterPosts(posts: RawPost[]): PreFilterResult {
  let droppedNonIndia = 0;
  let droppedNonFresher = 0;
  const passedPosts: RawPost[] = [];

  for (const post of posts) {
    if (!isIndiaLocation(post.location_raw)) {
      droppedNonIndia++;
      continue;
    }

    if (!isFresherPost(post.title, post.description)) {
      droppedNonFresher++;
      continue;
    }

    passedPosts.push(post);
  }

  const stats: PreFilterStats = {
    total: posts.length,
    droppedNonIndia,
    droppedNonFresher,
    passed: passedPosts.length,
  };

  console.log(`[PREFILTER] Evaluated ${stats.total} posts:`);
  console.log(` - Kept: ${stats.passed}`);
  console.log(` - Dropped non-India: ${stats.droppedNonIndia}`);
  console.log(` - Dropped non-fresher: ${stats.droppedNonFresher}`);

  return { posts: passedPosts, stats };
}
