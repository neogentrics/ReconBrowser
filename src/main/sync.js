'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
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

class SyncManager {
  constructor(customConfigPath = null) {
    const defaultDir = getUserDataPath();
    if (!fs.existsSync(defaultDir)) {
      try { fs.mkdirSync(defaultDir, { recursive: true }); } catch {}
    }
    this.configPath = customConfigPath || path.join(defaultDir, 'recon_sync_config.json');
    this.config = this.loadConfig();
  }

  loadConfig() {
    const defaults = {
      enabled: false,
      syncFolderPath: '',
      deviceName: process.env.COMPUTERNAME || process.env.HOSTNAME || 'Recon-Device',
      deviceId: `dev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      lastSyncedAt: null,
      syncBookmarks: true,
      syncVault: true,
      syncHistory: false,
      syncSettings: true,
      autoSync: true
    };

    if (!fs.existsSync(this.configPath)) {
      return defaults;
    }

    try {
      const data = fs.readFileSync(this.configPath, 'utf8');
      return { ...defaults, ...JSON.parse(data || '{}') };
    } catch (err) {
      console.error('[Recon Sync] Error loading sync config:', err);
      return defaults;
    }
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    try {
      const tmp = `${this.configPath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.config, null, 2), 'utf8');
      fs.renameSync(tmp, this.configPath);
      return true;
    } catch (err) {
      console.error('[Recon Sync] Error saving sync config:', err);
      return false;
    }
  }

  getConfig() {
    return this.config;
  }

  // ==========================================================================
  // Cryptographic Primitives (AES-256-GCM + Scrypt)
  // ==========================================================================

  deriveKey(passphrase, salt) {
    return crypto.scryptSync(passphrase, salt, 32, { N: 16384, r: 8, p: 1 });
  }

  encryptPayload(plainObject, passphrase) {
    const salt = crypto.randomBytes(16);
    const key = this.deriveKey(passphrase, salt);
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const jsonStr = JSON.stringify(plainObject);
    let encrypted = cipher.update(jsonStr, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const tag = cipher.getAuthTag();

    return {
      version: 1,
      format: 'recon-encrypted-payload',
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      ciphertext: encrypted
    };
  }

  decryptPayload(payload, passphrase) {
    if (!payload || !payload.salt || !payload.iv || !payload.tag || !payload.ciphertext) {
      throw new Error('Invalid or corrupted encrypted payload');
    }

    const salt = Buffer.from(payload.salt, 'hex');
    const iv = Buffer.from(payload.iv, 'hex');
    const tag = Buffer.from(payload.tag, 'hex');
    const key = this.deriveKey(passphrase, salt);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(payload.ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  // ==========================================================================
  // Encrypted Backup & Restore (.reconbackup)
  // ==========================================================================

  createBackup(targetPath, passphrase, dataToBackup) {
    if (!passphrase || passphrase.length < 6) {
      throw new Error('Passphrase must be at least 6 characters long');
    }

    let ver = '1.5.0';
    try {
      const electron = require('electron');
      if (electron && electron.app && typeof electron.app.getVersion === 'function') {
        ver = electron.app.getVersion();
      }
    } catch {}

    const bundle = {
      app: 'Recon Browser',
      version: ver,
      createdAt: Date.now(),
      deviceId: this.config.deviceId,
      deviceName: this.config.deviceName,
      data: dataToBackup
    };

    const encrypted = this.encryptPayload(bundle, passphrase);
    fs.writeFileSync(targetPath, JSON.stringify(encrypted, null, 2), 'utf8');
    return { success: true, path: targetPath, timestamp: bundle.createdAt };
  }

  restoreBackup(sourcePath, passphrase) {
    if (!fs.existsSync(sourcePath)) {
      throw new Error('Backup file does not exist');
    }

    const raw = fs.readFileSync(sourcePath, 'utf8');
    const payload = JSON.parse(raw);
    const decrypted = this.decryptPayload(payload, passphrase);

    if (!decrypted || !decrypted.data) {
      throw new Error('Invalid Recon Browser backup structure');
    }

    return decrypted.data;
  }

  // ==========================================================================
  // Accountless Folder-Based Sync
  // ==========================================================================

  executeFolderSync(passphrase, localData) {
    const syncDir = this.config.syncFolderPath;
    if (!syncDir || !fs.existsSync(syncDir)) {
      throw new Error('Sync folder path is invalid or does not exist');
    }

    const reconSyncDir = path.join(syncDir, '.recon_sync');
    if (!fs.existsSync(reconSyncDir)) {
      fs.mkdirSync(reconSyncDir, { recursive: true });
    }

    const manifestPath = path.join(reconSyncDir, 'sync_manifest.json');
    const dataPath = path.join(reconSyncDir, 'sync_payload.enc');

    let remoteData = null;
    let remoteManifest = null;

    if (fs.existsSync(manifestPath) && fs.existsSync(dataPath)) {
      try {
        remoteManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const encData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        remoteData = this.decryptPayload(encData, passphrase);
      } catch (err) {
        console.warn('[Recon Sync] Could not decrypt existing remote sync payload:', err);
      }
    }

    // Merge remote with local
    const merged = this.mergeData(localData, remoteData);

    // Save encrypted merged data back to folder
    const payloadToSave = {
      updatedAt: Date.now(),
      deviceId: this.config.deviceId,
      deviceName: this.config.deviceName,
      data: merged
    };

    const enc = this.encryptPayload(payloadToSave, passphrase);
    const tmpData = `${dataPath}.tmp`;
    fs.writeFileSync(tmpData, JSON.stringify(enc, null, 2), 'utf8');
    fs.renameSync(tmpData, dataPath);

    const manifest = {
      lastUpdated: payloadToSave.updatedAt,
      deviceId: this.config.deviceId,
      deviceName: this.config.deviceName,
      version: '1.5.0'
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    this.saveConfig({ lastSyncedAt: payloadToSave.updatedAt });

    return {
      success: true,
      mergedData: merged,
      timestamp: payloadToSave.updatedAt,
      deviceName: remoteManifest?.deviceName || this.config.deviceName
    };
  }

  mergeData(local, remote) {
    if (!remote) return local;
    const r = remote.data || remote;
    const l = local || {};

    // Merge Bookmarks (Union by URL)
    const mergedBookmarks = [...(l.bookmarks || [])];
    const existingBmUrls = new Set(mergedBookmarks.map(b => b.url));
    if (Array.isArray(r.bookmarks)) {
      for (const rBm of r.bookmarks) {
        if (!existingBmUrls.has(rBm.url)) {
          mergedBookmarks.push(rBm);
          existingBmUrls.add(rBm.url);
        }
      }
    }

    // Merge Vault (by domain + username, newer updatedAt wins)
    const mergedVault = [...(l.vault || [])];
    if (Array.isArray(r.vault)) {
      for (const rCred of r.vault) {
        const idx = mergedVault.findIndex(c => 
          (c.domain || '').toLowerCase() === (rCred.domain || '').toLowerCase() &&
          (c.username || '').toLowerCase() === (rCred.username || '').toLowerCase()
        );
        if (idx === -1) {
          mergedVault.push(rCred);
        } else {
          if ((rCred.updatedAt || 0) > (mergedVault[idx].updatedAt || 0)) {
            mergedVault[idx] = rCred;
          }
        }
      }
    }

    // Merge History (Union by URL + timestamp)
    const mergedHistory = [...(l.history || [])];
    const existingHistKeys = new Set(mergedHistory.map(h => `${h.url}_${h.timestamp}`));
    if (Array.isArray(r.history)) {
      for (const rHist of r.history) {
        const key = `${rHist.url}_${rHist.timestamp}`;
        if (!existingHistKeys.has(key)) {
          mergedHistory.push(rHist);
          existingHistKeys.add(key);
        }
      }
    }

    return {
      bookmarks: mergedBookmarks,
      vault: mergedVault,
      history: mergedHistory,
      settings: { ...(r.settings || {}), ...(l.settings || {}) }
    };
  }
}

module.exports = { SyncManager };
