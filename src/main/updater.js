'use strict';
// Auto-updater module for Recon Browser against GitHub Releases.
// - Background downloading of platform installers directly inside the app.
// - Clean UAC execution and app relaunch without bouncing to external browsers.

const { app, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
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
  constructor(onStatus, mainWindowGetter) {
    this.onStatus = onStatus || (() => {});
    this.getMainWindow = mainWindowGetter || (() => null);
    this.status = { state: 'idle' };
    this.autoUpdater = null;
    this.downloadedInstallerPath = null;
    this.isDownloading = false;
  }

  start() {
    if (canSelfUpdate()) {
      try {
        ({ autoUpdater: this.autoUpdater } = require('electron-updater'));
        this.autoUpdater.autoDownload = true;
        this.autoUpdater.autoInstallOnAppQuit = true;
        this.autoUpdater.on('update-available', (i) => this.emit({ state: 'downloading', version: i.version }));
        this.autoUpdater.on('update-downloaded', (i) => this.emit({ state: 'ready', version: i.version }));
        this.autoUpdater.on('download-progress', (p) => this.emit({ state: 'downloading', percent: Math.round(p.percent) }));
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
      const versionStr = String(latestTag).replace(/^v/, '');

      if (compareVersions(versionStr, app.getVersion() || '1.0.0') > 0) {
        // Find platform installer asset
        let matchedAsset = null;
        if (Array.isArray(rel.assets)) {
          if (process.platform === 'win32') {
            matchedAsset = rel.assets.find(a => a.name.endsWith('.exe') && !a.name.includes('blockmap'));
          } else if (process.platform === 'linux') {
            matchedAsset = rel.assets.find(a => a.name.endsWith('.AppImage') || a.name.endsWith('.deb'));
          } else if (process.platform === 'darwin') {
            matchedAsset = rel.assets.find(a => a.name.endsWith('.dmg') || a.name.endsWith('.zip'));
          }
        }

        const s = {
          state: 'available',
          version: versionStr,
          assetUrl: matchedAsset ? matchedAsset.browser_download_url : null,
          assetName: matchedAsset ? matchedAsset.name : null,
          url: rel.html_url || RELEASES_URL,
          notes: rel.body || 'New Recon Browser release available.'
        };
        this.emit(s);

        // If an installer asset is available, start background downloading immediately
        if (s.assetUrl && !this.isDownloading && !this.downloadedInstallerPath) {
          this.downloadInstaller(s.assetUrl, s.assetName, versionStr);
        }

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

  async downloadInstaller(downloadUrl, filename, version) {
    if (this.isDownloading) return;
    this.isDownloading = true;
    this.emit({ state: 'downloading', version, percent: 0 });

    try {
      const targetDir = app.getPath('temp');
      const targetPath = path.join(targetDir, filename || `ReconBrowser-Setup-${version}.exe`);

      const response = await net.fetch(downloadUrl);
      if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}`);

      const totalBytes = parseInt(response.headers.get('content-length') || '0', 10);
      let receivedBytes = 0;

      const fileStream = fs.createWriteStream(targetPath);
      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          receivedBytes += value.length;
          fileStream.write(Buffer.from(value));
          if (totalBytes > 0) {
            const percent = Math.round((receivedBytes / totalBytes) * 100);
            this.emit({ state: 'downloading', version, percent });
          }
        }
      }

      fileStream.end();

      await new Promise((resolve, reject) => {
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
      });

      this.downloadedInstallerPath = targetPath;
      this.isDownloading = false;
      this.emit({ state: 'ready', version, path: targetPath });
      console.log(`[Recon Updater] Installer downloaded to ${targetPath}, ready to install.`);
    } catch (err) {
      this.isDownloading = false;
      console.error('[Recon Updater] Background download failed:', err);
      this.emit({ state: 'available', version, error: String(err.message || err) });
    }
  }

  installNow() {
    // 1. If electron-updater has downloaded package
    if (this.autoUpdater && this.status.state === 'ready') {
      setImmediate(() => this.autoUpdater.quitAndInstall(true, true));
      return true;
    }

    // 2. If direct background downloader finished payload
    if (this.downloadedInstallerPath && fs.existsSync(this.downloadedInstallerPath)) {
      try {
        console.log(`[Recon Updater] Spawning downloaded installer: ${this.downloadedInstallerPath}`);
        if (process.platform === 'win32') {
          spawn(this.downloadedInstallerPath, [], { detached: true, stdio: 'ignore' }).unref();
        } else if (process.platform === 'darwin') {
          spawn('open', [this.downloadedInstallerPath], { detached: true, stdio: 'ignore' }).unref();
        } else {
          fs.chmodSync(this.downloadedInstallerPath, '755');
          spawn(this.downloadedInstallerPath, [], { detached: true, stdio: 'ignore' }).unref();
        }
        app.quit();
        return true;
      } catch (err) {
        console.error('[Recon Updater] Failed to launch installer executable:', err);
      }
    }

    // 3. Fallback: navigate in Recon Browser tab (never bounce to external browser!)
    const win = this.getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('open-link-new-tab', { url: this.status.url || RELEASES_URL });
      return true;
    }

    return false;
  }
}

module.exports = { Updater, RELEASES_URL, canSelfUpdate };
