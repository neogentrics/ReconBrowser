import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { navigate, describeLoadFailure } = require('../src/renderer/page-loading.js');
const read = (file) => fs.readFileSync(path.join(root, 'src/renderer', file), 'utf8');
const renderer = read('renderer.js');

const rejecting = (message) => ({ loadURL: () => Promise.reject(new Error(message)) });
const ABORT = "Error invoking remote method 'GUEST_VIEW_MANAGER_CALL': Error: ERR_ABORTED (-3) loading 'https://a.example/'";

async function warningsFrom(run) {
  const seen = [];
  const warn = console.warn;
  console.warn = (m) => seen.push(m);
  try { await run(); } finally { console.warn = warn; }
  return seen;
}

describe('Issue #17: interrupted loads', () => {
  it('swallows ERR_ABORTED without a word', async () => {
    assert.deepEqual(await warningsFrom(() => navigate(rejecting(ABORT), 'https://a.example/')), []);
  });

  it('handles every other rejection too, and logs it', async () => {
    const seen = await warningsFrom(() => navigate(rejecting('ERR_NAME_NOT_RESOLVED (-105)'), 'https://b.example/'));
    assert.equal(seen.length, 1);
    assert.match(seen[0], /b\.example.*ERR_NAME_NOT_RESOLVED/);
  });

  it('falls back to the src attribute for a tab that is not ready', async () => {
    const set = [];
    await navigate({ loadURL: () => { throw new Error('must be attached'); }, setAttribute: (...a) => set.push(a) }, 'https://a.example/');
    assert.deepEqual(set, [['src', 'https://a.example/']]);
  });

  it('is the only way the window loads pages', () => {
    assert.doesNotMatch(renderer, /\.loadURL\(/);
    assert.ok((renderer.match(/\bnavigate\(/g) || []).length >= 8);
    const html = read('index.html');
    assert.ok(html.indexOf('src="page-loading.js"') < html.indexOf('src="renderer.js"'));
  });
});

describe('Issue #17: only real failures are shown', () => {
  const event = (errorCode, over = {}) => ({ errorCode, errorDescription: 'ERR_X', validatedURL: 'https://a.example/', isMainFrame: true, ...over });

  it('ignores aborted loads and failures inside frames', () => {
    assert.equal(describeLoadFailure(event(-3)), null);
    assert.equal(describeLoadFailure(event(-105, { isMainFrame: false })), null);
    assert.equal(describeLoadFailure(event(0)), null);
  });

  it('explains the common failures', () => {
    for (const [code, words] of [[-105, /address could not be found/], [-102, /refused/], [-106, /offline/], [-118, /too long/], [-201, /certificate/], [-130, /proxy/], [-6, /file/], [-312, /could not be loaded/]]) {
      assert.match(describeLoadFailure(event(code)).reason, words, String(code));
    }
    assert.deepEqual(describeLoadFailure(event(-105, { errorDescription: 'ERR_NAME_NOT_RESOLVED' })),
      { url: 'https://a.example/', reason: 'The address could not be found. Check the spelling.', detail: 'ERR_NAME_NOT_RESOLVED' });
  });

  it('shows the address as text, never as markup', () => {
    const block = renderer.slice(renderer.indexOf('function showLoadError'), renderer.indexOf("getElementById('load-error-retry')"));
    assert.match(block, /getElementById\('load-error-url'\)\.textContent = failure\.url/);
    assert.doesNotMatch(block, /innerHTML/);
  });
});
