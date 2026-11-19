import { getSupabaseAnonClient, isLocalFallback, readLocalDatabase } from './supabase-client';

export interface PostItem {
  id: string;
  title: string;
  company: string;
  location_raw: string;
  description: string;
  apply_url: string;
  source: string;
  posted_at: string | null;
  role: string | null;
  city: string | null;
  is_fresher: boolean;
  tag_confidence: number | null;
}

export interface FilterParams {
  search?: string;
  roles?: string[];
  cities?: string[];
  sources?: string[];
  postedIn7Days?: boolean;
  page?: number;
  limit?: number;
}

export interface FilteredPostsResult {
  posts: PostItem[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export function formatToIST(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'Recently';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'Recently';

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d) + ' IST';
  } catch {
    return 'Recently';
  }
}

export async function getHeaderStats(): Promise<{ activeCount: number; lastUpdatedIST: string }> {
  const supabase = getSupabaseAnonClient();

  if (supabase) {
    try {
      const [countRes, runRes] = await Promise.all([
        supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)
          .eq('is_fresher', true)
          .is('duplicate_of', null),
        supabase
          .from('pipeline_runs')
          .select('finished_at, started_at')
          .order('started_at', { ascending: false })
          .limit(1)
          .single(),
      ]);

      const activeCount = countRes.count || 0;
      const lastUpdated = runRes.data?.finished_at || runRes.data?.started_at || new Date().toISOString();
      return { activeCount, lastUpdatedIST: formatToIST(lastUpdated) };
    } catch {
      // fallback
    }
  }

  // Local fallback
  const store = readLocalDatabase();
  const activePosts = Object.values(store.posts || {}).filter(
    (p: any) => p.is_active && p.is_fresher && !p.duplicate_of
  );
  const latestRun = (store.pipeline_runs || [])[0];
  const lastUpdated = latestRun?.finished_at || latestRun?.started_at || new Date().toISOString();

  return {
    activeCount: activePosts.length,
    lastUpdatedIST: formatToIST(lastUpdated),
  };
}

