// LLM Tagging Engine using Gemini Flash (@google/genai)
// PRD Section 6

import { GoogleGenAI } from '@google/genai';
import { env } from './env';
import {
  SYSTEM_PROMPT,
  buildTaggingPrompt,
  TaggingInputPost,
  TaggingOutputItem,
  ROLE_TAXONOMY,
  CANONICAL_CITIES,
  RoleCategory,
  CanonicalCity,
} from './prompts';
import { getCanonicalCity } from './dedupe';

export interface LLMCallRecord {
  model: string;
  postsInBatch: number;
  inputTokens: number;
  outputTokens: number;
}

export interface TaggingResult {
  taggedPosts: Map<string, TaggingOutputItem>;
  callRecords: LLMCallRecord[];
  totalInputTokens: number;
  totalOutputTokens: number;
}

const BATCH_SIZE = 10;

// Rate-limiting delay between LLM calls based on LLM_RPM
function getRpmDelayMs(): number {
  const rpm = Math.max(1, env.llmRpm);
  return Math.ceil(60000 / rpm);
}

// Fallback heuristic classifier when GEMINI_API_KEY is not configured
function heuristicClassify(post: TaggingInputPost): TaggingOutputItem {
  const t = post.title.toLowerCase();
  const d = post.description_snippet.toLowerCase();
  let role: RoleCategory = 'Other';
  let confidence = 0.85;

  if (/\b(software|developer|frontend|backend|fullstack|web|ios|android|react|node|java|python|c\+\+|embedded|qa|sdet|test)\b/i.test(t)) {
    role = 'Software Engineering';
  } else if (/\b(ai|ml|machine learning|deep learning|nlp|computer vision|llm)\b/i.test(t)) {
    role = 'AI/ML';
  } else if (/\b(data|analytics|analyst|business intelligence|bi|sql|tableau|power bi)\b/i.test(t)) {
    role = 'Data & Analytics';
  } else if (/\b(product|product manager|apm)\b/i.test(t)) {
    role = 'Product';
  } else if (/\b(design|ui|ux|graphic|visual|product design)\b/i.test(t)) {
    role = 'Design/UX';
  } else if (/\b(marketing|growth|seo|sem|social media|brand)\b/i.test(t)) {
    role = 'Marketing';
  } else if (/\b(sales|business development|bdr|sdr|account executive)\b/i.test(t)) {
    role = 'Sales & Business Development';
  } else if (/\b(content|copywriter|writer|editorial|technical writer)\b/i.test(t)) {
    role = 'Content & Writing';
  } else if (/\b(operations|supply chain|logistics|process)\b/i.test(t)) {
    role = 'Operations';
  } else if (/\b(finance|accounting|accountant|audit|ca|tax)\b/i.test(t)) {
    role = 'Finance & Accounting';
  } else if (/\b(hr|recruiting|recruiter|talent|people ops|human resources)\b/i.test(t)) {
    role = 'HR & Recruitment';
  } else if (/\b(support|customer service|customer success|client service)\b/i.test(t)) {
    role = 'Customer Support';
  } else {
    confidence = 0.45;
  }

  const city = getCanonicalCity(post.location_raw) as CanonicalCity;

  return {
    id: post.id,
    role,
    city,
    is_fresher: true,
    confidence,
  };
}

