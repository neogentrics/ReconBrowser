// Updater states, with stand-ins for Electron, electron-updater, GitHub and the timers. Nothing here touches the network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { Updater, RELEASES_URL, canSelfUpdate, FIRST_CHECK_MS, CHECK_EVERY_MS } = require('../src/main/updater.js');

const NSIS = { platform: 'win32', env: {} };
const APPIMAGE = { platform: 'linux', env: { APPIMAGE: '/x/ReconBrowser.AppImage' } };
const PORTABLE = { platform: 'win32', env: { PORTABLE_EXECUTABLE_DIR: 'C:\\x' } };
const DEB = { platform: 'linux', env: {} };
const MAC = { platform: 'darwin', env: {} };
const release = (tag, html = `https://github.com/neogentrics/ReconBrowser/releases/tag/${tag}`) =>
  () => ({ ok: true, status: 200, json: async () => ({ tag_name: tag, html_url: html }) });

// Behaves like electron-updater's autoUpdater: events first, then the result
function fakeAutoUpdater(latest, { fail } = {}) {
  const au = new EventEmitter();
  au.installed = [];
  au.checkForUpdates = async () => {
    if (fail) { au.emit('error', new Error(fail)); throw new Error(fail); }
    if (latest !== '1.10.0') au.emit('update-available', { version: latest });
    return { updateInfo: { version: latest } };
  };
  au.quitAndInstall = (...args) => au.installed.push(args);
  return au;
}

function make(system, { autoUpdater, respond, packaged = true } = {}) {
  const seen = [];
  const timers = [];
  const fetched = [];
  const updater = new Updater((s) => seen.push(s), {
    app: { isPackaged: packaged, getVersion: () => '1.10.0' },
    net: { fetch: async (url, options) => { fetched.push({ url, options }); return respond(); } },
    loadAutoUpdater: () => { if (!autoUpdater) throw new Error('not installed'); return autoUpdater; },
    ...system,
    setTimeout: (fn, ms) => timers.push({ ms, fn }),
    setInterval: (fn, ms) => timers.push({ ms, fn })
  });
  return { updater, seen, timers, fetched };
}

test('electron-updater is a runtime dependency, so packaged builds contain it', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(pkg.dependencies?.['electron-updater']);
  assert.equal(typeof require.resolve('electron-updater/package.json', { paths: [root] }), 'string', 'run npm ci first');
  assert.deepEqual(pkg.build.publish.map(p => [p.provider, p.owner, p.repo]), [['github', 'neogentrics', 'ReconBrowser']]);
});

test('only the Windows installer and the Linux AppImage update themselves', () => {
  assert.equal(canSelfUpdate(NSIS), true);
  assert.equal(canSelfUpdate(APPIMAGE), true);
  for (const system of [PORTABLE, DEB, MAC]) assert.equal(canSelfUpdate(system), false);
});

test('this app never downloads or launches an installer itself', () => {
  const source = fs.readFileSync(path.join(root, 'src/main/updater.js'), 'utf8');
  assert.doesNotMatch(source, /child_process|spawn|createWriteStream|chmod|browser_download_url/);
});

test('nothing is checked in a development run, or when updates are switched off', () => {
  for (const [system, options] of [[NSIS, { packaged: false }], [{ platform: 'win32', env: { RB_DISABLE_UPDATES: '1' } }, {}]]) {
    const au = fakeAutoUpdater('2.0.0');
    const { updater, timers } = make(system, { autoUpdater: au, ...options });
    updater.start();
    assert.equal(timers.length, 0);
    assert.equal(updater.autoUpdater, null);
  }
});

test('first check after 8 seconds, then every 6 hours', () => {
  assert.equal(FIRST_CHECK_MS, 8000);
  assert.equal(CHECK_EVERY_MS, 6 * 60 * 60 * 1000);
  const { updater, timers } = make(NSIS, { autoUpdater: fakeAutoUpdater('1.10.0') });
  updater.start();
  assert.deepEqual(timers.map(t => t.ms), [8000, CHECK_EVERY_MS]);
  assert.equal(updater.autoUpdater.autoDownload, true);
  assert.equal(updater.autoUpdater.autoInstallOnAppQuit, true);
});

test('current: says so to the caller and sends nothing', async () => {
  for (const [system, options] of [[NSIS, { autoUpdater: fakeAutoUpdater('1.10.0') }], [PORTABLE, { respond: release('v1.10.0') }]]) {
    const { updater, seen } = make(system, options);
    updater.start();
    assert.deepEqual(await updater.check({ silent: false }), { state: 'current', version: '1.10.0' });
    assert.deepEqual(seen, []);
    assert.equal(updater.installNow(), false);
  }
});

