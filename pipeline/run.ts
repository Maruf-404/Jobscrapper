// End-to-end Pipeline Runner for Fresher Jobs India
// PRD Section 5: Fetch -> Pre-filter -> Dedupe -> LLM Tag -> Upsert -> Log Run

import { fetchAllSources } from './sources/index';
import { preFilterPosts } from './prefilter';
import { deduplicatePosts, DedupedPost } from './dedupe';
import { TaggingInputPost, TaggingOutputItem } from './prompts';
import { tagPostsWithGemini } from './tag';
import { db, DBPost, PipelineRunRecord } from './db';
import { calculateCost } from './pricing';

export async function runPipeline(): Promise<{
  activeTotal: number;
  duplicatesRemoved: number;
  tokensPerPost: number;
  totalCostUSD: number;
}> {
  const startedAt = new Date().toISOString();
  console.log(`\n========================================================`);
  console.log(`[PIPELINE] Starting Fresher Jobs India Ingestion Pipeline`);
  console.log(`[PIPELINE] Timestamp: ${startedAt}`);
  console.log(`========================================================\n`);

  // Step 1: Fetch all sources in parallel
  console.log('--- Step 1: Ingesting Posts from All Sources ---');
  const { posts: rawPosts, perSource, errors } = await fetchAllSources();
  console.log(`Fetched ${rawPosts.length} total posts from sources.\n`);

  // Step 2: Pre-filter (cheap, no LLM)
  console.log('--- Step 2: Pre-filtering by Location & Fresher Intent ---');
  const { posts: prefilteredPosts, stats: prefilterStats } = preFilterPosts(rawPosts);
  console.log(`Passed pre-filter: ${prefilteredPosts.length} posts.\n`);

  // Step 3: Multi-tier Deduplication
  console.log('--- Step 3: Exact & Fuzzy Trigram Deduplication ---');
  const { uniquePosts, duplicatePosts, stats: dedupeStats } = deduplicatePosts(prefilteredPosts);
  const totalDuplicatesRemoved = dedupeStats.exactDuplicatesRemoved + dedupeStats.fuzzyDuplicatesRemoved;
  console.log(`Deduplication finished. Unique: ${uniquePosts.length}, Duplicates marked: ${duplicatePosts.length}\n`);

  // Step 4: LLM Tagging with Caching (Never retag existing posts)
  console.log('--- Step 4: Gemini LLM Tagging (Cached by dedupe_key) ---');
  const existingTags = await db.getExistingTaggedPosts();
  console.log(`Found ${existingTags.size} posts already tagged in DB.`);

  const postsNeedingTagging: TaggingInputPost[] = [];
  const finalTags = new Map<string, TaggingOutputItem>();

  for (const post of uniquePosts) {
    if (existingTags.has(post.dedupe_key)) {
      const cached = existingTags.get(post.dedupe_key)!;
      finalTags.set(post.dedupe_key, {
        id: post.dedupe_key,
        role: cached.role as any,
        city: cached.city as any,
        is_fresher: cached.is_fresher,
        confidence: cached.confidence,
      });
    } else {
      postsNeedingTagging.push({
        id: post.dedupe_key,
        title: post.title,
        company: post.company,
        location_raw: post.location_raw,
        description_snippet: post.description.slice(0, 1000),
      });
    }
  }

  console.log(`Posts requiring LLM tagging: ${postsNeedingTagging.length} (Skipping ${finalTags.size} cached)`);

  let callRecords: any[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  if (postsNeedingTagging.length > 0) {
    const taggingRes = await tagPostsWithGemini(postsNeedingTagging);
    callRecords = taggingRes.callRecords;
    totalInputTokens = taggingRes.totalInputTokens;
    totalOutputTokens = taggingRes.totalOutputTokens;

    for (const [key, item] of taggingRes.taggedPosts.entries()) {
      finalTags.set(key, item);
    }
  }

  // Convert to DB records with deduplication by dedupe_key so Postgres batch ON CONFLICT doesn't collide
  const seenDedupeKeys = new Set<string>();
  const dbPostsToUpsert: DBPost[] = [];

  for (const post of uniquePosts) {
    if (seenDedupeKeys.has(post.dedupe_key)) continue;
    seenDedupeKeys.add(post.dedupe_key);
    const tag = finalTags.get(post.dedupe_key);
    dbPostsToUpsert.push({
      dedupe_key: post.dedupe_key,
      title: post.title,
      company: post.company,
      location_raw: post.location_raw,
      description: post.description,
      apply_url: post.canonical_apply_url,
      source: post.source,
      source_id: post.source_id,
      posted_at: post.posted_at,
      role: tag ? tag.role : null,
      city: tag ? tag.city : post.canonical_city,
      is_fresher: tag ? tag.is_fresher : true,
      tag_confidence: tag ? tag.confidence : null,
      duplicate_of: null,
      is_active: true,
    });
  }

  // Also include fuzzy duplicate posts as inactive (skip exact duplicates that share dedupe_key)
  for (const dup of duplicatePosts) {
    if (seenDedupeKeys.has(dup.dedupe_key)) continue;
    seenDedupeKeys.add(dup.dedupe_key);
    dbPostsToUpsert.push({
      dedupe_key: dup.dedupe_key,
      title: dup.title,
      company: dup.company,
      location_raw: dup.location_raw,
      description: dup.description,
      apply_url: dup.canonical_apply_url,
      source: dup.source,
      source_id: dup.source_id,
      posted_at: dup.posted_at,
      role: null,
      city: dup.canonical_city,
      is_fresher: false,
      tag_confidence: null,
      duplicate_of: null,
      is_active: false,
    });
  }

  // Step 5: Upsert into Supabase & Deactivate stale posts (> 7 days)
  console.log('\n--- Step 5: Database Upsert & Stale Post Cleanup ---');
  const upsertedCount = await db.upsertPosts(dbPostsToUpsert);
  console.log(`Upserted ${upsertedCount} total post records into database.`);

  const deactivatedCount = await db.deactivateStalePosts();
  console.log(`Deactivated ${deactivatedCount} posts not seen in the last 7 days.`);

  const activeTotal = await db.getActiveTotal();
  console.log(`Total active fresher posts in database: ${activeTotal}`);

  if (activeTotal < 200) {
    console.warn(`[NOTICE] Active post count (${activeTotal}) is below target 200. Broadening ATS company list dynamically recommended.`);
  } else {
    console.log(`[TARGET MET] Active fresher posts (${activeTotal}) exceeds 200 requirement!`);
  }

  // Step 6: Record run in pipeline_runs and llm_calls
  console.log('\n--- Step 6: Recording Pipeline Run Metrics ---');
  const finishedAt = new Date().toISOString();
  const runRecord: PipelineRunRecord = {
    started_at: startedAt,
    finished_at: finishedAt,
    fetched: rawPosts.length,
    after_prefilter: prefilteredPosts.length,
    duplicates_removed: totalDuplicatesRemoved,
    tagged: postsNeedingTagging.length,
    active_total: activeTotal,
    per_source: perSource,
    errors,
  };

  const runId = await db.recordPipelineRun(runRecord);
  await db.recordLLMCalls(runId, callRecords);
  console.log(`Pipeline run recorded with ID: ${runId}`);

  // Summary Metrics & Cost Report
  const totalTokens = totalInputTokens + totalOutputTokens;
  const taggedCount = postsNeedingTagging.length;
  const tokensPerPost = taggedCount > 0 ? Math.round(totalTokens / taggedCount) : 0;
  const cost = calculateCost({ inputTokens: totalInputTokens, outputTokens: totalOutputTokens });

  console.log(`\n========================================================`);
  console.log(`[PIPELINE SUMMARY REPORT]`);
  console.log(`- Total Fetched: ${rawPosts.length}`);
  console.log(`- Passed Pre-filter: ${prefilteredPosts.length}`);
  console.log(`- Duplicates Removed: ${totalDuplicatesRemoved}`);
  console.log(`- Newly Tagged Posts: ${taggedCount}`);
  console.log(`- Active Fresher Posts Total: ${activeTotal}`);
  console.log(`- Tokens used: ${totalTokens} (${tokensPerPost} tokens/post)`);
  console.log(`- Total Run Cost: $${cost.totalCostUSD.toFixed(6)} USD`);
  console.log(`========================================================\n`);

  return {
    activeTotal,
    duplicatesRemoved: totalDuplicatesRemoved,
    tokensPerPost,
    totalCostUSD: cost.totalCostUSD,
  };
}

// CLI Execution entrypoint
if (require.main === module || process.argv[1]?.includes('run.ts')) {
  runPipeline()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('[FATAL] Pipeline failed:', err);
      process.exit(1);
    });
}
