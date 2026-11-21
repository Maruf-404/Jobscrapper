// Job posting data contracts and filter parameter types
import { RoleCategory, CanonicalCity } from './taxonomy';

export interface PostItem {
  id: string;
  title: string;
  company: string;
  location_raw: string;
  description: string | null;
  apply_url: string;
  source: string;
  posted_at: string | null;
  role: RoleCategory | string | null;
  city: CanonicalCity | string | null;
  is_fresher: boolean;
  tag_confidence: number | null;
  duplicate_of?: string | null;
  is_active?: boolean;
}

export interface FilterParams {
  search?: string;
  roles?: string[];
  cities?: string[];
  sources?: string[];
  postedIn7Days?: boolean;
  page?: number;
  limit?: number;
}

export interface FilteredPostsResult {
  posts: PostItem[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export interface HeaderStats {
  activeCount: number;
  lastUpdatedIST: string;
}

export interface AccuracyMetric {
  correct: number;
  total: number;
  pct: number;
}

export interface StatsSummary {
  activeTotal: number;
  totalDuplicatesRemoved: number;
  rolesBreakdown: Record<string, number>;
  citiesBreakdown: Record<string, number>;
  sourcesBreakdown: Record<string, number>;
  recentRuns: any[];
  costPer1kUSD: number;
  costPer1kINR: number;
  roleAccuracy: AccuracyMetric;
  cityAccuracy: AccuracyMetric;
}
