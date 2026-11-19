'use strict';

const { app } = require('electron');
const path = require('path');
const fs = require('fs');

class HistoryManager {
  constructor() {
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

  add({ url, title }) {
    if (!url || typeof url !== 'string') return null;
    // Skip internal startpage or blank pages
    if (url.includes('startpage.html') || url === 'about:blank' || url.startsWith('chrome://')) {
      return null;
    }

    const cleanTitle = title || url;
    const now = Date.now();

    // Debounce duplicate navigations within 4 seconds
    if (this.lastAdded && this.lastAdded.url === url && (now - this.lastAdded.time) < 4000) {
      return null;
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

    this.lastAdded = { url, time: now };
    this.save(all);
    return entry;
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

module.exports = { HistoryManager };
