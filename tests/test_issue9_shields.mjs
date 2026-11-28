import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { createShieldsGuard, parseFilterList } = require('../src/main/shields-guard.js');
const shipped = parseFilterList(fs.readFileSync(path.join(root, 'config/filters/default-trackers.txt'), 'utf8'));
const main = fs.readFileSync(path.join(root, 'src/main/index.js'), 'utf8');

function fakeSession() {
  const handlers = [];
  return { handlers, webRequest: { onBeforeRequest: (fn) => handlers.push(fn) } };
}

function setup({ enabled = true, paused = [], pageUrl = 'https://news.example/story', ...extra } = {}) {
  const seen = { blocked: [], logged: [], media: [] };
  const guard = createShieldsGuard({
    rules: shipped,
    isEnabled: () => enabled,
    pausedHosts: new Set(paused),
    pageUrlOf: () => pageUrl,
    log: (id, entry) => seen.logged.push([id, entry]),
    onBlocked: (details, host) => seen.blocked.push([details.webContentsId, host]),
    onMedia: (details) => seen.media.push(details.url),
    ...extra
  });
  const ses = fakeSession();
  guard.attach(ses);
  const request = (url, more = {}) => {
    let answer;
    ses.handlers[0]({ url, method: 'GET', resourceType: 'xhr', webContentsId: 7, ...more }, (a) => { answer = a; });
    return answer;
  };
  return { guard, ses, seen, request, cancels: (url, more) => request(url, more).cancel };
}

describe('Issue #9: Shields block in every session', () => {
  it('blocks the three trackers from the report and counts each for its tab', () => {
    const { cancels, seen } = setup();
    for (const url of ['https://doubleclick.net/x', 'https://www.google-analytics.com/a.js', 'https://connect.facebook.net/f.js']) {
      assert.equal(cancels(url), true, url);
    }
    assert.deepEqual(seen.blocked.map(b => b[0]), [7, 7, 7]);
  });

  it('puts a handler on each session once, however often it is asked', () => {
    const { guard, ses } = setup();
    assert.equal(guard.attach(ses), false);
    assert.equal(ses.handlers.length, 1);
    const partition = fakeSession();
    assert.equal(guard.attach(partition), true);
    assert.equal(partition.handlers.length, 1);
  });

  it('is attached to sessions as they are created, before any window exists', () => {
    const hook = main.indexOf("app.on('session-created', (ses) => shieldsGuard.attach(ses))");
    assert.ok(hook > -1);
    assert.ok(hook < main.indexOf('app.whenReady()'));
    assert.equal(main.match(/onBeforeRequest\(/g), null, 'only the guard registers request handlers');
  });

  it('lets other sites through, and web pages only (not files or data)', () => {
    const { cancels } = setup();
    assert.equal(cancels('https://example.org/app.js'), false);
    assert.equal(cancels('https://notdoubleclick.net/x'), false);
    assert.equal(cancels('file:///home/x/page.html'), false);
    assert.equal(cancels('data:text/plain,hi'), false);
  });

  it('never cancels a page the user opens, and lets that site load its own files', () => {
    assert.equal(setup().cancels('https://hotjar.com/', { resourceType: 'mainFrame' }), false);
    const onHotjar = setup({ pageUrl: 'https://www.hotjar.com/pricing' });
    assert.equal(onHotjar.cancels('https://static.hotjar.com/app.js'), false);
    assert.equal(onHotjar.cancels('https://doubleclick.net/x'), true);
  });

  it('blocks only the path of a path rule, not the whole site', () => {
    const { cancels } = setup();
    assert.equal(cancels('https://yandex.ru/search?q=a'), false);
    assert.equal(cancels('https://yandex.ru/watch/123'), true);
    assert.equal(cancels('https://www.facebook.com/groups'), false);
    assert.equal(cancels('https://www.facebook.com/tr/?id=1'), true);
  });

  it('respects the global switch', () => {
    assert.equal(setup({ enabled: false }).cancels('https://doubleclick.net/x'), false);
  });

  it('respects a paused site, found through the tab’s page or the referrer', () => {
    assert.equal(setup({ paused: ['news.example'] }).cancels('https://doubleclick.net/x'), false);
    const noTab = setup({ paused: ['news.example'], pageUrl: '' });
    assert.equal(noTab.cancels('https://doubleclick.net/x', { referrer: 'https://www.news.example/' }), false);
    assert.equal(setup({ paused: ['other.example'] }).cancels('https://doubleclick.net/x'), true);
  });

  it('also applies the Shields 2.0 domain list', () => {
    const { cancels, seen } = setup({ isDomainBlocked: (h) => h === 'branch.io' });
    assert.equal(cancels('https://branch.io/sdk.js'), true);
    assert.equal(seen.logged.at(-1)[1].reason, 'Shields 2.0 Subscription');
  });

  it('still reports media files it lets through', () => {
    const { request, seen } = setup();
    request('https://cdn.example/clip.mp3');
    assert.deepEqual(seen.media, ['https://cdn.example/clip.mp3']);
  });

  it('answers the request even if a check throws', () => {
    const { request } = setup({ isDomainBlocked: () => { throw new Error('boom'); } });
    assert.deepEqual(request('https://example.org/'), { cancel: false });
  });
});
