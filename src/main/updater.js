'use strict';
// Auto-updater module for Recon Browser against GitHub Releases.
// - Windows (NSIS installed): electron-updater downloads in background, prompts to restart.
// - Linux (AppImage): downloads and self-replaces AppImage.
// - Portable Windows / macOS / Unpackaged dev: checks GitHub Releases API, informs user with release notes & download link.

const { app, net, shell } = require('electron');
const { compareVersions } = require('./version');

const OWNER = 'neogentrics';
const REPO = 'ReconBrowser';
const RELEASES_URL = `https://github.com/${OWNER}/${REPO}/releases/latest`;
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000; // 6 hours

function canSelfUpdate() {
  if (process.platform === 'win32') return !process.env.PORTABLE_EXECUTABLE_DIR;
  if (process.platform === 'linux') return !!process.env.APPIMAGE;
  return false;
}

class Updater {
  constructor(onStatus) {
    this.onStatus = onStatus || (() => {});
    this.status = { state: 'idle' };
    this.autoUpdater = null;
  }

  start() {
    if (canSelfUpdate()) {
      try {
        ({ autoUpdater: this.autoUpdater } = require('electron-updater'));
        this.autoUpdater.autoDownload = true;
        this.autoUpdater.autoInstallOnAppQuit = true;
        this.autoUpdater.on('update-available', (i) => this.emit({ state: 'downloading', version: i.version }));
        this.autoUpdater.on('update-downloaded', (i) => this.emit({ state: 'ready', version: i.version }));
        this.autoUpdater.on('error', (e) => { this.lastError = e; });
      } catch {
        this.autoUpdater = null;
      }
    }

    // Initial check after 8 seconds, then every 6 hours
    setTimeout(() => this.check({ silent: true }), 8000);
    setInterval(() => this.check({ silent: true }), CHECK_EVERY_MS).unref?.();
  }

  emit(status) {
    this.status = status;
    this.onStatus(status);
  }

  /** Returns status object. With silent=false, reports 'current' or errors to user */
  async check({ silent = false } = {}) {
    this.emit({ state: 'checking' });
    try {
      if (this.autoUpdater) {
        const res = await this.autoUpdater.checkForUpdates();
        const latest = res?.updateInfo?.version;
        if (latest && compareVersions(latest, app.getVersion()) > 0) {
          const s = this.status.state === 'ready' ? this.status : { state: 'downloading', version: latest };
          this.emit(s);
          return s;
        }
        const s = { state: 'current', version: app.getVersion() };
        this.emit(s);
        return s;
      }

      // Fallback: Query GitHub Releases API directly
      const res = await net.fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': `ReconBrowser/${app.getVersion() || '1.1.0'}`
        }
      });

      if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
      const rel = await res.json();
      const latestTag = rel.tag_name || '';

      if (compareVersions(latestTag, app.getVersion() || '1.0.0') > 0) {
        const s = {
          state: 'available',
          version: String(latestTag).replace(/^v/, ''),
          url: rel.html_url || RELEASES_URL,
          notes: rel.body || 'New Recon Browser release available.'
        };
        this.emit(s);
        return s;
      }

      const s = { state: 'current', version: app.getVersion() || '1.1.0' };
      this.emit(s);
      return s;
    } catch (err) {
      const s = silent ? { state: 'idle' } : { state: 'error', message: String(err?.message || err) };
      this.emit(s);
      return s;
    }
  }

  installNow() {
    if (this.autoUpdater && this.status.state === 'ready') {
      setImmediate(() => this.autoUpdater.quitAndInstall(true, true));
      return true;
    }
    if (this.status.url) {
      shell.openExternal(this.status.url);
      return true;
    }
    return false;
  }
}

module.exports = { Updater, RELEASES_URL, canSelfUpdate };
