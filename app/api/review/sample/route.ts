import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSupabaseServiceClient } from '@/lib/supabase-client';
import { db } from '@/pipeline/db';

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

export async function GET(req: NextRequest) {
  try {
    const csvPath = path.resolve(process.cwd(), 'data/handcheck_sample.csv');
    let posts: any[] = [];

    if (fs.existsSync(csvPath)) {
      const raw = fs.readFileSync(csvPath, 'utf-8');
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 1) {
        for (let i = 1; i < lines.length; i++) {
          const values = parseCsvLine(lines[i]);
          if (values.length >= 7) {
            posts.push({
              id: values[0],
              title: values[1],
              company: values[2],
              location_raw: values[3] || 'India / Remote',
              description_snippet: values[4] || '',
              llm_role: values[5] || 'Other',
              llm_city: values[6] || 'Other India',
              true_role: values[7] || values[5] || 'Other',
              true_city: values[8] || values[6] || 'Other India',
            });
          }
        }
      }
    }

    // Fallback if CSV was missing or had fewer than 50
    if (posts.length === 0) {
      const allActive = await db.getAllActivePosts();
      const sorted = [...allActive].sort((a, b) => a.dedupe_key.localeCompare(b.dedupe_key));
      function mulberry32(seed: number) {
        return function () {
          let t = (seed += 0x6d2b79f5);
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }
      const rng = mulberry32(42);
      const sampleSize = Math.min(50, sorted.length);
      for (let i = 0; i < sampleSize; i++) {
        const j = i + Math.floor(rng() * (sorted.length - i));
        const temp = sorted[i];
        sorted[i] = sorted[j];
        sorted[j] = temp;
      }
      posts = sorted.slice(0, sampleSize).map((p) => ({
        id: p.id || p.dedupe_key,
        title: p.title,
        company: p.company,
        location_raw: p.location_raw || 'India / Remote',
        description_snippet: (p.description || '').slice(0, 300),
        llm_role: p.role || 'Other',
        llm_city: p.city || 'Other India',
        true_role: p.role || 'Other',
        true_city: p.city || 'Other India',
      }));
    }

    // Query hand_check table to retrieve any answers already recorded
    const supabase = getSupabaseServiceClient();
    if (supabase) {
      const { data: checks } = await supabase.from('hand_check').select('*');
      if (checks && checks.length > 0) {
        const checkMap = new Map(checks.map((c: any) => [c.post_id, c]));
        posts = posts.map((p) => {
          const recorded = checkMap.get(p.id);
          if (recorded) {
            return {
              ...p,
              true_role: recorded.true_role,
              true_city: recorded.true_city,
              role_correct: recorded.role_correct,
              city_correct: recorded.city_correct,
              is_reviewed: true,
            };
          }
          return p;
        });
      }
    }

    return NextResponse.json({ posts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load sample posts' }, { status: 500 });
  }
}
