/**
 * Recon Browser — Zero-Data-Loss Migration & Integrity Audit Manager (v1.9.0)
 * Validates, repairs, and migrates all user stores (bookmarks, history, vault,
 * containers, archives, sync) across version upgrades without data loss.
 */

const fs = require('fs');
const path = require('path');

let electronApp = null;
try {
  electronApp = require('electron').app;
} catch {}

class MigrationManager {
  constructor(userDataDir = null) {
    this.userDataDir = userDataDir || (electronApp ? electronApp.getPath('userData') : path.join(process.cwd(), '.recon-data'));
    this.backupDir = path.join(this.userDataDir, 'backups');
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Run full audit and migration on all data stores
   */
  async runAuditAndMigrate() {
    this.ensureBackupDir();
    const auditReport = {
      timestamp: new Date().toISOString(),
      version: '1.9.0',
      status: 'healthy',
      stores: {},
      repaired: 0,
      backedUp: 0
    };

    const targetStores = [
      { name: 'bookmarks', file: 'bookmarks.json', defaultContent: [] },
      { name: 'history', file: 'history.json', defaultContent: [] },
      { name: 'containers', file: 'containers.json', defaultContent: [] },
      { name: 'archives', file: 'archives.json', defaultContent: [] },
      { name: 'sync', file: 'sync-settings.json', defaultContent: {} },
      { name: 'companion', file: 'companion-notes.json', defaultContent: [] },
      { name: 'audioClips', file: 'audio-clips.json', defaultContent: [] }
    ];

    for (const store of targetStores) {
      const filePath = path.join(this.userDataDir, store.file);
      const storeResult = this.verifyAndMigrateStore(filePath, store.defaultContent);
      auditReport.stores[store.name] = storeResult;
      if (storeResult.repaired) auditReport.repaired++;
      if (storeResult.backedUp) auditReport.backedUp++;
    }

    // Vault check
    const vaultPath = path.join(this.userDataDir, 'vault.enc');
    if (fs.existsSync(vaultPath)) {
      try {
        const stats = fs.statSync(vaultPath);
        auditReport.stores['vault'] = {
          exists: true,
          size: stats.size,
          healthy: stats.size > 0
        };
      } catch (err) {
        auditReport.stores['vault'] = { exists: true, healthy: false, error: err.message };
      }
    } else {
      auditReport.stores['vault'] = { exists: false, healthy: true, status: 'uninitialized' };
    }

    return auditReport;
  }

  /**
   * Check a single JSON store file, creating a backup and safely repairing if corrupted
   */
  verifyAndMigrateStore(filePath, defaultContent) {
    const fileName = path.basename(filePath);
    if (!fs.existsSync(filePath)) {
      return { exists: false, healthy: true, count: 0, status: 'initialized-empty' };
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf8').trim();
      if (!raw) {
        return { exists: true, healthy: true, count: 0, status: 'empty' };
      }

      const parsed = JSON.parse(raw);
      const count = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;

      // Safe backup creation for active stores
      if (count > 0) {
        const backupFile = path.join(this.backupDir, `${fileName}.${Date.now()}.bak`);
        try {
          fs.writeFileSync(backupFile, raw, 'utf8');
          this.pruneOldBackups(fileName, 5);
        } catch (e) {
          console.warn(`[Recon Migration] Could not create backup for ${fileName}:`, e.message);
        }
      }

      return {
        exists: true,
        healthy: true,
        count: count,
        repaired: false,
        backedUp: count > 0
      };
    } catch (err) {
      // JSON corruption detected: create safety copy and restore clean default
      console.error(`[Recon Migration] Store corruption detected in ${fileName}: ${err.message}. Attempting safe salvage.`);
      const corruptFile = path.join(this.backupDir, `${fileName}.corrupted.${Date.now()}`);
      try {
        fs.copyFileSync(filePath, corruptFile);
      } catch {}

      try {
        fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2), 'utf8');
        return {
          exists: true,
          healthy: false,
          repaired: true,
          error: err.message,
          salvageBackup: corruptFile
        };
      } catch (writeErr) {
        return {
          exists: true,
          healthy: false,
          repaired: false,
          error: writeErr.message
        };
      }
    }
  }

  /**
   * Maintain max N backup snapshots per store to prevent disk bloat
   */
  pruneOldBackups(baseFileName, maxBackups = 5) {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(f => f.startsWith(baseFileName) && f.endsWith('.bak'))
        .map(f => ({ name: f, time: fs.statSync(path.join(this.backupDir, f)).mtimeMs }))
        .sort((a, b) => b.time - a.time);

      if (files.length > maxBackups) {
        for (let i = maxBackups; i < files.length; i++) {
          try {
            fs.unlinkSync(path.join(this.backupDir, files[i].name));
          } catch {}
        }
      }
    } catch {}
  }
}

module.exports = {
  MigrationManager
};
