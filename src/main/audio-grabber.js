'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const http = require('http');
const https = require('https');

function getUserDataPath() {
  try {
    const electron = require('electron');
    if (electron && electron.app && typeof electron.app.getPath === 'function') {
      return electron.app.getPath('userData');
    }
  } catch {}
  return process.env.APPDATA ? path.join(process.env.APPDATA, 'recon-browser') : path.join(os.tmpdir(), 'recon-browser');
}

class AudioGrabberManager {
  constructor(customBaseDir = null) {
    const baseDir = customBaseDir || getUserDataPath();
    this.clipsDir = path.join(baseDir, 'audio_studio_clips');
    this.catalogPath = path.join(baseDir, 'recon_audio_clips.json');
    this.tabDetectedMedia = new Map(); // tabId -> Map(url -> mediaItem)
    this.ensureDir();
    this.memoryCatalog = null;
  }

  ensureDir() {
    if (!fs.existsSync(this.clipsDir)) {
      try { fs.mkdirSync(this.clipsDir, { recursive: true }); } catch {}
    }
  }

  loadCatalog() {
    if (this.memoryCatalog !== null) return this.memoryCatalog;
    if (!fs.existsSync(this.catalogPath)) {
      this.memoryCatalog = [];
      return this.memoryCatalog;
    }
    try {
      const raw = fs.readFileSync(this.catalogPath, 'utf8');
      this.memoryCatalog = JSON.parse(raw || '[]');
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
      console.error('[Audio Grabber] Failed to save catalog:', err);
      return false;
    }
  }

  // Live Detection Buffer (Per-Tab)
  recordDetectedMedia(tabId, mediaItem) {
    if (!tabId || !mediaItem || !mediaItem.url) return;
    if (!this.tabDetectedMedia.has(tabId)) {
      this.tabDetectedMedia.set(tabId, new Map());
    }
    const tabMap = this.tabDetectedMedia.get(tabId);
    if (!tabMap.has(mediaItem.url)) {
      tabMap.set(mediaItem.url, {
        id: `media_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        url: mediaItem.url,
        title: mediaItem.title || 'Audio Stream',
        mimeType: mediaItem.mimeType || this.inferMimeType(mediaItem.url),
        duration: mediaItem.duration || 0,
        foundAt: Date.now()
      });
    }
  }

  getDetectedMedia(tabId) {
    if (!tabId || !this.tabDetectedMedia.has(tabId)) return [];
    return Array.from(this.tabDetectedMedia.get(tabId).values());
  }

  clearDetectedMedia(tabId) {
    if (tabId && this.tabDetectedMedia.has(tabId)) {
      this.tabDetectedMedia.delete(tabId);
    }
  }

  inferMimeType(url) {
    const u = url.toLowerCase();
    if (u.includes('.mp3')) return 'audio/mpeg';
    if (u.includes('.wav')) return 'audio/wav';
    if (u.includes('.ogg')) return 'audio/ogg';
    if (u.includes('.m4a') || u.includes('.aac')) return 'audio/aac';
    if (u.includes('.flac')) return 'audio/flac';
    if (u.includes('.opus')) return 'audio/opus';
    if (u.includes('.webm')) return 'audio/webm';
    return 'audio/mpeg';
  }

  inferExtension(mimeType, url) {
    if (mimeType.includes('wav')) return '.wav';
    if (mimeType.includes('ogg')) return '.ogg';
    if (mimeType.includes('aac') || mimeType.includes('m4a')) return '.m4a';
    if (mimeType.includes('flac')) return '.flac';
    if (mimeType.includes('opus')) return '.opus';
    if (mimeType.includes('webm')) return '.webm';
    if (url) {
      const match = url.match(/\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)(\?.*)?$/i);
      if (match) return `.${match[1].toLowerCase()}`;
    }
    return '.mp3';
  }

  // Download & Save to Audio Studio Library
  downloadClip({ url, title, pageUrl, domain }) {
    return new Promise((resolve, reject) => {
      this.ensureDir();
      const id = `clip_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const mime = this.inferMimeType(url);
      const ext = this.inferExtension(mime, url);
      const safeTitle = (title || 'Audio Sample').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
      const filename = `${safeTitle}_${id}${ext}`;
      const filePath = path.join(this.clipsDir, filename);

      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return this.downloadClip({ url: res.headers.location, title, pageUrl, domain })
            .then(resolve)
            .catch(reject);
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP status ${res.statusCode} downloading audio clip`));
        }

        const fileStream = fs.createWriteStream(filePath);
        let bytes = 0;

        res.on('data', chunk => {
          bytes += chunk.length;
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => {
            const catalog = this.loadCatalog();
            const record = {
              id,
              title: title || 'Audio Sample',
              filename,
              filePath,
              url,
              pageUrl: pageUrl || '',
              domain: domain || '',
              mimeType: mime,
              sizeBytes: bytes,
              createdAt: Date.now()
            };
            catalog.unshift(record);
            this.saveCatalog(catalog);
            resolve(record);
          });
        });

        fileStream.on('error', err => {
          fs.unlink(filePath, () => {});
          reject(err);
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Audio download timed out after 30 seconds'));
      });
    });
  }

  getSavedClips() {
    return this.loadCatalog();
  }

  deleteClip(id) {
    const catalog = this.loadCatalog();
    const item = catalog.find(c => c.id === id);
    if (item && fs.existsSync(item.filePath)) {
      try { fs.unlinkSync(item.filePath); } catch {}
    }
    const filtered = catalog.filter(c => c.id !== id);
    this.saveCatalog(filtered);
    return true;
  }
}

module.exports = {
  AudioGrabberManager
};
