/**
 * tests/test_v180_ollama.mjs
 * Verification suite for Recon Browser v1.8.0 — Recon AI (Ollama Integration)
 */

import { strict as assert } from 'assert';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

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

console.log('\n🤖 Recon Browser v1.8.0 — Ollama Integration Test Suite\n');

// ── 1. ollama.js exists and exports OllamaManager ──────────────────────────
console.log('1. ollama.js module');

test('src/main/ollama.js exists', () => {
  assert(existsSync(join(root, 'src/main/ollama.js')), 'ollama.js not found');
});

test('ollama.js exports OllamaManager class', async () => {
  const content = readFileSync(join(root, 'src/main/ollama.js'), 'utf-8');
  assert(content.includes('class OllamaManager'), 'OllamaManager class not found');
  assert(content.includes("module.exports = { OllamaManager }"), 'OllamaManager not exported');
});

test('ollama.js uses http module (not fetch/axios)', () => {
  const content = readFileSync(join(root, 'src/main/ollama.js'), 'utf-8');
  assert(content.includes("require('http')"), 'http module not used');
  assert(!content.includes("require('axios')"), 'axios should not be required');
  assert(!content.includes("require('node-fetch')"), 'node-fetch should not be required');
});

test('OllamaManager has checkConnection method', () => {
  const content = readFileSync(join(root, 'src/main/ollama.js'), 'utf-8');
  assert(content.includes('checkConnection'), 'checkConnection method missing');
});

test('OllamaManager has listModels method', () => {
  const content = readFileSync(join(root, 'src/main/ollama.js'), 'utf-8');
  assert(content.includes('listModels'), 'listModels method missing');
});

test('OllamaManager has summarize method', () => {
  const content = readFileSync(join(root, 'src/main/ollama.js'), 'utf-8');
  assert(content.includes('summarize'), 'summarize method missing');
});

test('OllamaManager has extractClaims method', () => {
  const content = readFileSync(join(root, 'src/main/ollama.js'), 'utf-8');
  assert(content.includes('extractClaims'), 'extractClaims method missing');
});

test('OllamaManager has askQuestion method', () => {
  const content = readFileSync(join(root, 'src/main/ollama.js'), 'utf-8');
  assert(content.includes('askQuestion'), 'askQuestion method missing');
});

test('OllamaManager has rewriteSelection method', () => {
  const content = readFileSync(join(root, 'src/main/ollama.js'), 'utf-8');
  assert(content.includes('rewriteSelection'), 'rewriteSelection method missing');
});

test('ollama.js uses 60-second timeout', () => {
  const content = readFileSync(join(root, 'src/main/ollama.js'), 'utf-8');
  assert(content.includes('60000') || content.includes('60 seconds'), 'timeout not set to 60s');
});

// ── 2. IPC handlers in index.js ───────────────────────────────────────────
console.log('\n2. IPC handlers in src/main/index.js');

const indexJs = readFileSync(join(root, 'src/main/index.js'), 'utf-8');

test("OllamaManager is required in index.js", () => {
  assert(indexJs.includes("require('./ollama')"), "require('./ollama') not found");
});

test("ollamaManager instance created in index.js", () => {
  assert(indexJs.includes('new OllamaManager()'), 'OllamaManager not instantiated');
});

test("ollama:check IPC handler registered", () => {
  assert(indexJs.includes("ipcMain.handle('ollama:check'"), "ollama:check handler missing");
});

test("ollama:list-models IPC handler registered", () => {
  assert(indexJs.includes("ipcMain.handle('ollama:list-models'"), "ollama:list-models handler missing");
});

test("ollama:summarize IPC handler registered", () => {
  assert(indexJs.includes("ipcMain.handle('ollama:summarize'"), "ollama:summarize handler missing");
});

test("ollama:extract-claims IPC handler registered", () => {
  assert(indexJs.includes("ipcMain.handle('ollama:extract-claims'"), "ollama:extract-claims handler missing");
});

test("ollama:ask IPC handler registered", () => {
  assert(indexJs.includes("ipcMain.handle('ollama:ask'"), "ollama:ask handler missing");
});

