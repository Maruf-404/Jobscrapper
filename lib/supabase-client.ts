import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseAnonClient(): SupabaseClient | null {
  if (supabaseUrl && supabaseAnonKey) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
  }
  return null;
}

export function isLocalFallback(): boolean {
  return !supabaseUrl || !supabaseAnonKey;
}

export function readLocalDatabase(): any {
  const localDbPath = path.resolve(process.cwd(), 'data/db_local.json');
  if (fs.existsSync(localDbPath)) {
    try {
      return JSON.parse(fs.readFileSync(localDbPath, 'utf-8'));
    } catch {
      return { posts: {}, pipeline_runs: [], llm_calls: [] };
    }
  }
  return { posts: {}, pipeline_runs: [], llm_calls: [] };
}
