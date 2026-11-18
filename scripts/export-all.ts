// Export all active posts to data/posts.csv
// PRD Section 10: npm run export:all

import fs from 'fs';
import path from 'path';
import { db } from '../pipeline/db';

function escapeCsvField(field: any): string {
  if (field === null || field === undefined) return '';
  const str = String(field).replace(/"/g, '""').replace(/\r?\n/g, ' ').trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str}"`;
  }
  return str;
}

async function exportAll() {
  console.log('[EXPORT:ALL] Fetching all active posts from database...');
  const posts = await db.getAllActivePosts();

  console.log(`[EXPORT:ALL] Found ${posts.length} active posts to export.`);

  const headers = [
    'id',
    'dedupe_key',
    'title',
    'company',
    'city',
    'role',
    'is_fresher',
    'tag_confidence',
    'source',
    'apply_url',
    'posted_at',
    'location_raw',
  ];

  const rows: string[] = [headers.join(',')];

  for (const post of posts) {
    const row = [
      escapeCsvField(post.id || post.dedupe_key),
      escapeCsvField(post.dedupe_key),
      escapeCsvField(post.title),
      escapeCsvField(post.company),
      escapeCsvField(post.city || 'Other India'),
      escapeCsvField(post.role || 'Other'),
      escapeCsvField(post.is_fresher !== undefined ? post.is_fresher : true),
      escapeCsvField(post.tag_confidence !== null && post.tag_confidence !== undefined ? post.tag_confidence : 0.85),
      escapeCsvField(post.source),
      escapeCsvField(post.apply_url),
      escapeCsvField(post.posted_at || ''),
      escapeCsvField(post.location_raw || ''),
    ];
    rows.push(row.join(','));
  }

  const outDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.resolve(outDir, 'posts.csv');
  fs.writeFileSync(outFile, rows.join('\n'), 'utf-8');

  console.log(`[EXPORT:ALL] Successfully dumped ${posts.length} posts to:`);
  console.log(` -> ${outFile}`);
}

exportAll().catch(err => {
  console.error('[EXPORT:ALL FATAL]', err);
  process.exit(1);
});
