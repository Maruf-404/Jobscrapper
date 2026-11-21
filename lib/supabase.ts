import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let anonClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

/**
 * Returns a public anonymous Supabase client (client-safe, read-only RLS).
 */
export function getSupabaseAnonClient(): SupabaseClient | null {
  if (anonClient) return anonClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
    return anonClient;
  }
  return null;
}

/**
 * Returns an admin Supabase client utilizing the Service Role Key (Server-only).
 */
export function getSupabaseServiceClient(): SupabaseClient | null {
  if (serviceClient) return serviceClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    serviceClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });
    return serviceClient;
  }
  return null;
}

/**
 * Checks whether the environment is currently operating in local offline fallback mode.
 */
export function isLocalFallback(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !supabaseUrl || !supabaseAnonKey;
}

/**
 * Reads local JSON database store fallback for offline execution.
 */
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
