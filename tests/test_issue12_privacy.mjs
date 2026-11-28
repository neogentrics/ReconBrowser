import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const { createPrivacy, stripTrackingParams } = require('../src/main/privacy.js');
const { createShieldsGuard } = require('../src/main/shields-guard.js');
const main = read('src/main/index.js');
const renderer = read('src/renderer/renderer.js');

const make = ({ shields = true, paused = [] } = {}) =>
  createPrivacy({ isShieldsEnabled: () => shields, pausedHosts: new Set(paused), secret: Buffer.alloc(32, 1) });

describe('Issue #12: tracking parameters', () => {
  it('removes the parameters from the report and keeps the rest as written', () => {
    assert.equal(
      stripTrackingParams('https://a.example/p?utm_source=news&fbclid=abc123&gclid=zzz&q=keep%20me+too&sig=a%2Fb#top'),
      'https://a.example/p?q=keep%20me+too&sig=a%2Fb#top');
  });

  it('drops the question mark when nothing is left, and reports no change otherwise', () => {
    assert.equal(stripTrackingParams('https://a.example/p?UTM_Medium=x&msclkid=1&mc_eid=2&_ga=3'), 'https://a.example/p');
    for (const same of ['https://a.example/p', 'https://a.example/p?q=utm_source', 'https://a.example/?gclid2=1', 'file:///p?utm_source=1', 'not a url']) {
      assert.equal(stripTrackingParams(same), null, same);
    }
  });

  const nav = (url, over = {}) => ({ id: 1, method: 'GET', url, resourceType: 'mainFrame', ...over });

  it('rewrites pages being opened, not form posts', () => {
    assert.equal(make().cleanNavigation(nav('https://a.example/?utm_source=1')), 'https://a.example/');
    assert.equal(make().cleanNavigation(nav('https://a.example/?utm_source=1', { method: 'POST' })), null);
  });

  it('stops when a server keeps putting the parameter back', () => {
    const privacy = make();
    const url = 'https://a.example/?utm_source=again';
    assert.ok(privacy.cleanNavigation(nav(url)));
    assert.equal(privacy.cleanNavigation(nav(url)), null);
    assert.ok(privacy.cleanNavigation(nav(url, { id: 2 })), 'a new load is cleaned again');
  });

  it('goes through the one request handler, for top-level pages only', () => {
    const guard = createShieldsGuard({
      rules: [], isEnabled: () => true, pausedHosts: new Set(),
      cleanNavigation: (d) => make().cleanNavigation(d)
    });
    const ask = (resourceType) => {
      let answer;
      guard.handle(nav('https://a.example/?utm_source=1', { resourceType }), (a) => { answer = a; });
      return answer;
    };
    assert.deepEqual(ask('mainFrame'), { cancel: false, redirectURL: 'https://a.example/' });
    assert.deepEqual(ask('xhr'), { cancel: false });
  });
});

describe('Issue #12: one rule for every protection', () => {
  const page = 'https://news.example/a?utm_source=1';
  const state = (privacy) => ({
    params: privacy.cleanNavigation({ id: 9, method: 'GET', url: page }) !== null,
    webrtc: privacy.webrtcPolicy(page),
    fingerprint: privacy.fingerprintConfig(page, page).fingerprint
  });
  const ON = { params: true, webrtc: 'disable_non_proxied_udp', fingerprint: true };
  const OFF = { params: false, webrtc: 'default', fingerprint: false };

  it('is on by default', () => assert.deepEqual(state(make()), ON));
  it('is off when Shields are off', () => assert.deepEqual(state(make({ shields: false })), OFF));
  it('is off on a paused site only', () => {
    assert.deepEqual(state(make({ paused: ['news.example'] })), OFF);
    assert.deepEqual(state(make({ paused: ['other.example'] })), ON);
  });

  it('follows each switch separately and ignores junk values', () => {
    for (const name of ['params', 'webrtc', 'fingerprint']) {
      const privacy = make();
      privacy.setOptions({ [name]: false });
      assert.deepEqual(state(privacy), { ...ON, [name]: OFF[name] }, name);
    }
    assert.deepEqual(make().setOptions({ webrtc: 'false', other: false }), { fingerprint: true, webrtc: true, params: true });
  });

  it('gives frames the seed of the page in the tab, differing between sites and runs', () => {
    const privacy = make();
    const top = privacy.fingerprintConfig('https://news.example/', 'https://news.example/').seed;
    assert.equal(privacy.fingerprintConfig('https://ads.example/frame', 'https://news.example/x').seed, top);
    assert.notEqual(privacy.fingerprintConfig('https://other.example/', 'https://other.example/').seed, top);
    const nextRun = createPrivacy({ isShieldsEnabled: () => true, pausedHosts: new Set(), secret: Buffer.alloc(32, 2) });
    assert.notEqual(nextRun.fingerprintConfig('https://news.example/', 'https://news.example/').seed, top);
    assert.equal(privacy.fingerprintConfig('file:///start.html', 'file:///start.html').fingerprint, false);
  });
});

