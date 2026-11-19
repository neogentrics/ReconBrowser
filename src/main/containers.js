'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

function getUserDataPath() {
  try {
    const electron = require('electron');
    if (electron && electron.app && typeof electron.app.getPath === 'function') {
      return electron.app.getPath('userData');
    }
  } catch {}
  return process.env.APPDATA ? path.join(process.env.APPDATA, 'recon-browser') : path.join(os.tmpdir(), 'recon-browser');
}

function getElectronSession() {
  try {
    const electron = require('electron');
    if (electron && electron.session) {
      return electron.session;
    }
  } catch {}
  return null;
}

const DEFAULT_CONTAINERS = [
  { id: 'default', name: 'Default', icon: '🌐', color: '#7c3aed', proxy: '', isDefault: true },
  { id: 'research', name: 'Research', icon: '🔬', color: '#06b6d4', proxy: '', isDefault: false },
  { id: 'work', name: 'Work', icon: '💼', color: '#3b82f6', proxy: '', isDefault: false },
  { id: 'personal', name: 'Personal', icon: '👤', color: '#f59e0b', proxy: '', isDefault: false },
  { id: 'finance', name: 'Finance', icon: '💳', color: '#10b981', proxy: '', isDefault: false },
  { id: 'social', name: 'Social', icon: '💬', color: '#ec4899', proxy: '', isDefault: false }
];

class ContainerManager {
  constructor(customPath = null) {
    const baseDir = getUserDataPath();
    if (!fs.existsSync(baseDir)) {
      try { fs.mkdirSync(baseDir, { recursive: true }); } catch {}
    }
    this.containersPath = customPath || path.join(baseDir, 'recon_containers.json');
    this.containers = this.loadContainers();
    this.applyAllProxies();
  }

  loadContainers() {
    if (!fs.existsSync(this.containersPath)) {
      this.saveContainers(DEFAULT_CONTAINERS);
      return DEFAULT_CONTAINERS;
    }

    try {
      const raw = fs.readFileSync(this.containersPath, 'utf8');
      const parsed = JSON.parse(raw || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.error('[Containers] Failed to load recon_containers.json:', err);
    }
    return DEFAULT_CONTAINERS;
  }

  saveContainers(items) {
    this.containers = items;
    try {
      const tmp = `${this.containersPath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(items, null, 2), 'utf8');
      fs.renameSync(tmp, this.containersPath);
      return true;
    } catch (err) {
      console.error('[Containers] Failed to save containers:', err);
      return false;
    }
  }

  getAll() {
    return this.containers;
  }

  getContainer(id) {
    if (!id || id === 'ephemeral') {
      return { id: 'ephemeral', name: 'Ephemeral (Burn on Close)', icon: '🔥', color: '#ef4444', proxy: '', isEphemeral: true };
    }
    return this.containers.find(c => c.id === id) || this.containers[0];
  }

  getPartitionKey(containerId, isEphemeral = false, ephemeralId = null) {
    if (isEphemeral || containerId === 'ephemeral') {
      return `recon_ephemeral_${ephemeralId || Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
    }
    if (!containerId || containerId === 'default') {
      return 'persist:recon_default';
    }
    return `persist:recon_container_${containerId}`;
  }

  saveContainer({ id, name, icon, color, proxy }) {
    const cleanName = (name || 'New Container').trim();
    const cleanIcon = (icon || '📦').trim();
    const cleanColor = (color || '#7c3aed').trim();
    const cleanProxy = (proxy || '').trim();

    if (id) {
      const idx = this.containers.findIndex(c => c.id === id);
      if (idx !== -1) {
        this.containers[idx].name = cleanName;
        this.containers[idx].icon = cleanIcon;
        this.containers[idx].color = cleanColor;
        this.containers[idx].proxy = cleanProxy;
        this.saveContainers(this.containers);
        this.applyProxyForContainer(this.containers[idx]);
        return this.containers[idx];
      }
    }

    const newId = `custom_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
    const newContainer = {
      id: newId,
      name: cleanName,
      icon: cleanIcon,
      color: cleanColor,
      proxy: cleanProxy,
      isDefault: false
    };
    this.containers.push(newContainer);
    this.saveContainers(this.containers);
    this.applyProxyForContainer(newContainer);
    return newContainer;
  }

  deleteContainer(id) {
    if (!id || id === 'default') return false;
    this.clearContainerData(id).catch(() => {});
    this.containers = this.containers.filter(c => c.id !== id);
    this.saveContainers(this.containers);
    return true;
  }

  async clearContainerData(id) {
    const session = getElectronSession();
    if (!session) return true;
    const partitionKey = this.getPartitionKey(id);
    try {
      const ses = session.fromPartition(partitionKey);
      await ses.clearStorageData();
      await ses.clearCache();
      return true;
    } catch (err) {
      console.error(`[Containers] Error clearing data for partition ${partitionKey}:`, err);
      return false;
    }
  }

  async wipeEphemeralPartition(partitionKey) {
    if (!partitionKey || !partitionKey.startsWith('recon_ephemeral_')) return false;
    const session = getElectronSession();
    if (!session) return true;
    try {
      const ses = session.fromPartition(partitionKey);
      await ses.clearStorageData();
      await ses.clearCache();
      return true;
    } catch (err) {
      console.error(`[Containers] Error wiping ephemeral partition ${partitionKey}:`, err);
      return false;
    }
  }

  applyAllProxies() {
    for (const c of this.containers) {
      this.applyProxyForContainer(c);
    }
  }

  applyProxyForContainer(container) {
    if (!container) return;
    const partitionKey = this.getPartitionKey(container.id);
    this.applyProxyForPartition(partitionKey, container.proxy);
  }

  applyProxyForPartition(partitionKey, proxyRules) {
    const session = getElectronSession();
    if (!session || !partitionKey) return;
    try {
      const ses = session.fromPartition(partitionKey);
      if (proxyRules && proxyRules.trim()) {
        ses.setProxy({ proxyRules: proxyRules.trim() }).catch(err => {
          console.error(`[Containers] Failed to set proxy for ${partitionKey}:`, err);
        });
      } else {
        ses.setProxy({ proxyRules: '' }).catch(() => {});
      }
    } catch {}
  }
}

module.exports = {
  ContainerManager,
  DEFAULT_CONTAINERS
};