export async function tagPostsWithGemini(posts: TaggingInputPost[]): Promise<TaggingResult> {
  const taggedMap = new Map<string, TaggingOutputItem>();
  const callRecords: LLMCallRecord[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  if (posts.length === 0) {
    return { taggedPosts: taggedMap, callRecords, totalInputTokens, totalOutputTokens };
  }

  // Check if GEMINI_API_KEY is available
  if (!env.geminiApiKey) {
    console.warn('[LLM TAGGER] GEMINI_API_KEY not set. Using rule-based fallback classifier.');
    for (const p of posts) {
      const item = heuristicClassify(p);
      taggedMap.set(p.id, item);
    }
    // Simulate estimated token count for cost reporting
    const estInput = posts.length * 120;
    const estOutput = posts.length * 35;
    callRecords.push({
      model: 'heuristic-fallback',
      postsInBatch: posts.length,
      inputTokens: estInput,
      outputTokens: estOutput,
    });
    totalInputTokens += estInput;
    totalOutputTokens += estOutput;
    return { taggedPosts: taggedMap, callRecords, totalInputTokens, totalOutputTokens };
  }

  const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });
  const modelsToTry = [env.geminiModel, ...env.geminiModelFallbacks];
  const rpmDelay = getRpmDelayMs();

  // Process in batches of 10
  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE);
    const userPrompt = buildTaggingPrompt(batch);
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1;

    let success = false;

    // Try primary model then each fallback
    for (const modelName of modelsToTry) {
      if (success) break;

      let attempts = 0;
      const maxAttempts = 2;
      let backoffMs = 1500;

      while (attempts < maxAttempts && !success) {
        try {
          console.log(`[LLM Batch ${batchIndex}] Using model: ${modelName}`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
            config: {
              temperature: 0,
              responseMimeType: 'application/json',
            },
          });

          const rawText = response.text || '';
          let items: TaggingOutputItem[] = [];

          try {
            items = JSON.parse(rawText);
          } catch {
            // Attempt to extract JSON substring if extra markdown fences were added
            const match = rawText.match(/\[.*\]/s);
            if (match) {
              items = JSON.parse(match[0]);
            }
          }

          // Token usage tracking
          const usage = (response as any).usageMetadata || {};
          const inputTokens = usage.promptTokenCount || Math.round(userPrompt.length / 4);
          const outputTokens = usage.candidatesTokenCount || Math.round(rawText.length / 4);

          callRecords.push({
            model: modelName,
            postsInBatch: batch.length,
            inputTokens,
            outputTokens,
          });

          totalInputTokens += inputTokens;
          totalOutputTokens += outputTokens;

          for (const item of items) {
            // Validate role and city against allowed values
            const role = ROLE_TAXONOMY.includes(item.role as any) ? item.role : 'Other';
            const city = CANONICAL_CITIES.includes(item.city as any) ? item.city : 'Other India';
            taggedMap.set(item.id, {
              id: item.id,
              role,
              city,
              is_fresher: typeof item.is_fresher === 'boolean' ? item.is_fresher : true,
              confidence: typeof item.confidence === 'number' ? item.confidence : 0.8,
            });
          }

          // Tag any missing items in batch with heuristic fallback
          for (const p of batch) {
            if (!taggedMap.has(p.id)) {
              taggedMap.set(p.id, heuristicClassify(p));
            }
          }

          if (modelsToTry[0] !== modelName) {
            const idx = modelsToTry.indexOf(modelName);
            if (idx > 0) {
              modelsToTry.splice(idx, 1);
              modelsToTry.unshift(modelName);
              console.log(`[LLM TAGGER] Promoted working model ${modelName} to primary.`);
            }
          }

          success = true;
        } catch (err: any) {
          attempts++;
          const errStr = String(err?.message || err);
          const is429 = err?.status === 429 || errStr.includes('429') || errStr.includes('quota');
          const is503 = err?.status === 503 || errStr.includes('503') || errStr.includes('high demand') || errStr.includes('UNAVAILABLE');
          
          console.warn(`[LLM Batch ${batchIndex}] Model ${modelName} attempt ${attempts} failed:`, errStr);
          if (is503) {
            console.warn(`[LLM Batch ${batchIndex}] Model ${modelName} experiencing high demand (503). Switching to fallback immediately...`);
            break; // Skip remaining attempts for this model, immediately try next model in chain
          } else if (is429) {
            console.warn(`Rate limit on ${modelName}, backing off for ${backoffMs}ms...`);
            await new Promise((r) => setTimeout(r, backoffMs));
            backoffMs *= 2;
          } else if (attempts >= maxAttempts) {
            console.warn(`[LLM Batch ${batchIndex}] Exhausted retries on ${modelName}. Trying next model...`);
          } else {
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      }
    }

    if (!success) {
      console.error(`[LLM Batch ${Math.floor(i / BATCH_SIZE) + 1}] All models failed. Using heuristic fallback classification.`);
      for (const p of batch) {
        taggedMap.set(p.id, heuristicClassify(p));
      }
    }

    // Rate-limit throttle between requests
    if (i + BATCH_SIZE < posts.length) {
      await new Promise((r) => setTimeout(r, rpmDelay));
    }
  }

  console.log(`[LLM TAGGER] Tagged ${taggedMap.size} posts across ${callRecords.length} API calls.`);
  console.log(`[LLM TAGGER] Total tokens: ${totalInputTokens} in, ${totalOutputTokens} out.`);

  return { taggedPosts: taggedMap, callRecords, totalInputTokens, totalOutputTokens };
}
