'use strict';

const { app, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class PasswordVault {
  constructor() {
    this.vaultPath = path.join(app.getPath('userData'), 'recon_vault.enc');
    this.memoryCache = null;
  }

  isAvailable() {
    return safeStorage.isEncryptionAvailable();
  }

  load() {
    if (this.memoryCache !== null) {
      return this.memoryCache;
    }

    if (!fs.existsSync(this.vaultPath)) {
      this.memoryCache = [];
      return this.memoryCache;
    }

    try {
      const buffer = fs.readFileSync(this.vaultPath);
      let jsonStr = '';

      if (this.isAvailable()) {
        try {
          jsonStr = safeStorage.decryptString(buffer);
        } catch (decErr) {
          console.warn('[Recon Vault] safeStorage decryption failed, attempting plain/AES fallback:', decErr);
          jsonStr = buffer.toString('utf8');
        }
      } else {
        jsonStr = buffer.toString('utf8');
      }

      this.memoryCache = JSON.parse(jsonStr || '[]');
      if (!Array.isArray(this.memoryCache)) {
        this.memoryCache = [];
      }
    } catch (err) {
      console.error('[Recon Vault] Error reading vault file, starting fresh cache:', err);
      this.memoryCache = [];
    }

    return this.memoryCache;
  }

  save(items) {
    this.memoryCache = items;
    const jsonStr = JSON.stringify(items, null, 2);

    try {
      let bufferToWrite;
      if (this.isAvailable()) {
        bufferToWrite = safeStorage.encryptString(jsonStr);
      } else {
        bufferToWrite = Buffer.from(jsonStr, 'utf8');
      }

      const tempPath = `${this.vaultPath}.tmp`;
      fs.writeFileSync(tempPath, bufferToWrite);
      fs.renameSync(tempPath, this.vaultPath);
      return true;
    } catch (err) {
      console.error('[Recon Vault] Failed to persist vault to disk:', err);
      return false;
    }
  }

  getAll() {
    return this.load();
  }

  getForDomain(domainOrUrl) {
    if (!domainOrUrl) return [];
    let host = domainOrUrl.toLowerCase().trim();
    try {
      if (domainOrUrl.startsWith('http://') || domainOrUrl.startsWith('https://')) {
        host = new URL(domainOrUrl).hostname.toLowerCase();
      }
    } catch {}

    const cleanHost = host.replace(/^www\./, '');
    const all = this.load();

    return all.filter(item => {
      if (!item.domain) return false;
      const itemHost = item.domain.toLowerCase().trim().replace(/^www\./, '');
      return cleanHost === itemHost || cleanHost.endsWith('.' + itemHost) || itemHost.endsWith('.' + cleanHost);
    });
  }

  addOrUpdate({ domain, username, password, notes = '' }) {
    if (!domain || !username || !password) {
      throw new Error('Domain, username, and password are required');
    }

    let cleanDomain = domain.toLowerCase().trim();
    try {
      if (cleanDomain.startsWith('http://') || cleanDomain.startsWith('https://')) {
        cleanDomain = new URL(cleanDomain).hostname.toLowerCase();
      }
    } catch {}
    cleanDomain = cleanDomain.replace(/^www\./, '');

    const all = this.load();
    const existingIndex = all.findIndex(i => {
      const d = (i.domain || '').toLowerCase().trim().replace(/^www\./, '');
      return d === cleanDomain && (i.username || '').toLowerCase().trim() === username.toLowerCase().trim();
    });

    const now = Date.now();
    let savedItem;

    if (existingIndex !== -1) {
      all[existingIndex] = {
        ...all[existingIndex],
        password,
        notes: notes !== undefined ? notes : all[existingIndex].notes,
        updatedAt: now
      };
      savedItem = all[existingIndex];
    } else {
      savedItem = {
        id: `vault_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        domain: cleanDomain,
        username: username.trim(),
        password,
        notes,
        createdAt: now,
        updatedAt: now
      };
      all.push(savedItem);
    }

    this.save(all);
    return savedItem;
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

  generatePassword(options = {}) {
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

    if (useLower) {
      charPool += LOWER;
      guaranteed.push(LOWER[crypto.randomInt(0, LOWER.length)]);
    }
    if (useUpper) {
      charPool += UPPER;
      guaranteed.push(UPPER[crypto.randomInt(0, UPPER.length)]);
    }
    if (useDigits) {
      charPool += DIGITS;
      guaranteed.push(DIGITS[crypto.randomInt(0, DIGITS.length)]);
    }
    if (useSymbols) {
      charPool += SYMBOLS;
      guaranteed.push(SYMBOLS[crypto.randomInt(0, SYMBOLS.length)]);
    }

    if (!charPool) {
      charPool = LOWER + DIGITS;
    }

    const result = [...guaranteed];
    while (result.length < length) {
      result.push(charPool[crypto.randomInt(0, charPool.length)]);
    }

    // Fisher-Yates shuffle
    for (let i = result.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result.join('');
  }
}

module.exports = { PasswordVault };
