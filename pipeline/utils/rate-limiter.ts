// Rate-limiting and resilient HTTP fetching
// PRD Section 4: send descriptive User-Agent, max 1 request/sec per host, retry with backoff

const lastRequestTimeByHost: Map<string, number> = new Map();
const MIN_HOST_INTERVAL_MS = 1000; // max 1 request per second per host

const USER_AGENT = 'FresherJobsIndiaBot/1.0 (+https://github.com/fresher-jobs-india; contact@fresherjobsindia.internal)';

export async function fetchWithRateLimitAndRetry(
  url: string,
  options: RequestInit = {},
  retries: number = 3
): Promise<Response> {
  const urlObj = new URL(url);
  const host = urlObj.host;

  // Rate limiting per host
  const now = Date.now();
  const lastTime = lastRequestTimeByHost.get(host) || 0;
  const timeSinceLast = now - lastTime;
  if (timeSinceLast < MIN_HOST_INTERVAL_MS) {
    const delay = MIN_HOST_INTERVAL_MS - timeSinceLast;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  lastRequestTimeByHost.set(host, Date.now());

  // Merge headers
  const headers = new Headers(options.headers || {});
  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', USER_AGENT);
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json, text/plain, */*');
  }

  let attempt = 0;
  let backoffMs = 1000;

  while (attempt <= retries) {
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.ok) {
        return response;
      }

      // Retry on 429 Too Many Requests or 5xx Server Errors
      if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
        if (attempt === retries) {
          return response;
        }
        console.warn(`[HTTP ${response.status}] Retrying ${url} in ${backoffMs}ms (attempt ${attempt + 1}/${retries})...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        backoffMs *= 2;
        attempt++;
        continue;
      }

      return response;
    } catch (err: any) {
      if (attempt === retries) {
        throw err;
      }
      console.warn(`[Fetch Error] Retrying ${url} in ${backoffMs}ms (attempt ${attempt + 1}/${retries})... ${err?.message || err}`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      backoffMs *= 2;
      attempt++;
    }
  }

  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}
