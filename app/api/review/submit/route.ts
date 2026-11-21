import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSupabaseServiceClient } from '@/lib/supabase';

function escapeCsvField(field: any): string {
  if (field === null || field === undefined) return '';
  const str = String(field).replace(/"/g, '""').replace(/\r?\n/g, ' ').trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str}"`;
  }
  return str;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { postId, true_role, true_city, role_correct, city_correct } = body;

    if (!postId || !true_role || !true_city) {
      return NextResponse.json({ error: 'Missing required review fields' }, { status: 400 });
    }

    // 1. Upsert to Supabase hand_check table
    const supabase = getSupabaseServiceClient();
    if (supabase) {
      const { error } = await supabase.from('hand_check').upsert({
        post_id: postId,
        true_role,
        true_city,
        role_correct: Boolean(role_correct),
        city_correct: Boolean(city_correct),
      });

      if (error) {
        console.warn('[REVIEW SUBMIT] Supabase hand_check upsert error:', error.message);
      }
    }

    // 2. Sync to local CSV if present
    const csvPath = path.resolve(process.cwd(), 'data/handcheck_sample.csv');
    if (fs.existsSync(csvPath)) {
      const raw = fs.readFileSync(csvPath, 'utf-8');
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 1) {
        const updatedLines = [lines[0]];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith(postId + ',') || line.includes(`"${postId}",`)) {
            // Replace true_role and true_city
            const parts = line.split(',');
            if (parts.length >= 9) {
              parts[7] = escapeCsvField(true_role);
              parts[8] = escapeCsvField(true_city);
              updatedLines.push(parts.join(','));
              continue;
            }
          }
          updatedLines.push(line);
        }
        fs.writeFileSync(csvPath, updatedLines.join('\n'), 'utf-8');
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit review' }, { status: 500 });
  }
}
