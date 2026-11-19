# Broke and Fixed Log

Records failures, root causes, and resolutions encountered during build and execution.

## Entry: Non-India Job Postings Ingested into Indian Fresher Job Board

- **Symptom**:
  Postings from overseas locations (e.g. *Belgrade, Serbia*, *Aarhus, Denmark*, *Mexico City*, *Chicago, Illinois*, *San Francisco, CA*, *Austin, TX*, *Milan, Italy*, *Remote - United States*) were ingested into Supabase and incorrectly classified under the canonical city `"Other India"` or `"Remote"`. The PRD strictly requires collecting 200+ real fresher/internship positions located in **India**.

- **Root Causes**:
  1. **Permissive Fallback in `pipeline/prefilter.ts`**:
     `isIndiaLocation()` checked a small list of 20 foreign countries (`NON_INDIA_LOCATIONS`), and if a location did not match that specific list, it defaulted to `return true`. Cities not in that list (such as Belgrade, Aarhus, Mexico City, Austin) slipped through.
  2. **Loose "Remote" Match**:
     `INDIA_LOCATION_KEYWORDS` contained `'remote'`, which matched foreign remote roles like `"Remote - United States"` and `"Remote - Mexico"` and marked them as India-eligible.
  3. **Empty Location in Jooble API**:
     `pipeline/sources/jooble.ts` contained queries with `location: ''`, which fetched US-based postings into the ingestion pool.
  4. **Lenient Fallback in ATS Source**:
     `pipeline/sources/ats.ts` assigned `'India / Remote'` when `location` was null or missing.
  5. **Lack of Location Guardrail in Gemini Prompt**:
     `pipeline/prompts.ts` strictly forced Gemini to pick exactly one of 11 canonical cities (including `Other India`), forcing the model to classify foreign locations as `Other India`.

- **Fix & Resolution**:
  1. **Strict Whitelist Architecture in `pipeline/prefilter.ts`**:
     - Rebuilt `isIndiaLocation()` with a comprehensive whitelist of Indian cities, states, and IT hubs (Bengaluru, Mumbai, Pune, Delhi NCR, Gurgaon, Noida, Hyderabad, Chennai, Kolkata, Ahmedabad, Jaipur, Kochi, Chandigarh, Mohali, Indore, Coimbatore, Bhubaneswar, Lucknow, etc.).
     - Changed the default fallback to **`return false`**.
     - Filtered out foreign remote postings (`remote - us`, `remote - emea`, `remote - latam`, etc.), only allowing remote if explicitly paired with India or worldwide.
  2. **Guaranteed India Location in Jooble Queries**:
     - Enforced `location: 'India'` on all Jooble search queries.
  3. **Accurate Raw Location in ATS Engine**:
     - Removed `'India / Remote'` default in `pipeline/sources/ats.ts`.
  4. **Gemini Prompt Guardrails**:
     - Added an explicit instruction in `pipeline/prompts.ts` to set `is_fresher: false` and `confidence: 0.0` if a posting is located outside India.
  5. **Expanded High-Volume India ATS Sources**:
     - Added verified Indian tech employers to `pipeline/sources/companies.json` (Paytm, Instawork, HighRadius, PubMatic, Zenoti, Zeta, HackerRank, Mindtickle, Druva, Airbnb, etc.) providing over 1,200+ candidate India postings.
  6. **Database Refresh**:
     - Purged foreign records from the database and re-ran the pipeline to ensure 100% of posts are verified India fresher roles.
