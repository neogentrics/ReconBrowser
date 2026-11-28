import { describe, it, beforeEach, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'rb-history-'));
after(() => fs.rmSync(userData, { recursive: true, force: true }));

// The real module, with a stand-in for Electron's app
const load = Module._load;
Module._load = function (request, ...rest) {
  return request === 'electron' ? { app: { getPath: () => userData } } : load.call(this, request, ...rest);
};
const { HistoryManager, recordableAddress } = require('../src/main/history.js');
Module._load = load;

const renderer = path.join(root, 'src/renderer');
const internalDirs = [renderer, userData];
const page = (name) => pathToFileURL(path.join(renderer, name)).href;
const main = fs.readFileSync(path.join(root, 'src/main/index.js'), 'utf8');

describe('Issue #15: what history keeps', () => {
  it('skips the browser’s own pages and files', () => {
    for (const url of [page('history.html'), page('startpage.html'), page('gemini-viewer.html') + '?url=gemini%3A%2F%2Fa',
      pathToFileURL(path.join(userData, 'archive-view', 'a.mhtml')).href,
      'about:blank', 'about:history', 'data:text/html,x', 'chrome://gpu', 'devtools://devtools/x', 'blob:https://a.example/1', '', 'junk']) {
      assert.equal(recordableAddress(url, internalDirs), null, url);
    }
  });

  it('keeps websites and the user’s own local files, even with look-alike names', () => {
    for (const url of ['https://a.example/history.html', 'https://a.example/startpage.html', 'http://a.example/?next=gemini-viewer.html',
      pathToFileURL(path.join(os.tmpdir(), 'notes', 'history.html')).href, pathToFileURL(renderer + '-copy/page.html').href]) {
      assert.deepEqual(recordableAddress(url, internalDirs), { url, challenge: false }, url);
    }
  });

  it('takes one-time bot-check tokens out and keeps the rest', () => {
    assert.deepEqual(recordableAddress('https://a.example/p?id=7&__cf_chl_rt_tk=abc-123&q=a%20b#s'),
      { url: 'https://a.example/p?id=7&q=a%20b#s', challenge: true });
    assert.deepEqual(recordableAddress('https://a.example/p?__cf_chl_tk=x&__cf_chl_f_tk=y'), { url: 'https://a.example/p', challenge: true });
  });

  it('skips bot-check pages', () => {
    assert.equal(recordableAddress('https://a.example/cdn-cgi/challenge-platform/h/g'), null);
    assert.equal(recordableAddress('https://www.google.com/sorry/index?continue=x&q=longtoken'), null);
    assert.ok(recordableAddress('https://www.google.com/search?q=sorry'));
    assert.ok(recordableAddress('https://notgoogle.example/sorry/'));
  });
});

describe('Issue #15: visits and titles', () => {
  let history;
  let now = 1_000_000_000_000;
  const later = (ms) => { now += ms; mock.timers.setTime(now); };
  beforeEach(() => {
    mock.timers.reset();
    mock.timers.enable({ apis: ['Date'], now });
    fs.rmSync(path.join(userData, 'recon_history.json'), { force: true });
    history = new HistoryManager({ internalDirs });
  });

  it('stores nothing for an internal page', () => {
    assert.equal(history.add({ url: page('history.html'), title: 'History' }), null);
    assert.equal(history.getAll().length, 0);
  });

  it('collapses a bot check into one visit, even a slow one, titled by the real page', () => {
    history.add({ url: 'https://a.example/p?id=7', title: 'Just a moment...' });
    later(60_000); // the person solves the check
    history.add({ url: 'https://a.example/p?id=7&__cf_chl_rt_tk=abc', title: '' });
    later(500);
    history.add({ url: 'https://a.example/p?id=7', title: '' });
    assert.equal(history.setTitle('https://a.example/p?id=7', 'Guarded Article'), true);
    assert.deepEqual(history.getAll().map(i => [i.url, i.title]), [['https://a.example/p?id=7', 'Guarded Article']]);
  });

  it('gives a new visit the title the page sets, and leaves later changes alone', () => {
    history.add({ url: 'https://a.example/', title: 'https://a.example/' });
    later(300);
    assert.equal(history.setTitle('https://a.example/', 'Real Title'), true);
    later(60_000);
    assert.equal(history.setTitle('https://a.example/', '(1) new message'), false);
    assert.equal(history.getAll()[0].title, 'Real Title');
  });

  it('still records going back to the same page later', () => {
    history.add({ url: 'https://a.example/', title: 'A' });
    later(5000);
    history.add({ url: 'https://a.example/', title: 'A' });
    assert.equal(history.getAll().length, 2);
  });

  it('is wired to the app’s folders, titles, and main-frame moves only', () => {
    assert.match(main, /internalDirs: \[path\.join\(__dirname, '\.\.\/renderer'\), app\.getPath\('userData'\)\]/);
    assert.match(main, /'did-navigate-in-page', \(event, url, isMainFrame\) => \{\s*if \(!isMainFrame\) return;/);
    assert.match(main, /'page-title-updated'[\s\S]{0,80}historyManager\.setTitle\(contents\.getURL\(\), title\)/);
  });
});
