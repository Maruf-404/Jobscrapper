# PRD: Fresher Jobs India (Beep take-home)

You are building this end to end. Follow the phases in order. Do not ask questions; where something is ambiguous, pick the simplest option and note it in `DECISIONS.md`. Commit after each phase.

## 1. Goal
A live web tool that:
1. Collects **200+ real fresher/internship posts in India** from public, ToS-safe sources
2. Removes duplicates
3. Uses an LLM (Gemini Flash) to tag each post by **role** and **city**
4. Shows them on a **searchable, filterable page**
5. **Refreshes automatically every day**

Also measurable: tagging accuracy (hand-checked on 50 posts) and cost per 1,000 posts. Build the logging and export needed for both.

## 2. Stack (fixed)
- Next.js 14+ (App Router, TypeScript, Tailwind) on Vercel
- Supabase Postgres (+ `pg_trgm`, full-text search)
- Pipeline: TypeScript scripts in `/pipeline`, run with `tsx`
- Daily run: GitHub Actions cron (not Vercel Cron)
- LLM: Gemini via `@google/genai`, model from env `GEMINI_MODEL`

## 3. Env vars (read from `.env.local` and GitHub Actions secrets; never hardcode)
```
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
JOOBLE_API_KEY=
```
Create `.env.example` with these keys. If a source key is missing, skip that source and log it; do not crash.

## 4. Sources (respect ToS)
Use only these. Do NOT scrape LinkedIn, Naukri, Indeed or Internshala.
1. **Adzuna API** (country `in`): queries like "fresher", "intern", "graduate trainee", "entry level", across multiple pages and categories
2. **Jooble API** (India): same queries
3. **Public ATS JSON endpoints** for Indian startups: Greenhouse (`boards-api.greenhouse.io/v1/boards/{slug}/jobs`), Lever (`api.lever.co/v0/postings/{slug}?mode=json`), Ashby public job board API. Keep slugs in `pipeline/sources/companies.json` (start with 30+ Indian-hiring companies; the agent should verify each slug returns data and drop dead ones)

Rules: send a descriptive User-Agent, max 1 request/sec per host, retry with backoff, store `source` and `source_url` for every post. Each source is its own module returning the common schema, so one failing source never stops the run.

Common schema: `title, company, location_raw, description, apply_url, source, source_id, posted_at`.

## 5. Pipeline (`pipeline/run.ts`)
1. **Fetch** all sources in parallel, normalize to the common schema
2. **Pre-filter (cheap, no LLM):** keep posts in India; keep fresher-like posts by keyword (fresher, intern, internship, trainee, graduate, entry level, 0-1 years, 0-2 years) or experience max <= 1 year. Log counts dropped.
3. **Dedupe**
   - Exact: `dedupe_key = sha1(normalize(company) + normalize(title) + normalize(city))`; also dedupe on canonical `apply_url` (strip tracking params)
   - Fuzzy: same normalized company and title `similarity() > 0.85` (pg_trgm) = duplicate; keep the earliest, record `duplicate_of`
   - Log duplicates removed per source
4. **Tag with LLM** only posts with no tags yet (cache by `dedupe_key`, never retag). Batch 10 posts per request, JSON-schema structured output, temperature 0. Retry on 429 with backoff; respect free-tier limits (configurable `LLM_RPM`, default 10).
5. **Upsert** into Supabase. Mark posts not seen in the last 7 days as `is_active=false`.
6. **Log the run** in `pipeline_runs`.

Target: at least 200 active posts after dedupe. If under 200, widen queries and add more ATS companies, and say so in the log.

## 6. LLM tagging
Per post return JSON:
```json
{"id": "...", "role": "<one of taxonomy>", "city": "<one of city list>", "is_fresher": true, "confidence": 0.0}
```
**Role taxonomy (fixed):** Software Engineering, Data & Analytics, AI/ML, Product, Design/UX, Marketing, Sales & Business Development, Content & Writing, Operations, Finance & Accounting, HR & Recruitment, Customer Support, Other.

**City list (fixed):** Bengaluru, Mumbai, Pune, Delhi NCR, Hyderabad, Chennai, Kolkata, Ahmedabad, Jaipur, Remote, Other India. Map variants (Bangalore, Gurgaon, Noida, Navi Mumbai etc.) to the canonical value. Keep `location_raw` untouched.

Prompt rules: only use the given taxonomy; judge role from title first, description second; if multiple cities pick the first; if "Remote/WFH" pick Remote; if unsure use Other with low confidence. Store the exact prompt text in `pipeline/prompts.ts` and also copy it into `docs/PROMPTS.md` (needed for submission).

Drop posts where `is_fresher=false` from the public page (keep in DB).

