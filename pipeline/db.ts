// Supabase Postgres client and persistence layer
// PRD Section 5 & 7

import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';
import { DedupedPost } from './dedupe';
import { TaggingOutputItem } from './prompts';
import { LLMCallRecord } from './tag';
import { isIndiaLocation, isFresherPost } from './prefilter';

export interface DBPost {
  id?: string;
  dedupe_key: string;
  title: string;
  company: string;
  location_raw: string;
  description: string;
  apply_url: string;
  source: string;
  source_id: string;
  posted_at: string | null;
  role: string | null;
  city: string | null;
  is_fresher: boolean | null;
  tag_confidence: number | null;
  duplicate_of: string | null;
  is_active: boolean;
  first_seen_at?: string;
  last_seen_at?: string;
}

export interface PipelineRunRecord {
  id?: string;
  started_at: string;
  finished_at: string;
  fetched: number;
  after_prefilter: number;
  duplicates_removed: number;
  tagged: number;
  active_total: number;
  per_source: Record<string, number>;
  errors: Record<string, string>;
}

// Local mock database file path for offline/development execution
const LOCAL_DB_DIR = path.resolve(process.cwd(), 'data');
const LOCAL_DB_FILE = path.resolve(LOCAL_DB_DIR, 'db_local.json');

interface LocalDBStore {
  posts: Record<string, DBPost>;
  pipeline_runs: PipelineRunRecord[];
  llm_calls: (LLMCallRecord & { id: string; run_id: string; created_at: string })[];
}

function getLocalStore(): LocalDBStore {
  if (!fs.existsSync(LOCAL_DB_DIR)) {
    fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_DB_FILE)) {
    const initial: LocalDBStore = { posts: {}, pipeline_runs: [], llm_calls: [] };
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf-8'));
  } catch {
    return { posts: {}, pipeline_runs: [], llm_calls: [] };
  }
}

