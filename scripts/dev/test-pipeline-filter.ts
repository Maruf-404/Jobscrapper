import { fetchAllSources } from '../../pipeline/sources/index';
import { preFilterPosts } from '../../pipeline/prefilter';
import { deduplicatePosts } from '../../pipeline/dedupe';

async function main() {
  console.log('Testing Pre-filter and Deduplication...');
  const { posts } = await fetchAllSources();
  console.log(`Fetched ${posts.length} raw posts.`);

  const prefiltered = preFilterPosts(posts);
  console.log(`After prefilter: ${prefiltered.posts.length} posts.`);

  const deduped = deduplicatePosts(prefiltered.posts);
  console.log(`After dedupe: ${deduped.uniquePosts.length} unique posts.`);
  console.log(`Duplicates identified: ${deduped.duplicatePosts.length}`);

  if (deduped.uniquePosts.length >= 200) {
    console.log(`SUCCESS: Target >= 200 posts reached (${deduped.uniquePosts.length} unique fresher posts).`);
  } else {
    console.warn(`NOTICE: Currently ${deduped.uniquePosts.length} unique posts (< 200 target).`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
