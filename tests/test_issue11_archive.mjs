import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { ArchiveManager, tabToArchive } = require('../src/main/archive.js');
const { SpotlightManager } = require('../src/main/spotlight.js');
const main = fs.readFileSync(path.join(root, 'src/main/index.js'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'src/renderer/renderer.js'), 'utf8');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rb-archive-'));
after(() => fs.rmSync(dir, { recursive: true, force: true }));

const window = { id: 1 };
const fakeTab = (over = {}) => ({
  isDestroyed: () => false,
  getType: () => 'webview',
  hostWebContents: window,
  getTitle: () => 'Archive Me',
  getURL: () => 'https://example.org/article',
  savePage: async (file, format) => fs.writeFileSync(file, `saved as ${format}`),
  ...over
});

describe('Issue #11: Save to Offline Archive', () => {
  it('writes the .reconarchive file and records it', async () => {
    const archives = new ArchiveManager(dir);
    const entry = await archives.savePageArchive(tabToArchive(fakeTab(), window), { title: 'Archive Me', url: 'https://example.org/article' });
    assert.ok(entry.filePath.endsWith('.reconarchive'));
    assert.equal(fs.readFileSync(entry.filePath, 'utf8'), 'saved as MHTML');
    assert.ok(entry.fileSizeBytes > 0);
    assert.equal(new ArchiveManager(dir).getAll()[0].id, entry.id);
  });

  it('only archives a tab that belongs to the window asking', () => {
    assert.throws(() => tabToArchive(null, window), /not found/);
    assert.throws(() => tabToArchive(fakeTab({ hostWebContents: { id: 2 } }), window), /not found/);
    assert.throws(() => tabToArchive(fakeTab({ getType: () => 'window', hostWebContents: null }), window), /not found/);
    assert.throws(() => tabToArchive(fakeTab({ isDestroyed: () => true }), window), /not found/);
  });

  it('opens a saved page through an .mhtml copy, and delete removes both', async () => {
    const archives = new ArchiveManager(dir);
    const entry = await archives.savePageArchive(fakeTab(), {});
    const copy = archives.prepareForViewing(entry.id);
    assert.equal(path.extname(copy), '.mhtml');
    assert.equal(fs.readFileSync(copy, 'utf8'), fs.readFileSync(entry.filePath, 'utf8'));
    archives.delete(entry.id);
    assert.ok(!fs.existsSync(copy) && !fs.existsSync(entry.filePath));
    assert.throws(() => archives.prepareForViewing(entry.id), /no longer there/);
  });

  it('shows up in Spotlight with the id needed to open it', async () => {
    const archives = new ArchiveManager(dir);
    const entry = await archives.savePageArchive(fakeTab(), { title: 'Quokka field notes' });
    const spotlight = new SpotlightManager({ archiveManager: archives });
    const hit = (await spotlight.search('quokka', {})).find(r => r.type === 'archive');
    assert.equal(hit?.archiveId, entry.id);
  });

  it('finds the tab by its id, not through the default session', () => {
    assert.doesNotMatch(main, /defaultSession\.getAllWebContents/);
    assert.match(renderer, /archive:save-active-tab', \{\s*webContentsId: tab\.webviewEl\.getWebContentsId\(\),/);
  });

  it('lists archives using the fields that are saved', () => {
    const list = renderer.slice(renderer.indexOf('async function loadAndRenderArchives'), renderer.indexOf('if (btnArchivePage)'));
    assert.match(list, /item\.savedAt/);
    assert.match(list, /item\.fileSizeBytes/);
    assert.doesNotMatch(list, /item\.(createdAt|sizeBytes|domain)\b/);
  });
});
