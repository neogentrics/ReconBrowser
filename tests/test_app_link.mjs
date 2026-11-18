import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import crypto from 'node:crypto';
import {
  AppLink,
  LinkError,
  toPlainWords,
  documentName,
  validId,
  cleanName,
  sameKey
} from '../src/main/app-link.js';

test('AppLink helper utilities: validId, cleanName, documentName, sameKey', () => {
  assert.equal(validId('recon-browser'), true);
  assert.equal(validId('rt-story-tracker'), true);
  assert.equal(validId('rt-markdown-reader'), true);
  assert.equal(validId('INVALID_ID'), false);
  assert.equal(validId(''), false);
  assert.equal(validId(null), false);

  assert.equal(cleanName('RT Story Tracker\u0000\u0007'), 'RT Story Tracker');
  assert.equal(cleanName('   Clean App   '), 'Clean App');
  assert.equal(cleanName('', 'Fallback'), 'Fallback');

  assert.equal(documentName('lore/character.md'), 'character.md');
  assert.equal(documentName('chapter-1'), 'chapter-1.md');
  assert.equal(documentName(''), 'Sent document.md');

  const key1 = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const key2 = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const key3 = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
  assert.equal(sameKey(key1, key2), true);
  assert.equal(sameKey(key1, key3), false);
  assert.equal(sameKey(key1, null), false);
});

test('AppLink plain language translation: toPlainWords handles all App Link response codes', () => {
  assert.equal(
    toPlainWords(new LinkError('busy', 'Too many waiting'), 'RT Story Tracker'),
    'RT Story Tracker is busy (20 clips are already waiting in its inbox). Please review or clear them in RT Story Tracker first.'
  );

  assert.equal(
    toPlainWords(new LinkError('not_linked', 'Not linked'), 'RT Story Tracker'),
    'RT Story Tracker is not linked yet. Please approve the link in that app first.'
  );

  assert.equal(
    toPlainWords(new LinkError('not_allowed', 'Locked project'), 'RT Story Tracker'),
    'RT Story Tracker refused the clip (for example, the active project is password-locked).'
  );

  assert.equal(
    toPlainWords(new LinkError('declined', 'Declined'), 'RT Markdown Reader'),
    'The link request was declined in RT Markdown Reader.'
  );

  assert.equal(
    toPlainWords(new LinkError('timed_out', 'Timed out'), 'RT Story Tracker'),
    'RT Story Tracker did not answer in time.'
  );

  assert.equal(
    toPlainWords(new LinkError('not_running', 'Not running'), 'RT Story Tracker'),
    'RT Story Tracker is not currently running.'
  );

  assert.equal(
    toPlainWords(new LinkError('too_big', 'Too big'), 'RT Story Tracker'),
    'The clip is too large to send over App Link (maximum 8 MB).'
  );
});