test("ollama:rewrite IPC handler registered", () => {
  assert(indexJs.includes("ipcMain.handle('ollama:rewrite'"), "ollama:rewrite handler missing");
});

// ── 3. index.html — UI elements ───────────────────────────────────────────
console.log('\n3. UI elements in src/renderer/index.html');

const html = readFileSync(join(root, 'src/renderer/index.html'), 'utf-8');

test('#btn-recon-ai button exists in index.html', () => {
  assert(html.includes('id="btn-recon-ai"'), '#btn-recon-ai not found');
});

test('#recon-ai-drawer exists in index.html', () => {
  assert(html.includes('id="recon-ai-drawer"'), '#recon-ai-drawer not found');
});

test('#panel-ai exists in index.html', () => {
  assert(html.includes('id="panel-ai"'), '#panel-ai not found');
});

test('#ai-model-select exists in index.html', () => {
  assert(html.includes('id="ai-model-select"'), '#ai-model-select not found');
});

test('Recon AI nav button (data-tab="ai") exists', () => {
  assert(html.includes('data-tab="ai"'), 'Settings nav button for AI not found');
});

test('Version is 1.8.0 in settings-about-version', () => {
  assert(html.includes('Version 1.8.0'), 'Version 1.8.0 not found in HTML');
});

test('Summarize tab panel exists', () => {
  assert(html.includes('id="ai-tab-summarize"'), 'Summarize tab panel missing');
});

test('Extract Claims tab panel exists', () => {
  assert(html.includes('id="ai-tab-claims"'), 'Claims tab panel missing');
});

test('Ask AI tab panel exists', () => {
  assert(html.includes('id="ai-tab-ask"'), 'Ask AI tab panel missing');
});

test('Rewrite tab panel exists', () => {
  assert(html.includes('id="ai-tab-rewrite"'), 'Rewrite tab panel missing');
});

// ── 4. CHANGELOG ─────────────────────────────────────────────────────────
console.log('\n4. CHANGELOG.md');

test('CHANGELOG.md contains [1.8.0] entry', () => {
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf-8');
  assert(changelog.includes('[1.8.0]'), '[1.8.0] not in CHANGELOG');
});

// ── 5. package.json version ───────────────────────────────────────────────
console.log('\n5. package.json');

test('package.json version is 1.8.0', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
  assert.equal(pkg.version, '1.8.0', `Expected 1.8.0, got ${pkg.version}`);
});

// ── 6. renderer.js ───────────────────────────────────────────────────────
console.log('\n6. renderer.js Recon AI code');

const rendererJs = readFileSync(join(root, 'src/renderer/renderer.js'), 'utf-8');

test('renderer.js references ollama:summarize', () => {
  assert(rendererJs.includes("ollama:summarize"), "ollama:summarize not in renderer.js");
});

test('renderer.js references ollama:extract-claims', () => {
  assert(rendererJs.includes("ollama:extract-claims"), "ollama:extract-claims not in renderer.js");
});

test('renderer.js references ollama:ask', () => {
  assert(rendererJs.includes("ollama:ask"), "ollama:ask not in renderer.js");
});

test('renderer.js references ollama:rewrite', () => {
  assert(rendererJs.includes("ollama:rewrite"), "ollama:rewrite not in renderer.js");
});

test('renderer.js has Ctrl+Shift+I shortcut for Recon AI', () => {
  assert(rendererJs.includes("Ctrl+Shift+I") || (rendererJs.includes("shiftKey") && rendererJs.includes("key === 'I'")), "Ctrl+Shift+I shortcut not found");
});

// ── 7. ROADMAP updated ───────────────────────────────────────────────────
console.log('\n7. docs/ROADMAP.md');

test('ROADMAP.md marks v1.8.0 as Live', () => {
  const roadmap = readFileSync(join(root, 'docs/ROADMAP.md'), 'utf-8');
  assert(roadmap.includes('v1.8.0') && roadmap.includes('✅ Live'), 'v1.8.0 not marked as Live in ROADMAP');
});

// ── Summary ───────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n⚠️  ${failed} test(s) failed.`);
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed! Recon Browser v1.8.0 — Ollama integration verified.\n');
}