**Cost tracking:** for every LLM call, save `input_tokens`, `output_tokens`, `model`, `posts_in_batch` into `llm_calls`. Pricing constants in `pipeline/pricing.ts` (read from env `PRICE_IN_PER_M` and `PRICE_OUT_PER_M`, since the free tier hides real cost; compute at paid rates).

## 7. Database (Supabase SQL, put in `supabase/schema.sql`)
```sql
create extension if not exists pg_trgm;

create table posts (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text unique not null,
  title text not null,
  company text not null,
  location_raw text,
  description text,
  apply_url text not null,
  source text not null,
  source_id text,
  posted_at timestamptz,
  role text,
  city text,
  is_fresher boolean,
  tag_confidence real,
  duplicate_of uuid references posts(id),
  is_active boolean default true,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  fts tsvector generated always as (
    to_tsvector('english', coalesce(title,'')||' '||coalesce(company,'')||' '||coalesce(description,''))
  ) stored
);
create index posts_fts_idx on posts using gin(fts);
create index posts_title_trgm on posts using gin(title gin_trgm_ops);
create index posts_filter_idx on posts(role, city, is_active);

create table pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz default now(),
  finished_at timestamptz,
  fetched int, after_prefilter int, duplicates_removed int,
  tagged int, active_total int,
  per_source jsonb, errors jsonb
);

create table llm_calls (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references pipeline_runs(id),
  model text, posts_in_batch int,
  input_tokens int, output_tokens int,
  created_at timestamptz default now()
);

create table hand_check (
  post_id uuid primary key references posts(id),
  true_role text, true_city text,
  role_correct boolean, city_correct boolean
);

alter table posts enable row level security;
create policy "public read active" on posts for select using (is_active = true and is_fresher = true and duplicate_of is null);
```
Writes happen only from the pipeline with the service role key. The frontend uses the anon key (read-only via RLS).

## 8. Frontend
Single page `/` (server components, ISR revalidate 300s):
- Search box (Postgres full-text on title, company, description; fall back to `ilike` for short queries)
- Filters: role (multi), city (multi), source, "posted in last 7 days"
- Post card: title, company, city badge, role badge, source, posted date, "Apply" button (opens `apply_url` in a new tab, `rel="noopener noreferrer"`)
- Pagination (24 per page) or infinite scroll
- Header: total active posts count and "Last updated {time IST}" from latest `pipeline_runs`
- Empty state, loading state, mobile-first, clean and fast
- `/stats` page: posts per role, per city, per source, duplicates removed, last 10 runs (this is for the demo video)

## 9. Daily refresh
`.github/workflows/daily.yml`: cron `30 21 * * *` (3:00 AM IST) plus `workflow_dispatch`. Steps: checkout, setup Node 20, `npm ci`, `npm run pipeline`. Secrets from GitHub Actions. Fail the job if fewer than 100 active posts remain after the run.

## 10. Accuracy and cost tooling
- `npm run export:sample` : picks 50 random active posts (seeded, reproducible) and writes `data/handcheck_sample.csv` with columns: `id, title, company, location_raw, description_snippet, llm_role, llm_city, true_role, true_city`
- `npm run score` : reads the filled CSV, prints role accuracy, city accuracy, and a confusion list of mistakes
- `npm run cost` : from `llm_calls`, prints avg tokens per post and **cost per 1,000 posts**
- `npm run export:all` : dumps all posts to `data/posts.csv` (for the submission sheet)

## 11. Repo and docs
```
/app            Next.js app
/pipeline       sources/, dedupe.ts, tag.ts, prompts.ts, pricing.ts, run.ts
/scripts        export/score/cost
/supabase       schema.sql
/docs           PROMPTS.md, ARCHITECTURE.md, SOURCES.md
README.md       setup, env, how to run, how the daily job works
DECISIONS.md    choices made and why
BROKE_AND_FIXED.md   append an entry every time something breaks (symptom, cause, fix). Needed for the demo video.
```
`SOURCES.md` lists each source, why it is ToS-safe, and which sites were deliberately skipped.

## 12. Acceptance criteria
- [ ] `npm run pipeline` ends with 200+ active, deduped, tagged posts
- [ ] A second run adds no duplicates and does not retag existing posts
- [ ] Search, role filter and city filter work together
- [ ] GitHub Actions cron + manual trigger work
- [ ] One source failing does not break the run
- [ ] `export:sample`, `score`, `cost` all run
- [ ] No secrets committed; `.env.example` present
- [ ] Deployed on Vercel and loads in under 2 seconds

## 13. Build order
1. Scaffold + schema + env check
2. Sources (Adzuna first, then Jooble, then ATS) + common schema
3. Pre-filter + dedupe
4. LLM tagging + cost logging
5. Frontend + `/stats`
6. GitHub Actions + README + docs
7. Export/score/cost scripts

Report at the end: post count, duplicates removed, tokens per post, and anything left undone.
