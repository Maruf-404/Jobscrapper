// Adzuna source removed — requires credit card for API access.
// File retained for Git history. This function is no longer called by the pipeline.
import { SourceResult } from '../types';

export async function fetchAdzuna(): Promise<SourceResult> {
  console.log('[adzuna] Source disabled (credit card required). Returning empty result.');
  return { sourceName: 'adzuna', posts: [] };
}
