import dotenv from 'dotenv';
import path from 'path';

// Load .env.local first, then fall back to .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface PipelineEnv {
  geminiApiKey: string | undefined;
  geminiModel: string;
  geminiModelFallbacks: string[];
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
  supabaseServiceRoleKey: string | undefined;
  joobleApiKey: string | undefined;
  priceInPerM: number;
  priceOutPerM: number;
  llmRpm: number;
}

export function loadEnv(): PipelineEnv {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const rawFallbacks = process.env.GEMINI_FALLBACK_MODELS || '';
  const geminiModelFallbacks = rawFallbacks
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const joobleApiKey = process.env.JOOBLE_API_KEY;
  const priceInPerM = parseFloat(process.env.PRICE_IN_PER_M || '0.25');
  const priceOutPerM = parseFloat(process.env.PRICE_OUT_PER_M || '1.50');
  const llmRpm = parseInt(process.env.LLM_RPM || '10', 10);

  if (joobleApiKey) {
    console.log('[ENV] Jooble API key present. Source enabled.');
  } else {
    console.log('[ENV] Jooble API key missing. Skipping Jooble source.');
  }

  console.log('[ENV] ATS public sources (Greenhouse, Lever, Ashby) enabled by default (no keys required).');

  if (!geminiApiKey) {
    console.warn('[ENV WARNING] GEMINI_API_KEY is not set. LLM tagging will be simulated or skipped in dry-run.');
  } else {
    const fallbackList = geminiModelFallbacks.length > 0 ? geminiModelFallbacks.join(', ') : 'none';
    console.log(`[ENV] Gemini model: ${geminiModel}. Fallback models: ${fallbackList}.`);
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.warn('[ENV WARNING] Supabase credentials missing. Database operations will run in local test/dry-run mode.');
  }

  return {
    geminiApiKey,
    geminiModel,
    geminiModelFallbacks,
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    joobleApiKey,
    priceInPerM,
    priceOutPerM,
    llmRpm,
  };
}

export const env = loadEnv();
