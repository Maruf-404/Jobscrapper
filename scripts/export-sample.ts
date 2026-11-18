// Export 50 reproducible random active posts for hand-check evaluation
// PRD Section 10: npm run export:sample

import fs from 'fs';
import path from 'path';
import { db } from '../pipeline/db';

// Mulberry32 seeded pseudo-random number generator for reproducible sampling
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function escapeCsvField(field: any): string {
  if (field === null || field === undefined) return '';
  const str = String(field).replace(/"/g, '""').replace(/\r?\n/g, ' ').trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str}"`;
  }
  return str;
}

async function exportSample() {
  console.log('[EXPORT:SAMPLE] Fetching active posts for hand-check sampling...');
  const posts = await db.getAllActivePosts();

  if (posts.length === 0) {
    console.warn('[EXPORT:SAMPLE] No active posts found in database. Run "npm run pipeline" first to ingest posts.');
    return;
  }

  console.log(`[EXPORT:SAMPLE] Found ${posts.length} active posts. Selecting 50 reproducible samples (Seed: 42)...`);

  // Sort deterministically before sampling
  const sorted = [...posts].sort((a, b) => a.dedupe_key.localeCompare(b.dedupe_key));

  const rng = mulberry32(42);
  const sampleSize = Math.min(50, sorted.length);

  // Fisher-Yates partial shuffle
  for (let i = 0; i < sampleSize; i++) {
    const j = i + Math.floor(rng() * (sorted.length - i));
    const temp = sorted[i];
    sorted[i] = sorted[j];
    sorted[j] = temp;
  }

  const sample = sorted.slice(0, sampleSize);

  // Required columns: id, title, company, location_raw, description_snippet, llm_role, llm_city, true_role, true_city
  const headers = [
    'id',
    'title',
    'company',
    'location_raw',
    'description_snippet',
    'llm_role',
    'llm_city',
    'true_role',
    'true_city',
  ];

  const rows = [headers.join(',')];

  for (const post of sample) {
    const snippet = (post.description || '')
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 300);

    const row = [
      escapeCsvField(post.id || post.dedupe_key),
      escapeCsvField(post.title),
      escapeCsvField(post.company),
      escapeCsvField(post.location_raw),
      escapeCsvField(snippet),
      escapeCsvField(post.role || 'Other'),
      escapeCsvField(post.city || 'Other India'),
      escapeCsvField(post.role || 'Other'), // pre-fill baseline for convenience
      escapeCsvField(post.city || 'Other India'),
    ];
    rows.push(row.join(','));
  }

  const outDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.resolve(outDir, 'handcheck_sample.csv');
  fs.writeFileSync(outFile, rows.join('\n'), 'utf-8');

  console.log(`[EXPORT:SAMPLE] Successfully exported ${sample.length} sample posts to:`);
  console.log(` -> ${outFile}`);
  console.log('Fill or adjust true_role and true_city in the CSV, then run "npm run score" to compute accuracy metrics.');
}

exportSample().catch(err => {
  console.error('[EXPORT:SAMPLE FATAL]', err);
  process.exit(1);
});
