/**
 * tests/test_v110_workspaces.mjs
 * Verification suite for Recon Browser v1.10.0 — Named Project Workspaces
 */

import { strict as assert } from 'assert';
import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const { WorkspaceManager } = require(join(root, 'src/main/workspaces.js'));

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

console.log('\n🗂️ Recon Browser v1.10.0 — Workspaces Test Suite\n');

const testDataDir = join(__dirname, '.test-workspaces-data');
if (fs.existsSync(testDataDir)) {
  fs.rmSync(testDataDir, { recursive: true, force: true });
}
fs.mkdirSync(testDataDir, { recursive: true });

test('WorkspaceManager initializes default workspaces when no file exists', () => {
  const wm = new WorkspaceManager(testDataDir);
  const list = wm.getAll();
  assert(Array.isArray(list));
  assert(list.length >= 4);
  assert(list.some(w => w.id === 'default' && w.name === 'Main'));
  assert(list.some(w => w.id === 'research' && w.name === 'Research'));
});

test('WorkspaceManager creates a new custom workspace', () => {
  const wm = new WorkspaceManager(testDataDir);
  const created = wm.create({ name: 'Novel Drafting', icon: '📖', color: '#3b82f6' });
  assert(created && created.id);
  assert.equal(created.name, 'Novel Drafting');
  assert.equal(created.icon, '📖');

  const list = wm.getAll();
  assert(list.some(w => w.id === created.id));
});

test('WorkspaceManager updates an existing workspace', () => {
  const wm = new WorkspaceManager(testDataDir);
  const created = wm.create({ name: 'Temp Project', icon: '⚡' });
  const updated = wm.update(created.id, { name: 'Super Project', icon: '🚀' });
  assert(updated);
  assert.equal(updated.name, 'Super Project');
  assert.equal(updated.icon, '🚀');
});

test('WorkspaceManager refuses to delete the default workspace', () => {
  const wm = new WorkspaceManager(testDataDir);
  const res = wm.delete('default');
  assert.equal(res.success, false, 'Default workspace must not be deletable');
  assert(wm.getAll().some(w => w.id === 'default'));
});

test('WorkspaceManager deletes a custom workspace and switches to default if active', () => {
  const wm = new WorkspaceManager(testDataDir);
  const created = wm.create({ name: 'To Delete', icon: '🗑️' });
  wm.setActive(created.id);
  assert.equal(wm.getActive().id, created.id);

  const res = wm.delete(created.id);
  assert.equal(res.success, true);
  assert.equal(wm.getActive().id, 'default');
  assert(!wm.getAll().some(w => w.id === created.id));
});

// Clean up
try {
  fs.rmSync(testDataDir, { recursive: true, force: true });
} catch {}

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
