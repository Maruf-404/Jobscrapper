// Prompts and taxonomies for Gemini LLM Tagging
// PRD Section 6

import { ROLE_TAXONOMY, RoleCategory, CANONICAL_CITIES, CanonicalCity } from '../types/taxonomy';

export { ROLE_TAXONOMY, CANONICAL_CITIES };
export type { RoleCategory, CanonicalCity };

export interface TaggingInputPost {
  id: string;
  title: string;
  company: string;
  location_raw: string;
  description_snippet: string;
}

export interface TaggingOutputItem {
  id: string;
  role: RoleCategory;
  city: CanonicalCity;
  is_fresher: boolean;
  confidence: number;
}

export const SYSTEM_PROMPT = `You are an expert job classification assistant for Indian tech and corporate job postings.
Your role is to categorize candidate job postings strictly using the provided role taxonomy and canonical Indian city list, while determining whether the position is genuinely suitable for freshers/interns (0-2 years experience).

Rules:
1. ROLE TAXONOMY (You must pick EXACTLY one):
- Software Engineering
- Data & Analytics
- AI/ML
- Product
- Design/UX
- Marketing
- Sales & Business Development
- Content & Writing
- Operations
- Finance & Accounting
- HR & Recruitment
- Customer Support
- Other

2. CANONICAL CITIES (You must pick EXACTLY one):
- Bengaluru (map Bangalore, Bengaluru)
- Mumbai (map Mumbai, Bombay, Navi Mumbai, Thane)
- Pune
- Delhi NCR (map Delhi, New Delhi, Gurgaon, Gurugram, Noida, Greater Noida, Faridabad, Ghaziabad)
- Hyderabad (map Hyderabad, Secunderabad)
- Chennai (map Chennai, Madras)
- Kolkata (map Kolkata, Calcutta)
- Ahmedabad
- Jaipur
- Remote (if Remote, WFH, Work from Home, Anywhere, or Worldwide open to Indian candidates)
- Other India (ONLY if the location is verified to be inside India, e.g. Lucknow, Kochi, Chandigarh, Indore, Coimbatore, Goa, but not one of the canonical cities above)

3. CLASSIFICATION GUIDELINES:
- CRITICAL LOCATION REQUIREMENT: This platform is strictly for jobs in India. If a job is explicitly located outside India (e.g. US, UK, Germany, Serbia, Denmark, Mexico, Canada, Australia) and is NOT a worldwide/India-eligible remote position, set "is_fresher" to false and "confidence" to 0.0.
- CRITICAL STRICT FRESHER REQUIREMENT: This platform is strictly for genuine freshers, college graduates, and interns (0-1 years experience, up to 2 years for early-career roles).
  * You MUST set "is_fresher" to false if the job demands 2+, 3+, 4+, 5+ years experience, is Level II/III/IV/2/3, or is a mid/senior-level role.
  * You MUST set "is_fresher" to true ONLY if it is an internship, apprenticeship, trainee, campus, new grad, junior, or explicitly entry-level position (0-1 years, 0-2 years, or no prior experience required).
- Judge role from title FIRST, description SECOND.
- If multiple cities are mentioned, pick the first one.
- If "Remote" or "WFH" is listed, pick "Remote".
- If unsure of the role, use "Other" with a lower confidence score (between 0.1 and 0.5).
- Output must strictly be a JSON array of objects conforming to the schema.`;

export function buildTaggingPrompt(posts: TaggingInputPost[]): string {
  const postsJson = JSON.stringify(posts, null, 2);
  return `Classify the following batch of ${posts.length} job posts according to the system instructions.
Return a valid JSON array of objects with the exact schema:
[
  {
    "id": "post_id_string",
    "role": "one of the 13 role taxonomy values",
    "city": "one of the 11 canonical city values",
    "is_fresher": boolean,
    "confidence": float between 0.0 and 1.0
  }
]

Input posts:
${postsJson}`;
}
