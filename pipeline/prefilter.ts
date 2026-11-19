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

// Indian locations, cities, states, and IT hubs
const INDIA_CITIES_AND_REGIONS = [
  'bengaluru', 'bangalore',
  'mumbai', 'bombay', 'navi mumbai', 'thane',
  'pune',
  'delhi', 'new delhi', 'ncr', 'gurgaon', 'gurugram', 'noida', 'greater noida', 'faridabad', 'ghaziabad',
  'hyderabad', 'secunderabad', 'telangana',
  'chennai', 'madras', 'tamil nadu',
  'kolkata', 'calcutta', 'west bengal',
  'ahmedabad', 'gandhinagar', 'gujarat',
  'jaipur', 'rajasthan',
  'kochi', 'cochin', 'kerala', 'trivandrum', 'thiruvananthapuram',
  'chandigarh', 'mohali', 'panchkula', 'punjab', 'haryana',
  'indore', 'bhopal', 'madhya pradesh',
  'coimbatore',
  'bhubaneswar', 'odisha',
  'lucknow', 'kanpur', 'uttar pradesh',
  'nagpur',
  'vadodara', 'baroda', 'surat',
  'visakhapatnam', 'vizag', 'andhra pradesh',
  'mysore', 'mysuru', 'karnataka',
  'goa',
  'patna', 'bihar',
  'dehradun', 'uttarakhand',
  'guwahati', 'assam'
];

// Explicit non-India locations (continents, countries, overseas hubs, US states)
const NON_INDIA_REGIONS = [
  'united states', 'usa', 'us', 'u.s.', 'canada', 'mexico', 'brazil',
  'united kingdom', 'uk', 'u.k.', 'london', 'ireland', 'dublin',
  'germany', 'berlin', 'munich', 'frankfurt',
  'france', 'paris', 'netherlands', 'amsterdam', 'spain', 'madrid', 'barcelona',
  'italy', 'milan', 'rome', 'switzerland', 'zurich', 'geneva', 'sweden', 'stockholm',
  'poland', 'warsaw', 'krakow', 'serbia', 'belgrade', 'denmark', 'aarhus', 'copenhagen',
  'austria', 'vienna', 'belgium', 'brussels', 'israel', 'tel aviv',
  'australia', 'sydney', 'melbourne', 'singapore', 'japan', 'tokyo',
  'china', 'beijing', 'shanghai', 'hong kong', 'taiwan', 'south korea', 'seoul',
  'dubai', 'uae', 'united arab emirates', 'saudi arabia', 'qatar', 'egypt', 'south africa',
  'chicago', 'san francisco', 'austin', 'seattle', 'boston', 'new york', 'mountain view',
  'bellevue', 'scottsdale', 'lincoln', 'woburn', 'san diego', 'dubuque', 'hudson',
  'emea', 'latam', 'amer', 'na'
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

// Obvious senior/lead roles that shouldn't be included unless they explicitly say intern/trainee
const SENIOR_ROLE_PATTERN = /\b(senior|sr\.?|lead|principal|staff|director|vp|avp|vice president|head of|chief|architect|president|general manager|engineering manager|senior manager|senior executive|chief executive)\b/i;

// Entry-level job title keywords (no explicit fresher/intern needed)
const ENTRY_LEVEL_TITLE_PATTERN = /\b(software engineer|developer|analyst|associate engineer|associate analyst|associate consultant|graduate engineer|graduate analyst|engineer trainee|analyst trainee|technology analyst|systems engineer|qa engineer|test engineer|data engineer|cloud engineer|devops engineer|sre|site reliability|frontend|backend|full.?stack|mobile developer|ios developer|android developer|product analyst|business analyst|operations analyst|financial analyst|marketing analyst|research analyst|content writer|technical writer|support engineer|customer success|account executive|business development|operations executive|sales executive|customer support|support specialist|talent acquisition|recruiter|coordinator)\b/i;

export function isIndiaLocation(locationRaw: string): boolean {
  if (!locationRaw) return false;
  const loc = locationRaw.toLowerCase().trim();
  if (!loc) return false;

  // Check if it explicitly contains a foreign region
  const hasForeign = NON_INDIA_REGIONS.some((f) => {
    const regex = new RegExp(`(^|[^a-z0-9])${f}([^a-z0-9]|$)`, 'i');
    return regex.test(loc);
  });

  // Check if it explicitly contains an Indian city/state/region
  const hasIndianCity = INDIA_CITIES_AND_REGIONS.some((c) => {
    const regex = new RegExp(`(^|[^a-z0-9])${c}([^a-z0-9]|$)`, 'i');
    return regex.test(loc);
  });

  // Check if it explicitly contains "India" or "IND" or ", IN"
  const hasIndiaCountry = /(^|[^a-z0-9])(india|ind)\b/i.test(loc) || /,\s*in\b/i.test(loc);

  // If it mentions a foreign location and does NOT mention India / Indian city, drop immediately
  if (hasForeign && !hasIndianCity && !hasIndiaCountry) {
    return false;
  }

  // If it mentions an Indian city or India, it passes
  if (hasIndianCity || hasIndiaCountry) {
    return true;
  }

  // Handle Remote: ONLY accept if generic remote or explicitly worldwide
  if (loc === 'remote' || loc === 'work from home' || loc === 'wfh') {
    return true;
  }
  if (loc.includes('worldwide') || loc.includes('anywhere') || loc.includes('home based - worldwide')) {
    return true;
  }

  // Strict default: if it does NOT match India, return false
  return false;
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

  // Reject clearly senior roles (unless title said intern/trainee/fresher above)
  if (SENIOR_ROLE_PATTERN.test(t) && !/\b(intern|internship|trainee|fresher|apprentice)\b/i.test(t)) {
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
