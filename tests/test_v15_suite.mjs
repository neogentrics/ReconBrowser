import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { exportBookmarksToHtml, parseBookmarksHtml, exportVaultToCsv, parseVaultCsv } from '../src/main/importer-exporter.js';
import { SyncManager } from '../src/main/sync.js';
import { ShieldsManager } from '../src/main/shields2.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Universal Netscape Bookmarks HTML Export & Import', () => {
  const sampleBookmarks = [
    { id: '1', title: 'DuckDuckGo', url: 'https://duckduckgo.com', folder: 'Search Engines', createdAt: 1600000000000 },
    { id: '2', title: 'Recon Towers', url: 'https://recontowers.com', folder: 'Recon Apps', createdAt: 1610000000000 },
    { id: '3', title: 'Brave Community', url: 'https://community.brave.com', folder: 'Privacy', createdAt: 1620000000000 }
  ];

  const html = exportBookmarksToHtml(sampleBookmarks);
  assert.ok(html.includes('<!DOCTYPE NETSCAPE-Bookmark-file-1>'), 'Must produce Netscape standard header');
  assert.ok(html.includes('<H3'), 'Must contain H3 folder headers');
  assert.ok(html.includes('https://community.brave.com'), 'Must contain Brave bookmark link');

  const parsed = parseBookmarksHtml(html);
  assert.equal(parsed.length, 3, 'Must parse exactly 3 bookmarks');
  assert.equal(parsed[0].title, 'DuckDuckGo');
  assert.equal(parsed[0].url, 'https://duckduckgo.com');
  assert.equal(parsed[0].folder, 'Search Engines');
  assert.equal(parsed[2].title, 'Brave Community');
  assert.equal(parsed[2].folder, 'Privacy');

  // Test realistic Brave / Chrome bookmark HTML format
  const braveHtmlSample = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1670000000" LAST_MODIFIED="1670000100">Brave Bookmarks Bar</H3>
    <DL><p>
        <DT><A HREF="https://brave.com/shields/" ADD_DATE="1670000010">Brave Shields Overview</A>
        <DT><A HREF="https://github.com/neogentrics" ADD_DATE="1670000020">Neo Gentrics GitHub</A>
    </DL><p>
</DL><p>`;

  const braveParsed = parseBookmarksHtml(braveHtmlSample);
  assert.equal(braveParsed.length, 2);
  assert.equal(braveParsed[0].title, 'Brave Shields Overview');
  assert.equal(braveParsed[0].url, 'https://brave.com/shields/');
  assert.equal(braveParsed[0].folder, 'Brave Bookmarks Bar');
});

test('Universal Passwords CSV Export & Import (Bitwarden & Chrome format)', () => {
  const sampleLogins = [
    { domain: 'github.com', username: 'dev@neogentrics.com', password: 'SecretPassword!123', notes: 'Main dev account' },
    { domain: 'recontowers.com', username: 'admin', password: 'P@ssword2026', notes: 'Recon portal' }
  ];

  const csv = exportVaultToCsv(sampleLogins);
  assert.ok(csv.startsWith('url,username,password,notes'));
  assert.ok(csv.includes('github.com'));

  const parsed = parseVaultCsv(csv);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].domain, 'github.com');
  assert.equal(parsed[0].username, 'dev@neogentrics.com');
  assert.equal(parsed[0].password, 'SecretPassword!123');
  assert.equal(parsed[0].notes, 'Main dev account');

  // Test raw Bitwarden / 1Password / Chrome export sample
  const rawCsv = `name,url,username,password,notes
"GitHub","https://github.com/login","octocat@github.com","git_p@ss_999","SSH Key backup"
"Brave Community","https://community.brave.com","brave_user","shield_lock_42",""
`;
  const fromRaw = parseVaultCsv(rawCsv);
  assert.equal(fromRaw.length, 2);
  assert.equal(fromRaw[0].domain, 'github.com');
  assert.equal(fromRaw[0].username, 'octocat@github.com');
  assert.equal(fromRaw[0].password, 'git_p@ss_999');
  assert.equal(fromRaw[1].domain, 'community.brave.com');
  assert.equal(fromRaw[1].username, 'brave_user');
});

test('AES-256-GCM Encryption, Decryption & Scrypt Key Derivation', () => {
  const syncManager = new SyncManager();
  const passphrase = 'SuperSecretMasterPassphrase2026!';
  const originalData = {
    user: 'recon_user',
    vaultLogins: [{ domain: 'bank.com', pass: 'vault123' }],
    timestamp: Date.now()
  };

  const encrypted = syncManager.encryptPayload(originalData, passphrase);
  assert.ok(encrypted.salt && encrypted.iv && encrypted.tag && encrypted.ciphertext);

  const decrypted = syncManager.decryptPayload(encrypted, passphrase);
  assert.deepEqual(decrypted, originalData);

  // Wrong passphrase should throw authentication error
  assert.throws(() => {
    syncManager.decryptPayload(encrypted, 'WrongPassphrase!');
  });
});

test('Sync Union Merging Logic', () => {
  const syncManager = new SyncManager();
  const localData = {
    bookmarks: [
      { id: 'b1', url: 'https://duckduckgo.com', title: 'DuckDuckGo', folder: 'Search', createdAt: 100 }
    ],
    vault: [
      { domain: 'github.com', username: 'localuser', password: 'pass1', notes: '' }
    ],
    settings: { theme: 'cyber', engine: 'duckduckgo' }
  };

  const remoteData = {
    bookmarks: [
      { id: 'b2', url: 'https://recontowers.com', title: 'Recon Towers', folder: 'Recon', createdAt: 200 }
    ],
    vault: [
      { domain: 'github.com', username: 'localuser', password: 'pass1_updated', notes: 'updated' },
      { domain: 'brave.com', username: 'remoteuser', password: 'pass2', notes: '' }
    ],
    settings: { theme: 'slate', engine: 'duckduckgo' }
  };

  const merged = syncManager.mergeData(localData, remoteData);
  assert.equal(merged.bookmarks.length, 2, 'Should union bookmarks without duplicates');
  assert.equal(merged.vault.length, 2, 'Should merge vault by domain+username');
  assert.ok(merged.vault.some(v => v.domain === 'brave.com'));
});

test('Shields 2.0 Subscriptions and Element Zapper', () => {
  const shields = new ShieldsManager();
  assert.ok(shields.getSubscriptions());

  // Test custom domain zapper rules
  shields.addZapperRule('annoyingsite.com', '.cookie-banner');
  shields.addZapperRule('annoyingsite.com', '#newsletter-popup');

  const rules = shields.getZapperRulesForDomain('annoyingsite.com');
  assert.equal(rules.length, 2);
  assert.ok(rules.includes('.cookie-banner'));
  assert.ok(rules.includes('#newsletter-popup'));

  // Test removal
  shields.removeZapperRule('annoyingsite.com', '.cookie-banner');
  const remaining = shields.getZapperRulesForDomain('annoyingsite.com');
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0], '#newsletter-popup');
});
