'use strict';
// Update checks against this project's GitHub Releases. Same shape as RT Markdown Reader.
//  - Installed Windows app (NSIS) and Linux AppImage: electron-updater downloads the update in the
//    background, checks it against the hash in the release's latest*.yml, and the user gets
//    "Restart to update".
//  - Portable .exe, .deb and macOS builds can't self-update, so they are told a new version
//    exists and given the download page.
// This app never downloads or runs an installer itself.
const { compareVersions } = require('./version');

const OWNER = 'neogentrics';
const REPO = 'ReconBrowser';
const RELEASES_URL = `https://github.com/${OWNER}/${REPO}/releases/latest`;
const FIRST_CHECK_MS = 8000;
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;

function canSelfUpdate({ platform = process.platform, env = process.env } = {}) {
  if (platform === 'win32') return !env.PORTABLE_EXECUTABLE_DIR;
  if (platform === 'linux') return !!env.APPIMAGE;
  return false;
}

class Updater {
  // `deps` stands in for Electron, electron-updater and the system in tests
  constructor(onStatus, deps = {}) {
    this.onStatus = onStatus || (() => {}); // ({ state, version, url }) => void
    this.deps = {
      app: deps.app || require('electron').app,
      net: deps.net || require('electron').net,
      loadAutoUpdater: deps.loadAutoUpdater || (() => require('electron-updater').autoUpdater),
      platform: deps.platform || process.platform,
      env: deps.env || process.env,
      setTimeout: deps.setTimeout || setTimeout,
      setInterval: deps.setInterval || setInterval
    };
    this.status = { state: 'idle' }; // idle | downloading | ready | available | current | error
    this.autoUpdater = null;
    this.lastError = null;
  }

  start() {
    const { app, env } = this.deps;
    if (!app.isPackaged || env.RB_DISABLE_UPDATES) return;
    if (canSelfUpdate(this.deps)) {
      try {
        this.autoUpdater = this.deps.loadAutoUpdater();
        this.autoUpdater.autoDownload = true;
        this.autoUpdater.autoInstallOnAppQuit = true;
        this.autoUpdater.on('update-available', (i) => {
          // A later check finds the same release again; it is still ready to install
          if (this.status.state === 'ready' && this.status.version === i.version) return;
          this.emit({ state: 'downloading', version: i.version });
        });
        this.autoUpdater.on('update-downloaded', (i) => this.emit({ state: 'ready', version: i.version }));
        this.autoUpdater.on('error', (e) => { this.lastError = e; });
      } catch (err) {
        console.error('[Recon Updater] Self-update is unavailable:', err.message);
        this.autoUpdater = null;
      }
    }
    this.deps.setTimeout(() => this.check({ silent: true }), FIRST_CHECK_MS);
    this.deps.setInterval(() => this.check({ silent: true }), CHECK_EVERY_MS)?.unref?.();
  }

  emit(status) {
    this.status = status;
    this.onStatus(status);
  }

  /**
   * Returns a status object; with silent=false the caller shows "up to date" etc.
   * Only an update (downloading, ready, available) is ever sent to onStatus.
   */
  async check({ silent = false } = {}) {
    const { app, net } = this.deps;
    try {
      if (this.autoUpdater) {
        const res = await this.autoUpdater.checkForUpdates();
        // A failed background download also arrives as an 'error' event
        res?.downloadPromise?.catch(() => {});
        const latest = res?.updateInfo?.version;
        if (latest && compareVersions(latest, app.getVersion()) > 0) {
          return this.status.state === 'ready' ? this.status : { state: 'downloading', version: latest };
        }
        return { state: 'current', version: app.getVersion() };
      }
      const res = await net.fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': `ReconBrowser/${app.getVersion()}` }
      });
      if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
      const rel = await res.json();
      if (compareVersions(rel.tag_name, app.getVersion()) > 0) {
        const url = String(rel.html_url || '').startsWith(`https://github.com/${OWNER}/${REPO}/`) ? rel.html_url : RELEASES_URL;
        const status = { state: 'available', version: String(rel.tag_name).replace(/^v/, ''), url };
        this.emit(status);
        return status;
      }
      return { state: 'current', version: app.getVersion() };
    } catch (err) {
      return silent ? { state: 'error' } : { state: 'error', message: String(err?.message || err) };
    }
  }

  installNow() {
    if (this.autoUpdater && this.status.state === 'ready') {
      // Silent: no installer screens, then reopen
      setImmediate(() => this.autoUpdater.quitAndInstall(true, true));
      return true;
    }
    return false;
  }
}

module.exports = { Updater, RELEASES_URL, canSelfUpdate, FIRST_CHECK_MS, CHECK_EVERY_MS };
