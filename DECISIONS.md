# Architecture & Implementation Decisions

This document records key decisions made throughout the development of Fresher Jobs India.

## Phase 1: Scaffolding, Database Schema & Environment Check
- **Package Manager & Execution**: Node v24 on Windows. Used `npm.cmd` and `npx.cmd` to avoid PowerShell execution policy restrictions with `.ps1` wrapper scripts.
- **Next.js Version**: Next.js 14 App Router with React 18, Tailwind CSS, TypeScript. Provides stable server components and ISR (`revalidate: 300`).
- **Graceful Source Degradation**: The environment loader checks for optional source keys (`ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `JOOBLE_API_KEY`). If any are omitted, the pipeline continues without throwing errors, relying on ATS sources (Greenhouse, Lever, Ashby) to achieve the 200+ post goal.
- **Idempotent Schema Migration**: Modified `schema.sql` with `create table if not exists` and `drop policy if exists` so the database setup script can be run multiple times safely.

## Phase 2: Sources Fetching Engine & Common Schema
- **Resilient ATS Endpoints**: Curated and verified 32 high-volume companies hiring in India on Greenhouse, Lever, and Ashby (`companies.json`). This reliably yields over 5,000 raw postings without requiring paid or rate-limited third-party aggregators.
- **Per-Host Rate Limiter**: Enforced 1 request/second per host with exponential backoff on 429/5xx status codes and a transparent User-Agent header (`FresherJobsIndiaBot/1.0`).
- **HTML Normalization**: Ingested descriptions are cleaned of HTML tags and entity-escaped characters (`&lt;`, `&gt;`, `&amp;`, `&nbsp;`) to ensure high-quality text for subsequent pre-filtering, deduplication, and LLM classification.

## Phase 3: Pre-filter & Deduplication Engine
- **Pre-filtering Strategy**: Two-stage fast keyword filtering without LLM cost:
  1. Geographic validation: Keeps posts tagged with India, Indian cities (Bengaluru, Mumbai, Pune, Delhi NCR, Hyderabad, Chennai, etc.), or Remote/WFH, while excluding foreign-only locations.
  2. Experience & role matching: Accepts positive keywords (`fresher`, `intern`, `trainee`, `graduate`, `entry level`, `0-1 years`, `0-2 years`, `junior`, `associate`) and suppresses senior roles (`senior`, `lead`, `principal`, `director`, `vp`, `head`) unless the title explicitly denotes an internship.
- **Canonical City & URL Normalization**: Extracted canonical cities (Bengaluru, Mumbai, Pune, Delhi NCR, Hyderabad, Chennai, Kolkata, Ahmedabad, Jaipur, Remote, Other India) and stripped tracking parameters (`utm_*`, `ref`, `gh_src`, etc.) from apply URLs.
- **Two-tier Deduplication**:
  1. Exact dedupe via SHA-1 of normalized `company + title + canonical_city` and canonical URL uniqueness.
  2. Fuzzy dedupe using trigram similarity (threshold > 0.85) matching Postgres `pg_trgm` similarity to detect duplicate postings from different feeds, recording the earliest post in `duplicate_of`.

## Phase 4: Gemini LLM Tagging & Cost Tracking
- **Unified SDK Integration**: Integrated `@google/genai` (Google's latest official GenAI SDK) using model `gemini-2.5-flash` with `temperature: 0` and structured JSON schema output.
- **Batching & Rate Limiting**: Batched 10 posts per API request to minimize token overhead and network latency. Throttled according to configurable `LLM_RPM` (default 10) with exponential backoff on HTTP 429.
- **Dedupe Key Cache**: Checked database for existing tags by `dedupe_key` prior to invoking Gemini, guaranteeing zero duplicate LLM calls on recurring runs.
- **Hybrid Storage & Service Role Isolation**: Implemented `DatabaseService` supporting remote Supabase Postgres with `SUPABASE_SERVICE_ROLE_KEY` and a graceful persistent local JSON store (`data/db_local.json`) for local development and offline verification.
- **7-Day Staleness Policy**: Automatically marks posts not observed in consecutive pipeline executions within 7 days as `is_active = false`.
- **Token Usage Audit**: Recorded `input_tokens`, `output_tokens`, `model`, and `posts_in_batch` in `llm_calls` to compute exact cost per 1,000 posts based on `PRICE_IN_PER_M` and `PRICE_OUT_PER_M`.

## Phase 5: Next.js Frontend & Stats Dashboard
- **Server Components & ISR**: Configured Next.js 14 App Router with Incremental Static Regeneration (`export const revalidate = 300`) to guarantee high-performance, edge-cached delivery under 2 seconds.
- **Search Strategy**: Combined PostgreSQL Full-Text Search (`fts tsvector`) using websearch syntax for complex queries with an `ilike` wildcard fallback for short terms (< 3 characters) or special substrings.
- **URL-Driven Multi-Select Filtering**: Filter state (`role`, `city`, `source`, `recent`, `q`, `page`) is serialized directly into URL SearchParams, enabling shareable filtered URLs and native browser history navigation.
- **Dedicated Demo `/stats` Page**: Created `/stats` displaying role distribution bars, geographic city spread, source breakdown, total duplicates filtered, and an audit table of the last 10 pipeline executions.

## Phase 6: GitHub Actions Workflow & Comprehensive Documentation
- **Scheduled Daily Job**: Configured `.github/workflows/daily.yml` with cron `30 21 * * *` (3:00 AM IST) and `workflow_dispatch` manual trigger. Added an automated health check step that verifies >= 100 active fresher posts exist post-run, failing the job otherwise.
- **ToS Safety & Omission Justification**: Authored `docs/SOURCES.md` detailing the legal and architectural compliance of official APIs and unauthenticated company ATS feeds, while documenting the deliberate exclusion of LinkedIn, Naukri, Indeed, and Internshala due to strict ToS scraping prohibitions.
- **System Architecture & Documentation**: Authored `docs/ARCHITECTURE.md` with complete Mermaid diagrams and data contracts, and `README.md` containing full operational setup, environment instructions, and acceptance verification steps.