test('AppLink end-to-end: discovery, pairing, and sending research clip with fake receiver', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recon-applink-test-'));
  const sharedDir = path.join(tmpDir, 'shared');
  const browserDir = path.join(tmpDir, 'browser');
  const receiverDir = path.join(tmpDir, 'receiver');

  fs.mkdirSync(sharedDir, { recursive: true });
  fs.mkdirSync(browserDir, { recursive: true });
  fs.mkdirSync(receiverDir, { recursive: true });

  const receiverEndpoint = process.platform === 'win32'
    ? `\\\\.\\pipe\\rt-test-receiver-${Date.now()}`
    : path.join(receiverDir, 'receiver.sock');

  // Stored state for fake receiver
  const receiverKey = 'a'.repeat(64);
  let receiverMode = 'normal';
  const receivedClips = [];

  // Spin up fake App Link receiver (simulating RT Story Tracker)
  const receiverServer = net.createServer((sock) => {
    let buf = '';
    sock.setEncoding('utf8');
    sock.on('data', (chunk) => {
      buf += chunk;
      const at = buf.indexOf('\n');
      if (at < 0) return;
      const line = buf.slice(0, at);
      buf = buf.slice(at + 1);

      const req = JSON.parse(line);
      let reply;

      if (req.method === 'hello') {
        reply = { id: req.id, result: { protocol: 1, app: 'rt-story-tracker', name: 'RT Story Tracker', version: '3.7.1', accepts: ['markdown', 'text'] } };
      } else if (req.method === 'pair') {
        if (receiverMode === 'decline') {
          reply = { id: req.id, error: { code: 'declined', message: 'The link was declined.' } };
        } else {
          reply = { id: req.id, result: { key: receiverKey, app: 'rt-story-tracker', name: 'RT Story Tracker' } };
        }
      } else if (req.method === 'open_document') {
        if (receiverMode === 'busy') {
          reply = { id: req.id, error: { code: 'busy', message: 'Too many documents are waiting. Deal with those first.' } };
        } else if (receiverMode === 'locked') {
          reply = { id: req.id, error: { code: 'not_allowed', message: 'Password-locked documents can’t be opened this way.' } };
        } else {
          receivedClips.push(req.params);
          reply = { id: req.id, result: { opened: true } };
        }
      }

      sock.write(`${JSON.stringify(reply)}\n`);
    });
  });

  await new Promise((resolve) => receiverServer.listen(receiverEndpoint, resolve));

  // Write receiver presence file
  const receiverPresenceFile = path.join(sharedDir, 'rt-story-tracker.json');
  fs.writeFileSync(receiverPresenceFile, JSON.stringify({
    protocol: 1,
    id: 'rt-story-tracker',
    name: 'RT Story Tracker',
    version: '3.7.1',
    endpoint: receiverEndpoint
  }));

  // Create Recon Browser AppLink client
  let memoryLinks = {};
  const browserClient = new AppLink({
    folder: sharedDir,
    dataDir: browserDir,
    version: '1.3.0',
    load: () => memoryLinks,
    save: (l) => { memoryLinks = l; },
    ask: async () => true,
    open: async () => {},
    platform: process.platform
  });

  await browserClient.start();

  try {
    // 1. Verify Recon Browser wrote presence file
    assert.equal(browserClient.running, true);
    assert.equal(fs.existsSync(path.join(sharedDir, 'recon-browser.json')), true);

    // 2. Discover running apps
    const foundApps = await browserClient.found();
    assert.equal(foundApps.length, 1);
    assert.equal(foundApps[0].id, 'rt-story-tracker');
    assert.equal(foundApps[0].name, 'RT Story Tracker');

    // 3. Check list before pairing
    const listBefore = await browserClient.list();
    assert.equal(listBefore[0].linked, false);
    assert.equal(listBefore[0].running, true);

    // 4. Pair with RT Story Tracker
    const pairResult = await browserClient.pairWith('rt-story-tracker');
    assert.equal(pairResult.id, 'rt-story-tracker');
    assert.equal(memoryLinks['rt-story-tracker'].key, receiverKey);

    // 5. Check list after pairing
    const listAfter = await browserClient.list();
    assert.equal(listAfter[0].linked, true);
    assert.equal(listAfter[0].running, true);

    // 6. Send a research clip
    const testClip = {
      name: 'ancient-aqueducts.md',
      text: '---\nsource_title: Ancient Aqueducts\ncategory: historical\n---\n# Ancient Aqueducts\n\nGravity-fed water systems.'
    };

    const sendRes = await browserClient.sendClip('rt-story-tracker', testClip);
    assert.equal(sendRes.name, 'RT Story Tracker');
    assert.equal(sendRes.result.opened, true);

    // Verify receiver received kind: "research" and clean text with no attachments
    assert.equal(receivedClips.length, 1);
    assert.equal(receivedClips[0].app, 'recon-browser');
    assert.equal(receivedClips[0].key, receiverKey);
    assert.equal(receivedClips[0].name, 'ancient-aqueducts.md');
    assert.equal(receivedClips[0].kind, 'research');
    assert.equal(receivedClips[0].attachments, undefined);
    assert.ok(receivedClips[0].text.includes('Gravity-fed water systems.'));

    // 7. Test busy error (20 clips waiting)
    receiverMode = 'busy';
    await assert.rejects(
      async () => { await browserClient.sendClip('rt-story-tracker', testClip); },
      (err) => err instanceof LinkError && err.code === 'busy'
    );

    // 8. Test locked project error
    receiverMode = 'locked';
    await assert.rejects(
      async () => { await browserClient.sendClip('rt-story-tracker', testClip); },
      (err) => err instanceof LinkError && err.code === 'not_allowed'
    );

  } finally {
    await browserClient.stop();
    await new Promise((resolve) => receiverServer.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
