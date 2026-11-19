/**
 * Recon Browser v1.9.0 — Decentralized Gateway Test Suite
 * Validates IPFS resolution, gateway cascades, Gemini client parsing,
 * Gemtext conversion, and IPC handler registration.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Recon Browser v1.9.0 — Decentralized Gateway Suite', () => {

  it('1. IPFSManager parses URIs and paths correctly', async () => {
    const { IPFSManager, DEFAULT_GATEWAYS } = await import('../src/main/ipfs.js');
    const ipfs = new IPFSManager();

    // Standard CID
    const parsed1 = ipfs.parseUri('ipfs://bafybeic5678/path/index.html');
    assert.strictEqual(parsed1.protocol, 'ipfs');
    assert.strictEqual(parsed1.target, 'bafybeic5678');
    assert.strictEqual(parsed1.subpath, '/path/index.html');
    assert.strictEqual(parsed1.fullPath, 'bafybeic5678/path/index.html');

    // IPNS URI
    const parsed2 = ipfs.parseUri('ipns://ipfs.io/blog');
    assert.strictEqual(parsed2.protocol, 'ipns');
    assert.strictEqual(parsed2.target, 'ipfs.io');
    assert.strictEqual(parsed2.subpath, '/blog');

    // Invalid URI returns null
    assert.strictEqual(ipfs.parseUri('https://google.com'), null);
    assert.strictEqual(ipfs.parseUri(''), null);
  });

  it('2. IPFSManager resolves gateways with fallback cascades', async () => {
    const { IPFSManager } = await import('../src/main/ipfs.js');
    const ipfs = new IPFSManager();

    // Manual preferred gateway
    const cfResolved = await ipfs.resolveUrl('ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco', 'cloudflare');
    assert.strictEqual(cfResolved, 'https://cloudflare-ipfs.com/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco');

    const pinataResolved = await ipfs.resolveUrl('ipfs://bafytest', 'pinata');
    assert.strictEqual(pinataResolved, 'https://gateway.pinata.cloud/ipfs/bafytest');

    // Auto resolution with offline local daemon falls back to ipfs.io
    ipfs.localNodeActive = false;
    ipfs.lastChecked = Date.now();
    const autoResolved = await ipfs.resolveUrl('ipfs://bafytest', 'auto');
    assert(autoResolved.includes('ipfs.io/ipfs/bafytest') || autoResolved.includes('dweb.link/ipfs/bafytest'));

    // Gateway list returns items
    const list = ipfs.getGatewayList();
    assert(Array.isArray(list.ipfs) && list.ipfs.length >= 4);
    assert(Array.isArray(list.ipns) && list.ipns.length >= 2);
  });

  it('3. GeminiManager parses URLs and status descriptions', async () => {
    const { GeminiManager } = await import('../src/main/gemini.js');
    const gemini = new GeminiManager();

    const parsed1 = gemini.parseUrl('gemini://geminispace.info');
    assert.strictEqual(parsed1.protocol, 'gemini:');
    assert.strictEqual(parsed1.hostname, 'geminispace.info');
    assert.strictEqual(parsed1.port, '1965');

    const parsed2 = gemini.parseUrl('geminiprotocol.net/docs/');
    assert.strictEqual(parsed2.hostname, 'geminiprotocol.net');
    assert.strictEqual(parsed2.pathname, '/docs/');

    // Status descriptions
    assert(gemini.getStatusDescription(10).includes('Input'));
    assert(gemini.getStatusDescription(44).includes('Slow Down'));
    assert(gemini.getStatusDescription(51).includes('Not Found'));
    assert(gemini.getStatusDescription(60).includes('Client Certificate Required'));
  });

  it('4. GeminiManager converts Gemtext to high-contrast cyber HTML', async () => {
    const { GeminiManager } = await import('../src/main/gemini.js');
    const gemini = new GeminiManager();

    const sampleGemtext = [
      '# Gemini Capsule Title',
      '## Subtitle Header',
      '### Minor Section',
      'This is a regular descriptive paragraph.',
      '',
      '> Important sovereign quote',
      '* Item Alpha',
      '* Item Beta',
      '=> gemini://medusae.space Medusae Space Portal',
      '=> relative-page.gmi Relative Page Link',
      '```javascript',
      'const cyber = "recon";',
      'console.log(cyber);',
      '```'
    ].join('\n');

    const html = gemini.parseGemtext(sampleGemtext, 'gemini://geminispace.info/home/');

    assert(html.includes('<h1 class="gemini-h1">Gemini Capsule Title</h1>'), 'Heading 1 missing');
    assert(html.includes('<h2 class="gemini-h2">Subtitle Header</h2>'), 'Heading 2 missing');
    assert(html.includes('<h3 class="gemini-h3">Minor Section</h3>'), 'Heading 3 missing');
    assert(html.includes('<p class="gemini-para">This is a regular descriptive paragraph.</p>'), 'Paragraph missing');
    assert(html.includes('<blockquote class="gemini-quote">Important sovereign quote</blockquote>'), 'Quote missing');
    assert(html.includes('<ul class="gemini-list">'), 'List wrapper missing');
    assert(html.includes('<li>Item Alpha</li>'), 'List item alpha missing');
    assert(html.includes('<li>Item Beta</li>'), 'List item beta missing');
    assert(html.includes('data-url="gemini://medusae.space"'), 'Gemini link target missing');
    assert(html.includes('Medusae Space Portal'), 'Gemini link label missing');
    assert(html.includes('gemini://geminispace.info/home/relative-page.gmi'), 'Relative link not resolved against base');
    assert(html.includes('<pre class="gemini-code-block"'), 'Code block pre missing');
    assert(html.includes('const cyber = &quot;recon&quot;;'), 'Code escaping missing');
  });

  it('5. IPC handlers and UI elements are registered for v1.9.0', () => {
    const indexJs = fs.readFileSync(path.join(rootDir, 'src/main/index.js'), 'utf8');
    assert(indexJs.includes("ipcMain.handle('ipfs:resolve'"), 'ipfs:resolve IPC missing');
    assert(indexJs.includes("ipcMain.handle('ipfs:check-local'"), 'ipfs:check-local IPC missing');
    assert(indexJs.includes("ipcMain.handle('gemini:fetch'"), 'gemini:fetch IPC missing');
    assert(indexJs.includes("ipcMain.handle('migration:audit'"), 'migration:audit IPC missing');

    const indexHtml = fs.readFileSync(path.join(rootDir, 'src/renderer/index.html'), 'utf8');
    assert(indexHtml.includes('data-tab="gateway"'), 'Gateway settings nav button missing');
    assert(indexHtml.includes('id="panel-gateway"'), 'Gateway settings panel missing');
    assert(indexHtml.includes('id="select-tab-sleep-timeout"'), 'Tab memory sleep timeout select missing');
    assert(indexHtml.includes('id="btn-hibernate-background-tabs"'), 'Hibernate tabs button missing');
    assert(indexHtml.includes('Version 1.9.0'), 'Version 1.9.0 in about panel missing');

    const pkgJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    assert.strictEqual(pkgJson.version, '1.9.0', 'package.json version is not 1.9.0');
  });

});
