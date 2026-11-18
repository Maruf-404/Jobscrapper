// Common Post Schema across all ingestion sources (PRD Section 4)

export interface RawPost {
  title: string;
  company: string;
  location_raw: string;
  description: string;
  apply_url: string;
  source: string;        // 'adzuna' | 'jooble' | 'greenhouse' | 'lever' | 'ashby'
  source_id: string;
  source_url?: string;
  posted_at: string | null; // ISO 8601 string or null
}

export interface SourceResult {
  sourceName: string;
  posts: RawPost[];
  error?: string;
}

export type SourceFetcher = () => Promise<SourceResult>;