function saveLocalStore(store: LocalDBStore): void {
  if (!fs.existsSync(LOCAL_DB_DIR)) {
    fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
  }
  fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

export class DatabaseService {
  private supabase: SupabaseClient | null = null;

  constructor() {
    if (env.supabaseUrl && env.supabaseServiceRoleKey) {
      this.supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
        auth: { persistSession: false },
      });
      console.log('[DB] Connected to Supabase with service role key.');
    } else {
      console.log('[DB] Supabase credentials not set. Using persistent local JSON store at data/db_local.json.');
    }
  }

  public isRemote(): boolean {
    return this.supabase !== null;
  }

  // PRD Section 5: Cache by dedupe_key, only tag posts with no tags yet (never retag)
  public async getExistingTaggedPosts(): Promise<Map<string, { role: string; city: string; is_fresher: boolean; confidence: number }>> {
    const taggedMap = new Map<string, { role: string; city: string; is_fresher: boolean; confidence: number }>();

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('posts')
          .select('dedupe_key, role, city, is_fresher, tag_confidence')
          .not('role', 'is', null);

        if (error) {
          console.warn('[DB] Error reading existing tagged posts:', error.message);
        } else if (data) {
          for (const row of data) {
            taggedMap.set(row.dedupe_key, {
              role: row.role,
              city: row.city,
              is_fresher: row.is_fresher,
              confidence: row.tag_confidence,
            });
          }
        }
      } catch (err: any) {
        console.warn('[DB] Supabase getExistingTaggedPosts exception:', err?.message || err);
      }
    } else {
      const store = getLocalStore();
      for (const p of Object.values(store.posts)) {
        if (p.role && p.city) {
          taggedMap.set(p.dedupe_key, {
            role: p.role,
            city: p.city,
            is_fresher: p.is_fresher ?? true,
            confidence: p.tag_confidence ?? 0.8,
          });
        }
      }
    }

    console.log(`[DB] Loaded ${taggedMap.size} previously tagged posts from cache.`);
    return taggedMap;
  }

  // Upsert posts into DB (PRD Section 5 & 7)
  public async upsertPosts(posts: DBPost[]): Promise<number> {
    if (posts.length === 0) return 0;
    const nowIso = new Date().toISOString();

    if (this.supabase) {
      try {
        // Upsert in batches of 100
        const BATCH = 100;
        let count = 0;
        for (let i = 0; i < posts.length; i += BATCH) {
          const slice = posts.slice(i, i + BATCH).map(p => ({
            ...p,
            last_seen_at: nowIso,
          }));
          const { error } = await this.supabase
            .from('posts')
            .upsert(slice, { onConflict: 'dedupe_key' });

          if (error) {
            console.error('[DB] Error upserting posts batch:', error.message);
          } else {
            count += slice.length;
          }
        }
        return count;
      } catch (err: any) {
        console.error('[DB] Upsert exception:', err?.message || err);
        return 0;
      }
    } else {
      const store = getLocalStore();
      for (const p of posts) {
        const existing = store.posts[p.dedupe_key];
        store.posts[p.dedupe_key] = {
          ...p,
          id: existing?.id || p.id || `post_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          first_seen_at: existing?.first_seen_at || nowIso,
          last_seen_at: nowIso,
        };
      }
      saveLocalStore(store);
      return posts.length;
    }
  }

  // Mark posts not seen in the last 7 days as is_active=false (PRD Section 5)
  public async deactivateStalePosts(): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    if (this.supabase) {
      try {
        const { error, count } = await this.supabase
          .from('posts')
          .update({ is_active: false })
          .lt('last_seen_at', sevenDaysAgo)
          .eq('is_active', true);

        if (error) {
          console.warn('[DB] Error deactivating stale posts:', error.message);
          return 0;
        }
        return count || 0;
      } catch (err: any) {
        console.warn('[DB] Deactivate exception:', err?.message || err);
        return 0;
      }
    } else {
      const store = getLocalStore();
      let count = 0;
      for (const p of Object.values(store.posts)) {
        if (p.is_active && p.last_seen_at && p.last_seen_at < sevenDaysAgo) {
          p.is_active = false;
          count++;
        }
      }
      saveLocalStore(store);
      return count;
    }
  }

  // Purge any foreign posts that fail strict India location validation
  public async purgeNonIndiaPosts(): Promise<number> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('posts')
          .select('id, location_raw');
        if (error || !data) return 0;
        const nonIndiaIds = data.filter(p => !isIndiaLocation(p.location_raw)).map(p => p.id);
        if (nonIndiaIds.length === 0) return 0;

        console.log(`[DB] Purging ${nonIndiaIds.length} non-India posts from database...`);
        const BATCH = 100;
        let purged = 0;
        for (let i = 0; i < nonIndiaIds.length; i += BATCH) {
          const chunk = nonIndiaIds.slice(i, i + BATCH);
          const { error: delErr } = await this.supabase.from('posts').delete().in('id', chunk);
          if (!delErr) purged += chunk.length;
        }
        return purged;
      } catch (err: any) {
        console.warn('[DB] purgeNonIndiaPosts exception:', err?.message || err);
        return 0;
      }
    } else {
      const store = getLocalStore();
      let purged = 0;
      const newPosts: Record<string, DBPost> = {};
      for (const [k, v] of Object.entries(store.posts)) {
        if (isIndiaLocation(v.location_raw)) {
          newPosts[k] = v;
        } else {
          purged++;
        }
      }
      store.posts = newPosts;
      saveLocalStore(store);
      return purged;
    }
  }

  // Purge any posts that fail strict fresher/internship qualification
  public async purgeNonFresherPosts(): Promise<number> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('posts')
          .select('id, title, description')
          .eq('is_fresher', true);
        if (error || !data) return 0;
        const nonFresherIds = data
          .filter((p) => !isFresherPost(p.title, p.description || ''))
          .map((p) => p.id);
        if (nonFresherIds.length === 0) return 0;

        console.log(`[DB] Purging ${nonFresherIds.length} non-fresher posts from database...`);
        const BATCH = 100;
        let purged = 0;
        for (let i = 0; i < nonFresherIds.length; i += BATCH) {
          const chunk = nonFresherIds.slice(i, i + BATCH);
          const { error: delErr } = await this.supabase.from('posts').delete().in('id', chunk);
          if (!delErr) purged += chunk.length;
        }
        return purged;
      } catch (err: any) {
        console.warn('[DB] purgeNonFresherPosts exception:', err?.message || err);
        return 0;
      }
    } else {
      const store = getLocalStore();
      let purged = 0;
      const newPosts: Record<string, DBPost> = {};
      for (const [key, p] of Object.entries(store.posts)) {
        if (p.is_fresher && !isFresherPost(p.title, p.description || '')) {
          purged++;
        } else {
          newPosts[key] = p;
        }
      }
      store.posts = newPosts;
      saveLocalStore(store);
      return purged;
    }
  }

  // Count total active, fresher, non-duplicate posts
  public async getActiveTotal(): Promise<number> {
    if (this.supabase) {
      try {
        const { count, error } = await this.supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)
          .eq('is_fresher', true)
          .is('duplicate_of', null);

        if (error) {
          console.warn('[DB] Error getting active total:', error.message);
          return 0;
        }
        return count || 0;
      } catch {
        return 0;
      }
    } else {
      const store = getLocalStore();
      return Object.values(store.posts).filter(
        p => p.is_active && p.is_fresher && !p.duplicate_of
      ).length;
    }
  }

  // Log the run in pipeline_runs (PRD Section 5 & 7)
  public async recordPipelineRun(run: PipelineRunRecord): Promise<string> {
    const runId = `run_${Date.now()}`;
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('pipeline_runs')
          .insert({
            started_at: run.started_at,
            finished_at: run.finished_at,
            fetched: run.fetched,
            after_prefilter: run.after_prefilter,
            duplicates_removed: run.duplicates_removed,
            tagged: run.tagged,
            active_total: run.active_total,
            per_source: run.per_source,
            errors: run.errors,
          })
          .select('id')
          .single();

        if (error) {
          console.error('[DB] Error recording pipeline run:', error.message);
          return runId;
        }
        return data.id;
      } catch (err: any) {
        console.error('[DB] Record run exception:', err?.message || err);
        return runId;
      }
    } else {
      const store = getLocalStore();
      const recorded = { ...run, id: runId };
      store.pipeline_runs.unshift(recorded);
      saveLocalStore(store);
      return runId;
    }
  }

  // Log LLM calls into llm_calls (PRD Section 6 & 7)
  public async recordLLMCalls(runId: string, calls: LLMCallRecord[]): Promise<void> {
    if (calls.length === 0) return;
    const nowIso = new Date().toISOString();

    if (this.supabase) {
      try {
        const records = calls.map(c => ({
          run_id: runId.startsWith('run_') ? null : runId,
          model: c.model,
          posts_in_batch: c.postsInBatch,
          input_tokens: c.inputTokens,
          output_tokens: c.outputTokens,
          created_at: nowIso,
        }));
        const { error } = await this.supabase.from('llm_calls').insert(records);
        if (error) {
          console.warn('[DB] Error recording LLM calls:', error.message);
        }
      } catch (err: any) {
        console.warn('[DB] Record LLM calls exception:', err?.message || err);
      }
    } else {
      const store = getLocalStore();
      for (const c of calls) {
        store.llm_calls.push({
          ...c,
          id: `llm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          run_id: runId,
          created_at: nowIso,
        });
      }
      saveLocalStore(store);
    }
  }

  // Retrieve all active posts for scripts and frontend
  public async getAllActivePosts(): Promise<DBPost[]> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('posts')
          .select('*')
          .eq('is_active', true)
          .eq('is_fresher', true)
          .is('duplicate_of', null)
          .order('posted_at', { ascending: false, nullsFirst: false });

        if (error) {
          console.error('[DB] Error getting active posts:', error.message);
          return [];
        }
        return data || [];
      } catch {
        return [];
      }
    } else {
      const store = getLocalStore();
      return Object.values(store.posts)
        .filter(p => p.is_active && p.is_fresher && !p.duplicate_of)
        .sort((a, b) => (b.posted_at || '').localeCompare(a.posted_at || ''));
    }
  }

  // Retrieve recent pipeline runs
  public async getRecentRuns(limit: number = 10): Promise<PipelineRunRecord[]> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('pipeline_runs')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(limit);

        if (error) {
          console.warn('[DB] Error fetching recent runs:', error.message);
          return [];
        }
        return data || [];
      } catch {
        return [];
      }
    } else {
      const store = getLocalStore();
      return store.pipeline_runs.slice(0, limit);
    }
  }
}

export const db = new DatabaseService();
