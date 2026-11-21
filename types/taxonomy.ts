// Centralized taxonomy definitions for role categories and canonical Indian cities
// Shared across pipeline ingestion, LLM classification, and UI filters

export const ROLE_TAXONOMY = [
  'Software Engineering',
  'Data & Analytics',
  'AI/ML',
  'Product',
  'Design/UX',
  'Marketing',
  'Sales & Business Development',
  'Content & Writing',
  'Operations',
  'Finance & Accounting',
  'HR & Recruitment',
  'Customer Support',
  'Other',
] as const;

export type RoleCategory = (typeof ROLE_TAXONOMY)[number];

export const CANONICAL_CITIES = [
  'Bengaluru',
  'Mumbai',
  'Pune',
  'Delhi NCR',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Ahmedabad',
  'Jaipur',
  'Remote',
  'Other India',
] as const;

export type CanonicalCity = (typeof CANONICAL_CITIES)[number];
