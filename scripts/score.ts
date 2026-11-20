// Scoring script for evaluating hand-checked tagging accuracy
// PRD Section 10: npm run score
// Reads directly from the hand_check database table (with CSV fallback)

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { env } from '../pipeline/env';

interface HandCheckRow {
  id: string;
  title: string;
  company: string;
  location_raw: string;
  description_snippet?: string;
  llm_role: string;
  llm_city: string;
  true_role: string;
  true_city: string;
  role_correct?: boolean;
  city_correct?: boolean;
}

// RFC 4180 compliant CSV line parser for fallback
function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
  }
  result.push(cur.trim());
  return result;
}

async function loadRowsFromDB(): Promise<{ rows: HandCheckRow[]; source: string }> {
  if (env.supabaseUrl && (env.supabaseServiceRoleKey || env.supabaseAnonKey)) {
    try {
      const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey || env.supabaseAnonKey!);
      const { data, error } = await supabase
        .from('hand_check')
        .select('post_id, true_role, true_city, role_correct, city_correct, posts(title, company, location_raw, role, city, description)');

      if (!error && data && data.length > 0) {
        const rows: HandCheckRow[] = data.map((item: any) => ({
          id: item.post_id,
          title: item.posts?.title || 'Unknown Title',
          company: item.posts?.company || 'Unknown Company',
          location_raw: item.posts?.location_raw || '',
          description_snippet: (item.posts?.description || '').slice(0, 150),
          llm_role: item.posts?.role || 'Other',
          llm_city: item.posts?.city || 'Other India',
          true_role: item.true_role || item.posts?.role || 'Other',
          true_city: item.true_city || item.posts?.city || 'Other India',
          role_correct: item.role_correct,
          city_correct: item.city_correct,
        }));
        return { rows, source: `Supabase hand_check table (${rows.length} rows)` };
      }
    } catch (err: any) {
      console.warn('[SCORE] Warning: Failed to query Supabase hand_check table:', err.message);
    }
  }

  // Fallback: local CSV
  const samplePath = path.resolve(process.cwd(), 'data/handcheck_sample.csv');
  if (fs.existsSync(samplePath)) {
    const raw = fs.readFileSync(samplePath, 'utf-8');
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const rows: HandCheckRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      if (values.length < 9) continue;
      rows.push({
        id: values[0],
        title: values[1],
        company: values[2],
        location_raw: values[3],
        description_snippet: values[4],
        llm_role: values[5],
        llm_city: values[6],
        true_role: values[7],
        true_city: values[8],
      });
    }
    return { rows, source: `data/handcheck_sample.csv (${rows.length} rows)` };
  }

  return { rows: [], source: 'None' };
}

async function scoreHandCheck() {
  const { rows, source } = await loadRowsFromDB();

  if (rows.length === 0) {
    console.error('[SCORE] No hand_check records found in database or CSV.');
    process.exit(1);
  }

  console.log(`\n========================================================`);
  console.log(`[TAGGING ACCURACY SCORECARD]`);
  console.log(`Evaluating ${rows.length} hand-checked posts from: ${source}`);
  console.log(`========================================================\n`);

  let roleCorrectCount = 0;
  let cityCorrectCount = 0;
  let bothCorrectCount = 0;

  interface Mistake {
    id: string;
    title: string;
    company: string;
    locationRaw: string;
    llmRole: string;
    trueRole: string;
    roleMatch: boolean;
    llmCity: string;
    trueCity: string;
    cityMatch: boolean;
  }

  const mistakes: Mistake[] = [];

  for (const row of rows) {
    // If role_correct / city_correct boolean is explicitly provided from hand_check table, respect it
    const roleMatch =
      typeof row.role_correct === 'boolean'
        ? row.role_correct
        : row.llm_role.trim().toLowerCase() === row.true_role.trim().toLowerCase();

    const cityMatch =
      typeof row.city_correct === 'boolean'
        ? row.city_correct
        : row.llm_city.trim().toLowerCase() === row.true_city.trim().toLowerCase();

    if (roleMatch) roleCorrectCount++;
    if (cityMatch) cityCorrectCount++;
    if (roleMatch && cityMatch) bothCorrectCount++;

    if (!roleMatch || !cityMatch) {
      mistakes.push({
        id: row.id,
        title: row.title,
        company: row.company,
        locationRaw: row.location_raw,
        llmRole: row.llm_role,
        trueRole: row.true_role,
        roleMatch,
        llmCity: row.llm_city,
        trueCity: row.true_city,
        cityMatch,
      });
    }
  }

  const total = rows.length;
  const roleAccuracy = total > 0 ? ((roleCorrectCount / total) * 100).toFixed(1) : '0';
  const cityAccuracy = total > 0 ? ((cityCorrectCount / total) * 100).toFixed(1) : '0';
  const overallAccuracy = total > 0 ? ((bothCorrectCount / total) * 100).toFixed(1) : '0';

  console.log(`Total Hand-Checked Posts: ${total}`);
  console.log(`--------------------------------------------------------`);
  console.log(`✓ Role Tagging Accuracy:       ${roleCorrectCount}/${total} (${roleAccuracy}%)`);
  console.log(`✓ City Tagging Accuracy:       ${cityCorrectCount}/${total} (${cityAccuracy}%)`);
  console.log(`✓ Overall Accuracy (Both):     ${bothCorrectCount}/${total} (${overallAccuracy}%)`);
  console.log(`--------------------------------------------------------\n`);

  if (mistakes.length > 0) {
    console.log(`Mistakes & Confusion Breakdown (${mistakes.length} occurrences):`);
    console.log(`--------------------------------------------------------`);
    mistakes.forEach((m, idx) => {
      console.log(`[${idx + 1}] "${m.title}" at ${m.company} (Location: ${m.locationRaw})`);
      if (!m.roleMatch) {
        console.log(`    ❌ Role Error: LLM predicted "${m.llmRole}" -> True Role "${m.trueRole}"`);
      }
      if (!m.cityMatch) {
        console.log(`    ❌ City Error: LLM predicted "${m.llmCity}" -> True City "${m.trueCity}"`);
      }
    });
  } else {
    console.log('🎉 100% Match! Zero classification discrepancies found between LLM tags and ground truth.');
  }
  console.log(`\n========================================================\n`);
}

scoreHandCheck().catch((err) => {
  console.error('[SCORE FATAL]', err);
  process.exit(1);
});
