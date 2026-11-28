import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { cleanUserAgent } = require('../src/main/user-agent.js');
const main = fs.readFileSync(path.join(root, 'src/main/index.js'), 'utf8');

// What a tab reported in v1.10.0
const REPORTED = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ReconBrowser/1.10.0 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36';
const PLAIN = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

describe('Issue #10: clean user agent', () => {
  it('turns the reported user agent into a plain Chrome one', () => {
    assert.equal(cleanUserAgent(REPORTED), PLAIN);
  });

  it('removes the app token however the app name is written', () => {
    for (const token of ['recon-browser/1.10.0', 'Recon Browser/2.0.0', 'ReconBrowser/1.10.1']) {
      assert.equal(cleanUserAgent(REPORTED.replace('ReconBrowser/1.10.0', token)), PLAIN, token);
    }
  });

  it('leaves a clean user agent alone and keeps the platform part', () => {
    assert.equal(cleanUserAgent(PLAIN), PLAIN);
    const windows = REPORTED.replace('X11; Linux x86_64', 'Windows NT 10.0; Win64; x64');
    assert.match(cleanUserAgent(windows), /\(Windows NT 10\.0; Win64; x64\)/);
  });

  it('is set as the default for all sessions before the app is ready', () => {
    const set = main.indexOf('app.userAgentFallback = cleanUserAgent(app.userAgentFallback)');
    assert.ok(set > -1);
    assert.ok(set < main.indexOf('app.whenReady()'));
    // Managers create tab sessions when constructed, so the default must come first
    assert.ok(set < main.indexOf('new ContainerManager()'));
    assert.doesNotMatch(main, /setUserAgent\(/);
  });
});
