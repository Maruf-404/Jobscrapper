# Architecture & Implementation Decisions

This document records key decisions made throughout the development of Fresher Jobs India.

## Phase 1: Scaffolding, Database Schema & Environment Check
- **Package Manager & Execution**: Node v24 on Windows. Used `npm.cmd` and `npx.cmd` to avoid PowerShell execution policy restrictions with `.ps1` wrapper scripts.
- **Next.js Version**: Next.js 14 App Router with React 18, Tailwind CSS, TypeScript. Provides stable server components and ISR (`revalidate: 300`).
- **Graceful Source Degradation**: The environment loader checks for optional source keys (`ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `JOOBLE_API_KEY`). If any are omitted, the pipeline continues without throwing errors, relying on ATS sources (Greenhouse, Lever, Ashby) to achieve the 200+ post goal.
- **Idempotent Schema Migration**: Modified `schema.sql` with `create table if not exists` and `drop policy if exists` so the database setup script can be run multiple times safely.
