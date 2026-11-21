// Review session data contracts and accuracy scorecard types
import { RoleCategory, CanonicalCity } from './taxonomy';

export interface ReviewPost {
  id: string;
  title: string;
  company: string;
  location_raw: string;
  description_snippet: string;
  apply_url?: string;
  llm_role: RoleCategory | string;
  llm_city: CanonicalCity | string;
  true_role?: RoleCategory | string;
  true_city?: CanonicalCity | string;
  role_correct?: boolean;
  city_correct?: boolean;
  is_reviewed?: boolean;
}

export interface ReviewSubmitPayload {
  postId: string;
  true_role: string;
  true_city: string;
  role_correct: boolean;
  city_correct: boolean;
}

export interface ReviewAccuracyMetrics {
  total: number;
  reviewedCount: number;
  roleAccuracy: number;
  cityAccuracy: number;
  bothAccuracy: number;
}
