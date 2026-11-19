import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ContainerManager, DEFAULT_CONTAINERS } = require('../src/main/containers.js');

test('ContainerManager: Default containers initialization and partition keys', (t) => {
  const tmpDir = path.join(os.tmpdir(), `recon_test_containers_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const testJson = path.join(tmpDir, 'recon_containers.json');

  const mgr = new ContainerManager(testJson);
  const all = mgr.getAll();

  assert.equal(all.length, 6);
  assert.equal(all[0].id, 'default');
  assert.equal(all[1].id, 'research');
  assert.equal(all[2].id, 'work');
  assert.equal(all[3].id, 'personal');
  assert.equal(all[4].id, 'finance');
  assert.equal(all[5].id, 'social');

  // Verify partition keys
  assert.equal(mgr.getPartitionKey('default'), 'persist:recon_default');
  assert.equal(mgr.getPartitionKey('research'), 'persist:recon_container_research');
  assert.equal(mgr.getPartitionKey('work'), 'persist:recon_container_work');

  // Verify ephemeral partition key is in-memory (no "persist:")
  const ephemKey1 = mgr.getPartitionKey('ephemeral', true);
  const ephemKey2 = mgr.getPartitionKey('default', true);
  assert.ok(ephemKey1.startsWith('recon_ephemeral_'));
  assert.ok(!ephemKey1.startsWith('persist:'));
  assert.ok(ephemKey2.startsWith('recon_ephemeral_'));
  assert.notEqual(ephemKey1, ephemKey2, 'Ephemeral partition keys should be cryptographically unique');

  // Clean up
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

test('ContainerManager: CRUD operations and persistence', (t) => {
  const tmpDir = path.join(os.tmpdir(), `recon_test_containers_crud_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const testJson = path.join(tmpDir, 'recon_containers.json');

  const mgr = new ContainerManager(testJson);

  // 1. Create custom container
  const created = mgr.saveContainer({
    name: 'Tor Recon',
    icon: '🧅',
    color: '#8b5cf6',
    proxy: 'socks5://127.0.0.1:9050'
  });

  assert.ok(created.id.startsWith('custom_'));
  assert.equal(created.name, 'Tor Recon');
  assert.equal(created.icon, '🧅');
  assert.equal(created.proxy, 'socks5://127.0.0.1:9050');

  // Check partition key for custom container
  const customPart = mgr.getPartitionKey(created.id);
  assert.equal(customPart, `persist:recon_container_${created.id}`);

  // 2. Update container
  const updated = mgr.saveContainer({
    id: created.id,
    name: 'Tor Recon Darknet',
    icon: '🧅',
    color: '#7c3aed',
    proxy: 'socks5://127.0.0.1:9150'
  });

  assert.equal(updated.name, 'Tor Recon Darknet');
  assert.equal(updated.proxy, 'socks5://127.0.0.1:9150');

  // Check reloading from disk preserves custom container
  const mgr2 = new ContainerManager(testJson);
  assert.equal(mgr2.getAll().length, 7);
  const found = mgr2.getContainer(created.id);
  assert.equal(found.name, 'Tor Recon Darknet');
  assert.equal(found.proxy, 'socks5://127.0.0.1:9150');

  // 3. Delete container
  const deleted = mgr2.deleteContainer(created.id);
  assert.equal(deleted, true);
  assert.equal(mgr2.getAll().length, 6);

  // Ensure default container cannot be deleted
  const deleteDefault = mgr2.deleteContainer('default');
  assert.equal(deleteDefault, false);
  assert.equal(mgr2.getAll().length, 6);

  // Clean up
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

test('ContainerManager: Ephemeral container lookup and wipe safety', async (t) => {
  const tmpDir = path.join(os.tmpdir(), `recon_test_containers_ephem_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const testJson = path.join(tmpDir, 'recon_containers.json');

  const mgr = new ContainerManager(testJson);
  const ephemInfo = mgr.getContainer('ephemeral');
  assert.equal(ephemInfo.id, 'ephemeral');
  assert.equal(ephemInfo.icon, '🔥');
  assert.equal(ephemInfo.isEphemeral, true);

  // Test wiping invalid/non-ephemeral partition returns false
  const res1 = await mgr.wipeEphemeralPartition('persist:recon_default');
  assert.equal(res1, false);

  const res2 = await mgr.wipeEphemeralPartition(null);
  assert.equal(res2, false);

  // Test wiping valid ephemeral partition key
  const validEphemKey = mgr.getPartitionKey('default', true);
  const res3 = await mgr.wipeEphemeralPartition(validEphemKey);
  assert.equal(res3, true);

  // Clean up
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});
