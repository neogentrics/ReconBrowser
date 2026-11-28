'use strict';

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { fileURLToPath } = require('url');

const RECORDED_PROTOCOLS = new Set(['http:', 'https:', 'file:']);
// One-time tokens that Cloudflare's bot check adds to the address
const CHALLENGE_PARAM = /^__cf_chl/i;
// The same visit can be reported again while a person is completing a check
const CHALLENGE_WINDOW_MS = 5 * 60 * 1000;
const REPEAT_WINDOW_MS = 4000;
// A page sets its title shortly after it loads. Later changes are ignored.
const TITLE_WINDOW_MS = 30000;

const isInside = (file, dir) => {
  const relative = path.relative(dir, file);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
};

/**
 * What to record for an address: `{ url, challenge }`, or null when it is not a
 * visit worth keeping (the browser's own pages and files, and bot-check pages).
 * `challenge` means one-time tokens were taken out of the address.
 */
function recordableAddress(address, internalDirs = []) {
  let url;
  try {
    url = new URL(address);
  } catch {
    return null;
  }
  if (!RECORDED_PROTOCOLS.has(url.protocol)) return null;

  if (url.protocol === 'file:') {
    let file;
    try {
      file = fileURLToPath(url);
    } catch {
      return { url: address, challenge: false };
    }
    return internalDirs.some(dir => isInside(file, dir)) ? null : { url: address, challenge: false };
  }

  if (url.pathname.startsWith('/cdn-cgi/challenge-platform/')) return null;
  if (/(^|\.)google\.[a-z.]+$/i.test(url.hostname) && url.pathname.startsWith('/sorry/')) return null;

  const parts = url.search.slice(1).split('&');
  const kept = parts.filter(part => !CHALLENGE_PARAM.test(part.split('=')[0]));
  if (!url.search || kept.length === parts.length) return { url: address, challenge: false };
  const hash = url.hash;
  url.hash = '';
  url.search = '';
  return { url: url.href + (kept.length ? `?${kept.join('&')}` : '') + hash, challenge: true };
}

class HistoryManager {
  /** `internalDirs` hold the browser's own pages and files, which are not history. */
  constructor({ internalDirs = [] } = {}) {
    this.internalDirs = internalDirs;
    this.historyPath = path.join(app.getPath('userData'), 'recon_history.json');
    this.memoryCache = null;
    this.lastAdded = null;
  }

  load() {
    if (this.memoryCache !== null) {
      return this.memoryCache;
    }

    if (!fs.existsSync(this.historyPath)) {
      this.memoryCache = [];
      return this.memoryCache;
    }

    try {
      const data = fs.readFileSync(this.historyPath, 'utf8');
      this.memoryCache = JSON.parse(data || '[]');
      if (!Array.isArray(this.memoryCache)) {
        this.memoryCache = [];
      }
    } catch (err) {
      console.error('[Recon History] Failed to parse history file:', err);
      this.memoryCache = [];
    }

    return this.memoryCache;
  }

  save(items) {
    this.memoryCache = items;
    try {
      const tempPath = `${this.historyPath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(items, null, 2), 'utf8');
      fs.renameSync(tempPath, this.historyPath);
      return true;
    } catch (err) {
      console.error('[Recon History] Failed to write history to disk:', err);
      return false;
    }
  }

  add({ url: address, title }) {
    if (!address || typeof address !== 'string') return null;
    const record = recordableAddress(address, this.internalDirs);
    if (!record) return null;
    const { url, challenge } = record;

    const cleanTitle = !title || title === address ? url : title;
    const now = Date.now();

    // Debounce repeats of the same visit, for longer while a bot check is under way
    const last = this.lastAdded;
    if (last && last.url === url) {
      const afterChallenge = challenge || last.challenge;
      if (now - last.time < (afterChallenge ? CHALLENGE_WINDOW_MS : REPEAT_WINDOW_MS)) {
        last.challenge = afterChallenge;
        if (afterChallenge) this.markVisitedNow(url, now);
        return null;
      }
    }

    const all = this.load();
    const entry = {
      id: `hist_${now}_${Math.random().toString(36).substr(2, 4)}`,
      url,
      title: cleanTitle,
      timestamp: now
    };

    all.unshift(entry);
    // Keep up to 5,000 entries
    if (all.length > 5000) {
      all.length = 5000;
    }

    this.lastAdded = { url, time: now, challenge };
    this.save(all);
    return entry;
  }

  // The visit happens when the check is passed, and the real title follows that
  markVisitedNow(url, now) {
    const all = this.load();
    const entry = all.find(item => item.url === url);
    if (entry) {
      entry.timestamp = now;
      this.save(all);
    }
  }

  /** The page's own title arrives after the visit has been recorded. */
  setTitle(address, title) {
    const record = recordableAddress(address, this.internalDirs);
    if (!record || !title || title === address) return false;
    const all = this.load();
    const entry = all.find(item => item.url === record.url);
    if (!entry || entry.title === title || Date.now() - entry.timestamp > TITLE_WINDOW_MS) return false;
    entry.title = title;
    return this.save(all);
  }

  getAll() {
    return this.load();
  }

  search(query) {
    const all = this.load();
    if (!query || !query.trim()) return all;
    const q = query.toLowerCase().trim();
    return all.filter(item => 
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.url && item.url.toLowerCase().includes(q))
    );
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
        label = itemDate.toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, { key: groupKey, label, date: dayStart, items: [] });
      }
      groupsMap.get(groupKey).items.push(item);
    }

    // Return array sorted by date descending
    return Array.from(groupsMap.values()).sort((a, b) => b.date - a.date);
  }

  delete(id) {
    const all = this.load();
    const filtered = all.filter(item => item.id !== id);
    if (filtered.length !== all.length) {
      this.save(filtered);
      return true;
    }
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
      // 'all'
      filtered = [];
    }

    this.save(filtered);
    return true;
  }
}

module.exports = { HistoryManager, recordableAddress };
