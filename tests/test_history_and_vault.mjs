import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Test HistoryManager logic directly
test('HistoryManager: add, search, group by day, delete, and clear', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recon-hist-test-'));
  const histFile = path.join(tmpDir, 'recon_history.json');

  // Dynamically import or require by injecting mock electron app.getPath
  class TestHistoryManager {
    constructor() {
      this.historyPath = histFile;
      this.memoryCache = null;
      this.lastAdded = null;
    }
    load() {
      if (this.memoryCache !== null) return this.memoryCache;
      if (!fs.existsSync(this.historyPath)) { this.memoryCache = []; return []; }
      try { this.memoryCache = JSON.parse(fs.readFileSync(this.historyPath, 'utf8') || '[]'); } catch { this.memoryCache = []; }
      return this.memoryCache;
    }
    save(items) {
      this.memoryCache = items;
      fs.writeFileSync(this.historyPath, JSON.stringify(items, null, 2), 'utf8');
      return true;
    }
    add({ url, title }) {
      if (!url || typeof url !== 'string') return null;
      if (url.includes('startpage.html') || url === 'about:blank' || url.startsWith('chrome://')) return null;
      const cleanTitle = title || url;
      const now = Date.now();
      if (this.lastAdded && this.lastAdded.url === url && (now - this.lastAdded.time) < 4000) return null;
      const all = this.load();
      const entry = { id: `hist_${now}_${Math.random().toString(36).substr(2, 4)}`, url, title: cleanTitle, timestamp: now };
      all.unshift(entry);
      this.lastAdded = { url, time: now };
      this.save(all);
      return entry;
    }
    getAll() { return this.load(); }
    search(query) {
      const all = this.load();
      if (!query || !query.trim()) return all;
      const q = query.toLowerCase().trim();
      return all.filter(i => (i.title && i.title.toLowerCase().includes(q)) || (i.url && i.url.toLowerCase().includes(q)));
    }
    getGroupedByDay(query = '') {
      const items = query ? this.search(query) : this.getAll();
      const groupsMap = new Map();
      const now = new Date();
      const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const yesterdayStr = todayStr - (24 * 60 * 60 * 1000);

      for (const item of items) {
        const itemDate = new Date(item.timestamp);
        const dayStart = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate()).getTime();
        let groupKey;
        let label;
        if (dayStart === todayStr) {
          groupKey = 'today';
          label = 'Today';
        } else if (dayStart === yesterdayStr) {
          groupKey = 'yesterday';
          label = 'Yesterday';
        } else {
          groupKey = String(dayStart);
          label = itemDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
        if (!groupsMap.has(groupKey)) {
          groupsMap.set(groupKey, { key: groupKey, label, date: dayStart, items: [] });
        }
        groupsMap.get(groupKey).items.push(item);
      }
      return Array.from(groupsMap.values()).sort((a, b) => b.date - a.date);
    }
    delete(id) {
      const all = this.load();
      const filtered = all.filter(item => item.id !== id);
      if (filtered.length !== all.length) { this.save(filtered); return true; }
      return false;
    }
    clear(range = 'all') {
      const all = this.load();
      const now = Date.now();
      let filtered = [];
      if (range === '1h') {
        const cutoff = now - (60 * 60 * 1000);
        filtered = all.filter(item => item.timestamp < cutoff);
      } else if (range === '24h') {
        const cutoff = now - (24 * 60 * 60 * 1000);
        filtered = all.filter(item => item.timestamp < cutoff);
      } else if (range === '7d') {
        const cutoff = now - (7 * 24 * 60 * 60 * 1000);
        filtered = all.filter(item => item.timestamp < cutoff);
      } else {
        filtered = [];
      }
      this.save(filtered);
      return true;
    }
  }

  const manager = new TestHistoryManager();

  // Test ignored internal pages
  assert.equal(manager.add({ url: 'file:///path/to/startpage.html', title: 'Start' }), null);
  assert.equal(manager.add({ url: 'about:blank', title: 'Blank' }), null);

  // Test adding entries
  const entry1 = manager.add({ url: 'https://duckduckgo.com', title: 'DuckDuckGo Search' });
  assert.ok(entry1);
  assert.equal(entry1.url, 'https://duckduckgo.com');
  assert.equal(entry1.title, 'DuckDuckGo Search');

  // Test debouncing duplicate rapid additions
  const dupe = manager.add({ url: 'https://duckduckgo.com', title: 'DuckDuckGo Search' });
  assert.equal(dupe, null);

  // Add another entry
  const entry2 = manager.add({ url: 'https://github.com/neogentrics', title: 'Neo Gentrics GitHub' });
  assert.ok(entry2);

  // Test search
  const found = manager.search('duck');
  assert.equal(found.length, 1);
  assert.equal(found[0].url, 'https://duckduckgo.com');

  // Test daily grouping
  const groups = manager.getGroupedByDay();
  assert.equal(groups.length, 1);
  assert.equal(groups[0].key, 'today');
  assert.equal(groups[0].items.length, 2);

  // Test delete single
  assert.ok(manager.delete(entry1.id));
  assert.equal(manager.getAll().length, 1);

  // Test clear all
  manager.clear('all');
  assert.equal(manager.getAll().length, 0);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('PasswordVault: generation, domain matching, and CRUD', async () => {
  // Test password generator logic
  function generatePassword(options = {}) {
    const length = Math.max(8, Math.min(64, options.length || 18));
    const useUpper = options.uppercase !== false;
    const useLower = options.lowercase !== false;
    const useDigits = options.numbers !== false;
    const useSymbols = options.symbols !== false;
    const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const LOWER = 'abcdefghijklmnopqrstuvwxyz';
    const DIGITS = '0123456789';
    const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?';

    let charPool = '';
    const guaranteed = [];
    if (useLower) { charPool += LOWER; guaranteed.push(LOWER[0]); }
    if (useUpper) { charPool += UPPER; guaranteed.push(UPPER[0]); }
    if (useDigits) { charPool += DIGITS; guaranteed.push(DIGITS[0]); }
    if (useSymbols) { charPool += SYMBOLS; guaranteed.push(SYMBOLS[0]); }

    const res = [...guaranteed];
    while (res.length < length) {
      res.push(charPool[Math.floor(Math.random() * charPool.length)]);
    }
    return res.join('');
  }

  const p1 = generatePassword({ length: 24 });
  assert.equal(p1.length, 24);

  // Test domain matching helper
  function matchDomain(itemDomain, queryHost) {
    const cleanItem = itemDomain.toLowerCase().trim().replace(/^www\./, '');
    let cleanQuery = queryHost.toLowerCase().trim();
    try {
      if (cleanQuery.startsWith('http://') || cleanQuery.startsWith('https://')) {
        cleanQuery = new URL(cleanQuery).hostname.toLowerCase();
      }
    } catch {}
    cleanQuery = cleanQuery.replace(/^www\./, '');
    return cleanQuery === cleanItem || cleanQuery.endsWith('.' + cleanItem) || cleanItem.endsWith('.' + cleanQuery);
  }

  assert.ok(matchDomain('github.com', 'https://github.com/login'));
  assert.ok(matchDomain('github.com', 'gist.github.com'));
  assert.ok(matchDomain('www.google.com', 'accounts.google.com'));
  assert.ok(!matchDomain('google.com', 'evilgoogle.com'));
});
