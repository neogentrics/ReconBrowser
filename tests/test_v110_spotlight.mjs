/**
 * tests/test_v110_spotlight.mjs
 * Verification suite for Recon Browser v1.10.0 — Unified Recon Spotlight Search
 */

import { strict as assert } from 'assert';
import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const { SpotlightManager } = require(join(root, 'src/main/spotlight.js'));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

console.log('\n🔍 Recon Browser v1.10.0 — Spotlight Search Test Suite\n');

test('SpotlightManager instantiates correctly', () => {
  const sm = new SpotlightManager();
  assert(sm !== null && typeof sm.search === 'function');
});

await runAsyncTest('Spotlight default suggestions on empty query', async () => {
  const sm = new SpotlightManager();
  const res = await sm.search('', {
    openTabs: [{ id: 'tab1', title: 'GitHub', url: 'https://github.com' }],
    bookmarks: [{ id: 'bm1', title: 'DuckDuckGo', url: 'https://duckduckgo.com' }]
  });
  assert(Array.isArray(res));
  assert(res.length > 0);
  assert(res.some(r => r.type === 'tab'));
  assert(res.some(r => r.type === 'bookmark'));
});

await runAsyncTest('Spotlight command prefix (">") filters to system commands only', async () => {
  const sm = new SpotlightManager();
  const res = await sm.search('> settings', {
    openTabs: [{ id: 'tab1', title: 'Settings App', url: 'https://example.com' }],
    bookmarks: [{ id: 'bm1', title: 'Settings Guide', url: 'https://guide.com' }]
  });
  assert(Array.isArray(res));
  assert(res.length > 0);
  assert(res.every(r => r.type === 'command'));
  assert(res.some(r => r.title.toLowerCase().includes('settings')));
});

await runAsyncTest('Spotlight tab prefix ("@") filters to open tabs only', async () => {
  const sm = new SpotlightManager();
  const res = await sm.search('@ git', {
    openTabs: [
      { id: 'tab1', title: 'GitHub Repo', url: 'https://github.com/repo' },
      { id: 'tab2', title: 'DuckDuckGo', url: 'https://duckduckgo.com' }
    ],
    bookmarks: [{ id: 'bm1', title: 'Git Documentation', url: 'https://git-scm.com' }]
  });
  assert(Array.isArray(res));
  assert(res.length === 1);
  assert(res[0].type === 'tab');
  assert(res[0].title === 'GitHub Repo');
});

await runAsyncTest('Spotlight bookmark prefix ("*") filters to bookmarks only', async () => {
  const sm = new SpotlightManager();
  const res = await sm.search('* doc', {
    openTabs: [{ id: 'tab1', title: 'Doc Viewer', url: 'https://doc.com' }],
    bookmarks: [{ id: 'bm1', title: 'Git Documentation', url: 'https://git-scm.com' }]
  });
  assert(Array.isArray(res));
  assert(res.length === 1);
  assert(res[0].type === 'bookmark');
  assert(res[0].title === 'Git Documentation');
});

await runAsyncTest('Spotlight multi-domain fuzzy scoring ranks relevant matches higher', async () => {
  const sm = new SpotlightManager();
  const res = await sm.search('recon', {
    openTabs: [{ id: 'tab1', title: 'Recon Documentation Hub', url: 'https://recon.local' }],
    bookmarks: [{ id: 'bm1', title: 'Recon Towers Home', url: 'https://recontowers.com' }]
  });
  assert(Array.isArray(res));
  assert(res.length >= 2);
  assert(res.every(r => r.score > 0));
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
