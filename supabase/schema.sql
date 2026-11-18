-- Supabase Schema for Fresher Jobs India
-- PRD Section 7

create extension if not exists pg_trgm;

create table if not exists posts (
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

create index if not exists posts_fts_idx on posts using gin(fts);
create index if not exists posts_title_trgm on posts using gin(title gin_trgm_ops);
create index if not exists posts_filter_idx on posts(role, city, is_active);

create table if not exists pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz default now(),
  finished_at timestamptz,
  fetched int,
  after_prefilter int,
  duplicates_removed int,
  tagged int,
  active_total int,
  per_source jsonb,
  errors jsonb
);

create table if not exists llm_calls (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references pipeline_runs(id),
  model text,
  posts_in_batch int,
  input_tokens int,
  output_tokens int,
  created_at timestamptz default now()
);

create table if not exists hand_check (
  post_id uuid primary key references posts(id),
  true_role text,
  true_city text,
  role_correct boolean,
  city_correct boolean
);

alter table posts enable row level security;

-- Drop policy if exists to allow rerunning schema migrations safely
drop policy if exists "public read active" on posts;
create policy "public read active" on posts for select using (is_active = true and is_fresher = true and duplicate_of is null);