export async function getFilteredPosts(params: FilterParams): Promise<FilteredPostsResult> {
  const page = Math.max(1, params.page || 1);
  const limit = params.limit || 24;
  const offset = (page - 1) * limit;
  const supabase = getSupabaseAnonClient();

  if (supabase) {
    try {
      let query = supabase
        .from('posts')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .eq('is_fresher', true)
        .is('duplicate_of', null);

      if (params.search && params.search.trim()) {
        const words = params.search
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((w) => w.replace(/[%,()]/g, '')); // Sanitize PostgREST reserved characters

        // Compound AND across all words: each word must appear in at least one key field
        for (const w of words) {
          if (w.length > 0) {
            query = query.or(
              `title.ilike.%${w}%,company.ilike.%${w}%,role.ilike.%${w}%,city.ilike.%${w}%,location_raw.ilike.%${w}%,description.ilike.%${w}%`
            );
          }
        }
      }

      if (params.roles && params.roles.length > 0) {
        query = query.in('role', params.roles);
      }

      if (params.cities && params.cities.length > 0) {
        query = query.in('city', params.cities);
      }

      if (params.sources && params.sources.length > 0) {
        query = query.in('source', params.sources);
      }

      if (params.postedIn7Days) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('posted_at', sevenDaysAgo);
      }

      query = query
        .order('posted_at', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (!error && data) {
        const total = count || 0;
        return {
          posts: data,
          totalCount: total,
          page,
          totalPages: Math.ceil(total / limit) || 1,
        };
      }
    } catch {
      // fallback
    }
  }

  // Local in-memory filtering fallback
  const store = readLocalDatabase();
  let items = Object.values(store.posts || {}).filter(
    (p: any) => p.is_active && p.is_fresher && !p.duplicate_of
  ) as any[];

  if (params.search && params.search.trim()) {
    const words = params.search.toLowerCase().trim().split(/\s+/).filter(Boolean);
    items = items.filter((p) => {
      const haystack = `${p.title || ''} ${p.company || ''} ${p.role || ''} ${p.city || ''} ${p.location_raw || ''} ${p.description || ''}`.toLowerCase();
      return words.every((w) => haystack.includes(w));
    });
  }

  if (params.roles && params.roles.length > 0) {
    const set = new Set(params.roles);
    items = items.filter(p => p.role && set.has(p.role));
  }

  if (params.cities && params.cities.length > 0) {
    const set = new Set(params.cities);
    items = items.filter(p => p.city && set.has(p.city));
  }

  if (params.sources && params.sources.length > 0) {
    const set = new Set(params.sources);
    items = items.filter(p => set.has(p.source));
  }

  if (params.postedIn7Days) {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    items = items.filter(p => p.posted_at && p.posted_at >= cutoff);
  }

  // Sort descending by posted_at
  items.sort((a, b) => (b.posted_at || '').localeCompare(a.posted_at || ''));

  const total = items.length;
  const paginated = items.slice(offset, offset + limit);

  return {
    posts: paginated,
    totalCount: total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getStatsSummary(): Promise<{
  activeTotal: number;
  totalDuplicatesRemoved: number;
  rolesBreakdown: Record<string, number>;
  citiesBreakdown: Record<string, number>;
  sourcesBreakdown: Record<string, number>;
  recentRuns: any[];
}> {
  const supabase = getSupabaseAnonClient();

  if (supabase) {
    try {
      const [postsRes, runsRes] = await Promise.all([
        supabase
          .from('posts')
          .select('role, city, source')
          .eq('is_active', true)
          .eq('is_fresher', true)
          .is('duplicate_of', null),
        supabase
          .from('pipeline_runs')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(10),
      ]);

      const posts = postsRes.data || [];
      const runs = runsRes.data || [];

      const rolesBreakdown: Record<string, number> = {};
      const citiesBreakdown: Record<string, number> = {};
      const sourcesBreakdown: Record<string, number> = {};

      for (const p of posts) {
        const r = p.role || 'Uncategorized';
        const c = p.city || 'Other India';
        const s = p.source || 'Other';
        rolesBreakdown[r] = (rolesBreakdown[r] || 0) + 1;
        citiesBreakdown[c] = (citiesBreakdown[c] || 0) + 1;
        sourcesBreakdown[s] = (sourcesBreakdown[s] || 0) + 1;
      }

      const totalDuplicatesRemoved = runs.reduce(
        (sum, r) => sum + (r.duplicates_removed || 0),
        0
      );

      return {
        activeTotal: posts.length,
        totalDuplicatesRemoved,
        rolesBreakdown,
        citiesBreakdown,
        sourcesBreakdown,
        recentRuns: runs,
      };
    } catch {
      // fallback
    }
  }

  // Local fallback
  const store = readLocalDatabase();
  const posts = Object.values(store.posts || {}).filter(
    (p: any) => p.is_active && p.is_fresher && !p.duplicate_of
  ) as any[];

  const rolesBreakdown: Record<string, number> = {};
  const citiesBreakdown: Record<string, number> = {};
  const sourcesBreakdown: Record<string, number> = {};

  for (const p of posts) {
    const r = p.role || 'Uncategorized';
    const c = p.city || 'Other India';
    const s = p.source || 'Other';
    rolesBreakdown[r] = (rolesBreakdown[r] || 0) + 1;
    citiesBreakdown[c] = (citiesBreakdown[c] || 0) + 1;
    sourcesBreakdown[s] = (sourcesBreakdown[s] || 0) + 1;
  }

  const runs = (store.pipeline_runs || []).slice(0, 10);
  const totalDuplicatesRemoved = runs.reduce(
    (sum: number, r: any) => sum + (r.duplicates_removed || 0),
    0
  );

  return {
    activeTotal: posts.length,
    totalDuplicatesRemoved,
    rolesBreakdown,
    citiesBreakdown,
    sourcesBreakdown,
    recentRuns: runs,
  };
}
