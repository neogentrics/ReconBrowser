import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('--- VERIFYING V1.8.0 BUG FIXES & ENHANCEMENTS ---');

// 1. History in dedicated tab
const historyHtmlPath = path.join(rootDir, 'src/renderer/history.html');
assert.ok(fs.existsSync(historyHtmlPath), 'src/renderer/history.html must exist');
const historyHtml = fs.readFileSync(historyHtmlPath, 'utf8');
assert.ok(historyHtml.includes('input-history-filter'), 'history.html must contain search filter input');
assert.ok(historyHtml.includes('btn-page-clear-history'), 'history.html must contain clear history button');
assert.ok(historyHtml.includes('RECON_HISTORY_REQ:LOAD:'), 'history.html must bridge history data via console messages');
assert.ok(historyHtml.includes('renderHistoryData'), 'history.html must define renderHistoryData');

const rendererJs = fs.readFileSync(path.join(rootDir, 'src/renderer/renderer.js'), 'utf8');
assert.ok(rendererJs.includes('getHistoryPageURL'), 'renderer.js must define getHistoryPageURL');
assert.ok(rendererJs.includes('openHistoryTab'), 'renderer.js must define openHistoryTab');
assert.ok(rendererJs.includes('RECON_HISTORY_REQ:LOAD:'), 'renderer.js must handle RECON_HISTORY_REQ:LOAD:');
assert.ok(rendererJs.includes('recon://history'), 'renderer.js must recognize recon://history');

// 2. Audio Grabber Drawer fixes
const styleCss = fs.readFileSync(path.join(rootDir, 'src/renderer/style.css'), 'utf8');
assert.ok(styleCss.includes('#audio-grabber-drawer'), 'style.css must style #audio-grabber-drawer');
assert.ok(styleCss.includes('.inspector-drawer-hidden'), 'style.css must define .inspector-drawer-hidden');

const indexHtml = fs.readFileSync(path.join(rootDir, 'src/renderer/index.html'), 'utf8');
assert.ok(indexHtml.includes('id="audio-grabber-drawer" class="inspector-drawer-hidden" style="display: none;"'), 'audio-grabber-drawer must start with display:none in index.html');

// 3. Settings Modal responsiveness
assert.ok(styleCss.includes('width: min(1040px, 88vw);'), 'style.css must have responsive width for .settings-modal');
assert.ok(styleCss.includes('height: min(780px, 84vh);'), 'style.css must have responsive height for .settings-modal');

// 4. Multi-app detection
const mainIndexJs = fs.readFileSync(path.join(rootDir, 'src/main/index.js'), 'utf8');
assert.ok(mainIndexJs.includes('RECON_APP_CATALOG'), 'main/index.js must define RECON_APP_CATALOG');
assert.ok(mainIndexJs.includes('rt-story-tracker'), 'catalog must include rt-story-tracker');
assert.ok(mainIndexJs.includes('rt-markdown-reader'), 'catalog must include rt-markdown-reader');
assert.ok(mainIndexJs.includes('rt-author-desk'), 'catalog must include rt-author-desk');
assert.ok(mainIndexJs.includes('rt-audio-studio'), 'catalog must include rt-audio-studio');
assert.ok(mainIndexJs.includes('rt-press'), 'catalog must include rt-press');

console.log('ALL V1.8.0 BUG FIX CHECKS PASSED! ✅');
