import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { CompanionRailManager } from '../src/main/companion-rail.js';
import { AudioGrabberManager } from '../src/main/audio-grabber.js';

test('CompanionRailManager: CRUD notes and append research snippets', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recon-rail-test-'));
  const notesFile = path.join(tmpDir, 'companion_notes.json');
  const rail = new CompanionRailManager(notesFile);

  // 1. Initial note load
  const initial = rail.getAllNotes();
  assert.ok(initial.length >= 1, 'Should seed default note');

  // 2. Create new note
  const newNote = rail.saveNote({
    title: 'Chapter 1 Character Lore',
    content: '# Chapter 1 Lore\n\nInitial world notes.',
    tags: ['character', 'lore']
  });
  assert.equal(newNote.title, 'Chapter 1 Character Lore');
  assert.ok(newNote.id.startsWith('note_'));

  // 3. Append snippet
  const updated = rail.appendSnippet(newNote.id, {
    text: 'A cybernetic interface built for deep space communication.',
    sourceUrl: 'https://recontowers.com/lore/tech',
    sourceTitle: 'Recon Tech Index',
    author: 'Chief Architect',
    date: '2026-11-19'
  });

  assert.ok(updated.content.includes('> A cybernetic interface built for deep space communication.'));
  assert.ok(updated.content.includes('[Recon Tech Index](https://recontowers.com/lore/tech)'));
  assert.ok(updated.content.includes('*by Chief Architect*'));

  // 4. Update note
  rail.saveNote({
    id: newNote.id,
    title: 'Chapter 1 Lore (Revised)',
    content: updated.content + '\n\nAdditional text.'
  });
  const fetched = rail.getNote(newNote.id);
  assert.equal(fetched.title, 'Chapter 1 Lore (Revised)');

  // 5. Delete note
  rail.deleteNote(newNote.id);
  assert.equal(rail.getNote(newNote.id), null);

  // Cleanup
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

test('AudioGrabberManager: Detection buffer, MIME inferral and catalog management', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recon-audio-test-'));
  const grabber = new AudioGrabberManager(tmpDir);

  // 1. MIME and extension inferral
  assert.equal(grabber.inferMimeType('https://cdn.site.com/track.mp3'), 'audio/mpeg');
  assert.equal(grabber.inferMimeType('https://cdn.site.com/voice.wav?id=12'), 'audio/wav');
  assert.equal(grabber.inferMimeType('https://cdn.site.com/sfx.ogg'), 'audio/ogg');
  assert.equal(grabber.inferMimeType('https://cdn.site.com/podcast.m4a'), 'audio/aac');
  assert.equal(grabber.inferMimeType('https://cdn.site.com/theme.flac'), 'audio/flac');

  assert.equal(grabber.inferExtension('audio/wav', 'http://a.com/sound.wav'), '.wav');
  assert.equal(grabber.inferExtension('audio/mpeg', 'http://a.com/sound.mp3'), '.mp3');
  assert.equal(grabber.inferExtension('audio/aac', 'http://a.com/sound.m4a'), '.m4a');

  // 2. Tab detected media buffer
  const tabId = 42;
  grabber.recordDetectedMedia(tabId, {
    url: 'https://recontowers.com/audio/sample_1.mp3',
    title: 'Sample Track 1'
  });
  grabber.recordDetectedMedia(tabId, {
    url: 'https://recontowers.com/audio/sample_2.wav',
    title: 'Sample Track 2'
  });

  const detected = grabber.getDetectedMedia(tabId);
  assert.equal(detected.length, 2);
  assert.equal(detected[0].title, 'Sample Track 1');
  assert.equal(detected[1].mimeType, 'audio/wav');

  // Clear detected media
  grabber.clearDetectedMedia(tabId);
  assert.equal(grabber.getDetectedMedia(tabId).length, 0);

  // 3. Catalog management
  const mockCatalog = [
    {
      id: 'clip_test_1',
      title: 'Soundscape Ambient',
      filename: 'Soundscape_Ambient.mp3',
      filePath: path.join(tmpDir, 'audio_studio_clips', 'Soundscape_Ambient.mp3'),
      sizeBytes: 1048576,
      createdAt: Date.now()
    }
  ];
  grabber.saveCatalog(mockCatalog);
  assert.equal(grabber.getSavedClips().length, 1);
  assert.equal(grabber.getSavedClips()[0].title, 'Soundscape Ambient');

  grabber.deleteClip('clip_test_1');
  assert.equal(grabber.getSavedClips().length, 0);

  // Cleanup
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});
