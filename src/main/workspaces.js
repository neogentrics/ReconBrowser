/**
 * Recon Browser — Workspaces & Project Tab Groups Manager (v1.10.0)
 * Allows users to segment tabs into isolated, named project workspaces
 * with instant switching and persistent tab group state.
 */

const fs = require('fs');
const path = require('path');

let electronApp = null;
try {
  electronApp = require('electron').app;
} catch {}

const DEFAULT_WORKSPACES = [
  { id: 'default', name: 'Main', icon: '🌐', color: '#7c3aed', isDefault: true },
  { id: 'research', name: 'Research', icon: '🔬', color: '#10b981' },
  { id: 'lore', name: 'Lore & Story', icon: '📚', color: '#f59e0b' },
  { id: 'studio', name: 'Studio', icon: '✍️', color: '#ec4899' }
];

class WorkspaceManager {
  constructor(userDataDir = null) {
    this.userDataDir = userDataDir || (electronApp ? electronApp.getPath('userData') : path.join(process.cwd(), '.recon-data'));
    this.filePath = path.join(this.userDataDir, 'workspaces.json');
    this.workspaces = this.load();
    this.activeWorkspaceId = 'default';
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8').trim();
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Ensure default workspace exists
            if (!parsed.some(w => w.id === 'default')) {
              parsed.unshift(DEFAULT_WORKSPACES[0]);
            }
            return parsed;
          }
        }
      }
    } catch (err) {
      console.warn('[Recon Workspaces] Could not load workspaces.json, using defaults:', err.message);
    }
    return JSON.parse(JSON.stringify(DEFAULT_WORKSPACES));
  }

  save() {
    try {
      if (!fs.existsSync(this.userDataDir)) {
        fs.mkdirSync(this.userDataDir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.workspaces, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('[Recon Workspaces] Failed to save workspaces:', err.message);
      return false;
    }
  }

  getAll() {
    return this.workspaces;
  }

  get(id) {
    return this.workspaces.find(w => w.id === id) || this.workspaces[0];
  }

  create(nameOrObj, icon = '📁', color = '#3b82f6') {
    let name = nameOrObj;
    if (nameOrObj && typeof nameOrObj === 'object') {
      name = nameOrObj.name;
      icon = nameOrObj.icon || icon;
      color = nameOrObj.color || color;
    }
    const cleanName = (name || '').trim();
    if (!cleanName) throw new Error('Workspace name cannot be empty');

    const id = 'ws_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const newWs = {
      id,
      name: cleanName,
      icon: icon || '📁',
      color: color || '#3b82f6',
      createdAt: Date.now()
    };

    this.workspaces.push(newWs);
    this.save();
    return newWs;
  }

  update(id, updates = {}) {
    const ws = this.workspaces.find(w => w.id === id);
    if (!ws) throw new Error(`Workspace not found: ${id}`);
    if (ws.isDefault && updates.name === '') {
      throw new Error('Default workspace must have a name');
    }

    if (updates.name) ws.name = updates.name.trim();
    if (updates.icon) ws.icon = updates.icon.trim();
    if (updates.color) ws.color = updates.color.trim();

    this.save();
    return ws;
  }

  delete(id) {
    if (id === 'default') {
      return { success: false, error: 'Cannot delete the default Main workspace' };
    }
    const idx = this.workspaces.findIndex(w => w.id === id);
    if (idx !== -1) {
      const removed = this.workspaces.splice(idx, 1)[0];
      if (this.activeWorkspaceId === id) {
        this.activeWorkspaceId = 'default';
      }
      this.save();
      return { success: true, removed, fallbackId: 'default' };
    }
    return { success: false, error: 'Workspace not found' };
  }

  getActive() {
    return this.get(this.activeWorkspaceId);
  }

  setActive(id) {
    const ws = this.get(id);
    this.activeWorkspaceId = ws.id;
    return ws;
  }
}

module.exports = {
  WorkspaceManager,
  DEFAULT_WORKSPACES
};
