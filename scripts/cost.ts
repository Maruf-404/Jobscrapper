// Cost and Token Audit Script
// PRD Section 10: npm run cost

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { env } from '../pipeline/env';
import { calculateCost } from '../pipeline/pricing';

interface LLMCallRow {
  model: string;
  posts_in_batch: number;
  input_tokens: number;
  output_tokens: number;
  created_at?: string;
}

async function getLLMCalls(): Promise<LLMCallRow[]> {
  if (env.supabaseUrl && env.supabaseServiceRoleKey) {
    try {
      const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);
      const { data, error } = await supabase
        .from('llm_calls')
        .select('model, posts_in_batch, input_tokens, output_tokens, created_at');

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {}
  }

  // Local store fallback
  const dbPath = path.resolve(process.cwd(), 'data/db_local.json');
  if (fs.existsSync(dbPath)) {
    try {
      const store = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      return (store.llm_calls || []).map((c: any) => ({
        model: c.model,
        posts_in_batch: c.postsInBatch || c.posts_in_batch || 10,
        input_tokens: c.inputTokens || c.input_tokens || 0,
        output_tokens: c.outputTokens || c.output_tokens || 0,
        created_at: c.created_at,
      }));
    } catch {}
  }

  return [];
}

async function runCostAudit() {
  console.log('[COST AUDIT] Aggregating token metrics from llm_calls table...');
  const calls = await getLLMCalls();

  if (calls.length === 0) {
    console.log('[COST AUDIT] No recorded calls found in llm_calls table yet.');
    console.log('Baseline Gemini 2.5 Flash Pricing Reference:');
    console.log(` - Input Pricing:  $${env.priceInPerM} per 1M tokens`);
    console.log(` - Output Pricing: $${env.priceOutPerM} per 1M tokens`);
    console.log(` - Typical 10-post batch: ~1,200 input tokens, ~350 output tokens`);
    console.log(` - Estimated Cost per 1,000 Posts: ~$${(
      (120 * 1000 / 1e6) * env.priceInPerM + (35 * 1000 / 1e6) * env.priceOutPerM
    ).toFixed(4)} USD (~₹${(
      ((120 * 1000 / 1e6) * env.priceInPerM + (35 * 1000 / 1e6) * env.priceOutPerM) * 86
    ).toFixed(2)} INR)`);
    return;
  }

  let totalCalls = calls.length;
  let totalPosts = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const c of calls) {
    totalPosts += c.posts_in_batch || 1;
    totalInputTokens += c.input_tokens || 0;
    totalOutputTokens += c.output_tokens || 0;
  }

  const avgInputPerPost = totalPosts > 0 ? Math.round(totalInputTokens / totalPosts) : 0;
  const avgOutputPerPost = totalPosts > 0 ? Math.round(totalOutputTokens / totalPosts) : 0;
  const avgTotalTokensPerPost = avgInputPerPost + avgOutputPerPost;

  // Actual cost incurred
  const actualCost = calculateCost({
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
  });

  // Cost per 1,000 posts calculation (PRD Section 10)
  const costPerThousandInputUSD = (avgInputPerPost * 1000 / 1_000_000) * env.priceInPerM;
  const costPerThousandOutputUSD = (avgOutputPerPost * 1000 / 1_000_000) * env.priceOutPerM;
  const costPerThousandTotalUSD = costPerThousandInputUSD + costPerThousandOutputUSD;
  const costPerThousandINR = costPerThousandTotalUSD * 86.0; // ₹86 per USD exchange rate

  console.log(`\n========================================================`);
  console.log(`[LLM TOKEN USAGE & COST AUDIT REPORT]`);
  console.log(`========================================================`);
  console.log(`Model:                      ${calls[0]?.model || env.geminiModel}`);
  console.log(`Total API Batches:          ${totalCalls.toLocaleString()}`);
  console.log(`Total Posts Tagged:         ${totalPosts.toLocaleString()}`);
  console.log(`--------------------------------------------------------`);
  console.log(`Total Input Tokens:         ${totalInputTokens.toLocaleString()}`);
  console.log(`Total Output Tokens:        ${totalOutputTokens.toLocaleString()}`);
  console.log(`Total Cumulative Tokens:    ${(totalInputTokens + totalOutputTokens).toLocaleString()}`);
  console.log(`--------------------------------------------------------`);
  console.log(`Avg Input Tokens / Post:    ${avgInputPerPost} tokens`);
  console.log(`Avg Output Tokens / Post:   ${avgOutputPerPost} tokens`);
  console.log(`Avg Total Tokens / Post:    ${avgTotalTokensPerPost} tokens`);
  console.log(`--------------------------------------------------------`);
  console.log(`Pricing Rates Configured:`);
  console.log(` - Input Tokens:            $${env.priceInPerM} / 1M tokens`);
  console.log(` - Output Tokens:           $${env.priceOutPerM} / 1M tokens`);
  console.log(`--------------------------------------------------------`);
  console.log(`Total Expenditure Incurred: $${actualCost.totalCostUSD.toFixed(6)} USD`);
  console.log(`--------------------------------------------------------`);
  console.log(`⚡ COST PER 1,000 POSTS:     $${costPerThousandTotalUSD.toFixed(4)} USD (₹${costPerThousandINR.toFixed(2)} INR)`);
  console.log(`========================================================\n`);
}

runCostAudit().catch(err => {
  console.error('[COST FATAL]', err);
  process.exit(1);
});
