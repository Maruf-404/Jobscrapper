import { fetchAllSources } from '../../pipeline/sources/index';

async function main() {
  console.log('Testing source fetchers...');
  const start = Date.now();
  const res = await fetchAllSources();
  const duration = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`Fetched ${res.posts.length} total posts in ${duration}s.`);
  console.log('Per source:', res.perSource);
  if (res.posts.length > 0) {
    console.log('Sample post:', JSON.stringify(res.posts[0], null, 2));
  }
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
