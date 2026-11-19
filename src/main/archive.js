'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

function getUserDataPath() {
  try {
    const electron = require('electron');
    if (electron && electron.app && typeof electron.app.getPath === 'function') {
      return electron.app.getPath('userData');
    }
  } catch {}
  return process.env.APPDATA ? path.join(process.env.APPDATA, 'recon-browser') : path.join(os.tmpdir(), 'recon-browser');
}

class ArchiveManager {
  constructor(customDir = null) {
    const baseDir = customDir || getUserDataPath();
    this.archiveDir = path.join(baseDir, 'archives');
    this.catalogPath = path.join(baseDir, 'recon_archives.json');
    this.ensureDir();
    this.memoryCatalog = null;
  }

  ensureDir() {
    if (!fs.existsSync(this.archiveDir)) {
      try {
        fs.mkdirSync(this.archiveDir, { recursive: true });
      } catch (err) {
        console.error('[Recon Archive] Failed to create archives directory:', err);
      }
    }
  }

  loadCatalog() {
    if (this.memoryCatalog !== null) return this.memoryCatalog;
    if (!fs.existsSync(this.catalogPath)) {
      this.memoryCatalog = [];
      return [];
    }
    try {
      const data = fs.readFileSync(this.catalogPath, 'utf8');
      this.memoryCatalog = JSON.parse(data || '[]');
      if (!Array.isArray(this.memoryCatalog)) this.memoryCatalog = [];
    } catch {
      this.memoryCatalog = [];
    }
    return this.memoryCatalog;
  }

  saveCatalog(items) {
    this.memoryCatalog = items;
    try {
      const tmp = `${this.catalogPath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(items, null, 2), 'utf8');
      fs.renameSync(tmp, this.catalogPath);
      return true;
    } catch (err) {
      console.error('[Recon Archive] Error saving archive catalog:', err);
      return false;
    }
  }

  getAll() {
    return this.loadCatalog();
  }

  search(query) {
    const all = this.loadCatalog();
    if (!query || !query.trim()) return all;
    const q = query.toLowerCase().trim();
    return all.filter(item => 
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.url && item.url.toLowerCase().includes(q)) ||
      (item.tags && item.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  async savePageArchive(webContents, metadata = {}) {
    this.ensureDir();
    const now = Date.now();
    const id = `arch_${now}_${Math.random().toString(36).substr(2, 4)}`;
    const safeTitle = (metadata.title || webContents.getTitle() || 'Archive')
      .replace(/[^a-zA-Z0-9_\- ]/g, '')
      .trim()
      .slice(0, 50) || 'Archive';
    
    const fileName = `${safeTitle}-${id}.reconarchive`;
    const targetPath = path.join(this.archiveDir, fileName);

    // Save page as MHTML
    await webContents.savePage(targetPath, 'MHTML');

    let fileSize = 0;
    try {
      fileSize = fs.statSync(targetPath).size;
    } catch {}

    const entry = {
      id,
      title: metadata.title || webContents.getTitle() || 'Archived Page',
      url: metadata.url || webContents.getURL(),
      filePath: targetPath,
      fileName,
      fileSizeBytes: fileSize,
      savedAt: now,
      tags: metadata.tags || ['research']
    };

    const all = this.loadCatalog();
    all.unshift(entry);
    this.saveCatalog(all);

    return entry;
  }

  delete(id) {
    const all = this.loadCatalog();
    const item = all.find(i => i.id === id);
    if (item && item.filePath && fs.existsSync(item.filePath)) {
      try {
        fs.unlinkSync(item.filePath);
      } catch (err) {
        console.warn('[Recon Archive] Failed to delete archive file:', err);
      }
    }
    const filtered = all.filter(i => i.id !== id);
    this.saveCatalog(filtered);
    return true;
  }
}

module.exports = { ArchiveManager };
