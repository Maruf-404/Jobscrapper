# Fresher Jobs India

A high-performance automated pipeline and web portal that collects **200+ verified fresher and internship job postings in India** from public, ToS-safe sources, deduplicates them with exact and fuzzy matching, categorizes them using Gemini Flash, and displays them on a fast, searchable Next.js application refreshed daily.

---

## Features

- **200+ Real Indian Fresher Positions**: Sourced strictly from ToS-safe developer APIs and public startup ATS endpoints (Greenhouse, Lever, Ashby).
- **Two-Tier Deduplication**:
  - Exact dedupe on canonical apply URLs and SHA-1 hashes of normalized `company + title + canonical_city`.
  - Fuzzy trigram similarity (> 0.85) matching PostgreSQL `pg_trgm` to eliminate cross-source duplicates.
- **Intelligent Classification with Gemini Flash**:
  - Tags each post into 13 fixed role taxonomies and 11 canonical Indian cities using `@google/genai` (`gemini-2.5-flash`).
  - Cached by `dedupe_key` to guarantee zero retagging cost on subsequent runs.
- **Fast Next.js 14 Frontend**:
  - Full-text Postgres search (`fts tsvector`) with fallback to `ilike`.
  - Multi-select filtering for Role, City, Source, and "Posted in last 7 days".
  - Dedicated `/stats` page displaying live breakdown charts, deduplication metrics, and execution logs.
  - Edge ISR cached (`revalidate = 300`) with first-load page speeds under 2 seconds.
- **Daily Automated Refresh**: Scheduled GitHub Action cron at 3:00 AM IST (`30 21 * * *`) that ingests new posts and deactivates postings unseen for 7+ days.
- **Auditing & Evaluation CLI**: Built-in CLI scripts for reproducible 50-post sample extraction, tagging accuracy scoring, and cost per 1,000 posts estimation.

---

## Project Structure

```text
├── app/                  # Next.js 14 App Router web platform
│   ├── components/       # Header, SearchAndFilters, PostCard, Pagination
│   ├── stats/            # Analytics dashboard (/stats)
│   ├── globals.css       # Tailwind CSS styles
│   ├── layout.tsx        # Shell layout with IST metrics
│   └── page.tsx          # Main job feed with ISR (revalidate 300)
├── pipeline/             # Ingestion & data pipeline
│   ├── sources/          # Adzuna, Jooble, Greenhouse, Lever, Ashby, companies.json
│   ├── dedupe.ts         # Exact SHA-1 and fuzzy trigram deduplication
│   ├── prefilter.ts      # Fast keyword & location pre-filter
│   ├── tag.ts            # Batched Gemini LLM classifier with rate limiter
│   ├── prompts.ts        # System and user prompts with fixed taxonomy
│   ├── pricing.ts        # Token usage and pricing calculator
│   ├── db.ts             # Supabase service role client & local store fallback
│   ├── env.ts            # Environment loader & validator
│   └── run.ts            # Main pipeline orchestrator
├── scripts/              # Accuracy, evaluation, and cost tooling
│   ├── export-sample.ts  # Reproducible 50-post sample export for hand-check
│   ├── score.ts          # Accuracy scorer & confusion matrix printer
│   ├── cost.ts           # Token usage & cost per 1,000 posts calculator
│   └── export-all.ts     # Full database export to data/posts.csv
├── supabase/
│   └── schema.sql        # Supabase schema with pg_trgm, fts tsvector, RLS
├── docs/
│   ├── PROMPTS.md        # Exact LLM prompts and taxonomy rules
│   ├── ARCHITECTURE.md   # Architectural data flow and component layout
│   └── SOURCES.md        # ToS compliance & rationale for omitted portals
├── .github/workflows/
│   └── daily.yml         # Daily GitHub Actions cron (3:00 AM IST)
├── DECISIONS.md          # Implementation choices and architecture rationale
├── BROKE_AND_FIXED.md    # Issues encountered and resolutions
├── .env.example          # Environment variables template
└── README.md
```

---

## Getting Started

### 1. Prerequisites
- Node.js 20+ (tested on Node v20 and v24)
- npm or pnpm
- Supabase account (or use built-in local development database store)
- Google Gemini API key

### 2. Installation
```bash
git clone <repo-url>
cd fresher-jobs-india
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your API keys in `.env.local`:
```env
# Gemini API
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Optional Source APIs (Pipeline skips missing keys gracefully)
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
JOOBLE_API_KEY=

# LLM Pricing & Rate Limits
PRICE_IN_PER_M=0.075
PRICE_OUT_PER_M=0.30
LLM_RPM=10
```

> **Note on API Keys**: If `ADZUNA_APP_ID` or `JOOBLE_API_KEY` are omitted, the pipeline continues without error, fetching from over 35 verified public ATS companies (Greenhouse, Lever, Ashby) to achieve the 200+ post requirement.

### 4. Database Setup
1. In your Supabase dashboard, open the **SQL Editor**.
2. Paste and run the contents of [`supabase/schema.sql`](supabase/schema.sql).
3. Tables `posts`, `pipeline_runs`, `llm_calls`, `hand_check`, indices, and RLS policies will be created.

---

## Running the Application

### 1. Execute the Pipeline
Fetch all sources, pre-filter, deduplicate, tag with Gemini, and upsert to Supabase:
```bash
npm run pipeline
```

### 2. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the job feed, or [http://localhost:3000/stats](http://localhost:3000/stats) for the analytics dashboard.

### 3. Build for Production
```bash
npm run build
npm run start
```

---

## Evaluation & Cost Tooling

### Export 50-Post Reproducible Sample for Hand-Check
Extracts a seeded 50-post sample into `data/handcheck_sample.csv`:
```bash
npm run export:sample
```

### Score Tagging Accuracy
Computes role and city accuracy against ground truth:
```bash
npm run score
```

### Cost & Token Audit
Computes average tokens per post and estimated cost per 1,000 posts from `llm_calls`:
```bash
npm run cost
```

### Export All Active Posts
Dumps all active posts to `data/posts.csv`:
```bash
npm run export:all
```

---

## Daily Refresh via GitHub Actions

The scheduled pipeline is configured in [`.github/workflows/daily.yml`](.github/workflows/daily.yml):
- **Schedule**: `30 21 * * *` (3:00 AM IST daily).
- **Manual Trigger**: Can also be executed manually on demand via GitHub's `workflow_dispatch`.
- **Integrity Check**: Fails the job if fewer than 100 active fresher posts remain after execution.

---

## Acceptance Criteria Checklist

- [x] `npm run pipeline` ends with 200+ active, deduped, tagged posts
- [x] A second run adds no duplicates and does not retag existing posts (cached by `dedupe_key`)
- [x] Search, role filter, and city filter work together with URL synchronization
- [x] GitHub Actions cron (`30 21 * * *`) + manual trigger configured
- [x] One source failing does not break the run (isolated error boundaries)
- [x] `export:sample`, `score`, `cost`, and `export:all` tooling present and functional
- [x] No secrets committed; `.env.example` present
- [x] Production build passes with ISR under 2 seconds load time
- [x] Dedicated `/stats` page displaying breakdowns and run logs for the demo video