/** Runs the real preload against a minimal fake page and returns that page. */
function runPreload(config, { cores = 12, protocol = 'https:' } = {}) {
  const page = vm.createContext({ console });
  vm.runInContext(`
    var window = globalThis;
    class Navigator { get hardwareConcurrency() { return ${cores}; } }
    var navigator = new Navigator();
    class CanvasRenderingContext2D {
      constructor(canvas) { this.canvas = canvas; }
      getImageData(x, y, w, h) {
        const data = new Uint8ClampedArray(w * h * 4);
        for (let r = 0; r < h; r++) for (let c = 0; c < w; c++)
          data.set(this.canvas.pixels.subarray(((y + r) * this.canvas.width + x + c) * 4, ((y + r) * this.canvas.width + x + c) * 4 + 4), (r * w + c) * 4);
        return { data, width: w, height: h };
      }
      drawImage(source) { this.canvas.pixels.set(source.pixels); }
      putImageData(image) { this.canvas.pixels.set(image.data); }
    }
    class HTMLCanvasElement {
      constructor(w = 64, h = 16) { this.width = w; this.height = h; }
      get pixels() { return this.store ||= new Uint8ClampedArray(this.width * this.height * 4).fill(200); }
      getContext() { return new CanvasRenderingContext2D(this); }
      toDataURL() { return this.pixels.join(); }
    }
    var document = { createElement: () => new HTMLCanvasElement() };
    // Browser interfaces are properties of window; class declarations here are not
    Object.assign(window, { Navigator, CanvasRenderingContext2D, HTMLCanvasElement });
  `, page);
  const asked = [];
  const sandboxRequire = () => ({
    ipcRenderer: { sendSync: (channel) => { asked.push(channel); return config; } },
    webFrame: { executeJavaScript: async (code) => vm.runInContext(code, page) }
  });
  const preload = vm.createContext({ require: sandboxRequire, window: { location: { protocol } }, console });
  vm.runInContext(read('src/preload/fingerprint.js'), preload);
  return { run: (code) => vm.runInContext(code, page), asked };
}

describe('Issue #12: anti-fingerprinting preload', () => {
  it('reports a common core count', () => {
    assert.equal(runPreload({ fingerprint: true, seed: 5 }).run('navigator.hardwareConcurrency'), 4);
    assert.equal(runPreload({ fingerprint: true, seed: 5 }, { cores: 2 }).run('navigator.hardwareConcurrency'), 2);
  });

  it('noises exports and reads, stably, without changing the canvas', () => {
    const { run } = runPreload({ fingerprint: true, seed: 5 });
    run('var c = new HTMLCanvasElement(); var clean = c.pixels.join()');
    assert.equal(run('c.toDataURL() !== clean'), true);
    assert.equal(run('c.toDataURL() === c.toDataURL()'), true);
    assert.equal(run('c.pixels.join() === clean'), true, 'the visible canvas is untouched');
    assert.equal(run('Math.max(...c.getContext().getImageData(0, 0, 64, 16).data.map(v => Math.abs(v - 200)))'), 1);
    // A part read on its own matches the same part of a full read
    assert.equal(run(`(() => {
      const full = c.getContext().getImageData(0, 0, 64, 16).data, part = c.getContext().getImageData(20, 3, 30, 5).data;
      for (let r = 0; r < 5; r++) for (let i = 0; i < 120; i++) if (part[r * 120 + i] !== full[(r + 3) * 256 + 80 + i]) return false;
      return true;
    })()`), true);
  });

  it('differs between seeds', () => {
    const exportOf = (seed) => runPreload({ fingerprint: true, seed }).run('new HTMLCanvasElement().toDataURL()');
    assert.notEqual(exportOf(1), exportOf(2));
  });

  it('keeps replaced functions looking like the originals', () => {
    const { run } = runPreload({ fingerprint: true, seed: 5 });
    assert.equal(run('HTMLCanvasElement.prototype.toDataURL.name'), 'toDataURL');
    assert.equal(run('HTMLCanvasElement.prototype.toDataURL.toString()'), 'toDataURL() { return this.pixels.join(); }');
  });

  it('changes nothing when off, and never asks on the browser’s own pages', () => {
    assert.equal(runPreload({ fingerprint: false }).run('navigator.hardwareConcurrency'), 12);
    const local = runPreload({ fingerprint: true, seed: 5 }, { protocol: 'file:' });
    assert.equal(local.run('navigator.hardwareConcurrency'), 12);
    assert.deepEqual(local.asked, []);
  });
});

describe('Issue #12: wiring', () => {
  it('gives every session the preload, and frames too, without giving pages Node', () => {
    assert.match(main, /ses\.setPreloads\(\[\.\.\.ses\.getPreloads\(\), fingerprintPreload\]\)/);
    assert.match(main, /nodeIntegrationInSubFrames = true/);
    assert.doesNotMatch(main, /webPreferences\.(nodeIntegration|contextIsolation|sandbox) = /);
  });

  it('sets the WebRTC policy on tabs and again when settings change', () => {
    assert.match(main, /setWebRTCIPHandlingPolicy\(privacy\.webrtcPolicy\(url\)\)/);
    for (const channel of ['set-privacy-options', 'toggle-shields', 'set-site-shields']) {
      const handler = main.slice(main.indexOf(`ipcMain.on('${channel}'`));
      assert.match(handler.slice(0, handler.indexOf('\n});')), /refreshWebRtcPolicy\(\)/, channel);
    }
  });

  it('sends the switches before the first tab opens, and keeps windows in step', () => {
    const sent = renderer.indexOf('\nsendPrivacyOptions();');
    assert.ok(sent > -1 && sent < renderer.indexOf('\ncreateTab(getStartPageURL());'));
    assert.match(renderer, /Object\.entries\(PRIVACY_SWITCHES\)\.map/);
  });
});
