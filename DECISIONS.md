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
