# Sources & ToS Compliance

This document explains the data acquisition architecture of Fresher Jobs India, detailing why every ingested source is strictly compliant with Terms of Service (ToS) and why specific job aggregators and portals were intentionally omitted.

---

## 1. Allowed & Ingested Sources

All data collected by Fresher Jobs India comes exclusively from documented public APIs and openly exposed ATS (Applicant Tracking System) REST endpoints provided by employers for the purpose of job discovery.

### A. Adzuna Job Search API
- **Endpoint**: `https://api.adzuna.com/v1/api/jobs/in/search`
- **Why ToS-Safe**: Ingested via Adzuna's official registered Developer API program. Adzuna explicitly permits developers and aggregators to query and display their job indexes under developer terms of use.
- **Filtering**: Targeted query parameters (`country: in`, keywords: `fresher`, `intern`, `graduate trainee`, `entry level`).

### B. Jooble Job Search API
- **Endpoint**: `https://jooble.org/api/`
- **Why ToS-Safe**: Queried via Jooble's official partner REST API using a provisioned API key. Jooble's terms expressly authorize programmatic access through this partner gateway.
- **Filtering**: JSON queries targeting India (`location: "India"`) and fresher keywords.

### C. Public ATS JSON Endpoints (Greenhouse, Lever, Ashby)
Modern tech startups and corporations publish unauthenticated public JSON endpoints for their career boards to power external career pages, widgets, and job aggregators:
1. **Greenhouse Boards API**: `https://boards-api.greenhouse.io/v1/boards/{company}/jobs?content=true`
2. **Lever Postings API**: `https://api.lever.co/v0/postings/{company}?mode=json`
3. **Ashby Job Board API**: `https://api.ashbyhq.com/posting-api/job-board/{company}`

#### Why ATS Public Endpoints are 100% ToS-Safe:
- **Intended Public Distribution**: These APIs are purpose-built by Greenhouse, Lever, and Ashby specifically to allow external distribution of job vacancies without requiring user authentication.
- **Zero Screen Scraping**: Data is delivered as structured JSON directly from the platform's API endpoints. No HTML scraping, DOM traversal, or reverse-engineering of authenticated portals is performed.
- **Descriptive Bot Identification**: All requests transmit a transparent, descriptive User-Agent header:
  `FresherJobsIndiaBot/1.0 (+https://github.com/fresher-jobs-india; contact@fresherjobsindia.internal)`
- **Strict Host Rate Limiting**: Every outgoing HTTP request passes through a centralized token/rate limiter enforcing a maximum of **1 request per second per host**, preventing any risk of server degradation.
- **Exponential Backoff**: Automatic backoff and retries are triggered on HTTP 429 and 5xx responses.

---

## 2. Deliberately Skipped Sources

In strict adherence to PRD Section 4 ("Do NOT scrape LinkedIn, Naukri, Indeed or Internshala"), the following platforms were intentionally bypassed:

| Source | Reason Skipped |
| :--- | :--- |
| **LinkedIn** | LinkedIn's User Agreement (Section 8.2) strictly forbids automated scraping, crawling, or accessing services without express written permission. It employs active anti-scraping countermeasures and IP rate gates. |
| **Naukri** | Info Edge's Terms of Use explicitly prohibit data extraction, web crawling, and automated harvesting of job candidate and job vacancy data. |
| **Indeed** | Indeed's Terms of Service specifically prohibit the use of spiders, scrapers, or other automated tools to extract listings. Indeed frequently blocks unauthenticated automated agents. |
| **Internshala** | Internshala's Terms of Service strictly forbid automated scraping, screen scraping, or extraction of internship listings. |

---

## 3. Crawl Politeness & Governance Policy

1. **User-Agent Transparency**: Identifies the bot name, URL, and contact email on every HTTP request.
2. **Frequency**: Scheduled once daily at 3:00 AM IST (21:30 UTC), generating negligible traffic on source servers.
3. **Graceful Fault Tolerance**: If any single source endpoint returns a 4xx/5xx code or if credentials are omitted, that individual source is logged and skipped without impacting other sources.