test('ready: downloading, then ready, and installNow restarts into the update silently', async () => {
  const au = fakeAutoUpdater('1.11.0');
  const { updater, seen } = make(APPIMAGE, { autoUpdater: au });
  updater.start();
  assert.deepEqual(await updater.check({ silent: true }), { state: 'downloading', version: '1.11.0' });
  assert.equal(updater.installNow(), false, 'nothing to install until the download finishes');
  au.emit('update-downloaded', { version: '1.11.0' });
  assert.deepEqual(seen, [{ state: 'downloading', version: '1.11.0' }, { state: 'ready', version: '1.11.0' }]);
  assert.deepEqual(await updater.check({ silent: false }), { state: 'ready', version: '1.11.0' });
  assert.equal(updater.status.state, 'ready', 'a later check does not take "ready" back');
  assert.equal(updater.installNow(), true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(au.installed, [[true, true]]);
});

test('portable, .deb and Mac copies are told and linked to the release page', async () => {
  for (const system of [PORTABLE, DEB, MAC]) {
    const au = fakeAutoUpdater('1.11.0');
    const { updater, seen, fetched } = make(system, { autoUpdater: au, respond: release('v1.11.0') });
    updater.start();
    const status = await updater.check({ silent: true });
    assert.deepEqual(status, { state: 'available', version: '1.11.0', url: 'https://github.com/neogentrics/ReconBrowser/releases/tag/v1.11.0' });
    assert.deepEqual(seen, [status]);
    assert.equal(updater.autoUpdater, null, 'electron-updater is not used');
    assert.equal(updater.installNow(), false);
    assert.deepEqual(fetched.map(f => f.url), ['https://api.github.com/repos/neogentrics/ReconBrowser/releases/latest']);
  }
});

test('a download link that is not this project’s release page is replaced', async () => {
  const { updater } = make(PORTABLE, { respond: release('v1.11.0', 'https://evil.example/setup.exe') });
  assert.equal((await updater.check()).url, RELEASES_URL);
});

test('error: a manual check gets the reason', async () => {
  const offline = () => { throw new Error('net::ERR_INTERNET_DISCONNECTED'); };
  const cases = [
    [PORTABLE, { respond: offline }, /DISCONNECTED/],
    [PORTABLE, { respond: () => ({ ok: false, status: 403 }) }, /GitHub answered 403/],
    [NSIS, { autoUpdater: fakeAutoUpdater('1.11.0', { fail: 'no latest.yml' }) }, /no latest\.yml/]
  ];
  for (const [system, options, reason] of cases) {
    const { updater, seen } = make(system, options);
    updater.start();
    const res = await updater.check({ silent: false });
    assert.equal(res.state, 'error');
    assert.match(res.message, reason);
    assert.deepEqual(seen, []);
  }
});

test('silent: a scheduled check that finds nothing, or fails, sends nothing', async () => {
  const cases = [
    [NSIS, { autoUpdater: fakeAutoUpdater('1.10.0') }],
    [NSIS, { autoUpdater: fakeAutoUpdater('1.11.0', { fail: 'offline' }) }],
    [DEB, { respond: release('v1.10.0') }],
    [DEB, { respond: () => { throw new Error('offline'); } }]
  ];
  for (const [system, options] of cases) {
    const { updater, seen, timers } = make(system, options);
    updater.start();
    for (const timer of timers) await timer.fn();
    assert.deepEqual(seen, []);
    assert.equal(updater.status.state, 'idle');
  }
});

test('the window shows only an update that can be acted on, with the suite wording', () => {
  const renderer = fs.readFileSync(path.join(root, 'src/renderer/renderer.js'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'src/main/index.js'), 'utf8');
  assert.match(renderer, /is ready to install\./);
  assert.match(renderer, /'Restart to update'/);
  assert.doesNotMatch(renderer, /Checking GitHub for updates/);
  assert.match(main, /You’re up to date/);
  assert.match(main, /Couldn’t check for updates/);
  const help = main.slice(main.indexOf("label: 'Help',"), main.indexOf('const menu = Menu.buildFromTemplate(template)'));
  const order = ["'Help Center'", "'Check for Updates…'", '`About Recon Browser ${app.getVersion()}`'].map(l => help.indexOf(l));
  assert.ok(order.every((at, i) => at > -1 && (i === 0 || at > order[i - 1])), `Help menu order: ${order}`);
});
