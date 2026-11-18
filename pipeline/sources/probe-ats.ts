import fs from 'fs';
import path from 'path';

interface VerifiedCompany {
  name: string;
  slug: string;
  ats: 'greenhouse' | 'lever' | 'ashby';
  jobCount: number;
}

const GREENHOUSE_SLUGS = [
  'groww', 'inmobi', 'slice', 'browserstack', 'postman', 'hasura', 'clevertap',
  'urbancompany', 'atlan', 'chargebee', 'whatfix', 'moengage', 'khatabook',
  'innovaccer', 'plumhq', 'springworks', 'elastic', 'canonical', 'thoughtworks',
  'fractal', 'udaan', 'darwinbox', 'delhivery', 'shadowfax', 'shiprocket',
  'lenskart', 'airmeet', 'lead', 'simplilearn', 'loconav', 'scaler', 'jupiter',
  'zscaler', 'rubrik', 'nutanix', 'confluent', 'snowflake', 'databricks',
  'stripe', 'okta', 'atlassian', 'hashicorp', 'pagerduty', 'cloudflare', 'sprinklr',
  'freshworks', 'fractalanalytics', 'cleartax', 'cars24', 'spinny', 'smallcase'
];

const LEVER_SLUGS = [
  'razorpay', 'meesho', 'curefit', 'scaler', 'khatabook', 'unacademy', 'groww',
  'mpl', 'dream11', 'juspay', 'browserstack', 'clevertap', 'urbancompany',
  'postman', 'hotstar', 'rapido', 'ola', 'branch', 'canonical', 'automattic',
  'pocketfm', 'headout', 'shadowfax', 'udaan', 'bounce', 'yulu', 'upstox',
  'rentomojo', 'furlenco', 'urbanic'
];

const ASHBY_SLUGS = [
  'instawork', 'posthog', 'sentry', 'retool', 'vanta', 'deel', 'resend',
  'modal', 'checkly', 'incidentio', 'linear', 'perplexity', 'elevenlabs',
  'supabase', 'neon', 'pinecone', 'weaviate', 'temporal', 'ramp', 'airtable',
  'brex', 'gusto', 'anysphere', 'baseten', 'fal', 'together', 'groq'
];

async function checkGreenhouse(slug: string): Promise<VerifiedCompany | null> {
  try {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=false`, {
      headers: { 'User-Agent': 'FresherJobsIndiaBot/1.0' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const count = data.jobs?.length || 0;
    if (count > 0) {
      return { name: slug.charAt(0).toUpperCase() + slug.slice(1), slug, ats: 'greenhouse', jobCount: count };
    }
  } catch {}
  return null;
}

async function checkLever(slug: string): Promise<VerifiedCompany | null> {
  try {
    const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`, {
      headers: { 'User-Agent': 'FresherJobsIndiaBot/1.0' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return { name: slug.charAt(0).toUpperCase() + slug.slice(1), slug, ats: 'lever', jobCount: data.length };
    }
  } catch {}
  return null;
}

async function checkAshby(slug: string): Promise<VerifiedCompany | null> {
  try {
    const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}`, {
      headers: { 'User-Agent': 'FresherJobsIndiaBot/1.0' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const count = data.jobs?.length || 0;
    if (count > 0) {
      return { name: slug.charAt(0).toUpperCase() + slug.slice(1), slug, ats: 'ashby', jobCount: count };
    }
  } catch {}
  return null;
}

async function main() {
  console.log('Probing ATS candidate slugs...');
  const results: VerifiedCompany[] = [];

  const ghPromises = GREENHOUSE_SLUGS.map(s => checkGreenhouse(s));
  const leverPromises = LEVER_SLUGS.map(s => checkLever(s));
  const ashbyPromises = ASHBY_SLUGS.map(s => checkAshby(s));

  const ghResults = (await Promise.all(ghPromises)).filter(Boolean) as VerifiedCompany[];
  const leverResults = (await Promise.all(leverPromises)).filter(Boolean) as VerifiedCompany[];
  const ashbyResults = (await Promise.all(ashbyPromises)).filter(Boolean) as VerifiedCompany[];

  results.push(...ghResults, ...leverResults, ...ashbyResults);

  console.log(`Verified ${results.length} active ATS endpoints:`);
  for (const r of results) {
    console.log(` - [${r.ats.toUpperCase()}] ${r.name} (${r.slug}): ${r.jobCount} postings`);
  }

  const outputPath = path.resolve(process.cwd(), 'pipeline/sources/companies.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`Saved verified list to ${outputPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
