const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let blockedCount = 0;
let shieldsEnabled = true;

// Load tracking domains blocklist
const filterPath = path.join(__dirname, '../../config/filters/default-trackers.txt');
const trackingDomains = new Set();

try {
  const content = fs.readFileSync(filterPath, 'utf-8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('!') && !trimmed.startsWith('[')) {
      const clean = trimmed.replace(/^\|\|/, '').replace(/\^.*$/, '');
      if (clean) trackingDomains.add(clean.toLowerCase());
    }
  });
  console.log(`[Recon Shields] Loaded ${trackingDomains.size} tracking rules.`);
} catch (e) {
  console.warn('[Recon Shields] Could not load blocklist from disk, using default fallbacks.');
  ['google-analytics.com', 'doubleclick.net', 'criteo.com', 'facebook.net'].forEach(d => trackingDomains.add(d));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0f111a',
    title: 'Recon Browser',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Network request interception (Recon Shields)
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    if (!shieldsEnabled) {
      return callback({ cancel: false });
    }

    try {
      const url = new URL(details.url);
      const host = url.hostname.toLowerCase();

      for (const domain of trackingDomains) {
        if (host === domain || host.endsWith('.' + domain)) {
          blockedCount++;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('shield-blocked-update', { count: blockedCount, blockedUrl: host });
          }
          return callback({ cancel: true });
        }
      }
    } catch (err) {
      // Ignore malformed URLs
    }

    callback({ cancel: false });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.on('toggle-shields', (event, enabled) => {
  shieldsEnabled = enabled;
  console.log(`[Recon Shields] State toggled: ${shieldsEnabled ? 'ACTIVE' : 'DISABLED'}`);
});

ipcMain.on('reset-blocked-count', () => {
  blockedCount = 0;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
